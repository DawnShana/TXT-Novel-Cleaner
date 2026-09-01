import {mergeRules as mergeLegacy} from '../cleaner-core.js';

export const STRUCTURAL_TYPES=['repeatPatterns','adFamilies','adPinyinFamilies','structuralRules'];
export const ALL_RULE_TYPES=['adExact','garbleSamples','keepFields','pinyinKeep','englishKeep','pinyinFixes',...STRUCTURAL_TYPES];

export function emptyRules(){
  return {
    schema:2,version:1,adExact:[],garbleSamples:[],keepFields:[],pinyinFixes:[],pinyinKeep:[],englishKeep:[],
    repeatPatterns:[],adFamilies:[],adPinyinFamilies:[],structuralRules:[],stats:{learnedBooks:0}
  };
}

function stable(v){
  if(v==null)return '';
  if(typeof v!=='object')return String(v);
  if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
  return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
}

function objectIdentity(type,v){
  if(v?.id)return `${type}\0id:${v.id}`;
  if(type==='repeatPatterns')return `${type}\0${v?.mode||'literal'}\0${v?.pattern||''}\0${v?.context||'any'}`;
  if(type==='adFamilies'||type==='adPinyinFamilies')return `${type}\0${(v?.aliases||[]).map(String).sort().join('|')}`;
  if(type==='structuralRules')return `${type}\0${v?.kind||''}\0${v?.scope||'global'}`;
  return `${type}\0object`;
}
export function objectRuleKey(type,v){return objectIdentity(type,v)+'\0'+stable(v)}

export function ruleKey(type,v){
  if(type==='pinyinFixes')return `${type}\0${v?.source||''}\0${v?.target||''}`;
  if(STRUCTURAL_TYPES.includes(type))return objectRuleKey(type,v);
  return `${type}\0${String(v??'')}`;
}

function mergeObjectArray(type,base=[],delta=[]){
  const map=new Map();
  for(const v of [...(base||[]),...(delta||[])]){
    if(!v||typeof v!=='object')continue;
    const k=objectIdentity(type,v),old=map.get(k)||{};
    map.set(k,{...old,...structuredClone(v)});
  }
  return [...map.values()];
}

export function ensureRules(r={}){
  const o={...emptyRules(),...structuredClone(r||{})};
  for(const k of ['adExact','garbleSamples','keepFields','pinyinFixes','pinyinKeep','englishKeep',...STRUCTURAL_TYPES])if(!Array.isArray(o[k]))o[k]=[];
  o.schema=Math.max(2,+o.schema||0);
  o.stats={...(o.stats||{})};
  return o;
}

export function mergeRulesExt(base={},delta={}){
  const b=ensureRules(base),d=ensureRules(delta),o=ensureRules(mergeLegacy(b,d));
  for(const k of STRUCTURAL_TYPES)o[k]=mergeObjectArray(k,b[k],d[k]);
  o.schema=Math.max(2,+b.schema||0,+d.schema||0);
  o.version=Math.max(+b.version||0,+d.version||0);
  return o;
}

export function subtractRules(all={},base={}){
  const a=ensureRules(all),b=ensureRules(base),o=emptyRules();
  const sub=(x,y)=>{const s=new Set((y||[]).map(String));return(x||[]).filter(v=>!s.has(String(v)))};
  for(const k of ['adExact','garbleSamples','keepFields','pinyinKeep','englishKeep'])o[k]=sub(a[k],b[k]);
  const pbase=new Set((b.pinyinFixes||[]).map(v=>ruleKey('pinyinFixes',v)));o.pinyinFixes=(a.pinyinFixes||[]).filter(v=>!pbase.has(ruleKey('pinyinFixes',v)));
  for(const k of STRUCTURAL_TYPES){const bk=new Set((b[k]||[]).map(v=>ruleKey(k,v)));o[k]=(a[k]||[]).filter(v=>!bk.has(ruleKey(k,v)))}
  o.version=a.version||1;o.updatedAt=new Date().toISOString();o.stats={...(a.stats||{})};return o;
}

export function countRules(r={}){
  const x=ensureRules(r);return ALL_RULE_TYPES.reduce((n,k)=>n+(x[k]?.length||0),0);
}
