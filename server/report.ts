import { comparePage } from '../src/shared/metrics'
import {
  ERROR_TAG_LABELS,
  type ErrorTag,
  type PageRating,
  type PageReportRow,
  type Run,
  type RunReport,
} from '../src/shared/types'
import { config } from './config'

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const pct = (xs: number[], p: number) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]
}

export function buildReport(run: Run): RunReport {
  const rows: PageReportRow[] = [...run.pages]
    .sort((a, b) => a.order - b.order)
    .map((p) => ({
      order: p.order,
      filename: p.filename,
      status: p.status,
      reviewed: p.review.reviewed,
      rating: p.review.rating,
      tags: p.review.tags,
      notes: p.review.notes,
      confidence: p.meta?.confidence,
      latencyMs: p.latencyMs,
      mock: p.mock,
      metrics:
        p.review.reviewed && p.text !== undefined ? comparePage(p.text, p.review.editedText ?? p.text) : undefined,
    }))

  const measured = rows.filter((r) => r.metrics)
  const eq = { total: 0, exact: 0, substituted: 0, inserted: 0, deleted: 0 }
  for (const r of measured) for (const k of Object.keys(eq) as (keyof typeof eq)[]) eq[k] += r.metrics!.equations[k]
  const unchanged = measured.filter((r) => r.metrics!.unchanged).length

  const ratings: Record<PageRating, number> = { perfect: 0, minor: 0, major: 0, unusable: 0 }
  for (const p of run.pages) if (p.review.rating) ratings[p.review.rating]++

  const tagCount = new Map<ErrorTag, number>()
  for (const p of run.pages) for (const t of p.review.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1)

  const calls = run.pages.filter((p) => !p.mock).reduce((n, p) => n + p.attempts, 0)
  const latencies = run.pages.flatMap((p) => (p.latencyMs ? [p.latencyMs] : []))

  return {
    generatedAt: new Date().toISOString(),
    run: { id: run.id, name: run.name, createdAt: run.createdAt, documentLayout: run.settings.documentLayout },
    totals: {
      pages: run.pages.length,
      transcribed: run.pages.filter((p) => p.status === 'done').length,
      failed: run.pages.filter((p) => p.status === 'error').length,
      reviewed: run.pages.filter((p) => p.review.reviewed).length,
    },
    accuracy: {
      pagesUnchanged: unchanged,
      pagesUnchangedRate: measured.length ? unchanged / measured.length : null,
      meanTextCer: mean(measured.map((r) => r.metrics!.textCer)),
      meanTextWer: mean(measured.map((r) => r.metrics!.textWer)),
      meanMathTokenErrorRate: mean(measured.map((r) => r.metrics!.mathTokenErrorRate)),
      equations: { ...eq, exactRate: eq.total ? eq.exact / eq.total : null },
    },
    ratings,
    tags: [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, pages]) => ({ tag, label: ERROR_TAG_LABELS[tag], pages })),
    performance: {
      meanLatencyMs: mean(latencies),
      p95LatencyMs: pct(latencies, 0.95),
      meanConfidence: mean(run.pages.flatMap((p) => (p.meta?.confidence !== undefined ? [p.meta.confidence] : []))),
    },
    cost: {
      mathpixCalls: calls,
      estimatedUsd: calls * config.mathpix.costPerImageUsd,
      note: 'Estimación a tarifa de lista de v3/text; Mathpix puede facturar a tarifa de PDF las imágenes con más de 12 filas de texto.',
    },
    mock: run.pages.some((p) => p.mock),
    pages: rows,
  }
}

