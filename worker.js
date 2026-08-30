import {scanText,repairPinyin} from './cleaner-core.js';
let model=null;
async function getModel(){if(model)return model;const r=await fetch('./pinyin-model.json');if(!r.ok)throw new Error('拼音模型加载失败');model=await r.json();return model;}
self.onmessage=async e=>{const {id,type}=e.data||{};try{if(type==='scan'){const {text,rules,opts}=e.data;const result=scanText(text,rules,opts);self.postMessage({id,ok:true,result});}else if(type==='pinyin'){const {text,rules}=e.data;const m=await getModel();const result=repairPinyin(text,rules,m);self.postMessage({id,ok:true,result});}else throw new Error('未知任务');}catch(err){self.postMessage({id,ok:false,error:String(err?.stack||err)});}};
