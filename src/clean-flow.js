import {applyMatches,applyPinyinReview,contextualFix} from '../cleaner-core.js';
import {A,$,$$,fmt,esc,toast,view,worker,decode,detectPublishers,reset,groupRows,family,badge,markDirty,dl,pinyinAutoKey,pinyinAutoGroups} from './state.js';

const MODE_TEXT={
  conservative:'保守：只自动处理已学习规则、网页/HTML 与极高置信广告；其余更多进入复核。',
  balanced:'平衡：高置信内容自动处理，边界项进入复核；这是默认推荐模式。',
  aggressive:'激进：扩大自动删除范围；适合污染严重文本，请重点检查“自动清理”分组。'
};

function prog(on,t='正在扫描…',p=10){
  $('#progressPanel').classList.toggle('hidden',!on);$('#progressText').textContent=t;
  $('#progressPercent').textContent=p+'%';$('#progressBar').style.width=p+'%';
}

function profileScan(scan,mode){
  if(mode==='balanced')return scan;
  const all=[...(scan.auto||[]),...(scan.review||[])],auto=[],review=[];
  for(const m of all){
    let del=(scan.auto||[]).includes(m);
    if(mode==='conservative'){
      del=['learned_exact','web_link','html_tag'].includes(m.kind)
        ||(m.kind==='split_punct_ad'&&m.score>=12)
        ||(m.kind==='group_code_ad'&&m.score>=11)
        ||(m.kind==='full_line_ad'&&m.score>=11);
    }else if(mode==='aggressive'){
      if(m.kind==='roman_numeral')del=false;
      else if(['split_punct_ad','group_code_ad','full_line_ad'].includes(m.kind))del=true;
      else if(['pollution','obfuscated_ad','standalone_pollution_line','pollution_prefix','group_context_ad'].includes(m.kind)&&m.score>=4.5)del=true;
    }
    (del?auto:review).push(m);
  }
  return {...scan,auto,review,stats:{...(scan.stats||{}),auto:auto.length,review:review.length}};
}

function highlight(text,needle,kind='hit'){
  const s=String(text??''),q=String(needle??'');
  if(!q)return esc(s);
  const i=s.indexOf(q);
  if(i<0)return esc(s);
  return `${esc(s.slice(0,i))}<mark class="detected ${kind}">${esc(q)}</mark>${esc(s.slice(i+q.length))}`;
}

function invalidatePinyin(){
  if(!A.pinyin)return;
  A.pinyin=null;A.pd={};A.pinyinAuto={};
  $('#mPinyinAuto').textContent='—';$('#mPinyinReview').textContent='—';
  $('#autoPinyinSection').classList.add('hidden');$('#pinyinReviewSection').classList.add('hidden');$('#pinyinStageFooter').classList.add('hidden');
  $('#adStageFooter').classList.remove('hidden');renderReviewGroups();toast('广告决定已变化，请重新进入拼音修复');
}

function setFamilyDecision(g,val){
  const f=family(g);let n=0;
  for(const x of A.groups)if(family(x)===f){A.ad[x.field]=val;n++}
  invalidatePinyin();renderAdReview();toast(`${f}：已${val==='delete'?'删除':'保留'}同类 ${n} 项`);
}

function setReviewGroup(group){
  A.reviewGroup=group;
  const map={autoAd:'autoAdSection',reviewAd:'adReviewSection',autoPinyin:'autoPinyinSection',reviewPinyin:'pinyinReviewSection'};
  for(const [k,id] of Object.entries(map))$('#'+id).classList.toggle('hidden',k!==group);
  $$('#reviewGroups [data-review-group]').forEach(b=>b.classList.toggle('active',b.dataset.reviewGroup===group));
}

