import {applyMatches,applyPinyinReview,contextualFix} from '../cleaner-core.js';
import {A,$,$$,fmt,esc,toast,view,worker,decode,detectPublishers,reset,groupRows,family,badge,markDirty,dl} from './state.js';

function prog(on,t='正在扫描…',p=10){
  $('#progressPanel').classList.toggle('hidden',!on);$('#progressText').textContent=t;
  $('#progressPercent').textContent=p+'%';$('#progressBar').style.width=p+'%';
}

function setFamilyDecision(g,val){
  const f=family(g);let n=0;
  for(const x of A.groups)if(family(x)===f){A.ad[x.field]=val;n++}
  renderAdReview();toast(`${f}：已${val==='delete'?'删除':'保留'}同类 ${n} 项`);
}

export function renderAdReview(){
  const r=$('#adReviewList');r.innerHTML='';
  for(const g of A.groups){
    A.ad[g.field]??='keep';
    const e=document.createElement('article');e.className='review-card';
    e.innerHTML=`<div><div class="field">${esc(g.field)}</div><div class="reason">${esc(family(g))} · ${esc(g.kind)} · ${g.score.toFixed(1)} · ×${g.count}</div></div>
      <div class="choices"><button data-v="delete">删除</button><button data-v="keep">保留</button></div>
      <div class="family-actions"><button data-family="delete">同类全部删除</button><button data-family="keep">同类全部保留</button></div>
      <div class="context">${esc(g.ctx)}</div>`;
    const bs=[...e.querySelectorAll('.choices button')];
    bs.forEach(b=>{
      const active=(A.ad[g.field]||'keep')===b.dataset.v;
      b.classList.toggle('active',active);b.classList.toggle(b.dataset.v,active);
      b.onclick=()=>{A.ad[g.field]=b.dataset.v;renderAdReview()};
    });
    e.querySelector('[data-family="delete"]').onclick=()=>setFamilyDecision(g,'delete');
    e.querySelector('[data-family="keep"]').onclick=()=>setFamilyDecision(g,'keep');
    r.appendChild(e);
  }
  $('#adReviewSection').classList.toggle('hidden',!A.groups.length);
  $('#reviewEmpty').classList.toggle('hidden',!!A.groups.length);
}

function renderPinyinReview(){
  const r=$('#pinyinReviewList');r.innerHTML='';
  for(const[i,c]of(A.pinyin?.review||[]).entries()){
    A.pd[i]??='keep';
    const e=document.createElement('article');e.className='review-card';
    e.innerHTML=`<div><div class="field">${esc(c.original)} → ${esc(c.replacement)}</div><div class="reason">${Math.round(c.confidence*100)}% · ${esc(c.reason)}</div></div>
      <div class="choices"><button data-v="replace">替换</button><button data-v="keep">保留</button><button data-v="english">英文/名称</button></div>
      <div class="context">${esc(c.context)}</div>`;
    const bs=[...e.querySelectorAll('button')];
    bs.forEach(b=>{
      const active=(A.pd[i]||'keep')===b.dataset.v;
      b.classList.toggle('active',active);b.classList.toggle(b.dataset.v,active);
      b.onclick=()=>{A.pd[i]=b.dataset.v;renderPinyinReview()};
    });
    r.appendChild(e);
  }
  $('#pinyinReviewSection').classList.toggle('hidden',!(A.pinyin?.review?.length));
  $('#reviewEmpty').classList.toggle('hidden',!!(A.pinyin?.review?.length)||!!A.groups.length);badge();
}

export async function scan(){
  if(!A.file)return;reset();$('#scanBtn').disabled=true;
  try{
    prog(true,'识别 TXT 编码…',10);const d=await decode(A.file);A.source=d.text;
    prog(true,'分析广告结构…',25);const pubs=detectPublishers(A.source);
    prog(true,'本地扫描正文…',45);
    A.scan=await worker('scan',{text:A.source,rules:A.rules,opts:{mode:A.mode,publishers:pubs,preserveBlank:true}});
    A.groups=groupRows(A.scan.review);prog(true,'完成',100);setTimeout(()=>prog(false),250);
    $('#summaryPanel').classList.remove('hidden');$('#summaryTitle').textContent=`${A.file.name} · ${d.enc}`;
    $('#mAuto').textContent=fmt(A.scan.auto.length);$('#mReview').textContent=fmt(A.groups.length);
    $('#mPinyinAuto').textContent='—';$('#mPinyinReview').textContent='—';renderAdReview();badge();
    toast(`自动清理 ${A.scan.auto.length} 处`);
  }catch(e){prog(false);toast('扫描失败：'+e.message)}
  finally{$('#scanBtn').disabled=false}
}

