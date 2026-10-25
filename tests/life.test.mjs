import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDay,defaults,modeFor} from '../src/day.mjs';
import {scenario} from '../src/career.mjs';
import {newLife,chooseSocial,branchEvent,wellbeing} from '../src/life.mjs';
import {validateStory} from '../src/day-ai.mjs';
test('both versions have social cards, normal ends on time and difficult has more decisions and severe overtime',()=>{
 const normal=buildDay(defaults,false,()=>0,'analyst',{difficulty:'normal'});
 const difficult=buildDay(defaults,false,()=>0,'analyst',{difficulty:'difficult'});
 assert.equal(normal.overtime,false);assert.equal(difficult.overtimeMinutes,180);
 assert.equal(normal.events.filter(e=>e.kind==='social').length,3);assert.equal(normal.events.length,18);assert.equal(difficult.events.length,24);
 assert.equal(scenario('analyst','normal').rounds.length,3);assert.equal(scenario('analyst','difficult').rounds.length,6);
 assert.equal(scenario('physician','normal').rounds.length,3);
 const teacher=buildDay(modeFor('school').defaults,false,()=>0,'school',{difficulty:'normal'});assert.equal(teacher.overtime,false);
 for(const d of [normal,difficult,teacher])assert.ok(d.events.every((e,i)=>i===0||e.time>=d.events[i-1].time));
 assert.throws(()=>buildDay(defaults,false,()=>0,'analyst',{difficulty:'bogus'}));
});
test('parent honesty and reassurance lead to different subsequent dialogue',()=>{
 const day=buildDay(defaults,false,()=>0,'analyst',{difficulty:'normal'});const e=day.events.find(e=>e.socialId==='parents');const later=day.events.find(e=>e.socialId==='parent-followup');
 const honest=newLife(day),fine=newLife(day);chooseSocial(honest,e,1,'normal');chooseSocial(fine,e,0,'normal');
 assert.notEqual(branchEvent(later,honest).text,branchEvent(later,fine).text);assert.ok(honest.mood>fine.mood);
 assert.throws(()=>chooseSocial(honest,e,0,'normal'));
});
test('trying to do everything draws once, fails at mode-specific probabilities and affects future work and friends',()=>{
 const day=buildDay(defaults,false,()=>0,'analyst',{difficulty:'difficult'}),life=newLife(day);let draws=0;
 for(const event of day.events.filter(e=>['old-friend','best-friend'].includes(e.socialId))){const result=chooseSocial(life,event,2,'difficult',()=>{draws++;return .2;});assert.equal(result.failed,true);}
 assert.equal(draws,2);assert.ok(wellbeing(life,65).energy<25);assert.ok(life.mood<25);assert.ok(branchEvent(day.events.find(e=>e.kind==='work'),life).branchNote);
 assert.match(branchEvent(day.events.find(e=>e.socialId==='friend-followup'),life).text,/两边都没做好/);
 const event=day.events.find(e=>e.socialId==='old-friend');assert.equal(chooseSocial(newLife(day),event,2,'normal',()=>.35).failed,false);assert.equal(chooseSocial(newLife(day),event,2,'difficult',()=>.65).failed,false);
 let failures=0;for(let i=0;i<100;i++)if(chooseSocial(newLife(day),event,2,'normal',()=>i/100).failed)failures++;assert.equal(failures,35);
});
test('AI can personalize social text while retaining canonical actions and outcome branches',()=>{
 const day=buildDay(defaults,false,()=>0,'analyst',{difficulty:'normal'});const base=scenario('analyst','normal');
 const raw={events:day.events.map((e,id)=>({id,kind:e.kind,title:'专属事件',text:'专属内容',...(e.kind==='work'?{options:base.rounds[e.round].options}:{}),...(e.kind==='social'?{options:e.options.map(o=>({...o,text:'专属选项'+o.id,feedback:'专属后果',...(o.id==='both'?{failureFeedback:'专属的双重失误'}:{})}))}:{}),...(e.socialId==='parent-followup'?{branches:{honest:'家人认真听你讲压力',fine:'家人以为你状态不错',later:'约定之后的电话'}}:{})}))};
 const result=validateStory(raw,day,base);const e=result.events.find(e=>e.socialId==='old-friend');assert.equal(e.options[2].id,'both');assert.equal(e.options[2].failureFeedback,'专属的双重失误');
 const life=newLife(day);chooseSocial(life,result.events.find(e=>e.socialId==='parents'),1,'normal');assert.equal(branchEvent(result.events.find(e=>e.socialId==='parent-followup'),life).text,'家人认真听你讲压力');
 e.options[0].id='malicious';raw.events.find(e=>e.kind==='social').options[0].id='changed';assert.throws(()=>validateStory(raw,day,base));
});
