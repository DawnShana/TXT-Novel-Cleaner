import {mergeRules} from '../cleaner-core.js';
import {A,$,LG,LS,SYNCED,subtract,view,toast,refreshDirty} from './state.js';
import {renderRules} from './rules-ui.js';

function cfg(){return{repo:$('#repoInput').value.trim(),branch:$('#branchInput').value.trim()||'main',token:$('#tokenInput').value.trim()}}
function saveCfg(){localStorage.setItem(LG,JSON.stringify(cfg()))}
export function loadCfg(){
  try{const c=JSON.parse(localStorage.getItem(LG)||'null');if(c){$('#repoInput').value=c.repo||$('#repoInput').value;$('#branchInput').value=c.branch||'main';$('#tokenInput').value=c.token||''}}catch{}
}
const headers=t=>({'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(t?{Authorization:`Bearer ${t}`}:{})});
function b64(s){const u=new TextEncoder().encode(s);let z='';for(let i=0;i<u.length;i+=32768)z+=String.fromCharCode(...u.subarray(i,i+32768));return btoa(z)}
function unb64(s){const b=atob(s.replace(/\s/g,'')),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new TextDecoder().decode(u)}

async function apiMessage(resp){
  let detail='';
  try{const j=await resp.clone().json();detail=j?.message||j?.error||''}catch{try{detail=(await resp.clone().text()).trim()}catch{}}
  return detail;
}

function write403Help(detail){
  const d=String(detail||'').toLowerCase();
  if(d.includes('personal access token')||d.includes('resource not accessible')||d.includes('permission')){
    return '读取 rules.json 已成功，但写入被 GitHub 拒绝。请编辑当前 Fine-grained Token：Repository access 必须包含 DawnShana/TXT-Novel-Cleaner；Repository permissions → Contents 必须设为 Read and write。ChatGPT 的 GitHub App 授权与网页里这个 Token 是两套独立权限。';
  }
  if(d.includes('protected branch')||d.includes('ruleset')||d.includes('pull request')){
    return `main 分支规则阻止直接写入：${detail}`;
  }
  return `GitHub 拒绝写入（403）：${detail||'通常是 Token 没有 Contents: Read and write，或 Token 未授权此仓库。'}`;
}

async function remote(c){
  const parts=c.repo.split('/');if(parts.length!==2||!parts[0]||!parts[1])throw Error('仓库格式应为 owner/repo');
  const[o,r]=parts,url=`https://api.github.com/repos/${o}/${r}/contents/rules.json?ref=${encodeURIComponent(c.branch)}`;
  const x=await fetch(url,{headers:headers(c.token),cache:'no-store'});
  if(!x.ok){const m=await apiMessage(x);throw Error(`读取 rules.json HTTP ${x.status}${m?'：'+m:''}`)}
  const j=await x.json();return{rules:JSON.parse(unb64(j.content)),sha:j.sha,url:`https://api.github.com/repos/${o}/${r}/contents/rules.json`};
}

export async function saveGit(){
  const c=cfg();if(!c.token){view('settings');return toast('请填写 Fine-grained Token')}saveCfg();
  try{
    $('#gitResult').textContent='正在读取 GitHub 当前 rules.json…';
    const r=await remote(c),m=subtract(A.rules,A.base);m.version=Math.max(+r.rules.version||0,+m.version||0)+1;m.updatedAt=new Date().toISOString();
    const x=await fetch(r.url,{method:'PUT',headers:{...headers(c.token),'Content-Type':'application/json'},body:JSON.stringify({message:`rules: update personal learning v${m.version}`,content:b64(JSON.stringify(m,null,2)),sha:r.sha,branch:c.branch})});
    if(!x.ok){const detail=await apiMessage(x);if(x.status===403)throw Error(write403Help(detail));throw Error(`写入 HTTP ${x.status}${detail?'：'+detail:''}`)}
    A.personal=m;A.syncedPersonal=structuredClone(m);A.rules=mergeRules(A.base,m);localStorage.setItem(LS,JSON.stringify(m));localStorage.setItem(SYNCED,JSON.stringify(m));refreshDirty();
    $('#gitResult').textContent=`保存成功：rules.json v${m.version}`;renderRules();toast('规则已保存到 GitHub');
  }catch(e){$('#gitResult').textContent='保存失败：'+e.message;toast(e.message.includes('Contents')?'Token 缺少写入权限':'GitHub 保存失败')}
}

export async function pullGit(){
  const c=cfg();saveCfg();
  try{
    const r=await remote(c);A.personal=r.rules;A.syncedPersonal=structuredClone(r.rules);A.rules=mergeRules(A.base,r.rules);localStorage.setItem(LS,JSON.stringify(r.rules));localStorage.setItem(SYNCED,JSON.stringify(r.rules));refreshDirty();
    $('#gitResult').textContent=`已恢复 rules.json v${r.rules.version||1}`;renderRules();toast('规则恢复完成');
  }catch(e){$('#gitResult').textContent='恢复失败：'+e.message}
}

async function testGit(){
  const c=cfg();saveCfg();
  try{
    const rr=await fetch(`https://api.github.com/repos/${c.repo}`,{headers:headers(c.token),cache:'no-store'});if(!rr.ok){const m=await apiMessage(rr);throw Error(`仓库访问 HTTP ${rr.status}${m?'：'+m:''}`)}
    const j=await rr.json();await remote(c);
    $('#gitResult').textContent=`连接成功：${j.full_name}；rules.json 读取权限正常。注意：GitHub 只会在真正保存时验证 Contents 写权限。`;
  }catch(e){$('#gitResult').textContent='连接失败：'+e.message}
}

export function bindGitHub(){
  for(const id of['repoInput','branchInput','tokenInput'])$('#'+id).onchange=saveCfg;
  $('#testGitBtn').onclick=testGit;$('#saveGitBtn').onclick=saveGit;$('#pullGitBtn').onclick=pullGit;$('#saveGitQuickBtn').onclick=saveGit;
}
