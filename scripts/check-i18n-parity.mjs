#!/usr/bin/env node
// Verifies that i18n/index.ts defines the same translation keys for `en` and `th`.
//
// The file is parsed statically with the TypeScript compiler API (already a
// devDependency), so no i18next / expo-localization import is needed and the
// check runs in plain Node — in CI and locally:
//
//   node scripts/check-i18n-parity.mjs            # checks ./i18n/index.ts
//   node scripts/check-i18n-parity.mjs <file.ts>  # checks another file
//
// Nested objects become dotted keys (i18next default keySeparator "."). Exit
// codes: 0 = parity, 1 = missing/duplicate keys or an unsupported construct
// (spread / computed key) that cannot be checked statically, 2 = file/shape
// not recognised. Both apps carry an identical copy of this script.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const LANGS = ['en', 'th'];
const file = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'i18n', 'index.ts');
const relCandidate = path.relative(process.cwd(), file);
const rel = relCandidate && !relCandidate.startsWith('..') ? relCandidate : file;

const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

function where(node) {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${rel}:${line + 1}`;
}

function findResources(node) {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === 'resources' &&
    node.initializer &&
    ts.isObjectLiteralExpression(node.initializer)
  ) {
    return node.initializer;
  }
  return ts.forEachChild(node, findResources);
}

function propName(prop) {
  const n = prop.name;
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
    return n.text;
  }
  return null; // computed property name
}

function getProp(obj, name) {
  return obj.properties.find((p) => ts.isPropertyAssignment(p) && propName(p) === name);
}

const problems = [];

function collect(obj, prefix, out) {
  for (const p of obj.properties) {
    if (ts.isSpreadAssignment(p)) {
      problems.push(`${where(p)}: spread "..." inside translations cannot be checked statically`);
      continue;
    }
    if (!ts.isPropertyAssignment(p)) {
      problems.push(`${where(p)}: unsupported property form (${ts.SyntaxKind[p.kind]})`);
      continue;
    }
    const name = propName(p);
    if (name === null) {
      problems.push(`${where(p)}: computed key cannot be checked statically`);
      continue;
    }
    const key = prefix ? `${prefix}.${name}` : name;
    if (ts.isObjectLiteralExpression(p.initializer)) {
      collect(p.initializer, key, out);
    } else {
      if (out.has(key)) problems.push(`${where(p)}: duplicate key "${key}" (first at ${out.get(key)})`);
      out.set(key, where(p));
    }
  }
}

const resources = findResources(source);
if (!resources) {
  console.error(`check-i18n-parity: no "const resources = { ... }" object literal found in ${rel}`);
  process.exit(2);
}

const keys = {};
for (const lang of LANGS) {
  const langProp = getProp(resources, lang);
  const trans =
    langProp && ts.isObjectLiteralExpression(langProp.initializer)
      ? getProp(langProp.initializer, 'translation')
      : undefined;
  if (!trans || !ts.isObjectLiteralExpression(trans.initializer)) {
    console.error(`check-i18n-parity: resources.${lang}.translation object literal not found in ${rel}`);
    process.exit(2);
  }
  keys[lang] = new Map();
  collect(trans.initializer, '', keys[lang]);
}

let failed = problems.length > 0;
for (const a of LANGS) {
  for (const b of LANGS) {
    if (a === b) continue;
    const missing = [...keys[a].keys()].filter((k) => !keys[b].has(k));
    if (missing.length === 0) continue;
    failed = true;
    console.error(`\n${missing.length} key(s) defined in "${a}" but missing in "${b}":`);
    for (const k of missing) console.error(`  ${keys[a].get(k)}  ${k}`);
  }
}
if (problems.length) {
  console.error('');
  for (const p of problems) console.error(p);
}

const summary = LANGS.map((l) => `${l}=${keys[l].size}`).join(', ');
console.log(`i18n keys in ${rel}: ${summary} -> ${failed ? 'FAIL' : 'OK (th/en parity)'}`);
process.exit(failed ? 1 : 0);