export async function pinyinStage(){
  if(!A.scan)return;view('review');
  const sel=A.scan.review.filter(x=>(A.ad[x.field]||'keep')==='delete');
  const text=applyMatches(A.source,[...A.scan.auto,...sel],true);$('#adReviewSection').classList.add('hidden');
  if(!$('#pinyinToggle').checked){A.pinyin={text,auto:[],review:[]};return finish()}
  $('#reviewEmpty').textContent='正在加载离线拼音模型…';
  try{
    A.pinyin=await worker('pinyin',{text,rules:A.rules});A.pd={};
    $('#mPinyinAuto').textContent=fmt(A.pinyin.auto.length);$('#mPinyinReview').textContent=fmt(A.pinyin.review.length);
    renderPinyinReview();if(!A.pinyin.review.length)finish();
  }catch(e){toast('拼音修复失败：'+e.message);A.pinyin={text,auto:[],review:[]};finish()}
}

function addFix(f){
  if(!f?.source||!f?.target)return 0;A.rules.pinyinFixes??=[];
  const x=A.rules.pinyinFixes.find(z=>z.source===f.source&&z.target===f.target);
  if(x){x.count=(x.count||1)+1;return 0}
  A.rules.pinyinFixes.push({source:f.source,target:f.target,count:1});return 1;
}

function learn(){
  let n=0;const gar=new Set(['pollution','obfuscated_ad','standalone_pollution_line','pollution_prefix','group_context_ad']);
  for(const m of A.scan?.auto||[]){
    if(m.kind==='learned_exact'||['html_tag','web_link','roman_numeral'].includes(m.kind))continue;
    const a=gar.has(m.kind)?(A.rules.garbleSamples??=[]):(A.rules.adExact??=[]);
    if(!a.includes(m.field)){a.push(m.field);n++}
  }
  for(const g of A.groups){
    const v=A.ad[g.field]||'keep';
    if(v==='delete'){
      const a=gar.has(g.kind)?(A.rules.garbleSamples??=[]):(A.rules.adExact??=[]);
      if(!a.includes(g.field)){a.push(g.field);n++}
    }else{
      A.rules.keepFields??=[];if(!A.rules.keepFields.includes(g.field)){A.rules.keepFields.push(g.field);n++}
    }
  }
  for(const c of A.pinyin?.auto||[])n+=addFix(c.learnFix||{source:c.original,target:c.replacement});
  for(const[k,v]of Object.entries(A.pd)){
    const c=A.pinyin?.review?.[+k];if(!c)continue;
    if(v==='replace')n+=addFix(c.learnFix||contextualFix(c,c.context||''));
    else if(v==='english'){
      A.rules.englishKeep??=[];if(!A.rules.englishKeep.some(x=>x.toLowerCase()===c.original.toLowerCase())){A.rules.englishKeep.push(c.original);n++}
    }else{
      A.rules.pinyinKeep??=[];const q=c.learnFix?.source||c.original;if(!A.rules.pinyinKeep.includes(q)){A.rules.pinyinKeep.push(q);n++}
    }
  }
  A.rules.stats??={};A.rules.stats.learnedBooks=(A.rules.stats.learnedBooks||0)+1;markDirty(Math.max(1,n));return n;
}

export function finish(){
  A.final=applyPinyinReview(A.pinyin.text,A.pinyin.review||[],A.pd);const n=learn();
  $('#pinyinReviewSection').classList.add('hidden');$('#donePanel').classList.remove('hidden');
  $('#doneText').textContent=`处理完成；本次新增/确认学习约 ${n} 条。小说正文未上传。`;view('clean');badge();
}

export function bindCleanFlow(){
  $('#backCleanBtn').onclick=()=>view('clean');
  $$('#modeGroup button').forEach(b=>b.onclick=()=>{
    $$('#modeGroup button').forEach(x=>x.classList.toggle('active',x===b));A.mode=b.dataset.mode;
  });
  $('#fileInput').onchange=()=>{
    const f=$('#fileInput').files?.[0];if(!f)return;A.file=f;reset();
    $('#fileTitle').textContent=f.name;$('#fileMeta').textContent=`${(f.size/1048576).toFixed(2)} MB · 仅本地读取`;$('#scanBtn').disabled=false;
  };
  $('#scanBtn').onclick=scan;
  $('#goReviewBtn').onclick=()=>{view('review');A.groups.length?renderAdReview():pinyinStage()};
  $('#keepAllAdBtn').onclick=()=>{for(const g of A.groups)A.ad[g.field]='keep';renderAdReview()};
  $('#applyAdBtn').onclick=pinyinStage;
  $('#keepAllPinyinBtn').onclick=()=>{(A.pinyin?.review||[]).forEach((_,i)=>A.pd[i]='keep');renderPinyinReview()};
  $('#finishBtn').onclick=finish;
  $('#downloadBtn').onclick=()=>{if(A.final){const n=(A.file?.name||'novel.txt').replace(/\.txt$/i,'');dl('\ufeff'+A.final,`${n}_去广告.txt`)}};
}
