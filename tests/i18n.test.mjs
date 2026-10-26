import test from 'node:test';
import assert from 'node:assert/strict';
import {getLocale,setLocale,translate,aiConfig,normalizeLocale} from '../public/i18n.js';
import {roles,sdgs,profileOptions,scenario} from '../src/career.mjs';
import {buildDay,defaults} from '../src/day.mjs';
import {enhance} from '../server.mjs';

test('all catalogue labels and a full offline day have English and Malay translations',()=>{
 const day=buildDay(defaults,false,()=>0.99,'analyst',{difficulty:'normal'});
 const strings=[...sdgs,...roles.flatMap(role=>[role.name,role.task,role.artifact,...role.skills]),...Object.values(profileOptions).flat(),...day.events.flatMap(event=>[event.title,event.text,...(event.options||[]).flatMap(o=>[o.text,o.feedback])]),...scenario('analyst').rounds.flatMap(round=>[round.title,round.text,...round.options.flatMap(option=>[option.text,option.feedback])])].filter(Boolean);
 for(const lang of ['en','ms'])for(const text of strings)assert.ok(!/\p{Script=Han}/u.test(translate(text,lang)),`${lang}: ${text}`);
 assert.equal(translate('我的职业档案','en').trim(),'My Career Profile');
 assert.equal(translate('可迁移：','en').trim(),'Transferable skills:');
});

test('language is allowlisted and AI config is copied without changing the stored key',()=>{
 const config={provider:'openai',model:'example',key:'test-key'};
 try{
  setLocale('ms');assert.equal(getLocale(),'ms');assert.deepEqual(aiConfig(config),{...config,locale:'ms'});assert.ok(!Object.hasOwn(config,'locale'));
  setLocale('en');assert.equal(translate('今天迟到 12 分钟。').includes('12'),true);
  setLocale('invalid');assert.equal(getLocale(),'zh-CN');assert.equal(translate('我的职业档案'),'我的职业档案');
  assert.equal(normalizeLocale('<script>'),'zh-CN');
 }finally{setLocale('zh-CN');}
});

test('AI requests honor the selected language while retaining structured schema rules',async()=>{
 for(const [locale,expected] of [['en','English'],['ms','Bahasa Melayu'],['zh-CN','Simplified Chinese']]){
  let sent;
  await enhance('report',{occupation:'Student'},{provider:'openai',model:'example',key:'test',locale},async(_,options)=>{sent=JSON.parse(options.body);return Response.json({choices:[{message:{content:'{"summary":"ok"}'}}]});},{json:true,system:'Keep exactly three matches.'});
  assert.ok(sent.messages[0].content.includes(expected));
  assert.match(sent.messages[0].content,/Keep exactly three matches/);
  assert.match(sent.messages[0].content,/Preserve JSON keys, IDs, enum values/);
 }
});
