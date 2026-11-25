import fs from 'node:fs';
import path from 'node:path';

const dataPath = path.resolve(process.cwd(), 'src/data/mandalaData.ts');
const content = fs.readFileSync(dataPath, 'utf8');

const orderMatch = content.match(/export const RAVE_MANDALA_ORDER: number\[\] = \[([\s\S]*?)\];/);
if (!orderMatch) {
  console.error('FAIL: RAVE_MANDALA_ORDER not found');
  process.exit(1);
}

const gates = orderMatch[1]
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number);

const unique = new Set(gates);
if (gates.length !== 64 || unique.size !== 64) {
  console.error(`FAIL: Expected 64 unique gates, got length=${gates.length}, unique=${unique.size}`);
  process.exit(1);
}

for (let i = 1; i <= 64; i++) {
  if (!unique.has(i)) {
    console.error(`FAIL: Missing gate ${i} in RAVE_MANDALA_ORDER`);
    process.exit(1);
  }
  const metaRegex = new RegExp(`\\b${i}:\\s*\\[`);
  if (!metaRegex.test(content)) {
    console.error(`FAIL: Missing metadata for gate ${i}`);
    process.exit(1);
  }
}

console.log('PASS: All 64 Rave Mandala gates and metadata verified.');
