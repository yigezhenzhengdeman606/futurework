// One-off build tool. Only bundled public copy is sent for draft translation.
// The website uses the checked-in dictionaries entirely offline.
import './extract-locale-phrases.mjs';
import {readFile,writeFile} from 'node:fs/promises';
const phrases=JSON.parse(await readFile('.cache/i18n-phrases.json','utf8'));
let translations={};
try{translations=JSON.parse(await readFile('.cache/locale-drafts.json','utf8'));}catch{}
for(const lang of ['en','ms']){
 translations[lang]??={};
 const missing=phrases.filter(p=>!translations[lang][p]);
 for(let i=0;i<missing.length;i+=20){
  const batch=missing.slice(i,i+20);
  const url=new URL('https://translate.googleapis.com/translate_a/single');
  for(const [key,value] of Object.entries({client:'gtx',sl:'zh-CN',tl:lang,dt:'t',q:batch.join('\n')}))url.searchParams.set(key,value);
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Draft translation failed: ${response.status}`);
  const data=await response.json();
  const lines=data[0].map(s=>s[0]||'').join('').trim().split('\n');
  if(lines.length!==batch.length)throw Error(`Translation alignment failed ${lang} ${i}: ${lines.length}/${batch.length}`);
  batch.forEach((phrase,index)=>translations[lang][phrase]=lines[index].trim());
  await writeFile('.cache/locale-drafts.json',JSON.stringify(translations));
 }
 console.log(`${lang}: ${Object.keys(translations[lang]).length} entries`);
}
const rows=phrases.map(p=>[p,translations.en[p],translations.ms[p]]);
await writeFile('public/translations.js','// Bundled translations. No translation service is called at runtime.\nexport const translations='+JSON.stringify(rows,null,1)+';\n');
