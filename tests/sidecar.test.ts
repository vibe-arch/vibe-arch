import * as assert from 'assert';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CLI = 'node dist/index.js';
const WORKSPACE = path.join(process.cwd(), 'sidecar-test-workspace');

function setup() {
  if (fs.existsSync(WORKSPACE)) fs.rmSync(WORKSPACE, { recursive: true });
  fs.mkdirSync(WORKSPACE);
  fs.writeFileSync(path.join(WORKSPACE, 'package.json'), '{"name":"sidecar-project"}');
}

async function testSidecarGuide() {
  console.log('Testing Sidecar Mode Guide Generation...');
  
  // 1. init in sidecar mode
  execSync(`${CLI} init ${WORKSPACE} -y --arch modular --injection sidecar`);
  
  // 2. check GEMINI.md
  const geminiMd = fs.readFileSync(path.join(WORKSPACE, 'GEMINI.md'), 'utf-8');
  if (!geminiMd.includes('arch/')) {
    console.log('GEMINI.md Content:\n', geminiMd);
  }
  assert.ok(geminiMd.includes('arch/'), 'GEMINI.md should mention arch/ in sidecar mode');
  assert.ok(geminiMd.includes('arch/src/index.ts.md'), 'GEMINI.md should show sidecar example');

  // 3. check CLAUDE.md
  const claudeMd = fs.readFileSync(path.join(WORKSPACE, 'CLAUDE.md'), 'utf-8');
  assert.ok(claudeMd.includes('arch/'), 'CLAUDE.md should mention arch/ in sidecar mode');

  console.log('✅ Sidecar guide tests passed');
}

setup();
testSidecarGuide().catch(err => {
  console.error(err);
  process.exit(1);
});
