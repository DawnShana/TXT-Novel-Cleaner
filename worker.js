import {scanText,repairPinyin} from './cleaner-core.js';
let model=null;
async function getModel(){if(model)return model;const [p,u,b,t]=await Promise.all(['pinyin-p.json','pinyin-u.json','pinyin-b.json','pinyin-t.json'].map(async x=>{const r=await fetch('./'+x);if(!r.ok)throw new Error('拼音模型加载失败：'+x);return r.json()}));model={...p,...u,...b,...t};return model;}
self.onmessage=async e=>{const {id,type}=e.data||{};try{if(type==='scan'){const {text,rules,opts}=e.data;self.postMessage({id,ok:true,result:scanText(text,rules,opts)});}else if(type==='pinyin'){const {text,rules}=e.data;self.postMessage({id,ok:true,result:repairPinyin(text,rules,await getModel())});}else throw new Error('未知任务');}catch(err){self.postMessage({id,ok:false,error:String(err?.stack||err)});}};
