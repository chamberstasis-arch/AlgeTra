import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
  type ReactNode,
} from 'react'

type Screen = 'documents' | 'capture' | 'processing' | 'review' | 'preview'
type Quality = 'ready' | 'attention' | 'critical'

type Page = {
  id: string
  name: string
  pageNumber: number
  blocks: number
  quality: Quality
  qualityScore: number
  dataUrl?: string
  source: 'fixture' | 'local'
}

export type IconName =
  | 'archive'
  | 'arrow-left'
  | 'arrow-right'
  | 'bell'
  | 'book'
  | 'camera'
  | 'chart'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'copy'
  | 'download'
  | 'edit'
  | 'eye'
  | 'file-text'
  | 'filter'
  | 'grid'
  | 'help'
  | 'image'
  | 'info'
  | 'layers'
  | 'loader'
  | 'lock'
  | 'menu'
  | 'moon'
  | 'more-horizontal'
  | 'plus'
  | 'refresh'
  | 'save'
  | 'search'
  | 'send'
  | 'shield'
  | 'sparkle'
  | 'sun'
  | 'trash'
  | 'upload'
  | 'x'

type IconProps = {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}

const iconPaths: Partial<Record<IconName, ReactNode>> = {
  archive: (
    <>
      <path d="M3 7h18" />
      <path d="M5 7v12h14V7" />
      <path d="M4 3h16l1 4H3l1-4Z" />
      <path d="M9 11h6" />
    </>
  ),
  'arrow-left': <path d="m15 18-6-6 6-6M9 12h10" />,
  'arrow-right': <path d="M5 12h14m-6-6 6 6-6 6" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 5.5v16M8 7h8M8 11h7" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h17" />
      <path d="m7 15 3-4 3 2 5-7" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-left': <path d="m14 18-6-6 6-6" />,
  'chevron-right': <path d="m10 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="11" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
    </>
  ),
  edit: (
    <>
      <path d="m4 16-.8 4.8L8 20l11.3-11.3a2.1 2.1 0 0 0-3-3L4 16Z" />
      <path d="m14.8 7.2 3 3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  'file-text': (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.3 2.3 0 1 1 3.8 1.7c-1.1.8-1.6 1.3-1.6 2.8M12 17h.01" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 5-5 3.5 3 2.5-2 5 4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  loader: (
    <>
      <path d="M20 12a8 8 0 0 1-8 8" />
      <path d="M12 4a8 8 0 0 1 8 8" opacity=".35" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  moon: (
    <>
      <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.4 8.4 0 1 0 12 12Z" />
    </>
  ),
  'more-horizontal': (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.7-3L3 11" />
      <path d="M3 5v6h6M4 13a8 8 0 0 0 14.7 3L21 13" />
      <path d="M21 19v-6h-6" />
    </>
  ),
  save: (
    <>
      <path d="M5 3h12l2 2v16H5V3Z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </>
  ),
  send: (
    <>
      <path d="m3 4 18 8-18 8 3-8-3-8Z" />
      <path d="M6 12h15" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-4.8" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m0 0L8 8m4-4 4 4M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
}

export function Icon({ name, size = 18, strokeWidth = 1.8, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {iconPaths[name] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  )
}

const fixturePages: Page[] = [
  {
    id: 'page-1',
    name: 'pagina-01.png',
    pageNumber: 1,
    blocks: 5,
    quality: 'ready',
    qualityScore: 96,
    source: 'fixture',
  },
  {
    id: 'page-2',
    name: 'pagina-02.png',
    pageNumber: 2,
    blocks: 4,
    quality: 'ready',
    qualityScore: 91,
    source: 'fixture',
  },
  {
    id: 'page-3',
    name: 'pagina-03.png',
    pageNumber: 3,
    blocks: 2,
    quality: 'attention',
    qualityScore: 78,
    source: 'fixture',
  },
]

const reviewBlocks = [
  {
    id: 'heading-1',
    type: 'heading',
    label: 'Encabezado',
    content: 'Ecuaciones lineales',
    confidence: 98,
    state: 'confirmed',
  },
  {
    id: 'paragraph-1',
    type: 'paragraph',
    label: 'Párrafo',
    content: 'Resuelve la siguiente ecuación y comprueba el resultado.',
    confidence: 94,
    state: 'confirmed',
  },
  {
    id: 'equation-1',
    type: 'equation',
    label: 'Ecuación',
    content: '3x + 5 = 20',
    confidence: 72,
    state: 'ambiguous',
  },
  {
    id: 'paragraph-2',
    type: 'paragraph',
    label: 'Párrafo',
    content: 'Restamos 5 en ambos lados y dividimos entre 3.',
    confidence: 89,
    state: 'confirmed',
  },
  {
    id: 'figure-1',
    type: 'figure',
    label: 'Figura conservada',
    content: 'Procedimiento manuscrito original',
    confidence: 100,
    state: 'preserved',
  },
] as const

const processSteps = [
  {
    title: 'Preparando variantes',
    detail: 'Original inmutable · contraste suave',
  },
  {
    title: 'Clasificando bloques',
    detail: 'Geometría y procedencia por página',
  },
  {
    title: 'Transcribiendo contenido',
    detail: 'Adaptador Mathpix · fixture local',
  },
  {
    title: 'Publicando resultados',
    detail: 'Bloques disponibles para revisión',
  },
]

function qualityLabel(quality: Quality) {
  if (quality === 'critical') return 'Recapturar'
  if (quality === 'attention') return 'Revisar'
  return 'Lista'
}

function qualityClass(quality: Quality) {
  return `quality-${quality}`
}

function App() {
  const [screen, setScreen] = useState<Screen>('documents')
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPageId, setSelectedPageId] = useState('page-1')
  const [selectedBlockId, setSelectedBlockId] = useState('equation-1')
  const [processPhase, setProcessPhase] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [resolvedAmbiguity, setResolvedAmbiguity] = useState(false)
  const [savedVersion, setSavedVersion] = useState(false)
  const [exported, setExported] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('Tarea de álgebra · Semana 4')
  const [equation, setEquation] = useState('3x + 5 = 20')
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? fixturePages[0],
    [pages, selectedPageId],
  )

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (screen !== 'processing') return
    if (processPhase >= processSteps.length) {
      const timer = window.setTimeout(() => {
        setScreen('review')
        setSavedVersion(false)
        setToast('Resultados disponibles: ya puedes revisar la primera ambigüedad.')
      }, 850)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setProcessPhase((phase) => Math.min(phase + 1, processSteps.length))
    }, 1150)
    return () => window.clearTimeout(timer)
  }, [processPhase, screen])

  function goTo(nextScreen: Screen) {
    setScreen(nextScreen)
    setMobileNavOpen(false)
  }

  function openReview() {
    setPages(fixturePages)
    setSelectedPageId('page-1')
    setSelectedBlockId('equation-1')
    setResolvedAmbiguity(false)
    setSavedVersion(true)
    setExported(false)
    goTo('review')
  }

  function startNewDocument() {
    setPages([])
    setSelectedPageId('page-1')
    setResolvedAmbiguity(false)
    setSavedVersion(false)
    setExported(false)
    setDocumentTitle('Nuevo documento')
    goTo('capture')
  }

  function loadFixture() {
    setPages(fixturePages)
    setSelectedPageId('page-1')
    setDocumentTitle('Tarea de álgebra · Semana 4')
    setToast('Fixture sintético cargado. No contiene datos de usuarios.')
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? [])
    const available = Math.max(0, 3 - pages.length)
    const accepted = incoming.slice(0, available).filter((file) =>
      ['image/jpeg', 'image/png'].includes(file.type),
    )

    if (incoming.length > accepted.length) {
      setToast('Solo se admiten hasta 3 imágenes JPEG o PNG.')
    }

    if (!accepted.length) {
      event.target.value = ''
      return
    }

    accepted.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = () => {
        const isLikelyCritical = /borros|blur|oscura|dark/i.test(file.name)
        const nextPage: Page = {
          id: `local-${Date.now()}-${index}`,
          name: file.name,
          pageNumber: pages.length + index + 1,
          blocks: 0,
          quality: isLikelyCritical ? 'critical' : 'ready',
          qualityScore: isLikelyCritical ? 31 : 92,
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
          source: 'local',
        }
        setPages((current) => [...current, nextPage].slice(0, 3))
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  function removePage(pageId: string) {
    setPages((current) =>
      current
        .filter((page) => page.id !== pageId)
        .map((page, index) => ({ ...page, pageNumber: index + 1 })),
    )
    setToast('Página retirada de la cola local. El original aún no se ha cargado.')
  }

  function startProcessing() {
    const sourcePages = pages.length ? pages : fixturePages
    if (sourcePages.some((page) => page.quality === 'critical')) {
      setToast('Hay una captura irrecuperable. Recaptúrala antes de iniciar OCR.')
      return
    }
    setPages(sourcePages)
    setProcessPhase(0)
    setSavedVersion(false)
    setExported(false)
    goTo('processing')
  }

  function startManualMode() {
    const sourcePages = pages.length ? pages : fixturePages
    setPages(sourcePages)
    setResolvedAmbiguity(false)
    setSavedVersion(false)
    setToast('Modo manual activado: no se llamará a OCR y cada página quedará marcada para edición.')
    goTo('review')
  }

  function confirmAmbiguity() {
    setResolvedAmbiguity(true)
    setToast('Ambigüedad confirmada en la revisión actual. La transcripción bruta permanece intacta.')
  }

  function saveVersion() {
    setSavedVersion(true)
    setToast('Versión 04 guardada. Los cambios quedan separados de la transcripción original.')
  }

  function downloadDemoPdf() {
    const escapePdf = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    const lines = [
      'AlgeTra - documento de demostracion',
      documentTitle.replace(/[áéíóúÁÉÍÓÚ]/g, (letter) =>
        ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' })[letter] ?? letter,
      ),
      'Ecuaciones lineales',
      equation,
      'Resultado revisado por la persona usuaria.',
      'Figura original conservada como recurso visual.',
    ]
    const stream = [
      'BT',
      '/F1 18 Tf',
      '72 740 Td',
      ...lines.flatMap((line, index) => [
        index === 0 ? `(${escapePdf(line)}) Tj` : `0 -${index === 1 ? 34 : 28} Td (${escapePdf(line)}) Tj`,
      ]),
      'ET',
    ].join('\n')
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ]
    let pdf = '%PDF-1.4\n'
    const offsets = [0]
    objects.forEach((object, index) => {
      offsets.push(pdf.length)
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
    })
    const xrefOffset = pdf.length
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
    })
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'algetra-tarea-algebra-demo.pdf'
    link.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setToast('PDF de demostración descargado y asociado a la versión 04.')
  }

  const breadcrumb =
    screen === 'documents'
      ? 'Documentos'
      : screen === 'capture'
        ? 'Nuevo documento'
        : `Documentos / ${documentTitle}`

  return (
    <div className="app-shell">
      <Sidebar
        currentScreen={screen}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onNavigate={(next) => {
          if (next === 'documents') goTo('documents')
          else setToast('Esta sección se habilita después del recorrido MVP-0.')
        }}
        onNewDocument={startNewDocument}
      />

      <div className="app-content">
        <TopBar
          breadcrumb={breadcrumb}
          onMenu={() => setMobileNavOpen((open) => !open)}
          onHelp={() => setToast('Atajo de ayuda: revisa cada bloque desde el recorte original.')}
        />

        <div className="prototype-banner">
          <div className="prototype-banner-copy">
            <span className="prototype-dot" />
            <strong>Prototipo B · MVP-0 experimental</strong>
            <span className="prototype-separator">/</span>
            <span>Datos sintéticos · Mathpix desactivado</span>
          </div>
          <span className="prototype-banner-link">
            <Icon name="lock" size={13} /> Solo tú puedes ver este espacio
          </span>
        </div>

        <main className="main-content">
          {screen === 'documents' && (
            <DocumentsScreen onNewDocument={startNewDocument} onOpenReview={openReview} />
          )}
          {screen === 'capture' && (
            <CaptureScreen
              documentTitle={documentTitle}
              fileInputRef={fileInputRef}
              onBack={() => goTo('documents')}
              onFileChange={onFileChange}
              onLoadFixture={loadFixture}
              onManualMode={startManualMode}
              onRemovePage={removePage}
              onStartProcessing={startProcessing}
              onTitleChange={setDocumentTitle}
              pages={pages}
              onAddPage={() => fileInputRef.current?.click()}
            />
          )}
          {screen === 'processing' && (
            <ProcessingScreen
              documentTitle={documentTitle}
              pages={pages.length ? pages : fixturePages}
              phase={processPhase}
              onBack={() => goTo('documents')}
              onShowPartial={() => goTo('review')}
            />
          )}
          {screen === 'review' && (
            <ReviewScreen
              documentTitle={documentTitle}
              equation={equation}
              onEquationChange={setEquation}
              onBack={() => goTo('documents')}
              onBlockSelect={setSelectedBlockId}
              onConfirmAmbiguity={confirmAmbiguity}
              onPreview={() => goTo('preview')}
              onSave={saveVersion}
              pages={pages.length ? pages : fixturePages}
              resolvedAmbiguity={resolvedAmbiguity}
              savedVersion={savedVersion}
              selectedBlockId={selectedBlockId}
              selectedPage={selectedPage}
              onPageSelect={setSelectedPageId}
            />
          )}
          {screen === 'preview' && (
            <PreviewScreen
              documentTitle={documentTitle}
              exported={exported}
              onBack={() => goTo('review')}
              onDownload={downloadDemoPdf}
              onTitleChange={setDocumentTitle}
              onReview={() => goTo('review')}
            />
          )}
        </main>
      </div>

      {toast && (
        <div className="toast" role="status">
          <Icon name="check-circle" size={18} />
          <span>{toast}</span>
          <button aria-label="Cerrar aviso" className="toast-close" onClick={() => setToast(null)}>
            <Icon name="x" size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

function Sidebar({
  currentScreen,
  mobileOpen,
  onClose,
  onNavigate,
  onNewDocument,
}: {
  currentScreen: Screen
  mobileOpen: boolean
  onClose: () => void
  onNavigate: (screen: 'documents' | 'activity') => void
  onNewDocument: () => void
}) {
  return (
    <>
      {mobileOpen && <button aria-label="Cerrar menú" className="mobile-scrim" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="brand-name">AlgeTra</span>
          <span className="brand-beta">BETA</span>
          <button aria-label="Cerrar menú" className="sidebar-close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <button className="new-document-button" onClick={onNewDocument}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
          <span>Nuevo documento</span>
          <span className="new-document-shortcut">N</span>
        </button>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          <p className="nav-label">TU ESPACIO</p>
          <SidebarItem
            active={currentScreen === 'documents' || currentScreen === 'capture'}
            icon="file-text"
            label="Documentos"
            onClick={() => onNavigate('documents')}
            count="3"
          />
          <SidebarItem icon="clock" label="Recientes" onClick={() => onNavigate('activity')} />
          <SidebarItem icon="archive" label="Archivados" onClick={() => onNavigate('activity')} />

          <p className="nav-label nav-label-spaced">VALIDACIÓN</p>
          <SidebarItem icon="chart" label="Métricas del piloto" onClick={() => onNavigate('activity')} />
          <SidebarItem icon="book" label="Guía de revisión" onClick={() => onNavigate('activity')} />
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-card">
            <div className="privacy-icon">
              <Icon name="shield" size={16} />
            </div>
            <div>
              <strong>Espacio privado</strong>
              <span>Datos de evaluación aislados</span>
            </div>
          </div>
          <div className="user-row">
            <div className="avatar">MC</div>
            <div className="user-copy">
              <strong>María C.</strong>
              <span>Evaluadora invitada</span>
            </div>
            <button aria-label="Más opciones de perfil" className="icon-button small-icon-button">
              <Icon name="more-horizontal" size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function SidebarItem({
  active = false,
  count,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  count?: string
  icon: IconName
  label: string
  onClick: () => void
}) {
  return (
    <button className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`} onClick={onClick}>
      <Icon name={icon} size={18} />
      <span>{label}</span>
      {count && <span className="sidebar-count">{count}</span>}
    </button>
  )
}

function TopBar({ breadcrumb, onHelp, onMenu }: { breadcrumb: string; onHelp: () => void; onMenu: () => void }) {
  return (
    <header className="topbar">
      <button aria-label="Abrir menú" className="mobile-menu-button" onClick={onMenu}>
        <Icon name="menu" size={21} />
      </button>
      <div className="breadcrumbs">
        <span>AlgeTra</span>
        <Icon name="chevron-right" size={14} />
        <strong>{breadcrumb}</strong>
      </div>
      <div className="topbar-actions">
        <button aria-label="Ayuda" className="topbar-icon-button" onClick={onHelp}>
          <Icon name="help" size={19} />
        </button>
        <button aria-label="Notificaciones" className="topbar-icon-button notification-button" onClick={onHelp}>
          <Icon name="bell" size={19} />
          <span className="notification-dot" />
        </button>
        <div className="topbar-avatar">MC</div>
      </div>
    </header>
  )
}

function DocumentsScreen({ onNewDocument, onOpenReview }: { onNewDocument: () => void; onOpenReview: () => void }) {
  return (
    <div className="screen documents-screen">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">TU ESPACIO PRIVADO</p>
          <h1>Documentos</h1>
          <p className="page-subtitle">Convierte tus apuntes en entregables verificables.</p>
        </div>
        <button className="primary-button" onClick={onNewDocument}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
          Nuevo documento
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="Documentos activos" value="3" trend="+1 esta semana" icon="file-text" tone="blue" />
        <StatCard label="Pendientes de revisión" value="1" trend="Tarea de álgebra" icon="eye" tone="orange" />
        <StatCard label="Tiempo ahorrado" value="24 min" trend="vs. transcripción manual" icon="clock" tone="green" />
      </div>

      <div className="section-heading-row">
        <div>
          <h2>Continúa donde lo dejaste</h2>
          <p>Tu último documento tiene una ambigüedad esperando confirmación.</p>
        </div>
        <button className="text-button" onClick={() => undefined}>
          Ver todos <Icon name="arrow-right" size={16} />
        </button>
      </div>

      <section className="featured-document-card">
        <div className="featured-preview-column">
          <div className="featured-preview-label">
            <span className="live-dot" /> Resultado disponible
          </div>
          <ManuscriptPreview compact page={1} highlight />
          <div className="preview-stack-shadow">
            <span />
            <span />
          </div>
        </div>
        <div className="featured-document-info">
          <div className="document-meta-row">
            <span className="status-chip status-review"><span className="status-dot" /> Revisión pendiente</span>
            <button aria-label="Más opciones del documento" className="icon-button">
              <Icon name="more-horizontal" size={19} />
            </button>
          </div>
          <h3>Tarea de álgebra · Semana 4</h3>
          <p className="document-description">Ecuaciones lineales y procedimientos · fixture de evaluación</p>
          <div className="document-facts">
            <span><Icon name="image" size={15} /> 3 páginas</span>
            <span><Icon name="clock" size={15} /> Actualizado hace 8 min</span>
            <span><Icon name="layers" size={15} /> 14 bloques</span>
          </div>
          <div className="featured-progress">
            <div className="progress-label-row"><span>Revisión del documento</span><strong>2 de 3 páginas</strong></div>
            <div className="progress-track"><span style={{ width: '66%' }} /></div>
          </div>
          <div className="featured-actions">
            <button className="primary-button" onClick={onOpenReview}>Continuar revisión <Icon name="arrow-right" size={16} /></button>
            <span className="version-note"><Icon name="save" size={14} /> Versión 03 guardada</span>
          </div>
        </div>
        <div className="featured-side-note">
          <div className="note-icon"><Icon name="sparkle" size={17} /></div>
          <div>
            <strong>Una decisión pendiente</strong>
            <p>Compara el recorte antes de confirmar la ecuación.</p>
          </div>
        </div>
      </section>

      <div className="content-columns">
        <section className="documents-table-section">
          <div className="section-heading-row compact-heading">
            <div><h2>Tus documentos</h2><p>Solo tú tienes acceso a estos archivos.</p></div>
            <div className="table-actions">
              <button aria-label="Buscar documentos" className="outline-icon-button"><Icon name="search" size={17} /></button>
              <button className="outline-filter-button"><Icon name="filter" size={16} /> Filtrar <Icon name="chevron-down" size={14} /></button>
            </div>
          </div>
          <div className="documents-table-card">
            <DocumentRow title="Ensayo de ciencias · energía" detail="2 páginas · PDF exportado" status="Exportado" statusTone="success" updated="Ayer" icon="book" />
            <DocumentRow title="Práctica de funciones" detail="1 página · Sin procesar" status="Borrador" statusTone="neutral" updated="28 oct" icon="file-text" />
            <DocumentRow title="Geometría · ejercicios 1–5" detail="4 páginas · Archivado" status="Archivado" statusTone="muted" updated="21 oct" icon="archive" last />
          </div>
        </section>
        <aside className="activity-card">
          <div className="activity-card-heading"><h2>Cómo funciona</h2><span className="tiny-tag">MVP-0</span></div>
          <p className="activity-intro">Un recorrido corto, con control sobre cada resultado.</p>
          <HowStep number="01" title="Captura" detail="Añade de 1 a 3 imágenes y revisa su calidad." done />
          <HowStep number="02" title="Revisa" detail="Compara cada ambigüedad con el recorte original." active />
          <HowStep number="03" title="Entrega" detail="Edita, previsualiza y descarga un PDF trazable." />
          <div className="activity-footer"><Icon name="info" size={15} /> Los resultados no confirmados nunca se exportan.</div>
        </aside>
      </div>
    </div>
  )
}

function StatCard({ icon, label, tone, trend, value }: { icon: IconName; label: string; tone: string; trend: string; value: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}><Icon name={icon} size={18} /></div>
      <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{trend}</small></div>
      <Icon name="more-horizontal" size={18} className="stat-more" />
    </div>
  )
}

function DocumentRow({ detail, icon, last = false, status, statusTone, title, updated }: { detail: string; icon: IconName; last?: boolean; status: string; statusTone: string; title: string; updated: string }) {
  return (
    <div className={`document-row ${last ? 'document-row-last' : ''}`}>
      <div className="document-row-icon"><Icon name={icon} size={18} /></div>
      <div className="document-row-copy"><strong>{title}</strong><span>{detail}</span></div>
      <span className={`row-status row-status-${statusTone}`}><span />{status}</span>
      <span className="document-row-date">{updated}</span>
      <button aria-label={`Más opciones para ${title}`} className="icon-button"><Icon name="more-horizontal" size={18} /></button>
    </div>
  )
}

function HowStep({ active = false, detail, done = false, number, title }: { active?: boolean; detail: string; done?: boolean; number: string; title: string }) {
  return (
    <div className={`how-step ${active ? 'how-step-active' : ''}`}>
      <div className={`how-number ${done ? 'how-number-done' : ''}`}>{done ? <Icon name="check" size={14} strokeWidth={2.2} /> : number}</div>
      <div><strong>{title}</strong><p>{detail}</p></div>
    </div>
  )
}

function CaptureScreen({
  documentTitle,
  fileInputRef,
  onAddPage,
  onBack,
  onFileChange,
  onLoadFixture,
  onManualMode,
  onRemovePage,
  onStartProcessing,
  onTitleChange,
  pages,
}: {
  documentTitle: string
  fileInputRef: RefObject<HTMLInputElement>
  onAddPage: () => void
  onBack: () => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onLoadFixture: () => void
  onManualMode: () => void
  onRemovePage: (id: string) => void
  onStartProcessing: () => void
  onTitleChange: (value: string) => void
  pages: Page[]
}) {
  const hasCritical = pages.some((page) => page.quality === 'critical')
  return (
    <div className="screen capture-screen">
      <FlowHeader current={1} onBack={onBack} />
      <div className="capture-heading">
        <div><p className="eyebrow">NUEVO DOCUMENTO</p><h1>Añade las páginas de tu trabajo</h1><p className="page-subtitle">Comienza con una a tres fotografías claras. El original siempre se conserva.</p></div>
        <div className="capture-heading-actions"><label htmlFor="new-document-title">Nombre del documento</label><input id="new-document-title" onChange={(event) => onTitleChange(event.target.value)} placeholder="Ej. Tarea de álgebra" value={documentTitle === 'Nuevo documento' ? '' : documentTitle} /><div className="capture-limit"><span>{pages.length}/3</span> páginas seleccionadas</div></div>
      </div>

      <div className="capture-layout">
        <section className="capture-main-panel">
          <input ref={fileInputRef} accept="image/jpeg,image/png" className="visually-hidden" multiple onChange={onFileChange} type="file" />
          {pages.length === 0 ? (
            <div className="dropzone" onClick={onAddPage}>
              <div className="dropzone-icon"><Icon name="upload" size={24} strokeWidth={1.7} /></div>
              <h2>Arrastra tus imágenes aquí</h2>
              <p>o selecciónalas desde tu dispositivo</p>
              <span className="file-constraints">JPEG o PNG · máximo 3 páginas · 15 MB por página</span>
              <button className="secondary-button" onClick={(event) => { event.stopPropagation(); onAddPage() }}><Icon name="image" size={17} /> Seleccionar imágenes</button>
            </div>
          ) : (
            <>
              <div className="pages-panel-heading"><div><h2>Páginas seleccionadas</h2><p>Ordena visualmente antes de confirmar.</p></div><button className="outline-filter-button" disabled={pages.length >= 3} onClick={onAddPage}><Icon name="plus" size={16} /> Añadir página</button></div>
              <div className="selected-pages-grid">
                {pages.map((page) => <CapturePageCard key={page.id} page={page} onRemove={onRemovePage} />)}
                {pages.length < 3 && <button className="add-page-card" onClick={onAddPage}><Icon name="plus" size={20} /><span>Añadir página</span><small>{3 - pages.length} disponible{pages.length === 2 ? '' : 's'}</small></button>}
              </div>
              <div className={`quality-summary ${hasCritical ? 'quality-summary-critical' : ''}`}>
                <div className="quality-summary-icon"><Icon name={hasCritical ? 'info' : 'check-circle'} size={19} /></div>
                <div><strong>{hasCritical ? 'Hay una página que necesita recaptura' : 'Las páginas están listas para revisar'}</strong><p>{hasCritical ? 'La captura irrecuperable se detendrá antes de cualquier OCR facturable.' : 'La evaluación final de calidad se confirma en el servidor antes de procesar.'}</p></div>
                <span className="quality-summary-tag">{hasCritical ? 'Acción requerida' : 'Puerta local'}</span>
              </div>
            </>
          )}
          {pages.length === 0 && <button className="fixture-button" onClick={onLoadFixture}><Icon name="sparkle" size={16} /> Cargar fixture de evaluación <span>Datos sintéticos</span></button>}
          {pages.length > 0 && <div className="capture-footer-actions"><button className="text-button" onClick={onBack}><Icon name="arrow-left" size={16} /> Cancelar</button><div className="capture-footer-right">{hasCritical && <button className="manual-mode-button" onClick={onManualMode}><Icon name="edit" size={14} /> Continuar en modo manual</button>}<button className="primary-button" disabled={hasCritical} onClick={onStartProcessing}>Confirmar y procesar <Icon name="arrow-right" size={16} /></button></div></div>}
        </section>

        <aside className="capture-aside">
          <div className="aside-card aside-card-quiet">
            <div className="aside-card-title"><Icon name="shield" size={17} /><strong>Tu original está protegido</strong></div>
            <p>Guardaremos el archivo original por separado. Cualquier ajuste de contraste será una variante, nunca un reemplazo.</p>
            <div className="aside-rule-list"><span><Icon name="check" size={13} /> Linaje de cada imagen</span><span><Icon name="check" size={13} /> Sin OCR si es irrecuperable</span><span><Icon name="check" size={13} /> Eliminación bajo tu control</span></div>
          </div>
          <div className="aside-card tips-card"><div className="tips-card-heading"><Icon name="sparkle" size={17} /><strong>Para mejores resultados</strong></div><ul><li>Fotografía la página completa.</li><li>Evita sombras y reflejos.</li><li>Mantén el teléfono paralelo al papel.</li></ul></div>
          <div className="demo-note"><Icon name="info" size={16} /><span><strong>Modo de evaluación</strong>Este recorrido usa un fixture local; la llamada a Mathpix está desactivada.</span></div>
        </aside>
      </div>
    </div>
  )
}

function FlowHeader({ current, onBack }: { current: number; onBack: () => void }) {
  const steps = ['Captura', 'Calidad', 'Revisión', 'Entrega']
  return (
    <div className="flow-header">
      <button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Documentos</button>
      <div className="flow-stepper" aria-label="Progreso del documento">
        {steps.map((step, index) => <div className={`flow-step ${index + 1 === current ? 'flow-step-current' : ''} ${index + 1 < current ? 'flow-step-done' : ''}`} key={step}><span>{index + 1 < current ? <Icon name="check" size={13} strokeWidth={2.4} /> : index + 1}</span>{step}{index < steps.length - 1 && <i />}</div>)}
      </div>
      <span className="flow-scope"><Icon name="lock" size={13} /> Borrador privado</span>
    </div>
  )
}

function CapturePageCard({ page, onRemove }: { page: Page; onRemove: (id: string) => void }) {
  return (
    <article className="capture-page-card">
      <div className="capture-page-thumb"><ManuscriptPreview compact page={page.pageNumber} image={page.dataUrl} /><span className="page-number-badge">{page.pageNumber}</span></div>
      <div className="capture-page-copy"><div className="capture-page-name"><strong>{page.name}</strong><button aria-label={`Eliminar ${page.name}`} className="icon-button" onClick={() => onRemove(page.id)}><Icon name="trash" size={15} /></button></div><span className="capture-page-size">{page.source === 'fixture' ? 'Fixture sintético · 1.8 MB' : 'Imagen local · cargada en el navegador'}</span><div className={`quality-inline ${qualityClass(page.quality)}`}><span className="quality-dot" />{qualityLabel(page.quality)}<small>{page.qualityScore}/100</small></div></div>
    </article>
  )
}

function ProcessingScreen({ documentTitle, onBack, onShowPartial, pages, phase }: { documentTitle: string; onBack: () => void; onShowPartial: () => void; pages: Page[]; phase: number }) {
  const isComplete = phase >= processSteps.length
  return (
    <div className="screen processing-screen">
      <FlowHeader current={2} onBack={onBack} />
      <div className="processing-heading"><div><p className="eyebrow">TRABAJO ASÍNCRONO · #ALG-024</p><h1>Procesando {documentTitle}</h1><p className="page-subtitle">Puedes cerrar esta ventana. El estado durable permitirá recuperar el trabajo.</p></div><span className="simulation-badge"><span className="pulse-dot" /> Simulación local</span></div>
      <div className="processing-layout">
        <section className="processing-main-card">
          <div className="processing-card-top"><div><span className="section-kicker">EVENTOS RECIBIDOS</span><strong>{Math.min(phase, processSteps.length)} <small>/ {processSteps.length}</small></strong></div><div className="processing-orbit"><Icon name={isComplete ? 'check' : 'loader'} size={20} /></div></div>
          <div className="event-progress-track"><span style={{ width: `${Math.max(7, (phase / processSteps.length) * 100)}%` }} /></div>
          <div className="processing-steps">{processSteps.map((step, index) => { const done = phase > index; const active = phase === index; return <div className={`processing-step ${done ? 'processing-step-done' : ''} ${active ? 'processing-step-active' : ''}`} key={step.title}><div className="processing-step-marker">{done ? <Icon name="check" size={14} /> : active ? <Icon name="loader" size={14} className="spin" /> : <span>{index + 1}</span>}</div><div><strong>{step.title}</strong><span>{step.detail}</span></div>{done && <em>Listo</em>}</div> })}</div>
          <div className="processing-honesty"><Icon name="info" size={15} /><span>Los resultados aparecerán solo cuando cada bloque real termine. No mostramos porcentajes estimados.</span></div>
          {phase >= 2 && <button className="partial-result-button" onClick={onShowPartial}><Icon name="eye" size={16} /> Ver resultado parcial <span>1 página disponible</span><Icon name="arrow-right" size={15} /></button>}
        </section>
        <aside className="processing-aside"><div className="processing-pages-heading"><strong>Páginas del trabajo</strong><span>{pages.length} imágenes</span></div>{pages.map((page, index) => <div className={`processing-page-row ${phase > index + 1 ? 'processing-page-ready' : phase === index + 1 ? 'processing-page-active' : ''}`} key={page.id}><div className="processing-thumb"><ManuscriptPreview compact page={page.pageNumber} image={page.dataUrl} /></div><div><strong>Página {page.pageNumber}</strong><span>{phase > index + 1 ? 'Resultado disponible' : phase === index + 1 ? 'Procesando bloques…' : 'En cola'}</span></div><div className="processing-page-status">{phase > index + 1 ? <Icon name="check-circle" size={17} /> : phase === index + 1 ? <Icon name="loader" size={17} className="spin" /> : <span>{index + 1}</span>}</div></div>)}<div className="processing-isolation"><Icon name="lock" size={14} /><span>Trabajo aislado · reintentos idempotentes</span></div></aside>
      </div>
    </div>
  )
}

function ReviewScreen({
  documentTitle,
  equation,
  onBack,
  onBlockSelect,
  onConfirmAmbiguity,
  onEquationChange,
  onPageSelect,
  onPreview,
  onSave,
  pages,
  resolvedAmbiguity,
  savedVersion,
  selectedBlockId,
  selectedPage,
}: {
  documentTitle: string
  equation: string
  onBack: () => void
  onBlockSelect: (id: string) => void
  onConfirmAmbiguity: () => void
  onEquationChange: (value: string) => void
  onPageSelect: (id: string) => void
  onPreview: () => void
  onSave: () => void
  pages: Page[]
  resolvedAmbiguity: boolean
  savedVersion: boolean
  selectedBlockId: string
  selectedPage: Page
}) {
  const selectedBlock = reviewBlocks.find((block) => block.id === selectedBlockId) ?? reviewBlocks[2]
  const isEquation = selectedBlock.type === 'equation'
  return (
    <div className="screen review-screen">
      <div className="review-topline"><button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Documentos</button><span className="review-location"><Icon name="chevron-right" size={14} /> {documentTitle}</span><div className="review-top-actions"><span className={`save-state ${savedVersion ? 'save-state-saved' : ''}`}><span className="save-state-dot" /> {savedVersion ? 'Todos los cambios guardados' : 'Cambios sin guardar'}</span><button className="secondary-button small-button" onClick={onPreview}><Icon name="eye" size={16} /> Vista previa</button><button className="primary-button small-button" onClick={onSave}><Icon name="save" size={16} /> Guardar versión</button></div></div>
      <div className="review-title-row"><div><p className="eyebrow">REVISIÓN · VERSIÓN 04</p><h1>Comprueba tu transcripción</h1><p className="page-subtitle">Compara el original con cada bloque antes de preparar el PDF.</p></div><div className="review-progress-summary"><strong>{resolvedAmbiguity ? '0' : '1'}</strong><span>ambigüedad pendiente<br />en este documento</span></div></div>
      <div className="review-toolbar"><div className="review-toolbar-left"><span className="toolbar-label">Página</span><button className="page-switcher"><span>{selectedPage.pageNumber}</span> de {pages.length} <Icon name="chevron-down" size={14} /></button><span className="toolbar-divider" /><span className="toolbar-label">Vista</span><button className="view-mode active"><Icon name="layers" size={15} /> Comparar</button><button className="view-mode"><Icon name="file-text" size={15} /> Documento</button></div><div className="review-toolbar-right"><button className="toolbar-icon-action"><Icon name="refresh" size={15} /> Recalcular calidad</button><button aria-label="Más acciones" className="icon-button"><Icon name="more-horizontal" size={18} /></button></div></div>

      <div className="review-workspace">
        <aside className="page-rail"><div className="page-rail-heading"><strong>Páginas</strong><span>{pages.length}</span></div>{pages.map((page) => <button className={`page-rail-item ${page.id === selectedPage.id ? 'page-rail-item-active' : ''}`} key={page.id} onClick={() => onPageSelect(page.id)}><div className="page-rail-thumb"><ManuscriptPreview compact page={page.pageNumber} image={page.dataUrl} highlight={page.id === selectedPage.id} /></div><div className="page-rail-meta"><strong>0{page.pageNumber}</strong><span>{page.id === 'page-1' && !resolvedAmbiguity ? '1 pendiente' : 'Revisada'}</span></div>{page.id === 'page-1' && !resolvedAmbiguity ? <span className="rail-alert">!</span> : <Icon name="check-circle" size={16} className="rail-check" />}</button>)}<div className="rail-legend"><span><i className="legend-dot legend-dot-yellow" /> Pendiente</span><span><i className="legend-dot legend-dot-green" /> Confirmada</span></div></aside>
        <section className="source-panel workspace-panel"><PanelHeading icon="image" title="Origen" detail="Recorte de la página 01" action={<button className="panel-icon-action" aria-label="Ver imagen completa"><Icon name="eye" size={16} /></button>} /><div className="source-canvas"><ManuscriptPreview page={selectedPage.pageNumber} image={selectedPage.dataUrl} highlight={!resolvedAmbiguity} /><div className={`source-highlight ${resolvedAmbiguity ? 'source-highlight-resolved' : ''}`}><span>{resolvedAmbiguity ? 'Confirmada' : 'Bloque 03 · ambigüedad'}</span></div><div className="zoom-controls"><button aria-label="Alejar">−</button><span>100%</span><button aria-label="Acercar">+</button></div></div><div className="source-caption"><span><Icon name="lock" size={13} /> Imagen original inmutable</span><button>Ver linaje <Icon name="arrow-right" size={13} /></button></div></section>
        <section className="transcription-panel workspace-panel"><PanelHeading icon="file-text" title="Transcripción normalizada" detail="5 bloques · orden de lectura" action={<span className="canonical-tag">Canónico v1</span>} /><div className="blocks-list">{reviewBlocks.map((block) => <ReviewBlock key={block.id} block={block} selected={block.id === selectedBlockId} resolved={block.id === 'equation-1' && resolvedAmbiguity} onSelect={() => onBlockSelect(block.id)} />)}</div>{isEquation && <div className="block-editor"><div className="block-editor-label"><span><Icon name="edit" size={14} /> Editando ecuación</span><span className="editor-hint">LaTeX básico</span></div><textarea aria-label="Editar ecuación" value={equation} onChange={(event) => onEquationChange(event.target.value)} /><div className="equation-render"><span>Vista previa</span><strong>{equation || 'Escribe una ecuación'}</strong></div><div className="editor-actions"><button className="text-button">Descartar</button><button className="small-primary-button" onClick={onSave}><Icon name="check" size={15} /> Aplicar a versión 04</button></div></div>}</section>
        <aside className="review-inspector"><div className="inspector-card ambiguity-card"><div className="inspector-card-heading"><div className="inspector-heading-icon"><Icon name={resolvedAmbiguity ? 'check-circle' : 'info'} size={17} /></div><div><strong>{resolvedAmbiguity ? 'Ambigüedad resuelta' : 'Revisa este bloque'}</strong><span>{resolvedAmbiguity ? 'Decisión humana registrada' : 'Confianza media · 72%'}</span></div></div><p>{resolvedAmbiguity ? 'La decisión se guardará como parte de la versión 04. El resultado bruto sigue disponible.' : 'El sistema no está seguro de si el símbolo manuscrito es un “3”. Compáralo con el recorte antes de confirmar.'}</p>{!resolvedAmbiguity && <button className="confirm-button" onClick={onConfirmAmbiguity}><Icon name="check" size={15} /> Confirmar interpretación</button>}<button className="subtle-action"><Icon name="copy" size={14} /> Ver resultado bruto</button></div><div className="inspector-card provenance-card"><div className="inspector-section-title"><strong>Procedencia</strong><Icon name="info" size={14} /></div><ProvenanceRow label="Original" value="pagina-01.png" icon="image" /><ProvenanceRow label="Variante" value="Contraste suave" icon="layers" /><ProvenanceRow label="Procesador" value="Mathpix · fixture" icon="sparkle" /><ProvenanceRow label="Geometría" value="Normalizada · 0.32, 0.28" icon="grid" /></div><div className="inspector-card model-card"><div className="inspector-section-title"><strong>Modelo canónico</strong><span className="schema-version">v1</span></div><div className="model-tags"><span className="model-tag tag-heading">heading</span><span className="model-tag tag-paragraph">paragraph</span><span className="model-tag tag-equation">equation</span><span className="model-tag tag-figure">figure</span><span className="model-tag tag-unknown">unknown</span></div><p>Los bloques no soportados se conservan visualmente, sin inventar estructura.</p></div></aside>
      </div>
    </div>
  )
}

function PanelHeading({ action, detail, icon, title }: { action?: ReactNode; detail: string; icon: IconName; title: string }) {
  return <div className="panel-heading"><div className="panel-heading-icon"><Icon name={icon} size={16} /></div><div><strong>{title}</strong><span>{detail}</span></div>{action && <div className="panel-heading-action">{action}</div>}</div>
}

function ReviewBlock({ block, onSelect, resolved, selected }: { block: (typeof reviewBlocks)[number]; onSelect: () => void; resolved: boolean; selected: boolean }) {
  return <button className={`review-block review-block-${block.type} ${selected ? 'review-block-selected' : ''} ${resolved ? 'review-block-resolved' : ''}`} onClick={onSelect}><div className="review-block-top"><span className="block-type"><i />{block.label}</span><span className={`confidence ${block.confidence < 80 && !resolved ? 'confidence-low' : ''}`}>{resolved ? 'Confirmado' : `${block.confidence}%`}</span></div><p>{block.type === 'equation' ? <><span className="equation-text">{block.content}</span></> : block.content}</p>{block.type === 'figure' && <div className="figure-preserved-mini"><Icon name="image" size={15} /> Imagen conservada · no editable</div>}{selected && !resolved && <span className="selected-block-caret" />}</button>
}

function ProvenanceRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <div className="provenance-row"><Icon name={icon} size={14} /><span>{label}</span><strong>{value}</strong></div>
}

function PreviewScreen({ documentTitle, exported, onBack, onDownload, onReview, onTitleChange }: { documentTitle: string; exported: boolean; onBack: () => void; onDownload: () => void; onReview: () => void; onTitleChange: (value: string) => void }) {
  return (
    <div className="screen preview-screen">
      <div className="preview-topline"><button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Volver a revisión</button><div className="preview-top-actions"><span className="preview-version"><Icon name="check-circle" size={15} /> Versión 04 lista</span><button className="secondary-button small-button" onClick={onReview}><Icon name="edit" size={15} /> Editar</button><button className="primary-button small-button" onClick={onDownload}><Icon name="download" size={16} /> Descargar PDF</button></div></div>
      <div className="preview-heading"><div><p className="eyebrow">ENTREGA · VISTA PREVIA</p><h1>Así se verá tu documento</h1><p className="page-subtitle">Revisa la composición final antes de descargar el PDF.</p></div><div className="preview-ready-badge"><span className="ready-check"><Icon name="check" size={14} /></span><span><strong>Listo para exportar</strong><small>Sin bloqueantes</small></span></div></div>
      {exported && <div className="export-success"><div><Icon name="check-circle" size={18} /><span><strong>PDF generado correctamente.</strong> Está asociado a la versión 04 y conserva la figura original.</span></div><button onClick={() => undefined}>Ver detalles <Icon name="arrow-right" size={14} /></button></div>}
      <div className="preview-layout"><section className="preview-stage"><div className="stage-toolbar"><span><Icon name="eye" size={15} /> Página 1 de 2</span><div><button aria-label="Página anterior" className="stage-icon-button"><Icon name="chevron-left" size={16} /></button><button aria-label="Página siguiente" className="stage-icon-button"><Icon name="chevron-right" size={16} /></button><span className="stage-divider" /><button className="stage-zoom">100% <Icon name="chevron-down" size={13} /></button></div></div><div className="paper-preview"><div className="paper-preview-header"><span>ALGEBRA · SEMANA 4</span><span>01</span></div><h2>Ecuaciones lineales</h2><p>Resuelve la siguiente ecuación y comprueba el resultado.</p><div className="paper-equation">3x + 5 = 20</div><div className="paper-solution"><span className="solution-label">Procedimiento</span><p>3x + 5 = 20</p><p>3x = 15</p><p className="solution-final">x = 5</p></div><div className="paper-figure"><div className="figure-sketch"><span>3x + 5</span><i /> <span>20</span></div><div><strong>Procedimiento original</strong><small>Figura conservada desde la página 01</small></div></div><div className="paper-footer"><span>Generado con AlgeTra · versión 04</span><span>1</span></div></div></section><aside className="export-settings"><div className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">DOCUMENTO</p><h2>Detalles de entrega</h2></div><Icon name="more-horizontal" size={18} /></div><label className="field-label" htmlFor="document-name">Nombre del documento</label><div className="input-with-icon"><Icon name="edit" size={15} /><input id="document-name" onChange={(event) => onTitleChange(event.target.value)} value={documentTitle} /></div><label className="field-label" htmlFor="cover-select">Portada</label><div className="select-like" id="cover-select"><span>Sin portada · documento directo</span><Icon name="chevron-down" size={15} /></div><label className="field-label" htmlFor="style-select">Estilo de página</label><div className="select-like" id="style-select"><span>Académico · limpio</span><Icon name="chevron-down" size={15} /></div><div className="settings-divider" /><div className="export-check-row"><span className="export-check-icon"><Icon name="check" size={13} /></span><div><strong>Texto y ecuaciones</strong><span>Renderizados en la versión final</span></div></div><div className="export-check-row"><span className="export-check-icon"><Icon name="image" size={13} /></span><div><strong>Figuras disponibles</strong><span>1 recurso visual conservado</span></div></div><div className="settings-warning"><Icon name="info" size={15} /><span><strong>Sin bloqueantes</strong>Una figura se conserva como imagen y no se reconstruye.</span></div><button className="export-large-button" onClick={onDownload}><Icon name="download" size={18} /> Descargar PDF <span>⌘ ↵</span></button><p className="export-trace"><Icon name="shield" size={13} /> PDF trazable a versión 04 · 05 nov 2026</p></div><div className="preview-privacy-note"><Icon name="lock" size={15} /><span>El archivo queda en tu espacio privado. Puedes eliminarlo desde Documentos.</span></div></aside></div>
    </div>
  )
}

export function ManuscriptPreview({ compact = false, highlight = false, image, page }: { compact?: boolean; highlight?: boolean; image?: string; page: number }) {
  if (image) {
    return <div className={`manuscript-preview ${compact ? 'manuscript-compact' : ''} manuscript-image-wrap`}><img alt={`Página manuscrita ${page}`} src={image} /></div>
  }
  return (
    <div className={`manuscript-preview ${compact ? 'manuscript-compact' : ''} manuscript-page-${page}`}>
      <div className="manuscript-page-inner">
        <div className="manuscript-page-top"><span>Álgebra</span><span>{String(page).padStart(2, '0')}</span></div>
        {page === 1 && <><div className="hand-line hand-title">Ecuaciones lineales</div><div className="hand-line hand-subtitle">Resuelve y comprueba</div><div className={`hand-equation ${highlight ? 'hand-highlight' : ''}`}>3x + 5 = 20</div><div className="hand-line short-line">3x = 20 − 5</div><div className="hand-line short-line">x = 15 ÷ 3</div><div className="hand-answer">x = 5</div><div className="hand-underline" /></>}
        {page === 2 && <><div className="hand-line hand-title">Comprobación</div><div className="hand-line">Sustituimos el valor encontrado</div><div className="hand-equation">3(5) + 5 = 20</div><div className="hand-line short-line">15 + 5 = 20</div><div className="hand-answer small-answer">20 = 20 ✓</div><div className="hand-figure"><span /><span /><span /></div></>}
        {page >= 3 && <><div className="hand-line hand-title">Representación</div><div className="hand-line">La recta cruza cuando x = 5</div><div className="hand-graph"><i /><i /><i /><b /></div><div className="hand-line short-line">Resultado: correcto</div></>}
      </div>
    </div>
  )
}

export default App
