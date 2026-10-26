import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../deploy/futurework/worker/index.js',import.meta.url),'utf8');
const worker=(await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
function environment(){
 const records=new Map([['market.json',JSON.stringify({items:[],lastAttempt:new Date().toISOString(),lastSuccess:null,status:'test',source:'https://export.arxiv.org/api/query'})]]);
 return {SIGNING_KEY:'a'.repeat(64),BUCKET:{async get(key){const value=records.get(key);return value===undefined?null:{text:async()=>value};},async put(key,value){records.set(key,value);}}};
}
test('hosted Worker serves HTTPS pages/assets and accepts same-origin JSON but rejects cross-site calls',async()=>{
 const env=environment(),ctx={waitUntil(p){void p;}};
 for(const file of ['/','/experience','/app.js','/day-ui.js','/life-model.js','/i18n.js','/translations.js','/locale-overrides.js','/free-trial.js','/work-context-ui.js']){const r=await worker.fetch(new Request('https://example.test'+file),env,ctx);assert.equal(r.status,200,file);assert.match(r.headers.get('Content-Security-Policy'),/default-src/);}
 const post=(origin)=>worker.fetch(new Request('https://example.test/api/day/preview',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify({settings:{start:'10:00',end:'19:00',bed:'23:30',wash:10,breakfast:10,commute:10,buffer:10},roleId:'school'})}),env,ctx);
 assert.equal((await post('https://example.test')).status,200);assert.equal((await post('https://other.test')).status,403);
});
test('hosted role signing remains valid across separate Worker requests',async()=>{
 const env=environment(),ctx={waitUntil(p){void p;}};
 const post=async(route,data)=>{const r=await worker.fetch(new Request('https://example.test'+route,{method:'POST',headers:{'Content-Type':'application/json',origin:'https://example.test'},body:JSON.stringify(data)}),env,ctx);assert.equal(r.status,200);return r.json();};
 const role=await post('/api/resolve-role',{input:'游戏后端开发工程师'});const result=await post('/api/simulation',{roleId:role.role.id,customRoleToken:role.customRoleToken});assert.equal(result.title,'游戏后端开发工程师');
});
test('GitHub Pages origin passes CORS preflight and can call the hosted API',async()=>{
 const env=environment(),ctx={waitUntil(p){void p;}},origin='https://yigezhenzhengdeman606.github.io';
 const preflight=await worker.fetch(new Request('https://example.test/api/day/preview',{method:'OPTIONS',headers:{origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}}),env,ctx);
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
 const response=await worker.fetch(new Request('https://example.test/api/catalog',{headers:{origin}}),env,ctx);assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 const denied=await worker.fetch(new Request('https://example.test/api/report',{method:'OPTIONS',headers:{origin:'https://evil.test'}}),env,ctx);assert.equal(denied.status,403);
});

test('hosted free trials persist across Worker instances without exposing server keys or cookies',async()=>{
 const records=new Map([['market.json',{text:JSON.stringify({items:[],lastAttempt:new Date().toISOString(),lastSuccess:null,status:'test'}),etag:'market'}]]);let revision=0;
 const env={SIGNING_KEY:'a'.repeat(64),DEEPSEEK_API_KEY:'server-secret-not-client',FREE_TRIAL_ENABLED:'true',BUCKET:{async get(key){const record=records.get(key);return record?{etag:record.etag,text:async()=>record.text}:null;},async put(key,text,options){const current=records.get(key),condition=options?.onlyIf;if(condition?.etagMatches&&current?.etag!==condition.etagMatches||condition?.etagDoesNotMatch==='*'&&current)return null;const etag=String(++revision);records.set(key,{text,etag});return {etag};}}};
 const ctx={waitUntil(p){void p;}},origin='https://yigezhenzhengdeman606.github.io';
 const post=async(route,data)=>{const r=await worker.fetch(new Request('https://example.test'+route,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)}),env,ctx);return {status:r.status,data:await r.json()};};
 const deviceId=randomUUID(),first=await post('/api/trial/claim',{deviceId,consent:true});assert.equal(first.status,200);assert.equal(first.data.remaining,14);assert.ok(!JSON.stringify(first).includes(env.DEEPSEEK_API_KEY));
 const again=await post('/api/trial/claim',{deviceId,consent:true});assert.equal(again.data.token,first.data.token);assert.equal(again.data.remaining,14);
 assert.equal((await post('/api/trial/reimbursement',{deviceId})).status,409);
 const status=await post('/api/trial/status',{deviceId});assert.equal(status.data.claimed,true);assert.ok(!JSON.stringify([...records.values()]).includes(env.DEEPSEEK_API_KEY));
});
