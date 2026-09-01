import {scanText,repairPinyin,applyMatches} from './cleaner-core.js';
import {mergeAdPinyinScan,gatePinyinResult} from './ad-pinyin-overlay.js';
import {mergeStructuralScan,gateStructuralPinyin} from './structural-engine.js';
let model=null;

async function getModel(){
  if(model)return model;
  const [p,u,b,t]=await Promise.all(['pinyin-p.json','pinyin-u.json','pinyin-b.json','pinyin-t.json'].map(async x=>{
    const r=await fetch('./'+x);if(!r.ok)throw new Error('拼音模型加载失败：'+x);return r.json();
  }));
  model={...p,...u,...b,...t};return model;
}

function looksInjectedParen(field){
  const s=String(field||'');
  if(!/^[（(].*[)）]$/u.test(s))return true;
  const core=s.slice(1,-1).trim();
  if(/^[a-z]{3,8}$/.test(core))return true;
  if(/^[的吗赵王诺钱好得李了]{3,6}$/u.test(core)&&(core.startsWith('的')||core.startsWith('吗')||/[赵王诺钱李]/u.test(core)))return true;
  return false;
}
function protectStoryEmotes(result,text,opts){
  const safe=m=>m.kind!=='anti_scrape_injection'||looksInjectedParen(m.field);
  result.auto=(result.auto||[]).filter(safe);result.review=(result.review||[]).filter(safe);
  result.cleaned=applyMatches(text,result.auto,opts?.preserveBlank!==false);result.stats={...(result.stats||{}),auto:result.auto.length,review:result.review.length};return result;
}

self.onmessage=async e=>{
  const {id,type}=e.data||{};
  try{
    if(type==='scan'){
      const {text,rules,opts}=e.data;
      let result=protectStoryEmotes(scanText(text,rules,opts),text,opts);
      result=mergeAdPinyinScan(result,text,rules,applyMatches,opts?.preserveBlank!==false);
      result=mergeStructuralScan(result,text,rules,applyMatches,opts?.preserveBlank!==false);
      self.postMessage({id,ok:true,result});
    }else if(type==='pinyin'){
      const {text,rules}=e.data;
      let result=repairPinyin(text,rules,await getModel());
      result=gatePinyinResult(text,result,rules);
      result=gateStructuralPinyin(text,result,rules);
      self.postMessage({id,ok:true,result});
    }else throw new Error('未知任务');
  }catch(err){self.postMessage({id,ok:false,error:String(err?.stack||err)});}
};
