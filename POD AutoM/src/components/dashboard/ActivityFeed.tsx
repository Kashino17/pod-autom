import {
  Package,
  TrendingUp,
  Megaphone,
  RefreshCw,
  AlertCircle,
  Zap,
  ShoppingCart,
  Loader2,
} from 'lucide-react'

// =====================================================
// TYPES
// =====================================================

export type ActivityType =
  | 'product_created'
  | 'product_optimized'
  | 'campaign_synced'
  | 'winner_found'
  | 'sale'
  | 'error'
  | 'system'

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

interface ActivityFeedProps {
  activities: Activity[]
  isLoading: boolean
  maxItems?: number
}

// =====================================================
// ACTIVITY ICON
// =====================================================

function ActivityIcon({ type }: { type: ActivityType }) {
  const config = {
    product_created: {
      icon: <Package className="w-4 h-4" />,
      className: 'bg-violet-500/20 text-violet-400',
    },
    product_optimized: {
      icon: <Zap className="w-4 h-4" />,
      className: 'bg-cyan-500/20 text-cyan-400',
    },
    campaign_synced: {
      icon: <Megaphone className="w-4 h-4" />,
      className: 'bg-blue-500/20 text-blue-400',
    },
    winner_found: {
      icon: <TrendingUp className="w-4 h-4" />,
      className: 'bg-emerald-500/20 text-emerald-400',
    },
    sale: {
      icon: <ShoppingCart className="w-4 h-4" />,
      className: 'bg-green-500/20 text-green-400',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      className: 'bg-red-500/20 text-red-400',
    },
    system: {
      icon: <RefreshCw className="w-4 h-4" />,
      className: 'bg-zinc-700 text-zinc-400',
    },
  }

  const { icon, className } = config[type]

  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {icon}
    </div>
  )
}

// =====================================================
// TIME AGO HELPER
// =====================================================

function timeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'gerade eben'
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)} Min.`
  if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)} Std.`
  if (seconds < 604800) return `vor ${Math.floor(seconds / 86400)} Tagen`
  return then.toLocaleDateString('de-DE')
}

// =====================================================
// ACTIVITY ITEM
// =====================================================

function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <div className="flex gap-3 py-3">
      <ActivityIcon type={activity.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{activity.title}</p>
        {activity.description && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {activity.description}
          </p>
        )}
        <p className="text-xs text-zinc-600 mt-1">{timeAgo(activity.timestamp)}</p>
      </div>
    </div>
  )
}

// =====================================================
// ACTIVITY FEED COMPONENT
// =====================================================

export function ActivityFeed({
  activities,
  isLoading,
  maxItems = 10,
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems)

  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-white">Aktivität</h3>
      </div>

      {/* Content */}
      <div className="p-4">
        {displayedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3">
              <RefreshCw className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-400">Keine Aktivität</p>
            <p className="text-sm text-zinc-500 mt-1">
              Aktivitäten werden hier angezeigt.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {displayedActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > maxItems && (
        <div className="p-4 border-t border-zinc-800">
          <button className="w-full text-sm text-violet-400 hover:text-violet-300 transition-colors">
            Mehr anzeigen ({activities.length - maxItems} weitere)
          </button>
        </div>
      )}
    </div>
  )
}

export default ActivityFeed
