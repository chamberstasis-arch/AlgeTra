// Revisión con comentarios: la persona revisa una hoja renglón por renglón y deja comentarios; el agente los atiende
// después (`pnpm harness comentarios <entrega>`) mirando la foto SOLO donde hay comentario.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface Comentario {
  id: number
  /** Renglón (1-based) de transcripcion.md al momento de comentar. */
  linea: number
  /** Texto del renglón al comentar: sirve para reubicarlo si se editó el archivo. */
  contexto: string
  texto: string
  estado: 'pendiente' | 'resuelto'
  respuesta?: string
  creado: string
}

const archivo = (dir: string) => join(dir, 'comentarios.json')

export async function leerComentarios(dir: string): Promise<Comentario[]> {
  try {
    const j = JSON.parse(await readFile(archivo(dir), 'utf8'))
    return Array.isArray(j) ? j : []
  } catch {
    return []
  }
}

export async function guardarComentarios(dir: string, lista: Comentario[]): Promise<void> {
  await writeFile(archivo(dir), JSON.stringify(lista, null, 2) + '\n')
}

/** Normaliza lo que manda la interfaz: descarta vacíos, conserva ids y estados, asigna ids nuevos. */
export function normalizarComentarios(entrada: unknown, previos: Comentario[], ahora = new Date().toISOString()): Comentario[] {
  if (!Array.isArray(entrada)) throw new Error('Se esperaba una lista de comentarios.')
  let sig = previos.reduce((m, c) => Math.max(m, c.id), 0) + 1
  const out: Comentario[] = []
  for (const x of entrada as Partial<Comentario>[]) {
    const texto = String(x.texto ?? '').trim()
    if (!texto) continue
    const previo = previos.find((p) => p.id === x.id)
    out.push({
      id: previo ? previo.id : sig++,
      linea: Math.max(1, Math.floor(Number(x.linea) || 1)),
      contexto: String(x.contexto ?? previo?.contexto ?? '').slice(0, 200),
      texto: texto.slice(0, 1000),
      estado: previo && previo.texto === texto ? previo.estado : 'pendiente',
      ...(previo?.respuesta && previo.texto === texto ? { respuesta: previo.respuesta } : {}),
      creado: previo?.creado ?? ahora,
    })
  }
  return out
}

/** Reubica el renglón de un comentario si el texto cambió de lugar (busca el contexto cerca de la línea original). */
export function ubicar(c: Comentario, lineas: string[]): number {
  const ctx = c.contexto.trim()
  if (!ctx || lineas[c.linea - 1]?.trim() === ctx) return c.linea
  let mejor = -1
  lineas.forEach((l, i) => {
    if (l.trim() === ctx && (mejor < 0 || Math.abs(i + 1 - c.linea) < Math.abs(mejor + 1 - c.linea))) mejor = i
  })
  return mejor < 0 ? c.linea : mejor + 1
}
