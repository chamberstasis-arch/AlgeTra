import { checkExpectedAnswer, checkTranscription } from '../src/shared/linalg'
import type { AnswerStatus, ChecksResponse, Exercise } from '../src/shared/types'

export function summarize(statuses: AnswerStatus[]): AnswerStatus {
  if (!statuses.length) return 'unverifiable'
  if (statuses.every((s) => s === 'found')) return 'found'
  if (statuses.includes('mismatch')) return 'mismatch'
  if (statuses.every((s) => s === 'unverifiable')) return 'unverifiable'
  return statuses.includes('found') ? 'mismatch' : 'not-found'
}

/** Se omiten los valores internos (BigInt) para que la respuesta sea serializable. */
export function runChecks(text: string, exercises: Exercise[]): ChecksResponse {
  const c = checkTranscription(text)
  return {
    consistency: {
      verified: c.verified,
      inconsistent: c.inconsistent,
      unverifiable: c.unverifiable,
      checks: c.checks.map(({ latex, status, detail, cells }) => ({ latex, status, detail, cells })),
    },
    exercises: exercises.map((e) => {
      const answers = e.answers.map((a) => checkExpectedAnswer(a, text))
      return { ref: e.ref, number: e.number, statement: e.statement, answerText: e.answerText, answers, status: summarize(answers.map((a) => a.status)) }
    }),
  }
}

/** Estado de la respuesta final de una página para el informe (peor caso entre sus ejercicios). */
export function pageAnswerStatus(text: string, exercises: Exercise[]): AnswerStatus | undefined {
  if (!exercises.length) return undefined
  return summarize(exercises.flatMap((e) => e.answers.map((a) => checkExpectedAnswer(a, text).status)))
}
