'use strict';
/**
 * Minimal parser for MS SQL Server "Generate Scripts" dumps.
 *
 * Not a general SQL parser — it only understands the exact shape SSMS emits:
 * one `INSERT [dbo].[Table] ([col1], [col2], ...) VALUES (v1, v2, ...)` per line,
 * with `N'...'` / `'...'` string literals (SQL-escaped `''` for a literal quote),
 * `NULL`, plain numeric literals, and `CAST(x AS Type(...))` wrapping a literal.
 */

const fs = require('fs');

/**
 * Reads a SQL Server dump and returns UTF-8 text.
 * SSMS "Generate Scripts" output is UTF-16LE with a BOM; Node's 'utf16le'
 * decoder handles the encoding, we just strip the leading BOM character.
 */
function readSqlDumpAsUtf8(filePath) {
  const buf = fs.readFileSync(filePath);
  const isUtf16le = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
  const text = isUtf16le ? buf.toString('utf16le') : buf.toString('utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Splits a `VALUES (...)` inner string into raw top-level tokens, respecting
 * parenthesis depth and SQL-quoted strings (so commas inside CAST(...) or
 * inside N'a, b' are not treated as separators).
 */
function tokenizeValuesInner(inner) {
  const tokens = [];
  let cur = '';
  let depth = 0;
  let inQuote = false;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];

    if (inQuote) {
      if (ch === "'") {
        if (inner[i + 1] === "'") {
          cur += "''";
          i++;
          continue;
        }
        inQuote = false;
      }
      cur += ch;
      continue;
    }

    if (ch === "'") {
      inQuote = true;
      cur += ch;
      continue;
    }
    if (ch === '(') {
      depth++;
      cur += ch;
      continue;
    }
    if (ch === ')') {
      depth--;
      cur += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      tokens.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim().length) tokens.push(cur.trim());
  return tokens;
}

/** Parses a single raw token into a JS value: null | number | string. */
function parseToken(token) {
  const t = token.trim();
  if (t.toUpperCase() === 'NULL') return null;

  if (t.startsWith("N'") || t.startsWith("'")) {
    const start = t.startsWith("N'") ? 2 : 1;
    const body = t.slice(start, t.length - 1); // strip outer quotes
    return body.replace(/''/g, "'");
  }

  if (/^CAST\s*\(/i.test(t)) {
    const nullMatch = t.match(/^CAST\s*\(\s*NULL\s+AS/i);
    if (nullMatch) return null;
    const numMatch = t.match(/^CAST\s*\(\s*(-?[\d.]+)\s+AS/i);
    if (numMatch) return Number(numMatch[1]);
    return null; // unexpected CAST shape — treat as null rather than crash
  }

  const n = Number(t);
  return Number.isNaN(n) ? t : n;
}

/**
 * Scans `text` starting at `openIdx` (the index of the character right
 * after an opening `(` — i.e. depth already 1) and returns the index of the
 * matching closing `)`, respecting nested parens and SQL-quoted strings
 * (`''` escape). Needed because instruction/step text can contain raw
 * embedded newlines inside `N'...'` literals, so this cannot be done
 * line-by-line.
 */
function findMatchingParenEnd(text, openIdx) {
  let depth = 1;
  let inQuote = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === "'") {
        if (text[i + 1] === "'") { i++; continue; }
        inQuote = false;
      }
      continue;
    }
    if (ch === "'") { inQuote = true; continue; }
    if (ch === '(') { depth++; continue; }
    if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('[sql-parser] Unterminated parenthesis while scanning VALUES');
}

/**
 * Extracts every `INSERT [dbo].[tableName] (...) VALUES (...)` row for the
 * given table from the dump text. Returns an array of { columns, values }
 * where `columns` are lowercase-preserved-case column names in file order
 * and `values` are parsed JS values in the same order.
 *
 * Scans the raw text (not line-by-line) so multi-line string literals
 * (e.g. a recipe step with an embedded newline) are handled correctly.
 */
function extractInserts(text, tableName) {
  const prefix = `INSERT [dbo].[${tableName}] (`;
  const rows = [];
  let searchIdx = 0;

  for (;;) {
    const startIdx = text.indexOf(prefix, searchIdx);
    if (startIdx === -1) break;

    const colsStart = startIdx + prefix.length;
    const colsEnd = text.indexOf(')', colsStart); // column list has no nested parens/quotes
    const columnsStr = text.slice(colsStart, colsEnd);

    const valuesMarker = ' VALUES (';
    const markerIdx = colsEnd + 1;
    if (text.slice(markerIdx, markerIdx + valuesMarker.length) !== valuesMarker) {
      throw new Error(`[sql-parser] Expected ' VALUES (' after column list in ${tableName} at offset ${markerIdx}`);
    }
    const valuesStart = markerIdx + valuesMarker.length;
    const valuesEnd = findMatchingParenEnd(text, valuesStart);
    const valuesStr = text.slice(valuesStart, valuesEnd);

    const columns = columnsStr.split(',').map(c => c.trim().replace(/^\[|\]$/g, ''));
    const rawValues = tokenizeValuesInner(valuesStr);
    const values = rawValues.map(parseToken);

    if (columns.length !== values.length) {
      throw new Error(
        `[sql-parser] Column/value count mismatch in ${tableName}: ` +
        `${columns.length} columns vs ${values.length} values\n` +
        `Columns: ${columnsStr}\nValues: ${valuesStr}`
      );
    }

    const row = {};
    columns.forEach((col, i) => { row[col] = values[i]; });
    rows.push(row);

    searchIdx = valuesEnd + 1;
  }

  return rows;
}

module.exports = { readSqlDumpAsUtf8, extractInserts, tokenizeValuesInner, parseToken };
