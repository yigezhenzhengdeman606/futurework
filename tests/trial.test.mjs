import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {TrialService,MemoryTrialStore,R2TrialStore} from '../src/trial.mjs';
import {enhance,createApp} from '../server.mjs';
const secret='a'.repeat(64),key='test-platform-secret';
function setup(options={}){const store=new MemoryTrialStore();return {store,trial:new TrialService({store,key,secret,...options})};}
const response=()=>Response.json({choices:[{message:{content:'A personalised reflection'}}],usage:{prompt_tokens:100,completion_tokens:50}});
const generate=(config,fetcher)=>enhance('profile-insight',{profile:{occupation:'Student'}},config,fetcher).then(ai=>({ai}));
const payload={profile:{occupation:'Student'},locale:'en'};

test('claiming is idempotent and global 15-place cap survives concurrent claims',async()=>{
 const {trial,store}=setup(),device=randomUUID();
 const first=await trial.claim(device,true),again=await trial.claim(device,true);
 assert.equal(first.token,again.token);assert.equal(again.remaining,14);
 const outcomes=await Promise.allSettled(Array.from({length:30},()=>trial.claim(randomUUID(),true)));
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,14);
 assert.equal(Object.values((await store.read()).value.users).filter(u=>u.mode==='free').length,15);
 assert.equal((await trial.status()).remaining,0);
});

test('free and reimbursement are mutually exclusive, and reimbursement references are stable',async()=>{
 const {trial}=setup(),free=randomUUID(),paid=randomUUID();
 await trial.claim(free,true);await assert.rejects(()=>trial.reimbursement(free),/不可|不能/);
 const first=await trial.reimbursement(paid),second=await trial.reimbursement(paid);
 assert.equal(first.reference,second.reference);assert.equal(first.submitted,false);
 await assert.rejects(()=>trial.claim(paid,true),/报销/);
 assert.equal((await trial.status(paid)).reimbursement,true);
});

test('completed stages replay cached output without calling AI, and changed inputs cannot create a second report',async()=>{
 const {trial,store}=setup(),claim=await trial.claim(randomUUID(),true);let calls=0;
 const fetcher=async(_,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.model,'deepseek-flash');assert.deepEqual(body.thinking,{type:'disabled'});return response();};
 const first=await trial.run(claim.token,'/api/profile-insight',payload,generate,fetcher);
 const cached=await trial.run(claim.token,'/api/profile-insight',payload,generate,fetcher);
 assert.deepEqual(cached,first);assert.equal(calls,1);assert.equal(first.trial.complete,true);
 assert.ok(!JSON.stringify(first).includes(key));
 assert.ok(!JSON.stringify((await store.read()).value).includes(key));
 await assert.rejects(()=>trial.run(claim.token,'/api/profile-insight',{profile:{occupation:'Changed'}},generate,fetcher),/已体验一次/);
 await assert.rejects(()=>trial.run(claim.token,'/api/market-insight',payload,generate,fetcher),/不包含/);
 await assert.rejects(()=>trial.run('0'.repeat(64),'/api/report',payload,generate,fetcher),/无效/);
});

test('concurrent stages reserve budget before provider calls and never exceed it',async()=>{
 const {trial,store}=setup({budget:15000}),a=await trial.claim(randomUUID(),true),b=await trial.claim(randomUUID(),true);
 let release,calls=0;const gate=new Promise(resolve=>release=resolve);
 const fetcher=async()=>{calls++;await gate;return response();};
 const first=trial.run(a.token,'/api/profile-insight',payload,generate,fetcher);
 while(!calls)await new Promise(resolve=>setTimeout(resolve,0));
 await assert.rejects(()=>trial.run(a.token,'/api/profile-insight',payload,generate,fetcher),/处理中/);
 const second=await trial.run(b.token,'/api/profile-insight',payload,generate,fetcher);
 assert.equal(second.trial.complete,false);assert.equal(calls,1);release();await first;
 const state=(await store.read()).value;assert.equal(state.reserved,0);assert.equal(state.spent,600);assert.ok(state.spent<=trial.budget);
});

test('timeouts conservatively consume the reservation and allow at most one manual retry',async()=>{
 const {trial,store}=setup(),claim=await trial.claim(randomUUID(),true);let calls=0;
 const fetcher=async()=>{calls++;throw Error('timeout');};
 for(let i=0;i<2;i++){const result=await trial.run(claim.token,'/api/profile-insight',payload,generate,fetcher);assert.equal(result.trial.complete,false);}
 await assert.rejects(()=>trial.run(claim.token,'/api/profile-insight',payload,generate,fetcher),/重试次数/);
 assert.equal(calls,2);const state=(await store.read()).value;assert.equal(state.reserved,0);assert.ok(state.spent>0);
});

test('R2 store conditional writes prevent lost quota updates across separate service instances',async()=>{
 const values=new Map();let revision=0;
 const bucket={async get(key){const record=values.get(key);return record?{etag:record.etag,text:async()=>record.text}:null;},async put(key,text,options){const previous=values.get(key),condition=options?.onlyIf;if(condition?.etagMatches&&previous?.etag!==condition.etagMatches)return null;if(condition?.etagDoesNotMatch==='*'&&previous)return null;const etag=String(++revision);values.set(key,{etag,text});return {etag};}};
 const services=Array.from({length:8},()=>new TrialService({store:new R2TrialStore(bucket),key,secret,limit:3}));
 const results=await Promise.allSettled(services.map(service=>service.claim(randomUUID(),true)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.equal((await services[0].status()).remaining,0);
});

test('HTTP trial endpoints never expose platform credentials and keep own-key and offline modes working',async()=>{
 const {trial}=setup();let calls=0;
 const server=createApp({snapshot:{items:[]}},async()=>{calls++;return response();},{trial});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=async(route,data)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
 const profile={occupation:'Student',industry:'科技',hours:5,skills:[],goals:[]},deviceId=randomUUID();
 try{
  const claim=await post('/api/trial/claim',{deviceId,consent:true});assert.equal(claim.status,200);assert.ok(!JSON.stringify(claim).includes(key));
  for(let i=0;i<2;i++){const result=await post('/api/profile-insight',{profile,ai:{trialToken:claim.data.token},locale:'en'});assert.equal(result.status,200);assert.equal(result.data.trial.complete,true);assert.ok(!JSON.stringify(result).includes(key));}
  assert.equal(calls,1);
  assert.equal((await post('/api/trial/reimbursement',{deviceId})).status,409);
  assert.equal((await post('/api/profile-insight',{profile})).status,200);assert.equal(calls,1);
  assert.equal((await post('/api/profile-insight',{profile,ai:{provider:'deepseek',model:'deepseek-flash',key:'own-key'}})).status,200);assert.equal(calls,2);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('claim requires consent and cannot be activated without a platform key',async()=>{
 const {trial}=setup({key:''});assert.equal((await trial.status()).enabled,false);
 await assert.rejects(()=>trial.claim(randomUUID(),true),/暂未开通/);
 const enabled=setup().trial;await assert.rejects(()=>enabled.claim(randomUUID(),false),/同意/);
});
