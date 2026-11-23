import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'

const Prototype = lazy(() => import('./PrototypeEntry'))
const MvpApp = lazy(() => import('./mvp/MvpApp'))

const isPrototype = window.location.hash === '#/prototipo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>{isPrototype ? <Prototype /> : <MvpApp />}</Suspense>
  </StrictMode>,
)
