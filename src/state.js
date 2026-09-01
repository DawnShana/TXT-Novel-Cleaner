import {mergeRulesExt,emptyRules,subtractRules,countRules,ALL_RULE_TYPES,ruleKey,ensureRules} from './rules-model.js';

export const $=s=>document.querySelector(s);
export const $$=s=>[...document.querySelectorAll(s)];
export const fmt=n=>Number(n||0).toLocaleString('zh-CN');
export const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

export const A={mode:'aggressive',file:null,source:'',rules:null,base:null,baseSources:[],personal:null,syncedPersonal:null,scan:null,groups:[],ad:{},autoAd:{},pinyin:null,pd:{},pinyinAuto:{},reviewGroup:'autoAd',final:'',dirty:0,w:null,id:0,edit:null};
export const LS='novelCleaner.localRules.v2',LG='novelCleaner.git.v1',SYNCED='novelCleaner.syncedRules.v1';
export const B=['rules/builtin/builtin-ad-1.json','rules/builtin/builtin-ad-2.json','rules/builtin/builtin-ad-3.json','rules/builtin/builtin-ad-4.json','rules/builtin/builtin-ad-5.json'];
export const TYPE_LABEL={adExact:'广告精确',garbleSamples:'乱码样本',pinyinFixes:'拼音修复',keepFields:'保留覆盖',pinyinKeep:'拼音保留',englishKeep:'英文/名称',repeatPatterns:'重复污染模式',adFamilies:'广告主体家族',adPinyinFamilies:'拼音广告家族',structuralRules:'结构规则'};

