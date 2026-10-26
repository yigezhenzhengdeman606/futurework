import test from 'node:test';
import assert from 'node:assert/strict';
import {enhance} from '../server.mjs';
import {personalizeQuestions,personalizeReport,personalizeStress,workContextAssessment} from '../src/personalize.mjs';
import {questionSet,report,match} from '../src/career.mjs';
const config={provider:'deepseek',model:'deepseek-flash',key:'private-test-key-do-not-echo'};
test('plain DeepSeek profile requests disable thinking just like JSON requests',async()=>{
 for(const options of [{},{json:true}]){
  const result=await enhance('profile-insight',{},config,async(_,request)=>{const body=JSON.parse(request.body);assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.max_tokens,900);return Response.json({choices:[{message:{content:'Useful career advice'}}]});},options);
  assert.equal(result.text,'Useful career advice');
 }
 await enhance('profile-insight',{}, {...config,provider:'openai'},async(_,request)=>{assert.ok(!Object.hasOwn(JSON.parse(request.body),'thinking'));return Response.json({choices:[{message:{content:'ok'}}]});});
});
test('AI fetch uses Workers-compatible manual redirects and never follows a key-bearing redirect',async()=>{
 let calls=0;
 const result=await enhance('profile-insight',{},config,async(_,request)=>{calls++;if(request.redirect==='error')throw TypeError('Workers does not implement error redirect mode');assert.equal(request.redirect,'manual');return new Response(null,{status:307,headers:{Location:'https://untrusted.example/'}});});
 assert.equal(calls,1);assert.equal(result.errorCode,'redirect');assert.equal(result.text,null);assert.ok(!JSON.stringify(result).includes(config.key));
});
test('provider errors are distinct, actionable, and never echo a raw provider message or key',async()=>{
 for(const [status,expected] of [[401,'authentication'],[402,'balance'],[403,'access'],[400,'parameters'],[404,'model'],[422,'parameters'],[429,'rate_limit'],[503,'provider']]){
  let calls=0;const result=await enhance('profile-insight',{},config,async()=>{calls++;return Response.json({error:{message:config.key}},{status});});
  assert.equal(calls,1);assert.equal(result.text,null);assert.equal(result.errorCode,expected);assert.equal(result.httpStatus,status);assert.ok(!JSON.stringify(result).includes(config.key));assert.match(result.status,/规则结果/);
 }
 const quota=await enhance('profile-insight',{},config,async()=>Response.json({error:{code:'insufficient_quota',message:config.key}},{status:429}));assert.equal(quota.errorCode,'balance');
});
test('timeouts, invalid JSON and empty reasoning-only outputs keep separate errors without automatic retries',async()=>{
 for(const [fetcher,expected] of [[async()=>{throw new DOMException('timeout','TimeoutError');},'timeout'],[async()=>new Response('not-json'),'invalid_response'],[async()=>Response.json({choices:[{finish_reason:'length',message:{reasoning_content:'hidden reasoning',content:''}}]}),'empty_output'],[async()=>{throw TypeError('private network info');},'connection']]){
  const result=await enhance('profile-insight',{},config,fetcher);assert.equal(result.errorCode,expected);assert.equal(result.text,null);assert.ok(!JSON.stringify(result).includes('hidden reasoning'));assert.ok(!JSON.stringify(result).includes('private network info'));
 }
});
test('structured questions, reports and preference contexts retain the same safe provider failure',async()=>{
 const profile={occupation:'Student',industry:'教育',hours:5,skills:[],goals:[]};
 const failure={text:null,errorCode:'authentication',httpStatus:401,status:'AI 连接失败：密钥无效（401）。已保留规则结果。'};
 const request=async()=>failure;
 const results=[await personalizeQuestions(questionSet(profile),profile,config,request),await personalizeReport(report(profile,{items:[]}),profile,match(profile),config,request),await personalizeStress(workContextAssessment,profile,{},config,request)];
 for(const result of results)assert.equal(result.ai.errorCode,'authentication');
 assert.equal(results[0].mode,'rules');assert.equal(results[1].mode,'rules');assert.deepEqual(results[2].questions,workContextAssessment.questions);
});
