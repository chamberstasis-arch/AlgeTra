import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Icon, ManuscriptPreview, type IconName } from './App'

type WorkspaceScreen =
  | 'documents'
  | 'capture'
  | 'quality'
  | 'processing'
  | 'review'
  | 'preview'
  | 'activity'
  | 'archive'
  | 'metrics'
  | 'guide'
  | 'settings'

type Theme = 'light' | 'dark'
type Density = 'comfortable' | 'compact'
type Quality = 'ready' | 'attention' | 'critical'
type PageStatus = 'draft' | 'quality' | 'processing' | 'ready' | 'manual'
type DocumentStatus = 'draft' | 'processing' | 'review' | 'ready' | 'exported' | 'archived'
type BlockStatus = 'confirmed' | 'ambiguous' | 'edited' | 'preserved'
type ModalKind = 'raw' | 'lineage' | 'versions' | 'delete' | 'help' | 'notifications' | null

type Variant = {
  id: string
  label: string
  kind: 'original' | 'normalized' | 'contrast' | 'illumination' | 'perspective'
  score: number
  selected: boolean
}

type Page = {
  id: string
  name: string
  pageNumber: number
  blocks: number
  quality: Quality
  qualityScore: number
  qualityIssues: string[]
  status: PageStatus
  source: 'fixture' | 'local'
  dataUrl?: string
  variants: Variant[]
  selectedVariantId: string
}

type DocumentRecord = {
  id: string
  title: string
  status: DocumentStatus
  pages: number
  blocks: number
  pending: number
  version: number
  updated: string
  description: string
  archived?: boolean
}

type ReviewBlock = {
  id: string
  type: 'heading' | 'paragraph' | 'equation' | 'figure' | 'unknown'
  label: string
  content: string
  rawContent: string
  confidence: number
  status: BlockStatus
  pageId: string
  sourceLabel: string
}

type Version = {
  id: string
  number: number
  label: string
  date: string
  changes: string
  status: 'current' | 'superseded'
}

type ActivityItem = {
  id: string
  title: string
  detail: string
  time: string
  icon: IconName
  tone: 'blue' | 'green' | 'orange' | 'purple'
}

const processSteps = [
  { title: 'Validando calidad', detail: 'Puerta de calidad por página' },
  { title: 'Preparando variantes', detail: 'Original inmutable · contraste local' },
  { title: 'Clasificando bloques', detail: 'Geometría y orden de lectura' },
  { title: 'Transcribiendo contenido', detail: 'Adaptador Mathpix · fixture local' },
  { title: 'Publicando resultados', detail: 'Bloques disponibles para revisión' },
]

const seedDocuments: DocumentRecord[] = [
  {
    id: 'doc-algebra-024',
    title: 'Tarea de álgebra · Semana 4',
    status: 'review',
    pages: 3,
    blocks: 14,
    pending: 1,
    version: 3,
    updated: 'Hace 8 min',
    description: 'Ecuaciones lineales y procedimientos · fixture de evaluación',
  },
  {
    id: 'doc-science-018',
    title: 'Ensayo de ciencias · energía',
    status: 'exported',
    pages: 2,
    blocks: 11,
    pending: 0,
    version: 2,
    updated: 'Ayer',
    description: 'Documento exportado a PDF',
  },
  {
    id: 'doc-functions-011',
    title: 'Práctica de funciones',
    status: 'draft',
    pages: 1,
    blocks: 0,
    pending: 0,
    version: 0,
    updated: '28 oct',
    description: 'Una página · sin procesar',
  },
  {
    id: 'doc-geometry-006',
    title: 'Geometría · ejercicios 1–5',
    status: 'archived',
    pages: 4,
    blocks: 18,
    pending: 0,
    version: 4,
    updated: '21 oct',
    description: 'Documento archivado',
    archived: true,
  },
]

function createFixturePages(): Page[] {
  return [
    {
      id: 'page-1',
      name: 'pagina-01.png',
      pageNumber: 1,
      blocks: 5,
      quality: 'ready',
      qualityScore: 96,
      qualityIssues: [],
      status: 'ready',
      source: 'fixture',
      selectedVariantId: 'variant-1-original',
      variants: [
        { id: 'variant-1-original', label: 'Original', kind: 'original', score: 96, selected: true },
        { id: 'variant-1-contrast', label: 'Contraste suave', kind: 'contrast', score: 98, selected: false },
      ],
    },
    {
      id: 'page-2',
      name: 'pagina-02.png',
      pageNumber: 2,
      blocks: 4,
      quality: 'ready',
      qualityScore: 91,
      qualityIssues: [],
      status: 'ready',
      source: 'fixture',
      selectedVariantId: 'variant-2-original',
      variants: [
        { id: 'variant-2-original', label: 'Original', kind: 'original', score: 91, selected: true },
      ],
    },
    {
      id: 'page-3',
      name: 'pagina-03.png',
      pageNumber: 3,
      blocks: 2,
      quality: 'attention',
      qualityScore: 78,
      qualityIssues: ['Contraste bajo', 'Borde inferior incompleto'],
      status: 'ready',
      source: 'fixture',
      selectedVariantId: 'variant-3-original',
      variants: [
        { id: 'variant-3-original', label: 'Original', kind: 'original', score: 78, selected: true },
        { id: 'variant-3-light', label: 'Iluminación', kind: 'illumination', score: 89, selected: false },
      ],
    },
  ]
}

const fixtureBlocks: ReviewBlock[] = [
  {
    id: 'heading-1',
    type: 'heading',
    label: 'Encabezado',
    content: 'Ecuaciones lineales',
    rawContent: 'Ecuaciones lineales',
    confidence: 98,
    status: 'confirmed',
    pageId: 'page-1',
    sourceLabel: 'Página 01 · línea 01',
  },
  {
    id: 'paragraph-1',
    type: 'paragraph',
    label: 'Párrafo',
    content: 'Resuelve la siguiente ecuación y comprueba el resultado.',
    rawContent: 'Resuelve la siguiente ecuación y comprueba el resultado.',
    confidence: 94,
    status: 'confirmed',
    pageId: 'page-1',
    sourceLabel: 'Página 01 · línea 02',
  },
  {
    id: 'equation-1',
    type: 'equation',
    label: 'Ecuación',
    content: '3x + 5 = 20',
    rawContent: '3x + 5 = 20',
    confidence: 72,
    status: 'ambiguous',
    pageId: 'page-1',
    sourceLabel: 'Página 01 · línea 03',
  },
  {
    id: 'paragraph-2',
    type: 'paragraph',
    label: 'Párrafo',
    content: 'Restamos 5 en ambos lados y dividimos entre 3.',
    rawContent: 'Restamos 5 en ambos lados y dividimos entre 3.',
    confidence: 89,
    status: 'confirmed',
    pageId: 'page-1',
    sourceLabel: 'Página 01 · línea 04',
  },
  {
    id: 'figure-1',
    type: 'figure',
    label: 'Figura conservada',
    content: 'Procedimiento manuscrito original',
    rawContent: 'Procedimiento manuscrito original',
    confidence: 100,
    status: 'preserved',
    pageId: 'page-1',
    sourceLabel: 'Página 01 · región visual',
  },
]

const initialActivity: ActivityItem[] = [
  { id: 'activity-1', title: 'Resultado parcial disponible', detail: 'Tarea de álgebra · página 01 lista para revisión', time: 'Hace 8 min', icon: 'eye', tone: 'orange' },
  { id: 'activity-2', title: 'Versión 03 guardada', detail: 'Se conservaron 14 bloques y una figura original', time: 'Hace 12 min', icon: 'save', tone: 'green' },
  { id: 'activity-3', title: 'PDF exportado', detail: 'Ensayo de ciencias · energía', time: 'Ayer', icon: 'download', tone: 'blue' },
  { id: 'activity-4', title: 'Documento archivado', detail: 'Geometría · ejercicios 1–5', time: '21 oct', icon: 'archive', tone: 'purple' },
]

const initialVersions: Version[] = [
  { id: 'ver-04', number: 4, label: 'Revisión actual', date: 'Ahora', changes: 'Ecuación confirmada · cambios locales', status: 'current' },
  { id: 'ver-03', number: 3, label: 'Resultado OCR', date: 'Hace 12 min', changes: '14 bloques · 1 ambigüedad', status: 'superseded' },
  { id: 'ver-02', number: 2, label: 'Normalización', date: 'Hace 14 min', changes: 'Orden de lectura corregido', status: 'superseded' },
  { id: 'ver-01', number: 1, label: 'Captura original', date: 'Hace 16 min', changes: '3 páginas · originales protegidos', status: 'superseded' },
]

function qualityLabel(quality: Quality) {
  if (quality === 'critical') return 'Recapturar'
  if (quality === 'attention') return 'Revisar'
  return 'Lista'
}

function statusLabel(status: DocumentStatus) {
  if (status === 'review') return 'Revisión pendiente'
  if (status === 'ready') return 'Listo para exportar'
  if (status === 'exported') return 'Exportado'
  if (status === 'processing') return 'Procesando'
  if (status === 'archived') return 'Archivado'
  return 'Borrador'
}

function formatNow() {
  return 'Ahora'
}

