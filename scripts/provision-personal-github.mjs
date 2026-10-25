// Use only an existing credential belonging to the explicitly selected account.
// Never display or persist the credential. Interactive authentication is disabled.
import {execFileSync} from 'node:child_process';
const expected='yigezhenzhengdeman606';
let credential;
try{
 const raw=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:15000,windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}});
 credential=Object.fromEntries(raw.trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
}catch{console.log(JSON.stringify({created:false,reason:'No usable noninteractive GitHub credential is available on this computer.'}));process.exit(0);}
if(!credential.password){console.log(JSON.stringify({created:false,reason:'No GitHub token available.'}));process.exit(0);}
const headers={Authorization:`Bearer ${credential.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
const userResponse=await fetch('https://api.github.com/user',{headers,signal:AbortSignal.timeout(15000)});
const user=await userResponse.json();
if(userResponse.status!==200||user.login!==expected){console.log(JSON.stringify({created:false,reason:'Credential is not authenticated as the requested personal account.',login:user.login||null}));process.exit(0);}
const existing=await fetch(`https://api.github.com/repos/${expected}/futurework`,{headers,signal:AbortSignal.timeout(15000)});
let response=existing;
if(existing.status===404)response=await fetch('https://api.github.com/user/repos',{method:'POST',headers,body:JSON.stringify({name:'futurework',description:'AI-powered career exploration, personalized reskilling and interactive career life simulations.',private:false,auto_init:true}),signal:AbortSignal.timeout(20000)});
const repo=await response.json();
console.log(JSON.stringify({created:response.ok,status:response.status,repository:repo.full_name||null,url:repo.html_url||null,defaultBranch:repo.default_branch||null,message:response.ok?null:repo.message}));
if(response.ok){
 const pages=await fetch(`https://api.github.com/repos/${expected}/futurework/pages`,{method:'POST',headers,body:JSON.stringify({build_type:'workflow'}),signal:AbortSignal.timeout(15000)});
 console.log(JSON.stringify({pagesConfigured:pages.ok||pages.status===409,status:pages.status}));
}
