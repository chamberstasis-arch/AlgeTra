// Evaluador de expresiones de una variable (x) para graficar funciones. Sin eval: parser propio.
// Soporta + - * / ^ **, paréntesis, multiplicación implícita (2x, 3(x+1)), pi, e y sin cos tan exp ln log sqrt abs.

export type Expr = (x: number) => number

const FUNCS: Record<string, (v: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, log: Math.log10,
  sqrt: Math.sqrt, abs: Math.abs, asin: Math.asin, acos: Math.acos, atan: Math.atan,
}

type Tok = { k: 'num'; v: number } | { k: 'id'; v: string } | { k: 'op'; v: string }

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  const re = /\s*(?:(\d+\.?\d*|\.\d+)|([A-Za-z_]+)|(\*\*|[-+*/^()]))/y
  let pos = 0
  while (pos < src.length) {
    re.lastIndex = pos
    const m = re.exec(src)
    if (!m) {
      if (/^\s*$/.test(src.slice(pos))) break
      throw new Error(`Carácter no válido en "${src.slice(pos).trim().slice(0, 8)}"`)
    }
    pos = re.lastIndex
    if (m[1] !== undefined) out.push({ k: 'num', v: Number(m[1]) })
    else if (m[2] !== undefined) out.push({ k: 'id', v: m[2] })
    else out.push({ k: 'op', v: m[3] === '**' ? '^' : m[3] })
  }
  return out
}

/** Compila la expresión o lanza un Error con un mensaje legible. */
export function compileExpr(src: string): Expr {
  const toks = tokenize(src)
  let i = 0
  const peek = () => toks[i]
  const isOp = (v: string) => peek()?.k === 'op' && (peek() as { v: string }).v === v

  // expr := term (('+'|'-') term)* ; term := unary (('*'|'/'|implícita) unary)* ; unary := '-' unary | power ; power := atom ('^' unary)?
  const parseExpr = (): Expr => {
    let l = parseTerm()
    while (isOp('+') || isOp('-')) {
      const op = (toks[i++] as { v: string }).v
      const r = parseTerm()
      const a = l
      l = op === '+' ? (x) => a(x) + r(x) : (x) => a(x) - r(x)
    }
    return l
  }
  const startsAtom = () => {
    const t = peek()
    return !!t && (t.k === 'num' || t.k === 'id' || (t.k === 'op' && t.v === '('))
  }
  const parseTerm = (): Expr => {
    let l = parseUnary()
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (toks[i++] as { v: string }).v
        const r = parseUnary()
        const a = l
        l = op === '*' ? (x) => a(x) * r(x) : (x) => a(x) / r(x)
      } else if (startsAtom()) {
        const r = parseUnary()
        const a = l
        l = (x) => a(x) * r(x)
      } else return l
    }
  }
  const parseUnary = (): Expr => {
    if (isOp('-')) {
      i++
      const e = parseUnary()
      return (x) => -e(x)
    }
    if (isOp('+')) {
      i++
      return parseUnary()
    }
    return parsePower()
  }
  const parsePower = (): Expr => {
    const base = parseAtom()
    if (isOp('^')) {
      i++
      const exp = parseUnary()
      return (x) => Math.pow(base(x), exp(x))
    }
    return base
  }
  const parseAtom = (): Expr => {
    const t = toks[i++]
    if (!t) throw new Error('Expresión incompleta')
    if (t.k === 'num') return () => t.v
    if (t.k === 'id') {
      if (t.v === 'x') return (x) => x
      if (t.v === 'pi') return () => Math.PI
      if (t.v === 'e') return () => Math.E
      const f = FUNCS[t.v]
      if (!f) throw new Error(`Función o símbolo desconocido: ${t.v}`)
      if (!isOp('(')) throw new Error(`Falta "(" después de ${t.v}`)
      i++
      const arg = parseExpr()
      if (!isOp(')')) throw new Error('Falta ")"')
      i++
      return (x) => f(arg(x))
    }
    if (t.v === '(') {
      const e = parseExpr()
      if (!isOp(')')) throw new Error('Falta ")"')
      i++
      return e
    }
    throw new Error(`Operador inesperado "${t.v}"`)
  }

  if (!toks.length) throw new Error('Expresión vacía')
  const e = parseExpr()
  if (i < toks.length) throw new Error('Sobran símbolos al final de la expresión')
  return e
}