function App() {
  const [screen, setScreen] = useState<WorkspaceScreen>('documents')
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('algetra-theme') === 'dark' ? 'dark' : 'light'
  })
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window === 'undefined') return 'comfortable'
    return window.localStorage.getItem('algetra-density') === 'compact' ? 'compact' : 'comfortable'
  })
  const [documents, setDocuments] = useState<DocumentRecord[]>(seedDocuments)
  const [selectedDocumentId, setSelectedDocumentId] = useState('doc-algebra-024')
  const [pages, setPages] = useState<Page[]>([])
  const [blocks, setBlocks] = useState<ReviewBlock[]>(fixtureBlocks)
  const [versions, setVersions] = useState<Version[]>(initialVersions)
  const [selectedPageId, setSelectedPageId] = useState('page-1')
  const [selectedBlockId, setSelectedBlockId] = useState('equation-1')
  const [draftContent, setDraftContent] = useState('3x + 5 = 20')
  const [documentTitle, setDocumentTitle] = useState('Tarea de álgebra · Semana 4')
  const [query, setQuery] = useState('')
  const [documentFilter, setDocumentFilter] = useState<'all' | DocumentStatus>('all')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [processPhase, setProcessPhase] = useState(0)
  const [partialAvailable, setPartialAvailable] = useState(false)
  const [qualityChecked, setQualityChecked] = useState(false)
  const [savedVersion, setSavedVersion] = useState(true)
  const [exported, setExported] = useState(false)
  const [previewPage, setPreviewPage] = useState(1)
  const [previewZoom, setPreviewZoom] = useState(100)
  const [template, setTemplate] = useState('academic-clean-v1')
  const [confirmWarnings, setConfirmWarnings] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalKind>(null)
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivity)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? createFixturePages()[0],
    [pages, selectedPageId],
  )
  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? blocks[0] ?? fixtureBlocks[2],
    [blocks, selectedBlockId],
  )
  const pendingCount = blocks.filter((block) => block.status === 'ambiguous').length
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId)
  const activeDocuments = documents.filter((document) => !document.archived)
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return documents.filter((document) => {
      const matchesQuery = !normalizedQuery || `${document.title} ${document.description}`.toLowerCase().includes(normalizedQuery)
      const matchesFilter = documentFilter === 'all' || document.status === documentFilter
      return matchesQuery && matchesFilter
    })
  }, [documents, documentFilter, query])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('algetra-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.density = density
    window.localStorage.setItem('algetra-density', density)
  }, [density])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        startNewDocument()
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        openDocument(seedDocuments[0])
      }
      if (event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setTheme((current) => current === 'dark' ? 'light' : 'dark')
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (screen !== 'processing') return
    if (processPhase >= processSteps.length) {
      const timer = window.setTimeout(() => {
        setPages((current) => current.map((page) => ({ ...page, status: 'ready', blocks: page.blocks || 4 })))
        setBlocks(fixtureBlocks)
        setSavedVersion(false)
        updateDocument({ status: 'review', pending: 1, blocks: 14, version: 3 })
        addActivity('Resultados disponibles', 'El documento está listo para revisión humana', 'eye', 'orange')
        setScreen('review')
        setToast('Resultados disponibles: revisa la primera ambigüedad.')
      }, 700)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setProcessPhase((phase) => Math.min(processSteps.length, phase + 1)), 920)
    return () => window.clearTimeout(timer)
  }, [processPhase, screen])

  useEffect(() => {
    setDraftContent(selectedBlock.content)
  }, [selectedBlock.id])

  function showToast(message: string) {
    setToast(message)
  }

  function navigate(nextScreen: WorkspaceScreen) {
    setScreen(nextScreen)
    setMobileNavOpen(false)
  }

  function addActivity(title: string, detail: string, icon: IconName, tone: ActivityItem['tone']) {
    setActivities((current) => [
      { id: `activity-${Date.now()}`, title, detail, time: formatNow(), icon, tone },
      ...current,
    ])
  }

  function updateDocument(patch: Partial<DocumentRecord>) {
    setDocuments((current) => current.map((document) => document.id === selectedDocumentId ? { ...document, ...patch, updated: formatNow() } : document))
  }

  function openDocument(document: DocumentRecord) {
    setSelectedDocumentId(document.id)
    setDocumentTitle(document.title)
    setExported(document.status === 'exported')
    setSavedVersion(document.version > 0)
    setPages(document.id === 'doc-algebra-024' ? createFixturePages() : createFixturePages().slice(0, Math.max(1, Math.min(3, document.pages))))
    setBlocks(fixtureBlocks)
    setSelectedPageId('page-1')
    setSelectedBlockId('equation-1')
    setQualityChecked(document.status !== 'draft')
    navigate(document.status === 'review' ? 'review' : document.status === 'exported' ? 'preview' : 'capture')
  }

  function startNewDocument() {
    const id = `doc-local-${Date.now()}`
    const newDocument: DocumentRecord = {
      id,
      title: 'Nuevo documento',
      status: 'draft',
      pages: 0,
      blocks: 0,
      pending: 0,
      version: 0,
      updated: 'Ahora',
      description: 'Borrador local · todavía no procesado',
    }
    setDocuments((current) => [newDocument, ...current])
    setSelectedDocumentId(id)
    setDocumentTitle('Nuevo documento')
    setPages([])
    setBlocks([])
    setVersions([])
    setSavedVersion(false)
    setExported(false)
    setQualityChecked(false)
    navigate('capture')
    showToast('Nuevo borrador local creado.')
  }

  function loadFixture() {
    setPages(createFixturePages())
    setBlocks(fixtureBlocks)
    setSelectedPageId('page-1')
    setSelectedBlockId('equation-1')
    setDocumentTitle('Tarea de álgebra · Semana 4')
    setQualityChecked(false)
    setSavedVersion(false)
    updateDocument({ title: 'Tarea de álgebra · Semana 4', pages: 3, status: 'draft', pending: 0, blocks: 0 })
    showToast('Fixture sintético cargado. No contiene datos de usuarios.')
  }

  function loadFixtureAndCapture() {
    loadFixture()
    navigate('capture')
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  function addFiles(incoming: File[]) {
    const available = Math.max(0, 3 - pages.length)
    const accepted = incoming.slice(0, available).filter((file) => ['image/jpeg', 'image/png'].includes(file.type))
    if (incoming.length > accepted.length) showToast('Solo se admiten hasta 3 imágenes JPEG o PNG.')
    accepted.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setPages((current) => {
          if (current.length >= 3) return current
          const pageNumber = current.length + 1
          const isCritical = /borros|blur|oscura|dark/i.test(file.name)
          const originalId = `variant-${Date.now()}-${pageNumber}-original`
          const page: Page = {
            id: `local-${Date.now()}-${pageNumber}`,
            name: file.name,
            pageNumber,
            blocks: 0,
            quality: isCritical ? 'critical' : 'ready',
            qualityScore: isCritical ? 31 : 92,
            qualityIssues: isCritical ? ['Desenfoque crítico detectado'] : [],
            status: 'draft',
            source: 'local',
            dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
            selectedVariantId: originalId,
            variants: [{ id: originalId, label: 'Original', kind: 'original', score: isCritical ? 31 : 92, selected: true }],
          }
          return [...current, page]
        })
      }
      reader.readAsDataURL(file)
    })
    if (accepted.length) showToast(`${accepted.length} imagen${accepted.length > 1 ? 'es' : ''} añadida${accepted.length > 1 ? 's' : ''} al borrador.`)
  }

  function movePage(pageId: string, direction: -1 | 1) {
    setPages((current) => {
      const index = current.findIndex((page) => page.id === pageId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(nextIndex, 0, moved)
      return next.map((page, pageIndex) => ({ ...page, pageNumber: pageIndex + 1 }))
    })
  }

  function removePage(pageId: string) {
    setPages((current) => current.filter((page) => page.id !== pageId).map((page, index) => ({ ...page, pageNumber: index + 1 })))
    showToast('Página retirada del borrador local. El original no se ha enviado.')
  }

  function updateTitle(value: string) {
    setDocumentTitle(value)
    updateDocument({ title: value || 'Sin título' })
  }

  function runQuality() {
    setQualityChecked(true)
    setPages((current) => current.map((page) => ({
      ...page,
      status: 'quality',
      qualityScore: page.quality === 'critical' ? page.qualityScore : Math.min(99, page.qualityScore + 1),
    })))
    addActivity('Calidad evaluada', 'Diagnóstico local completado para todas las páginas', 'check-circle', 'green')
    showToast('Puerta de calidad completada localmente.')
  }

  function createVariant(pageId: string, kind: Variant['kind']) {
    const labels: Record<Variant['kind'], string> = {
      original: 'Original',
      normalized: 'Orientación normalizada',
      contrast: 'Contraste suave',
      illumination: 'Iluminación corregida',
      perspective: 'Perspectiva corregida',
    }
    setPages((current) => current.map((page) => {
      if (page.id !== pageId) return page
      const existing = page.variants.find((variant) => variant.kind === kind)
      if (existing) return { ...page, selectedVariantId: existing.id, variants: page.variants.map((variant) => ({ ...variant, selected: variant.id === existing.id })) }
      const id = `variant-${pageId}-${kind}`
      const score = Math.min(99, page.qualityScore + (kind === 'contrast' ? 7 : 5))
      return {
        ...page,
        quality: page.quality === 'critical' ? 'attention' : page.quality,
        qualityScore: score,
        selectedVariantId: id,
        variants: [...page.variants.map((variant) => ({ ...variant, selected: false })), { id, label: labels[kind], kind, score, selected: true }],
      }
    }))
    showToast('Variante derivada creada sin modificar el original.')
  }

  function selectVariant(pageId: string, variantId: string) {
    setPages((current) => current.map((page) => page.id === pageId ? { ...page, selectedVariantId: variantId, variants: page.variants.map((variant) => ({ ...variant, selected: variant.id === variantId })) } : page))
  }

  function pageCanProcess(page: Page) {
    const selected = page.variants.find((variant) => variant.id === page.selectedVariantId)
    return page.quality !== 'critical' || selected?.kind !== 'original'
  }

  function goToQuality() {
    if (!pages.length) {
      loadFixture()
      setPages(createFixturePages())
    }
    navigate('quality')
  }

  function startManualMode() {
    const sourcePages = pages.length ? pages : createFixturePages()
    setPages(sourcePages.map((page) => ({ ...page, status: 'manual' })))
    setBlocks(fixtureBlocks.map((block) => ({ ...block, status: block.type === 'figure' ? 'preserved' : 'edited' })))
    updateDocument({ status: 'review', pending: 0, blocks: 14 })
    addActivity('Modo manual activado', 'El documento se revisará sin llamada a OCR', 'edit', 'orange')
    navigate('review')
    showToast('Modo manual: puedes editar cada bloque sin OCR.')
  }

  function startProcessing() {
    const sourcePages = pages.length ? pages : createFixturePages()
    if (sourcePages.some((page) => !pageCanProcess(page))) {
      showToast('Hay una captura crítica sin variante recuperable seleccionada.')
      return
    }
    setPages(sourcePages.map((page) => ({ ...page, status: 'processing' })))
    setProcessPhase(0)
    setPartialAvailable(false)
    setSavedVersion(false)
    setExported(false)
    updateDocument({ status: 'processing', pending: 0 })
    addActivity('Trabajo iniciado', 'OCR simulado con eventos recuperables', 'loader', 'blue')
    navigate('processing')
  }

  function showPartialResult() {
    setPartialAvailable(true)
    setBlocks(fixtureBlocks.slice(0, 3))
    setSelectedBlockId('equation-1')
    navigate('review')
    showToast('Resultado parcial abierto: 1 de 3 páginas disponible.')
  }

  function retryProcessing() {
    setProcessPhase(0)
    setPartialAvailable(false)
    navigate('processing')
    showToast('Reintento local programado con la misma configuración.')
  }

  function cancelProcessing() {
    updateDocument({ status: 'draft' })
    navigate('documents')
    showToast('Trabajo cancelado. Los originales siguen en el borrador.')
  }

  function selectBlock(block: ReviewBlock) {
    setSelectedBlockId(block.id)
    setDraftContent(block.content)
  }

  function applyEdit() {
    if (!selectedBlock || selectedBlock.type === 'figure') return
    setBlocks((current) => current.map((block) => block.id === selectedBlock.id ? { ...block, content: draftContent, status: 'edited' } : block))
    setSavedVersion(false)
    updateDocument({ status: 'review', pending: pendingCount })
    addActivity('Edición local aplicada', `${selectedBlock.label} · capa humana separada`, 'edit', 'purple')
    showToast('Cambio aplicado a la capa editable; el OCR bruto permanece intacto.')
  }

  function discardEdit() {
    setDraftContent(selectedBlock.content)
    showToast('Edición descartada.')
  }

  function decideBlock(action: 'confirm' | 'defer' | 'preserve') {
    if (!selectedBlock) return
    setBlocks((current) => current.map((block) => {
      if (block.id !== selectedBlock.id) return block
      if (action === 'preserve') return { ...block, status: 'preserved' }
      return { ...block, status: action === 'confirm' ? 'confirmed' : 'ambiguous' }
    }))
    setSavedVersion(false)
    if (action === 'confirm') showToast('Interpretación confirmada. La decisión queda en la versión humana.')
    if (action === 'defer') showToast('La ambigüedad quedó pendiente para otra sesión.')
  }

  function saveVersion() {
    const nextNumber = Math.max(4, ...versions.map((version) => version.number + 1))
    const nextVersion: Version = {
      id: `ver-${nextNumber}`,
      number: nextNumber,
      label: 'Versión humana',
      date: 'Ahora',
      changes: `${blocks.length} bloques · ${pendingCount} pendientes`,
      status: 'current',
    }
    setVersions((current) => [nextVersion, ...current.map((version) => ({ ...version, status: 'superseded' as const }))])
    setSavedVersion(true)
    updateDocument({ status: pendingCount ? 'review' : 'ready', pending: pendingCount, blocks: blocks.length, version: nextNumber })
    addActivity(`Versión ${nextNumber} guardada`, 'Ediciones y decisiones humanas separadas del OCR bruto', 'save', 'green')
    showToast(`Versión ${nextNumber} guardada en el navegador.`)
  }

  function downloadPdf() {
    const equation = blocks.find((block) => block.type === 'equation')?.content ?? '3x + 5 = 20'
    const escapePdf = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    const lines = [
      'AlgeTra - documento de demostracion',
      documentTitle.replace(/[áéíóúÁÉÍÓÚ]/g, (letter) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' })[letter] ?? letter),
      'Ecuaciones lineales',
      equation,
      'Resultado revisado localmente por la persona usuaria.',
      'Figura original conservada como recurso visual.',
    ]
    const stream = ['BT', '/F1 18 Tf', '72 740 Td', ...lines.flatMap((line, index) => [index === 0 ? `(${escapePdf(line)}) Tj` : `0 -${index === 1 ? 34 : 28} Td (${escapePdf(line)}) Tj`]), 'ET'].join('\n')
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ]
    let pdf = '%PDF-1.4\n'
    const offsets = [0]
    objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
    const xrefOffset = pdf.length
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'algetra-documento-demo.pdf'
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportDocument() {
    if (pendingCount > 0 && !confirmWarnings) {
      showToast('Confirma las ambigüedades pendientes antes de generar el PDF.')
      return
    }
    setExported(true)
    updateDocument({ status: 'exported', pending: pendingCount })
    addActivity('PDF generado', `${documentTitle} · plantilla ${template}`, 'download', 'blue')
    downloadPdf()
    showToast('PDF generado y descargado desde el navegador.')
  }

  function toggleArchive(document: DocumentRecord) {
    const archived = !document.archived
    setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, archived, status: archived ? 'archived' : 'draft', updated: formatNow() } : item))
    showToast(archived ? 'Documento archivado localmente.' : 'Documento restaurado a tu espacio activo.')
  }

  function deleteSelectedDocument() {
    setDocuments((current) => current.filter((document) => document.id !== selectedDocumentId))
    setModal(null)
    navigate('documents')
    showToast('Documento eliminado del prototipo local.')
  }

  const breadcrumb = screen === 'documents' ? 'Documentos' : screen === 'capture' ? 'Nuevo documento' : screen === 'quality' ? 'Calidad' : screen === 'processing' ? 'Procesamiento' : screen === 'review' ? `Revisión / ${documentTitle}` : screen === 'preview' ? 'Vista previa' : screen === 'activity' ? 'Actividad' : screen === 'archive' ? 'Archivados' : screen === 'metrics' ? 'Métricas del piloto' : screen === 'guide' ? 'Guía de revisión' : 'Ajustes'

  return (
    <div className="app-shell prototype-shell">
      <Sidebar
        currentScreen={screen}
        activeCount={activeDocuments.length}
        mobileOpen={mobileNavOpen}
        theme={theme}
        onClose={() => setMobileNavOpen(false)}
        onNavigate={navigate}
        onNewDocument={startNewDocument}
      />
      <div className="app-content">
        <TopBar breadcrumb={breadcrumb} theme={theme} onMenu={() => setMobileNavOpen((open) => !open)} onHelp={() => setModal('help')} onNotifications={() => setModal('notifications')} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
        <div className="prototype-banner">
          <div className="prototype-banner-copy"><span className="prototype-dot" /><strong>Prototipo frontend · MVP-0 completo</strong><span className="prototype-separator">/</span><span>Datos locales · API desactivada</span></div>
          <span className="prototype-banner-link"><Icon name="lock" size={13} /> Nada sale de este navegador</span>
        </div>
        <main className="main-content prototype-main-content">
          {screen === 'documents' && <DocumentsScreen documents={filteredDocuments} activeDocuments={activeDocuments.length} query={query} filter={documentFilter} onQueryChange={setQuery} onFilterChange={setDocumentFilter} onNewDocument={startNewDocument} onOpenDocument={openDocument} onArchive={toggleArchive} onDelete={(document) => { setSelectedDocumentId(document.id); setModal('delete') }} onLoadFixture={loadFixtureAndCapture} onOpenReview={() => openDocument(seedDocuments[0])} />}
          {screen === 'capture' && <CaptureScreen documentTitle={documentTitle} pages={pages} fileInputRef={fileInputRef} onBack={() => navigate('documents')} onFileChange={onFileChange} onDrop={addFiles} onTitleChange={updateTitle} onLoadFixture={loadFixture} onRemovePage={removePage} onMovePage={movePage} onAddPage={() => fileInputRef.current?.click()} onQuality={goToQuality} onManualMode={startManualMode} />}
          {screen === 'quality' && <QualityScreen pages={pages.length ? pages : createFixturePages()} checked={qualityChecked} onBack={() => navigate('capture')} onRun={runQuality} onCreateVariant={createVariant} onSelectVariant={selectVariant} onProcess={startProcessing} onManualMode={startManualMode} />}
          {screen === 'processing' && <ProcessingScreen documentTitle={documentTitle} pages={pages.length ? pages : createFixturePages()} phase={processPhase} partialAvailable={partialAvailable || processPhase >= 2} onBack={() => navigate('documents')} onPartial={showPartialResult} onRetry={retryProcessing} onCancel={cancelProcessing} />}
          {screen === 'review' && <ReviewScreen documentTitle={documentTitle} pages={pages.length ? pages : createFixturePages()} blocks={blocks.length ? blocks : fixtureBlocks} selectedPage={selectedPage} selectedBlock={selectedBlock} selectedBlockId={selectedBlockId} draftContent={draftContent} pendingCount={pendingCount} savedVersion={savedVersion} partial={partialAvailable} onBack={() => navigate('documents')} onPageSelect={setSelectedPageId} onBlockSelect={selectBlock} onDraftChange={setDraftContent} onApplyEdit={applyEdit} onDiscardEdit={discardEdit} onDecide={decideBlock} onSave={saveVersion} onPreview={() => navigate('preview')} onOpenRaw={() => setModal('raw')} onOpenLineage={() => setModal('lineage')} onOpenVersions={() => setModal('versions')} onQuality={() => navigate('quality')} />}
          {screen === 'preview' && <PreviewScreen documentTitle={documentTitle} equation={blocks.find((block) => block.type === 'equation')?.content ?? '3x + 5 = 20'} exported={exported} page={previewPage} pageCount={Math.max(1, pages.length || 3)} zoom={previewZoom} template={template} pendingCount={pendingCount} confirmWarnings={confirmWarnings} onBack={() => navigate('review')} onPageChange={setPreviewPage} onZoomChange={setPreviewZoom} onTemplateChange={setTemplate} onTitleChange={updateTitle} onConfirmWarnings={setConfirmWarnings} onExport={exportDocument} onReview={() => navigate('review')} />}
          {screen === 'activity' && <ActivityScreen activities={activities} onOpenDocument={() => openDocument(seedDocuments[0])} />}
          {screen === 'archive' && <ArchiveScreen documents={documents.filter((document) => document.archived)} onRestore={toggleArchive} onDelete={(document) => { setSelectedDocumentId(document.id); setModal('delete') }} />}
          {screen === 'metrics' && <MetricsScreen documents={documents} activities={activities} />}
          {screen === 'guide' && <GuideScreen onStart={startNewDocument} />}
          {screen === 'settings' && <SettingsScreen theme={theme} density={density} onThemeChange={setTheme} onDensityChange={setDensity} onClearLocal={() => { window.localStorage.clear(); showToast('Preferencias locales restablecidas.') }} />}
        </main>
      </div>
      {toast && <div className="toast prototype-toast" role="status"><Icon name="check-circle" size={18} /><span>{toast}</span><button aria-label="Cerrar aviso" className="toast-close" onClick={() => setToast(null)}><Icon name="x" size={15} /></button></div>}
      {modal === 'delete' && <Modal title="Eliminar documento" onClose={() => setModal(null)}><p className="modal-copy">Se eliminará este documento del prototipo local junto con sus páginas, variantes, resultados y versiones.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Cancelar</button><button className="danger-button" onClick={deleteSelectedDocument}><Icon name="trash" size={15} /> Eliminar documento</button></div></Modal>}
      {modal === 'raw' && <Modal title="Resultado bruto del proveedor" eyebrow="ARTEFACTO PROTEGIDO" onClose={() => setModal(null)}><pre className="raw-result">{JSON.stringify({ provider: 'mathpix-fixture', request_id: 'req_local_01', text: '3x + 5 = 20', confidence: 0.72, line_data: [{ type: 'math', conversion_output: true }] }, null, 2)}</pre><p className="modal-note"><Icon name="lock" size={14} /> Solo lectura · no forma parte del contenido editable.</p></Modal>}
      {modal === 'lineage' && <Modal title="Linaje del bloque" eyebrow="PROCEDENCIA" onClose={() => setModal(null)}><LineageModal page={selectedPage} block={selectedBlock} /></Modal>}
      {modal === 'versions' && <Modal title="Historial de versiones" eyebrow="RECUPERABLE" onClose={() => setModal(null)}><div className="version-list">{versions.length ? versions.map((version) => <div className={`version-item ${version.status === 'current' ? 'version-item-current' : ''}`} key={version.id}><div className="version-marker">{version.status === 'current' ? <Icon name="check" size={14} /> : version.number}</div><div><strong>Versión {String(version.number).padStart(2, '0')} · {version.label}</strong><span>{version.changes} · {version.date}</span></div>{version.status === 'current' && <em>Actual</em>}</div>) : <EmptyState title="Aún no hay versiones" detail="Guarda una revisión para crear el primer snapshot." />}</div></Modal>}
      {modal === 'help' && <Modal title="Guía rápida" eyebrow="AYUDA DEL PROTOTIPO" onClose={() => setModal(null)}><div className="help-list"><HelpRow number="01" title="Captura" detail="Carga de 1 a 3 imágenes o usa el fixture sintético." /><HelpRow number="02" title="Calidad" detail="Evalúa la captura, genera variantes y elige cuál procesar." /><HelpRow number="03" title="Revisión" detail="Confirma ambigüedades, edita bloques y consulta su procedencia." /><HelpRow number="04" title="Entrega" detail="Guarda una versión, revisa el preview y descarga el PDF local." /></div></Modal>}
      {modal === 'notifications' && <Modal title="Notificaciones" eyebrow="ACTIVIDAD RECIENTE" onClose={() => setModal(null)}><div className="notification-list">{activities.slice(0, 3).map((activity) => <div className="notification-item" key={activity.id}><div className={`activity-icon activity-icon-${activity.tone}`}><Icon name={activity.icon} size={16} /></div><div><strong>{activity.title}</strong><span>{activity.detail}</span><small>{activity.time}</small></div></div>)}</div></Modal>}
    </div>
  )
}

