import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { injectOrUpdateMemberHints } from '../src/generator';

const TEST_FILE = path.join(process.cwd(), 'temp-hint-test.ts');
const PY_TEST_FILE = path.join(process.cwd(), 'temp-hint-test.py');
const GO_TEST_FILE = path.join(process.cwd(), 'temp-hint-test.go');
const SPEC_FILE = path.join(process.cwd(), '.arch-spec.json');

function setup() {
  fs.writeFileSync(SPEC_FILE, JSON.stringify({ ai_hints: true }));
  
  // TS
  fs.writeFileSync(TEST_FILE, `export function add(a: number): number { return a; }`);
  // Python
  fs.writeFileSync(PY_TEST_FILE, `def process(data: str) -> bool:\n    return True`);
  // Go
  fs.writeFileSync(GO_TEST_FILE, `func Serve(port int) error {\n    return nil\n}`);
}

function cleanup() {
  [TEST_FILE, PY_TEST_FILE, GO_TEST_FILE, SPEC_FILE].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
}

async function testHints() {
  console.log('Testing Multi-Language AI Signature Hints...');
  setup();
  
  injectOrUpdateMemberHints(TEST_FILE, process.cwd());
  injectOrUpdateMemberHints(PY_TEST_FILE, process.cwd());
  injectOrUpdateMemberHints(GO_TEST_FILE, process.cwd());
  
  const tsContent = fs.readFileSync(TEST_FILE, 'utf-8');
  const pyContent = fs.readFileSync(PY_TEST_FILE, 'utf-8');
  const goContent = fs.readFileSync(GO_TEST_FILE, 'utf-8');

  console.log('Python Content:\n', pyContent);
  console.log('Go Content:\n', goContent);

  assert.ok(tsContent.includes('@ai-hint'), 'TS should have hints');
  assert.ok(pyContent.includes('# @ai-hint'), 'Python should have # style hints');
  assert.ok(goContent.includes('/**'), 'Go should have /** style hints');

  console.log('✅ Multi-Language AI Hints tests passed');
}

testHints().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  cleanup();
});
