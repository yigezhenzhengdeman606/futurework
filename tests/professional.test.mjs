import test from 'node:test';
import assert from 'node:assert/strict';
import {startMorning,prepareMorning,resolveMorning,morningState} from '../src/morning.mjs';
import {defaults,buildDay} from '../src/day.mjs';
import {newLife,chooseConsequence,branchEvent,wellbeing} from '../src/life.mjs';
import {createProfessionalTask,assessProfessionalTask} from '../src/tasks.mjs';
import {scenario,evaluateExperience,match} from '../src/career.mjs';
import {verifyScenario} from '../src/day-ai.mjs';
import {createApp} from '../server.mjs';
import {TrialService,MemoryTrialStore} from '../src/trial.mjs';
import {randomUUID} from 'node:crypto';
const noIncidents=()=>.99;
function readyMorning({snooze=true,skipWash=false,skipBreakfast=false,checklist=false,incidentRandom=noIncidents}={}){
 const awake=startMorning(defaults,snooze,'analyst','normal',()=>0);
 const prepared=prepareMorning(awake.token,'analyst',{skipWash,skipBreakfast,checklist},incidentRandom);
 return resolveMorning(prepared.token,'analyst','digital');
}
function taskFixture(){const day=buildDay(defaults,false,()=>.99,'analyst',{difficulty:'normal'});return createProfessionalTask(scenario('analyst'),day);}
const work=task=>Array.from({length:task.rounds},(_,round)=>({round,answers:[`阶段${round}：计算单位产量用电为2、2、3.5千瓦时，周三相对周一增加75%。`,`阶段${round}：核实设备时长、温度和检修记录，区分相关性与因果关系。`,`阶段${round}：指定运营负责人跟进，复核单位能耗是否下降并记录验证结果。`]}));

