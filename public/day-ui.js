import {apiUrl} from './config.js';
import {newLife,chooseSocial,branchEvent,wellbeing} from './life-model.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let activeState;
let busy=false;
function sceneArt(kind){
 const bed=['wake','sleep','reflect'].includes(kind);
 const commute=kind==='commute';
 const props=bed?'<path d="M60 154H330V210M70 154V128H158V154M60 154V210"/><rect x="161" y="130" width="169" height="24" rx="5"/><path d="M285 55a23 23 0 1 0 23 24a18 18 0 0 1-23-24"/>':commute?'<rect x="58" y="62" width="280" height="119" rx="20"/><path d="M68 118H328M125 63V176M270 63V176M100 193L83 215M293 193L309 215"/><circle cx="95" cy="153" r="8"/><circle cx="300" cy="153" r="8"/>':kind==='work'||kind==='arrival'?'<path d="M186 147H338M203 147V213M322 147V213"/><rect x="239" y="83" width="79" height="47" rx="4"/><path d="M278 131V144M255 103L266 111L255 118M301 103L290 111L301 118"/>':kind==='home'?'<path d="M68 113L194 36L325 113M92 102V211H302V102M172 211V146H226V211"/>':'<path d="M77 192H320M262 144V190M246 143H280M249 141L252 116H277L280 141"/>';
 return `<svg class="day-illustration day-art-${kind}" viewBox="0 0 400 240" aria-hidden="true"><g class="day-props">${props}</g><g class="day-person"><circle cx="169" cy="78" r="24"/><path d="M169 102V150M169 119L143 143M169 119L196 138M169 150L146 192M169 150L190 192"/><path d="M159 78H161M177 78H179M160 89Q169 95 178 89"/></g></svg>`;
}
function shell(content){return `<section class="day-world"><div class="day-toolbar"><span>FUTUREWORK / 人生副本</span><button type="button" class="day-small" data-view="experience">返回职业体验大厅 ↗</button></div>${content}<p class="day-error" role="status" aria-live="polite"></p></section>`;}
function setup(state){
 const p=state.daySettings||state.catalog.dayDefaults;
 const input=(key,label,type,min,max)=>`<div><label for="day-${key}">${label}</label><input id="day-${key}" name="${key}" type="${type}" value="${esc(p[key])}" ${type==='number'?`min="${min}" max="${max}" step="1"`:''} required></div>`;
 return shell(`<div class="day-setup"><span class="day-kicker">先为这一天，设定你的节奏</span><h2>${esc(state.scenario.title)}的一天</h2>${state.scenario.lifeMode?.hell?'<section class="day-hell-banner"><strong>地狱模式 · 高压虚构情境</strong><p>本职业默认提前上班，也可按你的实际情况调整上班时间。你也可以选择正常的一天；困难版本有更多突发和严重加班。这是游戏概率，不代表真实行业统计。教师和医生的现实任职需相应资质。</p></section>':''}<p>从什么时候起床，到什么时候关灯，由你的现实安排出发。${state.ai.key?'已连接 AI：确认起床选择后，将结合职业、档案和作息生成整天所有事件及全部职业决策反馈。':'当前为规则模式；连接 AI 后可生成整天的专属故事。'}</p><form id="day-setup-form"><label for="day-difficulty">选择这一天的版本</label><select id="day-difficulty" name="difficulty"><option value="normal" ${state.daily.difficulty==='normal'?'selected':''}>正常的一天 · 按时下班，较少突发</option><option value="difficult" ${state.daily.difficulty==='difficult'?'selected':''}>困难的一天 · 更多突发，90% 概率加班 3 小时</option></select><p class="day-hint">两种版本都会遇到父母、许久未见的朋友及好朋友。兼顾邀约和工作可能两边都没做好：普通模式概率 35%，困难模式 65%。均为剧情规则，不是现实统计。</p><div class="form-grid">${input('start','上班时间','time')}${input('end','下班时间','time')}${input('wash','洗漱与穿衣（分钟）','number',1,90)}${input('breakfast','早餐（分钟，可为 0）','number',0,60)}${input('commute','单程通勤（分钟，可为 0）','number',0,180)}${input('buffer','提前到岗预留（分钟，至少 2）','number',2,60)}${input('bed','准备睡觉的时间','time')}</div><p class="day-hint">闹钟 = 上班时间 − 洗漱 − 早餐 − 单程通勤 − 提前预留。起床时间将随设定自动调整。时刻均为北京时间的模拟时间。</p><button class="day-primary" type="submit">设好闹钟，开启这一天 →</button><p class="day-request-status" tabindex="-1" role="status" aria-live="polite"></p></form><details class="day-source"><summary>默认时间从哪里来？</summary><p>${state.scenario.lifeMode?.hell?'本模式默认作息为虚构高压剧情参数：教师 07:30–17:30、医生 08:00–17:00，不是行业调查数据。下方报道仅用于普通企业模式参考。':''}</p><p>${esc(state.catalog.scheduleSource.label)}</p><a href="${esc(state.catalog.scheduleSource.url)}" target="_blank" rel="noreferrer">查看公开报道 ↗</a><p>洗漱、早餐、通勤和睡觉时刻是可调整的游戏默认值，不是统计平均值。此副本采用日间企业工作场景，医疗轮班、现场作业等职业的真实安排可能不同。</p></details></div>`);
}
function alarm(state,d){return shell(`<div class="day-alarm"><span class="day-kicker">DAY 01 / ${esc(state.scenario.title)}</span><div class="day-time">${esc(d.alarm)}</div>${sceneArt('wake')}<h2 class="day-heading" tabindex="-1">闹钟响了，你选择……</h2><p>窗外的城市开始醒来。离上班还有一段洗漱、早餐和通勤。</p><div class="day-options"><button type="button" data-wake="false">直接起床 →</button><button type="button" data-wake="true">多睡两分钟 …</button></div><p class="day-hint">游戏规则：多睡两分钟有 70% 概率没能再次起床，直接导致迟到；另外 30% 仅晚起两分钟。这是剧情概率，不是现实统计。</p><button class="day-small" type="button" data-day-settings>修改作息</button><p class="day-request-status" tabindex="-1" role="status" aria-live="polite"></p></div>`);}
function workEnergy(state){return Math.max(0,100+state.choices.reduce((v,c,i)=>v+state.scenario.rounds[i].options[c].energy,0));}
function timeline(state,d){
 const event=branchEvent(d.result.events[d.index],d.life);
 const round=event.kind==='work'?state.scenario.rounds[event.round]:null;
 const social=event.kind==='social';const card=round||(social?event:null);const selected=d.feedback!==null;
 const levels=wellbeing(d.life,workEnergy(state));
 const feedback=social?d.life.choices[event.socialId]?.feedback:round?.options[d.feedback]?.feedback;
 return shell(`<div class="day-event ${selected?'day-settled':''}"><div class="day-event-meta"><span>${d.result.mode==='ai'?'AI 人生副本':'规则人生副本'} · ${d.result.difficulty==='difficult'?'困难的一天':'正常的一天'}</span><span>${d.index+1} / ${d.result.events.length} 幕</span></div><div class="day-clock-flash" aria-hidden="true">${esc(event.clock)}</div><div class="day-scene-content"><p class="day-hint">${esc(d.result.ai?.status||'规则版整日体验')}</p><div class="day-scene-time">${esc(event.clock)} <span>北京时间 · 模拟时刻</span></div>${sceneArt(event.kind)}${event.actor?`<span class="day-kicker">场外角色 / ${esc(event.actor)}</span>`:''}<h2 class="day-heading" tabindex="-1">${esc(event.title)}</h2><p class="day-narrative">${esc(round?round.text:event.text)}</p>${event.branchNote?`<p class="day-feedback">${esc(event.branchNote)}</p>`:''}${card?selected?`<div class="day-feedback">${esc(feedback)}</div><button class="day-primary" type="button" data-day-next>继续这一天 →</button>`:`<div class="day-options">${card.options.map((o,i)=>`<button type="button" ${social?'data-day-social':'data-day-choice'}="${i}">${esc(o.text)}</button>`).join('')}</div>`: `<button class="day-primary" type="button" data-day-next>${event.kind==='sleep'?'记录今天的感受 →':'继续 →'}</button>`}<div class="day-meters"><span>职业决策 ${state.choices.filter(Number.isInteger).length}/${state.scenario.rounds.length}</span><span>精力 ${levels.energy}/100</span><span>心情 ${levels.mood}/100</span><span>待办压力 ${levels.workPressure}</span></div>${levels.energy<25||levels.mood<25?'<p class="day-hint">你已经很疲惫或低落了。这是当日情境反馈，不是对你的能力或心理状态的诊断。</p>':''}</div></div>`);
}
function summary(state,d){return shell(`<div class="day-summary"><span class="day-kicker">DAY COMPLETE</span><div class="day-time">${esc(d.result.events.at(-1).clock)}</div><h2 class="day-heading" tabindex="-1">晚安，这一天辛苦了。</h2><p>你经历了 ${d.result.events.length} 幕日常与 ${state.scenario.rounds.length} 次职业决策。${d.result.snooze?'你选择了赖床。':'你选择了直接起床。'}${d.result.lateMinutes?`今天迟到 ${d.result.lateMinutes} 分钟。`:'你今天按时到岗。'}</p><p>${d.result.hell?'地狱模式：'+(d.result.overtime?'额外加班 '+d.result.overtimeMinutes+' 分钟。':'这次按时下班，没有加班。'):''}</p><p>当天精力 ${wellbeing(d.life,workEnergy(state)).energy}/100 · 心情 ${d.life.mood}/100 · 待办压力 ${d.life.workPenalty}</p><details class="day-source"><summary>关系与邀约的后续</summary>${d.life.history.map(h=>`<p>${esc(h.actor)}：${esc(h.feedback)}</p>`).join('')}</details><p class="day-hint">起床与迟到用于生活体验复盘，不作为职业能力评分。</p><form id="experience-form"><label for="day-enjoyment">过完这一天，你愿意继续从事这份工作的程度？</label><select id="day-enjoyment" name="enjoyment">${[1,2,3,4,5].map(v=>`<option value="${v}" ${v===3?'selected':''}>${v}/5 · ${['很不愿意','不太愿意','一般','比较愿意','非常愿意'][v-1]}</option>`).join('')}</select><button type="submit" class="day-primary">进入压力测试与再匹配 →</button></form><details class="day-source"><summary>今天的职业决策复盘</summary>${state.choices.map((c,i)=>`<p>${i+1}. ${esc(state.scenario.rounds[i].options[c].feedback)}</p>`).join('')}</details>${state.scenario.ai?`<section class="day-source"><h3>${esc(state.scenario.ai.status)}</h3><p class="ai-text">${esc(state.scenario.ai.text||'')}</p></section>`:''}</div>`);}
export function renderDaily(state){
 activeState=state;
 if(state.daily?.scenario!==state.scenario){if(state.scenario.lifeMode?.hell)state.daySettings={...(state.daySettings||state.catalog.dayDefaults),start:state.scenario.lifeMode.defaults.start,end:state.scenario.lifeMode.defaults.end};state.daily={scenario:state.scenario,phase:'setup',feedback:null,index:0,difficulty:state.scenario.lifeMode?.hell?'difficult':'normal'};}
 const d=state.daily;
 return `<div id="day-host">${d.phase==='setup'?setup(state):d.phase==='alarm'?alarm(state,d):d.phase==='summary'?summary(state,d):timeline(state,d)}</div>`;
}
function update(state){const host=document.querySelector('#day-host');if(!host||state!==activeState||state.view!=='simulation')return;host.outerHTML=renderDaily(state);if(state.daily.feedback===null)window.scrollTo({top:0,behavior:'instant'});document.querySelector('.day-heading')?.focus({preventScroll:true});}
async function request(url,data){
 try{
  const r=await fetch(apiUrl(url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(75000)});
  let result;try{result=await r.json();}catch{throw Error('服务返回异常，请确认本地服务正在运行后重试。');}
  if(!r.ok)throw Error(result.error||'请求失败，请重试');return result;
 }catch(error){if(error.name==='TimeoutError'||error.name==='AbortError')throw Error('请求超时，请确认服务正常后重试；本次未自动重复调用 AI。');if(error instanceof TypeError)throw Error('无法连接本地服务，请确认服务已启动后重试。');throw error;}
}
async function operation(fn){
 if(busy)return;busy=true;
 document.querySelectorAll('#day-host button').forEach(b=>b.disabled=true);
 const status=document.querySelector('#day-host .day-request-status')||document.querySelector('#day-host .day-error');
 const generating=activeState?.daily?.phase==='alarm';
 const ai=generating&&!!activeState?.ai?.key;
 const message=ai?'AI 正在编排你的一整天，通常需要十几秒，最多约一分钟…':generating?'正在准备今天的故事…':'正在校验作息并计算闹钟，不会调用 AI…';
 if(status)status.textContent=message;
 let elapsed=0;const timer=setInterval(()=>{elapsed+=5;if(status?.isConnected)status.textContent=message+' 已等待 '+elapsed+' 秒。';},5000);
 try{await fn();}catch(error){const el=document.querySelector('#day-host .day-request-status')||document.querySelector('#day-host .day-error');if(el){el.textContent=error.message;el.focus?.({preventScroll:true});el.scrollIntoView?.({block:'nearest',behavior:'instant'});}}
 finally{clearInterval(timer);busy=false;document.querySelectorAll('#day-host button').forEach(b=>b.disabled=false);}
}
document.addEventListener('submit',event=>{
 if(event.target.id!=='day-setup-form')return;
 event.preventDefault();const state=activeState,d=state.daily;const data=new FormData(event.target);d.difficulty=data.get('difficulty');const p={};for(const key of ['start','end','bed'])p[key]=data.get(key);for(const key of ['wash','breakfast','commute','buffer'])p[key]=Number(data.get(key));
 void operation(async()=>{const result=await request('/api/day/preview',{settings:p,roleId:state.scenario.roleId,customRoleToken:state.scenario.customRoleToken});if(state.daily!==d||state.view!=='simulation')return;state.daySettings=p;d.settings=p;d.alarm=result.alarm;d.phase='alarm';update(state);});
});
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b||busy||!activeState||activeState.view!=='simulation')return;
 const state=activeState,d=state.daily;if(!d)return;
 if(b.hasAttribute('data-day-settings')){d.phase='setup';return update(state);}
 if(b.dataset.wake!==undefined&&d.phase==='alarm')return void operation(async()=>{const result=await request('/api/day',{roleId:state.scenario.roleId,customRoleToken:state.scenario.customRoleToken,settings:d.settings,difficulty:d.difficulty,snooze:b.dataset.wake==='true',profile:state.profile,ai:state.ai});if(state.daily!==d||state.view!=='simulation')return;d.result=result;d.life=newLife(result);if(result.rounds)state.scenario.rounds=result.rounds;state.scenario.ai=result.ai;d.phase='timeline';d.index=0;d.feedback=null;state.choices=[];update(state);});
 if(b.dataset.daySocial!==undefined&&d.phase==='timeline'&&d.feedback===null){const e=d.result.events[d.index];try{chooseSocial(d.life,e,Number(b.dataset.daySocial),d.result.difficulty);d.feedback=Number(b.dataset.daySocial);update(state);}catch(error){document.querySelector('.day-error').textContent=error.message;}return;}
 if(b.dataset.dayChoice!==undefined&&d.phase==='timeline'&&d.feedback===null){const e=d.result.events[d.index];const choice=Number(b.dataset.dayChoice);if(e.kind!=='work'||!Number.isInteger(choice)||choice<0||choice>2)return;state.choices[e.round]=choice;d.feedback=choice;return update(state);}
 if(b.hasAttribute('data-day-next')&&d.phase==='timeline'){const e=d.result.events[d.index];if((e.kind==='work'||e.kind==='social')&&d.feedback===null)return;d.index++;d.feedback=null;if(d.index>=d.result.events.length)d.phase='summary';update(state);}
});
