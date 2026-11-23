import temml from 'temml'
import 'temml/dist/Temml-Local.css'
import { useMemo } from 'react'
import { parseMmd, type Inline } from '../shared/mmd'

export function renderMath(latex: string, display: boolean): { html: string; error?: string } {
  try {
    return { html: temml.renderToString(latex, { displayMode: display, throwOnError: true, strict: false }) }
  } catch (err) {
    return { html: '', error: err instanceof Error ? err.message : String(err) }
  }
}

function Formula({ latex, display }: { latex: string; display: boolean }) {
  const r = useMemo(() => renderMath(latex, display), [latex, display])
  if (r.error)
    return (
      <code className="math-error" title={r.error}>
        {display ? `$$${latex}$$` : `$${latex}$`}
      </code>
    )
  return display ? (
    <div className="math-display" dangerouslySetInnerHTML={{ __html: r.html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: r.html }} />
  )
}

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((i, k) =>
        i.t === 'math' ? (
          <Formula key={k} latex={i.latex} display={false} />
        ) : i.bold ? (
          <strong key={k}>{i.text}</strong>
        ) : (
          <span key={k}>{i.text}</span>
        ),
      )}
    </>
  )
}

/** Muestra el texto MMD con las mismas reglas con las que se exporta a Word. */
export function MathView({ text }: { text: string }) {
  const blocks = useMemo(() => parseMmd(text), [text])
  if (!blocks.length) return <p className="muted">(sin contenido)</p>
  return (
    <div className="mathview">
      {blocks.map((b, k) => {
        if (b.t === 'display') return <Formula key={k} latex={b.latex} display />
        if (b.t === 'table')
          return (
            <table key={k}>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>
                        <Inlines items={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        const Tag = b.heading ? (`h${Math.min(b.heading + 2, 5)}` as 'h3') : 'p'
        return (
          <Tag key={k}>
            <Inlines items={b.inlines} />
          </Tag>
        )
      })}
    </div>
  )
}
