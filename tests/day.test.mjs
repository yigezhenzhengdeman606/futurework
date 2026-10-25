import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDay,defaults,validateSchedule,clock,modeFor} from '../src/day.mjs';
import {scenario,evaluateExperience} from '../src/career.mjs';
import {generateDay,validateStory} from '../src/day-ai.mjs';
import {createApp} from '../server.mjs';
test('alarm is derived from all preparation durations and changes with commute',()=>{
 assert.equal(clock(validateSchedule(defaults).alarm),'08:25');assert.equal(clock(validateSchedule({...defaults,commute:60}).alarm),'08:10');
 const d=buildDay(defaults,false);assert.equal(d.lateMinutes,0);assert.equal(d.events.find(e=>e.kind==='arrival').clock,'09:50');assert.equal(d.events.at(-1).clock,'23:30');assert.equal(d.events.filter(e=>e.kind==='work').length,3);
 assert.ok(d.events.every((e,i)=>i===0||e.time>=d.events[i-1].time));
});
test('snooze has exact 70 percent boundary, produces actual lateness, and has a two-minute safe outcome',()=>{
 for(const roll of [0,.2,.699999]){const d=buildDay({...defaults,buffer:60},true,()=>roll);assert.equal(d.overslept,true);assert.ok(d.lateMinutes>0);assert.equal(d.events[0].time+d.settings.wash+d.settings.breakfast+d.settings.commute,d.events.find(e=>e.kind==='arrival').time);}
 for(const roll of [.7,.9,.999]){const d=buildDay({...defaults,buffer:2},true,()=>roll);assert.equal(d.overslept,false);assert.equal(d.lateMinutes,0);assert.equal(d.events[0].time,d.settings.alarm+2);}
 let late=0;for(let i=0;i<100;i++)if(buildDay(defaults,true,()=>i/100).lateMinutes>0)late++;assert.equal(late,70);
});
test('invalid schedules fail and next-day bedtime is represented chronologically',()=>{
 for(const patch of [{start:'bad'},{start:'25:00'},{wash:0},{commute:-1},{wash:2.5},{buffer:0},{end:'11:00'},{bed:'19:30'},{bed:'04:00'}])assert.throws(()=>validateSchedule({...defaults,...patch}));
 const day=buildDay({...defaults,bed:'00:30'},false);assert.equal(day.events.at(-1).clock,'次日 00:30');assert.throws(()=>buildDay(defaults,'yes'));
});
test('hell mode starts earlier, keeps normal end time and has exact 90 percent overtime boundary',()=>{
 for(const id of ['school','physician']){
 const config=modeFor(id).defaults;const base=scenario(id);assert.equal(base.rounds.length,6);assert.ok(config.start<defaults.start);
 let count=0;for(let i=0;i<100;i++){const day=buildDay(config,false,()=>i/100,id);if(day.overtime)count++;assert.equal(day.events.find(e=>e.kind==='leave').clock,config.end);assert.equal(day.events.filter(e=>e.kind==='work').length,6);assert.ok(day.events.every((e,j)=>!j||e.time>=day.events[j-1].time));assert.equal(day.events.find(e=>e.kind==='home').time,day.settings.endMinute+day.settings.commute+day.overtimeMinutes);}
 assert.equal(count,90);assert.equal(buildDay(config,false,()=>.9,id).overtime,false);
 const result=evaluateExperience({roleId:id,choices:[0,0,0,0,0,0],enjoyment:4});assert.equal(result.maxQuality,18);assert.equal(result.quality,9);assert.ok(result.energy>=0);
 assert.equal(buildDay(defaults,false,()=>0,id).settings.start,'10:00');
 }
 assert.equal(buildDay(defaults,false,()=>0,'analyst').overtime,false);
});
test('AI high-pressure events keep canonical round indices despite interleaved extra events',async()=>{
 const config={...modeFor('school').defaults,bed:'19:30'};
 const day=buildDay(config,false,()=>0,'school');assert.ok(day.events.at(-1).time>validateSchedule(config).bedMinute);
 const base=scenario('school');const raw={events:day.events.map((e,id)=>({id,kind:e.kind,title:'高压事件',text:e.text||'工作任务',...(e.kind==='work'?{options:[0,1,2].map(i=>({text:'行动'+i,feedback:'反馈',quality:e.round%4,energy:-5}))}:{})}))};
 const parsed=validateStory(raw,day,base);assert.equal(parsed.rounds.length,6);for(let i=0;i<6;i++)assert.equal(parsed.rounds[i].options[0].quality,i%4);
 const offline=await generateDay(day,base,null,{},null);assert.equal(offline.rounds.length,6);assert.equal(offline.overtime,true);assert.equal(offline.events.length,19);
});
test('HTTP schedule preview and alarm choice return usable lifecycle without AI',async()=>{
 const app=createApp({snapshot:{items:[]}});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
 try{
 assert.equal((await fetch(base+'/day-ui.js')).status,200);
 const post=(route,data)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const preview=await (await post('/api/day/preview',{settings:defaults})).json();assert.equal(preview.alarm,'08:25');
 const edited=await post('/api/day/preview',{roleId:'school',settings:{...defaults,wash:10,breakfast:10,commute:10,buffer:10}});assert.equal(edited.status,200);assert.equal((await edited.json()).alarm,'09:20');
 const d=await (await post('/api/day',{roleId:'educator',settings:defaults,snooze:false})).json();assert.equal(d.events[0].kind,'wake');assert.equal(d.events.at(-1).kind,'sleep');
 assert.equal((await post('/api/day',{roleId:'bad',settings:defaults,snooze:false})).status,400);
 }finally{await new Promise(r=>app.close(r));}
});
