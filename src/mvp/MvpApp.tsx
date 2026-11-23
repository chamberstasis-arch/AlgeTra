import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ERROR_TAGS,
  ERROR_TAG_LABELS,
  type Activity,
  type AnswerStatus,
  type AppConfig,
  type ChecksResponse,
  type ErrorTag,
  type Page,
  type PageRating,
  type Run,
  type RunSummary,
} from '../shared/types'
import { api, type ExportCheck } from './api'
import { prepareImage } from './image'
import { MathView } from './MathView'
import { ReportView } from './ReportView'
import './mvp.css'

const STATUS_LABEL: Record<Page['status'], string> = {
  queued: 'En cola',
  processing: 'Transcribiendo…',
  done: 'Transcrita',
  error: 'Error',
}

const ANSWER_LABEL: Record<AnswerStatus, string> = {
  found: '✓ Respuesta esperada encontrada',
  mismatch: '✗ La respuesta no coincide',
  'not-found': '— No se halló un valor comparable',
  unverifiable: '— No verificable automáticamente',
}

const RATINGS: { value: PageRating; label: string }[] = [
  { value: 'perfect', label: 'Perfecta' },
  { value: 'minor', label: 'Errores menores' },
  { value: 'major', label: 'Errores graves' },
  { value: 'unusable', label: 'Inutilizable' },
]