const p1 = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)} %`)
const RATING_LABEL: Record<PageRating, string> = {
  perfect: 'Perfecta',
  minor: 'Errores menores',
  major: 'Errores graves',
  unusable: 'Inutilizable',
}

export function reportToMarkdown(r: RunReport): string {
  const a = r.accuracy
  const lines: string[] = [
    `# Informe de precisión — ${r.run.name}`,
    '',
    `Generado: ${r.generatedAt} · Prueba \`${r.run.id}\` · Modo página completa (layout): ${r.run.documentLayout ? 'sí' : 'no'}`,
    '',
  ]
  if (r.mock) lines.push('> ⚠️ Esta prueba incluye páginas del **modo simulado**: las cifras no reflejan a Mathpix.', '')
  lines.push(
    '## Resumen',
    '',
    `- Páginas: ${r.totals.pages} · transcritas: ${r.totals.transcribed} · con error: ${r.totals.failed} · revisadas: ${r.totals.reviewed}`,
    `- Páginas sin ninguna corrección: ${a.pagesUnchanged} de ${r.totals.reviewed} revisadas (${p1(a.pagesUnchangedRate)})`,
    `- Fórmulas exactas: ${a.equations.exact} de ${a.equations.total} (${p1(a.equations.exactRate)}) · sustituidas: ${a.equations.substituted} · omitidas: ${a.equations.deleted} · sobrantes: ${a.equations.inserted}`,
    `- Error de tokens LaTeX (medio): ${p1(a.meanMathTokenErrorRate)}`,
    `- CER del texto en español (medio): ${p1(a.meanTextCer)} · WER: ${p1(a.meanTextWer)}`,
    `- Latencia media: ${r.performance.meanLatencyMs === null ? '—' : `${Math.round(r.performance.meanLatencyMs)} ms`} · p95: ${r.performance.p95LatencyMs === null ? '—' : `${Math.round(r.performance.p95LatencyMs)} ms`}`,
    `- Confianza media reportada por Mathpix: ${p1(r.performance.meanConfidence)}`,
    `- Llamadas a Mathpix: ${r.cost.mathpixCalls} · costo estimado: US$ ${r.cost.estimatedUsd.toFixed(4)}`,
    '',
    '## Valoración manual',
    '',
    ...(Object.keys(RATING_LABEL) as PageRating[]).map((k) => `- ${RATING_LABEL[k]}: ${r.ratings[k]}`),
    '',
    '## Dónde falla (etiquetas de error)',
    '',
    ...(r.tags.length ? r.tags.map((t) => `- ${t.label}: ${t.pages} página(s)`) : ['- Sin etiquetas registradas']),
    '',
    '## Detalle por página',
    '',
    '| # | Archivo | Estado | Revisada | Valoración | Fórmulas ok | Err. tokens LaTeX | CER texto | Conf. | ms |',
    '| ---: | --- | --- | :-: | --- | ---: | ---: | ---: | ---: | ---: |',
  )
  for (const p of r.pages) {
    const m = p.metrics
    lines.push(
      `| ${p.order} | ${p.filename} | ${p.status} | ${p.reviewed ? 'sí' : 'no'} | ${p.rating ? RATING_LABEL[p.rating] : '—'} | ${
        m ? `${m.equations.exact}/${m.equations.total}` : '—'
      } | ${m ? p1(m.mathTokenErrorRate) : '—'} | ${m ? p1(m.textCer) : '—'} | ${p.confidence === undefined ? '—' : p1(p.confidence)} | ${p.latencyMs ?? '—'} |`,
    )
  }
  lines.push(
    '',
    '## Cómo se calcula',
    '',
    '- La **referencia** es el texto corregido por la persona que revisó la página. Solo se miden páginas marcadas como revisadas; una página sin revisar no cuenta como correcta.',
    '- **Fórmulas exactas**: LaTeX idéntico tras ignorar espacios, `\\left/\\right` y espaciado. Es una medida estricta: `\\frac{1}{2}` y `1/2` cuentan como diferentes aunque sean equivalentes.',
    '- **Error de tokens LaTeX**: distancia de edición entre secuencias de tokens de todas las fórmulas, dividida por los tokens de la referencia.',
    '- **CER / WER**: distancia de edición de caracteres / palabras del texto fuera de las fórmulas.',
    '- Las cifras con pocas páginas son orientativas, no estadísticas.',
    '',
  )
  return lines.join('\n')
}
