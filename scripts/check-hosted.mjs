// Credentials arrive on stdin, never in arguments, files, URLs or output.
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for hosted check configuration on stdin (hidden).');
let input='';
for await(const chunk of process.stdin){input+=chunk;if(/[\r\n]/.test(input))break;}
const config=JSON.parse(input);
if(process.stdin.isTTY)process.stdin.setRawMode(false);
const headers={'OAI-Sites-Authorization':`Bearer ${config.token}`};
const results=[];
for(const route of ['/experience','/api/catalog','/api/market']){
 const r=await fetch(config.url+route,{headers,redirect:'manual',signal:AbortSignal.timeout(25000)});
 results.push({route,status:r.status});
 if(route==='/api/catalog'&&r.ok){const c=await r.json();config.settings=c.dayDefaults;}
}
if(config.settings){
 const r=await fetch(config.url+'/api/day/preview',{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:config.url},body:JSON.stringify({roleId:'school',settings:config.settings}),redirect:'manual',signal:AbortSignal.timeout(25000)});results.push({route:'/api/day/preview',status:r.status});
 const refresh=await fetch(config.url+'/api/market-refresh',{method:'POST',headers,redirect:'manual',signal:AbortSignal.timeout(25000)});const snapshot=refresh.ok?await refresh.json():null;results.push({route:'/api/market-refresh',status:refresh.status,items:snapshot?.items?.length,lastSuccess:snapshot?.lastSuccess});
 const readback=await fetch(config.url+'/api/market',{headers,redirect:'manual',signal:AbortSignal.timeout(25000)});const data=readback.ok?await readback.json():null;results.push({route:'market-readback',status:readback.status,lastSuccess:data?.lastSuccess});
}
console.log(JSON.stringify(results));
if(results.some(r=>r.status!==200))process.exitCode=1;
