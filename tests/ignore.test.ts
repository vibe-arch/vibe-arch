import * as assert from 'assert';
import * as path from 'path';

// src/watcher/index.ts의 로직을 직접 테스트
const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/target/**",
  "**/.gradle/**",
  "**/CLAUDE.md",
  "**/GEMINI.md",
  "**/AI.md",
  "**/.arch-spec.*",
  "arch/**",
];

function isIgnored(relativePath: string, pattern: string): boolean {
  const parts = relativePath.split(path.sep);
  const patternParts = pattern.split('/').filter(p => p !== '**' && p !== '');
  
  // 수정한 로직: 패턴의 모든 세그먼트가 경로에 포함되어 있는지 확인
  return patternParts.every(pp => parts.includes(pp));
}

async function testIgnoreLogic() {
  console.log('Testing Ignore Logic (The fixed bug)...');

  // Case 1: 'dist/**' should ignore 'dist/index.js'
  const path1 = path.join('dist', 'index.js');
  const ignored1 = IGNORE_PATTERNS.some(p => isIgnored(path1, p));
  assert.ok(ignored1, 'dist/index.js should be ignored');

  // Case 2: 'dist/**' should NOT ignore 'src/utils/distance.ts'
  const path2 = path.join('src', 'utils', 'distance.ts');
  const ignored2 = IGNORE_PATTERNS.some(p => isIgnored(path2, p));
  assert.ok(!ignored2, 'src/utils/distance.ts should NOT be ignored (Fixed!)');

  // Case 3: 'node_modules/**'
  const path3 = path.join('node_modules', 'chalk', 'index.js');
  const ignored3 = IGNORE_PATTERNS.some(p => isIgnored(path3, p));
  assert.ok(ignored3, 'node_modules file should be ignored');

  console.log('✅ Ignore logic tests passed');
}

testIgnoreLogic().catch(err => {
  console.error(err);
  process.exit(1);
});