export function renderReviewGroups(prefer){
  if(!A.scan){$('#reviewGroups').classList.add('hidden');$('#reviewEmpty').classList.remove('hidden');return}
  const counts={autoAd:groupRows(A.scan.auto||[]).length,reviewAd:A.groups.length,autoPinyin:pinyinAutoGroups().length,reviewPinyin:A.pinyin?.review?.length||0};
  $('#gAutoAd').textContent=fmt(counts.autoAd);$('#gReviewAd').textContent=fmt(counts.reviewAd);$('#gAutoPinyin').textContent=fmt(counts.autoPinyin);$('#gReviewPinyin').textContent=fmt(counts.reviewPinyin);
  $('#reviewGroups').classList.remove('hidden');$('#reviewEmpty').classList.add('hidden');
  $$('#reviewGroups [data-review-group]').forEach(b=>{b.disabled=!counts[b.dataset.reviewGroup]});
  let target=prefer||A.reviewGroup;if(!counts[target])target=['reviewAd','autoAd','reviewPinyin','autoPinyin'].find(k=>counts[k])||'autoAd';
  setReviewGroup(target);$('#adStageFooter').classList.toggle('hidden',!!A.pinyin);$('#pinyinStageFooter').classList.toggle('hidden',!A.pinyin);badge();
}

function renderAutoAd(){
  const r=$('#autoAdList');r.innerHTML='';
  for(const g of groupRows(A.scan?.auto||[])){
    A.autoAd[g.field]??='delete';const e=document.createElement('article');e.className='review-card';
    e.innerHTML=`<div><div class="field"><mark class="detected ad-hit">${esc(g.field)}</mark></div><div class="reason">${esc(family(g))} · ${esc(g.kind)} · ${g.score.toFixed(1)} · ×${g.count}</div></div><div class="choices"><button data-v="delete">保持删除</button><button data-v="restore">恢复原文</button></div><div class="context">${highlight(g.ctx,g.field,'ad-hit')}</div>`;
    e.querySelectorAll('.choices button').forEach(b=>{const active=(A.autoAd[g.field]||'delete')===b.dataset.v;b.classList.toggle('active',active);b.classList.toggle(b.dataset.v==='delete'?'delete':'keep',active);b.onclick=()=>{A.autoAd[g.field]=b.dataset.v;invalidatePinyin();renderAutoAd()}});r.appendChild(e);
  }
}

export function renderAdReview(){
  const r=$('#adReviewList');r.innerHTML='';
  for(const g of A.groups){
    A.ad[g.field]??='keep';const e=document.createElement('article');e.className='review-card';
    e.innerHTML=`<div><div class="field"><mark class="detected ad-hit">${esc(g.field)}</mark></div><div class="reason">${esc(family(g))} · ${esc(g.kind)} · ${g.score.toFixed(1)} · ×${g.count}</div></div><div class="choices"><button data-v="delete">删除</button><button data-v="keep">保留</button></div><div class="family-actions"><button data-family="delete">同类全部删除</button><button data-family="keep">同类全部保留</button></div><div class="context">${highlight(g.ctx,g.field,'ad-hit')}</div>`;
    [...e.querySelectorAll('.choices button')].forEach(b=>{const active=(A.ad[g.field]||'keep')===b.dataset.v;b.classList.toggle('active',active);b.classList.toggle(b.dataset.v,active);b.onclick=()=>{A.ad[g.field]=b.dataset.v;invalidatePinyin();renderAdReview()}});
    e.querySelector('[data-family="delete"]').onclick=()=>setFamilyDecision(g,'delete');e.querySelector('[data-family="keep"]').onclick=()=>setFamilyDecision(g,'keep');r.appendChild(e);
  }
}

function renderAutoPinyin(){
  const r=$('#autoPinyinList');r.innerHTML='';
  for(const g of pinyinAutoGroups()){
    A.pinyinAuto[g.key]??='replace';const e=document.createElement('article');e.className='review-card';
    e.innerHTML=`<div><div class="field"><mark class="detected pinyin-hit">${esc(g.original)}</mark> → ${esc(g.replacement)}</div><div class="reason">${Math.round((g.confidence||1)*100)}% · ${esc(g.reason||'自动拼音修复')} · ×${g.count}</div></div><div class="choices"><button data-v="replace">保持替换</button><button data-v="keep">恢复原文</button></div><div class="context">${highlight(g.context||'',g.original,'pinyin-hit')}</div>`;
    e.querySelectorAll('.choices button').forEach(b=>{const active=(A.pinyinAuto[g.key]||'replace')===b.dataset.v;b.classList.toggle('active',active);b.classList.toggle(b.dataset.v==='replace'?'replace':'keep',active);b.onclick=()=>{A.pinyinAuto[g.key]=b.dataset.v;renderAutoPinyin()}});r.appendChild(e);
  }
}

