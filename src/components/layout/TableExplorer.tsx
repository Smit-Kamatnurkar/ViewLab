import { useState } from 'react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { TableInfo, ForeignKeyInfo } from '../../types';
import { TablePreview } from './TablePreview';

interface TableExplorerProps {
  tables: TableInfo[];
  foreignKeys: ForeignKeyInfo[];
}

export function TableExplorer({ tables, foreignKeys }: TableExplorerProps) {
  const { db, setUI } = useStore(useShallow(state => ({ db: state.db, setUI: state.setUI })));
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);

  const handleTableClick = (tableName: string) => {
    setSelectedTable(tableName);
    if (db) {
      const result = db.exec(`SELECT * FROM ${tableName} LIMIT 50;`);
      if (result.length > 0) {
        setPreviewData({ columns: result[0].columns, rows: result[0].values });
      }
    }
    setUI({ activePanel: 'result' });
  };

  return (
    <div className="space-y-2">
      {tables.map((table) => (
        <TableCard
          key={table.name}
          table={table}
          selected={selectedTable === table.name}
          onClick={() => handleTableClick(table.name)}
          foreignKeys={foreignKeys.filter((fk) => fk.fromTable === table.name)}
        />
      ))}
      {selectedTable && previewData && (
        <TablePreview
          tableName={selectedTable}
          columns={previewData.columns}
          rows={previewData.rows}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  );
}

function TableCard({
  table,
  selected,
  onClick,
  foreignKeys,
}: {
  table: TableInfo;
  selected: boolean;
  onClick: () => void;
  foreignKeys: ForeignKeyInfo[];
}) {
  return (
    <Card className={`p-2 transition-colors ${selected ? 'ring-1 ring-primary bg-accent' : ''}`}>
      <Button
        variant="ghost"
        className="w-full justify-between text-left px-2 py-1 text-sm"
        onClick={onClick}
      >
        <span className="font-mono font-medium">{table.name}</span>
        <Badge variant="default">{table.rowCount} rows</Badge>
      </Button>
      {selected && (
        <div className="mt-2 space-y-1 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">Columns</div>
          <div className="space-y-1">
            {table.columns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-muted/50"
              >
                <span className="font-mono text-foreground">{col.name}</span>
                <span className="text-muted-foreground">{col.type}</span>
                {col.primaryKey && <Badge variant="live" className="text-[10px]">PK</Badge>}
                {col.foreignKey && <Badge variant="default" className="text-[10px]">FK</Badge>}
                {col.notNull && !col.primaryKey && <Badge variant="default" className="text-[10px]">NN</Badge>}
              </div>
            ))}
          </div>
          {foreignKeys.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">Foreign Keys</div>
              <div className="space-y-1">
                {foreignKeys.map((fk) => (
                  <div key={fk.fromColumn} className="text-xs text-muted-foreground font-mono">
                    {fk.fromColumn} → {fk.toTable}.{fk.toColumn}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}