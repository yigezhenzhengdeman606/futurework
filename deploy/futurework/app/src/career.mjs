import {modeFor} from './day.mjs';
import {verifyScenario} from './day-ai.mjs';
export const sdgs = ['无贫穷','零饥饿','良好健康与福祉','优质教育','性别平等','清洁饮水和卫生设施','经济适用的清洁能源','体面工作和经济增长','产业、创新和基础设施','减少不平等','可持续城市和社区','负责任消费和生产','气候行动','水下生物','陆地生物','和平、正义与强大机构','促进目标实现的伙伴关系'];
export const roles = [
  {id:'analyst',name:'可持续发展数据分析师',industry:'商业与金融',risk:62,skills:['数据分析','Excel','沟通','可持续发展'],sdgs:[8,9,12,13],pressure:4,task:'为一家制造企业分析能耗记录，找出最值得优先改进的环节。',artifact:'一页能耗异常分析与减排建议'},
  {id:'educator',name:'AI 学习体验设计师',industry:'教育',risk:35,skills:['教学','写作','沟通','AI工具'],sdgs:[4,5,10],pressure:2,task:'为数字技能较弱的转岗员工设计一节 AI 入门课。',artifact:'包含练习和无障碍说明的 30 分钟教案'},
  {id:'care',name:'社区健康协调员',industry:'医疗与照护',risk:21,skills:['沟通','照护','项目管理'],sdgs:[1,3,10,11],pressure:4,task:'社区老人预约冲突，志愿者不足，安排有限的上门服务。',artifact:'按需求紧急程度排序的服务排班表'},
  {id:'governance',name:'AI 治理与质量专员',industry:'科技',risk:32,skills:['写作','数据分析','沟通','风险管理'],sdgs:[5,9,10,16],pressure:4,task:'招聘模型对不同群体给出明显不同的推荐结果，需要决定是否上线。',artifact:'风险登记表与人工复核流程'},
  {id:'energy',name:'清洁能源项目协调员',industry:'能源与制造',risk:27,skills:['项目管理','沟通','可持续发展'],sdgs:[6,7,9,13],pressure:3,task:'协调社区屋顶光伏试点，兼顾预算、居民意见和交付日期。',artifact:'包含预算和居民沟通计划的项目里程碑'},
  {id:'circular',name:'循环经济运营专员',industry:'零售与运营',risk:39,skills:['Excel','项目管理','沟通','可持续发展'],sdgs:[2,8,11,12,14,15,17],pressure:3,task:'门店积压物资面临报废，需要设计再利用及公益合作方案。',artifact:'物资分类、再利用和合作伙伴清单'},
  {id:'school',name:'中小学教师（小／初／高）',industry:'教育',risk:28,skills:['教学','沟通','项目管理'],sdgs:[4,10],pressure:5,task:'课堂准备、学生突发状况、家校沟通与教务截止时间同时出现，你需要安排先后顺序。',artifact:'包含课堂、学生支持与家校沟通的日计划'},
  {id:'physician',name:'临床医生',industry:'医疗与照护',risk:25,skills:['照护','沟通','风险管理'],sdgs:[3,10],pressure:5,task:'门诊接诊、患者诉求和病区交接同时到来，需要在团队支持下安排优先级。',artifact:'不含诊疗指令的就诊协调与交接记录'}
];
export const industries = [
  {name:'行政与客服',base:79,keywords:['assistant','customer','office','automation'],decline:'重复录入、标准问答',emerge:'服务流程设计、复杂问题协调'},
  {name:'商业与金融',base:68,keywords:['finance','analysis','reasoning'],decline:'标准报表、基础检索',emerge:'数据解释、合规与风险决策'},
  {name:'教育',base:44,keywords:['education','learning','tutor'],decline:'通用课件制作',emerge:'学习体验设计、个性化辅导'},
  {name:'医疗与照护',base:31,keywords:['health','medical','clinical'],decline:'基础文书整理',emerge:'健康协调、医疗 AI 质量管理'},
  {name:'科技',base:64,keywords:['coding','agent','software'],decline:'重复代码与基础测试',emerge:'AI 治理、系统验证'},
  {name:'能源与制造',base:41,keywords:['energy','robot','manufactur'],decline:'例行巡检与调度',emerge:'清洁能源协调、设备协作'},
  {name:'零售与运营',base:58,keywords:['retail','supply','logistic'],decline:'基础库存预测',emerge:'循环经济运营、供应链韧性'}
];
export const profileOptions = {
  interests:['阅读写作','编程与科技','数据与逻辑','绘画与设计','教学分享','志愿服务','健康运动','自然环保','动手制作','组织活动','商业经营','其他'],
  major:['未选择 / 暂无','计算机与信息技术','数学与统计','经济与金融','工商管理','教育学','医学与护理','环境与能源','工程与制造','文学与传媒','艺术与设计','法律与公共管理','其他'],
  workStyle:['暂不确定','偏好独立分析','偏好团队协作','偏好与人交流','偏好动手实践'],
  transitionGoal:['暂不确定','在原行业升级技能','探索跨行业转型','寻找更有社会价值的工作','优先选择压力较低的方向'],
  learningStyle:['暂不确定','短课程与练习','真实项目实践','阅读与自主学习','导师指导与交流'],
  experienceLevel:['暂不填写','在校 / 尚无工作经验','工作 1–3 年','工作 4–7 年','工作 8 年及以上']
};
const rolePreferences = {
  school:{interests:['教学分享','阅读写作'],major:['教育学'],workStyle:['偏好与人交流','偏好团队协作']},
  physician:{interests:['健康运动','志愿服务'],major:['医学与护理'],workStyle:['偏好与人交流','偏好团队协作']},
  analyst:{interests:['数据与逻辑','商业经营'],major:['数学与统计','经济与金融','工商管理'],workStyle:['偏好独立分析']},
  educator:{interests:['教学分享','阅读写作','绘画与设计'],major:['教育学','文学与传媒','艺术与设计'],workStyle:['偏好与人交流']},
  care:{interests:['志愿服务','健康运动','组织活动'],major:['医学与护理','教育学'],workStyle:['偏好与人交流']},
  governance:{interests:['编程与科技','数据与逻辑','阅读写作'],major:['计算机与信息技术','法律与公共管理'],workStyle:['偏好独立分析','偏好团队协作']},
  energy:{interests:['自然环保','动手制作','组织活动'],major:['环境与能源','工程与制造'],workStyle:['偏好动手实践','偏好团队协作']},
  circular:{interests:['自然环保','商业经营','志愿服务'],major:['工商管理','环境与能源'],workStyle:['偏好团队协作','偏好动手实践']}
};
function learningAdvice(p) {
  const style={'短课程与练习':'每次安排 20–30 分钟短课，完成一个小练习。','真实项目实践':'从真实或公开数据出发，边做作品集边补知识。','阅读与自主学习':'先阅读入门资料，写下学习笔记并用案例验证。','导师指导与交流':'每周找导师或同行讨论一次，请对方评阅你的练习。'};
  const stage=p.experienceLevel==='在校 / 尚无工作经验'?'先做入门练习与模拟项目，积累第一份可展示作品。':p.experienceLevel&&p.experienceLevel!=='暂不填写'?'从已有工作案例中选一个任务，将旧经验迁移到新工具与流程。':'';
  const obstacle=p.answers?.obstacle==='学习时间有限'?'将每周学习拆成短时段，先交付最小作品。':p.answers?.obstacle==='缺少实践经验'?'优先完成模拟项目，再寻找实习或志愿实践机会。':p.answers?.obstacle==='不了解岗位要求'?'先阅读岗位要求并访谈一位从业者。':'';
  const foundation=p.answers?.confidence==='刚入门'?'先补基础概念，不直接跳到复杂项目。':'';
  return [style[p.learningStyle]||'通过基础练习和同行反馈逐步验证能力。',stage,obstacle,foundation].filter(Boolean).join(' ');
}
export function questionSet(p) {
  const target=roles.find(r=>rolePreferences[r.id].major.includes(p.major))||roles.find(r=>rolePreferences[r.id].interests.some(i=>(p.interests||[]).includes(i)))||roles.find(r=>r.industry===p.industry)||roles[0];
  return {context:`根据你的${p.majorDetail||p.major||'专业方向'}、兴趣和行业，先以「${target.name}」作为探索案例；这不是对你专业或能力的认定。`,questions:[
    {id:'focus',label:`面对「${target.task}」这样的任务，你最愿意深入哪项能力？`,options:target.skills},
    {id:'confidence',label:`结合你${p.experienceLevel&&p.experienceLevel!=='暂不填写'?'的'+p.experienceLevel+'经历':'目前的经历'}，你对这类专业实践的准备程度如何？`,options:['刚入门','有基础但缺少作品','已有可展示的项目']},
    {id:'obstacle',label:`每周计划投入 ${p.hours} 小时学习，你当前最希望解决的障碍是什么？`,options:['学习时间有限','缺少实践经验','不了解岗位要求','暂时没有明显障碍']}
  ]};
}
export function validateProfile(p) {
  if (!p || typeof p !== 'object' || typeof p.occupation !== 'string' || !p.occupation.trim() || p.occupation.length > 100) throw new Error('请填写当前职业（100 字以内）');
  if (!industries.some(i=>i.name===p.industry)) throw new Error('请选择有效行业');
  if (!Array.isArray(p.skills) || p.skills.length>30 || p.skills.some(s=>typeof s!=='string'||s.length>50)) throw new Error('技能格式无效');
  if (!Array.isArray(p.goals) || p.goals.some(g=>!Number.isInteger(g)||g<1||g>17)) throw new Error('SDG 目标无效');
  if (!Number.isFinite(p.hours)||p.hours<1||p.hours>40) throw new Error('每周学习时间应为 1–40 小时');
  if(p.interests!==undefined&&(!Array.isArray(p.interests)||p.interests.length>profileOptions.interests.length||p.interests.some(v=>!profileOptions.interests.includes(v))))throw new Error('请选择有效兴趣爱好');
  for(const field of ['major','workStyle','transitionGoal','learningStyle','experienceLevel'])if(p[field]!==undefined&&!profileOptions[field].includes(p[field]))throw new Error('补充资料选项无效');
  if(p.majorDetail!==undefined&&(typeof p.majorDetail!=='string'||p.majorDetail.length>100))throw new Error('具体专业请填写 100 字以内');
  if(p.interestDetail!==undefined&&(typeof p.interestDetail!=='string'||p.interestDetail.length>200))throw new Error('其他兴趣爱好请填写 200 字以内');
  if(p.major==='其他'&&!p.majorDetail?.trim())throw new Error('选择其他专业后，请填写具体专业');
  if(p.interests?.includes('其他')&&!p.interestDetail?.trim())throw new Error('选择其他兴趣后，请填写兴趣爱好');
  if(p.personalAnswers!==undefined&&(!Array.isArray(p.personalAnswers)||p.personalAnswers.length>2||p.personalAnswers.some(a=>!a||typeof a.question!=='string'||a.question.length>400||typeof a.answer!=='string'||!a.answer.trim()||a.answer.length>500)))throw new Error('专属开放问题答案无效');
  if(p.relatedWork!==undefined&&!['yes','no'].includes(p.relatedWork))throw new Error('请选择是否从事专业相关工作');
  if(p.answers!==undefined){
    if(!p.answers||typeof p.answers!=='object'||Array.isArray(p.answers)||Object.keys(p.answers).some(k=>!['focus','confidence','obstacle'].includes(k)))throw new Error('专属问题答案无效');
    for(const q of questionSet(p).questions)if(!q.options.includes(p.answers[q.id]))throw new Error('请完整回答专属问题');
  }
  return {...p, occupation:p.occupation.trim()};
}
export function marketRows(snapshot) {
  return industries.map(i=>{
    const hits=(snapshot.items||[]).filter(x=>i.keywords.some(k=>x.title.toLowerCase().includes(k))).length;
    return {...i,signals:hits,exposure:Math.min(95,i.base+Math.min(hits,8)),change:Math.min(hits,8)};
  });
}
export const workContextDimensions=['节奏变化','信息不确定','沟通协调','持续调整'];
export function match(profile, experience=null, stress=null, limit=3) {
  return roles.map(r=>{
    const overlap=r.skills.filter(s=>profile.skills.includes(s));
    const goals=r.sdgs.filter(g=>profile.goals.includes(g));
    const preference=experience?.roleId===r.id ? (experience.enjoyment-3)*5+(Number.isFinite(experience.quality)?Math.round((experience.quality-4)/2):0)+(!experience.taskAssessment&&experience.energy<50?-3:0) : 0;
    // Self-reported willingness is a preference, not a capacity or health measure.
    // Distance changes relative scores; adding the user's value to every role does not.
    const contextMatch=stress?{preferredIntensity:stress.preferredIntensity,scenarioIntensity:r.pressure,distance:Math.abs(stress.preferredIntensity-r.pressure)}:null;
    if(contextMatch)contextMatch.adjustment=contextMatch.distance?-3*contextMatch.distance:0;
    const preferenceAdjustment=contextMatch?.adjustment||0;
    const prefs=rolePreferences[r.id];
    const interests=prefs.interests.filter(s=>(profile.interests||[]).includes(s));
    const majorMatch=profile.relatedWork!=='no'&&prefs.major.includes(profile.major);
    const styleMatch=prefs.workStyle.includes(profile.workStyle);
    const transition=profile.relatedWork==='no'?(profile.industry!==r.industry?3:0):profile.transitionGoal==='在原行业升级技能'?(profile.industry===r.industry?5:0):profile.transitionGoal==='探索跨行业转型'?(profile.industry!==r.industry?3:0):profile.transitionGoal==='寻找更有社会价值的工作'?goals.length*2:profile.transitionGoal==='优先选择压力较低的方向'?(4-r.pressure)*4:0;
    const focusMatch=profile.relatedWork==='yes'&&r.skills.includes(profile.answers?.focus);
    const score=Math.max(10,Math.min(98,45+overlap.length*8+goals.length*3+(profile.industry===r.industry?8:0)+preference+preferenceAdjustment+Math.min(interests.length,2)*3+(majorMatch?5:0)+(styleMatch?3:0)+transition+(focusMatch?4:0)));
    const gaps=r.skills.filter(s=>!overlap.includes(s));
    return {...r,score,overlap,gaps,...(contextMatch?{contextMatch}:{}),reason:`${overlap.length} 项可迁移技能 · ${goals.length} 项共同 SDG 目标${interests.length?` · 兴趣契合：${interests.join('、')}`:''}${majorMatch?' · 专业方向相关（不等于已有职业能力）':''}${styleMatch?' · 工作方式契合':''}${focusMatch?' · 符合专属问题中的学习意向':''}${transition?' · 已纳入转型目标':''}${experience?.roleId===r.id?' · 已纳入体验偏好':''}${stress?' · 已比较工作情境偏好':''}`,path:(gaps.length?gaps:['职业作品集']).map((skill,index)=>({skill,sdgs:r.sdgs,weeks:Math.ceil(12/profile.hours),action:`阶段 ${index+1}：学习${skill}，完成「${r.artifact}」中的相关部分；请同行评阅并修改。${learningAdvice(profile)}`}))};
  }).sort((a,b)=>b.score-a.score).slice(0,limit);
}
export function report(p,snapshot,experience=null,stress=null) {
  validateProfile(p);
  if(p.relatedWork==='yes'&&!p.answers)throw new Error('请先完成专属问题');
  const impact=marketRows(snapshot).find(i=>i.name===p.industry);
  return {generatedAt:new Date().toISOString(),mode:'rules',transitionAdvice:p.relatedWork==='no'?'你选择了不以主修专业作为就业限制。推荐已取消专业相关加分，并适度增加跨行业探索权重；优先参考已有技能、兴趣和工作偏好。建议先体验一个新方向，再完成小型作品集、访谈从业者，并核实岗位门槛。专业相关职业仍可能因其他条件匹配而出现。':null,profileSummary:{occupation:p.occupation,major:p.major,majorDetail:p.majorDetail,interestDetail:p.interests?.includes('其他')?p.interestDetail:undefined,interests:p.interests,workStyle:p.workStyle,transitionGoal:p.transitionGoal,learningStyle:p.learningStyle,experienceLevel:p.experienceLevel,relatedWork:p.relatedWork,answers:p.answers,personalAnswers:p.personalAnswers,hours:p.hours},impact,matches:match(p,experience,stress),method:'行业基线为产品演示规则，并非 ILO 官方分数；当期相关研究标题命中数最多增加 8 点，仅表示技术信号强度。不是失业概率或薪资预测。匹配分是技能、目标和个人体验的启发式排序。',sourceUpdatedAt:snapshot.lastSuccess||null};
}
export function scenario(roleId,difficulty=null) {
  const r=roles.find(x=>x.id===roleId);
  if(!r) throw new Error('职业不存在');
  const result={roleId,title:r.name,task:r.task,artifact:r.artifact,lifeMode:modeFor(roleId),rounds:[
    {title:'09:00 · 接到任务',text:r.task,options:[{text:'先确认受影响人群、目标和限制',quality:3,energy:-8,feedback:'你先明确需求，减少返工，也为弱势群体保留了表达机会。'},{text:'直接用 AI 生成并提交方案',quality:1,energy:-3,feedback:'节省时间，但未验证的数据与假设会成为后续风险。'},{text:'独自收集全部资料再行动',quality:2,energy:-18,feedback:'信息更充分，但需要注意时间成本和团队协作。'}]},
    {title:'13:00 · 突发变化',text:`截止时间提前，合作方质疑你的${r.artifact}。你如何应对？`,options:[{text:'重新划定范围，优先保护关键需求',quality:3,energy:-12,feedback:'你通过沟通控制范围，保留可验证的最低交付。'},{text:'承诺全部完成，独自加班',quality:1,energy:-30,feedback:'短期维持承诺，但持续透支精力不可持续。'},{text:'请求同事复核并调整安排',quality:3,energy:-8,feedback:'协作与复核降低了错误，也体现了体面工作的价值。'}]},
    {title:'17:00 · 交付与复盘',text:'AI 给出的关键结论没有证据支持，交付窗口即将关闭。',options:[{text:'标注不确定性，人工核实后交付',quality:3,energy:-10,feedback:'透明与验证提高可信度；下一步补齐证据。'},{text:'隐藏不确定性，按时提交',quality:0,energy:-2,feedback:'忽略不确定性可能影响真实人群，需要重新审视责任。'},{text:'取消全部交付',quality:1,energy:-15,feedback:'避免错误但也失去价值，可以尝试交付已验证部分。'}]}
  ]};
  if(difficulty==='difficult'||(difficulty===null&&result.lifeMode.hell)){for(const text of result.lifeMode.challenges||['临时任务与原有交付冲突，团队资源有限。','多方同时要求变更，需要重新协调范围与优先级。','下班前收到紧急请求，交接资料仍需要核实。'])result.rounds.push({title:'高压突发事件',text,options:[{text:'先确认紧急程度，联系团队协调并记录交接',quality:3,energy:-13,feedback:'你识别优先级并及时寻求支持，保护服务对象也保护自己。'},{text:'把所有事情都揽下来，不请求支援',quality:1,energy:-25,feedback:'责任心不能替代资源配置；独自承担会增加疲惫与差错风险。'},{text:'先说明当前负荷，明确交付边界并安排复核',quality:3,energy:-10,feedback:'清晰沟通与复核让高压任务更可控，但仍需要团队分担。'}]});}
  return result;
}
export function evaluateExperience(e,verifiedScenario=null) {
  if(e?.taskAssessmentToken){
    const task=verifyScenario(e.taskAssessmentToken,'task-assessment').rounds[0];
    if(task.roleId!==e.roleId||!Number.isInteger(e.enjoyment)||e.enjoyment<1||e.enjoyment>5)throw Error('作品反馈与职业记录不一致。');
    const lifeDelta=Number.isFinite(e.daySummary?.energyDelta)?Math.max(-100,Math.min(100,e.daySummary.energyDelta)):0;
    return {...e,roleTitle:task.roleTitle,quality:null,energy:Math.max(0,Math.min(100,100-task.submittedRounds*8+lifeDelta)),taskAssessment:task,feedback:task.criteria.map(c=>c.feedback),qualityBasis:'模拟作品学习反馈，不作为经过验证的职业能力评分'};
  }
  const s=verifiedScenario||scenario(e?.roleId);
  if(!Array.isArray(e.choices)||e.choices.length!==s.rounds.length||e.choices.some(c=>!Number.isInteger(c)||c<0||c>2)||!Number.isInteger(e.enjoyment)||e.enjoyment<1||e.enjoyment>5) throw new Error('请完成全部职业决策并填写喜好程度');
  const selected=e.choices.map((c,i)=>s.rounds[i].options[c]);
  return {...e,roleTitle:s.title||scenario(e.roleId).title,energy:Math.max(0,100+selected.reduce((v,c)=>v+c.energy,0)),quality:Math.round(selected.reduce((v,c)=>v+c.quality,0)*3/selected.length),rawQuality:selected.reduce((v,c)=>v+c.quality,0),maxQuality:selected.length*3,feedback:selected.map(c=>c.feedback)};
}
export function evaluateStress(s) {
  if(!s||!Array.isArray(s.answers)||s.answers.length!==4||Array.from(s.answers).some(a=>!Number.isInteger(a)||a<1||a>5)) throw new Error('请完成四项工作情境偏好选择');
  if(s.questions!==undefined&&(!Array.isArray(s.questions)||s.questions.length!==4||Array.from(s.questions).some(q=>typeof q!=='string'||!q.trim()||q.length>400)))throw new Error('工作情境偏好问题无效');
  const preferredIntensity=s.answers.reduce((a,b)=>a+b,0)/4;
  // Keep the historical API alias during rollout; it is never a capacity score.
  return {assessmentVersion:'work-context-v2',questions:s.questions,answers:[...s.answers],responses:s.answers.map((value,index)=>({dimension:workContextDimensions[index],value})),preferredIntensity,tolerance:preferredIntensity,note:'回答只表示你目前愿意接受的工作情境，不代表抗压能力、职业能力或心理健康状况。均值仅是探索性偏好摘要，不是经验证的心理量表。'};
}
