import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Image as ImageIcon,
  Download,
  Trash2,
  Filter,
  Search,
  RefreshCw,
  Eye,
  X,
  Sparkles,
  Calendar,
  Palette,
  Type,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  AlertCircle,
} from 'lucide-react'
import { DashboardLayout } from '@src/components/layout'
import { designsApi, type Design } from '@src/lib/api'

// =====================================================
// TYPES
// =====================================================

type StatusFilter = 'all' | 'ready' | 'generating' | 'pending' | 'failed'

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }: { status: Design['status'] }) {
  const config = {
    ready: { label: 'Fertig', bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    generating: { label: 'Wird erstellt...', bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
    pending: { label: 'Wartend', bg: 'bg-zinc-500/20', text: 'text-zinc-400', dot: 'bg-zinc-400' },
    failed: { label: 'Fehlgeschlagen', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
    archived: { label: 'Archiviert', bg: 'bg-zinc-600/20', text: 'text-zinc-500', dot: 'bg-zinc-500' },
  }
  const c = config[status] || config.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

// =====================================================
// DESIGN CARD
// =====================================================

interface DesignCardProps {
  design: Design
  onView: (design: Design) => void
  onDownload: (design: Design) => void
  onArchive: (design: Design) => void
}

function DesignCard({ design, onView, onDownload, onArchive }: DesignCardProps) {
  const isReady = design.status === 'ready' && design.image_url

  return (
    <div className="group relative bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all">
      {/* Image */}
      <div className="aspect-square bg-zinc-900 relative overflow-hidden">
        {isReady ? (
          <img
            src={design.image_url!}
            alt={design.slogan_text || 'Design'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : design.status === 'generating' ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
              <span className="text-xs text-zinc-500">Wird generiert...</span>
            </div>
          </div>
        ) : design.status === 'failed' ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <span className="text-xs text-red-400 px-4 text-center">{design.error_message || 'Fehler'}</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-zinc-600" />
          </div>
        )}

        {/* Hover Overlay */}
        {isReady && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => onView(design)}
              className="p-2.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Ansehen"
            >
              <Eye className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => onDownload(design)}
              className="p-2.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Herunterladen"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => onArchive(design)}
              className="p-2.5 bg-red-500/30 rounded-lg hover:bg-red-500/50 transition-colors"
              title="Archivieren"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <StatusBadge status={design.status} />
          <span className="text-xs text-zinc-500">
            {new Date(design.created_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </span>
        </div>

        {design.slogan_text && (
          <p className="text-sm text-white font-medium truncate" title={design.slogan_text}>
            "{design.slogan_text}"
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {design.language && (
            <span className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400 uppercase">
              {design.language}
            </span>
          )}
          {design.variables_used?.palette ? (
            <span className="flex items-center gap-1">
              <Palette className="w-3 h-3" />
              {String(design.variables_used.palette)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// DESIGN DETAIL MODAL
// =====================================================

interface DesignModalProps {
  design: Design
  onClose: () => void
  onDownload: (design: Design) => void
  onArchive: (design: Design) => void
}

function DesignModal({ design, onClose, onDownload, onArchive }: DesignModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Design Details</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <div className="aspect-square bg-zinc-800 rounded-xl overflow-hidden">
            {design.image_url ? (
              <img src={design.image_url} alt={design.slogan_text || 'Design'} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <StatusBadge status={design.status} />
            </div>

            {design.slogan_text && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> Slogan
                </label>
                <p className="text-white font-medium mt-1">"{design.slogan_text}"</p>
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Erstellt am
              </label>
              <p className="text-zinc-300 text-sm mt-1">
                {new Date(design.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Modell</label>
              <p className="text-zinc-300 text-sm mt-1">{design.generation_model} ({design.generation_quality})</p>
            </div>

            {design.variables_used && Object.keys(design.variables_used).length > 0 && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Variablen</label>
                <div className="mt-1 space-y-1">
                  {Object.entries(design.variables_used).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-500">{key}:</span>
                      <span className="text-zinc-300">{typeof value === 'string' ? value : JSON.stringify(value) as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {design.final_prompt && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Prompt</label>
                <p className="text-zinc-400 text-xs mt-1 max-h-32 overflow-y-auto bg-zinc-800 p-3 rounded-lg">
                  {design.final_prompt}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {design.status === 'ready' && (
                <button
                  onClick={() => onDownload(design)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Herunterladen
                </button>
              )}
              <button
                onClick={() => {
                  onArchive(design)
                  onClose()
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Archivieren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// STATS BANNER
// =====================================================

function StatsBanner({ designs }: { designs: Design[] }) {
  const stats = useMemo(() => {
    const ready = designs.filter((d) => d.status === 'ready').length
    const generating = designs.filter((d) => d.status === 'generating').length
    const failed = designs.filter((d) => d.status === 'failed').length
    return { total: designs.length, ready, generating, failed }
  }, [designs])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { label: 'Gesamt', value: stats.total, color: 'text-white' },
        { label: 'Fertig', value: stats.ready, color: 'text-emerald-400' },
        { label: 'In Arbeit', value: stats.generating, color: 'text-amber-400' },
        { label: 'Fehlerhaft', value: stats.failed, color: 'text-red-400' },
      ].map((s) => (
        <div key={s.label} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <p className="text-xs text-zinc-500">{s.label}</p>
          <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}

// =====================================================
// MAIN PAGE
// =====================================================

const PAGE_SIZE = 24

export default function DashboardDesigns() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null)

  // Fetch designs
  const { data, isLoading, error } = useQuery({
    queryKey: ['designs', statusFilter, page],
    queryFn: () =>
      designsApi.getDesigns({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  })

  const designs = data?.designs || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (designId: string) => designsApi.archiveDesign(designId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs'] })
    },
  })

  // Filter by search
  const filteredDesigns = useMemo(() => {
    if (!searchTerm.trim()) return designs
    const term = searchTerm.toLowerCase()
    return designs.filter(
      (d) =>
        d.slogan_text?.toLowerCase().includes(term) ||
        d.prompt_used?.toLowerCase().includes(term) ||
        d.final_prompt?.toLowerCase().includes(term)
    )
  }, [designs, searchTerm])

  // Handlers
  const handleView = (design: Design) => setSelectedDesign(design)

  const handleDownload = async (design: Design) => {
    if (!design.image_url) return
    try {
      const response = await fetch(design.image_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `design-${design.id.slice(0, 8)}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download failed:', e)
    }
  }

  const handleArchive = (design: Design) => {
    if (confirm('Dieses Design wirklich archivieren?')) {
      archiveMutation.mutate(design.id)
    }
  }

  // Status filter tabs
  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'ready', label: 'Fertig' },
    { value: 'generating', label: 'In Arbeit' },
    { value: 'failed', label: 'Fehlerhaft' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-violet-400" />
              Meine Motive
            </h1>
            <p className="text-zinc-400 mt-1">
              Deine KI-generierten Designs. Automatisch erstellt alle 2 Stunden.
            </p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['designs'] })}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>

        {/* Stats */}
        <StatsBanner designs={designs} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Tabs */}
          <div className="flex bg-zinc-800 rounded-lg p-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value)
                  setPage(0)
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-violet-500 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Nach Slogans suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-zinc-800" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-zinc-700 rounded w-16" />
                  <div className="h-3 bg-zinc-700 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white font-semibold">Fehler beim Laden</h3>
            <p className="text-zinc-400 text-sm mt-2">
              {error instanceof Error ? error.message : 'Designs konnten nicht geladen werden.'}
            </p>
          </div>
        ) : filteredDesigns.length === 0 ? (
          <div className="p-12 text-center">
            <ImageIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-lg">Noch keine Motive</h3>
            <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
              Sobald du eine Nische mit Auto-Generierung aktiviert hast, werden hier automatisch alle 2 Stunden neue Designs erstellt.
            </p>
            <div className="mt-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl max-w-sm mx-auto text-left">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">So geht's:</p>
              <ol className="text-sm text-zinc-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 font-mono">1.</span>
                  Gehe zu <span className="text-white">Nischen</span> im Menü
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 font-mono">2.</span>
                  Aktiviere <span className="text-white">Auto-Generierung</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 font-mono">3.</span>
                  Warte auf den nächsten Cron-Run (alle 2h)
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <>
            {/* Design Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredDesigns.map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onView={handleView}
                  onDownload={handleDownload}
                  onArchive={handleArchive}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </button>
                <span className="text-sm text-zinc-500">
                  Seite {page + 1} von {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Weiter
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDesign && (
        <DesignModal
          design={selectedDesign}
          onClose={() => setSelectedDesign(null)}
          onDownload={handleDownload}
          onArchive={handleArchive}
        />
      )}
    </DashboardLayout>
  )
}