test('oversleeping does not force lateness: skipping preparation can save the morning',()=>{
 const regular=readyMorning(),rushed=readyMorning({skipWash:true,skipBreakfast:true});
 assert.equal(regular.overslept,true);assert.equal(rushed.overslept,true);assert.ok(regular.lateMinutes>0);assert.equal(rushed.lateMinutes,0);
 assert.equal(rushed.depart,rushed.wake);assert.equal(rushed.arrival,rushed.depart+defaults.commute);
 const day=buildDay(defaults,true,()=>.99,'analyst',{difficulty:'normal',morning:morningState(rushed.token,'analyst','ready')});assert.equal(day.lateMinutes,0);assert.equal(day.events.find(e=>e.kind==='arrival').time,rushed.arrival);
});
test('returning for appliances/materials can cause lateness even after skipping breakfast; resolutions never redraw',()=>{
 const awake=startMorning(defaults,true,'analyst','normal',()=>.6);
 const prepared=prepareMorning(awake.token,'analyst',{skipWash:false,skipBreakfast:true,checklist:false},()=>0);
 assert.equal(prepared.incidents.length,3);
 const returned=resolveMorning(prepared.token,'analyst','return'),digital=resolveMorning(prepared.token,'analyst','digital');
 assert.ok(returned.lateMinutes>0);assert.equal(returned.arrival-digital.arrival,8);assert.deepEqual(resolveMorning(prepared.token,'analyst','return').effects,returned.effects);
 assert.ok(digital.conditions.some(c=>c.includes('资料')));assert.ok(digital.conditions.some(c=>c.includes('会议')));
 assert.throws(()=>resolveMorning(awake.token,'analyst','return'));assert.throws(()=>resolveMorning(prepared.token,'school','return'));assert.throws(()=>resolveMorning(prepared.token+'x','analyst','return'));
});
test('lateness creates manager and meeting decisions with persistent wellbeing and backlog effects',()=>{
 const morning=readyMorning({incidentRandom:()=>0}),day=buildDay(defaults,true,()=>.99,'analyst',{difficulty:'normal',morning});
 assert.ok(day.events.some(e=>e.consequenceId==='late-notice'));assert.ok(day.events.some(e=>e.consequenceId==='missed-meeting'));
 assert.ok(day.events.every((e,i)=>!i||e.time>=day.events[i-1].time));
 const life=newLife(day),before=wellbeing(life,100),meeting=day.events.find(e=>e.consequenceId==='missed-meeting');chooseConsequence(life,meeting,1);
 assert.ok(wellbeing(life,100).mood<before.mood);assert.ok(life.workPenalty>before.workPressure);assert.match(branchEvent(day.events.find(e=>e.kind==='work'),life).branchNote,/待办压力/);
 assert.throws(()=>chooseConsequence(life,meeting,1));assert.ok(life.history.length>0);
});
test('all built-in roles get actual work-sample briefs, fields, materials and fixed rubrics',()=>{
 for(const role of ['analyst','school','educator','care','governance','energy','circular','physician']){const task=createProfessionalTask(scenario(role,'normal'),buildDay(defaults,false,()=>.99,role,{difficulty:'normal'}));assert.equal(task.fields.length,3);assert.equal(task.criteria.length,4);assert.ok(task.materials.length);assert.equal(task.rounds,3);assert.equal(verifyScenario(task.token,'professional-task').rounds[0].roleId,role);}
});
test('offline checks preserve work and sign feedback without inventing professional scores',async()=>{
 const task=taskFixture(),submissions=work(task),result=await assessProfessionalTask(task.token,submissions,{},()=>{throw Error('must not call');});
 assert.equal(result.score,null);assert.equal(result.mode,'rules');
 const evaluated=evaluateExperience({roleId:'analyst',enjoyment:4,taskAssessmentToken:result.assessmentToken,quality:9});assert.equal(evaluated.quality,null);assert.equal(evaluated.taskAssessment.mode,'rules');
 const tired=evaluateExperience({roleId:'analyst',enjoyment:4,taskAssessmentToken:result.assessmentToken,daySummary:{energyDelta:-100}});assert.equal(tired.energy,0);
 const profile={industry:'科技',skills:[],goals:[],hours:5};assert.deepEqual(match(profile,evaluated).map(r=>[r.id,r.score]),match(profile,tired).map(r=>[r.id,r.score]));
 assert.throws(()=>evaluateExperience({roleId:'school',enjoyment:4,taskAssessmentToken:result.assessmentToken}));
 await assert.rejects(()=>assessProfessionalTask(task.token,[submissions[0]],{},null));await assert.rejects(()=>assessProfessionalTask(task.token,submissions.map(s=>({...s,answers:submissions[0].answers})),{},null));
});
test('AI scoring follows the signed rubric, requires quotes from real user work and rejects fabricated evidence',async()=>{
 const task=taskFixture(),submissions=work(task);let calls=0;
 const raw={criteria:task.criteria.map(()=>({score:3,evidence:submissions[0].answers[0],feedback:'这段作答正确使用已有数据，但还应补充具体的核实记录。'})),summary:'作品包含计算、证据局限和执行安排，可以进一步细化验证步骤。',nextStep:'请增加一个带日期和责任人的核实清单，并说明不同结果下如何调整行动。'};
 const request=async(kind,payload,config,options)=>{calls++;assert.equal(kind,'task-assessment');assert.match(options.system,/迟到.*不得直接扣/);assert.deepEqual(payload.submissions,submissions);return {text:JSON.stringify(raw)};};
 const result=await assessProfessionalTask(task.token,submissions,{key:'test'},request);assert.equal(result.score,12);assert.equal(calls,1);assert.equal(result.mode,'ai');
 raw.criteria[0].evidence='这是用户从未提交过的一段伪造作品证据。';const rejected=await assessProfessionalTask(task.token,submissions,{key:'test'},request);assert.equal(rejected.score,null);assert.equal(rejected.mode,'rules');
 await assert.rejects(()=>assessProfessionalTask(task.token+'tampered',submissions,{key:'test'},request));
});
test('HTTP morning-to-professional-task lifecycle works without profile or AI',async()=>{
 const server=createApp({snapshot:{items:[]}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const post=async(route,payload)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(r.status,200,await r.clone().text());return r.json();};
 try{const awake=await post('/api/morning',{step:'wake',roleId:'school',settings:defaults,difficulty:'difficult',snooze:false});const prepared=await post('/api/morning',{step:'prepare',roleId:'school',morningToken:awake.token,choices:{skipWash:false,skipBreakfast:false,checklist:true}});const ready=await post('/api/morning',{step:'resolve',roleId:'school',morningToken:prepared.token,materialPlan:'digital'});const day=await post('/api/day',{roleId:'school',morningToken:ready.token,professional:true});assert.equal(day.task.rounds,3);assert.equal(day.events.filter(e=>e.kind==='work').length,3);assert.ok(day.events.some(e=>e.kind==='challenge'));const assessment=await post('/api/task-assess',{taskToken:day.task.token,submissions:work(day.task)});const review=await post('/api/experience-review',{experience:{roleId:'school',enjoyment:4,taskAssessmentToken:assessment.assessmentToken}});assert.equal(review.experience.taskAssessment.mode,'rules');assert.equal(review.experience.quality,null);}finally{await new Promise(resolve=>server.close(resolve));}
});

test('free experience includes one cached professional assessment without exposing the platform key',async()=>{
 const task=taskFixture(),submissions=work(task),trial=new TrialService({store:new MemoryTrialStore(),key:'platform-fixture-key',secret:'a'.repeat(64)}),claim=await trial.claim(randomUUID(),true);let calls=0;
 const server=createApp({snapshot:{items:[]}},async(_,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer platform-fixture-key');const {data}=JSON.parse(JSON.parse(options.body).messages[1].content);return Response.json({choices:[{message:{content:JSON.stringify({criteria:data.task.criteria.map(()=>({score:2,evidence:submissions[2].answers[0],feedback:'给出了具体计算和结论，还需补充对应的核实记录与执行标准。'})),summary:'作品完成了基础比较与方案描述，需要进一步完善验证和交接。',nextStep:'补充一份明确时间和负责人的核实清单，再复核计算与结论。'})}}],usage:{prompt_tokens:1000,completion_tokens:500}});},{trial});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{for(let i=0;i<2;i++){const r=await fetch(`http://127.0.0.1:${server.address().port}/api/task-assess`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskToken:task.token,submissions,ai:{trialToken:claim.token}})});const result=await r.json();assert.equal(r.status,200);assert.equal(result.mode,'ai');assert.equal(result.score,8);assert.ok(!JSON.stringify(result).includes('platform-fixture-key'));}assert.equal(calls,1);}finally{await new Promise(resolve=>server.close(resolve));}
});
