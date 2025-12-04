import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronsUpDown,
  Plus,
  Check,
  Zap,
  RefreshCw,
  Shirt,
  Share2,
  Gauge,
  Settings,
  LogOut,
  LayoutGrid,
  Search,
  Facebook,
  LayoutDashboard,
  PiggyBank,
  BrainCircuit,
  BarChart2,
  Pencil,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { Shop, TabId } from '../types';

interface SidebarProps {
  shops: Shop[];
  activeShopId: string | null;
  activeTabId: TabId;
  onSelectShop: (id: string) => void;
  onSelectTab: (id: TabId) => void;
  onAddShop: () => void;
  onEditShop?: (shopId: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavCategory {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  shops,
  activeShopId,
  activeTabId,
  onSelectShop,
  onSelectTab,
  onAddShop,
  onEditShop
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeShop = shops.find(s => s.id === activeShopId);

  const navItems: NavCategory[] = [
    { category: 'Overview', icon: LayoutDashboard, items: [
      { id: 'dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
      { id: 'automation-roi', label: 'ROI & Savings', icon: PiggyBank },
      { id: 'pod-intelligence', label: 'POD Intelligence', icon: BrainCircuit },
      { id: 'marketing-analytics', label: 'Ad Sync Reports', icon: BarChart2 },
    ]},
    { category: 'Automation', icon: Zap, items: [
      { id: 'start-phase', label: 'Start Phase', icon: Zap },
      { id: 'post-phase', label: 'Post Phase', icon: RefreshCw },
    ]},
    { category: 'Marketing Sync', icon: Share2, items: [
      { id: 'pinterest', label: 'Pinterest Sync', icon: Share2 },
      { id: 'campaign-optimization', label: 'Pinterest Optimierung', icon: TrendingUp },
      { id: 'meta-ads', label: 'Meta Ads Sync', icon: Facebook },
      { id: 'google-ads', label: 'Google Ads Manager', icon: Search },
      { id: 'product-creation', label: 'Product Creation', icon: Shirt },
    ]},
    { category: 'System', icon: Settings, items: [
      { id: 'limits', label: 'Rate Limits', icon: Gauge },
      { id: 'general', label: 'Settings', icon: Settings },
    ]}
  ];

  // Find which category contains the active tab
  const getActiveCategoryIndex = (): number => {
    for (let i = 0; i < navItems.length; i++) {
      if (navItems[i].items.some(item => item.id === activeTabId)) {
        return i;
      }
    }
    return -1;
  };

  // Initialize expanded category based on active tab
  const [expandedCategory, setExpandedCategory] = useState<number>(getActiveCategoryIndex());

  // Update expanded category when activeTabId changes
  useEffect(() => {
    const activeCatIndex = getActiveCategoryIndex();
    if (activeCatIndex !== -1) {
      setExpandedCategory(activeCatIndex);
    }
  }, [activeTabId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryClick = (index: number) => {
    // Toggle: if clicking the same category, close it; otherwise open the new one
    setExpandedCategory(expandedCategory === index ? -1 : index);
  };

  const handleItemClick = (itemId: string, categoryIndex: number) => {
    onSelectTab(itemId as TabId);
    // Keep the category expanded
    setExpandedCategory(categoryIndex);
  };

  return (
    <div className="w-[260px] h-full bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">

      {/* --- WORKSPACE SWITCHER (Header) --- */}
      <div className="p-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 shadow-sm">
                <LayoutGrid className="w-5 h-5 text-zinc-900" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-sm font-semibold text-zinc-200 truncate">
                  {activeShop ? activeShop.name : 'Select Shop'}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {activeShop ? activeShop.domain : 'No shop selected'}
                </div>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 border-b border-zinc-800">
                 <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search shop..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-1.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                    />
                 </div>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {shops.map(shop => (
                  <div
                    key={shop.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-zinc-800 transition-colors group"
                  >
                    <button
                      onClick={() => {
                        onSelectShop(shop.id);
                        setIsDropdownOpen(false);
                      }}
                      className="flex-1 flex items-center gap-2.5 text-left"
                    >
                       <span className="w-2 h-2 rounded-full" style={{
                         backgroundColor: shop.status === 'connected' ? '#10b981' :
                                          shop.status === 'syncing' ? '#fbbf24' : '#ef4444'
                       }} />
                       <span className={`text-sm ${shop.id === activeShopId ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                         {shop.name}
                       </span>
                    </button>
                    <div className="flex items-center gap-1">
                      {onEditShop && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditShop(shop.id);
                            setIsDropdownOpen(false);
                          }}
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                          title="Shop bearbeiten"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {shop.id === activeShopId && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-1 border-t border-zinc-800 bg-zinc-900/50">
                <button
                  onClick={() => {
                    onAddShop();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Connect new Shop
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- NAVIGATION (Accordion Style) --- */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((group, categoryIndex) => {
            const isExpanded = expandedCategory === categoryIndex;
            const hasActiveItem = group.items.some(item => item.id === activeTabId);
            const CategoryIcon = group.icon;

            return (
              <div key={categoryIndex} className="relative">
                {/* Category Header (clickable) */}
                <button
                  disabled={!activeShopId}
                  onClick={() => handleCategoryClick(categoryIndex)}
                  className={`
                    w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-sm transition-all duration-200 group
                    ${!activeShopId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${hasActiveItem
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon className={`w-4 h-4 ${hasActiveItem ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                    <span className={`font-medium ${hasActiveItem ? 'text-white' : ''}`}>
                      {group.category}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Submenu Items (collapsible) */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="pl-4 mt-1 space-y-0.5 relative">
                    {/* Vertical line connector */}
                    <div className="absolute left-[18px] top-0 bottom-2 w-px bg-zinc-800" />

                    {group.items.map((item) => {
                      const isActive = activeTabId === item.id;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          disabled={!activeShopId}
                          onClick={() => handleItemClick(item.id, categoryIndex)}
                          className={`
                            w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150 group relative
                            ${!activeShopId ? 'opacity-50 cursor-not-allowed' : ''}
                            ${isActive
                              ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
                          `}
                        >
                          {/* Active indicator bar */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-full" />
                          )}

                          {/* Horizontal connector line */}
                          <div className={`absolute left-[-8px] top-1/2 w-2 h-px ${isActive ? 'bg-emerald-400/50' : 'bg-zinc-800'}`} />

                          <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* --- USER FOOTER --- */}
      <div className="p-3 border-t border-zinc-800">
        <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition-colors text-left group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-zinc-600 flex items-center justify-center overflow-hidden">
             <span className="text-xs font-bold text-white">JD</span>
          </div>
          <div className="flex-1 min-w-0">
             <div className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">John Doe</div>
             <div className="text-[11px] text-zinc-500 truncate">Admin Account</div>
          </div>
          <LogOut className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
        </button>
      </div>

    </div>
  );
};
