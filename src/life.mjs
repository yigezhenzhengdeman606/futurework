// Shared, deterministic branch rules. A draw is made only when a choice is made.
export function socialEvents(day){
 const start=day.settings.startMinute,end=day.settings.endMinute;
 const options=[
  {id:'friends',text:'先沟通交接，赴约吃饭／游玩',feedback:'你说明了工作进度再赴约，获得陪伴，也留下了需要明天处理的任务。'},
  {id:'work',text:'坦白工作安排，改约另一天',feedback:'你把工作优先级说清楚，朋友理解了改期；今天少了一次放松。'},
  {id:'both',text:'全部都要：边赴约边处理工作',feedback:'这次安排衔接得还不错，但同时切换两件事让你额外疲惫。',failureFeedback:'两边都没做好：工作出现遗漏，你又一直看消息，让朋友觉得没有被认真陪伴。'}
 ];
 const home=day.events.find(e=>e.kind==='home').time;
 return [
  {time:start+30,kind:'social',socialId:'parents',actor:'父母',title:'父母发来消息：“最近过得好吗？”',text:'熟悉的头像亮起来。你刚忙完一阵，想让他们放心，也有一些压力想说。',options:[{id:'fine',text:'报喜不报忧：“我很好，别担心。”',feedback:'他们暂时放下心，没有继续追问。你获得片刻轻松，但这次没有说出真实压力。'},{id:'honest',text:'实话实说：最近有些累，想聊一聊',feedback:'他们听完没有急着给建议，愿意晚些时候再打电话。你得到了一点支持。'},{id:'later',text:'现在不方便，约好晚上再聊',feedback:'你说明现在在忙，也留下了一个可以认真交流的时间。'}]},
  {time:start+Math.floor((end-start)*.4),kind:'social',socialId:'old-friend',actor:'许久未见的朋友',title:'许久未见的朋友邀你下班后吃饭',text:'“好久没见了，我今天刚好在附近。要不要一起吃个饭？”你看了眼手里的任务。',options:options.map(o=>({...o}))},
  {time:end-20,kind:'social',socialId:'best-friend',actor:'好朋友',title:'好朋友邀你晚上散步或打游戏',text:day.overtime?'朋友的邀约遇上了加班通知。你需要说明自己的时间和精力，不能让两边都以为你会全程投入。':'工作即将告一段落。朋友想见你，你也想让待办清零。',options:options.map(o=>({...o}))},
  {time:home+10,kind:'relationship',socialId:'parent-followup',actor:'父母',title:'晚间，家人的后续消息',text:'你白天怎样回复，会改变这次对话。'},
  {time:home+20,kind:'relationship',socialId:'friend-followup',actor:'朋友',title:'回头看看，邀约和工作都怎么样了？',text:'你白天作出的取舍，已经留下不同的结果。'}
 ];
}
export function newLife(day){const effects=day.morning?.effects||{};return {energyDelta:(day.overtime?-20:0)+(effects.energyDelta||0),mood:Math.max(0,Math.min(100,(day.overtime?55:75)+(effects.moodDelta||0))),choices:{},workPenalty:effects.workPenalty||0,history:[]};}
export function chooseConsequence(life,event,index){
 if(event.kind!=='consequence'||!event.options?.[index]||life.choices[event.consequenceId])throw Error('本事件已处理或选择无效。');
 const option=event.options[index];life.energyDelta+=option.energy;life.mood=Math.max(0,Math.min(100,life.mood+option.mood));life.workPenalty=Math.max(0,life.workPenalty+option.work);
 const result={id:option.id,index,actor:event.actor||event.title,feedback:option.feedback};life.choices[event.consequenceId]=result;life.history.push(result);return result;
}
export function chooseSocial(life,event,index,difficulty,random=Math.random){
 if(event.kind!=='social'||!event.options?.[index]||life.choices[event.socialId])throw Error('社交选择无效或已经完成');
 const option=event.options[index];let energy=0,mood=0,failed=false;
 if(event.socialId==='parents'){
   if(option.id==='honest'){energy=8;mood=12;}else if(option.id==='fine'){mood=2;}else{mood=3;}
 }else if(option.id==='both'){
   failed=random()<(difficulty==='difficult'?.65:.35);
   energy=failed?-35:-15;mood=failed?-35:8;if(failed)life.workPenalty+=20;
 }else if(option.id==='friends'){energy=-5;mood=15;life.workPenalty+=8;}else{energy=-6;mood=-8;}
 life.energyDelta+=energy;life.mood=Math.max(0,Math.min(100,life.mood+mood));
 const result={id:option.id,index,failed,feedback:failed?option.failureFeedback:option.feedback,actor:event.actor,energy,mood};
 life.choices[event.socialId]=result;life.history.push(result);return result;
}
export function branchEvent(event,life){
 if(event.socialId==='parent-followup'){
   const id=life.choices.parents?.id;
   if(event.branches?.[id])return {...event,text:event.branches[id]};
   return {...event,text:id==='honest'?'父母按约打来电话，先听你讲今天的难处；你们商量用更舒服的方式保持联系。':id==='fine'?'父母以为你一切顺利，只发来一句“记得吃饭”。你仍可以下次主动讲出真实感受。':'你按照约好的时间回了电话，不用一边赶任务一边匆忙回应。'};
 }
 if(event.socialId==='friend-followup'){
   const choices=['old-friend','best-friend'].map(k=>life.choices[k]).filter(Boolean);
   return {...event,text:choices.map(c=>`${c.actor}：${c.feedback}`).join(' ')||'今天暂时没有留下邀约安排。'};
 }
 if(event.kind==='work'&&life.workPenalty)return {...event,branchNote:`此前的安排留下了 ${life.workPenalty} 点待办压力；这次更需要确认范围、说明进度与复核。`};
 return event;
}
export function wellbeing(life,workEnergy){return {energy:Math.max(0,Math.min(100,workEnergy+life.energyDelta)),mood:life.mood,workPressure:life.workPenalty};}
