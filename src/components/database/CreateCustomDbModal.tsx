import { useState } from 'react';
import { useStore } from '../../store';
import { CustomColumnDef, CustomDbDefinition, CustomTableDef } from '../../database/dbRegistry';
import { Button } from '../Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCustomDbModal({ isOpen, onClose }: Props) {
  const addCustomDatabase = useStore((state) => state.addCustomDatabase);

  const [step, setStep] = useState<number>(1);
  const [dbName, setDbName] = useState<string>('');
  const [dbDescription, setDbDescription] = useState<string>('');
  const [tables, setTables] = useState<CustomTableDef[]>([
    {
      name: 'STUDENT',
      columns: [
        { name: 'student_id', type: 'INTEGER', primaryKey: true, notNull: true, unique: true },
        { name: 'student_name', type: 'TEXT', primaryKey: false, notNull: true, unique: false },
        { name: 'gpa', type: 'REAL', primaryKey: false, notNull: false, unique: false },
      ],
      sampleData: [
        { student_id: 1, student_name: 'Alice Johnson', gpa: 3.8 },
        { student_id: 2, student_name: 'Bob Smith', gpa: 3.5 },
      ],
    },
  ]);

  const [viewSql, setViewSql] = useState<string>(
    'CREATE VIEW honor_roll AS SELECT student_name, gpa FROM STUDENT WHERE gpa >= 3.6;'
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  // Add new table
  const handleAddTable = () => {
    const newTableName = `TABLE_${tables.length + 1}`;
    setTables((prev) => [
      ...prev,
      {
        name: newTableName,
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true, notNull: true, unique: true },
          { name: 'name', type: 'TEXT', primaryKey: false, notNull: true, unique: false },
        ],
        sampleData: [{ id: 1, name: 'Sample Entry' }],
      },
    ]);
  };

  const handleRemoveTable = (index: number) => {
    if (tables.length === 1) {
      setError('A database must contain at least one table.');
      return;
    }
    setTables((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleTableNameChange = (index: number, name: string) => {
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
    setTables((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: sanitized };
      return next;
    });
  };

  // Add column to table
  const handleAddColumn = (tableIndex: number) => {
    setTables((prev) => {
      const next = [...prev];
      const targetTbl = next[tableIndex];
      const newColName = `col_${targetTbl.columns.length + 1}`;
      targetTbl.columns.push({
        name: newColName,
        type: 'TEXT',
        primaryKey: false,
        notNull: false,
        unique: false,
      });
      return next;
    });
  };

  const handleRemoveColumn = (tableIndex: number, colIndex: number) => {
    setTables((prev) => {
      const next = [...prev];
      const targetTbl = next[tableIndex];
      if (targetTbl.columns.length === 1) return prev;
      targetTbl.columns = targetTbl.columns.filter((_, idx) => idx !== colIndex);
      return next;
    });
  };

  const handleColumnChange = (
    tableIndex: number,
    colIndex: number,
    field: keyof CustomColumnDef,
    value: any
  ) => {
    setTables((prev) => {
      const next = [...prev];
      const targetTbl = next[tableIndex];
      targetTbl.columns[colIndex] = {
        ...targetTbl.columns[colIndex],
        [field]: value,
      };
      return next;
    });
  };

  // Handle sample data edits
  const handleAddRow = (tableIndex: number) => {
    setTables((prev) => {
      const next = [...prev];
      const targetTbl = next[tableIndex];
      const newRow: Record<string, any> = {};
      targetTbl.columns.forEach((col) => {
        if (col.primaryKey) newRow[col.name] = (targetTbl.sampleData.length + 1);
        else if (col.type === 'INTEGER' || col.type === 'REAL') newRow[col.name] = 0;
        else newRow[col.name] = 'Sample Value';
      });
      targetTbl.sampleData.push(newRow);
      return next;
    });
  };

  const handleCellChange = (tableIndex: number, rowIndex: number, colName: string, val: string) => {
    setTables((prev) => {
      const next = [...prev];
      const targetTbl = next[tableIndex];
      const colDef = targetTbl.columns.find((c) => c.name === colName);

      let parsedVal: any = val;
      if (colDef?.type === 'INTEGER') parsedVal = parseInt(val) || 0;
      else if (colDef?.type === 'REAL') parsedVal = parseFloat(val) || 0;

      targetTbl.sampleData[rowIndex] = {
        ...targetTbl.sampleData[rowIndex],
        [colName]: parsedVal,
      };
      return next;
    });
  };

  const handleSaveDatabase = async () => {
    if (!dbName.trim()) {
      setError('Please provide a name for your custom database.');
      setStep(1);
      return;
    }

    setIsSaving(true);
    setError(null);

    const customDbId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const customDef: CustomDbDefinition = {
      id: customDbId,
      name: dbName.trim(),
      description: dbDescription.trim() || 'User-defined custom SQLite database.',
      tables,
      views: viewSql.trim()
        ? [
            {
              name: 'custom_view_1',
              sql: viewSql.trim(),
            },
          ]
        : [],
      createdAt: Date.now(),
    };

    try {
      await addCustomDatabase(customDef);
      onClose();
    } catch (err) {
      console.error('Failed to create custom database:', err);
      setError('Failed to initialize custom database. Check syntax and constraints.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <span>Database Architect</span>
              <span>•</span>
              <span>Step {step} of 4</span>
            </div>
            <h2 className="text-xl font-extrabold text-foreground mt-1">Create Custom Database Workspace</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body / Step Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: DATABASE DETAILS */}
          {step === 1 && (
            <div className="space-y-4 max-w-xl mx-auto py-4">
              <h3 className="text-base font-bold text-foreground">Step 1: Database Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    Database Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. University Library System"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full bg-background border border-border/70 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the purpose of this database and its schema..."
                    value={dbDescription}
                    onChange={(e) => setDbDescription(e.target.value)}
                    className="w-full bg-background border border-border/70 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TABLE & COLUMN SCHEMA */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Step 2: Table & Column Architect</h3>
                  <p className="text-xs text-muted-foreground">Define tables, column data types, primary keys, and foreign keys.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddTable} className="text-xs font-bold">
                  + Add Table
                </Button>
              </div>

              <div className="space-y-6">
                {tables.map((table, tIdx) => (
                  <div key={tIdx} className="neo-surface p-5 rounded-2xl border border-border/60 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-primary">Table {tIdx + 1}:</span>
                        <input
                          type="text"
                          value={table.name}
                          onChange={(e) => handleTableNameChange(tIdx, e.target.value)}
                          className="bg-card border border-border/60 rounded-lg px-3 py-1 text-sm font-bold text-foreground focus:border-primary uppercase tracking-wider"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveTable(tIdx)}
                        className="text-xs text-rose-500 font-semibold hover:underline"
                      >
                        Remove Table
                      </button>
                    </div>

                    {/* Columns List */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/50 text-muted-foreground font-bold">
                            <th className="py-2 px-2">Column Name</th>
                            <th className="py-2 px-2">Data Type</th>
                            <th className="py-2 px-2 text-center">Primary Key</th>
                            <th className="py-2 px-2 text-center">Not Null</th>
                            <th className="py-2 px-2 text-center">Unique</th>
                            <th className="py-2 px-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {table.columns.map((col, cIdx) => (
                            <tr key={cIdx}>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={col.name}
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'name', e.target.value)}
                                  className="bg-background border border-border/50 rounded-md px-2 py-1 text-xs text-foreground font-mono"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <select
                                  value={col.type}
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'type', e.target.value)}
                                  className="bg-background border border-border/50 rounded-md px-2 py-1 text-xs text-foreground"
                                >
                                  <option value="INTEGER">INTEGER</option>
                                  <option value="TEXT">TEXT</option>
                                  <option value="REAL">REAL</option>
                                  <option value="DATE">DATE</option>
                                </select>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={col.primaryKey}
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'primaryKey', e.target.checked)}
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={col.notNull}
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'notNull', e.target.checked)}
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={col.unique}
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'unique', e.target.checked)}
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  onClick={() => handleRemoveColumn(tIdx, cIdx)}
                                  className="text-muted-foreground hover:text-rose-500 font-bold"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => handleAddColumn(tIdx)} className="text-xs font-semibold">
                      + Add Column
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: SAMPLE DATA */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Step 3: Sample Data Records</h3>
                <p className="text-xs text-muted-foreground">Populate initial records into your custom database tables.</p>
              </div>

              {tables.map((tbl, tIdx) => (
                <div key={tIdx} className="neo-surface p-5 rounded-2xl border border-border/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider">{tbl.name} Records</h4>
                    <Button variant="outline" size="sm" onClick={() => handleAddRow(tIdx)} className="text-xs">
                      + Add Row
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground font-bold">
                          {tbl.columns.map((c) => (
                            <th key={c.name} className="py-2 px-3">
                              {c.name} ({c.type})
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {tbl.sampleData.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {tbl.columns.map((c) => (
                              <td key={c.name} className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row[c.name] ?? ''}
                                  onChange={(e) => handleCellChange(tIdx, rIdx, c.name, e.target.value)}
                                  className="bg-background border border-border/50 rounded px-2 py-1 text-xs font-mono text-foreground"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 4: CREATE VIEWS & SUMMARY */}
          {step === 4 && (
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div>
                <h3 className="text-base font-bold text-foreground">Step 4: Initial View Definition (Optional)</h3>
                <p className="text-xs text-muted-foreground">Define an initial `CREATE VIEW` statement to run when this custom database initializes.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  SQL View Definition:
                </label>
                <textarea
                  rows={4}
                  value={viewSql}
                  onChange={(e) => setViewSql(e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl p-3 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-4 neo-surface rounded-xl border border-border/50 text-xs space-y-1.5">
                <span className="font-bold text-primary block">Database Summary:</span>
                <div>
                  <strong>Database Name:</strong> {dbName || 'Untitled Custom Database'}
                </div>
                <div>
                  <strong>Tables:</strong> {tables.map((t) => t.name).join(', ')}
                </div>
                <div>
                  <strong>Total Records:</strong>{' '}
                  {tables.reduce((sum, t) => sum + t.sampleData.length, 0)} Rows
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep((prev) => prev - 1)}
            className="text-xs font-bold"
          >
            ← Back
          </Button>

          <div className="flex items-center gap-3">
            {step < 4 ? (
              <Button
                variant="primary"
                onClick={() => {
                  if (step === 1 && !dbName.trim()) {
                    setError('Please specify a database name before proceeding.');
                    return;
                  }
                  setError(null);
                  setStep((prev) => prev + 1);
                }}
                className="text-xs font-bold px-6"
              >
                Next →
              </Button>
            ) : (
              <Button
                variant="primary"
                loading={isSaving}
                onClick={handleSaveDatabase}
                className="text-xs font-bold px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save & Launch Database ✓
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
