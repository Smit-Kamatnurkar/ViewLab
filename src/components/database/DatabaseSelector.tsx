import { useState } from 'react';
import { useStore } from '../../store';
import { BUILTIN_DATABASES } from '../../database/dbRegistry';
import { CreateCustomDbModal } from './CreateCustomDbModal';

export function DatabaseSelector() {
  const currentDbId = useStore((state) => state.currentDbId);
  const customDatabases = useStore((state) => state.customDatabases);
  const switchDatabase = useStore((state) => state.switchDatabase);
  const initializing = useStore((state) => state.initializing);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Combine builtin & custom databases
  const allDbOptions = [
    ...BUILTIN_DATABASES,
    ...Object.values(customDatabases).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || 'User-defined custom database',
      isBuiltIn: false,
      icon: '💾',
    })),
  ];

  const activeDb = allDbOptions.find((d) => d.id === currentDbId) || allDbOptions[0];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 px-4 bg-card/60 backdrop-blur-md border-b border-border/40 text-xs text-foreground">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-semibold">Active Database:</span>

          {/* Database Selector Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={currentDbId}
              disabled={initializing}
              onChange={(e) => switchDatabase(e.target.value)}
              className="bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50 transition-all shadow-sm"
            >
              {allDbOptions.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.icon} {db.name} {!db.isBuiltIn ? '(Custom)' : ''}
                </option>
              ))}
            </select>
          </div>

          {initializing && (
            <span className="text-[11px] text-primary animate-pulse font-medium">
              Loading database schema...
            </span>
          )}
        </div>

        {/* Database Quick Metadata & Custom DB Trigger */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-muted-foreground text-[11px] max-w-md truncate">
            {activeDb?.description}
          </span>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-bold transition-all text-xs shrink-0 shadow-sm"
          >
            <span>+</span>
            <span>New Database</span>
          </button>
        </div>
      </div>

      {/* Custom Database Creation Wizard Modal */}
      <CreateCustomDbModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
