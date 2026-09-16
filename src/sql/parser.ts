import { ParsedSQL } from '../types';

const VIEW_REGEX = /^\s*CREATE\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\w]+)\s+AS\s+/i;
const DROP_VIEW_REGEX = /^\s*DROP\s+VIEW\s+(?:IF\s+EXISTS\s+)?([`"\w]+)/i;
const MATERIALIZED_VIEW_REGEX = /^\s*CREATE\s+MATERIALIZED\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\w]+)\s+AS\s+/i;
const DROP_MATERIALIZED_VIEW_REGEX = /^\s*DROP\s+MATERIALIZED\s+VIEW\s+(?:IF\s+EXISTS\s+)?([`"\w]+)/i;
const REFRESH_MATERIALIZED_VIEW_REGEX = /^\s*REFRESH\s+MATERIALIZED\s+VIEW\s+([`"\w]+)/i;

function extractDefinition(sql: string, keyword: string): string | undefined {
  const regex = new RegExp(`\\b${keyword}\\s+(.+)$`, 'is');
  const match = sql.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * A robust tokenizer-based dependency extractor.
 * Skips strings and comments, then parses FROM/JOIN clauses
 * including comma-separated tables.
 */
function extractTableNames(sql: string): string[] {
  const tables: Set<string> = new Set();
  
  let inString = false;
  let stringChar = '';
  let inBlockComment = false;
  let inLineComment = false;
  let cleanSql = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    
    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }
    
    if (inString) {
      if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    
    if (char === '-' && nextChar === '-') {
      inLineComment = true;
      i++;
      continue;
    }
    
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    
    if (char === "'" || char === '"' || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }
    
    cleanSql += char;
  }
  
  const tokens = cleanSql
    .replace(/[\(\),;]/g, ' $& ')
    .split(/\s+/)
    .filter(t => t.length > 0);
    
  let inFromClause = false;
  let expectTable = false;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upper = token.toUpperCase();
    
    if (upper === 'FROM' || upper === 'JOIN') {
      inFromClause = true;
      expectTable = true;
      continue;
    }
    
    if (upper === 'WHERE' || upper === 'GROUP' || upper === 'ORDER' || 
        upper === 'HAVING' || upper === 'LIMIT' || upper === 'ON' || 
        upper === 'USING' || upper === 'SELECT' || upper === 'SET') {
      inFromClause = false;
      expectTable = false;
      continue;
    }
    
    if (inFromClause) {
      if (token === ',') {
        expectTable = true;
      } else if (token === '(' || token === ')') {
        expectTable = false;
      } else if (upper === 'AS') {
        expectTable = false;
      } else if (expectTable && !['INNER', 'LEFT', 'RIGHT', 'OUTER', 'CROSS', 'NATURAL'].includes(upper)) {
        tables.add(token.replace(/[`"]/g, ''));
        expectTable = false;
      }
    } else if (upper === 'INTO' || upper === 'UPDATE') {
       // Handle INSERT INTO table, UPDATE table
       if (tokens[i+1]) {
         tables.add(tokens[i+1].replace(/[`"]/g, ''));
       }
    }
  }
  
  return Array.from(tables);
}

export function parseSQL(sql: string): ParsedSQL {
  const trimmed = sql.trim();

  if (VIEW_REGEX.test(trimmed)) {
    const match = trimmed.match(VIEW_REGEX);
    return {
      type: 'CREATE_VIEW',
      viewName: match?.[1].replace(/[`"]/g, ''),
      definition: extractDefinition(trimmed, 'AS'),
      originalSQL: sql,
    };
  }

  if (DROP_VIEW_REGEX.test(trimmed)) {
    const match = trimmed.match(DROP_VIEW_REGEX);
    return {
      type: 'DROP_VIEW',
      viewName: match?.[1].replace(/[`"]/g, ''),
      originalSQL: sql,
    };
  }

  if (MATERIALIZED_VIEW_REGEX.test(trimmed)) {
    const match = trimmed.match(MATERIALIZED_VIEW_REGEX);
    return {
      type: 'CREATE_MATERIALIZED_VIEW',
      materializedViewName: match?.[1].replace(/[`"]/g, ''),
      definition: extractDefinition(trimmed, 'AS'),
      originalSQL: sql,
    };
  }

  if (DROP_MATERIALIZED_VIEW_REGEX.test(trimmed)) {
    const match = trimmed.match(DROP_MATERIALIZED_VIEW_REGEX);
    return {
      type: 'DROP_MATERIALIZED_VIEW',
      materializedViewName: match?.[1].replace(/[`"]/g, ''),
      originalSQL: sql,
    };
  }

  if (REFRESH_MATERIALIZED_VIEW_REGEX.test(trimmed)) {
    const match = trimmed.match(REFRESH_MATERIALIZED_VIEW_REGEX);
    return {
      type: 'REFRESH_MATERIALIZED_VIEW',
      materializedViewName: match?.[1].replace(/[`"]/g, ''),
      originalSQL: sql,
    };
  }

  const upper = trimmed.toUpperCase();
  if (upper.startsWith('SELECT')) return { type: 'SELECT', originalSQL: sql };
  if (upper.startsWith('INSERT')) return { type: 'INSERT', originalSQL: sql, tableName: extractTableNames(trimmed)[0] };
  if (upper.startsWith('UPDATE')) return { type: 'UPDATE', originalSQL: sql, tableName: extractTableNames(trimmed)[0] };
  if (upper.startsWith('DELETE')) return { type: 'DELETE', originalSQL: sql, tableName: extractTableNames(trimmed)[0] };

  return { type: 'OTHER', originalSQL: sql };
}

export function extractDependencies(definition: string, existingViews: Map<string, any>, existingMVs: Map<string, any>): string[] {
  const tables = extractTableNames(definition);
  const dependencies = new Set<string>();

  for (const table of tables) {
    dependencies.add(table);

    if (existingViews.has(table)) {
      const viewDeps = extractDependencies(existingViews.get(table).definition, existingViews, existingMVs);
      viewDeps.forEach(d => dependencies.add(d));
    }

    if (existingMVs.has(table)) {
      const mvDeps = extractDependencies(existingMVs.get(table).definition, existingViews, existingMVs);
      mvDeps.forEach(d => dependencies.add(d));
    }
  }

  return Array.from(dependencies);
}
