import {$$,view,loadRules} from './state.js';
import {bindCleanFlow} from './clean-flow.js';
import {bindRulesUI} from './rules-ui.js';
import {bindGitHub,loadCfg} from './github-sync.js';
import {bindLearningPolicy} from './learning-policy.js';

async function boot(){
  $$('.tab').forEach(b=>b.onclick=()=>view(b.dataset.view));
  bindCleanFlow();bindLearningPolicy();bindRulesUI();bindGitHub();loadCfg();
  await loadRules();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
}
boot();