function renderPinyinReview(){
  const r=$('#pinyinReviewList');r.innerHTML='';
  for(const[i,c]of(A.pinyin?.review||[]).entries()){
    A.pd[i]??='keep';const target=c.customTarget||c.replacement;const custom=!!c.customTarget;const e=document.createElement('article');e.className='review-card';
    e.innerHTML=`<div><div class="field"><mark class="detected pinyin-hit">${esc(c.original)}</mark> → <span class="proposed-target ${custom?'custom':''}">${esc(target)}</span>${custom?'<i class="custom-badge">自定义</i>':''}</div><div class="reason">${Math.round(c.confidence*100)}% · ${esc(c.reason)}</div></div><div class="choices"><button data-v="replace">替换</button><button data-v="keep">保留</button><button data-v="english">英文/名称</button></div><div class="custom-replace"><input data-custom-input value="${esc(c.customTarget||'')}" placeholder="自定义替换内容，例如 象 / 洗脑"><button data-custom-apply>应用自定义并学习</button></div><div class="context">${highlight(c.context,c.original,'pinyin-hit')}</div>`;
    [...e.querySelectorAll('.choices button')].forEach(b=>{const active=(A.pd[i]||'keep')===b.dataset.v;b.classList.toggle('active',active);b.classList.toggle(b.dataset.v,active);b.onclick=()=>{A.pd[i]=b.dataset.v;renderPinyinReview()}});
    const input=e.querySelector('[data-custom-input]');
    const apply=()=>{const v=input.value.trim();if(!v)return toast('请填写自定义替换内容');c.customTarget=v;A.pd[i]='custom';renderPinyinReview();toast(`已设置：${c.original} → ${v}，完成后写入个人拼音规则`)};
    e.querySelector('[data-custom-apply]').onclick=apply;input.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();apply()}};
    r.appendChild(e);
  }badge();
}

function selectedAutoAd(){return(A.scan?.auto||[]).filter(m=>(A.autoAd[m.field]||'delete')!=='restore')}

export async function scan(){
  if(!A.file)return;reset();$('#scanBtn').disabled=true;
  try{
    prog(true,'识别 TXT 编码…',10);const d=await decode(A.file);A.source=d.text;prog(true,'分析广告结构…',25);const pubs=detectPublishers(A.source);prog(true,'本地扫描正文…',45);
    A.scan=await worker('scan',{text:A.source,rules:A.rules,opts:{mode:A.mode,publishers:pubs,preserveBlank:true}});A.scan=profileScan(A.scan,A.mode);A.groups=groupRows(A.scan.review);for(const g of groupRows(A.scan.auto))A.autoAd[g.field]='delete';
    prog(true,'完成',100);setTimeout(()=>prog(false),250);$('#summaryPanel').classList.remove('hidden');$('#summaryTitle').textContent=`${A.file.name} · ${d.enc}`;$('#mAuto').textContent=fmt(A.scan.auto.length);$('#mReview').textContent=fmt(A.groups.length);$('#mPinyinAuto').textContent='—';$('#mPinyinReview').textContent='—';$('#summaryNote').textContent=MODE_TEXT[A.mode]+' 进入复核后可查看自动处理内容并恢复。';renderAutoAd();renderAdReview();renderReviewGroups(A.groups.length?'reviewAd':'autoAd');toast(`${A.mode==='conservative'?'保守':A.mode==='aggressive'?'激进':'平衡'}模式：自动清理 ${A.scan.auto.length} 处`);
  }catch(e){prog(false);toast('扫描失败：'+e.message)}finally{$('#scanBtn').disabled=false}
}

