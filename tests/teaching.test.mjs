import test from 'node:test';
import assert from 'node:assert/strict';
import {teachingTask,teachingContext} from '../src/teaching.mjs';
import {resolveRole,resolveScenario} from '../src/resolve-role.mjs';
import {createProfessionalTask} from '../src/tasks.mjs';
import {buildDay,defaults} from '../src/day.mjs';
test('high-school maths is never replaced by primary-school fractions, in three languages',()=>{
 for(const title of ['高中数学老师','高二数学教师','High school mathematics teacher','Guru Matematik sekolah menengah atas']){const task=teachingTask(title);assert.match(task.title,/高中.*函数单调性/);assert.ok(!JSON.stringify(task).includes('认识分数'));assert.ok(task.materials.some(m=>m.includes('x²')));assert.equal(task.fields.length,3);assert.equal(task.criteria.length,4);}
 assert.match(teachingTask('初中数学教师').title,/初中.*一次函数/);assert.match(teachingTask('小学数学教师').title,/小学.*认识分数/);
});
test('non-maths and unspecified teaching roles use an honest generic framework, not a maths lesson',()=>{
 for(const title of ['高中英语老师','初中语文教师','中小学教师（小／初／高）','大学数学教师','幼儿园老师']){const task=teachingTask(title);assert.ok(!task.title.includes('认识分数'));assert.ok(!task.title.includes('函数单调性'));assert.ok(task.title.includes(title));}
 assert.equal(teachingContext('中小学教师').stage,null);
});
test('unclear teacher input requests the missing school level or subject before using AI',async()=>{
 for(const input of ['数学老师','高中老师','老师','secondary school teacher']){const result=await resolveRole(input,{key:'test'},()=>{throw Error('must not call');});assert.equal(result.status,'clarify');assert.ok(!result.role);}
});
test('signed role/scenario/task retain user school level even when AI supplies an incorrect lower-level role',async()=>{
 const resolved=await resolveRole('高中数学老师',{key:'test'},async()=>({text:JSON.stringify({status:'ready',name:'小学数学教师',family:'school',task:'教认识分数。',artifact:'小学教案'})}));
 const s=resolveScenario({roleId:resolved.role.id,customRoleToken:resolved.customRoleToken},'normal');const task=createProfessionalTask(s,buildDay(defaults,false,()=>.99,'school',{difficulty:'normal'}));
 assert.equal(s.title,'高中数学老师');assert.match(s.task,/高中/);assert.ok(!s.rounds[1].text.includes('小学'));assert.match(task.title,/高中.*函数单调性/);
 const offline=await resolveRole('高二数学老师',{},null);assert.match(offline.role.artifact,/高中.*函数单调性/);
});
