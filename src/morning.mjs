import {validateSchedule,clock} from './day.mjs';
import {signScenario,verifyScenario} from './day-ai.mjs';
const pack=state=>({...state,token:signScenario('morning',[state])});
export function morningState(token,roleId,phase){
 const state=verifyScenario(token,'morning').rounds[0];
 if(state.roleId!==roleId||phase&&state.phase!==phase)throw Error('早晨记录与当前阶段不一致，请重新开始。');
 return state;
}
export function startMorning(settings,snooze,roleId,difficulty='normal',random=Math.random){
 const schedule=validateSchedule(settings);
 if(typeof snooze!=='boolean'||!['normal','difficult'].includes(difficulty))throw Error('请选择起床方式与体验难度。');
 const overslept=snooze&&random()<.7;
 const delay=overslept?15+Math.floor(random()*21):snooze?2:0;
 return pack({phase:'awake',roleId,difficulty,settings,snooze,overslept,wake:schedule.alarm+delay,wakeClock:clock(schedule.alarm+delay),delay});
}
export function prepareMorning(token,roleId,choices,random=Math.random){
 const state=morningState(token,roleId,'awake');
 for(const key of ['skipWash','skipBreakfast','checklist'])if(typeof choices?.[key]!=='boolean')throw Error('请确认早晨准备的三个选项。');
 const p=validateSchedule(state.settings),incidents=[];
 // Draw once here and keep all subsequent resolutions deterministic in the token.
 if(random()<(choices.checklist?.08:.25))incidents.push({id:'appliance',minutes:8,title:'发现家里的电器没有关',text:'出门后收到家人提醒，需要返回关闭电器并确认安全。这个环节不能靠忽略安全来省时间。'});
 if(!choices.checklist&&random()<.4)incidents.push({id:'materials',minutes:12,title:'工作资料忘在家里',text:'你发现今天要用的资料没有带。可以回去取，也可以联系同事寻找替代资料。'});
 if(!choices.checklist&&random()<.35)incidents.push({id:'reminder',minutes:0,title:'忘了同事昨天的嘱托',text:'同事提醒你：昨天约好的准备工作还没确认，上午需要补上。'});
 const wash=choices.skipWash?0:p.wash,breakfast=choices.skipBreakfast?0:p.breakfast;
 return pack({...state,phase:'prepared',choices:{...choices},incidents,wash,breakfast,checkMinutes:choices.checklist?5:0,bossNoticed:random()<.6});
}
export function resolveMorning(token,roleId,materialPlan){
 const state=morningState(token,roleId,'prepared'),p=validateSchedule(state.settings);
 if(!['return','digital'].includes(materialPlan))throw Error('请选择资料补救方式。');
 const materials=state.incidents.some(i=>i.id==='materials'),forgotReminder=state.incidents.some(i=>i.id==='reminder');
 const applianceMinutes=state.incidents.filter(i=>i.id==='appliance').reduce((n,i)=>n+i.minutes,0);
 const materialMinutes=materials?(materialPlan==='return'?12:4):0;
 const depart=state.wake+state.wash+state.breakfast+state.checkMinutes+applianceMinutes+materialMinutes;
 const arrival=depart+p.commute,lateMinutes=Math.max(0,arrival-p.startMinute),missedMeeting=lateMinutes>=10;
 const effects={energyDelta:(state.choices.skipBreakfast&&p.breakfast>0?-12:0)-applianceMinutes-(materials?4:0),moodDelta:(state.choices.skipWash?-4:0)-(materials?8:0)-(lateMinutes?8:0)-(forgotReminder?6:0),workPenalty:(materials&&materialPlan==='digital'?8:0)+(forgotReminder?8:0)+(missedMeeting?10:0)};
 const conditions=[];
 if(materials&&materialPlan==='digital')conditions.push('纸质资料缺失，需要说明如何获取或验证替代资料。');
 if(forgotReminder)conditions.push('同事昨天交代的准备工作尚未确认，需要补充核对与交接。');
 if(missedMeeting)conditions.push('你错过了上午会议开场，需要先补齐会议结论再推进任务。');
 return pack({...state,phase:'ready',materialPlan,depart,arrival,arrivalClock:clock(arrival),lateMinutes,missedMeeting,effects,conditions});
}
