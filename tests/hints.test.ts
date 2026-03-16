import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { injectOrUpdateMemberHints } from '../src/generator';

const TEST_FILE = path.join(process.cwd(), 'temp-hint-test.ts');
const SPEC_FILE = path.join(process.cwd(), '.arch-spec.json');

function setup() {
  // Mock .arch-spec.json with ai_hints: true
  fs.writeFileSync(SPEC_FILE, JSON.stringify({ ai_hints: true }));
  
  const content = `
export function add(a: number, b: number): number {
  return a + b;
}

export async function fetchData(url: string, options?: any): Promise<void> {
  // logic
}
  `.trim();
  fs.writeFileSync(TEST_FILE, content);
}

function cleanup() {
  if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  if (fs.existsSync(SPEC_FILE)) fs.unlinkSync(SPEC_FILE);
}

async function testHints() {
  console.log('Testing AI Signature Hints...');
  
  setup();
  
  // Run hint injection
  injectOrUpdateMemberHints(TEST_FILE, process.cwd());
  
  const updated = fs.readFileSync(TEST_FILE, 'utf-8');
  console.log('Updated Content:\n', updated);

  // Check if JSDoc is injected
  assert.ok(updated.includes('@ai-hint'), 'Should include @ai-hint tag');
  assert.ok(updated.includes('@param {a: number, b: number}'), 'Should extract params for add');
  assert.ok(updated.includes('@returns {number}'), 'Should extract return type for add');
  assert.ok(updated.includes('@param {url: string, options?: any}'), 'Should handle async and optional params');
  assert.ok(updated.includes('@returns {Promise<void>}'), 'Should handle Promise return type');

  console.log('✅ AI Hints tests passed');
}

testHints().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  cleanup();
});
