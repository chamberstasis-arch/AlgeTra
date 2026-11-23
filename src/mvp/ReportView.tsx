import { useEffect, useState } from 'react'
import type { PageRating, Run, RunReport } from '../shared/types'
import { api } from './api'

const pct = (x: number | null | undefined, digits = 1) => (x === null || x === undefined ? '—' : `${(x * 100).toFixed(digits)} %`)
const RATING_LABEL: Record<PageRating, string> = {
  perfect: 'Perfecta',
  minor: 'Errores menores',
  major: 'Errores graves',
  unusable: 'Inutilizable',
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

export function ReportView({ run }: { run: Run }) {
  const [report, setReport] = useState<RunReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Se recalcula cuando cambian las revisiones o las transcripciones.
  const version = run.pages.map((p) => `${p.status}${p.review.reviewedAt ?? ''}${p.review.rating ?? ''}`).join('|')

  useEffect(() => {
    api.report(run.id).then(setReport).catch((e: Error) => setError(e.message))
  }, [run.id, version])

  if (error) return <p className="errorbox">{error}</p>
  if (!report) return <p className="muted">Calculando…</p>

  const a = report.accuracy
  const eq = a.equations
  const noReviews = report.totals.reviewed === 0

  return (
    <div className="report">
      {report.mock && (
        <div className="banner banner-warn">Incluye páginas del modo simulado: estas cifras no reflejan a Mathpix.</div>
      )}
      {noReviews && (
        <div className="banner banner-info">
          Todavía no hay páginas revisadas. La precisión se mide comparando la salida de Mathpix con tu corrección: revisa
          (o confirma como correctas) las páginas para ver resultados.
        </div>
      )}

      <div className="stats">
        <Stat label="Fórmulas exactas" value={pct(eq.exactRate)} hint={`${eq.exact} de ${eq.total}`} tone={eq.exactRate !== null && eq.exactRate >= 0.9 ? 'good' : undefined} />
        <Stat label="Error de tokens LaTeX" value={pct(a.meanMathTokenErrorRate)} hint="menor es mejor" />
        <Stat label="CER del texto (español)" value={pct(a.meanTextCer)} hint={`WER ${pct(a.meanTextWer)}`} />
        <Stat label="Páginas sin correcciones" value={pct(a.pagesUnchangedRate)} hint={`${a.pagesUnchanged} de ${report.totals.reviewed} revisadas`} />
        <Stat label="Latencia media" value={report.performance.meanLatencyMs === null ? '—' : `${(report.performance.meanLatencyMs / 1000).toFixed(1)} s`} hint={`p95 ${report.performance.p95LatencyMs === null ? '—' : `${(report.performance.p95LatencyMs / 1000).toFixed(1)} s`}`} />
        <Stat label="Costo estimado" value={`US$ ${report.cost.estimatedUsd.toFixed(3)}`} hint={`${report.cost.mathpixCalls} llamadas`} />
      </div>

      <div className="cols">
        <section>
          <h3>Fórmulas ({eq.total})</h3>
          <p className="small muted">
            Exactas {eq.exact} · sustituidas {eq.substituted} · omitidas por el OCR {eq.deleted} · sobrantes {eq.inserted}
          </p>
          <h3>Valoración manual</h3>
          <ul className="plain">
            {(Object.keys(RATING_LABEL) as PageRating[]).map((k) => (
              <li key={k}>
                {RATING_LABEL[k]}: <strong>{report.ratings[k]}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Dónde falla</h3>
          {report.tags.length ? (
            <ul className="plain">
              {report.tags.map((t) => (
                <li key={t.tag}>
                  {t.label}: <strong>{t.pages}</strong> página(s)
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Marca etiquetas al revisar cada página para ver los patrones de error.</p>
          )}
        </section>
      </div>

      <h3>Detalle por página</h3>
      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>Archivo</th>
              <th>Estado</th>
              <th>Revisada</th>
              <th>Valoración</th>
              <th>Fórmulas ok</th>
              <th>Err. LaTeX</th>
              <th>CER</th>
              <th>Conf.</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {report.pages.map((p) => (
              <tr key={p.order}>
                <td>{p.order}</td>
                <td>{p.filename}</td>
                <td>{p.status}</td>
                <td>{p.reviewed ? '✓' : '—'}</td>
                <td>{p.rating ? RATING_LABEL[p.rating] : '—'}</td>
                <td>{p.metrics ? `${p.metrics.equations.exact}/${p.metrics.equations.total}` : '—'}</td>
                <td>{p.metrics ? pct(p.metrics.mathTokenErrorRate) : '—'}</td>
                <td>{p.metrics ? pct(p.metrics.textCer) : '—'}</td>
                <td>{pct(p.confidence, 0)}</td>
                <td>{p.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row">
        <a className="btn primary" href={api.reportMdUrl(run.id)}>
          Descargar informe (.md)
        </a>
        <a className="btn" href={`/api/runs/${run.id}/report.json`} target="_blank" rel="noreferrer">
          Ver JSON
        </a>
      </div>
      <p className="muted small">
        La referencia es el texto que corriges tú; solo cuentan las páginas marcadas como revisadas. La comparación de
        fórmulas es estricta (LaTeX igual tras ignorar espacios y estilo de matriz/función) y {report.cost.note}
      </p>
    </div>
  )
}
