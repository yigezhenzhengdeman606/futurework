export const PAGES_ORIGIN='https://yigezhenzhengdeman606.github.io';
export const PAGES_BASE='/futurework/';
export const BACKEND='https://futurework-career-navigator.snugkiwi16.chatgpt.site';
export function isPages(){return location.origin===PAGES_ORIGIN;}
export function apiUrl(route){return isPages()?BACKEND+route:route;}
export function pageRoute(view){const experience=['experience','simulation','experienceReview'].includes(view);return isPages()?PAGES_BASE+(experience?'#/experience':''):experience?'/experience':'/';}
export function initialView(){return (isPages()?location.hash==='#/experience':location.pathname==='/experience')?'experience':'overview';}
