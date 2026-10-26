import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/day-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function renderDaily','function renderDaily');
function context(){
 const status={textContent:'',isConnected:true,focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;}};
 const button={disabled:false};const pending=[];let cleared=0;
 const sandbox=vm.createContext({document:{addEventListener(){},querySelector:s=>s.includes('day-request-status')?status:null,querySelectorAll:()=>[button]},setInterval:fn=>{pending.push(fn);return 1;},clearInterval:()=>cleared++,AbortSignal,fetch:async()=>Response.json({error:'请为晚间生活留出时间'},{status:400})});
 vm.runInContext(source,sandbox);
 return {sandbox,status,button,pending,get cleared(){return cleared;}};
}
test('schedule validation does not claim AI is generating and displays errors beside the button',async()=>{
 const page=context();vm.runInContext("activeState={ai:{key:'configured'},daily:{phase:'setup'}}",page.sandbox);
 await vm.runInContext("operation(async()=>{if(!document.querySelector('.day-request-status').textContent.includes('不会调用 AI'))throw Error('wrong status');throw Error('请为晚间生活留出时间');})",page.sandbox);
 assert.equal(page.status.textContent,'请为晚间生活留出时间');assert.equal(page.status.focused,true);assert.equal(page.status.scrolled,true);assert.equal(page.button.disabled,false);assert.equal(page.cleared,1);
});
test('actual AI generation reports elapsed time and always restores buttons',async()=>{
 const page=context();vm.runInContext("activeState={ai:{key:'configured'},daily:{phase:'morning-incidents'}}",page.sandbox);
 const operation=vm.runInContext('operation(async()=>new Promise(resolve=>{globalThis.finish=resolve;}))',page.sandbox);
 assert.match(page.status.textContent,/AI 正在编排/);assert.equal(page.button.disabled,true);page.pending[0]();assert.match(page.status.textContent,/已等待 5 秒/);
 vm.runInContext('finish()',page.sandbox);await operation;assert.equal(page.button.disabled,false);assert.equal(page.cleared,1);
});
