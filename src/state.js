import {mergeRules} from '../cleaner-core.js';

export const $=s=>document.querySelector(s);
export const $$=s=>[...document.querySelectorAll(s)];
export const fmt=n=>Number(n||0).toLocaleString('zh-CN');
export const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

export const A={
  mode:'balanced',file:null,source:'',rules:null,base:null,baseSources:[],personal:null,syncedPersonal:null,
  scan:null,groups:[],ad:{},autoAd:{},pinyin:null,pd:{},pinyinAuto:{},
  reviewGroup:'autoAd',final:'',dirty:0,w:null,id:0,edit:null
};

export const LS='novelCleaner.localRules.v2';
export const LG='novelCleaner.git.v1';
export const SYNCED='novelCleaner.syncedRules.v1';
export const B=[
  'rules/builtin/builtin-ad-1.json',
  'rules/builtin/builtin-ad-2.json',
  'rules/builtin/builtin-ad-3.json',
  'rules/builtin/builtin-ad-4.json',
  'rules/builtin/builtin-ad-5.json'
];

export const TYPE_LABEL={
  adExact:'广告',garbleSamples:'乱码',pinyinFixes:'拼音修复',
  keepFields:'保留覆盖',pinyinKeep:'拼音保留',englishKeep:'英文/名称'
};

const RULE_TYPES=['adExact','garbleSamples','keepFields','pinyinKeep','englishKeep','pinyinFixes'];

export function toast(s){
  const e=$('#toast');
  e.textContent=s;e.classList.add('show');clearTimeout(e.t);
  e.t=setTimeout(()=>e.classList.remove('show'),2400);
}

