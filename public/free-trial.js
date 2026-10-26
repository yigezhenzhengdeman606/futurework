import {apiUrl} from './config.js';
import {getLocale} from './i18n.js';
const deviceKey='futurework-trial-device',tokenKey='futurework-trial-token';
let currentStatus=null,pending=false;
export function trialDevice(){
 try{let device=localStorage.getItem(deviceKey);if(!device){device=crypto.randomUUID();localStorage.setItem(deviceKey,device);}return device;}
 catch{throw Error('请允许浏览器保存领取凭证，或使用自己的 API 和无 AI 模式。');}
}
export function savedTrial(){
 try{const token=localStorage.getItem(tokenKey);return /^[a-f0-9]{64}$/.test(token||'')?{provider:'deepseek',model:'deepseek-flash',key:'',trialToken:token}:null;}catch{return null;}
}
export async function trialRequest(route,data={}){
 const response=await fetch(apiUrl('/api/trial/'+route),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deviceId:trialDevice(),...data}),signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'请求失败');return result;
}
export function freeTrialPanel(){return `<section class="free-trial-panel" data-free-trial-panel><span class="eyebrow">FUTUREWORK · 免费体验</span><h2>每位用户可领取一次，平台体验额度用完即止。</h2><p>首批提供 15 个免费名额，平台承担一次职业探索的 API 费用，无需填写密钥。</p><p class="muted">包含专属问题、一份职业报告、一个职业的一天，以及一次压力测试再匹配或独立体验复盘；不包含无限换职业、反复生成及行业 AI 解读。实际可用以平台预算和服务状态为准。</p><p data-trial-status role="status" aria-live="polite">正在查询免费体验名额…</p><label class="welcome-consent"><input type="checkbox" data-trial-consent> 我同意将本次职业资料发送给 DeepSeek，并由平台保存领取记录及生成结果，用于限制次数和恢复结果。</label><button type="button" class="primary" data-trial-claim>领取一次免费 AI 体验 ↗</button><p class="muted">免费体验与费用报销二选一。未领取的用户可使用自己的 API 完成一次体验，再凭实际消费申请报销，最高 CNY 1 元。</p><p class="muted">领取凭证保存在当前浏览器。此版本不验证真实身份，更换设备或清除浏览器数据可能导致无法恢复；平台总名额及调用预算仍由后台限制。</p></section>`;}
export function refreshTrialPanels(){
 for(const panel of document.querySelectorAll('[data-free-trial-panel]')){
  const status=panel.querySelector('[data-trial-status]'),button=panel.querySelector('[data-trial-claim]');
  if(!currentStatus){button.disabled=true;continue;}
  status.textContent=currentStatus.claimed?'你已领取一次免费体验，可继续使用尚未完成的环节。':currentStatus.reimbursement?'你已选择一次体验报销，请使用自己的 API。':currentStatus.reason||`当前剩余 ${currentStatus.remaining} 个免费名额。`;
  button.textContent=currentStatus.claimed?'继续我的免费体验 ↗':'领取一次免费 AI 体验 ↗';
  button.disabled=pending||!currentStatus.enabled||currentStatus.reimbursement||(!currentStatus.claimed&&!currentStatus.remaining);
  const consent=panel.querySelector('[data-trial-consent]');consent.closest('label').hidden=!!currentStatus.claimed;
 }
}
export async function refreshTrialStatus(){
 try{currentStatus=await trialRequest('status');refreshTrialPanels();}
 catch(error){for(const status of document.querySelectorAll('[data-trial-status]'))status.textContent='免费名额暂时无法查询；仍可使用自己的 API 或无 AI 模式。';}
}
if(typeof document!=='undefined'){
 for(const slot of document.querySelectorAll('[data-free-trial-slot]'))slot.innerHTML=freeTrialPanel();
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-trial-claim]');if(!button||pending)return;
  const panel=button.closest('[data-free-trial-panel]'),status=panel.querySelector('[data-trial-status]');
  if(!currentStatus?.claimed&&!panel.querySelector('[data-trial-consent]').checked){status.textContent='请先同意免费体验的数据处理说明。';return;}
  pending=true;refreshTrialPanels();status.textContent='正在领取，请稍候…';let failure;
  try{
   const result=await trialRequest('claim',{consent:true});localStorage.setItem(tokenKey,result.token);currentStatus=result;
   document.dispatchEvent(new CustomEvent('ai-configured',{detail:{...savedTrial(),locale:getLocale()}}));
   const welcome=document.querySelector('#ai-welcome');if(welcome?.open){welcome.close();document.querySelector('#ai-welcome-form')?.reset();document.body.classList.remove('intro-playing');document.querySelector('main')?.focus({preventScroll:true});}
  }catch(error){failure=error.message;}
  finally{pending=false;refreshTrialPanels();if(failure)status.textContent=failure;}
 });
 void refreshTrialStatus();
}
