// Carga de un ZIP: todo lo de dentro (imágenes, PDF, subcarpetas) termina en la misma entrega, en orden.
import JSZip from 'jszip'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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

describe('archivo de entregas', () => {
  const cerrar = (estado: 'procesadas' | 'revision' | 'en_proceso', id: string, entrega: string) => {
    const dir = join(tmp, estado, id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, entrega, archivoOriginal: id + '.png' }))
    writeFileSync(join(dir, 'transcripcion.md'), 'x')
  }
  const hojasDe = async (e: string) => (await ws.listHojas()).filter((h) => h.entrega === e)

  it('saca la entrega de la cola, guarda todo junto y se restaura igual', async () => {
    await ws.ingest('a.zip', await new JSZip().file('1.png', PNG).file('2.png', PNG).generateAsync({ type: 'nodebuffer' }), 'ent-a')
    cerrar('procesadas', 'ent-a__x1', 'ent-a')
    cerrar('revision', 'ent-a__x2', 'ent-a')
    mkdirSync(join(tmp, 'entregas', 'ent-a'), { recursive: true })
    writeFileSync(join(tmp, 'entregas', 'ent-a', 'documento.docx'), 'docx')
    cerrar('procesadas', 'ent-b__y1', 'ent-b') // otra entrega: no se toca

    const r = await ws.archivarEntrega('ent-a')
    expect(r.hojas).toBe(4)
    expect(await hojasDe('ent-a')).toEqual([])
    expect((await hojasDe('ent-b')).length).toBe(1)
    expect(existsSync(join(tmp, 'entregas', 'ent-a'))).toBe(false)
    expect(existsSync(join(tmp, 'archivo', 'ent-a', 'entrega', 'documento.docx'))).toBe(true)
    expect(existsSync(join(tmp, 'archivo', 'ent-a', 'procesadas', 'ent-a__x1', 'transcripcion.md'))).toBe(true)
    const arch = await ws.listarArchivadas()
    expect(arch).toMatchObject([{ id: 'ent-a', nombre: 'ent-a', hojas: 4, tieneDocx: true }])

    const back = await ws.restaurarEntrega('ent-a')
    expect(back).toEqual({ entrega: 'ent-a', hojas: 4 })
    expect((await hojasDe('ent-a')).map((h) => h.estado).sort()).toEqual(['por_procesar', 'por_procesar', 'procesadas', 'revision'])
    expect(existsSync(join(tmp, 'entregas', 'ent-a', 'documento.docx'))).toBe(true)
    expect(await ws.listarArchivadas()).toEqual([])
    expect(existsSync(join(tmp, 'archivo', 'ent-a'))).toBe(false)
  })

  it('no archiva con hojas en proceso ni si ya hay una archivada con ese nombre', async () => {
    cerrar('en_proceso', 'ent-c__z1', 'ent-c')
    await expect(ws.archivarEntrega('ent-c')).rejects.toThrow('en proceso')
    expect((await hojasDe('ent-c')).length).toBe(1) // no movió nada
    await expect(ws.archivarEntrega('no-existe')).rejects.toThrow('No existe')
    await expect(ws.archivarEntrega('  ')).rejects.toThrow('Falta')
  })

  it('no restaura encima de una entrega activa con el mismo nombre', async () => {
    cerrar('procesadas', 'ent-d__w1', 'ent-d')
    await ws.archivarEntrega('ent-d')
    cerrar('procesadas', 'ent-d__w1', 'ent-d') // el alumno vuelve a subir y cerrar lo mismo
    await expect(ws.restaurarEntrega('ent-d')).rejects.toThrow('Ya hay una entrega activa')
    expect(existsSync(join(tmp, 'archivo', 'ent-d', 'procesadas', 'ent-d__w1'))).toBe(true) // sigue archivada
    await expect(ws.restaurarEntrega('../x')).rejects.toThrow('Id no válido')
  })
})

