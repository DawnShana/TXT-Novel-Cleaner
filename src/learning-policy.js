import {A,$,persist} from './state.js';

const STRUCTURAL=new Set(['platform_artifact','chapter_boundary_artifact','anti_scrape_injection','numeric_injection','distributed_pollution','ad_pinyin_pollution','ad_family_evidence','source_obfuscated_ad','split_punct_ad','group_code_ad','repeat_anomaly','repeat_pattern']);
const DEFAULT_RULES={
  platform_artifact:{kind:'platform_artifact',enabled:true,action:'delete_if_standalone'},
  chapter_boundary_artifact:{kind:'chapter_boundary_artifact',enabled:true,action:'delete',minCount:5,minBoundaryRatio:.55},
  anti_scrape_injection:{kind:'anti_scrape_injection',enabled:true,action:'delete_span',minCount:5},
  numeric_injection:{kind:'numeric_injection',enabled:true,action:'review'},
  distributed_pollution:{kind:'distributed_pollution',enabled:true,action:'islands',minIslands:2,hardSignals:3,deleteScope:'islands'},
  ad_pinyin_pollution:{kind:'ad_pinyin_pollution',enabled:true,action:'safe_islands',deleteScope:'islands'},
  source_obfuscated_ad:{kind:'source_obfuscated_ad',enabled:true,action:'delete_span'},
  split_punct_ad:{kind:'split_punct_ad',enabled:true,action:'delete_span'},
  group_code_ad:{kind:'group_code_ad',enabled:true,action:'delete_span'},
  repeat_anomaly:{kind:'repeat_anomaly',enabled:true,action:'review',minCount:5,minChapters:3}
};
let snapshot=null;
function takeSnapshot(){snapshot={ad:new Set(A.personal?.adExact||[]),garble:new Set(A.personal?.garbleSamples||[])}}
function selected(m,isAuto){return isAuto?(A.autoAd?.[m.field]||'delete')!=='restore':(A.ad?.[m.field]||'keep')==='delete'}
function allConfirmed(){const out=[];for(const m of A.scan?.auto||[])if(selected(m,true))out.push(m);for(const m of A.scan?.review||[])if(selected(m,false))out.push(m);return out}
function cleanupStructuralExactLearning(){if(!snapshot||!A.rules||!A.scan)return;const structuralFields=new Set([...(A.scan.auto||[]),...(A.scan.review||[])].filter(m=>STRUCTURAL.has(m.kind)).map(m=>m.field).filter(Boolean));A.rules.adExact=(A.rules.adExact||[]).filter(x=>snapshot.ad.has(x)||!structuralFields.has(x));A.rules.garbleSamples=(A.rules.garbleSamples||[]).filter(x=>snapshot.garble.has(x)||!structuralFields.has(x))}
function upsertRule(kind,count=1){if(!DEFAULT_RULES[kind])return 0;A.rules.structuralRules??=[];const id='learned:'+kind,old=A.rules.structuralRules.find(x=>x.id===id||x.kind===kind);if(old){old.confirmations=(old.confirmations||0)+count;old.lastConfirmedAt=new Date().toISOString();return 0}A.rules.structuralRules.push({id,...structuredClone(DEFAULT_RULES[kind]),confirmations:count,lastConfirmedAt:new Date().toISOString()});return 1}
function upsertRepeat(r){if(!r?.pattern)return 0;A.rules.repeatPatterns??=[];const key=x=>`${x.mode||'literal'}\0${x.pattern||''}\0${x.context||'any'}`,k=key(r),old=A.rules.repeatPatterns.find(x=>key(x)===k);if(old){old.confirmations=(old.confirmations||0)+1;old.lastSeenCount=Math.max(old.lastSeenCount||0,r.lastSeenCount||0);old.enabled=true;return 0}A.rules.repeatPatterns.push({...structuredClone(r),id:r.id||`repeat-${Date.now().toString(36)}`,enabled:true,confirmations:r.confirmations||1});return 1}
function learnStructures(){if(!A.rules||!A.scan)return;let added=0,confirmed=0;for(const m of allConfirmed()){if(!STRUCTURAL.has(m.kind))continue;confirmed++;added+=upsertRule(m.kind==='repeat_pattern'?'repeat_anomaly':m.kind,1);const rp=m.meta?.repeatPattern;if(rp)added+=upsertRepeat(rp)}for(const d of A.scan.discoveries||[]){if(d.kind!=='repeat_anomaly'||!d.learn)continue;const any=[...(A.scan.auto||[]),...(A.scan.review||[])].filter(m=>m.meta?.repeatPattern?.id===d.learn.id);if(any.some(m=>(A.scan.auto||[]).includes(m)?selected(m,true):selected(m,false)))added+=upsertRepeat(d.learn)}A.rules.stats??={};A.rules.stats.structuralConfirmed=(A.rules.stats.structuralConfirmed||0)+confirmed;A.rules.stats.structuralRuleAdds=(A.rules.stats.structuralRuleAdds||0)+added;A.rules.stats.lastStructuralLearnAt=new Date().toISOString();persist()}
export function bindLearningPolicy(){const btn=$('#finishBtn');if(!btn)return;btn.addEventListener('click',()=>{takeSnapshot();setTimeout(()=>{cleanupStructuralExactLearning();learnStructures();snapshot=null},0)},true)}
