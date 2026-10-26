// Product learning scenarios, selected from the user's explicit title rather
// than inferred from a broad "school" family or an AI-generated task.
export function teachingContext(title){
 const name=String(title||'');
 const stages=[['high',/高中|高[一二三]|senior\s+high|high\s+school|upper\s+secondary|menengah\s+atas|form\s*[45]/i],['middle',/初中|初[一二三]|junior\s+high|lower\s+secondary|menengah\s+rendah|form\s*[123]/i],['primary',/小学|小[一二三四五六]|primary\s+school|sekolah\s+rendah/i],['university',/大学|高校|university|college|universiti/i],['preschool',/幼儿园|学前|kindergarten|preschool|prasekolah/i]].filter(([,pattern])=>pattern.test(name));
 return {stage:stages.length===1&&!/中小学|初高中|小初高/.test(name)?stages[0][0]:null,subject:/数学|mathematics|\bmaths?\b|matematik/i.test(name)?'math':null,isTeacher:/老师|教师|讲师|教授|teacher|guru|lecturer|professor|pensyarah/i.test(name)};
}
export function teachingTask(title){
 const context=teachingContext(title);
 const shared={fields:['学习目标与学生起点','活动流程与时间分配','理解检查、反馈与无障碍安排'],criteria:['目标与学生起点相符','活动与时间安排可执行','检查理解并纠正常见误解','照顾不同学生与资源限制']};
 if(context.subject==='math'&&context.stage==='high')return {...shared,title:'为高中数学设计一节“函数单调性”课',brief:'虚构班级有36名高中学生，已学习函数概念、定义域及二次函数，但容易把“函数在某个区间上单调”误认为“在整个定义域上单调”。请设计一节45分钟课程，用定义、图像和例子帮助学生理解区间的重要性。',materials:['学生起点：理解函数和二次函数图像；本案例不假定学生已学导数。','任务例子：比较 f(x)=x² 在区间[0,3]、[-3,0]和[-3,3]上的变化。','请说明如何用 x₁<x₂ 时函数值的比较验证判断，不能只凭图像外观断言。','资源：黑板、投影和练习纸；需安排一次学生独立判断及纠错。'],criteria:['目标与高中学生起点相符','单调区间与数学论证准确','45分钟活动与检查可执行','识别误解并提供差异化支持']};
 if(context.subject==='math'&&context.stage==='middle')return {...shared,title:'为初中数学设计一节“一次函数”课',brief:'虚构班级有32名初中学生，已接触坐标系和简单方程，但容易混淆一次函数表达式中两个系数的作用。请设计一节40分钟课程，联系表达式、表格与图像。',materials:['比较 y=2x+1、y=2x-2 与 y=-x+1，说明需要学生观察什么。','让学生使用至少一种方式核实自己的判断，不只背诵结论。','资源：坐标纸、黑板和投影；安排独立练习与反馈。']};
 if(context.subject==='math'&&context.stage==='primary')return {...shared,title:'为小学数学设计一节“认识分数”课',brief:'虚构班级有30名小学生，已学过平均分，但容易混淆分子和分母。请设计30分钟教学活动，使用具体材料并检查理解。若需要指定年级，请在学生起点中说明你的设定。',materials:['学习目标：理解一个整体被平均分成若干份，以及其中一份的含义。','资源：纸条、彩笔、黑板；不能假定每位学生都有平板。','最后必须安排学生展示和解释，并为需要大字号材料的学生提供支持。']};
 return {...shared,title:`为「${title}」设计一节与岗位一致的课`,brief:'请围绕所选教师岗位明确学段、学科和一个具体课题，再交付教学设计。信息未明确时，本任务不默认小学或数学；请先在学生起点中写清你的选择。',materials:['说明学生已学内容、目标课题与需要纠正的具体误解。','自行说明课时长度和可用资源，再设计活动及效果检查。','任务须与岗位名称中明确的学段、学科一致；此处为通用教学设计框架，不声称覆盖特定学科全部专业要求。']};
}