describe('siguiente con varias entregas en la cola', () => {
  const cli = (args: string[], dir: string) => {
    try {
      return { code: 0, out: execFileSync('pnpm', ['-s', 'harness', ...args], { env: { ...process.env, HARNESS_DIR: dir }, stdio: 'pipe' }).toString() }
    } catch (e) {
      const x = e as { status: number; stdout: Buffer; stderr: Buffer }
      return { code: x.status, out: `${x.stdout}${x.stderr}` }
    }
  }
  it('se niega sin --entrega y toma solo de la entrega indicada', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'algetra-sig-'))
    const hojas = (e: string) => join(dir, 'por_procesar', e)
    mkdirSync(hojas('aaa'), { recursive: true })
    mkdirSync(hojas('bbb'), { recursive: true })
    execFileSync('magick', ['-size', '40x20', 'xc:white', join(hojas('aaa'), 'h1.png')])
    execFileSync('magick', ['-size', '40x20', 'xc:white', join(hojas('bbb'), 'h1.png')])
    try {
      const sin = cli(['siguiente'], dir)
      expect(sin.code).toBe(4)
      expect(sin.out).toContain('2 entregas')
      expect(existsSync(join(dir, '.lock-harness'))).toBe(false) // no deja el candado colgado
      const con = cli(['siguiente', '--entrega', 'bbb'], dir)
      expect(con.code).toBe(0)
      expect(con.out).toContain('entrega "bbb"')
      expect(existsSync(join(dir, 'por_procesar', 'aaa', 'h1.png'))).toBe(true) // la otra intacta
      expect(cli(['siguiente', '--entrega', 'bbb'], dir).code).toBe(3) // ya no quedan de bbb
      expect(cli(['estado', '--entrega', 'aaa'], dir).out).toContain('por_procesar')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('corregir una hoja ya cerrada sin reabrirla', () => {
  it('cerrar la re-cierra en su sitio: nunca pasa por en_proceso y conserva la primera lectura', () => {
    const dir = mkdtempSync(join(tmpdir(), 'algetra-cerr-'))
    const h = join(dir, 'procesadas', 'ent-c__a')
    mkdirSync(h, { recursive: true })
    writeFileSync(join(h, 'meta.json'), JSON.stringify({ id: 'ent-c__a', entrega: 'ent-c', archivoOriginal: 'a.png', orden: 1 }))
    writeFileSync(join(h, 'transcripcion.md'), '<!-- ejercicio: act-01/1 -->\nTexto $$x=1$$\n')
    writeFileSync(join(h, 'transcripcion.original.md'), 'PRIMERA LECTURA')
    try {
      writeFileSync(join(h, 'transcripcion.md'), '<!-- ejercicio: act-01/1 -->\nTexto $$x=2$$\n') // la corrección
      const r = execFileSync('pnpm', ['-s', 'harness', 'cerrar', 'ent-c__a'], { env: { ...process.env, HARNESS_DIR: dir }, stdio: 'pipe' }).toString()
      expect(r).toContain('Corregida en su sitio')
      expect(r).toContain('ensamblar "ent-c"') // el documento de la entrega se rehace una sola vez, al final
      expect(existsSync(join(dir, 'en_proceso', 'ent-c__a'))).toBe(false)
      expect(existsSync(join(dir, 'procesadas', 'ent-c__a', 'documento.docx'))).toBe(true)
      expect(readFileSync(join(h, 'transcripcion.original.md'), 'utf8')).toBe('PRIMERA LECTURA')
      expect(existsSync(join(dir, 'entregas', 'ent-c', 'documento.docx'))).toBe(false) // no se ensambló
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('regenerar con hojas abiertas', () => {
  it('no rehace el documento ensamblado si quedan hojas en proceso (saldría sin ellas)', async () => {
    const hoja = (estado: 'procesadas' | 'en_proceso', id: string) => {
      const dir = join(tmp, estado, id)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, entrega: 'ent-r', archivoOriginal: id + '.png', orden: estado === 'procesadas' ? 1 : 2 }))
      writeFileSync(join(dir, 'transcripcion.md'), '<!-- ejercicio: act-01/1 -->\nTexto $$x=1$$\n')
    }
    hoja('procesadas', 'ent-r__a')
    const primero = await ws.ensamblar('ent-r')
    expect(primero.hojas).toBe(1)
    const antes = readFileSync(join(tmp, 'entregas', 'ent-r', 'ensamblado.json'), 'utf8')

    hoja('en_proceso', 'ent-r__b') // una hoja reabierta
    expect(await ws.regenerarEntrega('ent-r')).toBeNull()
    expect(readFileSync(join(tmp, 'entregas', 'ent-r', 'ensamblado.json'), 'utf8')).toBe(antes) // intacto
    expect(existsSync(join(tmp, 'procesadas', 'ent-r__a', 'documento.docx'))).toBe(true) // lo de cada hoja sí se rehace

    rmSync(join(tmp, 'en_proceso', 'ent-r__b'), { recursive: true })
    expect((await ws.regenerarEntrega('ent-r'))?.hojas).toBe(1) // sin hojas abiertas vuelve a rehacerse
  })
})
