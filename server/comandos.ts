// Comandos del `harness` que la interfaz puede lanzar por la persona (lista cerrada; no hay shell ni argumentos libres).
import { execFile } from 'node:child_process'

export const COMANDOS = {
  contrastar: { args: ['contrastar'], titulo: 'Contraste con el enunciado' },
  depurar: { args: ['depurar'], titulo: 'Depurar (vista previa)' },
  'depurar-aplicar': { args: ['depurar'], extra: ['--aplicar'], titulo: 'Depurar (aplicado)' },
  formato: { args: ['formato'], titulo: 'Formato del documento' },
  comentarios: { args: ['comentarios'], titulo: 'Comentarios pendientes' },
} as const

export type Comando = keyof typeof COMANDOS

export const esComando = (c: unknown): c is Comando => typeof c === 'string' && Object.hasOwn(COMANDOS, c)

/** Argumentos para `tsx scripts/harness.ts …`. Rechaza comandos fuera de la lista y nombres que se leerían como opciones. */
export function argsComando(comando: unknown, entrega: unknown): string[] {
  if (!esComando(comando)) throw new Error('Comando no permitido.')
  const e = String(entrega ?? '').trim()
  if (!e || e.startsWith('-') || /[\0\n\r]/.test(e)) throw new Error('Entrega no válida.')
  const c = COMANDOS[comando]
  return [...c.args, e, ...('extra' in c ? c.extra : [])]
}

/** Ejecuta el comando y devuelve lo que habría impreso en la terminal. */
export function ejecutarComando(comando: Comando, entrega: string, timeoutMs = 180_000): Promise<{ ok: boolean; salida: string }> {
  return new Promise((res) => {
    execFile('pnpm', ['-s', 'harness', ...argsComando(comando, entrega)], { cwd: process.cwd(), env: process.env, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      const salida = `${stdout}${stderr ? '\n' + stderr : ''}`.trim()
      res({ ok: !err, salida: err && !salida ? String(err.message) : salida })
    })
  })
}
