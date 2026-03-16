import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { inferFileRole } from '../src/analyzer';
import { generateArchComment, parseArchComment, injectOrUpdateComment } from '../src/generator';
import { ArchSpec, FileRole } from '../src/types';

// Mock ArchSpec for testing
const mockSpec: ArchSpec = {
  architecture: 'modular',
  language: 'typescript',
  root: process.cwd(),
  bounded_contexts: ['user', 'order'],
  layers: {
    shared: {
      patterns: ['shared', 'common', 'types'],
      forbidden_deps: [],
      allowed_deps: []
    },
    module: {
      patterns: ['feature', 'module'],
      forbidden_deps: ['app'],
      allowed_deps: ['shared']
    }
  },
  comment_injection: 'inline'
};

async function testAnalyzer() {
  console.log('Testing Analyzer...');
  const role = inferFileRole('src/user/shared/utils.ts', mockSpec);
  assert.strictEqual(role.layer, 'shared', 'Should identify "shared" layer');
  assert.strictEqual(role.boundedContext, 'user', 'Should identify "user" context');
  console.log('✅ Analyzer tests passed');
}

async function testGenerator() {
  console.log('Testing Generator...');
  
  const mockRole: FileRole = {
    filePath: 'test.ts',
    layer: 'shared',
    role: 'shared.test',
    boundedContext: 'user',
    forbidden: [],
    depends: []
  };

  // 1. Comment Generation
  const comment = generateArchComment(mockRole, '.ts');
  assert.ok(comment.includes('@arch'), 'Comment should include @arch');
  assert.ok(comment.includes('layer: shared'), 'Comment should include correct layer');

  // 2. Shebang Preservation (The bug we fixed!)
  const tempFile = path.join(process.cwd(), 'temp-test-shebang.js');
  const originalContent = '#!/usr/bin/env node\nconsole.log("hello");';
  fs.writeFileSync(tempFile, originalContent);
  
  injectOrUpdateComment(tempFile, mockRole, process.cwd());
  
  const updatedContent = fs.readFileSync(tempFile, 'utf-8');
  assert.ok(updatedContent.startsWith('#!/usr/bin/env node'), 'Shebang MUST remain at the first line');
  assert.ok(updatedContent.includes('@arch'), 'Metadata should be injected after shebang');
  
  fs.unlinkSync(tempFile);
  console.log('✅ Generator tests passed (including Shebang fix)');
}

async function testWindowsCompatibility() {
  console.log('Testing Windows Compatibility (CRLF)...');
  const crlfContent = '/**\r\n * @arch\r\n * layer: shared\r\n * @arch-end\r\n */\r\nconsole.log("hi");';
  const parsed = parseArchComment(crlfContent, 'test.ts');
  assert.strictEqual(parsed?.layer, 'shared', 'Should parse CRLF comments correctly');
  console.log('✅ Windows compatibility tests passed');
}

async function runAll() {
  try {
    await testAnalyzer();
    await testGenerator();
    await testWindowsCompatibility();
    console.log('\nALL CORE TESTS PASSED! 🚀');
  } catch (err) {
    console.error('\n❌ TEST FAILED:');
    console.error(err);
    process.exit(1);
  }
}

runAll();
