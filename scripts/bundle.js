// esbuild로 단일 파일 번들링 (#6 Zero-Dependency 배포)
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  outfile: 'dist/index.js',
  banner: {
    js: '#!/usr/bin/env node\n',
  },
  minify: false,
  external: [],  // 모든 의존성 번들에 포함
}).then(() => {
  console.log('[bundle] dist/index.js generated (zero-dependency)');
}).catch((e) => {
  console.error('[bundle] failed:', e);
  process.exit(1);
});
