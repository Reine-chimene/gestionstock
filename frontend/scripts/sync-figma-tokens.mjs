/**
 * Synchronise les tokens Figma → CSS Tailwind
 *
 * Usage:
 *   FIGMA_TOKEN=xxx FIGMA_FILE_KEY=xxx node scripts/sync-figma-tokens.mjs
 *
 * FIGMA_FILE_KEY = la partie après /file/ dans l'URL Figma
 * Ex: https://www.figma.com/file/ABC123/Mon-Design → ABC123
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const token = process.env.FIGMA_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY;

if (!token || !fileKey) {
  console.error('Variables requises: FIGMA_TOKEN et FIGMA_FILE_KEY');
  console.error('Exemple: FIGMA_TOKEN=figd_xxx FIGMA_FILE_KEY=ABC123 node scripts/sync-figma-tokens.mjs');
  process.exit(1);
}

const headers = { 'X-Figma-Token': token };

async function figma(path) {
  const res = await fetch(`https://api.figma.com/v1${path}`, { headers });
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${await res.text()}`);
  return res.json();
}

function rgba(c) {
  if (!c) return null;
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const a = c.a ?? 1;
  return a < 1 ? `rgba(${r},${g},${b},${a.toFixed(2)})` : `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

async function main() {
  console.log('Recuperation du fichier Figma...');
  const file = await figma(`/files/${fileKey}`);
  const styles = file.styles || {};
  const styleIds = Object.keys(styles);

  let variables = {};
  try {
    const vars = await figma(`/files/${fileKey}/variables/local`);
    const collections = vars.meta?.variableCollections || {};
    const varMap = vars.meta?.variables || {};
    for (const v of Object.values(varMap)) {
      const col = collections[v.variableCollectionId];
      const mode = col?.modes?.[0]?.modeId;
      const val = v.valuesByMode?.[mode];
      if (val?.r !== undefined) {
        variables[v.name] = rgba(val);
      } else if (typeof val === 'number') {
        variables[v.name] = `${val}px`;
      }
    }
  } catch {
    console.warn('Variables Figma non disponibles, utilisation des styles...');
  }

  const styleDetails = styleIds.length ? await figma(`/files/${fileKey}/nodes?ids=${styleIds.join(',')}`) : {};

  const colors = {};
  for (const [id, meta] of Object.entries(styles)) {
    if (meta.styleType !== 'FILL') continue;
    const node = styleDetails.nodes?.[id]?.document;
    const fill = node?.fills?.[0]?.color;
    if (fill) colors[meta.name] = rgba(fill);
  }

  const merged = { ...colors, ...variables };
  const tokensPath = join(__dir, '../src/styles/figma-tokens.json');
  writeFileSync(tokensPath, JSON.stringify({ source: file.name, syncedAt: new Date().toISOString(), tokens: merged }, null, 2));

  const cssLines = [
    '/* Auto-genere par sync-figma-tokens.mjs — ne pas editer a la main */',
    '@theme {',
  ];

  const mapping = {
    'Primary/900': '--color-cro-teal-dark',
    'Primary/700': '--color-cro-teal',
    'Primary/500': '--color-cro-teal-light',
    'Accent/Gold': '--color-cro-gold',
    'Accent/Gold-Light': '--color-cro-gold-light',
    'Surface/Cream': '--color-cro-cream',
    'Surface/Sand': '--color-cro-sand',
    'Text/Primary': '--color-cro-ink',
    'Text/Muted': '--color-cro-muted',
  };

  for (const [figmaName, cssVar] of Object.entries(mapping)) {
    const val = merged[figmaName];
    if (val) cssLines.push(`  ${cssVar}: ${val};`);
  }

  for (const [name, val] of Object.entries(merged)) {
    if (!Object.keys(mapping).includes(name) && (val.startsWith('#') || val.startsWith('rgba'))) {
      const safe = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      cssLines.push(`  --color-figma-${safe}: ${val};`);
    }
  }

  cssLines.push('}');
  const cssPath = join(__dir, '../src/styles/figma-tokens.css');
  writeFileSync(cssPath, cssLines.join('\n') + '\n');

  console.log(`✓ ${Object.keys(merged).length} tokens synchronises`);
  console.log(`✓ ${tokensPath}`);
  console.log(`✓ ${cssPath}`);
  console.log(`Fichier Figma: "${file.name}"`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
