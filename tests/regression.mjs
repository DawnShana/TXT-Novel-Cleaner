import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scanText,applyMatches} from '../cleaner-core.js';
import {mergeAdPinyinScan,detectAdPinyin} from '../ad-pinyin-overlay.js';
import {mergeStructuralScan} from '../structural-engine.js';
import {emptyRules,ensureRules,mergeRulesExt} from '../src/rules-model.js';
function rules(){let r=emptyRules();for(let i=1;i<=5;i++)r=mergeRulesExt(r,ensureRules(JSON.parse(fs.readFileSync(new URL(`../rules/builtin/builtin-ad-${i}.json`,import.meta.url),'utf8'))));return mergeRulesExt(r,ensureRules(JSON.parse(fs.readFileSync(new URL('../rules.json',import.meta.url),'utf8'))))}
const R=rules();
function scan(text){text=String(text).replace(/\r\n|\r|\n/g,'\n');let x=scanText(text,R,{mode:'aggressive',publishers:[],preserveBlank:true});x=mergeAdPinyinScan(x,text,R,applyMatches,true);x=mergeStructuralScan(x,text,R,applyMatches,true);return x}
let r=scan('军队⑼被④杀氿的岜毫裠无还手之力');assert.equal(r.cleaned,'军队被杀的毫无还手之力');
r=scan('从⑷地鷗球镹搭乘这台机体');assert.equal(r.cleaned,'从地球搭乘这台机体');
r=scan('正常ling正常正文san正常正文ba Qun正常结尾');assert.equal(r.cleaned,'正常正常正文正常正文正常结尾');
r=scan('正常弍貳正常正文①Ⅱ正常结尾');assert.equal(r.cleaned,'正常正常正文正常结尾');
r=scan('求鲜花');assert.equal(r.cleaned.trim(),'');
r=scan('他说求鲜花只是一个测试词。');assert.equal(r.cleaned,'他说求鲜花只是一个测试词。');assert(r.review.some(x=>x.kind==='platform_artifact'));
r=scan('本群免费提取全网平台已购vip章节，制成txt等格式。有想提取的私聊群主。');assert.equal(r.cleaned.trim(),'');
r=scan('月之女神：“吸溜！好多积分！好想要啊！（流口水）”');assert(![...r.auto,...r.review].some(x=>x.field.includes('流口水')));
r=scan('EDG在S7赛季拿到2000经济差，ADC完成双杀。');assert.equal(r.auto.length,0);assert.equal(r.review.length,0);
r=scan('即937便拥有这台机体');assert(r.review.some(x=>x.kind==='numeric_injection')||r.review.length>0);assert.equal(r.cleaned,'即937便拥有这台机体');
let p=detectAdPinyin('ling meng',R);assert(!p.some(x=>x.action==='delete'));
p=detectAdPinyin('ling ba san wu Qun',R);assert(p.some(x=>x.action==='delete'));
r=scan('第一行正常\r第二行弍貳\r第三行正常');assert.equal(r.cleaned,'第一行正常\n第二行\n第三行正常');
console.log('v16 regression OK');
