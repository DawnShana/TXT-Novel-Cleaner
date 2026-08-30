import {mergeRules} from '../cleaner-core.js';
import {A,$,$$,fmt,esc,TYPE_LABEL,empty,counts,toast,LS,dl,subtract,pendingRuleChanges,refreshDirty} from './state.js';

let metricFilter='all';

function collect(){
  const out=[];
  const add=(rules,scope,source)=>{
    for(const type of['adExact','garbleSamples','keepFields','pinyinKeep','englishKeep'])(rules?.[type]||[]).forEach((value,index)=>out.push({scope,source,type,index,value,label:TYPE_LABEL[type],editable:scope==='personal'}));
    (rules?.pinyinFixes||[]).forEach((value,index)=>out.push({scope,source,type:'pinyinFixes',index,value,label:TYPE_LABEL.pinyinFixes,display:`${value.source} → ${value.target} ×${value.count||1}`,editable:scope==='personal'}));
  };
  for(const s of A.baseSources)add(s.rules,'builtin',s.path);add(A.personal||empty(),'personal','rules.json');return out;
}

function pendingRows(){
  return pendingRuleChanges().map(x=>({
    scope:x.change==='deleted'?'pending-deleted':'personal',source:'rules.json',type:x.type,index:x.index,value:x.value,label:TYPE_LABEL[x.type],editable:x.editable,
    display:x.type==='pinyinFixes'?`${x.value.source} → ${x.value.target} ×${x.value.count||1}`:undefined,
    pendingChange:x.change
  }));
}

function metricPass(x){
  if(metricFilter==='all')return true;if(metricFilter==='builtin')return x.scope==='builtin';if(metricFilter==='personal')return x.scope==='personal';
  if(metricFilter==='pinyin')return x.scope==='personal'&&x.type==='pinyinFixes';if(metricFilter==='keep')return x.scope==='personal'&&['keepFields','pinyinKeep','englishKeep'].includes(x.type);return true;
}
function syncMetricUI(){$$('#ruleMetricFilters [data-rule-metric]').forEach(b=>b.classList.toggle('active',b.dataset.ruleMetric===metricFilter))}

export function renderRules(){
  counts();refreshDirty();syncMetricUI();const q=$('#ruleSearch').value.trim().toLowerCase(),scope=$('#ruleScope')?.value||'all';
  let rows=scope==='pending'?pendingRows():collect().filter(metricPass);
  rows=rows.filter(x=>{if(scope!=='all'&&scope!=='pending'&&x.scope!==scope)return false;const text=(x.display||x.value||'')+' '+x.label+' '+x.source+' '+(x.pendingChange||'');return!q||text.toLowerCase().includes(q)});
  const shown=rows.slice(0,2500);
  $('#ruleList').innerHTML=shown.map((x,i)=>{
    const pending=x.pendingChange==='deleted'?'待删除':x.pendingChange==='pending'?'待同步':null;
    const scopeName=pending||(x.scope==='builtin'?'内置':'个人');
    const scopeClass=x.pendingChange?'personal':x.scope;
    const hint=x.pendingChange==='deleted'?'将在下次同步时从 GitHub 删除':x.editable?'编辑 →':x.scope==='builtin'?'查看 / 覆盖 →':'';
    return `<button class="rule-row rule-click" ${x.editable?`data-rule-index="${i}"`:''} type="button"><span class="rule-meta"><i class="scope-badge ${scopeClass}">${scopeName}</i><b>${esc(x.label)}</b><small>${esc(x.source)}</small></span><code>${esc(x.display||x.value)}</code><span class="rule-edit-hint">${esc(hint)}</span></button>`;
  }).join('')||'<div class="empty">没有匹配规则</div>';
  if(rows.length>shown.length)$('#ruleList').insertAdjacentHTML('beforeend',`<div class="empty">当前显示前 ${fmt(shown.length)} 条；请使用搜索缩小范围。</div>`);
  [...$('#ruleList').querySelectorAll('[data-rule-index]')].forEach(el=>{const i=+el.dataset.ruleIndex;el.onclick=()=>openEditor(shown[i])});
}

function closeEditor(){$('#ruleEditor').classList.add('hidden');A.edit=null}
function setEditorType(type){const py=type==='pinyinFixes';$('#editorSimpleWrap').classList.toggle('hidden',py);$('#editorPinyinWrap').classList.toggle('hidden',!py)}

function openCreate(){
  A.edit={scope:'personal',source:'rules.json',type:'adExact',create:true,label:TYPE_LABEL.adExact};$('#editorTitle').textContent='添加个人规则';$('#editorMeta').textContent='新规则将先保存到浏览器本地';
  $('#editorTypeWrap').classList.remove('hidden');$('#editorType').value='adExact';setEditorType('adExact');$('#editorValue').value='';$('#editorSource').value='';$('#editorTarget').value='';for(const id of['editorValue','editorSource','editorTarget'])$('#'+id).disabled=false;
  $('#editorSaveBtn').classList.remove('hidden');$('#editorDeleteBtn').classList.add('hidden');$('#editorOverrideBtn').classList.add('hidden');$('#editorNote').textContent='添加后会进入唯一的个人 rules.json；点击“保存规则到 GitHub”后再同步到仓库。';$('#ruleEditor').classList.remove('hidden');
}

