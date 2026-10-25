import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDay,defaults} from '../src/day.mjs';
import {scenario,evaluateExperience} from '../src/career.mjs';
import {generateDay,validateStory,verifyScenario,signScenario} from '../src/day-ai.mjs';
import {createApp} from '../server.mjs';
const day=buildDay(defaults,false);
const base=scenario('educator');
const story=()=>({events:day.events.map((e,id)=>({id,kind:e.kind,title:`AI 第 ${id} 幕`,text:`围绕学习设计师工作的事件 ${id}`,...(e.kind==='work'?{options:[0,1,2].map(i=>({text:`行动 ${i}`,feedback:`反馈 ${i}`,quality:2,energy:-5}))}:{})}))});
test('AI creates every scene, preserves all computed times and signs generated scoring',async()=>{
 let calls=0;
 const result=await generateDay(day,base,{major:'教育学'},{key:'test'},async(kind,p,c,opts)=>{calls++;assert.equal(p.role.name,base.title);assert.equal(p.events.length,13);assert.equal(opts.json,true);return {text:JSON.stringify(story())};});
 assert.equal(calls,1);assert.equal(result.mode,'ai');assert.ok(result.events.every((e,i)=>e.title===`AI 第 ${i} 幕`));assert.deepEqual(result.events.map(e=>e.time),day.events.map(e=>e.time));assert.equal(result.rounds.length,3);
 const verified=verifyScenario(result.scenarioToken,base.roleId);const evaluated=evaluateExperience({roleId:base.roleId,choices:[0,0,0],enjoyment:3},verified);assert.equal(evaluated.quality,6);assert.equal(evaluated.energy,85);
});
test('AI missing scenes, malformed JSON, invalid options, timeout and absent key fall back without new random draws',async()=>{
 const bad=story();bad.events[5].options[0].quality=99;assert.throws(()=>validateStory(bad,day,base));
 const swapped=story();swapped.events[0].kind='sleep';assert.throws(()=>validateStory(swapped,day,base));
 for(const result of [{text:'not-json'},{text:JSON.stringify({events:[]})},{text:JSON.stringify(bad)},{text:null}]){const fallback=await generateDay(day,base,null,{key:'x'},async()=>result);assert.equal(fallback.mode,'rules');assert.deepEqual(fallback.events,day.events);assert.match(fallback.ai.status,/回退/);}
 const failed=await generateDay(day,base,null,{key:'x'},async()=>{throw Error('timeout');});assert.equal(failed.mode,'rules');
 const offline=await generateDay(day,base,null,{},()=>{throw Error('must not call AI');});assert.equal(offline.mode,'rules');assert.equal(verifyScenario(offline.scenarioToken,'educator').rounds.length,3);
});
test('signed scoring rejects tampering and cross-role reuse',()=>{
 const token=signScenario('educator',base.rounds);assert.throws(()=>verifyScenario(token,'care'));assert.throws(()=>verifyScenario(token+'x','educator'));assert.throws(()=>verifyScenario('garbage','educator'));
});
test('HTTP AI day makes one provider call and rematch scores the exact generated decisions',async()=>{
 let calls=0;const aiFetcher=async(url,init)=>{calls++;const p=JSON.parse(init.body);assert.equal(p.response_format.type,'json_object');assert.equal(init.headers.Authorization,'Bearer mock-key');assert.ok(!init.body.includes('mock-key'));return Response.json({choices:[{message:{content:JSON.stringify(story())}}]});};
 const server=createApp({snapshot:{items:[]}},aiFetcher);await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const post=(route,p)=>fetch(url+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
 try{const profile={occupation:'学生',industry:'教育',skills:[],goals:[],hours:5};
 const result=await(await post('/api/day',{roleId:'educator',settings:defaults,snooze:false,profile,ai:{provider:'openai',model:'test',key:'mock-key'}})).json();assert.equal(result.mode,'ai');assert.equal(calls,1);
 const rematch=await(await post('/api/rematch',{profile,experience:{roleId:'educator',choices:[0,0,0],enjoyment:4,scenarioToken:result.scenarioToken},stress:{answers:[3,3,3,3]}})).json();assert.equal(rematch.experience.quality,6);assert.equal(rematch.experience.energy,85);assert.equal(rematch.matches.length,3);assert.equal(calls,1);
 }finally{await new Promise(r=>server.close(r));}
});