export function toast(s){const e=$('#toast');e.textContent=s;e.classList.add('show');clearTimeout(e.t);e.t=setTimeout(()=>e.classList.remove('show'),2400)}
export function view(v){$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$$('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${v}`));document.dispatchEvent(new CustomEvent('novel:view',{detail:v}))}
export function empty(){return emptyRules()}
export function subtract(all,base){const o=subtractRules(all,base);o.version=A.personal?.version||all?.version||1;o.updatedAt=new Date().toISOString();return o}
export function countRuleSet(r){return countRules(r)}
function sameKey(type,value){return ruleKey(type,value)}
function flattenRuleSet(r){const out=[],x=ensureRules(r);for(const type of ALL_RULE_TYPES)(x[type]||[]).forEach((value,index)=>out.push({type,index,value,key:sameKey(type,value)}));return out}
export function pendingRuleChanges(){const cur=flattenRuleSet(A.personal||empty()),old=flattenRuleSet(A.syncedPersonal||empty()),curSet=new Set(cur.map(x=>x.key)),oldSet=new Set(old.map(x=>x.key));return[...cur.filter(x=>!oldSet.has(x.key)).map(x=>({...x,change:'pending',editable:true})),...old.filter(x=>!curSet.has(x.key)).map(x=>({...x,change:'deleted',editable:false}))]}
export function refreshDirty(){A.dirty=pendingRuleChanges().length;const e=$('#pendingSync');if(e){e.textContent=`待同步 ${fmt(A.dirty)}`;e.classList.toggle('dirty',A.dirty>0)}return A.dirty}
export function persist(){A.personal=subtract(A.rules,A.base);localStorage.setItem(LS,JSON.stringify(A.personal));counts();refreshDirty()}
export function markDirty(){if(A.personal)A.personal.version=(+A.personal.version||1)+1;persist()}
async function j(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`${url} HTTP ${r.status}`);return r.json()}
export async function loadRules(){
  try{
    const [remoteRaw,...bsRaw]=await Promise.all([j(`./rules.json?t=${Date.now()}`),...B.map(x=>j('./'+x))]);let base=empty();const bs=bsRaw.map(ensureRules);for(const b of bs)base=mergeRulesExt(base,b);const remote=ensureRules(remoteRaw);
    let cachedSynced=null,local=null;try{cachedSynced=ensureRules(JSON.parse(localStorage.getItem(SYNCED)||'null')||{})}catch{}try{local=ensureRules(JSON.parse(localStorage.getItem(LS)||'null')||{})}catch{}
    const synced=(cachedSynced&&(+cachedSynced.version||0)>(+remote.version||0))?cachedSynced:remote;let personal=remote;if(local&&(+local.version||0)>(+remote.version||0))personal=local;
    A.base=base;A.baseSources=bs.map((rules,i)=>({path:B[i],rules}));A.syncedPersonal=synced;A.personal=personal;A.rules=mergeRulesExt(base,personal);localStorage.setItem(SYNCED,JSON.stringify(synced));$('#ruleStatus').className='dot ready';$('#ruleStatusText').textContent=`内置 ${fmt(countRuleSet(base))} · 个人 ${fmt(countRuleSet(personal))}`;persist();
  }catch(e){$('#ruleStatus').className='dot error';$('#ruleStatusText').textContent='规则加载失败';toast(e.message)}
}
export function counts(){if(!A.rules)return;const p=ensureRules(A.personal||empty());$('#rAd').textContent=fmt(countRuleSet(A.base));$('#rGarble').textContent=fmt(countRuleSet(p));$('#rPinyin').textContent=fmt(p.pinyinFixes?.length||0);$('#rKeep').textContent=fmt((p.keepFields?.length||0)+(p.englishKeep?.length||0)+(p.pinyinKeep?.length||0))}
export function worker(type,payload){if(!A.w)A.w=new Worker('./worker.js',{type:'module'});const id=++A.id;return new Promise((ok,no)=>{const h=e=>{if(e.data?.id!==id)return;A.w.removeEventListener('message',h);e.data.ok?ok(e.data.result):no(Error(e.data.error))};A.w.addEventListener('message',h);A.w.postMessage({id,type,...payload})})}
function score(s){return(s.match(/[\u3400-\u9fff]/g)||[]).length*.02-(s.match(/�/g)||[]).length*10}
export async function decode(f){const b=await f.arrayBuffer(),u=new Uint8Array(b);if(u[0]===0xef&&u[1]===0xbb&&u[2]===0xbf)return{text:new TextDecoder().decode(b),enc:'UTF-8 BOM'};try{return{text:new TextDecoder('utf-8',{fatal:true}).decode(b),enc:'UTF-8'}}catch{}const a=[];for(const e of['gb18030','big5'])try{const t=new TextDecoder(e).decode(b);a.push({text:t,enc:e.toUpperCase(),s:score(t)})}catch{}return a.sort((x,y)=>y.s-x.s)[0]||{text:new TextDecoder().decode(b),enc:'UTF-8'}}
export function detectPublishers(text){const found=new Map(),add=(raw,w=1)=>{const s=String(raw||'').trim().replace(/^[【\[\s]+|[】\]\s]+$/g,'');if(!s||s.length>12||/^(?:本书|小说|作者|整理|校对|制作|资源|免费|书友|群|群聊|中转|发布|文本)$/u.test(s))return;found.set(s,(found.get(s)||0)+w)};const ps=[[/【\s*([^】\n]{1,12}?)\s*】\s*(?:整理|校对|制作|精校)/gu,2],[/(?:本书由|由)\s*[【\[]?([\p{Script=Han}A-Za-z0-9·_-]{1,12})[】\]]?\s*(?:整理|校对|制作|精校)/gu,3],[/【\s*([\p{Script=Han}A-Za-z0-9·_-]{1,8}?)(?:免费外群|中转群|书友群|交流群)/gu,2],[/([\p{Script=Han}A-Za-z0-9·_-]{1,8}?)(?:免费外群|中转群)\s*[1-9一二三四五六七八九]?号?/gu,2]];for(const[rx,w]of ps)for(const m of text.matchAll(rx))add(m[1],w);return[...found.entries()].sort((a,b)=>b[1]-a[1]).slice(0,24).map(x=>x[0])}
export function reset(){A.scan=null;A.groups=[];A.ad={};A.autoAd={};A.pinyin=null;A.pd={};A.pinyinAuto={};A.final='';A.reviewGroup='autoAd';for(const id of['summaryPanel','donePanel','autoAdSection','adReviewSection','autoPinyinSection','pinyinReviewSection','adStageFooter','pinyinStageFooter','reviewGroups'])$('#'+id)?.classList.add('hidden');$('#reviewEmpty').classList.remove('hidden');badge()}
export function groupRows(rows){const m=new Map();for(const x of rows||[]){const key=x.field+'\0'+x.kind,g=m.get(key)||{field:x.field,kind:x.kind,score:x.score,reason:x.reason,count:0,ctx:x.originalLine,meta:x.meta};g.count++;g.score=Math.max(g.score,x.score);m.set(key,g)}return[...m.values()].sort((a,b)=>b.score-a.score)}
export function family(g){if(g.kind==='full_line_ad')return'整行广告';if(['split_punct_ad','group_code_ad','source_obfuscated_ad'].includes(g.kind))return'标点拆分广告';if(['pollution','obfuscated_ad','standalone_pollution_line','pollution_prefix','group_context_ad','distributed_pollution','pollution_island'].includes(g.kind))return'乱码污染';if(['repeat_anomaly','repeat_pattern','anti_scrape_injection','numeric_injection'].includes(g.kind))return'反采集/重复污染';if(g.kind==='platform_artifact'||g.kind==='chapter_boundary_artifact')return'平台/章节残留';if(g.kind==='ad_pinyin_pollution'||g.kind==='ad_family_evidence')return'广告拼音/主体';if(g.kind==='roman_numeral')return'罗马数字';if(g.kind==='web_link'||g.kind==='html_tag')return'网页残留';if(g.kind==='learned_exact')return'历史精确规则';return g.kind||'其他'}
export function pinyinAutoKey(c){return `${c.original}\0${c.replacement}`}
export function pinyinAutoGroups(){const m=new Map();for(const c of A.pinyin?.auto||[]){const key=pinyinAutoKey(c),g=m.get(key)||{key,original:c.original,replacement:c.replacement,reason:c.reason,confidence:c.confidence,count:0,context:c.context,learnFix:c.learnFix};g.count++;g.confidence=Math.max(g.confidence||0,c.confidence||0);m.set(key,g)}return[...m.values()].sort((a,b)=>b.count-a.count||b.confidence-a.confidence)}
export function badge(){const n=groupRows(A.scan?.auto||[]).length+A.groups.length+pinyinAutoGroups().length+(A.pinyin?.review?.length||0);$('#reviewBadge').textContent=n;$('#reviewBadge').classList.toggle('hidden',!n)}
export function dl(c,n,t='text/plain;charset=utf-8'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:t}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)}