export async function pinyinStage(){
  if(!A.scan)return;view('review');const sel=A.scan.review.filter(x=>(A.ad[x.field]||'keep')==='delete');const text=applyMatches(A.source,[...selectedAutoAd(),...sel],true);$('#adStageFooter').classList.add('hidden');
  if(!$('#pinyinToggle').checked){A.pinyin={text,auto:[],review:[]};renderAutoPinyin();renderPinyinReview();renderReviewGroups('autoAd');return}
  $('#reviewEmpty').textContent='正在加载离线拼音模型…';
  try{const blocked=new Set(A.rules?.pinyinKeep||[]),effective={...A.rules,pinyinFixes:(A.rules?.pinyinFixes||[]).filter(f=>!blocked.has(f.source))};A.pinyin=await worker('pinyin',{text,rules:effective});A.pd={};A.pinyinAuto={};for(const g of pinyinAutoGroups())A.pinyinAuto[g.key]='replace';$('#mPinyinAuto').textContent=fmt(A.pinyin.auto.length);$('#mPinyinReview').textContent=fmt(A.pinyin.review.length);renderAutoPinyin();renderPinyinReview();renderReviewGroups(A.pinyin.review.length?'reviewPinyin':(A.pinyin.auto.length?'autoPinyin':'autoAd'))}catch(e){toast('拼音修复失败：'+e.message);A.pinyin={text,auto:[],review:[]};renderReviewGroups('autoAd')}
}

function addFix(f){if(!f?.source||!f?.target)return 0;A.rules.pinyinFixes??=[];const x=A.rules.pinyinFixes.find(z=>z.source===f.source&&z.target===f.target);if(x){x.count=(x.count||1)+1;return 0}A.rules.pinyinFixes.push({source:f.source,target:f.target,count:1});return 1}
function addKeep(type,value){if(!value)return 0;A.rules[type]??=[];const a=A.rules[type];if(a.some(x=>String(x).toLowerCase()===String(value).toLowerCase()))return 0;a.push(value);return 1}
function customFix(c){
  const target=String(c.customTarget||'').trim();if(!target)return null;
  const f=c.learnFix;if(f?.source){let t=String(f.target||'');if(t.includes(c.replacement))t=t.replace(c.replacement,target);else t=target;return{source:f.source,target:t,count:1}}
  return{source:c.original,target,count:1};
}

function learn(){
  let n=0;const gar=new Set(['pollution','obfuscated_ad','standalone_pollution_line','pollution_prefix','group_context_ad']);
  for(const m of A.scan?.auto||[]){if((A.autoAd[m.field]||'delete')==='restore'){n+=addKeep('keepFields',m.field);continue}if(m.kind==='learned_exact'||['html_tag','web_link','roman_numeral'].includes(m.kind))continue;const a=gar.has(m.kind)?(A.rules.garbleSamples??=[]):(A.rules.adExact??=[]);if(!a.includes(m.field)){a.push(m.field);n++}}
  for(const g of A.groups){const v=A.ad[g.field]||'keep';if(v==='delete'){const a=gar.has(g.kind)?(A.rules.garbleSamples??=[]):(A.rules.adExact??=[]);if(!a.includes(g.field)){a.push(g.field);n++}}else n+=addKeep('keepFields',g.field)}
  for(const c of A.pinyin?.auto||[]){if((A.pinyinAuto[pinyinAutoKey(c)]||'replace')!=='keep')n+=addFix(c.learnFix||{source:c.original,target:c.replacement})}
  for(const[k,v]of Object.entries(A.pd)){
    const c=A.pinyin?.review?.[+k];if(!c)continue;
    if(v==='replace')n+=addFix(c.learnFix||contextualFix(c,c.context||''));
    else if(v==='custom')n+=addFix(customFix(c));
    else if(v==='english')n+=addKeep('englishKeep',c.original);
    // 普通“保留原文”只作用于本次，不默认写入 pinyinKeep。
  }
  A.rules.stats??={};A.rules.stats.learnedBooks=(A.rules.stats.learnedBooks||0)+1;markDirty(Math.max(1,n));return n;
}

function nearest(hay,needle,want){let p=hay.indexOf(needle),best=-1,d=Infinity;while(p>=0){const nd=Math.abs(p-want);if(nd<d){best=p;d=nd}p=hay.indexOf(needle,p+1)}return best}
function restoreAutoPinyin(text){const lines=text.split('\n'),by=new Map();for(const c of A.pinyin?.auto||[]){if((A.pinyinAuto[pinyinAutoKey(c)]||'replace')!=='keep')continue;if(!by.has(c.line))by.set(c.line,[]);by.get(c.line).push(c)}return lines.map((line,i)=>{let n=line;for(const c of(by.get(i+1)||[]).sort((a,b)=>b.start-a.start)){let p=c.start;if(n.slice(p,p+c.replacement.length)!==c.replacement)p=nearest(n,c.replacement,c.start);if(p>=0)n=n.slice(0,p)+c.original+n.slice(p+c.replacement.length)}return n}).join('\n')}