function Sidebar({ currentScreen, activeCount, mobileOpen, theme, onClose, onNavigate, onNewDocument }: { currentScreen: WorkspaceScreen; activeCount: number; mobileOpen: boolean; theme: Theme; onClose: () => void; onNavigate: (screen: WorkspaceScreen) => void; onNewDocument: () => void }) {
  return <>
    {mobileOpen && <button aria-label="Cerrar menú" className="mobile-scrim" onClick={onClose} />}
    <aside className={`sidebar prototype-sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark" aria-hidden="true"><span /><span /><span /></div><span className="brand-name">AlgeTra</span><span className="brand-beta">BETA</span><button aria-label="Cerrar menú" className="sidebar-close" onClick={onClose}><Icon name="x" size={18} /></button></div>
      <button className="new-document-button" onClick={onNewDocument}><Icon name="plus" size={18} strokeWidth={2.2} /><span>Nuevo documento</span><span className="new-document-shortcut">N</span></button>
      <nav className="sidebar-nav" aria-label="Navegación principal">
        <p className="nav-label">TU ESPACIO</p>
        <SidebarItem active={currentScreen === 'documents' || currentScreen === 'capture' || currentScreen === 'quality' || currentScreen === 'processing' || currentScreen === 'review' || currentScreen === 'preview'} icon="file-text" label="Documentos" count={String(activeCount)} onClick={() => onNavigate('documents')} />
        <SidebarItem active={currentScreen === 'activity'} icon="clock" label="Actividad" onClick={() => onNavigate('activity')} />
        <SidebarItem active={currentScreen === 'archive'} icon="archive" label="Archivados" onClick={() => onNavigate('archive')} />
        <p className="nav-label nav-label-spaced">VALIDACIÓN</p>
        <SidebarItem active={currentScreen === 'metrics'} icon="chart" label="Métricas del piloto" onClick={() => onNavigate('metrics')} />
        <SidebarItem active={currentScreen === 'guide'} icon="book" label="Guía de revisión" onClick={() => onNavigate('guide')} />
      </nav>
      <div className="sidebar-bottom"><div className="privacy-card"><div className="privacy-icon"><Icon name="shield" size={16} /></div><div><strong>Espacio privado</strong><span>Datos locales aislados</span></div></div><div className="user-row"><div className="avatar">MC</div><div className="user-copy"><strong>María C.</strong><span>Evaluadora invitada</span></div><button aria-label="Abrir ajustes" className="icon-button small-icon-button" onClick={() => onNavigate('settings')}><Icon name="more-horizontal" size={17} /></button></div><button className="sidebar-theme-note" onClick={() => onNavigate('settings')}><Icon name={theme === 'dark' ? 'moon' : 'sun'} size={14} /> Modo {theme === 'dark' ? 'oscuro' : 'claro'} · Ajustes</button></div>
    </aside>
  </>
}

function SidebarItem({ active = false, count, icon, label, onClick }: { active?: boolean; count?: string; icon: IconName; label: string; onClick: () => void }) {
  return <button className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`} onClick={onClick}><Icon name={icon} size={18} /><span>{label}</span>{count && <span className="sidebar-count">{count}</span>}</button>
}

