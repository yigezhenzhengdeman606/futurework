import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWorkContext} from '../public/work-context-ui.js';
import {workContextAssessment} from '../src/personalize.mjs';
import {report,evaluateStress,evaluateExperience} from '../src/career.mjs';
import {translate} from '../public/i18n.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers={esc,title:(a,b)=>`<h1>${a}</h1><p>${b}</p>`,empty:text=>text,roleCards:()=>'',aiBlock:()=>''};
const profile={occupation:'Student',industry:'行政与客服',hours:5,skills:[],goals:[]};
const state={profile,experience:{},catalog:{workContextAssessment},ai:{},preferenceAnswers:[1,2,3,4]};

test('preference form keeps canonical questions and explicit anchors, escapes AI scenarios and restores answers',()=>{
 const html=renderWorkContext({...state,stressQuestions:{assessmentVersion:workContextAssessment.version,questions:['Do not display injected replacement'],scenarios:['<img src=x onerror=alert(1)>']}},helpers);
 assert.ok(!html.includes('Do not display injected replacement'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
 for(const question of workContextAssessment.questions)assert.ok(html.includes(question));
 for(const label of workContextAssessment.scale)assert.ok(html.includes(label));
 assert.equal((html.match(/selected/g)||[]).length,4);
 assert.match(html,/不是你能不能做到/);
 for(const lang of ['en','ms'])assert.ok(!/\p{Script=Han}/u.test(translate(html.replace(/<[^>]+>/g,''),lang)),lang);
});

test('results explain the comparison and preserve original answers without presenting capacity scores',()=>{
 const experience=evaluateExperience({roleId:'educator',choices:[0,0,0],enjoyment:3});
 const stress=evaluateStress({answers:[1,2,3,4]});const final={...report(profile,{items:[]},experience,stress),stress,experience};
 const html=renderWorkContext({...state,final,stressRuleRetry:true,ai:{trialToken:'test'}},helpers);
 assert.match(html,/副本强度是产品预设/);assert.match(html,/不重复消耗免费 AI/);assert.match(html,/参考扣分/);assert.ok(!html.includes('情境承受偏好'));
 assert.equal((html.match(/<tr>/g)||[]).length,4);
 for(const response of stress.responses)assert.ok(html.includes(response.dimension));
 for(const lang of ['en','ms'])assert.ok(!/\p{Script=Han}/u.test(translate(html.replace(/<[^>]+>/g,''),lang)),lang);
 const legacy=renderWorkContext({...state,final:{...final,stress:{tolerance:3}}},helpers);assert.match(legacy,/旧版自评/);assert.ok(!legacy.includes('<table'));
});
