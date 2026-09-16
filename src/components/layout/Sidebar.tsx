import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';

type PageID = 'overview' | 'sql-lab' | 'database' | 'dependencies' | 'compare' | 'flow' | 'labs' | 'settings' | 'credits';

interface NavGroup {
  name: string;
  items: { id: PageID; label: string; icon: JSX.Element }[];
}

const navGroups: NavGroup[] = [
  {
    name: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
      { id: 'sql-lab', label: 'SQL Lab', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg> },
      { id: 'dependencies', label: 'Dependencies', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> },
      { id: 'compare', label: 'Compare MV', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17l-5-5 5-5"></path><path d="M15 7l5 5-5 5"></path><line x1="14" y1="21" x2="10" y2="3"></line></svg> },
      { id: 'flow', label: 'Query X-Ray', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> },
    ]
  },
  {
    name: 'Learn',
    items: [
      { id: 'labs', label: 'Labs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
    ]
  },
  {
    name: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> },
      { id: 'credits', label: 'Credits', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> }
    ]
  }
];

export function Sidebar() {
  const { ui, setUI } = useStore(useShallow(state => ({ ui: state.ui, setUI: state.setUI })));
  
  const activePage = (ui as any).activePage || 'overview';

  return (
    <div className="flex flex-col h-full w-64 neo-surface rounded-none border-r border-border/10 overflow-hidden z-10">
      <div className="flex items-center h-16 px-6 mb-4">
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">ViewLab</h1>
      </div>

      <nav className="flex-1 px-4 space-y-6 overflow-y-auto pb-4 pt-2">
        {navGroups.map((group) => (
          <div key={group.name} className="space-y-1">
            <h4 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.name}</h4>
            {group.items.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setUI({ ...ui, activePage: item.id } as any)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'neo-surface-inset text-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <div className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                    {item.icon}
                  </div>
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      
      <div className="p-4 mt-auto">
        <div className="flex gap-2 mb-4 bg-muted/30 p-1 rounded-lg">
          <button
            onClick={() => setUI({ ...ui, theme: 'light' } as any)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${ui.theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Light
          </button>
          <button
            onClick={() => setUI({ ...ui, theme: 'dark' } as any)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${ui.theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Dark
          </button>
        </div>
        <button 
 
          onClick={() => document.dispatchEvent(new CustomEvent('toggle-ai'))}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 neo-button text-sm font-semibold text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
          Lab Assistant
        </button>
      </div>
    </div>
  );
}