function TopBar({ breadcrumb, theme, onHelp, onMenu, onNotifications, onToggleTheme }: { breadcrumb: string; theme: Theme; onHelp: () => void; onMenu: () => void; onNotifications: () => void; onToggleTheme: () => void }) {
  return <header className="topbar prototype-topbar"><button aria-label="Abrir menú" className="mobile-menu-button" onClick={onMenu}><Icon name="menu" size={21} /></button><div className="breadcrumbs"><span>AlgeTra</span><Icon name="chevron-right" size={14} /><strong>{breadcrumb}</strong></div><div className="topbar-actions"><button aria-label="Ayuda" className="topbar-icon-button" onClick={onHelp}><Icon name="help" size={19} /></button><button aria-label="Notificaciones" className="topbar-icon-button notification-button" onClick={onNotifications}><Icon name="bell" size={19} /><span className="notification-dot" /></button><button aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`} className="topbar-icon-button theme-toggle" onClick={onToggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button><div className="topbar-avatar">MC</div></div></header>
}

function DocumentsScreen({ documents, activeDocuments, query, filter, onQueryChange, onFilterChange, onNewDocument, onOpenDocument, onArchive, onDelete, onLoadFixture, onOpenReview }: { documents: DocumentRecord[]; activeDocuments: number; query: string; filter: 'all' | DocumentStatus; onQueryChange: (value: string) => void; onFilterChange: (value: 'all' | DocumentStatus) => void; onNewDocument: () => void; onOpenDocument: (document: DocumentRecord) => void; onArchive: (document: DocumentRecord) => void; onDelete: (document: DocumentRecord) => void; onLoadFixture: () => void; onOpenReview: () => void }) {
  const featured = documents.find((document) => document.status === 'review') ?? documents[0]
  return <div className="screen dashboard-screen">
    <div className="dashboard-heading"><div><p className="eyebrow">TU ESPACIO PRIVADO</p><h1>Documentos</h1><p className="page-subtitle">Convierte tus apuntes en entregables verificables, sin perder el original.</p></div><div className="heading-actions"><button className="secondary-button" onClick={onLoadFixture}><Icon name="sparkle" size={16} /> Cargar fixture</button><button className="primary-button" onClick={onNewDocument}><Icon name="plus" size={18} /> Nuevo documento</button></div></div>
    <div className="dashboard-stats"><StatTile icon="file-text" tone="blue" label="Documentos activos" value={String(activeDocuments)} detail="+1 esta semana" /><StatTile icon="eye" tone="orange" label="Pendientes de revisión" value={String(documents.reduce((total, document) => total + document.pending, 0))} detail="Decisiones humanas" /><StatTile icon="clock" tone="green" label="Tiempo ahorrado" value="24 min" detail="vs. transcripción manual" /><StatTile icon="shield" tone="purple" label="Datos protegidos" value="100%" detail="Procesamiento local" /></div>
    {featured && <section className="featured-v2"><div className="featured-v2-preview"><span className="live-pill"><i /> Resultado disponible</span><ManuscriptPreview compact page={1} highlight /><div className="preview-stack-shadow"><span /><span /></div></div><div className="featured-v2-copy"><div className="document-meta-row"><span className="status-chip status-review"><span className="status-dot" /> {statusLabel(featured.status)}</span><button aria-label="Eliminar documento" className="icon-button" onClick={() => onDelete(featured)}><Icon name="trash" size={17} /></button></div><h2>{featured.title}</h2><p>{featured.description}</p><div className="featured-facts"><span><Icon name="image" size={15} /> {featured.pages} páginas</span><span><Icon name="layers" size={15} /> {featured.blocks} bloques</span><span><Icon name="clock" size={15} /> {featured.updated}</span></div><div className="feature-progress"><div><span>Revisión del documento</span><strong>{featured.pending ? '2 de 3 páginas' : 'Completada'}</strong></div><div className="progress-track"><span style={{ width: featured.pending ? '66%' : '100%' }} /></div></div><div className="featured-actions"><button className="primary-button" onClick={() => { onOpenReview(); }}>Continuar revisión <Icon name="arrow-right" size={16} /></button><button className="text-button" onClick={() => onOpenDocument(featured)}>Abrir detalles <Icon name="arrow-right" size={15} /></button><span className="version-note"><Icon name="save" size={14} /> Versión {String(featured.version).padStart(2, '0')}</span></div></div><div className="featured-v2-note"><div className="note-icon"><Icon name="sparkle" size={17} /></div><div><strong>{featured.pending ? 'Una decisión pendiente' : 'Documento listo'}</strong><p>{featured.pending ? 'Compara el recorte antes de confirmar la ecuación.' : 'Puedes preparar una vista previa trazable.'}</p></div></div></section>}
    <div className="dashboard-content-grid"><section className="surface-card document-list-card"><div className="section-heading-row-v2"><div><h2>Todos tus documentos</h2><p>Busca, filtra, archiva o retoma cualquier borrador local.</p></div><div className="list-toolbar"><label className="search-field"><Icon name="search" size={17} /><input aria-label="Buscar documentos" placeholder="Buscar documentos" value={query} onChange={(event) => onQueryChange(event.target.value)} /></label><select aria-label="Filtrar documentos" value={filter} onChange={(event) => onFilterChange(event.target.value as 'all' | DocumentStatus)}><option value="all">Todos</option><option value="draft">Borradores</option><option value="review">En revisión</option><option value="exported">Exportados</option><option value="archived">Archivados</option></select></div></div><div className="document-table-v2">{documents.length ? documents.map((document) => <DocumentListRow key={document.id} document={document} onOpen={onOpenDocument} onArchive={onArchive} onDelete={onDelete} />) : <EmptyState title="No encontramos documentos" detail="Prueba otra búsqueda o crea un documento nuevo." action={<button className="secondary-button" onClick={onNewDocument}>Crear documento</button>} />}</div></section><aside className="surface-card next-steps-card"><div className="card-title-row"><div><p className="eyebrow">RECORRIDO MVP-0</p><h2>Todo bajo control</h2></div><span className="tiny-tag">LOCAL</span></div><p className="card-lead">La aplicación separa cada capa para que puedas corregir sin perder la captura original.</p><NextStep number="01" title="Captura y calidad" detail="Carga, diagnostica y genera variantes." done /><NextStep number="02" title="Revisión humana" detail="Decide qué interpretación es válida." active /><NextStep number="03" title="Versión y entrega" detail="Previsualiza, exporta y recupera." /><button className="outline-wide-button" onClick={onLoadFixture}><Icon name="sparkle" size={15} /> Explorar con fixture</button></aside></div>
  </div>
}

function StatTile({ icon, tone, label, value, detail }: { icon: IconName; tone: string; label: string; value: string; detail: string }) {
  return <div className="stat-tile"><div className={`stat-tile-icon stat-icon-${tone}`}><Icon name={icon} size={19} /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}

function DocumentListRow({ document, onOpen, onArchive, onDelete }: { document: DocumentRecord; onOpen: (document: DocumentRecord) => void; onArchive: (document: DocumentRecord) => void; onDelete: (document: DocumentRecord) => void }) {
  return <article className="document-list-row"><button className="document-list-open" onClick={() => onOpen(document)}><span className="document-list-icon"><Icon name={document.status === 'archived' ? 'archive' : document.status === 'exported' ? 'book' : 'file-text'} size={19} /></span><span className="document-list-copy"><strong>{document.title}</strong><small>{document.description}</small></span></button><span className={`status-badge status-badge-${document.status}`}><i /> {statusLabel(document.status)}</span><span className="document-list-facts">{document.pages} pág. · {document.blocks || 'sin'} bloques</span><span className="document-list-date">{document.updated}</span><div className="row-actions"><button aria-label={`Abrir ${document.title}`} className="icon-button" onClick={() => onOpen(document)}><Icon name="arrow-right" size={16} /></button><button aria-label={document.archived ? `Restaurar ${document.title}` : `Archivar ${document.title}`} className="icon-button" onClick={() => onArchive(document)}><Icon name={document.archived ? 'refresh' : 'archive'} size={16} /></button><button aria-label={`Eliminar ${document.title}`} className="icon-button" onClick={() => onDelete(document)}><Icon name="trash" size={16} /></button></div></article>
}

function NextStep({ number, title, detail, done = false, active = false }: { number: string; title: string; detail: string; done?: boolean; active?: boolean }) {
  return <div className={`next-step ${active ? 'next-step-active' : ''}`}><span className={`next-step-number ${done ? 'next-step-done' : ''}`}>{done ? <Icon name="check" size={14} /> : number}</span><div><strong>{title}</strong><p>{detail}</p></div></div>
}

function CaptureScreen({ documentTitle, pages, fileInputRef, onBack, onFileChange, onDrop, onTitleChange, onLoadFixture, onRemovePage, onMovePage, onAddPage, onQuality, onManualMode }: { documentTitle: string; pages: Page[]; fileInputRef: RefObject<HTMLInputElement>; onBack: () => void; onFileChange: (event: ChangeEvent<HTMLInputElement>) => void; onDrop: (files: File[]) => void; onTitleChange: (value: string) => void; onLoadFixture: () => void; onRemovePage: (id: string) => void; onMovePage: (id: string, direction: -1 | 1) => void; onAddPage: () => void; onQuality: () => void; onManualMode: () => void }) {
  const [dragging, setDragging] = useState(false)
  const hasCritical = pages.some((page) => page.quality === 'critical')
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    onDrop(Array.from(event.dataTransfer.files))
  }
  return <div className="screen flow-screen"><FlowHeader current={1} onBack={onBack} /><div className="flow-heading-row"><div><p className="eyebrow">NUEVO DOCUMENTO</p><h1>Añade las páginas de tu trabajo</h1><p className="page-subtitle">Comienza con una a tres fotografías claras. El original siempre se conserva.</p></div><div className="flow-title-field"><label htmlFor="document-title">Nombre del documento</label><input id="document-title" value={documentTitle === 'Nuevo documento' ? '' : documentTitle} placeholder="Ej. Tarea de álgebra" onChange={(event) => onTitleChange(event.target.value)} /><span>{pages.length}/3 páginas seleccionadas</span></div></div><div className="capture-v2-layout"><section className="surface-card capture-v2-main"><input ref={fileInputRef} accept="image/jpeg,image/png" className="visually-hidden" multiple onChange={onFileChange} type="file" />{pages.length === 0 ? <div className={`dropzone-v2 ${dragging ? 'dropzone-v2-dragging' : ''}`} onClick={onAddPage} onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop}><div className="dropzone-icon"><Icon name="upload" size={27} /></div><h2>Arrastra tus imágenes aquí</h2><p>o selecciónalas desde tu dispositivo</p><span>JPEG o PNG · máximo 3 páginas · 15 MB por página</span><button className="secondary-button" onClick={(event) => { event.stopPropagation(); onAddPage() }}><Icon name="image" size={17} /> Seleccionar imágenes</button></div> : <><div className="panel-title-row"><div><h2>Páginas seleccionadas</h2><p>Ordena visualmente antes de evaluar la calidad.</p></div><button className="outline-filter-button" disabled={pages.length >= 3} onClick={onAddPage}><Icon name="plus" size={16} /> Añadir página</button></div><div className="capture-grid-v2">{pages.map((page, index) => <CapturePageCard key={page.id} page={page} index={index} total={pages.length} onRemove={onRemovePage} onMove={onMovePage} />)}{pages.length < 3 && <button className="add-page-card-v2" onClick={onAddPage}><Icon name="plus" size={22} /><strong>Añadir página</strong><small>{3 - pages.length} disponible{pages.length === 2 ? '' : 's'}</small></button>}</div><div className={`quality-summary-v2 ${hasCritical ? 'quality-summary-v2-critical' : ''}`}><Icon name={hasCritical ? 'info' : 'check-circle'} size={20} /><div><strong>{hasCritical ? 'Hay una página que necesita recaptura' : 'Capturas listas para evaluar'}</strong><p>{hasCritical ? 'Puedes crear una variante o continuar en modo manual; no se enviará OCR todavía.' : 'La puerta de calidad se ejecutará antes de cualquier procesamiento.'}</p></div><span>{hasCritical ? 'Acción requerida' : 'Paso 1 de 4'}</span></div></>}<div className="capture-bottom-actions"><button className="text-button" onClick={onBack}><Icon name="arrow-left" size={16} /> Cancelar</button><div>{hasCritical && <button className="manual-mode-button" onClick={onManualMode}><Icon name="edit" size={14} /> Modo manual</button>}<button className="primary-button" disabled={!pages.length} onClick={onQuality}>Evaluar calidad <Icon name="arrow-right" size={16} /></button></div></div></section><aside className="capture-v2-aside"><InfoCard icon="shield" title="Tu original está protegido" tone="green"><p>La captura original, las variantes y los resultados se mantienen separados.</p><RuleList items={['Linaje de cada imagen', 'Sin OCR si es irrecuperable', 'Eliminación bajo tu control']} /></InfoCard><InfoCard icon="sparkle" title="Para mejores resultados" tone="orange"><ul className="tips-list"><li>Fotografía la página completa.</li><li>Evita sombras y reflejos.</li><li>Mantén el teléfono paralelo al papel.</li></ul></InfoCard><button className="fixture-link-card" onClick={onLoadFixture}><Icon name="sparkle" size={17} /><span><strong>Explorar fixture sintético</strong><small>Recorrido seguro sin datos personales</small></span><Icon name="arrow-right" size={15} /></button></aside></div></div>
}

function FlowHeader({ current, onBack }: { current: number; onBack: () => void }) {
  const steps = ['Captura', 'Calidad', 'Procesamiento', 'Revisión', 'Entrega']
  return <div className="flow-header-v2"><button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Documentos</button><div className="flow-stepper-v2" aria-label="Progreso del documento">{steps.map((step, index) => <div className={`flow-step-v2 ${index + 1 === current ? 'flow-step-current' : ''} ${index + 1 < current ? 'flow-step-done' : ''}`} key={step}><span>{index + 1 < current ? <Icon name="check" size={13} /> : index + 1}</span>{step}{index < steps.length - 1 && <i />}</div>)}</div><span className="flow-scope"><Icon name="lock" size={13} /> Borrador local</span></div>
}

function CapturePageCard({ page, index, total, onRemove, onMove }: { page: Page; index: number; total: number; onRemove: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void }) {
  return <article className="capture-card-v2"><div className="capture-card-image"><ManuscriptPreview compact page={page.pageNumber} image={page.dataUrl} /><span className="page-number-badge">{page.pageNumber}</span><div className="capture-card-reorder"><button aria-label="Mover página arriba" disabled={index === 0} onClick={() => onMove(page.id, -1)}><Icon name="chevron-left" size={14} /></button><button aria-label="Mover página abajo" disabled={index === total - 1} onClick={() => onMove(page.id, 1)}><Icon name="chevron-right" size={14} /></button></div></div><div className="capture-card-copy"><div className="capture-card-name"><strong title={page.name}>{page.name}</strong><button aria-label={`Eliminar ${page.name}`} className="icon-button" onClick={() => onRemove(page.id)}><Icon name="trash" size={15} /></button></div><small>{page.source === 'fixture' ? 'Fixture sintético · 1.8 MB' : 'Imagen local · solo navegador'}</small><div className={`quality-inline quality-${page.quality}`}><i className="quality-dot" />{qualityLabel(page.quality)}<em>{page.qualityScore}/100</em></div></div></article>
}

function QualityScreen({ pages, checked, onBack, onRun, onCreateVariant, onSelectVariant, onProcess, onManualMode }: { pages: Page[]; checked: boolean; onBack: () => void; onRun: () => void; onCreateVariant: (pageId: string, kind: Variant['kind']) => void; onSelectVariant: (pageId: string, variantId: string) => void; onProcess: () => void; onManualMode: () => void }) {
  const blocked = pages.some((page) => page.quality === 'critical' && page.variants.find((variant) => variant.id === page.selectedVariantId)?.kind === 'original')
  return <div className="screen flow-screen"><FlowHeader current={2} onBack={onBack} /><div className="flow-heading-row"><div><p className="eyebrow">PUERTA DE CALIDAD</p><h1>Prepara el mejor insumo</h1><p className="page-subtitle">Elige una variante sin destruir el original y decide si la página está lista para OCR.</p></div><button className="secondary-button" onClick={onRun}><Icon name="refresh" size={16} /> {checked ? 'Volver a evaluar' : 'Evaluar ahora'}</button></div><div className="quality-v2-layout"><section className="surface-card quality-board"><div className="panel-title-row"><div><h2>Diagnóstico por página</h2><p>{checked ? 'La evaluación local ya está disponible.' : 'Aún no se ha ejecutado el diagnóstico.'}</p></div><span className={`quality-gate-badge ${blocked ? 'quality-gate-blocked' : 'quality-gate-ok'}`}><i />{blocked ? 'Bloqueada' : checked ? 'Procesable' : 'Pendiente'}</span></div><div className="quality-page-list">{pages.map((page) => <QualityPageRow key={page.id} page={page} onCreateVariant={onCreateVariant} onSelectVariant={onSelectVariant} />)}</div><div className="quality-legend"><span><i className="legend-dot legend-dot-green" /> Lista</span><span><i className="legend-dot legend-dot-yellow" /> Requiere atención</span><span><i className="legend-dot legend-dot-red" /> Bloqueante</span></div></section><aside className="quality-v2-aside"><InfoCard icon="shield" title="Regla de seguridad" tone="green"><p>Una captura crítica nunca dispara una llamada facturable. Una variante recuperable conserva el linaje.</p></InfoCard><div className="surface-card quality-checklist"><div className="card-title-row"><h3>Checklist</h3><span className="tiny-tag">LOCAL</span></div><ChecklistRow label="Resolución suficiente" done={checked && !blocked} /><ChecklistRow label="Orientación revisada" done={checked} /><ChecklistRow label="Original preservado" done={pages.length > 0} /><ChecklistRow label="Variante seleccionada" done={pages.some((page) => page.variants.some((variant) => variant.selected && variant.kind !== 'original'))} /></div><div className="quality-action-card"><Icon name="info" size={17} /><div><strong>¿Prefieres no usar OCR?</strong><p>El modo manual permite editar bloques sin enviar imágenes a ningún proveedor.</p></div><button className="text-button" onClick={onManualMode}>Activar modo manual <Icon name="arrow-right" size={14} /></button></div></aside></div><div className="flow-bottom-bar"><button className="text-button" onClick={onBack}><Icon name="arrow-left" size={16} /> Volver a capturas</button><button className="primary-button" disabled={!checked || blocked} onClick={onProcess}>Confirmar y procesar <Icon name="arrow-right" size={16} /></button></div></div>
}

function QualityPageRow({ page, onCreateVariant, onSelectVariant }: { page: Page; onCreateVariant: (pageId: string, kind: Variant['kind']) => void; onSelectVariant: (pageId: string, variantId: string) => void }) {
  return <article className="quality-page-row"><div className="quality-thumb"><ManuscriptPreview compact page={page.pageNumber} image={page.dataUrl} /><span>{String(page.pageNumber).padStart(2, '0')}</span></div><div className="quality-page-main"><div className="quality-row-heading"><div><strong>Página {page.pageNumber}</strong><span>{page.name}</span></div><span className={`quality-score quality-score-${page.quality}`}><i /> {page.qualityScore}/100 · {qualityLabel(page.quality)}</span></div>{page.qualityIssues.length > 0 && <div className="quality-issues">{page.qualityIssues.map((issue) => <span key={issue}><Icon name="info" size={13} /> {issue}</span>)}</div>}<div className="variant-row"><span className="variant-label"><Icon name="layers" size={14} /> Variante para procesar</span><div className="variant-options">{page.variants.map((variant) => <button key={variant.id} className={`variant-option ${variant.selected ? 'variant-option-selected' : ''}`} onClick={() => onSelectVariant(page.id, variant.id)}>{variant.label}<small>{variant.score}</small></button>)}<button className="variant-add" onClick={() => onCreateVariant(page.id, page.quality === 'critical' ? 'contrast' : 'normalized')}><Icon name="plus" size={14} /> Crear variante</button></div></div></div><div className="quality-page-actions"><button className="icon-button" aria-label="Ver página completa"><Icon name="eye" size={17} /></button><button className="icon-button" aria-label="Crear corrección de perspectiva" onClick={() => onCreateVariant(page.id, 'perspective')}><Icon name="refresh" size={17} /></button></div></article>
}

function ProcessingScreen({ documentTitle, pages, phase, partialAvailable, onBack, onPartial, onRetry, onCancel }: { documentTitle: string; pages: Page[]; phase: number; partialAvailable: boolean; onBack: () => void; onPartial: () => void; onRetry: () => void; onCancel: () => void }) {
  const complete = phase >= processSteps.length
  return <div className="screen flow-screen"><FlowHeader current={3} onBack={onBack} /><div className="flow-heading-row"><div><p className="eyebrow">TRABAJO DURABLE · #ALG-024</p><h1>Procesando {documentTitle}</h1><p className="page-subtitle">Puedes cerrar esta vista. El estado simulado se puede recuperar desde el navegador.</p></div><span className="simulation-badge"><span className="pulse-dot" /> {complete ? 'Completado localmente' : 'Simulación local'}</span></div><div className="processing-v2-layout"><section className="surface-card processing-v2-main"><div className="processing-summary"><div><span className="section-kicker">EVENTOS RECIBIDOS</span><strong>{Math.min(phase, processSteps.length)} <small>/ {processSteps.length}</small></strong></div><div className={`processing-orbit-v2 ${complete ? 'processing-orbit-complete' : ''}`}><Icon name={complete ? 'check' : 'loader'} size={22} /></div></div><div className="event-progress-track"><span style={{ width: `${Math.max(6, (phase / processSteps.length) * 100)}%` }} /></div><div className="processing-step-list">{processSteps.map((step, index) => { const done = phase > index; const active = phase === index; return <div className={`processing-step-v2 ${done ? 'processing-step-done' : ''} ${active ? 'processing-step-active' : ''}`} key={step.title}><span className="processing-step-marker">{done ? <Icon name="check" size={14} /> : active ? <Icon name="loader" size={14} className="spin" /> : index + 1}</span><div><strong>{step.title}</strong><span>{step.detail}</span></div>{done && <em>Listo</em>}</div> })}</div><div className="processing-honesty"><Icon name="info" size={15} /><span>Los resultados se muestran por eventos reales del prototipo; no hay porcentajes estimados ni llamadas de red.</span></div><div className="processing-actions"><button className="text-button" onClick={onCancel}><Icon name="x" size={15} /> Cancelar trabajo</button><div>{partialAvailable && <button className="partial-result-button" onClick={onPartial}><Icon name="eye" size={16} /> Ver resultado parcial</button>}{phase > 0 && !complete && <button className="secondary-button" onClick={onRetry}><Icon name="refresh" size={15} /> Reintentar</button>}</div></div></section><aside className="surface-card processing-v2-aside"><div className="panel-title-row"><div><h2>Páginas del trabajo</h2><p>Estado por página</p></div><span className="tiny-tag">{pages.length} imágenes</span></div>{pages.map((page, index) => <div className={`processing-page-v2 ${phase > index + 1 ? 'processing-page-ready' : phase === index + 1 ? 'processing-page-active' : ''}`} key={page.id}><div className="processing-thumb"><ManuscriptPreview compact page={page.pageNumber} image={page.dataUrl} /></div><div><strong>Página {page.pageNumber}</strong><span>{phase > index + 1 ? 'Resultado disponible' : phase === index + 1 ? 'Procesando bloques…' : 'En cola'}</span></div><div className="processing-page-status">{phase > index + 1 ? <Icon name="check-circle" size={17} /> : phase === index + 1 ? <Icon name="loader" size={17} className="spin" /> : <span>{index + 1}</span>}</div></div>)}<div className="processing-isolation"><Icon name="lock" size={14} /><span>Persistencia local · reintentos idempotentes</span></div></aside></div></div>
}

function ReviewScreen({ documentTitle, pages, blocks, selectedPage, selectedBlock, selectedBlockId, draftContent, pendingCount, savedVersion, partial, onBack, onPageSelect, onBlockSelect, onDraftChange, onApplyEdit, onDiscardEdit, onDecide, onSave, onPreview, onOpenRaw, onOpenLineage, onOpenVersions, onQuality }: { documentTitle: string; pages: Page[]; blocks: ReviewBlock[]; selectedPage: Page; selectedBlock: ReviewBlock; selectedBlockId: string; draftContent: string; pendingCount: number; savedVersion: boolean; partial: boolean; onBack: () => void; onPageSelect: (id: string) => void; onBlockSelect: (block: ReviewBlock) => void; onDraftChange: (value: string) => void; onApplyEdit: () => void; onDiscardEdit: () => void; onDecide: (action: 'confirm' | 'defer' | 'preserve') => void; onSave: () => void; onPreview: () => void; onOpenRaw: () => void; onOpenLineage: () => void; onOpenVersions: () => void; onQuality: () => void }) {
  const [view, setView] = useState<'compare' | 'document'>('compare')
  const [blockFilter, setBlockFilter] = useState<'all' | 'ambiguous' | 'edited'>('all')
  const visibleBlocks = blocks.filter((block) => blockFilter === 'all' || (blockFilter === 'ambiguous' ? block.status === 'ambiguous' : block.status === 'edited'))
  const isEditable = selectedBlock.type !== 'figure'
  return <div className="screen review-v2-screen"><div className="review-v2-topline"><button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Documentos</button><span className="review-location"><Icon name="chevron-right" size={14} /> {documentTitle}</span><div className="review-top-actions"><span className={`save-state ${savedVersion ? 'save-state-saved' : ''}`}><span className="save-state-dot" /> {savedVersion ? 'Guardado localmente' : 'Cambios sin guardar'}</span><button className="secondary-button small-button" onClick={onOpenVersions}><Icon name="clock" size={15} /> Versiones</button><button className="secondary-button small-button" onClick={onPreview}><Icon name="eye" size={15} /> Vista previa</button><button className="primary-button small-button" onClick={onSave}><Icon name="save" size={15} /> Guardar versión</button></div></div><div className="review-v2-heading"><div><p className="eyebrow">REVISIÓN HUMANA · {partial ? 'RESULTADO PARCIAL' : 'VERSIÓN 04'}</p><h1>Comprueba tu transcripción</h1><p className="page-subtitle">Compara el original, el resultado OCR y la capa editable antes de preparar el PDF.</p></div><div className={`review-pending-card ${pendingCount === 0 ? 'review-pending-card-ok' : ''}`}><strong>{pendingCount}</strong><span>ambigüedad{pendingCount === 1 ? '' : 'es'} pendiente{pendingCount === 1 ? '' : 's'}<small>{pendingCount === 0 ? 'Documento listo para exportar' : 'Revisa antes de entregar'}</small></span></div></div><div className="review-toolbar-v2"><div><span className="toolbar-label">Página</span><div className="page-pills">{pages.map((page) => <button className={page.id === selectedPage.id ? 'page-pill-active' : ''} key={page.id} onClick={() => onPageSelect(page.id)}>0{page.pageNumber}</button>)}</div><span className="toolbar-divider" /><button className={`view-mode ${view === 'compare' ? 'active' : ''}`} onClick={() => setView('compare')}><Icon name="layers" size={15} /> Comparar</button><button className={`view-mode ${view === 'document' ? 'active' : ''}`} onClick={() => setView('document')}><Icon name="file-text" size={15} /> Documento</button></div><div><button className="toolbar-icon-action" onClick={onQuality}><Icon name="refresh" size={15} /> Recalcular calidad</button><button aria-label="Más acciones" className="icon-button"><Icon name="more-horizontal" size={18} /></button></div></div><div className={`review-v2-workspace ${view === 'document' ? 'review-document-view' : ''}`}><aside className="review-pages-rail"><div className="rail-title"><strong>Páginas</strong><span>{pages.length}</span></div>{pages.map((page) => <button className={`review-page-thumb ${page.id === selectedPage.id ? 'review-page-thumb-active' : ''}`} key={page.id} onClick={() => onPageSelect(page.id)}><div><ManuscriptPreview compact page={page.pageNumber} image={page.dataUrl} /></div><span><strong>0{page.pageNumber}</strong><small>{page.qualityScore}/100</small></span>{page.quality === 'attention' ? <i className="rail-alert">!</i> : <Icon name="check-circle" size={16} className="rail-check" />}</button>)}</aside><section className="review-source-panel workspace-panel-v2"><PanelHeadingV2 icon="image" title="Origen" detail={`Recorte de la página ${String(selectedPage.pageNumber).padStart(2, '0')}`} action={<button className="panel-icon-action" aria-label="Ver imagen completa" onClick={onOpenLineage}><Icon name="eye" size={16} /></button>} /><div className="source-canvas-v2"><ManuscriptPreview page={selectedPage.pageNumber} image={selectedPage.dataUrl} highlight={selectedBlock.status === 'ambiguous'} /><div className={`source-highlight-v2 ${selectedBlock.status !== 'ambiguous' ? 'source-highlight-resolved' : ''}`}><span>{selectedBlock.status === 'ambiguous' ? 'Bloque pendiente' : 'Bloque revisado'}</span></div><div className="zoom-controls"><button aria-label="Alejar">−</button><span>100%</span><button aria-label="Acercar">+</button></div></div><div className="source-caption-v2"><span><Icon name="lock" size={13} /> Imagen original inmutable</span><button onClick={onOpenLineage}>Ver linaje <Icon name="arrow-right" size={13} /></button></div></section><section className="review-transcription-panel workspace-panel-v2"><PanelHeadingV2 icon="file-text" title="Transcripción normalizada" detail={`${blocks.length} bloques · orden de lectura`} action={<span className="canonical-tag">Canónico v1</span>} /><div className="blocks-filter-row"><button className={blockFilter === 'all' ? 'active' : ''} onClick={() => setBlockFilter('all')}>Todos <small>{blocks.length}</small></button><button className={blockFilter === 'ambiguous' ? 'active' : ''} onClick={() => setBlockFilter('ambiguous')}>Pendientes <small>{pendingCount}</small></button><button className={blockFilter === 'edited' ? 'active' : ''} onClick={() => setBlockFilter('edited')}>Editados <small>{blocks.filter((block) => block.status === 'edited').length}</small></button></div><div className="blocks-list-v2">{visibleBlocks.length ? visibleBlocks.map((block) => <ReviewBlockCard key={block.id} block={block} selected={block.id === selectedBlockId} onSelect={() => onBlockSelect(block)} />) : <EmptyState title="No hay bloques en este filtro" detail="Los resultados aparecerán aquí cuando avances en el procesamiento." />}</div>{isEditable && <div className="block-editor-v2"><div className="block-editor-label"><span><Icon name="edit" size={14} /> Editando {selectedBlock.label.toLowerCase()}</span><span className="editor-hint">Capa humana · no destructiva</span></div><textarea aria-label="Editar bloque" value={draftContent} onChange={(event) => onDraftChange(event.target.value)} /><div className="equation-render-v2"><span>Vista previa</span><strong>{draftContent || 'Sin contenido'}</strong></div><div className="editor-actions"><button className="text-button" onClick={onDiscardEdit}>Descartar</button><button className="small-primary-button" onClick={onApplyEdit}><Icon name="check" size={15} /> Aplicar cambio</button></div></div>}</section><aside className="review-inspector-v2"><div className={`inspector-card-v2 ambiguity-card-v2 ${selectedBlock.status !== 'ambiguous' ? 'ambiguity-card-v2-resolved' : ''}`}><div className="inspector-heading-v2"><div className="inspector-heading-icon"><Icon name={selectedBlock.status === 'ambiguous' ? 'info' : 'check-circle'} size={18} /></div><div><strong>{selectedBlock.status === 'ambiguous' ? 'Revisa este bloque' : 'Bloque revisado'}</strong><span>{selectedBlock.status === 'ambiguous' ? `Confianza media · ${selectedBlock.confidence}%` : 'Decisión humana registrada'}</span></div></div><p>{selectedBlock.status === 'ambiguous' ? 'Compara la región con la transcripción antes de confirmarla. Puedes editarla o conservarla como imagen.' : 'La decisión vive en una capa separada. El resultado bruto se puede consultar cuando lo necesites.'}</p>{selectedBlock.status === 'ambiguous' && <div className="inspector-actions"><button className="confirm-button" onClick={() => onDecide('confirm')}><Icon name="check" size={15} /> Confirmar interpretación</button><button className="secondary-button" onClick={() => onDecide('defer')}><Icon name="clock" size={14} /> Dejar pendiente</button></div>}{selectedBlock.type === 'figure' && <button className="confirm-button" onClick={() => onDecide('preserve')}><Icon name="image" size={15} /> Conservar como figura</button>}<button className="subtle-action" onClick={onOpenRaw}><Icon name="copy" size={14} /> Ver resultado bruto</button></div><div className="inspector-card-v2"><div className="inspector-section-title"><strong>Procedencia</strong><button aria-label="Ver linaje" onClick={onOpenLineage}><Icon name="info" size={14} /></button></div><ProvenanceRowV2 label="Original" value="pagina-01.png" icon="image" /><ProvenanceRowV2 label="Variante" value="Contraste suave" icon="layers" /><ProvenanceRowV2 label="Procesador" value="Mathpix · fixture" icon="sparkle" /><ProvenanceRowV2 label="Geometría" value="Normalizada · 0.32, 0.28" icon="grid" /></div><div className="inspector-card-v2 model-card-v2"><div className="inspector-section-title"><strong>Modelo canónico</strong><span className="schema-version">v1</span></div><div className="model-tags"><span className="model-tag tag-heading">heading</span><span className="model-tag tag-paragraph">paragraph</span><span className="model-tag tag-equation">equation</span><span className="model-tag tag-figure">figure</span><span className="model-tag tag-unknown">unknown</span></div><p>Los bloques no soportados se conservan visualmente, sin inventar estructura.</p></div></aside></div></div>
}

function PanelHeadingV2({ action, detail, icon, title }: { action?: ReactNode; detail: string; icon: IconName; title: string }) {
  return <div className="panel-heading-v2"><div className="panel-heading-icon"><Icon name={icon} size={17} /></div><div><strong>{title}</strong><span>{detail}</span></div>{action && <div className="panel-heading-action">{action}</div>}</div>
}

function ReviewBlockCard({ block, selected, onSelect }: { block: ReviewBlock; selected: boolean; onSelect: () => void }) {
  const statusText = block.status === 'ambiguous' ? `${block.confidence}%` : block.status === 'preserved' ? 'Conservado' : block.status === 'edited' ? 'Editado' : 'Confirmado'
  return <button className={`review-block-v2 review-block-${block.type} ${selected ? 'review-block-v2-selected' : ''} ${block.status !== 'ambiguous' ? 'review-block-v2-resolved' : ''}`} onClick={onSelect}><div className="review-block-top"><span className="block-type"><i />{block.label}</span><span className={`confidence ${block.status === 'ambiguous' ? 'confidence-low' : ''}`}>{statusText}</span></div><p>{block.type === 'equation' ? <span className="equation-text">{block.content}</span> : block.content}</p>{block.type === 'figure' && <span className="figure-preserved-mini"><Icon name="image" size={15} /> Imagen conservada · no editable</span>}{selected && <span className="selected-block-caret" />}</button>
}

function ProvenanceRowV2({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <div className="provenance-row-v2"><Icon name={icon} size={14} /><span>{label}</span><strong>{value}</strong></div>
}

function PreviewScreen({ documentTitle, equation, exported, page, pageCount, zoom, template, pendingCount, confirmWarnings, onBack, onPageChange, onZoomChange, onTemplateChange, onTitleChange, onConfirmWarnings, onExport, onReview }: { documentTitle: string; equation: string; exported: boolean; page: number; pageCount: number; zoom: number; template: string; pendingCount: number; confirmWarnings: boolean; onBack: () => void; onPageChange: (page: number) => void; onZoomChange: (zoom: number) => void; onTemplateChange: (template: string) => void; onTitleChange: (value: string) => void; onConfirmWarnings: (value: boolean) => void; onExport: () => void; onReview: () => void }) {
  const hasWarnings = pendingCount > 0
  return <div className="screen preview-v2-screen"><div className="preview-v2-topline"><button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Volver a revisión</button><div className="preview-top-actions"><span className="preview-version"><Icon name="check-circle" size={15} /> Versión lista</span><button className="secondary-button small-button" onClick={onReview}><Icon name="edit" size={15} /> Editar</button><button className="primary-button small-button" disabled={hasWarnings && !confirmWarnings} onClick={onExport}><Icon name="download" size={16} /> Descargar PDF</button></div></div><div className="preview-v2-heading"><div><p className="eyebrow">ENTREGA · VISTA PREVIA</p><h1>Así se verá tu documento</h1><p className="page-subtitle">Revisa la composición final y la trazabilidad antes de descargar el PDF.</p></div><div className={`preview-ready-badge ${hasWarnings ? 'preview-ready-badge-warning' : ''}`}><span className="ready-check"><Icon name={hasWarnings ? 'info' : 'check'} size={14} /></span><span><strong>{hasWarnings ? 'Requiere confirmación' : 'Listo para exportar'}</strong><small>{hasWarnings ? `${pendingCount} ambigüedad pendiente` : 'Sin bloqueantes'}</small></span></div></div>{exported && <div className="export-success"><div><Icon name="check-circle" size={18} /><span><strong>PDF generado correctamente.</strong> Se descargó desde el navegador y conserva la figura original.</span></div><button onClick={() => undefined}>Ver trazabilidad <Icon name="arrow-right" size={14} /></button></div>}<div className="preview-v2-layout"><section className="preview-stage-v2"><div className="stage-toolbar-v2"><span><Icon name="eye" size={15} /> Página {page} de {pageCount}</span><div><button aria-label="Página anterior" className="stage-icon-button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}><Icon name="chevron-left" size={16} /></button><button aria-label="Página siguiente" className="stage-icon-button" disabled={page >= pageCount} onClick={() => onPageChange(Math.min(pageCount, page + 1))}><Icon name="chevron-right" size={16} /></button><span className="stage-divider" /><button className="stage-zoom" onClick={() => onZoomChange(zoom >= 130 ? 85 : zoom + 15)}>{zoom}% <Icon name="chevron-down" size={13} /></button></div></div><div className="paper-preview-wrap"><div className="paper-preview paper-preview-v2" style={{ transform: `scale(${zoom / 100})` }}><div className="paper-preview-header"><span>ALGEBRA · SEMANA 4</span><span>{String(page).padStart(2, '0')}</span></div><h2>Ecuaciones lineales</h2><p>Resuelve la siguiente ecuación y comprueba el resultado.</p><div className="paper-equation">{equation}</div><div className="paper-solution"><span className="solution-label">Procedimiento</span><p>{equation}</p><p>3x = 15</p><p className="solution-final">x = 5</p></div><div className="paper-figure"><div className="figure-sketch"><span>3x + 5</span><i /> <span>20</span></div><div><strong>Procedimiento original</strong><small>Figura conservada desde la página 01</small></div></div><div className="paper-footer"><span>Generado con AlgeTra · versión local</span><span>{page}</span></div></div></div></section><aside className="export-v2-settings"><div className="surface-card settings-card-v2"><div className="settings-card-heading"><div><p className="eyebrow">DOCUMENTO</p><h2>Detalles de entrega</h2></div><Icon name="more-horizontal" size={18} /></div><label className="field-label" htmlFor="preview-document-name">Nombre del documento</label><div className="input-with-icon"><Icon name="edit" size={15} /><input id="preview-document-name" onChange={(event) => onTitleChange(event.target.value)} value={documentTitle} /></div><label className="field-label" htmlFor="preview-template">Plantilla</label><select id="preview-template" className="select-control" value={template} onChange={(event) => onTemplateChange(event.target.value)}><option value="academic-clean-v1">Académica limpia · v1</option><option value="notebook-soft-v1">Cuaderno suave · v1</option><option value="compact-delivery-v1">Entrega compacta · v1</option></select><div className="settings-divider" /><CheckRow icon="shield" title="Originales vinculados" detail="Cada figura conserva su procedencia" /><CheckRow icon="layers" title="Versión canónica" detail="La exportación usa la versión revisada" /><CheckRow icon="lock" title="Datos privados" detail="El PDF se genera en este navegador" />{hasWarnings && <label className="warning-confirm-row"><input type="checkbox" checked={confirmWarnings} onChange={(event) => onConfirmWarnings(event.target.checked)} /><span><strong>Confirmo las ambigüedades pendientes</strong><small>Entiendo que se preservarán como advertencias en el PDF.</small></span></label>}<button className="export-large-button" disabled={hasWarnings && !confirmWarnings} onClick={onExport}><Icon name="download" size={17} /> Generar y descargar PDF <span>{hasWarnings ? 'requiere revisión' : 'listo'}</span></button><p className="export-trace"><Icon name="shield" size={13} /> Exportación trazable · solo frontend</p></div><div className="preview-privacy-note"><Icon name="info" size={15} /><span>Este archivo es una demostración local. Al conectar la API, las URLs de descarga deberán ser temporales y limitadas.</span></div></aside></div></div>
}

function CheckRow({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  return <div className="export-check-row"><div className="export-check-icon"><Icon name={icon} size={14} /></div><div><strong>{title}</strong><span>{detail}</span></div></div>
}

function ActivityScreen({ activities, onOpenDocument }: { activities: ActivityItem[]; onOpenDocument: () => void }) {
  return <div className="screen utility-screen"><UtilityHeading eyebrow="HISTORIAL LOCAL" title="Actividad" detail="Eventos del prototipo, reintentos y decisiones recientes." action={<button className="secondary-button" onClick={onOpenDocument}><Icon name="file-text" size={16} /> Abrir documento activo</button>} /><div className="utility-grid"><section className="surface-card activity-feed-card"><div className="card-title-row"><div><h2>Eventos recientes</h2><p>La línea de tiempo se puede recuperar sin una conexión activa.</p></div><span className="tiny-tag">{activities.length} eventos</span></div><div className="activity-feed">{activities.map((activity, index) => <div className="activity-feed-row" key={activity.id}><div className={`activity-icon activity-icon-${activity.tone}`}><Icon name={activity.icon} size={17} /></div><div><strong>{activity.title}</strong><span>{activity.detail}</span><small>{activity.time}</small></div>{index === 0 && <span className="activity-new">Nuevo</span>}</div>)}</div></section><aside className="surface-card event-contract-card"><div className="card-title-row"><h2>Contrato de eventos</h2><Icon name="info" size={16} /></div><p>El frontend simula el mismo patrón que consumirá SSE o polling.</p><div className="event-contract"><span><i className="event-dot event-dot-blue" /> job.accepted</span><span><i className="event-dot event-dot-orange" /> page.result.available</span><span><i className="event-dot event-dot-green" /> job.completed</span></div><button className="outline-wide-button" onClick={onOpenDocument}><Icon name="refresh" size={15} /> Reproducir recorrido</button></aside></div></div>
}

function ArchiveScreen({ documents, onRestore, onDelete }: { documents: DocumentRecord[]; onRestore: (document: DocumentRecord) => void; onDelete: (document: DocumentRecord) => void }) {
  return <div className="screen utility-screen"><UtilityHeading eyebrow="TU ESPACIO" title="Archivados" detail="Los documentos archivados dejan de aparecer en el flujo activo, pero se pueden recuperar." /><section className="surface-card archive-list-card">{documents.length ? documents.map((document) => <DocumentListRow key={document.id} document={document} onOpen={() => undefined} onArchive={onRestore} onDelete={onDelete} />) : <EmptyState title="No hay documentos archivados" detail="Cuando archives un documento aparecerá aquí." />}</section></div>
}

function MetricsScreen({ documents, activities }: { documents: DocumentRecord[]; activities: ActivityItem[] }) {
  const bars = [42, 58, 46, 76, 64, 88, 72]
  return <div className="screen utility-screen"><UtilityHeading eyebrow="VALIDACIÓN · MVP-0" title="Métricas del piloto" detail="Indicadores simulados para validar el recorrido antes de conectar servicios reales." action={<span className="local-status"><i /> Solo datos locales</span>} /><div className="metrics-v2-grid"><MetricCard label="Páginas procesadas" value="8" detail="de 12 disponibles" tone="blue" /><MetricCard label="Bloques confirmados" value="86%" detail="+12% esta semana" tone="green" /><MetricCard label="Ambigüedades" value="4" detail="2 resueltas hoy" tone="orange" /><MetricCard label="Exportaciones" value="3" detail="PDFs trazables" tone="purple" /></div><div className="metrics-detail-grid"><section className="surface-card chart-card"><div className="card-title-row"><div><h2>Actividad de procesamiento</h2><p>Eventos por día · última semana</p></div><span className="tiny-tag">SIMULADO</span></div><div className="bar-chart">{bars.map((height, index) => <div className="bar-column" key={height + index}><span style={{ height: `${height}%` }} /><small>{['L', 'M', 'X', 'J', 'V', 'S', 'D'][index]}</small></div>)}</div></section><section className="surface-card metrics-summary-card"><div className="card-title-row"><div><h2>Salud del espacio</h2><p>Separación de artefactos y control local.</p></div><Icon name="shield" size={18} /></div><MetricSummary label="Originales conservados" value="12 / 12" /><MetricSummary label="Variantes trazables" value="7" /><MetricSummary label="Resultados brutos" value="8" /><MetricSummary label="Documentos activos" value={String(documents.filter((document) => !document.archived).length)} /><div className="metric-footnote"><Icon name="info" size={14} /> {activities.length} eventos registrados en esta sesión.</div></section></div></div>
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className="metric-card-v2"><span>{label}</span><strong className={`metric-value-${tone}`}>{value}</strong><small>{detail}</small></div>
}

function MetricSummary({ label, value }: { label: string; value: string }) {
  return <div className="metric-summary-row"><span>{label}</span><strong>{value}</strong></div>
}

function GuideScreen({ onStart }: { onStart: () => void }) {
  return <div className="screen utility-screen"><UtilityHeading eyebrow="GUÍA DE REVISIÓN" title="Revisa con intención" detail="La revisión humana no corrige el original: crea una capa auditable sobre él." action={<button className="primary-button" onClick={onStart}><Icon name="plus" size={16} /> Probar recorrido</button>} /><div className="guide-grid-v2"><GuideCard number="01" icon="image" title="Compara el recorte" detail="Selecciona un bloque y localiza la región equivalente en la página original. La geometría se conserva como procedencia." /><GuideCard number="02" icon="sparkle" title="Decide con contexto" detail="Confirma una interpretación, déjala pendiente o conserva la región como figura. Nunca se inventa estructura." /><GuideCard number="03" icon="edit" title="Edita en otra capa" detail="Tus cambios quedan separados de Mathpix y del OCR bruto. Puedes volver a cualquier versión." /><GuideCard number="04" icon="download" title="Exporta con advertencias" detail="El PDF se compone desde una versión canónica. Las ambigüedades pendientes requieren confirmación explícita." /></div><section className="surface-card guide-principles"><div><p className="eyebrow">PRINCIPIOS DEL SISTEMA</p><h2>Originales, resultados y decisiones no se mezclan</h2></div><div className="principle-pills"><span><Icon name="lock" size={15} /> Privacidad</span><span><Icon name="layers" size={15} /> Linaje</span><span><Icon name="clock" size={15} /> Recuperación</span><span><Icon name="shield" size={15} /> Revisión humana</span></div></section></div>
}

function GuideCard({ number, icon, title, detail }: { number: string; icon: IconName; title: string; detail: string }) {
  return <article className="guide-card-v2"><span className="guide-card-number">{number}</span><div className="guide-card-icon"><Icon name={icon} size={20} /></div><h2>{title}</h2><p>{detail}</p><button className="text-button">Ver ejemplo <Icon name="arrow-right" size={14} /></button></article>
}

function SettingsScreen({ theme, density, onThemeChange, onDensityChange, onClearLocal }: { theme: Theme; density: Density; onThemeChange: (theme: Theme) => void; onDensityChange: (density: Density) => void; onClearLocal: () => void }) {
  return <div className="screen utility-screen"><UtilityHeading eyebrow="PREFERENCIAS LOCALES" title="Ajustes" detail="Configura la experiencia del prototipo. Estos controles no llaman a ninguna API." /><div className="settings-v2-grid"><section className="surface-card settings-section-v2"><div className="settings-section-heading"><div className="settings-section-icon"><Icon name="sun" size={18} /></div><div><h2>Apariencia</h2><p>Adapta el espacio a tu forma de revisar.</p></div></div><div className="settings-option-row"><div><strong>Modo de color</strong><span>{theme === 'dark' ? 'Fondo oscuro para sesiones prolongadas' : 'Interfaz clara y de alto contraste'}</span></div><div className="segmented-control"><button className={theme === 'light' ? 'active' : ''} onClick={() => onThemeChange('light')}><Icon name="sun" size={15} /> Claro</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => onThemeChange('dark')}><Icon name="moon" size={15} /> Oscuro</button></div></div><div className="settings-option-row"><div><strong>Escala de interfaz</strong><span>Aumenta el aire entre controles y el tamaño de lectura.</span></div><div className="segmented-control"><button className={density === 'compact' ? 'active' : ''} onClick={() => onDensityChange('compact')}>Compacta</button><button className={density === 'comfortable' ? 'active' : ''} onClick={() => onDensityChange('comfortable')}>Cómoda</button></div></div></section><section className="surface-card settings-section-v2"><div className="settings-section-heading"><div className="settings-section-icon settings-icon-green"><Icon name="shield" size={18} /></div><div><h2>Privacidad y simulación</h2><p>Estado de las integraciones previstas para el MVP-0.</p></div></div><SettingsStatus label="API AlgeTra" value="Desactivada" detail="La interfaz usa estado local" tone="neutral" /><SettingsStatus label="Mathpix" value="Fixture local" detail="No se envían imágenes" tone="green" /><SettingsStatus label="Almacenamiento" value="Navegador" detail="Se borra al limpiar preferencias" tone="blue" /><button className="danger-outline-button" onClick={onClearLocal}><Icon name="trash" size={15} /> Limpiar preferencias del prototipo</button></section><section className="surface-card settings-section-v2 settings-shortcuts"><div className="settings-section-heading"><div className="settings-section-icon settings-icon-purple"><Icon name="grid" size={18} /></div><div><h2>Atajos y comportamiento</h2><p>Funciones rápidas disponibles en el prototipo.</p></div></div><ShortcutRow keyLabel="N" label="Crear documento nuevo" /><ShortcutRow keyLabel="R" label="Abrir revisión del fixture" /><ShortcutRow keyLabel="D" label="Cambiar entre claro y oscuro" /></section></div></div>
}

function SettingsStatus({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className="settings-status-row"><span className={`settings-status-dot settings-status-${tone}`} /><div><strong>{label}</strong><small>{detail}</small></div><em>{value}</em></div>
}

function ShortcutRow({ keyLabel, label }: { keyLabel: string; label: string }) {
  return <div className="shortcut-row"><kbd>{keyLabel}</kbd><span>{label}</span></div>
}

function UtilityHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="utility-heading-v2"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-subtitle">{detail}</p></div>{action}</div>
}

function InfoCard({ icon, title, tone, children }: { icon: IconName; title: string; tone: 'green' | 'orange'; children: ReactNode }) {
  return <div className={`info-card-v2 info-card-${tone}`}><div className="info-card-heading"><Icon name={icon} size={17} /><strong>{title}</strong></div>{children}</div>
}

function RuleList({ items }: { items: string[] }) {
  return <div className="rule-list-v2">{items.map((item) => <span key={item}><Icon name="check" size={13} /> {item}</span>)}</div>
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return <div className="checklist-row"><span className={done ? 'checklist-done' : ''}>{done ? <Icon name="check" size={13} /> : <i />}</span><strong>{label}</strong>{done && <small>Listo</small>}</div>
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state-v2"><div><Icon name="file-text" size={22} /></div><strong>{title}</strong><p>{detail}</p>{action}</div>
}

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section aria-modal="true" className="modal-card" role="dialog"><div className="modal-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><button aria-label="Cerrar" className="icon-button" onClick={onClose}><Icon name="x" size={18} /></button></div><div className="modal-body">{children}</div></section></div>
}

function LineageModal({ page, block }: { page: Page; block: ReviewBlock }) {
  return <div className="lineage-modal"><div className="lineage-visual"><ManuscriptPreview compact page={page.pageNumber} image={page.dataUrl} highlight /><span className="lineage-arrow"><Icon name="arrow-right" size={18} /></span><div className="lineage-block-preview"><span>{block.label}</span><strong>{block.content}</strong><small>Geometría normalizada · 0.32, 0.28</small></div></div><div className="lineage-steps"><LineageStep number="01" title="Original" detail={`${page.name} · inmutable`} /><LineageStep number="02" title="Variante" detail="Contraste suave · derivada" /><LineageStep number="03" title="OCR" detail="Mathpix fixture · request local" /><LineageStep number="04" title="Capa humana" detail="Edición y decisión actual" /></div></div>
}

function LineageStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <div className="lineage-step"><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div></div>
}

function HelpRow({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <div className="help-row"><span>{number}</span><div><strong>{title}</strong><p>{detail}</p></div></div>
}

export default App