function reviewWithCustom(){
  const review=(A.pinyin?.review||[]).map(c=>c.customTarget?{...c,replacement:c.customTarget}:c);
  const decisions={};for(const[k,v]of Object.entries(A.pd))decisions[k]=v==='custom'?'replace':v;
  return{review,decisions};
}

export function finish(){
  if(!A.pinyin)return;
  const restored=restoreAutoPinyin(A.pinyin.text),x=reviewWithCustom();A.final=applyPinyinReview(restored,x.review,x.decisions);const n=learn();
  $('#donePanel').classList.remove('hidden');$('#doneText').textContent=`处理完成；本次新增/确认学习约 ${n} 条。普通拼音“保留原文”不会写入个人规则；自定义替换会写入个人拼音规则。小说正文未上传。`;view('clean');badge();
}

function updateMode(mode){A.mode=mode;$$('#modeGroup button').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));$$('#modeLegend [data-mode-info]').forEach(x=>x.classList.toggle('active',x.dataset.modeInfo===mode));if(A.scan)toast('清理模式已切换；重新扫描后生效')}

export function bindCleanFlow(){
  $('#backCleanBtn').onclick=()=>view('clean');$$('#modeGroup button').forEach(b=>b.onclick=()=>updateMode(b.dataset.mode));$$('#modeLegend [data-mode-info]').forEach(b=>b.onclick=()=>updateMode(b.dataset.modeInfo));$$('#reviewGroups [data-review-group]').forEach(b=>b.onclick=()=>{if(!b.disabled)setReviewGroup(b.dataset.reviewGroup)});
  $('#fileInput').onchange=()=>{const f=$('#fileInput').files?.[0];if(!f)return;A.file=f;reset();$('#fileTitle').textContent=f.name;$('#fileMeta').textContent=`${(f.size/1048576).toFixed(2)} MB · 仅本地读取`;$('#scanBtn').disabled=false};
  $('#scanBtn').onclick=scan;$('#goReviewBtn').onclick=()=>{view('review');renderAutoAd();renderAdReview();renderReviewGroups(A.groups.length?'reviewAd':'autoAd')};
  $('#restoreAllAutoAdBtn').onclick=()=>{for(const g of groupRows(A.scan?.auto||[]))A.autoAd[g.field]='restore';invalidatePinyin();renderAutoAd()};$('#deleteAllAutoAdBtn').onclick=()=>{for(const g of groupRows(A.scan?.auto||[]))A.autoAd[g.field]='delete';invalidatePinyin();renderAutoAd()};
  $('#keepAllAdBtn').onclick=()=>{for(const g of A.groups)A.ad[g.field]='keep';invalidatePinyin();renderAdReview()};$('#applyAdBtn').onclick=pinyinStage;
  $('#restoreAllAutoPinyinBtn').onclick=()=>{for(const g of pinyinAutoGroups())A.pinyinAuto[g.key]='keep';renderAutoPinyin()};$('#replaceAllAutoPinyinBtn').onclick=()=>{for(const g of pinyinAutoGroups())A.pinyinAuto[g.key]='replace';renderAutoPinyin()};
  $('#replaceAllPinyinBtn').onclick=()=>{(A.pinyin?.review||[]).forEach((_,i)=>A.pd[i]='replace');renderPinyinReview()};$('#keepAllPinyinBtn').onclick=()=>{(A.pinyin?.review||[]).forEach((_,i)=>A.pd[i]='keep');renderPinyinReview()};$('#finishBtn').onclick=finish;
  $('#downloadBtn').onclick=()=>{if(A.final){const n=(A.file?.name||'novel.txt').replace(/\.txt$/i,'');dl('\ufeff'+A.final,`${n}_去广告.txt`)}};
}