/** Fragmentos LaTeX frecuentes en álgebra lineal para corregir sin escribir todo a mano. */
const SNIPPETS: { label: string; title: string; latex: string }[] = [
  { label: 'φ', title: '\\varphi', latex: '\\varphi' },
  { label: 'ϕ', title: '\\phi', latex: '\\phi' },
  { label: 'Φ', title: '\\Phi', latex: '\\Phi' },
  { label: 'λ', title: '\\lambda', latex: '\\lambda' },
  { label: '→v', title: 'vector \\vec{}', latex: '\\vec{v}' },
  { label: '𝐯', title: 'negrita \\mathbf{}', latex: '\\mathbf{v}' },
  { label: 'ℝⁿ', title: '\\mathbb{R}^{n}', latex: '\\mathbb{R}^{n}' },
  { label: '(▦)', title: 'matriz con paréntesis', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: '[▦]', title: 'matriz con corchetes', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
  { label: '|▦|', title: 'determinante', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
  { label: 'Aᵀ', title: 'transpuesta', latex: 'A^{T}' },
  { label: 'A⁻¹', title: 'inversa', latex: 'A^{-1}' },
  { label: '⟨,⟩', title: 'producto interno', latex: '\\langle u, v \\rangle' },
  { label: '⊥', title: '\\perp', latex: '\\perp' },
  { label: '∈', title: '\\in', latex: '\\in' },
  { label: 'det', title: '\\det', latex: '\\det' },
  { label: 'ker', title: '\\ker', latex: '\\ker' },
  { label: 'dim', title: '\\dim', latex: '\\dim' },
]

export default function MvpApp() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [runId, setRunId] = useState<string | null>(() => localStorage.getItem('algetra.run'))
  const [run, setRun] = useState<Run | null>(null)
  const [pageId, setPageId] = useState<string | null>(null)
  const [view, setView] = useState<'pages' | 'results'>('pages')
  const [error, setError] = useState<string | null>(null)
  const [exportWarn, setExportWarn] = useState<{ source: 'reviewed' | 'original'; check: ExportCheck } | null>(null)

  const refreshRuns = useCallback(() => api.listRuns().then(setRuns).catch((e: Error) => setError(e.message)), [])
  const refreshRun = useCallback(
    (id: string) =>
      api
        .getRun(id)
        .then((r) => {
          setRun(r)
          setError(null)
        })
        .catch((e: Error) => {
          if (/no encontrada/i.test(e.message)) {
            setRunId(null)
            setRun(null)
          } else setError(e.message)
        }),
    [],
  )

  useEffect(() => {
    api.config().then(setConfig).catch(() => setError('No se pudo conectar con el servidor (¿está corriendo `pnpm dev:server`?).'))
    refreshRuns()
  }, [refreshRuns])

  useEffect(() => {
    if (runId) {
      localStorage.setItem('algetra.run', runId)
      refreshRun(runId)
    } else {
      localStorage.removeItem('algetra.run')
      setRun(null)
    }
    setPageId(null)
    setExportWarn(null)
  }, [runId, refreshRun])

  const busy = run?.pages.some((p) => p.status === 'queued' || p.status === 'processing') ?? false
  useEffect(() => {
    if (!runId || !busy) return
    const t = setInterval(() => {
      refreshRun(runId)
      refreshRuns()
    }, 1500)
    return () => clearInterval(t)
  }, [runId, busy, refreshRun, refreshRuns])

  const pages = useMemo(() => [...(run?.pages ?? [])].sort((a, b) => a.order - b.order), [run])
  const page = pages.find((p) => p.id === pageId) ?? null

  const patchPage = (p: Page) => setRun((r) => (r ? { ...r, pages: r.pages.map((x) => (x.id === p.id ? p : x)) } : r))

  const startExport = async (source: 'reviewed' | 'original') => {
    if (!run) return
    try {
      const check = await api.exportCheck(run.id, source)
      if (check.failed.length) setExportWarn({ source, check })
      else window.location.assign(api.docxUrl(run.id, source))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const transcribed = pages.filter((p) => p.status === 'done').length

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Σ</span>
          <div>
            <strong>AlgeTra</strong>
            <small>Transcripción de álgebra lineal · MVP</small>
          </div>
        </div>
        <a className="proto-link" href="#/prototipo" onClick={() => setTimeout(() => window.location.reload(), 0)}>
          Ver prototipo de interfaz
        </a>
        {config && <MathpixBadge mode={config.mathpix} />}
      </header>

      {config?.mathpix === 'missing-credentials' && (
        <div className="banner banner-error">
          Faltan las credenciales de Mathpix. Copia <code>.env.example</code> a <code>.env</code>, define{' '}
          <code>MATHPIX_APP_ID</code> y <code>MATHPIX_APP_KEY</code> y reinicia el servidor. Para probar el flujo sin
          Mathpix usa <code>MATHPIX_MOCK=1</code>.
        </div>
      )}
      {config?.mathpix === 'mock' && (
        <div className="banner banner-warn">
          <strong>Modo simulado.</strong> Las transcripciones son ejemplos fijos de álgebra lineal; no se llama a Mathpix
          y las métricas no representan su precisión real.
        </div>
      )}
      {error && (
        <div className="banner banner-error" role="alert">
          {error} <button onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <NewRun
            defaultLayout
            onCreate={async (name, layout) => {
              try {
                const r = await api.createRun(name, layout)
                await refreshRuns()
                setRunId(r.id)
                setView('pages')
              } catch (e) {
                setError((e as Error).message)
              }
            }}
          />
          <h2>Pruebas</h2>
          {!runs.length && <p className="muted small">Aún no hay pruebas. Crea una para empezar.</p>}
          <ul className="runlist">
            {runs.map((r) => (
              <li key={r.id}>
                <button className={r.id === runId ? 'active' : ''} onClick={() => setRunId(r.id)}>
                  <span className="run-name">{r.name}</span>
                  <span className="run-meta">
                    {r.doneCount}/{r.pageCount} transcritas · {r.reviewedCount} revisadas
                    {r.errorCount ? ` · ${r.errorCount} con error` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="main">
          {!run ? (
            <div className="empty">
              <h1>Prueba de transcripción</h1>
              <p>
                Crea una prueba, sube tus fotos (de a una o en lotes de 10) y compara lo que transcribe Mathpix contra
                lo que realmente dice la hoja. Al final obtienes el DOCX con las fórmulas como ecuaciones de Word y un
                informe de precisión.
              </p>
            </div>
          ) : (
            <>
              <div className="run-head">
                <div>
                  <h1>{run.name}</h1>
                  <p className="muted small">
                    {pages.length} páginas · {transcribed} transcritas · página completa (layout):{' '}
                    {run.settings.documentLayout ? 'sí' : 'no'}
                  </p>
                </div>
                <div className="actions">
                  <button className="btn primary" disabled={!transcribed} onClick={() => startExport('reviewed')}>
                    Descargar DOCX
                  </button>
                  <button className="btn" disabled={!transcribed} onClick={() => startExport('original')} title="Sin tus correcciones">
                    DOCX original
                  </button>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (!window.confirm(`¿Eliminar la prueba "${run.name}" y todas sus imágenes?`)) return
                      await api.deleteRun(run.id)
                      setRunId(null)
                      refreshRuns()
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {exportWarn && (
                <div className="banner banner-warn">
                  <strong>{exportWarn.check.failed.length} de {exportWarn.check.formulas} fórmulas no se pueden convertir a ecuación de Word.</strong>{' '}
                  Aparecerán como texto LaTeX resaltado en amarillo. Corrígelas en la revisión o descarga igualmente.
                  <ul>
                    {exportWarn.check.failed.slice(0, 5).map((f, i) => (
                      <li key={i}>
                        <em>{f.page}</em>: <code>{f.latex.slice(0, 80)}</code> — {f.error.slice(0, 120)}
                      </li>
                    ))}
                  </ul>
                  <button className="btn small" onClick={() => { window.location.assign(api.docxUrl(run.id, exportWarn.source)); setExportWarn(null) }}>
                    Descargar de todos modos
                  </button>{' '}
                  <button className="btn small" onClick={() => setExportWarn(null)}>
                    Cancelar
                  </button>
                </div>
              )}

              <nav className="tabs">
                <button className={view === 'pages' ? 'active' : ''} onClick={() => setView('pages')}>
                  Páginas
                </button>
                <button className={view === 'results' ? 'active' : ''} onClick={() => setView('results')}>
                  Precisión
                </button>
              </nav>

              {view === 'results' ? (
                <ReportView run={run} />
              ) : (
                <div className="workspace">
                  <section className="pagelist">
                    <Uploader
                      runId={run.id}
                      onError={setError}
                      onUploaded={async (firstNew) => {
                        await refreshRun(run.id)
                        refreshRuns()
                        if (!pageId && firstNew) setPageId(firstNew)
                      }}
                    />
                    <Progress pages={pages} />
                    <ul>
                      {pages.map((p) => (
                        <li key={p.id}>
                          <button className={p.id === pageId ? 'active' : ''} onClick={() => setPageId(p.id)}>
                            <img src={api.imageUrl(run.id, p.id)} alt="" loading="lazy" />
                            <span className="page-info">
                              <span className="page-name">
                                {p.order}. {p.filename}
                              </span>
                              <span className={`chip chip-${p.status}`}>{STATUS_LABEL[p.status]}</span>
                              {p.review.reviewed && <span className="chip chip-reviewed">✓ Revisada</span>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="reviewpane">
                    {page ? (
                      <ReviewPanel
                        key={`${page.id}:${page.processedAt ?? ''}`}
                        run={run}
                        page={page}
                        hasPrev={pages[0]?.id !== page.id}
                        hasNext={pages[pages.length - 1]?.id !== page.id}
                        onNav={(d) => {
                          const i = pages.findIndex((p) => p.id === page.id)
                          const next = pages[i + d]
                          if (next) setPageId(next.id)
                        }}
                        onSaved={(p) => {
                          patchPage(p)
                          refreshRuns()
                        }}
                        onRetry={async () => {
                          try {
                            patchPage(await api.retry(run.id, page.id))
                            refreshRun(run.id)
                          } catch (e) {
                            setError((e as Error).message)
                          }
                        }}
                        onDelete={async () => {
                          if (!window.confirm('¿Eliminar esta página?')) return
                          await api.deletePage(run.id, page.id)
                          setPageId(null)
                          refreshRun(run.id)
                          refreshRuns()
                        }}
                        onError={setError}
                      />
                    ) : (
                      <div className="empty small">
                        <p>Selecciona una página para revisar su transcripción.</p>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function MathpixBadge({ mode }: { mode: AppConfig['mathpix'] }) {
  const map = {
    ready: ['ok', 'Mathpix conectado'],
    mock: ['warn', 'Modo simulado'],
    'missing-credentials': ['error', 'Sin credenciales'],
  } as const
  const [cls, label] = map[mode]
  return <span className={`badge badge-${cls}`}>{label}</span>
}

function NewRun({ onCreate, defaultLayout }: { onCreate: (name: string, layout: boolean) => void; defaultLayout: boolean }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [layout, setLayout] = useState(defaultLayout)
  if (!open)
    return (
      <button className="btn primary block" onClick={() => setOpen(true)}>
        + Nueva prueba
      </button>
    )
  return (
    <form
      className="newrun"
      onSubmit={(e) => {
        e.preventDefault()
        onCreate(name.trim() || `Prueba ${new Date().toLocaleString('es')}`, layout)
        setOpen(false)
        setName('')
      }}
    >
      <label>
        Nombre
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Tarea 3 – Transformaciones" />
      </label>
      <label className="check">
        <input type="checkbox" checked={layout} onChange={(e) => setLayout(e.target.checked)} />
        <span>
          Modo página completa (<code>enable_document_layout</code>). Recomendado para hojas con varias líneas; desactívalo
          para comparar.
        </span>
      </label>
      <div className="row">
        <button className="btn primary" type="submit">
          Crear
        </button>
        <button className="btn" type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Uploader({
  runId,
  onUploaded,
  onError,
}: {
  runId: string
  onUploaded: (firstNewPageId?: string) => void
  onError: (msg: string) => void
}) {
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const upload = async (list: FileList | File[]) => {
    const files = [...list].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return onError('Selecciona imágenes (JPEG o PNG).')
    setProgress({ done: 0, total: files.length })
    let first: string | undefined
    const rejected: string[] = []
    try {
      // Se suben en tandas pequeñas: el lote empieza a transcribirse mientras termina de subir.
      for (let i = 0; i < files.length; i += 3) {
        const prepared = await Promise.all(files.slice(i, i + 3).map(prepareImage))
        const res = await api.upload(runId, prepared)
        first ??= res.added[0]
        rejected.push(...res.rejected.map((r) => `${r.filename}: ${r.reason}`))
        setProgress({ done: Math.min(i + 3, files.length), total: files.length })
        onUploaded(first)
      }
      if (rejected.length) onError(rejected.join(' · '))
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setProgress(null)
      onUploaded(first)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    upload(e.dataTransfer.files)
  }

  return (
    <div
      className={`dropzone ${drag ? 'drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) upload(e.target.files)
          e.target.value = ''
        }}
      />
      {progress ? (
        <p>
          Subiendo {progress.done}/{progress.total}…
        </p>
      ) : (
        <>
          <button className="btn primary" onClick={() => input.current?.click()}>
            Subir fotos
          </button>
          <p className="muted small">Arrastra aquí 1 foto o un lote (10 o más). JPEG/PNG.</p>
        </>
      )}
    </div>
  )
}

function Progress({ pages }: { pages: Page[] }) {
  if (!pages.length) return null
  const done = pages.filter((p) => p.status === 'done' || p.status === 'error').length
  const errors = pages.filter((p) => p.status === 'error').length
  const reviewed = pages.filter((p) => p.review.reviewed).length
  return (
    <div className="progress">
      <div className="bar">
        <div style={{ width: `${(done / pages.length) * 100}%` }} />
      </div>
      <p className="muted small">
        {done}/{pages.length} procesadas{errors ? ` · ${errors} con error` : ''} · {reviewed} revisadas
      </p>
    </div>
  )
}

interface ReviewProps {
  run: Run
  page: Page
  hasPrev: boolean
  hasNext: boolean
  onNav: (delta: -1 | 1) => void
  onSaved: (p: Page) => void
  onRetry: () => void
  onDelete: () => void
  onError: (msg: string) => void
}

function ReviewPanel({ run, page, hasPrev, hasNext, onNav, onSaved, onRetry, onDelete, onError }: ReviewProps) {
  const original = page.text ?? ''
  const [text, setText] = useState(page.review.editedText ?? original)
  const [rating, setRating] = useState<PageRating | undefined>(page.review.rating)
  const [tags, setTags] = useState<ErrorTag[]>(page.review.tags)
  const [notes, setNotes] = useState(page.review.notes)
  const [tab, setTab] = useState<'edit' | 'original'>('edit')
  const [zoom, setZoom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refs, setRefs] = useState<string[]>(page.review.exerciseRefs ?? [])
  const [activities, setActivities] = useState<Activity[]>([])
  const [checks, setChecks] = useState<ChecksResponse | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.corpus().then((c) => setActivities(c.activities)).catch(() => {})
  }, [])

  // Verificación en vivo (con pequeña espera) del texto que se está corrigiendo.
  useEffect(() => {
    const t = setTimeout(() => {
      api.checks(text, refs).then(setChecks).catch(() => {})
    }, 350)
    return () => clearTimeout(t)
  }, [text, refs])

  const unchanged = text === original
  const dirty =
    text !== (page.review.editedText ?? original) ||
    rating !== page.review.rating ||
    notes !== page.review.notes ||
    tags.join() !== page.review.tags.join() ||
    refs.join() !== (page.review.exerciseRefs ?? []).join()

  const save = async (reviewed: boolean, advance = false) => {
    setSaving(true)
    try {
      const saved = await api.review(run.id, page.id, {
        editedText: text,
        reviewed,
        rating: rating ?? (reviewed && unchanged ? 'perfect' : null),
        tags,
        notes,
        exerciseRefs: refs,
      })
      onSaved(saved)
      if (advance && hasNext) onNav(1)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const insert = (latex: string) => {
    const el = area.current
    if (!el) return setText((t) => `${t} $${latex}$`)
    const { selectionStart: a, selectionEnd: b } = el
    const wrapped = text.slice(a, b).includes('$') ? latex : `$${latex}$`
    setText(text.slice(0, a) + wrapped + text.slice(b))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + wrapped.length, a + wrapped.length)
    })
  }

  const m = page.meta
  return (
    <div className="review">
      <div className="review-head">
        <div>
          <strong>
            {page.order}. {page.filename}
          </strong>{' '}
          <span className={`chip chip-${page.status}`}>{STATUS_LABEL[page.status]}</span>
          {page.mock && <span className="chip chip-mock">simulada</span>}
        </div>
        <div className="row">
          <button className="btn small" disabled={!hasPrev} onClick={() => onNav(-1)}>
            ← Anterior
          </button>
          <button className="btn small" disabled={!hasNext} onClick={() => onNav(1)}>
            Siguiente →
          </button>
        </div>
      </div>

      <div className="review-grid">
        <div className="viewer-wrap">
          <div className="row between">
            <span className="muted small">Original</span>
            <button className="btn small" onClick={() => setZoom((z) => !z)}>
              {zoom ? 'Ajustar al ancho' : 'Ampliar ×2'}
            </button>
          </div>
          <div className={`viewer ${zoom ? 'zoomed' : ''}`}>
            <img src={api.imageUrl(run.id, page.id)} alt={`Hoja ${page.filename}`} />
          </div>
        </div>

        <div className="editor-wrap">
          {page.status === 'queued' || page.status === 'processing' ? (
            <div className="empty small">
              <p>{STATUS_LABEL[page.status]}</p>
            </div>
          ) : page.status === 'error' ? (
            <div className="errorbox">
              <strong>No se pudo transcribir.</strong>
              <p>{page.error?.message}</p>
              <p className="muted small">Código: {page.error?.code}</p>
              <div className="row">
                <button className="btn primary" onClick={onRetry}>
                  Reintentar
                </button>
                <button className="btn danger" onClick={onDelete}>
                  Eliminar página
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="meta small muted">
                {m?.confidence !== undefined && <span>Confianza Mathpix: {(m.confidence * 100).toFixed(0)} %</span>}
                {m?.isHandwritten !== undefined && <span>{m.isHandwritten ? 'manuscrito' : 'impreso'}</span>}
                {page.latencyMs !== undefined && <span>{(page.latencyMs / 1000).toFixed(1)} s</span>}
                <a href={api.rawUrl(run.id, page.id)} target="_blank" rel="noreferrer">
                  respuesta bruta
                </a>
              </div>

              <div className="tabs inner">
                <button className={tab === 'edit' ? 'active' : ''} onClick={() => setTab('edit')}>
                  Corregir
                </button>
                <button className={tab === 'original' ? 'active' : ''} onClick={() => setTab('original')}>
                  Original de Mathpix
                </button>
              </div>

              {tab === 'edit' ? (
                <>
                  <div className="palette" role="toolbar" aria-label="Símbolos de álgebra lineal">
                    {SNIPPETS.map((s) => (
                      <button key={s.title} title={s.title} onClick={() => insert(s.latex)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={area}
                    value={text}
                    spellCheck={false}
                    onChange={(e) => setText(e.target.value)}
                    aria-label="Transcripción corregida en Mathpix Markdown"
                  />
                  <div className="row between">
                    <span className="muted small">{unchanged ? 'Sin cambios respecto al original.' : 'Con cambios.'}</span>
                    <button className="btn small" disabled={unchanged} onClick={() => setText(original)}>
                      Restablecer original
                    </button>
                  </div>
                </>
              ) : (
                <textarea value={original} readOnly spellCheck={false} aria-label="Transcripción original" />
              )}

              <h3>Vista previa (así se exporta a Word)</h3>
              <div className="preview">
                <MathView text={tab === 'edit' ? text : original} />
              </div>

              <h3>Base de actividades</h3>
              <div className="row wrap-tight">
                <select
                  value=""
                  aria-label="Asignar ejercicio de la base"
                  onChange={(e) => e.target.value && !refs.includes(e.target.value) && setRefs([...refs, e.target.value])}
                >
                  <option value="">+ Ejercicio de esta página…</option>
                  {activities.map((a) => (
                    <optgroup key={a.id} label={`${a.id} · ${a.title}`}>
                      {a.exercises.map((x) => (
                        <option key={x.ref} value={x.ref}>
                          Ejercicio {x.number}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {refs.map((r) => (
                  <button key={r} className="chip-btn on" title="Quitar" onClick={() => setRefs(refs.filter((x) => x !== r))}>
                    {r} ✕
                  </button>
                ))}
              </div>
              {!activities.length && <p className="muted small">No hay actividades en <code>corpus/actividades/</code> (ver <code>corpus/README.md</code>).</p>}
              {checks?.exercises.map((x) => (
                <div key={x.ref} className={`exercise ex-${x.status}`}>
                  <div className="row between">
                    <strong>{x.ref}</strong>
                    <span className="small">{ANSWER_LABEL[x.status]}</span>
                  </div>
                  <MathView text={x.statement} />
                  <p className="muted small">Respuesta esperada:</p>
                  <MathView text={x.answerText} />
                  {x.status !== 'found' && x.answers.map((a, i) => <p key={i} className="small">{a.detail}</p>)}
                </div>
              ))}

              <h3>Verificación aritmética</h3>
              {checks ? (
                <>
                  <p className="small muted">
                    {checks.consistency.verified} verificadas · <strong className={checks.consistency.inconsistent ? 'bad' : ''}>{checks.consistency.inconsistent} inconsistentes</strong> · {checks.consistency.unverifiable} no verificables (con variables o símbolos)
                  </p>
                  {checks.consistency.checks
                    .filter((c) => c.status === 'inconsistent')
                    .map((c, i) => (
                      <div key={i} className="exercise ex-mismatch">
                        <code>{c.latex.length > 90 ? `${c.latex.slice(0, 90)}…` : c.latex}</code>
                        <p className="small">{c.detail} Puede ser un dígito mal leído o un error del alumno: compara con la imagen.</p>
                      </div>
                    ))}
                </>
              ) : (
                <p className="small muted">Calculando…</p>
              )}

              <h3>Evaluación de esta página</h3>
              <div className="chips">
                {RATINGS.map((r) => (
                  <button key={r.value} className={`chip-btn ${rating === r.value ? 'on' : ''}`} onClick={() => setRating(rating === r.value ? undefined : r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="muted small">¿Dónde falló?</p>
              <div className="chips">
                {ERROR_TAGS.map((t) => (
                  <button
                    key={t}
                    className={`chip-btn ${tags.includes(t) ? 'on' : ''}`}
                    onClick={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                  >
                    {ERROR_TAG_LABELS[t]}
                  </button>
                ))}
              </div>
              <textarea className="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional): letra difusa, tinta clara, hoja doblada…" rows={2} />

              <div className="row wrap">
                <button className="btn primary" disabled={saving} onClick={() => save(true, true)}>
                  {unchanged ? 'Está correcta' : 'Confirmar corrección'} y siguiente
                </button>
                <button className="btn" disabled={saving || !dirty} onClick={() => save(page.review.reviewed)}>
                  Guardar
                </button>
                {page.review.reviewed && (
                  <button className="btn" disabled={saving} onClick={() => save(false)}>
                    Reabrir
                  </button>
                )}
                <a className="btn" href={api.docxUrl(run.id, 'reviewed', [page.id])}>
                  DOCX de esta página
                </a>
                <button className="btn" onClick={onRetry} title="Vuelve a enviar la imagen a Mathpix (se factura otra imagen)">
                  Re-transcribir
                </button>
                <button className="btn danger" onClick={onDelete}>
                  Eliminar
                </button>
              </div>
              {page.review.reviewed && <p className="muted small">✓ Revisada {page.review.reviewedAt ? new Date(page.review.reviewedAt).toLocaleString('es') : ''}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
