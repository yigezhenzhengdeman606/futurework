import {createHash,createHmac} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fresh=()=>({version:1,users:{},spent:0,reserved:0});
const fail=(message,code=409)=>{const error=new Error(message);error.status=code;throw error;};
const stages={
 '/api/profile-insight':['profile',900],'/api/questions':['questions',1600],
 '/api/report':['report',3500],'/api/resolve-role':['role',1600],
 '/api/day':['day',11000],'/api/stress-questions':['stress',1000],
 '/api/task-assess':['task',2400],
 '/api/rematch':['final',3500],'/api/experience-review':['final',900]
};
export class MemoryTrialStore{
 constructor(){this.value=null;this.revision=0;this.results=new Map();}
 async read(){return {value:this.value?structuredClone(this.value):fresh(),revision:this.revision};}
 async swap(revision,value){if(this.revision!==revision)return false;this.value=structuredClone(value);this.revision++;return true;}
 async result(key,value){if(value===undefined)return this.results.get(key);this.results.set(key,value);}
}
export class FileTrialStore extends MemoryTrialStore{
 constructor(directory){super();this.directory=directory;this.queue=Promise.resolve();}
 async read(){try{const record=JSON.parse(await readFile(this.directory+'/trials.json','utf8'));return record;}catch(error){if(error.code!=='ENOENT')throw error;return {value:fresh(),revision:0};}}
 async swap(revision,value){
  const operation=this.queue.then(async()=>{const current=await this.read();if(current.revision!==revision)return false;await mkdir(this.directory,{recursive:true});const temp=this.directory+'/trials.tmp';await writeFile(temp,JSON.stringify({value,revision:revision+1}));await rename(temp,this.directory+'/trials.json');return true;});
  this.queue=operation.catch(()=>{});return operation;
 }
 async result(key,value){const file=this.directory+'/'+hash(key)+'.json';if(value===undefined)return JSON.parse(await readFile(file,'utf8'));await mkdir(this.directory,{recursive:true});await writeFile(file,JSON.stringify(value));}
}
export class R2TrialStore{
 constructor(bucket){this.bucket=bucket;}
 async read(){const object=await this.bucket.get('trial-ledger-v1.json');return {value:object?JSON.parse(await object.text()):fresh(),revision:object?.etag||null};}
 async swap(revision,value){return !!await this.bucket.put('trial-ledger-v1.json',JSON.stringify(value),{onlyIf:revision?{etagMatches:revision}:{etagDoesNotMatch:'*'}});}
 async result(key,value){const name='trial-results/'+hash(key)+'.json';if(value===undefined){const object=await this.bucket.get(name);if(!object)throw Error('免费体验结果暂时无法读取，请稍后重试。');return JSON.parse(await object.text());}await this.bucket.put(name,JSON.stringify(value));}
}
export class TrialService{
 constructor({store,key='',secret='',limit=15,budget=2250000,perUser=350000,enabled=true}){
  this.store=store;this.key=key;this.secret=secret;this.limit=limit;this.budget=budget;this.perUser=perUser;this.enabled=enabled&&!!key&&secret.length>=32;
 }
 async update(fn){
  for(let attempt=0;attempt<40;attempt++){const {value,revision}=await this.store.read();const result=fn(value);if(await this.store.swap(revision,value))return result;}
  fail('领取人数较多，请稍后重试。',503);
 }
 identity(device){if(typeof device!=='string'||!/^[a-f0-9-]{36,64}$/i.test(device))fail('请使用当前浏览器重新领取体验。',400);return createHmac('sha256',this.secret).update('trial-device:'+device).digest('hex');}
 id(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))fail('免费体验凭证无效，请重新领取。',401);return hash(token);}
 async status(device){
  const {value}=await this.store.read(),token=device&&this.secret?this.identity(device):null,user=token?value.users[hash(token)]:null;
  const remaining=Math.max(0,this.limit-Object.values(value.users).filter(u=>u.mode==='free').length);
  return {enabled:this.enabled,remaining:this.enabled&&value.spent+value.reserved<this.budget?remaining:0,limit:this.limit,claimed:user?.mode==='free',reimbursement:user?.mode==='reimbursement',reference:user?.reference||null,reason:!this.enabled?'平台免费体验暂未开通，请使用自己的 API 或无 AI 模式。':value.spent+value.reserved>=this.budget||!remaining?'平台免费体验额度已用完，可自备 API 体验后申请一次报销。':null};
 }
 async claim(device,consent){
  if(consent!==true)fail('请先同意免费体验的数据处理说明。',400);
  if(!this.enabled)fail('平台免费体验暂未开通，请使用自己的 API 或无 AI 模式。',503);
  const token=this.identity(device),id=hash(token);
  const reference=await this.update(value=>{
   const user=value.users[id];if(user?.mode==='reimbursement')fail('你已选择报销方式，不能重复领取平台免费体验。');if(user)return user.reference;
   if(Object.values(value.users).filter(u=>u.mode==='free').length>=this.limit||value.spent+value.reserved>=this.budget)fail('平台免费体验额度已用完，可自备 API 体验后申请一次报销。');
   const reference='FW-FREE-'+id.slice(0,12);value.users[id]={mode:'free',reference,stages:{},spent:0,created:new Date().toISOString()};return reference;
  });return {token,reference,...await this.status(device)};
 }
 async reimbursement(device){
  if(!this.secret)fail('报销核验暂时不可用，请通过邮件联系我们。',503);
  const id=hash(this.identity(device));
  const reference=await this.update(value=>{
   const user=value.users[id];if(user?.mode==='free')fail('已领取平台免费体验，不能重复申请体验费用报销。');if(user)return user.reference;
   if(Object.keys(value.users).length>=500)fail('申请较多，请通过邮件联系我们。',503);
   const reference='FW-REIMBURSE-'+id.slice(0,12);value.users[id]={mode:'reimbursement',reference,created:new Date().toISOString()};return reference;
  });return {reference,submitted:false,message:'已生成报销核验编号；申请材料仍需通过邮件提交并人工审核。'};
 }
 async run(token,route,payload,generate,fetcher){
  if(!this.enabled)fail('平台免费体验暂未开通，请使用自己的 API 或无 AI 模式。',503);
  const id=this.id(token),definition=stages[route];if(!definition)fail('免费体验不包含此功能，请使用自己的 API 或无 AI 模式。');
  const [stage,maxOutput]=definition;
  const fingerprint=hash(JSON.stringify({...payload,ai:undefined}));
  const cached=await this.update(value=>{
   const user=value.users[id];if(user?.mode!=='free')fail('免费体验凭证无效，请重新领取。',401);
   const previous=user.stages[stage];
   if(previous?.status==='complete'){if(previous.fingerprint!==fingerprint)fail('本环节已体验一次，请使用首次资料查看结果，或切换自己的 API。');return true;}
   if(user.active&&Date.now()-(user.activeSince||Date.now())<120000)fail('你的上一步仍在处理中，请稍候；不会重复调用 AI。');
   if(previous?.attempts>=2)fail('本环节重试次数已用完，请使用无 AI 模式，或发邮件联系我们。');
   user.active=stage;user.activeSince=Date.now();user.stages[stage]={status:'processing',fingerprint,attempts:(previous?.attempts||0)+1};return false;
  });
  const resultKey=id+':'+stage;
  if(cached)return this.store.result(resultKey);
  let calls=0,succeeded=0,charged=0;
  const paidFetch=async(url,options)=>{
   if(calls++)fail('本环节只允许一次 AI 调用。');
   const body=JSON.parse(options.body);body.max_tokens=Math.min(body.max_tokens,maxOutput);body.model='deepseek-flash';body.thinking={type:'disabled'};
   // Byte count is a conservative upper bound, including a framing allowance.
   const inputBound=Buffer.byteLength(JSON.stringify(body.messages),'utf8')+2048;
   const reserve=inputBound*2+body.max_tokens*8; // micro-CNY; peak, cache-miss pricing.
   await this.update(value=>{const user=value.users[id];if(value.spent+value.reserved+reserve>this.budget||user.spent+reserve>this.perUser)fail('平台体验预算不足，本次已保留规则模式；可联系平台。');value.reserved+=reserve;});
   let actual=reserve;
   try{
    const response=await fetcher(url,{...options,body:JSON.stringify(body)});
    if(response.ok){const data=await response.clone().json();const usage=data.usage;
     if(Number.isSafeInteger(usage?.prompt_tokens)&&usage.prompt_tokens>=0&&Number.isSafeInteger(usage?.completion_tokens)&&usage.completion_tokens>=0){actual=Math.min(reserve,usage.prompt_tokens*2+usage.completion_tokens*8);}
     if(data.choices?.[0]?.message?.content)succeeded++;
    }
    return response;
   }finally{charged+=actual;await this.update(value=>{value.reserved-=reserve;value.spent+=actual;value.users[id].spent+=actual;});}
  };
  try{
   const result=await generate({provider:'deepseek',model:'deepseek-flash',key:this.key,locale:payload.locale,platformTrial:true},paidFetch);
   const complete=succeeded>0&&result.status!=='clarify'&&!result.aiFailed&&!/失败|超时|回退/.test(result.ai?.status||'');
   const response={...result,trial:{reference:(await this.store.read()).value.users[id].reference,stage,complete,charged:charged>0}};
   // Store only generated results, never the provider key or raw request configuration.
   if(complete)await this.store.result(resultKey,response);
   await this.update(value=>{const user=value.users[id];user.active=null;user.stages[stage].status=complete?'complete':'failed';});
   return response;
  }catch(error){await this.update(value=>{const user=value.users[id];user.active=null;user.stages[stage].status='failed';});throw error;}
 }
}
