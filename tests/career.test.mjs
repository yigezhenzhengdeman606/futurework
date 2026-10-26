import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {report,scenario,evaluateExperience,evaluateStress,sdgs,roles,questionSet,match} from '../src/career.mjs';
import {Market} from '../src/market.mjs';
import {createApp,enhance} from '../server.mjs';
const profile={occupation:'行政助理',industry:'行政与客服',skills:['沟通','Excel'],hours:5,goals:[4,8]};
test('report provides three unique careers, gaps, learning paths and all 17 SDG coverage',()=>{
 const r=report(profile,{items:[]});assert.equal(r.matches.length,3);assert.equal(new Set(r.matches.map(r=>r.id)).size,3);assert.equal(r.impact.exposure,79);assert.equal(sdgs.length,17);assert.equal(new Set(roles.flatMap(r=>r.sdgs)).size,17);assert.ok(r.matches.every(r=>r.path.length&&r.path.every(p=>p.weeks>0)));
});
test('profile validation rejects missing occupation, invalid hours and goals',()=>{
 for(const patch of [{occupation:''},{hours:0},{hours:NaN},{goals:[18]},{skills:'Excel'},{industry:'unknown'}])assert.throws(()=>report({...profile,...patch},{items:[]}));
});
test('interests, major and work preference improve related role ranking without assuming skills',()=>{
 const p={...profile,skills:[],goals:[],interests:['教学分享','阅读写作'],major:'教育学',majorDetail:'小学教育',workStyle:'偏好与人交流',transitionGoal:'暂不确定',learningStyle:'导师指导与交流',experienceLevel:'在校 / 尚无工作经验'};
 const r=report(p,{items:[]});assert.equal(r.matches[0].id,'educator');assert.match(r.matches[0].reason,/兴趣契合/);assert.match(r.matches[0].reason,/专业方向相关/);assert.deepEqual(r.matches[0].overlap,[]);assert.ok(r.matches[0].gaps.includes('教学'));assert.match(r.matches[0].path[0].action,/导师或同行/);assert.match(r.matches[0].path[0].action,/入门练习/);assert.equal(r.profileSummary.majorDetail,'小学教育');
 const lowPressure=report({...profile,skills:[],goals:[],transitionGoal:'优先选择压力较低的方向'},{items:[]});assert.equal(lowPressure.matches[0].id,'educator');
});
test('supplementary questions accept omission and reject malformed options',()=>{
 assert.equal(report(profile,{items:[]}).matches.length,3);
 for(const patch of [{interests:'编程与科技'},{interests:['不合法选项']},{major:'bad'},{workStyle:12},{learningStyle:'bad'},{transitionGoal:'bad'},{experienceLevel:[]},{majorDetail:'x'.repeat(101)}])assert.throws(()=>report({...profile,...patch},{items:[]}));
 for(const patch of [{major:'其他'},{major:'其他',majorDetail:'  '},{interests:['其他']},{interests:['其他'],interestDetail:'  '},{interestDetail:123},{interestDetail:'x'.repeat(201)}])assert.throws(()=>report({...profile,...patch},{items:[]}));
 const custom=report({...profile,major:'其他',majorDetail:'考古学',interests:['其他'],interestDetail:'摄影与天文观测'},{items:[]});assert.equal(custom.profileSummary.majorDetail,'考古学');assert.equal(custom.profileSummary.interestDetail,'摄影与天文观测');
});
test('simulation is role specific and choices calculate energy and quality on server',()=>{
 assert.notEqual(scenario('care').task,scenario('energy').task);assert.throws(()=>scenario('nope'));
 const e=evaluateExperience({roleId:'care',choices:[0,2,0],enjoyment:5});assert.equal(e.energy,74);assert.equal(e.quality,9);assert.throws(()=>evaluateExperience({...e,choices:[9,0,0]}));
});
test('major direction branches to personalized questions or transition report',()=>{
 const p={...profile,major:'教育学',relatedWork:'yes'};
 const qs=questionSet(p);assert.match(qs.context,/学习体验设计师/);assert.equal(qs.questions.length,3);
 assert.notEqual(questionSet({...p,major:'环境与能源'}).questions[0].label,qs.questions[0].label);
 assert.throws(()=>report(p,{items:[]}));
 const answers=Object.fromEntries(qs.questions.map(q=>[q.id,q.options[0]]));
 const r=report({...p,answers},{items:[]});assert.equal(r.matches.length,3);assert.equal(r.profileSummary.answers.focus,answers.focus);assert.ok(r.matches.some(r=>r.reason.includes('专属问题')));
 assert.throws(()=>report({...p,answers:{...answers,focus:'invalid'}},{items:[]}));
 const switched=report({...p,relatedWork:'no'},{items:[]});assert.match(switched.transitionAdvice,/取消专业相关加分/);assert.ok(switched.matches.every(r=>!r.reason.includes('专业方向相关')));
});
test('experience changes ranking scores and invalid preference answers are rejected',()=>{
 const before=report(profile,{items:[]});const experience=evaluateExperience({roleId:before.matches[0].id,choices:[0,0,0],enjoyment:1});const stress=evaluateStress({answers:[1,1,1,1]});const after=report(profile,{items:[]},experience,stress);assert.notDeepEqual(before.matches.map(r=>[r.id,r.score]),after.matches.map(r=>[r.id,r.score]));assert.throws(()=>evaluateStress({answers:[0,2,3,4]}));
});

