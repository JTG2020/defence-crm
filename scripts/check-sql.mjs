import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// @pgsql/parser is CommonJS; load it through require to avoid its ESM directory-import bug.
const require = createRequire(import.meta.url);
const { v17 } = require("@pgsql/parser");

const migrationDir = "supabase/migrations";
const files = readdirSync(migrationDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => join(migrationDir, f));

let failed = 0;

// 1. Syntax: every file must parse against the real Postgres grammar.
for (const file of [...files, "supabase/apply_all.sql", "supabase/reset.sql"]) {
  const sql = readFileSync(file, "utf8");
  try {
    const result = await v17.parse(sql);
    console.log(`OK   ${file} (${(result.stmts ?? []).length} statements)`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${file}: ${String(error.message).split("\n")[0]}`);
  }
}

// 2. Semantics: an ALTER ... ADD COLUMN must not add a column the CREATE TABLE already made.
//    This is the class of bug that failed the first live apply (orders.is_demo, ERROR 42701).
const created = new Map();
const added = [];

function scanCreate(sql) {
  const re = /create table(?: if not exists)?\s+public\.(\w+)\s*\(/gi;
  let match;
  while ((match = re.exec(sql))) {
    const table = match[1];
    let depth = 1;
    let i = re.lastIndex;
    const start = i;
    while (i < sql.length && depth > 0) {
      if (sql[i] === "(") depth += 1;
      else if (sql[i] === ")") depth -= 1;
      i += 1;
    }
    const body = sql.slice(start, i - 1);
    let d = 0;
    let buffer = "";
    const parts = [];
    for (const ch of body) {
      if (ch === "(") d += 1;
      else if (ch === ")") d -= 1;
      if (ch === "," && d === 0) {
        parts.push(buffer);
        buffer = "";
      } else buffer += ch;
    }
    parts.push(buffer);
    const cols = new Set();
    for (const raw of parts) {
      const line = raw.replace(/^--.*$/gm, "").trim();
      if (!line) continue;
      const name = line.split(/\s+/)[0].replace(/"/g, "").toLowerCase();
      if (["constraint", "primary", "unique", "check", "foreign", "exclude", "like"].includes(name)) {
        continue;
      }
      if (cols.has(name)) console.error(`FAIL duplicate column in CREATE: ${table}.${name}`);
      cols.add(name);
    }
    created.set(table, cols);
  }
}

function scanAlter(sql, file) {
  const re = /alter table public\.(\w+)([\s\S]*?);/gi;
  let match;
  while ((match = re.exec(sql))) {
    const table = match[1];
    const addRe = /add column\s+"?(\w+)"?/gi;
    let a;
    while ((a = addRe.exec(match[2]))) added.push({ table, col: a[1], file });
  }
}

for (const file of files) {
  const sql = readFileSync(file, "utf8");
  scanCreate(sql);
  scanAlter(sql, file);
}

for (const { table, col, file } of added) {
  if (created.get(table)?.has(col.toLowerCase())) {
    failed += 1;
    console.error(`FAIL ${file}: ${table}.${col} is added by ALTER but already created by CREATE TABLE`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} problem(s) found.`);
  process.exit(1);
}
console.log("\nAll SQL parsed cleanly, no duplicate columns.");
