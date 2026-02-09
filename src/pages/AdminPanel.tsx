import { useState } from 'react'
import {
  Users,
  CheckCircle,
  Clock,
  Store,
  Search,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { DashboardLayout } from '@src/components/layout'
import {
  useAdminUsers,
  useAdminStats,
  useAdminMutations,
  UserProfile,
} from '@src/hooks/useAdmin'

// =====================================================
// STAT CARD COMPONENT
// =====================================================

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-zinc-400">{title}</p>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// USER ROW COMPONENT
// =====================================================

interface UserRowProps {
  user: UserProfile
  onSetInstallLink: (userId: string, link: string) => void
  onConfirmDomainChange: (userId: string) => void
  isSettingLink: boolean
}

function UserRow({ user, onSetInstallLink, onConfirmDomainChange, isSettingLink }: UserRowProps) {
  const [installLink, setInstallLink] = useState(user.shopify_install_link || '')
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(!user.shopify_install_link)

  const handleCopyDomain = () => {
    if (user.shopify_domain) {
      navigator.clipboard.writeText(user.shopify_domain)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveLink = () => {
    if (installLink.trim()) {
      onSetInstallLink(user.id, installLink.trim())
      setIsEditing(false)
    }
  }

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    verified: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const connectionColors = {
    connected: 'text-emerald-400',
    disconnected: 'text-zinc-500',
    error: 'text-red-400',
    pending: 'text-yellow-400',
  }

  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
      {/* User Info */}
      <td className="px-4 py-4">
        <div>
          <p className="text-white font-medium">{user.full_name || 'Kein Name'}</p>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
      </td>

      {/* Shopify Domain */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {user.shopify_domain ? (
            <>
              <a
                href={`https://${user.shopify_domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                {user.shopify_domain}
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={handleCopyDomain}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
                title="Domain kopieren"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              {user.domain_changed_flag && (
                <button
                  onClick={() => onConfirmDomainChange(user.id)}
                  className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
                  title={`Domain geändert von: ${user.shopify_domain_previous}`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <span className="text-zinc-500">Keine Domain</span>
          )}
        </div>
      </td>

      {/* Install Link Input */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <input
                type="text"
                value={installLink}
                onChange={(e) => setInstallLink(e.target.value)}
                placeholder="Install-Link einfügen..."
                className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none min-w-[300px]"
              />
              <button
                onClick={handleSaveLink}
                disabled={!installLink.trim() || isSettingLink}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors"
              >
                {isSettingLink ? 'Speichern...' : 'Speichern'}
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-zinc-400 truncate max-w-[300px]">
                {user.shopify_install_link || 'Nicht gesetzt'}
              </span>
              <button
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
              >
                Bearbeiten
              </button>
            </>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full border ${
            statusColors[user.verification_status]
          }`}
        >
          {user.verification_status === 'pending' && 'Ausstehend'}
          {user.verification_status === 'verified' && 'Verifiziert'}
          {user.verification_status === 'rejected' && 'Abgelehnt'}
        </span>
      </td>

      {/* Shop Connection */}
      <td className="px-4 py-4">
        <span
          className={`text-sm ${
            connectionColors[user.shop_connection_status as keyof typeof connectionColors] ||
            'text-zinc-500'
          }`}
        >
          {user.shop_connection_status === 'connected' && 'Verbunden'}
          {user.shop_connection_status === 'disconnected' && 'Getrennt'}
          {user.shop_connection_status === 'error' && 'Fehler'}
          {user.shop_connection_status === 'pending' && 'Ausstehend'}
          {!user.shop_connection_status && 'Nicht verbunden'}
        </span>
      </td>

      {/* Date */}
      <td className="px-4 py-4">
        <span className="text-sm text-zinc-400">
          {new Date(user.created_at).toLocaleDateString('de-DE')}
        </span>
      </td>
    </tr>
  )
}

// =====================================================
// ADMIN PANEL PAGE
// =====================================================

export default function AdminPanel() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data: usersData, isLoading: isLoadingUsers, refetch } = useAdminUsers(
    page,
    20,
    status || undefined,
    search || undefined
  )
  const { data: stats, isLoading: isLoadingStats } = useAdminStats()
  const { setInstallLink, isSettingLink, confirmDomainChange } = useAdminMutations()

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-zinc-400">Verwaltung von Benutzern und Verifizierungen</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Aktualisieren
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Ausstehende Verifizierungen"
            value={stats?.pending_users || 0}
            icon={<Clock className="w-5 h-5 text-yellow-400" />}
            color="bg-yellow-500/20"
          />
          <StatCard
            title="Verifizierte User"
            value={stats?.verified_users || 0}
            icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
            color="bg-emerald-500/20"
          />
          <StatCard
            title="Gesamte User"
            value={stats?.total_users || 0}
            icon={<Users className="w-5 h-5 text-violet-400" />}
            color="bg-violet-500/20"
          />
          <StatCard
            title="Verbundene Shops"
            value={stats?.connected_shops || 0}
            icon={<Store className="w-5 h-5 text-blue-400" />}
            color="bg-blue-500/20"
          />
        </div>

        {/* Filters */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Suche nach E-Mail, Name oder Domain..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors"
              >
                Suchen
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-violet-500 focus:outline-none"
            >
              <option value="">Alle Status</option>
              <option value="pending">Ausstehend</option>
              <option value="verified">Verifiziert</option>
              <option value="rejected">Abgelehnt</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-zinc-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Benutzer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Shopify Domain
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Install-Link
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Shop
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Registriert
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                      Laden...
                    </td>
                  </tr>
                ) : usersData?.users && usersData.users.length > 0 ? (
                  usersData.users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onSetInstallLink={(userId, link) => setInstallLink({ userId, installLink: link })}
                      onConfirmDomainChange={confirmDomainChange}
                      isSettingLink={isSettingLink}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                      Keine Benutzer gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersData && usersData.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-700">
              <p className="text-sm text-zinc-400">
                Seite {usersData.page} von {usersData.total_pages} ({usersData.total} Benutzer)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(usersData.total_pages, p + 1))}
                  disabled={page === usersData.total_pages}
                  className="p-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