test('work preferences reverse relative career ranking rather than add a common score offset',()=>{
 const neutral={...profile,skills:[],goals:[]};
 const calm=match(neutral,null,evaluateStress({answers:[2,2,2,2]}),roles.length);
 const varied=match(neutral,null,evaluateStress({answers:[5,5,5,5]}),roles.length);
 const score=(results,id)=>results.find(r=>r.id===id).score;
 assert.equal(calm[0].id,'educator');
 assert.ok(score(calm,'educator')>score(calm,'school'));
 assert.ok(score(varied,'educator')<score(varied,'school'));
 assert.notDeepEqual(calm.map(r=>r.id),varied.map(r=>r.id));
 assert.equal(calm.find(r=>r.id==='educator').contextMatch.adjustment,0);
 assert.equal(varied.find(r=>r.id==='school').contextMatch.adjustment,0);
 for(const role of varied){assert.ok(role.contextMatch.adjustment<=0);assert.ok(role.contextMatch.adjustment>=-12);}
});

test('preference influence follows distance and does not alter recorded skills or competence',()=>{
 const neutral={...profile,skills:[],goals:[]};
 const near=match(neutral,null,evaluateStress({answers:[3,3,3,3]}),roles.length);
 const far=match(neutral,null,evaluateStress({answers:[5,5,5,5]}),roles.length);
 const energy=list=>list.find(r=>r.id==='energy');assert.equal(energy(near).contextMatch.adjustment,0);assert.equal(energy(far).contextMatch.adjustment,-6);
 assert.deepEqual(energy(near).overlap,energy(far).overlap);assert.deepEqual(energy(near).gaps,energy(far).gaps);
 const mixed=evaluateStress({answers:[1,5,2,4],preferredIntensity:5,tolerance:5});
 assert.equal(mixed.preferredIntensity,3);assert.deepEqual(mixed.responses.map(r=>r.value),[1,5,2,4]);assert.match(mixed.note,/不代表抗压能力/);
 assert.deepEqual(match(neutral).map(r=>r.id),report(neutral,{items:[]}).matches.map(r=>r.id));
 for(const answers of [[],[1,2,3],[1,2,3,4,5],[1,2,3,6],[1,2,3,1.5],[1,2,3,'4'],new Array(4)])assert.throws(()=>evaluateStress({answers}));
 assert.throws(()=>evaluateStress({answers:[1,2,3,4],questions:['','','','']}));
});
test('daily feed refresh, persistence, failure fallback and staleness',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'atlas-'));try{const market=await new Market(dir).load();let calls=0;const fetcher=async()=>{calls++;return new Response('<rss><item><title>AI coding agent</title><link>https://arxiv.org/abs/123</link></item></rss>');};await market.refresh(fetcher);assert.equal(market.snapshot.items.length,1);await market.refreshIfDue();assert.equal(calls,1);assert.equal((await new Market(dir).load()).snapshot.items.length,1);const last=market.snapshot.lastSuccess;await market.refresh(async()=>{throw Error('offline');});assert.equal(market.snapshot.lastSuccess,last);assert.equal(market.snapshot.items.length,1);assert.match(market.snapshot.status,/失败/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('HTTP workflow, static assets, invalid JSON, origin and secret non-echo',async()=>{
 const app=createApp({snapshot:{items:[],source:'https://rss.arxiv.org/rss/cs.AI'}});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
 try{for(const route of ['/','/app.js','/style.css','/intro.js','/intro.css','/reimbursement.js','/api/catalog','/api/market'])assert.equal((await fetch(base+route)).status,200);
 const post=(route,data,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 const r=await post('/api/report',{profile});assert.equal(r.status,200);assert.equal((await r.json()).matches.length,3);
 const s=await (await post('/api/simulation',{roleId:'care'})).json();assert.equal(s.rounds.length,3);
 const final=await post('/api/rematch',{profile,experience:{roleId:'care',choices:[0,2,0],enjoyment:4},stress:{answers:[2,3,4,5]}});assert.equal((await final.json()).matches.length,3);
 assert.equal((await post('/api/report',{profile},{Origin:'https://evil.example'})).status,403);
 assert.equal((await fetch(base+'/api/report',{method:'POST',body:'{'})).status,400);
 const secret=await post('/api/report',{profile,ai:{provider:'bad',key:'test-secret',model:'x'}});assert.equal(secret.status,400);assert.ok(!(await secret.text()).includes('test-secret'));
 }finally{await new Promise(r=>app.close(r));}
});
test('AI absent stays offline and unknown endpoints are rejected',async()=>{assert.equal((await enhance('report',{},{})).text,null);await assert.rejects(()=>enhance('report',{}, {key:'x',provider:'http://localhost',model:'x'}));});
test('AI success, provider errors and malformed responses preserve rules',async()=>{
 const config={provider:'deepseek',model:'test-model',key:'test-secret'};
 const success=await enhance('report',{matches:[]},config,async(url,init)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(init.headers.Authorization,'Bearer test-secret');assert.ok(!init.body.includes('test-secret'));return Response.json({choices:[{message:{content:'练习数据验证'}}]});});assert.equal(success.text,'练习数据验证');
 for(const mock of [async()=>{throw Error('timeout');},async()=>new Response('',{status:429}),async()=>Response.json({})]){const result=await enhance('report',{},config,mock);assert.equal(result.text,null);assert.match(result.status,/规则/);}
});
test('Atom source normalizes HTTP paper IDs and parses published dates',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'atlas-atom-'));try{const m=await new Market(dir).load();await m.refresh(async()=>new Response('<feed><entry><id>http://arxiv.org/abs/123v1</id><title>AI &amp; coding</title><published>2026-10-23</published></entry></feed>'));assert.equal(m.snapshot.items[0].url,'https://arxiv.org/abs/123v1');assert.equal(m.snapshot.items[0].title,'AI & coding');assert.equal(m.snapshot.items[0].published,'2026-10-23');}finally{await rm(dir,{recursive:true,force:true});}
});
test('overdue snapshots trigger one refresh check, recent attempts do not',async()=>{
 const market=new Market('unused');let calls=0;market.refresh=async()=>{calls++;market.snapshot.lastAttempt=new Date().toISOString();};
 market.snapshot.lastAttempt=new Date(Date.now()-86401000).toISOString();await market.refreshIfDue();await market.refreshIfDue();assert.equal(calls,1);
});
