import * as assert from 'assert';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CLI = 'node dist/index.js';
const WORKSPACE = path.join(process.cwd(), 'test-workspace');

function setup() {
  if (fs.existsSync(WORKSPACE)) fs.rmSync(WORKSPACE, { recursive: true });
  fs.mkdirSync(WORKSPACE);
  fs.writeFileSync(path.join(WORKSPACE, 'package.json'), '{"name":"test-project"}');
  fs.mkdirSync(path.join(WORKSPACE, 'src'));
  fs.writeFileSync(path.join(WORKSPACE, 'src/main.ts'), 'console.log("hello");');
}

async function testInitAndSync() {
  console.log('Testing CLI [init] and [update]...');
  
  // 1. init (non-interactive mode)
  execSync(`${CLI} init ${WORKSPACE} -y --arch layered --lang typescript --injection inline`);
  assert.ok(fs.existsSync(path.join(WORKSPACE, '.arch-spec.json')), '.arch-spec.json should be created');
  assert.ok(fs.existsSync(path.join(WORKSPACE, 'CLAUDE.md')), 'CLAUDE.md should be created');

  // 2. update
  execSync(`${CLI} update ${WORKSPACE}`);
  const content = fs.readFileSync(path.join(WORKSPACE, 'src/main.ts'), 'utf-8');
  assert.ok(content.includes('@arch'), 'Metadata should be injected via update');
  
  // 3. status
  const status = execSync(`${CLI} status ${WORKSPACE}`).toString();
  assert.ok(status.includes('Health'), 'Status should report health');
  assert.ok(status.includes('1 / 1 covered'), 'Status should report 100% coverage');

  console.log('✅ CLI tests passed');
}

setup();
testInitAndSync().catch(err => {
  console.error(err);
  process.exit(1);
});
