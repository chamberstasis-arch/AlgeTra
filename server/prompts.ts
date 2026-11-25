// Prompts para el agente, adaptados a una entrega concreta: encabezado con el estado real de la cola y el nombre
// de la entrega en cada comando, para que el agente no mezcle entregas.

export type TipoPrompt = '' | 'lote' | 'orquestador' | 'contraste' | 'comentarios'

export const ARCHIVO_PROMPT: Record<TipoPrompt, string> = {
  '': 'harness/PROMPT_INICIO.md',
  lote: 'harness/PROMPT_LOTE.md',
  orquestador: 'harness/PROMPT_ORQUESTADOR.md',
  contraste: 'harness/PROMPT_CONTRASTE.md',
  comentarios: 'harness/PROMPT_COMENTARIOS.md',
}

export const esTipoPrompt = (t: unknown): t is TipoPrompt => typeof t === 'string' && Object.hasOwn(ARCHIVO_PROMPT, t)

export interface ContextoPrompt {
  entrega: string
  porProcesar: number
  enProceso: number
  cerradas: number
  /** Otras entregas con hojas en la cola (no son de este encargo). */
  otras: string[]
}

export function armarPrompt(plantilla: string, ctx: ContextoPrompt): string {
  const cuerpo = plantilla.replaceAll('<ENTREGA>', ctx.entrega).trim()
  const cab = [
    'PROYECTO AlgeTra: transcripción de libretas de álgebra lineal a Word con ecuaciones nativas. Trabaja en la carpeta del proyecto con `pnpm harness …`.',
    `ENTREGA DE ESTE ENCARGO: «${ctx.entrega}» — ${ctx.porProcesar} por procesar, ${ctx.enProceso} en proceso, ${ctx.cerradas} cerradas.`,
    ctx.otras.length
      ? `En la cola hay otras entregas (${ctx.otras.join(', ')}): no son de este encargo. No las toques ni mezcles sus hojas; si un comando te muestra una hoja de otra entrega, detente.`
      : 'No hay otras entregas en la cola.',
  ]
  return `${cab.join('\n')}\n\n${cuerpo}\n`
}