export function view(v){
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  $$('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${v}`));
  document.dispatchEvent(new CustomEvent('novel:view',{detail:v}));
}

export function empty(){
  return {schema:1,version:1,adExact:[],garbleSamples:[],keepFields:[],pinyinFixes:[],pinyinKeep:[],englishKeep:[],stats:{learnedBooks:0}};
}

export function subtract(all,base){
  const o=empty(),sub=(a,b)=>{const s=new Set(b||[]);return(a||[]).filter(x=>!s.has(x))};
  o.version=A.personal?.version||all?.version||1;o.updatedAt=new Date().toISOString();
  for(const k of ['adExact','garbleSamples','keepFields','pinyinKeep','englishKeep'])o[k]=sub(all?.[k],base?.[k]);
  const bm=new Set((base?.pinyinFixes||[]).map(x=>x.source+'\0'+x.target));
  o.pinyinFixes=(all?.pinyinFixes||[]).filter(x=>!bm.has(x.source+'\0'+x.target));
  o.stats={learnedBooks:all?.stats?.learnedBooks||0,adExact:o.adExact.length,garbleSamples:o.garbleSamples.length,pinyinFixes:o.pinyinFixes.length};
  return o;
}

export function countRuleSet(r){
  return ['adExact','garbleSamples','keepFields','pinyinKeep','englishKeep']
    .reduce((n,k)=>n+(r?.[k]?.length||0),0)+(r?.pinyinFixes?.length||0);
}

function sameKey(type,value){
  if(type==='pinyinFixes')return `${type}\0${value?.source||''}\0${value?.target||''}\0${Math.max(1,+value?.count||1)}`;
  return `${type}\0${String(value??'')}`;
}

function flattenRuleSet(r){
  const out=[];
  for(const type of RULE_TYPES){
    const arr=r?.[type]||[];
    arr.forEach((value,index)=>out.push({type,index,value,key:sameKey(type,value)}));
  }
  return out;
}

export function pendingRuleChanges(){
  const cur=flattenRuleSet(A.personal||empty()),old=flattenRuleSet(A.syncedPersonal||empty());
  const curSet=new Set(cur.map(x=>x.key)),oldSet=new Set(old.map(x=>x.key));
  const added=cur.filter(x=>!oldSet.has(x.key)).map(x=>({...x,change:'pending',editable:true}));
  const deleted=old.filter(x=>!curSet.has(x.key)).map(x=>({...x,change:'deleted',editable:false}));
  return [...added,...deleted];
}

export function refreshDirty(){
  A.dirty=pendingRuleChanges().length;
  const e=$('#pendingSync');
  if(e){e.textContent=`待同步 ${fmt(A.dirty)}`;e.classList.toggle('dirty',A.dirty>0)}
  return A.dirty;
}

export function persist(){
  A.personal=subtract(A.rules,A.base);
  localStorage.setItem(LS,JSON.stringify(A.personal));
  counts();refreshDirty();
}

export function markDirty(){
  if(A.personal)A.personal.version=(+A.personal.version||1)+1;
  persist();
}

async function j(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw Error(`${url} HTTP ${r.status}`);
  return r.json();
}

export async function loadRules(){
  try{
    const [remotePersonal,...bs]=await Promise.all([j(`./rules.json?t=${Date.now()}`),...B.map(x=>j('./'+x))]);
    let base=empty();for(const b of bs)base=mergeRules(base,b);
    let cachedSynced=null,local=null;
    try{cachedSynced=JSON.parse(localStorage.getItem(SYNCED)||'null')}catch{}
    try{local=JSON.parse(localStorage.getItem(LS)||'null')}catch{}
    const synced=(cachedSynced&&(+cachedSynced.version||0)>(+remotePersonal.version||0))?cachedSynced:remotePersonal;
    let personal=remotePersonal;
    if(local&&(+local.version||0)>(+remotePersonal.version||0))personal=local;
    A.base=base;A.baseSources=bs.map((rules,i)=>({path:B[i],rules}));A.syncedPersonal=synced;A.personal=personal;A.rules=mergeRules(base,personal);
    localStorage.setItem(SYNCED,JSON.stringify(synced));
    $('#ruleStatus').className='dot ready';
    $('#ruleStatusText').textContent=`内置 ${fmt(countRuleSet(base))} · 个人 ${fmt(countRuleSet(personal))}`;
    persist();
  }catch(e){
    $('#ruleStatus').className='dot error';$('#ruleStatusText').textContent='规则加载失败';toast(e.message);
  }
}

export function counts(){
  if(!A.rules)return;const p=A.personal||empty();
  $('#rAd').textContent=fmt(countRuleSet(A.base));
  $('#rGarble').textContent=fmt(countRuleSet(p));
  $('#rPinyin').textContent=fmt(p.pinyinFixes?.length||0);
  $('#rKeep').textContent=fmt((p.keepFields?.length||0)+(p.englishKeep?.length||0)+(p.pinyinKeep?.length||0));
}

export function worker(type,payload){
  if(!A.w)A.w=new Worker('./worker.js',{type:'module'});
  const id=++A.id;
  return new Promise((ok,no)=>{
    const h=e=>{if(e.data?.id!==id)return;A.w.removeEventListener('message',h);e.data.ok?ok(e.data.result):no(Error(e.data.error))};
    A.w.addEventListener('message',h);A.w.postMessage({id,type,...payload});
  });
}

function score(s){return(s.match(/[\u3400-\u9fff]/g)||[]).length*.02-(s.match(/�/g)||[]).length*10}

export async function decode(f){
  const b=await f.arrayBuffer(),u=new Uint8Array(b);
  if(u[0]===0xef&&u[1]===0xbb&&u[2]===0xbf)return{text:new TextDecoder().decode(b),enc:'UTF-8 BOM'};
  try{return{text:new TextDecoder('utf-8',{fatal:true}).decode(b),enc:'UTF-8'}}catch{}
  const a=[];
  for(const e of ['gb18030','big5'])try{const t=new TextDecoder(e).decode(b);a.push({text:t,enc:e.toUpperCase(),s:score(t)})}catch{}
  return a.sort((x,y)=>y.s-x.s)[0]||{text:new TextDecoder().decode(b),enc:'UTF-8'};
}

export function detectPublishers(text){
  const found=new Map();
  const add=(raw,w=1)=>{
    const s=String(raw||'').trim().replace(/^[【\[\s]+|[】\]\s]+$/g,'');
    if(!s||s.length>12||/^(?:本书|小说|作者|整理|校对|制作|资源|免费|书友|群|群聊|中转|发布|文本)$/u.test(s))return;
    found.set(s,(found.get(s)||0)+w);
  };
  const ps=[
    [/【\s*([^】\n]{1,12}?)\s*】\s*(?:整理|校对|制作|精校)/gu,2],
    [/(?:本书由|由)\s*[【\[]?([\p{Script=Han}A-Za-z0-9·_-]{1,12})[】\]]?\s*(?:整理|校对|制作|精校)/gu,3],
    [/【\s*([\p{Script=Han}A-Za-z0-9·_-]{1,8}?)(?:免费外群|中转群|书友群|交流群)/gu,2],
    [/([\p{Script=Han}A-Za-z0-9·_-]{1,8}?)(?:免费外群|中转群)\s*[1-9一二三四五六七八九]?号?/gu,2]
  ];
  for(const[rx,w]of ps)for(const m of text.matchAll(rx))add(m[1],w);
  return[...found.entries()].sort((a,b)=>b[1]-a[1]).slice(0,24).map(x=>x[0]);
}

export function reset(){
  A.scan=null;A.groups=[];A.ad={};A.autoAd={};A.pinyin=null;A.pd={};A.pinyinAuto={};A.final='';A.reviewGroup='autoAd';
  for(const id of['summaryPanel','donePanel','autoAdSection','adReviewSection','autoPinyinSection','pinyinReviewSection','adStageFooter','pinyinStageFooter','reviewGroups'])$('#'+id)?.classList.add('hidden');
  $('#reviewEmpty').classList.remove('hidden');badge();
}

export function groupRows(rows){
  const m=new Map();
  for(const x of rows||[]){
    const g=m.get(x.field)||{field:x.field,kind:x.kind,score:x.score,reason:x.reason,count:0,ctx:x.originalLine};
    g.count++;g.score=Math.max(g.score,x.score);m.set(x.field,g);
  }
  return[...m.values()].sort((a,b)=>b.score-a.score);
}

export function family(g){
  if(g.kind==='full_line_ad')return'整行广告';
  if(['split_punct_ad','group_code_ad'].includes(g.kind))return'标点拆分广告';
  if(['pollution','obfuscated_ad','standalone_pollution_line','pollution_prefix','group_context_ad'].includes(g.kind))return'乱码污染';
  if(g.kind==='roman_numeral')return'罗马数字';
  if(g.kind==='web_link'||g.kind==='html_tag')return'网页残留';
  if(g.kind==='learned_exact')return'已学习字段';
  return g.kind||'其他';
}

export function pinyinAutoKey(c){return `${c.original}\0${c.replacement}`}

export function pinyinAutoGroups(){
  const m=new Map();
  for(const c of A.pinyin?.auto||[]){
    const key=pinyinAutoKey(c),g=m.get(key)||{key,original:c.original,replacement:c.replacement,reason:c.reason,confidence:c.confidence,count:0,context:c.context,learnFix:c.learnFix};
    g.count++;g.confidence=Math.max(g.confidence||0,c.confidence||0);m.set(key,g);
  }
  return[...m.values()].sort((a,b)=>b.count-a.count||b.confidence-a.confidence);
}

export function badge(){
  const n=groupRows(A.scan?.auto||[]).length+A.groups.length+pinyinAutoGroups().length+(A.pinyin?.review?.length||0);
  $('#reviewBadge').textContent=n;$('#reviewBadge').classList.toggle('hidden',!n);
}

export function dl(c,n,t='text/plain;charset=utf-8'){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:t}));a.download=n;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),800);
}
