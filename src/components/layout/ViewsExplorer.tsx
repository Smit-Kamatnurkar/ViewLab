import { Button } from '../Button';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { ViewInfo } from '../../types';
import { ViewDetail } from './ViewDetail';

interface ViewsExplorerProps {
  views: ViewInfo[];
}

export function ViewsExplorer({ views }: ViewsExplorerProps) {
  const { setUI, selectedView, setSelectedView } = useStore(useShallow(state => ({ setUI: state.setUI, selectedView: state.selectedView, setSelectedView: state.setSelectedView })));

  if (views.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No views created yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {views.map((view) => (
        <ViewCard
          key={view.name}
          view={view}
          selected={selectedView === view.name}
          onClick={() => {
            setSelectedView(view.name);
            setUI({ activePanel: 'editor' });
          }}
          onViewDetails={() => setSelectedView(view.name)}
        />
      ))}
      {selectedView && (
        <ViewDetail
          view={views.find((v) => v.name === selectedView)!}
          onClose={() => setSelectedView(null)}
        />
      )}
    </div>
  );
}

function ViewCard({
  view,
  selected,
  onClick,
  onViewDetails,
}: {
  view: ViewInfo;
  selected: boolean;
  onClick: () => void;
  onViewDetails: () => void;
}) {
  return (
    <Card className={`p-2 transition-colors ${selected ? 'ring-1 ring-primary bg-accent' : ''}`}>
      <div className="flex items-center gap-2">
        <Badge variant="live" className="flex-shrink-0">LIVE</Badge>
        <Button
          variant="ghost"
          className="flex-1 justify-start text-left px-2 py-1 text-sm font-mono"
          onClick={onClick}
        >
          {view.name}
        </Button>
        <Button variant="ghost" size="sm" onClick={onViewDetails}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </Button>
      </div>
      {selected && (
        <div className="mt-2 pt-2 border-t border-border space-y-1 text-xs">
          <div className="text-muted-foreground">Dependencies: {view.dependencies.join(', ') || 'none'}</div>
          <div className="font-mono text-[11px] text-muted-foreground max-w-full truncate">
            {view.definition}
          </div>
        </div>
      )}
    </Card>
  );
}