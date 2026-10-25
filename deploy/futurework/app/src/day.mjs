import {socialEvents} from './life.mjs';
export const scheduleSource={url:'https://www.cnfin.com/gs-lb/detail/20211101/3443978_1.html',label:'新华财经转载报道（2021-11-01）：字节跳动 10:00–19:00；仅为历史报道参考，不代表当前或全部企业作息。'};
export const defaults={start:'10:00',end:'19:00',bed:'23:30',wash:25,breakfast:15,commute:45,buffer:10};
export function modeFor(roleId){
  const school=roleId==='school',physician=roleId==='physician';
  if(!school&&!physician)return {hell:false,defaults};
  return {hell:true,label:'地狱模式 · 高压虚构情境',defaults:{...defaults,start:school?'07:30':'08:00',end:school?'17:30':'17:00'},challenges:school?[
    '课间有学生突然情绪失控，同时家长发来紧急消息，下一节课还有十分钟开始。',
    '临时教务材料要求下午前提交，但你还要备课、批改作业并照顾不同学习进度的学生。',
    '放学前家校沟通和学生支持需求叠加，同事也在忙，交接信息还不完整。'
  ]:[
    '候诊人数增加，一位患者反映状况变化，家属焦虑询问，你需要及时联系有资质的团队评估与协调。',
    '记录系统暂时不可用，交接信息需要复核，多个服务请求同时排队。',
    '临近下班仍有待交接事项和焦虑的家属，需要明确责任边界并联系接班团队。'
  ]};
}
export function minutes(value){if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('时间格式应为 HH:MM');const [h,m]=value.split(':').map(Number);return h*60+m;}
export function clock(value){return `${value>=1440?'次日 ':''}${String(Math.floor(value/60)%24).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}
export function validateSchedule(raw){
  if(!raw||typeof raw!=='object')throw Error('请填写一天作息');
  const p={};for(const key of ['start','end','bed'])p[key]=raw[key];
  const start=minutes(p.start),end=minutes(p.end);let bed=minutes(p.bed);if(bed<360)bed+=1440;
  if(start<360||start>720||end<start+360||end>1380)throw Error('请设置 06:00–12:00 上班，下班至少晚 6 小时且不晚于 23:00');
  for(const [key,min,max] of [['wash',1,90],['breakfast',0,60],['commute',0,180],['buffer',2,60]]){if(!Number.isInteger(raw[key])||raw[key]<min||raw[key]>max)throw Error(`${key} 时长无效`);p[key]=raw[key];}
  const alarm=start-p.wash-p.breakfast-p.commute-p.buffer;
  if(alarm<0||bed<end+p.commute+60||bed>1620)throw Error('请为通勤、晚间生活及就寝留出时间（最晚次日 03:00）');
  return {...p,startMinute:start,endMinute:end,bedMinute:bed,alarm};
}
export function buildDay(raw,snooze,random=Math.random,roleId=null,options={}){
  const original=modeFor(roleId);if(options.difficulty!==undefined&&!['normal','difficult'].includes(options.difficulty))throw Error('请选择正常或困难模式');
  const mode={...original,hell:options.difficulty?options.difficulty==='difficult':original.hell,challenges:original.challenges||['临时任务与已有交付时间冲突，团队资源有限。','多个合作方要求同时调整方案，你需要重新协调优先级。','临近下班仍有未核实的交接事项，新的紧急请求又到了。']};
  const p=validateSchedule(raw);if(typeof snooze!=='boolean')throw Error('请选择直接起床或多睡两分钟');
  const overslept=snooze&&random()<0.7;
  const wake=overslept?Math.max(p.alarm+2,p.startMinute-p.wash-p.breakfast-p.commute+15):p.alarm+(snooze?2:0);
  const depart=wake+p.wash+p.breakfast,arrival=depart+p.commute;
  const workStart=Math.max(arrival,p.startMinute),span=p.endMinute-workStart;
  const events=[
    {time:wake,kind:'wake',title:overslept?'再次睁眼，已经睡过头了':snooze?'两分钟后，你按时醒来了':'你关掉闹钟，坐起身',text:overslept?'你以为只睡两分钟，实际上错过了闹钟。后面的洗漱、早餐和通勤都被推迟。':'新的一天开始。先把自己的节奏找回来。'},
    {time:wake,kind:'wash',title:'洗漱，更换今天的衣服',text:`洗脸、刷牙、整理仪容，按你的设置耗时 ${p.wash} 分钟。`},
    {time:wake+p.wash,kind:'breakfast',title:p.breakfast?'吃点早餐，再出门':'拿好随身物品，准备出门',text:p.breakfast?`用 ${p.breakfast} 分钟补充能量；今天还有不少需要判断的时刻。`:'你没有预留早餐时间；这是个人设定，不是健康建议。'},
    {time:depart,kind:'commute',title:p.commute?'走上通勤的路':'今天无需通勤',text:`单程 ${p.commute} 分钟。你在脑中整理今天的待办。`},
    {time:arrival,kind:'arrival',title:arrival>p.startMinute?`你迟到了 ${arrival-p.startMinute} 分钟`:'你按时到达工作地点',text:arrival>p.startMinute?'先向同事说明情况，再重新安排工作优先级。迟到不结束体验，你仍可以作出接下来的选择。':`距离上班还有 ${p.startMinute-arrival} 分钟，放下包、打开工作台。`},
    {time:workStart,kind:'work',round:0,title:'接到今天的职业任务'},
    {time:workStart+Math.floor(span*.28),kind:'lunch',title:'午饭与片刻休息',text:'离开屏幕，吃午饭、喝水。上午的选择还在影响你对这份工作的感受。'},
    {time:workStart+Math.floor(span*.45),kind:'work',round:1,title:'午后，计划发生了变化'},
    {time:workStart+Math.floor(span*.82),kind:'work',round:2,title:'交付之前，最后一道判断'},
    {time:p.endMinute,kind:'leave',title:'整理交接，结束工作',text:'记录尚未解决的问题，与同事确认下一步安排。这个副本不默认要求加班。'},
    {time:p.endMinute+p.commute,kind:'home',title:'终于回到自己的生活',text:'回程按相同通勤时长计算。吃晚饭、放松，和关心的人聊一聊，暂时把工作放下。'},
    {time:p.bedMinute-30,kind:'reflect',title:'睡前半小时，回顾今天',text:'这份职业让你更有成就感，还是持续消耗你？带着今天的真实感受，而不是职位名称，作出下一次选择。'},
    {time:p.bedMinute,kind:'sleep',title:'关灯，晚安',text:'这一天结束了。你已经经历了起床、通勤、工作决策和晚间生活，接下来记录你对这份职业的感受。'}
  ];
  const overtime=mode.hell&&random()<.9;
  const overtimeMinutes=overtime?(options.difficulty==='difficult'?180:90):0;
  if(mode.hell){
    for(let i=0;i<3;i++)events.push({time:workStart+Math.floor(span*[.15,.6,.92][i]),kind:'work',round:i+3,title:'高压突发 · 多方需求叠加',text:mode.challenges[i]});
    events.push({time:workStart+Math.floor(span*.34),kind:'interruption',title:'刚准备休息，又收到一条待办',text:'你的休息被临时沟通打断。先确认是否真的紧急，能否交接或稍后集中处理；持续透支精力不是唯一选择。'});
    const leave=events.find(e=>e.kind==='leave');leave.title='正常下班时间到了';leave.text=overtime?'原定下班时间保持不变，但抽中了 90% 加班分支：新增任务和交接需要继续处理额外任务。':'这次没有抽中加班分支。你完成交接，按原计划结束工作。';
    if(overtime){events.push({time:p.endMinute,kind:'overtime',title:'加班开始 · 待办还没清空',text:mode.challenges[2]+' 先列出必须完成与可以交接的事项，明确支援需求。'});events.push({time:p.endMinute+overtimeMinutes,kind:'overtime-end',title:'加班结束，完成交接',text:'完成了本次额外工作。确认信息已交接后，离开工作地点。'});}
    events.find(e=>e.kind==='home').time+=overtimeMinutes;
    const actualBed=Math.max(p.bedMinute,p.endMinute+overtimeMinutes+p.commute+60);
    events.find(e=>e.kind==='reflect').time=actualBed-30;events.find(e=>e.kind==='sleep').time=actualBed;
    if(actualBed>p.bedMinute)events.find(e=>e.kind==='sleep').text+=' 加班和通勤压缩了晚间时间，就寝也被推迟。';
    events.sort((a,b)=>a.time-b.time);
  }
  if(options.difficulty){const context={settings:p,events,overtime};events.push(...socialEvents(context));events.sort((a,b)=>a.time-b.time);}
  return {difficulty:mode.hell?'difficult':'normal',settings:p,alarm:clock(p.alarm),overslept,snooze,hell:mode.hell,overtime,overtimeMinutes,lateMinutes:Math.max(0,arrival-p.startMinute),events:events.map(e=>({...e,clock:clock(e.time)})),rule:`赖床 70% 睡过头；${mode.hell?'困难模式 90% 概率加班 '+(options.difficulty==='difficult'?180:90)+' 分钟':'正常模式按时下班'}。全部为游戏设定，不是现实统计。`};
}
