import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const owner='yigezhenzhengdeman606',repo='futurework';
let credentials;
try{const raw=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:15000,windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}});credentials=Object.fromEntries(raw.trim().split(/\r?\n/).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));}catch{throw Error('Personal GitHub credential unavailable');}
const headers={Authorization:`Bearer ${credentials.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
async function api(route,method='GET',body){const response=await fetch('https://api.github.com'+route,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});const result=await response.json();if(!response.ok)throw Error(`GitHub ${response.status}: ${result.message}`);return result;}
const user=await api('/user');if(user.login!==owner)throw Error('Authenticated GitHub account does not match target');
const prefix=`/repos/${owner}/${repo}`;
const ref=await api(prefix+'/git/ref/heads/main');
if(ref.object.sha!=='7450a59b1431fcc5246f9332cf4cd2f3b3ad1395')throw Error('Repository changed since initialization; inspect before publishing');
const parent=await api(prefix+'/git/commits/'+ref.object.sha);
const entries=JSON.parse(await readFile('.cache/github-tree.json','utf8'));
if(!entries.length||entries.some(e=>e.path.startsWith('futurework/')))throw Error('Unexpected source layout');
const tree=await api(prefix+'/git/trees','POST',{base_tree:parent.tree.sha,tree:entries});
const commit=await api(prefix+'/git/commits','POST',{message:'Publish Futurework career application and GitHub Pages workflow',tree:tree.sha,parents:[parent.sha]});
await api(prefix+'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});
console.log(JSON.stringify({repository:`${owner}/${repo}`,commit:commit.sha,url:`https://github.com/${owner}/${repo}`,files:entries.length}));
