import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
export const FEED='https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=60';
const empty=()=>({lastAttempt:null,lastSuccess:null,items:[],status:'尚未同步：使用规则基线',source:FEED});
export class Market {
  constructor(directory){this.file=path.join(directory,'market.json');this.snapshot=empty();this.pending=null;}
  async load(){try{const value=JSON.parse(await readFile(this.file,'utf8'));if(Array.isArray(value.items))this.snapshot=value;}catch{}return this;}
  async refresh(fetcher=fetch){
    if(this.pending)return this.pending;
    this.pending=this.update(fetcher).finally(()=>{this.pending=null;});return this.pending;
  }
  async update(fetcher){
    const now=new Date().toISOString();
    try{
      const response=await fetcher(FEED,{signal:AbortSignal.timeout(15000),redirect:'error'});
      if(!response.ok)throw new Error('feed unavailable');
      const xml=await response.text();
      if(xml.length>3000000)throw new Error('feed too large');
      const clean=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
      const items=[...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/g)].slice(0,150).map(m=>({title:clean(m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1]||''),url:clean(m[1].match(/<id>([\s\S]*?)<\/id>/)?.[1]||m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1]||'').replace(/^http:\/\/arxiv.org\//,'https://arxiv.org/'),published:clean(m[1].match(/<published>([\s\S]*?)<\/published>/)?.[1]||m[1].match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1]||m[1].match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]||'')})).filter(x=>x.title&&/^https:\/\/arxiv.org\//.test(x.url));
      if(!items.length)throw new Error('empty feed');
      this.snapshot={lastAttempt:now,lastSuccess:now,items,status:'实时来源已同步（研究信号，非招聘数据）',source:FEED};
    }catch{this.snapshot={...this.snapshot,lastAttempt:now,status:'同步失败：保留上次成功数据；无历史数据时使用规则基线'};}
    await mkdir(path.dirname(this.file),{recursive:true});
    await writeFile(this.file+'.tmp',JSON.stringify(this.snapshot));await rename(this.file+'.tmp',this.file);
    return this.snapshot;
  }
  async refreshIfDue(){if(!this.snapshot.lastAttempt||Date.now()-Date.parse(this.snapshot.lastAttempt)>=86400000)await this.refresh();}
}
