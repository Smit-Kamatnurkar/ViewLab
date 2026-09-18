import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { ActivePage } from '../../types';
import { Button } from '../Button';
import { Input } from '../Input';

interface NavGroup {
  name: string;
  items: { id: ActivePage; label: string; icon: JSX.Element }[];
}

const navGroups: NavGroup[] = [
  {
    name: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
      { id: 'sql-lab', label: 'SQL Lab', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg> },
      { id: 'simulation', label: 'Simulator', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
      { id: 'dependencies', label: 'Dependencies', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> },
      { id: 'compare', label: 'Compare', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17l-5-5 5-5"></path><path d="M15 7l5 5-5 5"></path><line x1="14" y1="21" x2="10" y2="3"></line></svg> },
      { id: 'flow', label: 'Query X-Ray', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> },
    ]
  },
  {
    name: 'Learn',
    items: [
      { id: 'learn', label: 'Tutorial', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> },
      { id: 'labs', label: 'Labs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
      { id: 'use-cases', label: 'Use Cases', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
    ]
  },
  {
    name: 'Project Info',
    items: [
      { id: 'credits', label: 'Developed By', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
      { id: 'references', label: 'References', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> },
      { id: 'history', label: 'History', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
      { id: 'export', label: 'Export', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
      { id: 'settings', label: 'Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> },
    ]
  }
];

export function Sidebar() {
  const { ui, setUI, history, mvManager, databases, activeDatabaseId, switchDatabase, createDatabase } = useStore(useShallow(state => ({
    ui: state.ui,
    setUI: state.setUI,
    history: state.history,
    mvManager: state.mvManager,
    databases: state.databases,
    activeDatabaseId: state.activeDatabaseId,
    switchDatabase: state.switchDatabase,
    createDatabase: state.createDatabase,
  })));
  
  const activePage = ui.activePage || 'overview';
  const staleCount = Array.from(mvManager.getAllViews().values()).filter(mv => mv.status === 'STALE').length;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newDbDescription, setNewDbDescription] = useState('');

  const handleCreateDatabase = async () => {
    if (newDbName.trim().length > 0) {
      await createDatabase(newDbName.trim(), newDbDescription.trim() || undefined);
      setNewDbName('');
      setNewDbDescription('');
      setShowCreateModal(false);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  return (
    <>
      <div className="flex flex-col h-full w-64 bg-card text-card-foreground border-r border-border z-10 shadow-sm transition-colors duration-200">
        <div className="flex flex-col px-6 pt-4 pb-3 mb-2 border-b border-border/40 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
              V
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">ViewLab</h1>
          </div>

          {/* Database Selector */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Database</label>
            <select 
              className="w-full bg-muted/50 border border-border rounded-md px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-primary transition-colors cursor-pointer pointer-events-auto"
              value={activeDatabaseId}
              onChange={(e) => {
                switchDatabase(e.target.value);
              }}
            >
              {Object.values(databases).map(db => (
                <option key={db.metadata.id} value={db.metadata.id}>
                  {db.metadata.name}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" className="w-full justify-start mt-1" onClick={handleOpenCreateModal}>
              <span className="mr-2">+</span> Create New Database
            </Button>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-5 overflow-y-auto pb-4 pt-3 pointer-events-auto">
          {navGroups.map((group) => (
            <div key={group.name} className="space-y-1">
              <h4 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{group.name}</h4>
              {group.items.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setUI({ activePage: item.id })}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                      {item.icon}
                    </div>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === 'history' && history.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{history.length}</span>
                    )}
                    {item.id === 'compare' && staleCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold">{staleCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border/40 space-y-3 bg-muted/20">
          {/* Theme Toggle Controls */}
          <div className="flex gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
            <button
              onClick={() => setUI({ theme: 'light' })}
              title="Switch to Light Theme"
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                ui.theme === 'light'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>☀</span> Light
            </button>
            <button
              onClick={() => setUI({ theme: 'dark' })}
              title="Switch to Dark Theme"
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                ui.theme === 'dark'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>🌙</span> Dark
            </button>
          </div>

          <button 
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-ai'))}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-card border border-border hover:bg-muted text-primary text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
            Lab Assistant
          </button>
        </div>
      </div>

      {/* Create Database Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
          <div className="p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl border border-border bg-card text-card-foreground pointer-events-auto">
            <h3 className="text-lg font-bold">Create New Database</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                <Input
                  value={newDbName}
                  onChange={e => setNewDbName(e.target.value)}
                  placeholder="My Database"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description (optional)</label>
                <Input
                  value={newDbDescription}
                  onChange={e => setNewDbDescription(e.target.value)}
                  placeholder="Description of this database"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <Button onClick={handleCreateDatabase} disabled={!newDbName.trim()}>
                Create Database
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
