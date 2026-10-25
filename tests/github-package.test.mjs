import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
await import('../scripts/github-package.mjs');
test('GitHub source package includes runtime entrypoints and excludes secrets and nested Git metadata',async()=>{
 const files=JSON.parse(await readFile(new URL('../.cache/github-tree.json',import.meta.url),'utf8'));
 for(const p of ['server.mjs','package.json','public/app.js','public/config.js','src/career.mjs','scripts/prepare-sites.mjs','scripts/build-pages.mjs','.github/workflows/futurework-pages.yml'])assert.ok(files.some(e=>e.path===p),p);
 assert.ok(files.every(e=>!/(^|\/)\.git\//.test(e.path)&&!/(^|\/)\.env$/.test(e.path)&&!e.path.startsWith('futurework/')));
});
