import * as assert from 'assert';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CLI = 'node dist/index.js';
const WORKSPACE = path.join(process.cwd(), 'daemon-workspace');

function setup() {
  if (fs.existsSync(WORKSPACE)) fs.rmSync(WORKSPACE, { recursive: true });
  fs.mkdirSync(WORKSPACE);
  fs.writeFileSync(path.join(WORKSPACE, 'package.json'), '{"name":"daemon-test"}');
  execSync(`${CLI} init ${WORKSPACE} -y --arch modular`);
}

async function testDaemon() {
  console.log('Testing Daemon [start] and [stop] with real-time watcher...');
  
  // 1. Start Daemon
  execSync(`${CLI} start ${WORKSPACE}`);
  console.log('Waiting for daemon to stabilize...');
  await new Promise(r => setTimeout(r, 2000));

  // 2. Check if running via status
  const statusBefore = execSync(`${CLI} status ${WORKSPACE}`).toString();
  assert.ok(statusBefore.includes('RUNNING'), 'Daemon should be running');

  // 3. Create a new file and wait for auto-injection
  const newFilePath = path.join(WORKSPACE, 'src/new-feature.ts');
  if (!fs.existsSync(path.dirname(newFilePath))) fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
  
  console.log('Creating new file to test real-time injection...');
  fs.writeFileSync(newFilePath, 'export const hello = "world";');

  // 워처 감지 및 주입 대기 (디바운스 고려)
  await new Promise(r => setTimeout(r, 3000));

  const content = fs.readFileSync(newFilePath, 'utf-8');
  assert.ok(content.includes('@arch'), 'Metadata should be AUTO-INJECTED by daemon');
  console.log('✅ Real-time injection verified');

  // 4. Stop Daemon
  execSync(`${CLI} stop ${WORKSPACE}`);
  await new Promise(r => setTimeout(r, 2000));

  const statusAfter = execSync(`${CLI} status ${WORKSPACE}`).toString();
  assert.ok(statusAfter.includes('STOPPED'), 'Daemon should be stopped');

  console.log('✅ Daemon tests passed');
}

setup();
testDaemon().catch(err => {
  console.error(err);
  // Fail safe: try to stop daemon if test fails
  try { execSync(`${CLI} stop ${WORKSPACE}`); } catch {}
  process.exit(1);
});
