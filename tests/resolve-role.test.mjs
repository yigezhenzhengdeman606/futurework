import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRole,resolveScenario} from '../src/resolve-role.mjs';
import {createApp} from '../server.mjs';
import {defaults} from '../src/day.mjs';
test('AI ambiguous role requests clarification without starting a scenario',async()=>{
 const result=await resolveRole('教育',{key:'x'},async()=>({text:JSON.stringify({status:'clarify',message:'请补充教学阶段和学科',questions:['小学、初中还是高中？','具体教授什么学科？']})}));
 assert.equal(result.status,'clarify');assert.equal(result.role,undefined);
 const failure=await resolveRole('做教育',{key:'x'},async()=>{throw Error('offline');});assert.equal(failure.status,'clarify');assert.equal(failure.aiFailed,true);
});
test('clear custom role produces a signed definition usable in normal and difficult modes',async()=>{
 const result=await resolveRole('小学数学教师',{key:'x'},async()=>({text:JSON.stringify({status:'ready',name:'小学数学教师',family:'school',task:'准备分数概念课，协调课堂支持与家长沟通。',artifact:'分数课教案与学生支持记录'})}));
 assert.equal(result.status,'ready');const p={roleId:result.role.id,customRoleToken:result.customRoleToken};
 const normal=resolveScenario(p,'normal');assert.equal(normal.title,'小学数学教师');assert.equal(normal.rounds.length,3);assert.equal(normal.lifeMode.hell,true);
 assert.equal(resolveScenario(p,'difficult').rounds.length,6);
 assert.throws(()=>resolveScenario({...p,roleId:'other'}));assert.throws(()=>resolveScenario({...p,customRoleToken:p.customRoleToken+'x'}));
 const vague=await resolveRole('科技',{},null);assert.equal(vague.status,'clarify');
 const offline=await resolveRole('游戏后端开发工程师',{},null);assert.equal(offline.mode,'rules');assert.match(offline.note,/通用规则/);
});
test('independent experience URL and custom career lifecycle work without a profile',async()=>{
 const app=createApp({snapshot:{items:[]}});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
 const post=async(route,data)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,200);return r.json();};
 try{
 assert.equal((await fetch(base+'/experience')).status,200);
 const role=await post('/api/resolve-role',{input:'游戏后端开发工程师'});const p={roleId:role.role.id,customRoleToken:role.customRoleToken};
 const scenario=await post('/api/simulation',p);assert.equal(scenario.title,'游戏后端开发工程师');
 const preview=await post('/api/day/preview',{...p,settings:defaults});assert.equal(preview.alarm,'08:25');
 const day=await post('/api/day',{...p,settings:defaults,difficulty:'normal',snooze:false});assert.equal(day.events.length,18);assert.ok(day.scenarioToken);
 const review=await post('/api/experience-review',{experience:{roleId:p.roleId,scenarioToken:day.scenarioToken,choices:[0,0,0],enjoyment:4}});assert.equal(review.experience.roleTitle,'游戏后端开发工程师');assert.equal(review.experience.quality,9);
 }finally{await new Promise(r=>app.close(r));}
});
