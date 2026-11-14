import {
  BarChart3,
  Bot,
  Database,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import type { NavSection } from '../types/analytics';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  hasActiveDataset: boolean;
  activeDatasetName?: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
  requiresDataset?: boolean;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload Dataset', icon: Upload },
  { id: 'explorer', label: 'Data Explorer', icon: Database, requiresDataset: true },
  { id: 'quality', label: 'Data Quality', icon: ShieldCheck, requiresDataset: true },
  { id: 'visualizations', label: 'Visualizations', icon: BarChart3, requiresDataset: true },
  { id: 'insights', label: 'AI Insights', icon: Bot, requiresDataset: true },
  { id: 'chat', label: 'Ask Your Data', icon: MessageSquareText, requiresDataset: true },
  { id: 'reports', label: 'Reports', icon: FileText, requiresDataset: true },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  hasActiveDataset,
  activeDatasetName,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleNav = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
        <button
          type="button"
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold tracking-tight text-white whitespace-nowrap">
              AI Decision Copilot
            </div>
            <div className="text-xs text-slate-400 whitespace-nowrap">
              Analytics Workspace
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary Navigation">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const isMuted = Boolean(item.requiresDataset && !hasActiveDataset);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isMuted
                        ? 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : isMuted ? 'text-slate-500' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="text-xs font-medium text-slate-400">Active Dataset</div>
        <div className="mt-1 truncate text-xs text-slate-200 font-mono">
          {activeDatasetName || 'No dataset loaded'}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 border-r border-slate-800">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] shrink-0">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
