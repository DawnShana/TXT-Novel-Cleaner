import {A,$,persist} from './state.js';

const STRUCTURAL=new Set([
  'platform_artifact','chapter_boundary_artifact','anti_scrape_injection','numeric_injection',
  'distributed_pollution','ad_pinyin_pollution','source_obfuscated_ad','split_punct_ad','group_code_ad'
]);

let snapshot=null;

function takeSnapshot(){
  snapshot={
    ad:new Set(A.personal?.adExact||[]),
    garble:new Set(A.personal?.garbleSamples||[])
  };
}

function cleanupStructuralExactLearning(){
  if(!snapshot||!A.rules||!A.scan)return;
  const structuralFields=new Set(
    [...(A.scan.auto||[]),...(A.scan.review||[])]
      .filter(m=>STRUCTURAL.has(m.kind))
      .map(m=>m.field)
      .filter(Boolean)
  );
  if(!structuralFields.size){snapshot=null;return}
  A.rules.adExact=(A.rules.adExact||[]).filter(x=>snapshot.ad.has(x)||!structuralFields.has(x));
  A.rules.garbleSamples=(A.rules.garbleSamples||[]).filter(x=>snapshot.garble.has(x)||!structuralFields.has(x));
  A.rules.stats??={};
  A.rules.stats.structuralConfirmed=(A.rules.stats.structuralConfirmed||0)+structuralFields.size;
  persist();
  snapshot=null;
}

export function bindLearningPolicy(){
  const btn=$('#finishBtn');if(!btn)return;
  btn.addEventListener('click',()=>{
    takeSnapshot();
    setTimeout(cleanupStructuralExactLearning,0);
  },true);
}