function openEditor(item){
  A.edit=item;$('#editorTypeWrap').classList.add('hidden');$('#editorTitle').textContent=item.scope==='builtin'?'查看内置规则':'编辑个人规则';$('#editorMeta').textContent=`${item.label} · ${item.source}`;setEditorType(item.type);
  if(item.type==='pinyinFixes'){$('#editorSource').value=item.value.source||'';$('#editorTarget').value=item.value.target||''}else $('#editorValue').value=item.value||'';
  const ro=item.scope==='builtin';for(const id of['editorValue','editorSource','editorTarget'])$('#'+id).disabled=ro;$('#editorSaveBtn').classList.toggle('hidden',ro);$('#editorDeleteBtn').classList.toggle('hidden',ro);$('#editorOverrideBtn').classList.toggle('hidden',!ro);$('#editorOverrideBtn').textContent=item.type==='pinyinFixes'?'保留此拼音原文':'将此内置字段设为个人保留';$('#editorNote').textContent=ro?'内置规则随程序发布，保持只读。你可以创建个人保留覆盖；个人规则优先级高于内置删除规则。':'修改先保存在浏览器本地；点击“保存规则到 GitHub”后写回唯一的 rules.json。';$('#ruleEditor').classList.remove('hidden');
}

function arr(type){A.personal??=empty();A.personal[type]??=[];return A.personal[type]}
function rebuild(){A.personal.version=(+A.personal.version||1)+1;A.personal.updatedAt=new Date().toISOString();A.rules=mergeRules(A.base,A.personal);localStorage.setItem(LS,JSON.stringify(A.personal));refreshDirty();counts();renderRules()}

function saveEdit(){
  const e=A.edit;if(!e||e.scope!=='personal')return;
  if(e.create){const type=$('#editorType').value,a=arr(type);if(type==='pinyinFixes'){const source=$('#editorSource').value.trim(),target=$('#editorTarget').value.trim();if(!source||!target)return toast('原文和目标都不能为空');if(a.some(x=>x.source===source&&x.target===target))return toast('这条拼音规则已存在');a.push({source,target,count:1})}else{const v=$('#editorValue').value.trim();if(!v)return toast('规则内容不能为空');if(a.includes(v))return toast('这条规则已存在');a.push(v)}rebuild();closeEditor();toast('个人规则已添加');return}
  const a=arr(e.type);if(e.type==='pinyinFixes'){const source=$('#editorSource').value.trim(),target=$('#editorTarget').value.trim();if(!source||!target)return toast('原文和目标都不能为空');a[e.index]={source,target,count:Math.max(1,+e.value.count||1)}}else{const v=$('#editorValue').value.trim();if(!v)return toast('规则内容不能为空');a[e.index]=v}rebuild();closeEditor();toast('个人规则已修改');
}
function removeEdit(){const e=A.edit;if(!e||e.scope!=='personal'||e.create)return;arr(e.type).splice(e.index,1);rebuild();closeEditor();toast('个人规则已删除')}
function overrideBuiltin(){const e=A.edit;if(!e||e.scope!=='builtin')return;if(e.type==='pinyinFixes'){const a=arr('pinyinKeep'),q=e.value.source;if(!a.includes(q))a.push(q)}else{const a=arr('keepFields'),q=typeof e.value==='string'?e.value:e.display;if(!a.includes(q))a.push(q)}rebuild();closeEditor();toast('已创建个人保留覆盖')}
function chooseMetric(v){metricFilter=metricFilter===v?'all':v;if(metricFilter==='builtin')$('#ruleScope').value='builtin';else if(['personal','pinyin','keep'].includes(metricFilter))$('#ruleScope').value='personal';else $('#ruleScope').value='all';renderRules()}

export function bindRulesUI(){
  const scope=$('#ruleScope');if(scope&&!scope.querySelector('option[value="pending"]'))scope.add(new Option('仅待同步规则','pending'));
  $('#ruleSearch').oninput=renderRules;$('#ruleScope').onchange=()=>{metricFilter='all';renderRules()};$$('#ruleMetricFilters [data-rule-metric]').forEach(b=>b.onclick=()=>chooseMetric(b.dataset.ruleMetric));$('#addRuleBtn').onclick=openCreate;
  $('#exportRulesBtn').onclick=()=>dl(JSON.stringify(subtract(A.rules,A.base),null,2),'rules.json','application/json;charset=utf-8');$('#importRulesInput').onchange=async()=>{const f=$('#importRulesInput').files?.[0];if(!f)return;try{A.personal=mergeRules(A.personal,JSON.parse(await f.text()));rebuild();toast('个人规则已导入')}catch{toast('无效 rules.json')}};
  $('#editorType').onchange=()=>{if(A.edit?.create){A.edit.type=$('#editorType').value;setEditorType(A.edit.type)}};$('#editorCloseBtn').onclick=closeEditor;$('#editorCancelBtn').onclick=closeEditor;$('#editorSaveBtn').onclick=saveEdit;$('#editorDeleteBtn').onclick=removeEdit;$('#editorOverrideBtn').onclick=overrideBuiltin;$('#ruleEditor').onclick=e=>{if(e.target.id==='ruleEditor')closeEditor()};document.addEventListener('novel:view',e=>{if(e.detail==='rules')renderRules()});
}
