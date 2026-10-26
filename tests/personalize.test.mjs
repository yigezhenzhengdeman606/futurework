import test from 'node:test';
import assert from 'node:assert/strict';
import {personalizeQuestions,personalizeReport,personalizeStress,stressQuestions} from '../src/personalize.mjs';
import {questionSet,report,match,roles,validateProfile} from '../src/career.mjs';
import {createApp} from '../server.mjs';
const profile={occupation:'文案',industry:'行政与客服',skills:['写作'],goals:[4],hours:5,major:'教育学'};
const ai={provider:'openai',key:'mock-key',model:'mock'};
function recommendation(candidates){return {summary:'结合写作经验和教学兴趣，先做一个微课项目。',impactAdvice:'研究标题不能直接推导就业变化。',transitionAdvice:'先访谈从业者再尝试小项目。',matches:candidates.slice(-3).reverse().map(c=>({id:c.id,reason:`利用写作经验探索${c.name}`,plan:c.path.map(p=>({skill:p.skill,action:`每周五小时，围绕${p.skill}交付一个可评阅的案例。`}))}))};}
test('AI questions retain scored answer categories and add personal open questions',async()=>{
 const base=questionSet(profile);const raw={context:'围绕文案经验和教育方向追问',questions:base.questions.map(q=>({id:q.id,label:'结合文案经历：'+q.label})),openQuestions:['你曾如何解释一个难懂概念？','你希望在理想工作中创造什么成果？']};
 const result=await personalizeQuestions(base,profile,ai,async(kind,p)=>{assert.equal(p.profile.occupation,'文案');return {text:JSON.stringify(raw)};});assert.equal(result.mode,'ai');assert.equal(result.questions.length,5);assert.deepEqual(result.questions[0].options,base.questions[0].options);assert.equal(result.questions[4].type,'text');
 const fallback=await personalizeQuestions(base,profile,ai,async()=>({text:'{}'}));assert.equal(fallback.mode,'rules');assert.equal(fallback.questions.length,3);
 assert.throws(()=>validateProfile({...profile,personalAnswers:[{question:'经历',answer:' '}]}));
});
test('AI recommendations select three catalog careers and replace individual plans while keeping rule scores',async()=>{
 const base=report(profile,{items:[]}),candidates=match(profile,null,null,roles.length);const raw=recommendation(candidates);
 const result=await personalizeReport(base,profile,candidates,ai,async()=>({text:JSON.stringify(raw)}));assert.equal(result.mode,'ai');assert.equal(result.matches[0].id,raw.matches[0].id);assert.equal(result.matches[0].score,candidates.find(c=>c.id===raw.matches[0].id).score);assert.match(result.matches[0].path[0].action,/五小时/);
 for(const modified of [{...raw,matches:[raw.matches[0],raw.matches[0],raw.matches[0]]},{...raw,matches:[{...raw.matches[0],id:'fabricated'},...raw.matches.slice(1)]}]){const fallback=await personalizeReport(base,profile,candidates,ai,async()=>({text:JSON.stringify(modified)}));assert.equal(fallback.mode,'rules');assert.deepEqual(fallback.matches,base.matches);}
});
test('AI adds context while canonical willingness questions, scale and direction stay fixed',async()=>{
 const base={questions:stressQuestions,assessmentVersion:'work-context-v2',scale:['1','2','3','4','5']};const result=await personalizeStress(base,profile,{quality:5},ai,async(kind,p,c,options)=>{assert.equal(p.experience.quality,5);assert.match(options.system,/不把愿意接受解释为能够胜任/);return {text:JSON.stringify({questions:['AI must not replace the questions'],scenarios:stressQuestions.map(()=> '结合刚刚的交付任务，可能临时调整工作。')})};});assert.deepEqual(result.questions,stressQuestions);assert.match(result.scenarios[0],/交付/);assert.deepEqual(result.scale,base.scale);assert.equal(result.assessmentVersion,base.assessmentVersion);
 assert.deepEqual((await personalizeStress(base,profile,{},null,()=>{throw Error('must not call');})).questions,stressQuestions);
 const failure=await personalizeStress(base,profile,{},ai,async()=>{throw Error('timeout');});assert.deepEqual(failure.questions,stressQuestions);
 for(const raw of [{questions:stressQuestions},{scenarios:['too short']},{scenarios:[null,null,null,null]}])assert.deepEqual((await personalizeStress(base,profile,{},ai,async()=>({text:JSON.stringify(raw)}))).questions,stressQuestions);
});
test('HTTP questionnaire, report and stress flow forwards personal answers to AI without leaking API key',async()=>{
 const calls=[];const provider=async(url,init)=>{const body=JSON.parse(init.body);assert.ok(!init.body.includes('mock-key'));const {kind,data}=JSON.parse(body.messages[1].content);calls.push({kind,data});let raw;
 if(kind==='personal-questions')raw={context:'专属访谈',questions:data.base.questions.map(q=>({id:q.id,label:'你的实际场景：'+q.label})),openQuestions:['请描述一次教学分享','你想解决什么问题']};
 else if(kind==='career-recommendations')raw=recommendation(data.candidates);
 else if(kind==='stress-questions')raw={scenarios:stressQuestions.map(()=> '在交付任务中，工作条件发生变化。')};
 else return Response.json({choices:[{message:{content:'基于你的资料解读。'}}]});
 return Response.json({choices:[{message:{content:JSON.stringify(raw)}}]});};
 const app=createApp({snapshot:{items:[]}},provider);await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;const post=async(route,data)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,200);return r.json();};
 try{
 const questions=await post('/api/questions',{profile,ai});assert.equal(questions.questions.length,5);
 const p={...profile,relatedWork:'yes',answers:Object.fromEntries(questions.questions.filter(q=>q.type!=='text').map(q=>[q.id,q.options[0]])),personalAnswers:[{question:questions.questions[3].label,answer:'我给社区做过一次写作分享'}]};
 const r=await post('/api/report',{profile:p,ai});assert.equal(r.mode,'ai');assert.equal(calls.find(c=>c.kind==='career-recommendations').data.profile.personalAnswers[0].answer,p.personalAnswers[0].answer);
 const experience={roleId:'educator',choices:[0,0,0],enjoyment:4};const sq=await post('/api/stress-questions',{profile:p,experience,ai});assert.equal(sq.questions.length,4);
 const final=await post('/api/rematch',{profile:p,experience,stress:{answers:[3,3,3,3],questions:sq.questions},ai});assert.equal(final.mode,'ai');assert.equal(final.matches.length,3);assert.ok(calls.at(-1).data.report.experience);assert.ok(calls.at(-1).data.report.stress);
 for(const route of ['/api/profile-insight','/api/market-insight'])assert.ok((await post(route,{profile:p,ai})).ai.text);
 }finally{await new Promise(r=>app.close(r));}
});
