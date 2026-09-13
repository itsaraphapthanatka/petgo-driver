#!/usr/bin/env node
// Verifies two things about the app's translations:
//
//   1. i18n/index.ts defines the same translation keys for `en` and `th`;
//   2. every key the code asks for with t('...') actually exists in both languages.
//
// (2) exists because (1) alone reported 153/153 and 209/209 while 19 call sites used keys that were in
// neither language. i18next returns the key itself for a missing translation, so those screens printed
// "confirm_location" to the user - and `t('x') || 'fallback'` never fell back either, because the key it
// returns is a truthy string. Only a comparison between "keys used" and "keys defined" catches that.
//
// The file is parsed statically with the TypeScript compiler API (already a
// devDependency), so no i18next / expo-localization import is needed and the
// check runs in plain Node — in CI and locally:
//
//   node scripts/check-i18n-parity.mjs            # checks ./i18n/index.ts + this app's sources
//   node scripts/check-i18n-parity.mjs <file.ts>  # checks another file (sources = <file>/../..)
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
// ------------------------------------------------- keys the code actually asks for
// Sources live next to i18n/index.ts: <app>/i18n/index.ts -> <app>.
const APP = path.dirname(path.dirname(file));
const SOURCE_DIRS = ['app', 'components', 'hooks', 'services', 'store', 'stores', 'types', 'utils'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.expo', 'android', 'ios', 'dist', 'build', 'coverage']);

function sourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** `t('key')` / `i18n.t('key')` - the two forms the apps use. Anything else is reported as dynamic. */
function isTranslateCall(node) {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text === 't';
  return (
    ts.isPropertyAccessExpression(callee) &&
    callee.name.text === 't' &&
    ts.isIdentifier(callee.expression) &&
    (callee.expression.text === 'i18n' || callee.expression.text === 'i18next')
  );
}

const used = new Map(); // key -> ["app/x.tsx:12", ...]
const dynamic = [];

const scanned = SOURCE_DIRS.flatMap((dir) => sourceFiles(path.join(APP, dir), []));
for (const sourceFile of scanned) {
  const sf = ts.createSourceFile(sourceFile, fs.readFileSync(sourceFile, 'utf8'), ts.ScriptTarget.Latest, true);
  const at = (node) =>
    `${path.relative(APP, sourceFile)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.arguments.length && isTranslateCall(node)) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
        if (!used.has(arg.text)) used.set(arg.text, []);
        used.get(arg.text).push(at(node));
      } else {
        // e.g. t(doc.labelKey): the key is only known at runtime, so it is listed, not checked
        dynamic.push(at(node));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// A defaultValue (`t('k', 'English')`) does NOT excuse a missing key: it is a hard-coded string that can
// never be translated, which is exactly what the project rule forbids.
const undefinedKeys = [...used.keys()].filter((k) => LANGS.some((l) => !keys[l].has(k)));
if (undefinedKeys.length) {
  failed = true;
  console.error(`\n${undefinedKeys.length} key(s) used with t() but not defined in ${rel}:`);
  for (const k of undefinedKeys.sort()) {
    const missingIn = LANGS.filter((l) => !keys[l].has(k)).join('+');
    console.error(`  missing in ${missingIn}: t('${k}')  <- ${used.get(k).join(', ')}`);
  }
}

if (problems.length) {
  console.error('');
  for (const p of problems) console.error(p);
}

const summary = LANGS.map((l) => `${l}=${keys[l].size}`).join(', ');
const usage = `${used.size} static t() key(s) used in ${scanned.length} file(s)${dynamic.length ? `, ${dynamic.length} dynamic (not checked: ${dynamic.join(', ')})` : ''}`;
console.log(`i18n keys in ${rel}: ${summary}; ${usage} -> ${failed ? 'FAIL' : 'OK (th/en parity, no undefined keys)'}`);
process.exit(failed ? 1 : 0);
