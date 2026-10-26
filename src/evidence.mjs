// Product scenarios, not measured automation probabilities or employment forecasts.
const taskSets={
 '行政与客服':[['标准问答与资料录入','复杂投诉与跨团队协调','知识库维护与 AI 回复复核']],
 '商业与金融':[['标准报表与资料检索','解释异常、核实证据与风险决策','自动分析结果审计与数据质量管理']],
 '教育':[['通用课件初稿与练习题草拟','判断学生误区、课堂管理与个别支持','AI 教学材料核验与学习活动设计']],
 '医疗与照护':[['非诊疗文书初稿与预约整理','面对面沟通、照护协调与专业责任','医疗 AI 输出复核与数据质量管理']],
 '科技':[['样板代码与测试用例初稿','需求澄清、架构取舍与安全验证','AI 系统评测、治理与上线监控']],
 '能源与制造':[['例行记录整理与巡检报告草拟','现场安全判断与多方资源协调','设备数据核验与人机协作流程设计']],
 '零售与运营':[['库存汇总与标准商品文案','供应中断协调与客户关系处理','预测结果复核与循环利用运营']]
};
export function taskImpact(profile,snapshot){
 const teacher=/教师|老师|teacher|guru/i.test(profile.occupation);
 const industry=teacher?'教育':profile.industry;
 const [tasks]=taskSets[industry];
 return {occupation:profile.occupation,scope:teacher?'教师岗位任务示例':'所选行业任务示例，尚未核实你的实际职责',basis:'产品编辑的定性情境分析；不是对该岗位的统计预测。请与实际工作职责逐项核对。',updatedAt:snapshot.lastSuccess||null,items:[
  {kind:'更容易自动化',task:tasks[0],reason:'输入和输出相对标准，AI 可协助草拟；敏感信息、事实与错误仍需人工复核。'},
  {kind:'需要人主导',task:tasks[1],reason:'涉及现实情境、关系、责任与取舍；AI 辅助不等于可以取消人的职责。'},
  {kind:'可能新增或扩大',task:tasks[2],reason:'工具引入后可能增加验证与协作需求；不代表当地已有新增招聘岗位。'}],source:{title:'ILO：生成式 AI 与职业暴露（方法参考，非本页任务结论来源）',url:'https://www.ilo.org/publications/generative-ai-and-jobs-refined-global-index-occupational-exposure'},researchSignals:(snapshot.items||[]).slice(0,3),unknowns:['尚未掌握你的实际任务耗时与工具使用情况','未接入当地职位数量、薪资及企业采用率数据']};
}
const goalActions={
 1:'降低弱势人群获得基本服务的障碍',2:'减少可食用物资浪费并核实食品安全',3:'改善服务协调与健康信息可及性',4:'设计可理解、可反馈的学习活动',5:'检查不同性别群体的参与机会与结果差异',6:'核实用水影响并提出节水措施',7:'比较能源效率与可负担性',8:'安排合理工作负荷并保护劳动权益',9:'验证技术方案的可靠性与可用性',10:'识别弱势群体的使用障碍并提供替代方案',11:'让社区服务兼顾可达性与居民参与',12:'记录资源消耗、再利用与废弃物去向',13:'说明排放估算边界并比较减排方案',14:'检查废弃物是否可能流入水环境',15:'检查采购与处置对土地生态的影响',16:'记录决策依据并设置申诉与复核机制',17:'明确合作方责任、沟通和共同成果'
};
export function sdgEvidence(role){return role.sdgs.map(goal=>({goal,source:`https://sdgs.un.org/goals/goal${goal}`,action:goalActions[goal],application:`在「${role.artifact}」中增加相关行动及核验记录。`,verification:'提交实施前后对照、受影响者反馈或可复核记录；没有证据时仅作为设计意图。',tradeoff:'效率、成本与公平可能冲突；须检查真实服务对象的影响，职业名称本身不能证明产生贡献。'}));}
export function recommendationEvidence(role,profile,signals,experience,stress){
 const supporting=[...signals.overlap.map(s=>({type:'用户自述技能',detail:s})),...signals.interests.map(s=>({type:'兴趣线索，非能力证明',detail:s})),...(signals.majorMatch?[{type:'专业方向线索',detail:profile.majorDetail||profile.major}]:[]),...(signals.styleMatch?[{type:'工作方式偏好',detail:profile.workStyle}]:[])];
 const barriers=role.id==='school'?['需核实目标地区、学段与学科的教师资格及招聘要求']:role.id==='physician'?['须满足当地医学教育、执业注册与临床训练要求，短期转型课程不能替代']:role.id==='care'?['需核实服务职责边界；健康协调不等于获得诊疗资格']:['需核实当地招聘条件、作品要求与行业知识门槛'];
 return {supporting,gaps:signals.gaps,barriers,unknowns:['技能来自勾选自述，尚未通过真实工作验证','未核实目标地区、学历资格、职位空缺与薪资',...(supporting.length?[]:['当前资料缺少直接支持线索，推荐仅供探索'])],workEvidence:experience?.roleId===role.id&&experience.taskAssessment?'已有该岗位模拟作品反馈；仅反映一次虚构任务，不能验证职业胜任力':'尚无该岗位的可核验作品证据',preference:stress?'已纳入工作情境意愿；不代表抗压能力或心理状态':'尚未填写工作情境偏好',nextCheck:`核对一份真实招聘要求，并请从业者评阅「${role.artifact}」。`};
}
export function reviewEvidence(experience){return [
 {label:'专业任务表现',text:experience?.taskAssessment?(experience.taskAssessment.score===null?'已有规则结构检查，尚未判断专业正确性。':'已有一次 AI 模拟作品反馈，须结合原文证据与同行复核。'):'旧版选择题反馈只反映副本决策，不证明专业能力。'},
 {label:'用户自述偏好',text:experience?`本次职业喜好：${experience.enjoyment}/5；这是当下感受。`:'尚无体验喜好记录。'},
 {label:'模拟状态',text:'心情、精力、迟到与加班由虚构剧情产生，不是用户现实压力或心理健康测量，也不用于判定不适合某职业。'}
];}
