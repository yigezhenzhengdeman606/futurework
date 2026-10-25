import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const entries=[];
async function add(file,target=file){entries.push({path:target,mode:'100644',type:'blob',content:await readFile(file,'utf8')});}
async function walk(directory){for(const item of await readdir(directory,{withFileTypes:true})){if(['.git','dist','node_modules','.cache','__pycache__','.sites-runtime'].includes(item.name)||item.name.startsWith('.sites-checkout'))continue;const file=directory+'/'+item.name;if(item.isDirectory())await walk(file);else if(item.isFile()&&!/\.(png|jpg|jpeg|pdf|pyc|log|tar|gz)$/i.test(item.name))await add(file);}}
for(const file of ['package.json','README.md','LICENSE','requirements.txt','.env.example','.gitignore','.replit'])await add(file);
for(const directory of ['src','public','scripts','tests','runpod','deploy/futurework'])await walk(directory);
await add('docs/ARCHITECTURE.md');
await add('.github/workflows/futurework-pages.yml','.github/workflows/futurework-pages.yml');
// No environment files, Git credentials, runtime caches or uploaded payment images.
for(const e of entries){if(/(?:Bearer\s+sk-|sk-[A-Za-z0-9]{24,}|gh[pousr]_[A-Za-z0-9]{25,})/.test(e.content))throw Error('Possible credential in '+e.path);}
await mkdir('.cache',{recursive:true});await writeFile('.cache/github-tree.json',JSON.stringify(entries));
console.log(JSON.stringify({files:entries.length,characters:JSON.stringify(entries).length}));
