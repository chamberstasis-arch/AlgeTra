// Carga de un ZIP: todo lo de dentro (imágenes, PDF, subcarpetas) termina en la misma entrega, en orden.
import JSZip from 'jszip'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const tmp = mkdtempSync(join(tmpdir(), 'algetra-ws-'))
process.env.HARNESS_DIR = tmp
// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

let ws: typeof import('./workspace')
beforeAll(async () => {
  ws = await import('./workspace')
})
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

describe('ingest de ZIP', () => {
  it('extrae imágenes de subcarpetas, ignora basura y sigue el orden natural de la ruta', async () => {
    const z = new JSZip()
    z.file('act 10.png', PNG)
    z.file('act 2.png', PNG)
    z.file('carpeta/act 3.png', PNG)
    z.file('__MACOSX/._act 2.png', PNG)
    z.file('.DS_Store', 'x')
    z.file('notas.txt', 'hola')
    const r = await ws.ingest('cliente.zip', await z.generateAsync({ type: 'nodebuffer' }), 'ent-zip')
    expect(r.guardadas).toEqual(['act_2.png', 'act_10.png', 'act_3.png']) // orden natural de la ruta: la carpeta va después
    expect(r.avisos.some((a) => a.includes('notas.txt'))).toBe(true)
    expect(readdirSync(join(tmp, 'por_procesar', 'ent-zip')).sort()).toEqual(['act_10.png', 'act_2.png', 'act_3.png'])
  })
  it('dos archivos con el mismo nombre en carpetas distintas no se pisan', async () => {
    const z = new JSZip()
    z.file('a/hoja.png', PNG)
    z.file('b/hoja.png', PNG)
    const r = await ws.ingest('dup.zip', await z.generateAsync({ type: 'nodebuffer' }), 'ent-dup')
    expect(new Set(r.guardadas).size).toBe(2)
  })
  it('un ZIP dañado da un aviso en lugar de romper', async () => {
    const r = await ws.ingest('roto.zip', Buffer.from('no soy un zip'), 'ent-roto')
    expect(r.guardadas).toEqual([])
    expect(r.avisos[0]).toMatch(/ZIP/)
  })
  it('un ZIP dentro de otro ZIP se abre, pero no más de dos niveles', async () => {
    const hondo = new JSZip().file('x.png', PNG)
    const medio = new JSZip().file('h.zip', await hondo.generateAsync({ type: 'nodebuffer' }))
    const fuera = new JSZip().file('m.zip', await medio.generateAsync({ type: 'nodebuffer' }))
    const r = await ws.ingest('f.zip', await fuera.generateAsync({ type: 'nodebuffer' }), 'ent-anidado')
    expect(r.guardadas).toEqual([])
    expect(r.avisos.join(' ')).toMatch(/ZIP dentro de ZIP/)
  })
})

describe('orientación de las fotos', () => {
  it('aplica el giro EXIF a los píxeles y quita la etiqueta (el agente no la respeta)', async () => {
    const src = join(tmp, 'lado.jpg')
    execFileSync('magick', ['-size', '40x20', 'xc:white', src]) // píxeles 40×20
    // Etiqueta EXIF mínima «Orientation = 6» (girar 90°), insertada justo tras el SOI del JPEG.
    const tiff = Buffer.from('4949' + '2a00' + '08000000' + '0100' + '1201' + '0300' + '01000000' + '0600' + '0000' + '00000000', 'hex')
    const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, 0]), Buffer.from('Exif\0\0'), tiff])
    app1.writeUInt16BE(app1.length - 2, 2)
    const { readFileSync } = await import('node:fs')
    const jpg = readFileSync(src)
    const r = await ws.ingest('lado.jpg', Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2)]), 'ent-orient')
    const f = join(tmp, 'por_procesar', 'ent-orient', r.guardadas[0])
    const out = execFileSync('magick', ['identify', '-format', '%w %h %[orientation]', f]).toString().trim()
    expect(out).toBe('20 40 TopLeft')
  })
})

describe('agrupar hojas sueltas', () => {
  it('mueve las fotos sueltas y también las hojas ya cerradas que no tenían entrega', async () => {
    const { mkdirSync, writeFileSync, readFileSync, existsSync } = await import('node:fs')
    writeFileSync(join(tmp, 'por_procesar', 'suelta1.png'), PNG)
    writeFileSync(join(tmp, 'por_procesar', 'suelta2.png'), PNG)
    const cerrada = join(tmp, 'revision', 'hoja-vieja')
    mkdirSync(cerrada, { recursive: true })
    writeFileSync(join(cerrada, 'meta.json'), JSON.stringify({ id: 'hoja-vieja', entrega: '', orden: 1 }))
    writeFileSync(join(cerrada, 'informe.json'), JSON.stringify({ id: 'hoja-vieja', entrega: '' }))
    const r = await ws.agruparSueltas('Mi Entrega ñ')
    expect(r).toEqual({ movidas: 3, entrega: 'Mi_Entrega_n' })
    expect(existsSync(join(tmp, 'por_procesar', 'suelta1.png'))).toBe(false)
    expect(existsSync(join(tmp, 'por_procesar', 'Mi_Entrega_n', 'suelta1.png'))).toBe(true)
    expect(JSON.parse(readFileSync(join(cerrada, 'meta.json'), 'utf8')).entrega).toBe('Mi_Entrega_n')
    expect(JSON.parse(readFileSync(join(cerrada, 'informe.json'), 'utf8')).entrega).toBe('Mi_Entrega_n')
    await expect(ws.agruparSueltas('  ')).rejects.toThrow(/nombre/)
  })
})

describe('candado entre procesos', () => {
  it('serializa las secciones críticas aunque se pidan a la vez', async () => {
    let dentro = 0
    let maximo = 0
    const trabajo = async () => {
      dentro++
      maximo = Math.max(maximo, dentro)
      await new Promise((r) => setTimeout(r, 15))
      dentro--
      return 1
    }
    const r = await Promise.all(Array.from({ length: 8 }, () => ws.conLock(trabajo)))
    expect(r.length).toBe(8)
    expect(maximo).toBe(1)
  })
})
