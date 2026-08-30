import {mergeRules} from '../cleaner-core.js';
import {A,$,LG,LS,subtract,view,toast} from './state.js';
import {renderRules} from './rules-ui.js';

function cfg(){return{repo:$('#repoInput').value.trim(),branch:$('#branchInput').value.trim()||'main',token:$('#tokenInput').value.trim()}}
function saveCfg(){localStorage.setItem(LG,JSON.stringify(cfg()))}
export function loadCfg(){
  try{const c=JSON.parse(localStorage.getItem(LG)||'null');if(c){$('#repoInput').value=c.repo||$('#repoInput').value;$('#branchInput').value=c.branch||'main';$('#tokenInput').value=c.token||''}}catch{}
}
const headers=t=>({'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(t?{Authorization:`Bearer ${t}`}:{})});
function b64(s){const u=new TextEncoder().encode(s);let z='';for(let i=0;i<u.length;i+=32768)z+=String.fromCharCode(...u.subarray(i,i+32768));return btoa(z)}
function unb64(s){const b=atob(s.replace(/\s/g,'')),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new TextDecoder().decode(u)}
async function remote(c){
  const[o,r]=c.repo.split('/'),url=`https://api.github.com/repos/${o}/${r}/contents/rules.json?ref=${c.branch}`;
  const x=await fetch(url,{headers:headers(c.token),cache:'no-store'});if(!x.ok)throw Error(`读取 rules.json HTTP ${x.status}`);
  const j=await x.json();return{rules:JSON.parse(unb64(j.content)),sha:j.sha,url:`https://api.github.com/repos/${o}/${r}/contents/rules.json`};
}

export async function saveGit(){
  const c=cfg();if(!c.token){view('settings');return toast('请填写 Fine-grained Token')}saveCfg();
  try{
    $('#gitResult').textContent='正在读取 GitHub 当前 rules.json…';
    const r=await remote(c),m=subtract(A.rules,A.base);m.version=Math.max(+r.rules.version||0,+m.version||0)+1;m.updatedAt=new Date().toISOString();
    const x=await fetch(r.url,{method:'PUT',headers:{...headers(c.token),'Content-Type':'application/json'},body:JSON.stringify({message:`rules: update personal learning v${m.version}`,content:b64(JSON.stringify(m,null,2)),sha:r.sha,branch:c.branch})});
    if(!x.ok)throw Error(`写入 HTTP ${x.status}`);
    A.personal=m;A.rules=mergeRules(A.base,m);A.dirty=0;localStorage.setItem(LS,JSON.stringify(m));
    $('#pendingSync').textContent='待同步 0';$('#pendingSync').classList.remove('dirty');$('#gitResult').textContent=`保存成功：rules.json v${m.version}`;renderRules();toast('规则已保存到 GitHub');
  }catch(e){$('#gitResult').textContent='保存失败：'+e.message;toast('GitHub 保存失败')}
}

export async function pullGit(){
  const c=cfg();saveCfg();
  try{
    const r=await remote(c);A.personal=r.rules;A.rules=mergeRules(A.base,r.rules);A.dirty=0;localStorage.setItem(LS,JSON.stringify(r.rules));
    $('#pendingSync').textContent='待同步 0';$('#pendingSync').classList.remove('dirty');$('#gitResult').textContent=`已恢复 rules.json v${r.rules.version||1}`;renderRules();toast('规则恢复完成');
  }catch(e){$('#gitResult').textContent='恢复失败：'+e.message}
}

async function testGit(){
  const c=cfg();saveCfg();
  try{const r=await fetch(`https://api.github.com/repos/${c.repo}`,{headers:headers(c.token)});if(!r.ok)throw Error(`HTTP ${r.status}`);const j=await r.json();$('#gitResult').textContent=`连接成功：${j.full_name}`}
  catch(e){$('#gitResult').textContent='连接失败：'+e.message}
}

export function bindGitHub(){
  for(const id of['repoInput','branchInput','tokenInput'])$('#'+id).onchange=saveCfg;
  $('#testGitBtn').onclick=testGit;$('#saveGitBtn').onclick=saveGit;$('#pullGitBtn').onclick=pullGit;$('#saveGitQuickBtn').onclick=saveGit;
}
