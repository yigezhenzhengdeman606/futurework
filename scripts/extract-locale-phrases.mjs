// Development aid: collect public product copy, never user profiles or API keys.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
const phrases=new Set();
for(const directory of ['public','src','.'])for(const file of await readdir(directory)){
 if(directory==='.'&&file!=='server.mjs')continue;
 if(!/\.(js|mjs|html)$/.test(file)||file.startsWith('i18n')||file.startsWith('translations'))continue;
 const source=await readFile(`${directory}/${file}`,'utf8');
 for(const match of source.matchAll(/[\p{Script=Han}][\p{Script=Han}\p{Script=Latin}\d ，。！？：；、（）《》「」“”‘’…·—–％%＋−↗↓→\-.]*[\p{Script=Han}。！？：；、）》」”’…↗↓→]|[\p{Script=Han}]/gu))phrases.add(match[0].trim());
}
await mkdir('.cache',{recursive:true});
await writeFile('.cache/i18n-phrases.json',JSON.stringify([...phrases]));
console.log(JSON.stringify({phrases:phrases.size,characters:[...phrases].join('\n').length}));
