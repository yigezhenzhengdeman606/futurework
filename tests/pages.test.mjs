import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
await import('../scripts/build-pages.mjs');
test('Pages output uses project-relative assets and includes all imported modules',async()=>{
 const html=await readFile(new URL('../dist/pages/index.html',import.meta.url),'utf8');
 assert.ok(!/(?:src|href)="\/(?:app|style|intro)/.test(html));
 for(const file of ['app.js','config.js','day-ui.js','life-model.js','reimbursement.js','intro.js','i18n.js','translations.js','locale-overrides.js','free-trial.js','style.css','intro.css'])assert.ok((await readFile(new URL('../dist/pages/'+file,import.meta.url),'utf8')).length>0);
});
test('Pages client selects public backend and hash routes without storing secrets',async()=>{
 const source=await readFile(new URL('../public/config.js',import.meta.url),'utf8');const c=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 const original=globalThis.location;
 try{globalThis.location={origin:'https://yigezhenzhengdeman606.github.io',hash:'#/experience',pathname:'/futurework/'};assert.equal(c.initialView(),'experience');assert.equal(c.pageRoute('simulation'),'/futurework/#/experience');assert.equal(c.apiUrl('/api/catalog'),'https://futurework-career-navigator.snugkiwi16.chatgpt.site/api/catalog');
 globalThis.location={origin:'http://localhost:3000',hash:'',pathname:'/experience'};assert.equal(c.apiUrl('/api/catalog'),'/api/catalog');assert.equal(c.pageRoute('experience'),'/experience');
 }finally{if(original===undefined)delete globalThis.location;else globalThis.location=original;}
});
