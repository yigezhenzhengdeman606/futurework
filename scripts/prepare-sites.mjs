import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'deploy/futurework');
await mkdir(path.join(output,'worker'),{recursive:true});
const assets={};
for(const file of await readdir(path.join(root,'public'))){assets['/public/'+file]=await readFile(path.join(root,'public',file),'utf8');}
assets['/src/life.mjs']=await readFile(path.join(root,'src/life.mjs'),'utf8');
let initialSnapshot={items:[],lastAttempt:null,lastSuccess:null,status:'尚未同步：使用规则基线',source:'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=60'};
try{const cached=JSON.parse(await readFile(path.join(root,'.cache/market.json'),'utf8'));if(Array.isArray(cached.items))initialSnapshot=cached;}catch{}
let source=`import {Buffer} from 'node:buffer';\nimport {posix as path} from 'node:path';\nimport * as nodeCrypto from 'node:crypto';\nconst assets=${JSON.stringify(assets)};\nconst initialSnapshot=${JSON.stringify(initialSnapshot)};\n`;
source+=`function createModules(env,fs){const modules={};\n`;
const names=['life','day','career','day-ai','resolve-role','personalize','market','trial'];
for(const name of names){
 let code=await readFile(path.join(root,'src',name+'.mjs'),'utf8');
 const exports=[...code.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)].map(m=>m[1]);
 code=code.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g,(_,symbols,from)=>`const {${symbols}}=${from==='node:crypto'?'nodeCrypto':from==='node:fs/promises'?'fs':`modules[${JSON.stringify(path.basename(from,'.mjs'))}]`};`);
 code=code.replace(/import path from 'node:path';/g,'').replace(/export\s+(?=(?:async\s+)?(?:function|const|class))/g,'');
 if(name==='day-ai')code=code.replace('const signingKey=randomBytes(32);',"if(!/^[a-f0-9]{64}$/.test(env.SIGNING_KEY||''))throw Error('Hosted signing key missing');const signingKey=Buffer.from(env.SIGNING_KEY,'hex');");
 source+=`modules[${JSON.stringify(name)}]=(()=>{${code}\nreturn {${exports.join(',')}};})();\n`;
}
let server=await readFile(path.join(root,'server.mjs'),'utf8');
server=server.slice(0,server.indexOf("if(process.argv[1]"));
server=server.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g,(_,symbols,from)=>from.startsWith('./src/')?`const {${symbols}}=modules[${JSON.stringify(path.basename(from,'.mjs'))}];`:'');
server=server.replace(/^import .*;\r?\n/gm,'').replace(/const root=.*?;/,'const root="/";').replace(/export\s+(?=(?:async\s+)?function)/g,'');
server=server.replace('req.headers.origin!==`http://${req.headers.host}`','req.headers.origin!==req.siteOrigin');
source+=`const http={createServer:handler=>handler};const readFile=fs.readFile;\n${server}\nreturn {...modules,createApp};}\n`;
source+=await readFile(path.join(root,'scripts/sites-runtime.txt'),'utf8');
await writeFile(path.join(output,'worker/index.js'),source);
await mkdir(path.join(output,'app/src'),{recursive:true});
await mkdir(path.join(output,'app/public'),{recursive:true});
for(const name of names)await copyFile(path.join(root,'src',name+'.mjs'),path.join(output,'app/src',name+'.mjs'));
for(const file of await readdir(path.join(root,'public')))await copyFile(path.join(root,'public',file),path.join(output,'app/public',file));
await copyFile(path.join(root,'server.mjs'),path.join(output,'app/server.mjs'));
console.log('Prepared zero-dependency hosted Worker and sanitized source.');
