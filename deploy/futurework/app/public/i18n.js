import {translations} from './translations.js';
import {overrides} from './locale-overrides.js';

export const locales=['zh-CN','en','ms'];
export function normalizeLocale(value){return locales.includes(value)?value:'zh-CN';}
let locale='zh-CN';
try{locale=normalizeLocale(globalThis.localStorage?.getItem('futurework-language'));}catch{}
export const getLocale=()=>locale;
const rows=[...translations,...overrides];
const dictionaries=Object.fromEntries(['en','ms'].map((lang,index)=>[lang,new Map(rows.map(row=>[row[0],row[index+1]]))]));
const escapePattern=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=new RegExp([...new Set(rows.map(row=>row[0]))].sort((a,b)=>b.length-a.length).map(escapePattern).join('|'),'gu');
export function translate(text,language=locale){
 if(language==='zh-CN'||!dictionaries[language])return String(text);
 return String(text).replace(pattern,key=>' '+dictionaries[language].get(key)+' ').replace(/，/g,', ').replace(/。/g,'. ').replace(/：/g,': ').replace(/；/g,'; ').replace(/、/g,', ').replace(/[「」“”]/g,'"').replace(/[ \t]+/g,' ').replace(/ +([.,;:!?])/g,'$1');
}
export function aiConfig(config){return config?{...config,locale}:config;}

// Keep the canonical Chinese values in the business model and in FormData.
// Only presentation text changes; no form or simulation is re-created on switch.
const textSources=new WeakMap(),attributeSources=new WeakMap();
const userText=new Set();
function rememberInput(input){
 if(!input?.matches?.('textarea,input[type=text],input:not([type])')||/key|model/i.test(input.name||input.id||''))return;
 if(input.value?.trim()&&userText.size<500)userText.add(input.value.trim());
}
function display(text){
 const protectedValues=[...userText].filter(value=>text.includes(value)).sort((a,b)=>b.length-a.length);
 if(!protectedValues.length)return translate(text);
 const protectedPattern=new RegExp('('+protectedValues.map(escapePattern).join('|')+')','gu');
 return text.split(protectedPattern).map(part=>userText.has(part)?part:translate(part)).join('');
}
function sourceFor(map,key,current){
 const previous=map.get(key);
 if(previous&&previous.output===current)return previous.source;
 return current;
}
let observer;
export function translatePage(){
 if(typeof document==='undefined')return;
 observer?.disconnect();
 try{
  document.documentElement.lang=locale;
  document.querySelectorAll('input,textarea').forEach(rememberInput);
  // An option with no value otherwise changes its submitted value when translated.
  document.querySelectorAll('option:not([value])').forEach(option=>option.value=option.textContent);
  const walker=document.createTreeWalker(document.documentElement,4);
  let node;
  while((node=walker.nextNode())){
   if(node.parentElement?.closest('script,style,textarea,[translate=no],[data-language-picker]'))continue;
   const source=sourceFor(textSources,node,node.nodeValue),output=display(source);
   if(node.nodeValue!==output)node.nodeValue=output;
   textSources.set(node,{source,output});
  }
  for(const element of document.querySelectorAll('[placeholder],[title],[aria-label],[alt]')){
   if(element.closest('[translate=no],[data-language-picker]'))continue;
   let saved=attributeSources.get(element);if(!saved){saved=new Map();attributeSources.set(element,saved);}
   for(const name of ['placeholder','title','aria-label','alt']){
    if(!element.hasAttribute(name))continue;
    const current=element.getAttribute(name),source=sourceFor(saved,name,current),output=display(source);
    if(current!==output)element.setAttribute(name,output);
    saved.set(name,{source,output});
   }
  }
  for(const button of document.querySelectorAll('[data-language]')){
   button.setAttribute('aria-pressed',String(button.dataset.language===locale));
  }
 }finally{observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label','alt']});}
}
export function setLocale(value){
 locale=normalizeLocale(value);
 try{globalThis.localStorage?.setItem('futurework-language',locale);}catch{}
 translatePage();
 if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('language-changed',{detail:locale}));
}
if(typeof document!=='undefined'){
 const picker=()=>{
  const element=document.createElement('div');element.className='language-picker';element.dataset.languagePicker='';
  element.setAttribute('role','group');element.setAttribute('aria-label','语言 / Language / Bahasa');
  element.innerHTML='<button type="button" data-language="zh-CN" lang="zh-CN">中文</button><button type="button" data-language="en" lang="en">English</button><button type="button" data-language="ms" lang="ms">Bahasa Melayu</button>';
  return element;
 };
 document.body.append(picker());
 for(const dialog of document.querySelectorAll('dialog'))dialog.prepend(picker());
 document.addEventListener('input',event=>rememberInput(event.target));
 document.addEventListener('click',event=>{const button=event.target.closest('[data-language]');if(button)setLocale(button.dataset.language);});
 observer=new MutationObserver(()=>translatePage());translatePage();
}
