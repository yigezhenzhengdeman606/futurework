import test from 'node:test';
import assert from 'node:assert/strict';
import {report,match,roles,evaluateStress} from '../src/career.mjs';
import {taskImpact,sdgEvidence} from '../src/evidence.mjs';
import {personalizeReport} from '../src/personalize.mjs';
import {renderEvidence,renderTaskImpact,renderWorkContext} from '../public/work-context-ui.js';
const p={occupation:'高中数学老师',industry:'教育',skills:['教学','沟通'],hours:5,goals:[4],interests:['教学分享'],major:'教育学'};
test('recommendations distinguish self-report, interests, missing evidence and regulated entry',()=>{
 const all=match(p,null,null,8);const school=all.find(r=>r.id==='school');
 assert.ok(school.evidence.supporting.some(s=>s.type==='用户自述技能'));
 assert.ok(school.evidence.supporting.some(s=>s.type.includes('非能力证明')));
 assert.match(school.evidence.barriers.join(''),/教师资格/);
 assert.match(all.find(r=>r.id==='physician').evidence.barriers.join(''),/执业注册/);
 assert.match(school.evidence.workEvidence,/尚无/);
 assert.ok(match({...p,skills:[],interests:[],major:undefined,goals:[]}).every(r=>r.evidence.unknowns.some(s=>s.includes('缺少直接支持'))));
});
test('occupation task explanations separate automation, human responsibility and new work without probabilities',()=>{
 const r=report(p,{items:[],lastSuccess:null});assert.equal(r.taskImpact.items.length,3);
 assert.match(r.taskImpact.items[1].task,/学生误区/);assert.equal(r.taskImpact.updatedAt,null);
 assert.match(taskImpact({...p,occupation:'行政助理',industry:'行政与客服'},{items:[]}).scope,/行业/);
 assert.equal(r.reviewEvidence.length,3);
});
test('all mapped goals explain conditional contribution and provide official goal links',()=>{
 for(const role of roles){const rows=sdgEvidence(role);assert.deepEqual(rows.map(r=>r.goal),role.sdgs);for(const row of rows){assert.ok(row.action&&row.verification&&row.tradeoff);assert.equal(row.source,`https://sdgs.un.org/goals/goal${row.goal}`);assert.ok(row.application.includes(role.artifact));}}
});
test('mood, lateness and work scores cannot change career ranking when enjoyment is unchanged',()=>{
 const a={roleId:'school',enjoyment:3,energy:1,quality:0,daySummary:{mood:1,lateMinutes:60}};
 const b={...a,energy:100,quality:9,daySummary:{mood:100,lateMinutes:0}};
 assert.deepEqual(match(p,a),match(p,b));
 const calm=match(p,null,evaluateStress({answers:[1,1,1,1]}),8).find(r=>r.id==='school');
 assert.equal(calm.rankingFactors.contextPreference,-12);assert.deepEqual(calm.overlap,p.skills);
 const aStress=evaluateStress({answers:[2,3,4,5],currentStrain:1}),bStress=evaluateStress({answers:[2,3,4,5],currentStrain:5});
 assert.deepEqual(match(p,null,aStress),match(p,null,bStress));assert.equal(bStress.currentStrain,5);
 assert.throws(()=>evaluateStress({answers:[2,3,4,5],currentStrain:6}));
});
test('AI reordering preserves auditable rule evidence and SDG mappings',async()=>{
 const base=report(p,{items:[]}),candidates=match(p,null,null,8);
 const result=await personalizeReport(base,p,candidates,{key:'fake'},async()=>({text:JSON.stringify({summary:'探索建议',impactAdvice:'仍需核实',transitionAdvice:'先核实门槛',matches:candidates.slice(0,3).reverse().map(r=>({id:r.id,reason:'结合已填资料继续探索',plan:r.path.map(p=>({skill:p.skill,action:'完成练习并请同行复核'}))}))})}));
 assert.equal(result.mode,'ai');for(const r of result.matches){assert.deepEqual(r.evidence,candidates.find(c=>c.id===r.id).evidence);assert.ok(r.sdgConnections.length);}
});
test('report and preference result render evidence, changes and revision actions',()=>{
 const stress=evaluateStress({answers:[2,3,4,5]}),final={...report(p,{items:[]},null,stress),stress};const esc=s=>String(s??'').replaceAll('<','&lt;');
 assert.match(renderEvidence(final.matches[0],esc),/进入门槛|进入门槛|现实进入门槛/);
 assert.match(renderTaskImpact(final.taskImpact,esc),/需要人主导/);
 const html=renderWorkContext({profile:p,experience:{},final,report:report(p,{items:[]}),ai:{},catalog:{workContextAssessment:{version:stress.assessmentVersion,scale:['1','2','3','4','5']}}},{title:()=>'',empty:()=>'',roleCards:()=>'',aiBlock:()=>'',esc});
 assert.match(html,/推荐为什么变化/);assert.match(html,/修改工作情境偏好/);assert.match(html,/修正档案/);
 const legacy={...final};delete legacy.reviewEvidence;legacy.matches=legacy.matches.map(r=>{const next={...r};delete next.rankingFactors;return next;});
 assert.doesNotThrow(()=>renderWorkContext({profile:p,experience:{},final:legacy,ai:{},catalog:{workContextAssessment:{version:stress.assessmentVersion,scale:['1','2','3','4','5']}}},{title:()=>'',empty:()=>'',roleCards:()=>'',aiBlock:()=>'',esc}));
});
