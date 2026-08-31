const HAN=/[\u3400-\u9fff\uf900-\ufaff]/u;
const ROMAN=/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅺⅻⅼⅽⅾⅿ]/u;
const ZERO=/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/u;
const ZERO_G=/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/gu;
const STRONG=new Set(Array.from('弍貳陾迩侕爾倭鸸洱栮贰玖镹泗児亻俬祁岜飼琦玐鳍陕衤瘤柒坝鹨氿捌叁轳咝鸠罒揪吆叄镏遛芭翏崎鏾覇壹陵紦磷硫傘陸熘厁韭锍澪掺彡氵焐邬裠箘逡麇踆帬峮羣囷宭鷗儛'));
const WEAK=new Set(Array.from('爸怡刘榴寺虾尹溜疤蹴删疚霓扒珊邻泣伞旗玥栎吴巫医霖洽亿玲企亦咎司柳陆吾伍污冥零七九四五六八三二一妻师玲铃灵陵'));
const CONNECT=/[\s.;:`'"\\,?\[\]{}()<>+=_/@#%&|~^*，；：、·・—–＿／＼u005c｜【】（）《》〈〉！？。]/u;
const CHAPTER=/^\s*(?:第[零〇一二三四五六七八九十百千万两\d]{1,8}[章节卷回部篇]|Chapter\s+\d+)/i;
const GROUP=/(?:群聊|群撩|裙聊|群组|群組|羣聊|羣组|羣組|君羊|Qun|群|羣|裙)/iu;
const ADWORDS=[
  '小说版权归原作者','文本仅供个人学习','下载后24小时','支持订阅正版','拒绝盗版',
  '免费外群','中转群','书友群','福利群','加群','群号','私聊群主',
  '公众号','关注微信','最新网址','备用网址','请牢记本站','更多全网小说','免费提取全网',
  '已购vip章节','VIP章节','防失联','回家地址','找书神器','历史更新总合集','日更合集','每天更新小说'
];
const PLATFORM_RX=/(?:求鲜花|求月票|求评价票|求收藏|求打赏|求推荐票|求催更|投鲜花|投月票)/u;
const SOURCE_AD_RX=/(?:防失联|回家地址|找书神器|历史更新总合集|日更合集|每天更新小说|书荒推荐)/u;
const CHAT_FICTION_RX=/(?:【\s*(?:群提示|群消息|群公告)|聊天群(?:系统|任务|公告)|^[\s　]*[^：:\n]{1,20}[：:][“"])/u;
const DOMAIN_RX=/\b(?:EDG|LPL|LCK|SKT|RNG|IG|WE|OMG|TES|JDG|BLG|LOL|MVP|SMVP|ADC|TOP|SOLO|BP|MSI|AG|BO\d|S\d{1,2}|Letme|TheShy|Faker|Scout|mouse|iboy|meiko|clearlove)\b/iu;
const NUMBER_PINYIN=new Set('ling yi yao er liang san si wu liu qi ba jiu'.split(' '));
const AD_PINYIN_FAMILY_RX=/(?:\bling\s*meng\b|\byue\s*yi\b|\bruo\s*shui\b|\bruo\s*xi\b)/iu;
const AD_PINYIN_TOKEN_RX=/[A-Za-zÀ-žӏІіıɩ]{2,12}/gu;
const CIRCLED=/[①②③④⑤⑥⑦⑧⑨⑩⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑]/u;
const COMMON_JOIN=new Set('即便 一旦 如果 因为 所以 但是 而且 只是 已经 没有 无法 可以 应该 这样 那样 一般 一样 一些 时候'.split(' '));
const ENGLISH=new Set(`a an and android app api ai art attack auto base beta big black blue book boss build card center chapter chat class club code core cpu data debug dev download dragon drive dxd earth email end english error event file final fire game girl god google green group hero html http https ice id image img ios java javascript job jojo json king level light linux live load login magic main master max min mode model net new news node null online open park party pass path pc plus power pro project qq red release risk root save server side skill source speed sql start studio system team test text time tool txt ui url user version vip web wifi windows world www xml youtube girls fate mega sama san chan kun senpai sensei dio sao kawaii hp mp sp exp lv can fan hang hen long man pan ping she song tan wan you de`.split(/\s+/));
const UPPER=new Set('AI API AST CPU DNA DXD HTML HTTP HTTPS ID IP JK JOJO JSON NPC PC PS QQ RPG SDK SOS SQL TXT UI URL VIP WEB WIFI XML'.split(' '));
const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const isHan=c=>!!c&&HAN.test(c);

function risk(c){
  if(!c)return 0;
  if(ZERO.test(c))return 5;
  if(STRONG.has(c))return 2.4;
  if(WEAK.has(c))return 1.15;
  if(CIRCLED.test(c))return 2.4;
  if(ROMAN.test(c))return 2.1;
  if(/[A-Za-z]/.test(c))return .55;
  if(/[0-9]/.test(c))return .35;
  if(/[∞∆ↀ⍳𝚀]/u.test(c))return 3;
  if(/[\p{Cf}\p{So}]/u.test(c))return 2.2;
  return 0;
}

function feat(s){
  const a=Array.from(s),ws=a.map(risk),high=ws.filter(x=>x>=1.1).length;
  const latin=a.filter(c=>/[A-Za-z]/.test(c)).length,han=a.filter(isHan).length,sym=a.filter(c=>CONNECT.test(c)).length;
  let score=ws.reduce((x,y)=>x+y,0)/Math.max(1,a.length)*4;
  if(high>=3)score+=2;
  if(latin>=2&&han>=2)score+=1.5;
  if(sym>=2&&high>=2)score+=1;
  return {score,high,latin,han};
}

function pollutionRegions(line){
  const c=Array.from(line),off=[];let p=0;
  for(const ch of c){off.push(p);p+=ch.length}off.push(p);
  const hard=[];c.forEach((x,i)=>{if(risk(x)>=1.1)hard.push(i)});
  if(!hard.length)return[];
  const groups=[];let g=[hard[0]];
  for(const i of hard.slice(1)){
    const prev=g[g.length-1],gap=c.slice(prev+1,i),bridge=gap.length<=8&&gap.every(x=>CONNECT.test(x)||risk(x)>0);
    if(i-prev<=5||bridge)g.push(i);else{groups.push(g);g=[i]}
  }
  groups.push(g);
  return groups.map(x=>{
    let a=x[0],b=x[x.length-1]+1;
    while(a>0&&a>x[0]-18&&(risk(c[a-1])>0||CONNECT.test(c[a-1])))a--;
    while(b<c.length&&b<x[x.length-1]+28&&(risk(c[b])>0||CONNECT.test(c[b])))b++;
    while(a<b&&/\s/u.test(c[a]))a++;
    while(b>a&&/\s/u.test(c[b-1]))b--;
    return [off[a],off[b]];
  }).filter(([a,b])=>b-a>=4);
}

const SPLIT_NOISE=/[0-9０-９群羣裙\s\p{P}\p{S}]/u;
const SPLIT_PUNCT=/[\p{P}\p{S}]/u;
function digitCount(s){return (s.match(/[0-9０-９]/gu)||[]).length}
function punctCount(s){return Array.from(s).filter(c=>SPLIT_PUNCT.test(c)).length}

function fuzzyRuoShuiAd(line){
  const out=[],novelRx=/小[\s\p{P}\p{S}]*[说說][\s\p{P}\p{S}]*群/gu;
  for(const m of line.matchAll(novelRx)){
    const a0=m.index,leftStart=Math.max(0,a0-180),left=line.slice(leftStart,a0);
    let brand=null,brandRx=/若[0-9０-９群羣裙\s\p{P}\p{S}]{0,150}水[0-9０-９群羣裙\s\p{P}\p{S}]{0,150}$/gu;
    for(const x of left.matchAll(brandRx))brand=x;
    if(!brand)continue;
    const a=leftStart+brand.index;
    const after=m.index+m[0].length,right=line.slice(after,Math.min(line.length,after+360));
    const mid=/中[0-9０-９群羣裙\s\p{P}\p{S}]{0,180}[转轉][0-9０-９群羣裙\s\p{P}\p{S}]{0,100}群/gu.exec(right);
    if(!mid)continue;
    let b=after+mid.index+mid[0].length,e=b;
    while(e<line.length&&e-b<180&&SPLIT_NOISE.test(line[e]))e++;
    const tail=line.slice(b,e);if(digitCount(tail)>=5)b=e;
    const field=line.slice(a,b),digits=digitCount(field),punct=punctCount(field);
    if(digits<7||punct<8)continue;
    out.push([a,b,Math.min(18,10+digits*.16+punct*.03)]);
  }
  return out;
}

function denseGroupCodeRegions(line){
  const out=[],rx=/[群羣裙0-9０-９\s\p{P}\p{S}]{15,240}/gu;
  for(const m of line.matchAll(rx)){
    const s=m[0],digits=digitCount(s),groups=(s.match(/[群羣裙]/gu)||[]).length,punct=punctCount(s);
    if(groups<1||digits<7||punct<3)continue;
    const meaningful=digits+groups+punct,ratio=meaningful/Math.max(1,Array.from(s).length);
    if(ratio<.72)continue;
    let a=m.index,b=a+s.length;
    while(a<b&&/\s/u.test(line[a]))a++;
    while(b>a&&/\s/u.test(line[b-1]))b--;
    if(b-a>=12)out.push([a,b,Math.min(15,8+digits*.22+groups*.45+punct*.025)]);
  }
  return out;
}

function foldLatinText(s){
  return String(s||'').normalize('NFKC').replace(ZERO_G,'').toLowerCase()
    .replace(/[іІ]/gu,'i').replace(/[ӏⅼ]/gu,'l').replace(/[ıɩ]/gu,'i')
    .replace(/[аɑ]/gu,'a').replace(/[е]/gu,'e').replace(/[οо]/gu,'o')
    .replace(/[^a-z0-9\u3400-\u9fff]+/gu,' ').replace(/\s+/g,' ').trim();
}

function adPinyinEvidence(s){
  const norm=foldLatinText(s),tokens=norm.match(/[a-z]+/g)||[],f=feat(s);
  const numPy=tokens.filter(x=>NUMBER_PINYIN.has(x)).length;
  const latinPinyin=tokens.filter(x=>NUMBER_PINYIN.has(x)||['meng','qun','yue','ruo','shui','xi'].includes(x)).length;
  if(!latinPinyin)return {score:0,family:false,qun:false,numPy:0,special:0,norm,high:f.high};
  const family=/(?:\bling\s*(?:meng|[梦夢])|[灵凌玲铃陵靈鈴零]\s*meng\b|\byue\s*(?:yi|漪)|月\s*yi\b|\bruo\s*(?:shui|水|xi|曦)|若\s*(?:shui|xi)\b)/iu.test(norm);
  const qun=tokens.includes('qun'),special=Array.from(s).filter(c=>CIRCLED.test(c)||ROMAN.test(c)).length;
  let score=0;
  if(family)score+=6;
  if(qun)score+=4;
  if(numPy>=2)score+=4;
  if(numPy>=4)score+=3;
  if(numPy>=1&&f.high>=3)score+=3;
  if(f.high>=3)score+=3;
  if(special)score+=2;
  if(punctCount(s)>=3&&f.high>=2)score+=1.5;
  if(DOMAIN_RX.test(s)&&!family&&!qun)score-=5;
  return {score,family,qun,numPy,special,norm,high:f.high};
}

function sourceUpdateRegions(line){
  const out=[];
  const rx=/每[\s\p{P}\p{S}]*天[\s\p{P}\p{S}]*更[\s\p{P}\p{S}]*新[\s\p{P}\p{S}]*一[\s\p{P}\p{S}]*百[\s\p{P}\p{S}]*多[\s\p{P}\p{S}]*本[\s\p{P}\p{S}\u3400-\u9fff]{0,30}?交[\s\p{P}\p{S}]*流[\s\p{P}\p{S}]*[群裙羣]/gu;
  for(const m of line.matchAll(rx)){
    let a=m.index;while(a>0&&/[\s\p{P}\p{S}]/u.test(line[a-1]))a--;let b=line.indexOf('　　',m.index+m[0].length);
    if(b<0||b-m.index>260)b=line.length;
    const field=line.slice(a,b),digits=digitCount(field),compact=field.replace(/[\s\p{P}\p{S}]/gu,'');
    if(digits>=7||/(?:若曦|若水|备用|備用|交流[裙群羣])/.test(compact))out.push([a,b,14]);
  }
  const compact=line.replace(/[\s\p{P}\p{S}]/gu,'');
  if(line.trim().length<=100&&/(?:若曦聊天[群羣]|若水小说[群羣]|若水小說[群羣])/.test(compact)){
    const a=Math.max(0,line.search(/\S/u));out.push([a,line.search(/\s*$/u),12]);
  }
  return out;
}

function adPinyinRegions(line){
  const ev=adPinyinEvidence(line);
  if(ev.score<7){
    const strong=Array.from(line).filter(c=>risk(c)>=2).length;
    if(ev.numPy>=1&&strong>=1&&line.trim().length<=24){const a=Math.max(0,line.search(/\S/u)),b=line.search(/\s*$/u);return [[a,b,6.2]]}
    return[];
  }
  const indent=line.indexOf('　　');
  if(indent>0&&indent<260){
    const prefix=line.slice(0,indent),pe=adPinyinEvidence(prefix);
    if(pe.score>=7)return [[Math.max(0,line.search(/\S/u)),indent,Math.min(18,pe.score)]];
  }
  const trimStart=line.search(/\S/u),trimEnd=line.search(/\s*$/u);
  if(line.trim().length<=120&&((ev.family&&(ev.high>=2||ev.numPy>=2||ev.qun))||(ev.qun&&ev.high>=3)||(ev.numPy>=1&&ev.high>=3))){
    return [[Math.max(0,trimStart),Math.max(Math.max(0,trimStart)+1,trimEnd),Math.min(18,ev.score)]];
  }
  const out=[];
  for(const [a,b] of pollutionRegions(line)){
    const x=adPinyinEvidence(line.slice(a,b));if(x.score>=6.5)out.push([a,b,Math.min(18,x.score)]);
  }
  return out;
}

function nextNonEmptyIsChapter(lines,i){
  for(let j=i+1;j<Math.min(lines.length,i+4);j++){
    const s=lines[j].trim();if(!s)continue;return CHAPTER.test(s);
  }
  return false;
}

function boundaryCanon(s){return String(s||'').trim().replace(/[\s*＊·•.。]+$/gu,'')}
function analyzeBook(lines){
  const counts=new Map(),canonCounts=new Map(),boundary=new Map(),paren=new Map(),numCore=new Map();
  for(let i=0;i<lines.length;i++){
    const s=lines[i].trim();if(!s)continue;const c=boundaryCanon(s);
    counts.set(s,(counts.get(s)||0)+1);canonCounts.set(c,(canonCounts.get(c)||0)+1);
    if(nextNonEmptyIsChapter(lines,i))boundary.set(c,(boundary.get(c)||0)+1);
    for(const m of lines[i].matchAll(/[（(][^()（）\n]{2,10}[)）]/gu))paren.set(m[0],(paren.get(m[0])||0)+1);
    for(const m of lines[i].matchAll(/[零〇][零〇一二三四五六七八九]{2,4}/gu))numCore.set(m[0],(numCore.get(m[0])||0)+1);
  }
  const boundaryArtifacts=new Set();
  for(const [c,n] of canonCounts){
    const b=boundary.get(c)||0,han=(c.match(/[\u3400-\u9fff]/gu)||[]).length;
    if(n>=5&&b>=3&&b/n>=.55&&c.length<=180&&han>=4&&/(?:喜欢|阅读|继续|推荐|小说|书名|本章|章节)/u.test(c))boundaryArtifacts.add(c);
  }
  const antiParen=new Set([...paren].filter(([,n])=>n>=5).map(([s])=>s));
  const antiNum=new Set([...numCore].filter(([s,n])=>n>=5&&new Set(s).size>=2).map(([s])=>s));
  return {counts,boundaryArtifacts,antiParen,antiNum};
}

function match(lineNo,line,a,b,kind,score,action,reason){
  return {line:lineNo,start:a,end:b,kind,score:+score.toFixed(2),field:line.slice(a,b),action,reason,originalLine:line};
}

function exact(lineNo,line,rules){
  const out=[];
  for(const f of [...(rules.adExact||[]),...(rules.garbleSamples||[])]){
    if(!f||f.length<2)continue;let p=0;
    while((p=line.indexOf(f,p))>=0){out.push(match(lineNo,line,p,p+f.length,'learned_exact',15,'delete','个人/内置经验'));p+=f.length}
  }
  return out;
}

function web(lineNo,line){
  const out=[];
  for(const rx of [/<\s*img\b[^>\n]*(?:>|$)/giu,/<\s*\/?\s*[A-Za-z][^>\n]{0,1000}>/gu,/(?:https?:\/\/|www\.)[^\s<>"'，。！？）】]+/giu]){
    for(const m of line.matchAll(rx))out.push(match(lineNo,line,m.index,m.index+m[0].length,rx.source.startsWith('<')?'html_tag':'web_link',15,'delete','网页/HTML污染'));
  }
  return out;
}

function platformArtifact(lineNo,line){
  const s=line.trim();if(!s||s.length>160)return null;
  if(PLATFORM_RX.test(s))return match(lineNo,line,0,line.length,'platform_artifact',14,'delete','平台残留：鲜花/月票/收藏等章节模板');
  return null;
}

function chapterBoundaryArtifact(lineNo,line,book){
  const s=line.trim();
  return book.boundaryArtifacts.has(boundaryCanon(s))?match(lineNo,line,0,line.length,'chapter_boundary_artifact',15,'delete','跨章节重复且固定出现在章节边界'):null;
}

function antiScrapeMatches(lineNo,line,book){
  const out=[];
  for(const token of book.antiParen){let p=0;while((p=line.indexOf(token,p))>=0){out.push(match(lineNo,line,p,p+token.length,'anti_scrape_injection',13,'delete','跨章节重复的括号型反采集注入'));p+=token.length}}
  for(const core of book.antiNum){
    const rx=new RegExp(`[“"'「『]?${core}[”"'」』]?`,'gu');
    for(const m of line.matchAll(rx))out.push(match(lineNo,line,m.index,m.index+m[0].length,'anti_scrape_injection',11.5,'delete','跨章节重复的数字汉字水印/注入'));
  }
  return out;
}

function numericInjection(lineNo,line){
  const out=[];
  if(DOMAIN_RX.test(line))return out;
  for(const m of line.matchAll(/([\u3400-\u9fff])([0-9]{3})([\u3400-\u9fff])/gu)){
    if(!COMMON_JOIN.has(m[1]+m[3]))continue;
    out.push(match(lineNo,line,m.index+1,m.index+4,'numeric_injection',5.8,'review',`数字插入复核：删除后形成“${m[1]+m[3]}”`));
  }
  return out;
}

function fullAd(lineNo,line,count,publishers){
  const s=line.trim();if(!s||CHAPTER.test(s))return null;
  let sc=0,why=[];
  const hits=ADWORDS.filter(x=>s.toLowerCase().includes(x.toLowerCase()));
  if(hits.length){sc+=4+Math.min(7,hits.length*1.8);why.push('广告关键词:'+hits.slice(0,3).join('/'))}
  if(SOURCE_AD_RX.test(s)){sc+=5;why.push('来源/防失联推广')}
  if(/公[\s.·,;:，；：]*众[\s.·,;:，；：]*号/u.test(s)){sc+=5;why.push('公众号推广')}
  if(/书荒推荐/u.test(s)){sc+=3;why.push('书荒推荐')}
  if(/本书由.{0,24}(?:整理|校对|制作)/u.test(s)){sc+=6;why.push('整理声明')}
  const contact=/(?:QQ|QQ群|群号|微信|vx|V信)\s*[:：]?\s*[A-Za-z0-9_-]{5,20}|\b\d{7,12}\b/iu.test(s);
  if(contact){sc+=3;why.push('群号/联系方式')}
  const url=/(?:https?:\/\/|www\.)/iu.test(s);if(url)sc+=6;
  if(count>=3&&hits.length)sc+=2;
  for(const x of publishers||[])if(x&&s.includes(x)&&/(?:整理|免费外群|中转群|资源|全网小说)/u.test(s)){sc+=4;break}
  const strongAd=contact||url||/(?:免费外群|中转群|群号|私聊群主|公众号|防失联|找书神器)/u.test(s);
  if(CHAT_FICTION_RX.test(s)&&!strongAd){sc-=6;why.push('聊天群剧情保护')}
  if(sc>=8)return match(lineNo,line,0,line.length,'full_line_ad',sc,'delete',why.join('、'));
  if(sc>=5)return match(lineNo,line,0,line.length,'full_line_ad',sc,'review',why.join('、'));
  return null;
}

function dedupe(ms){
  const priority={ad_pinyin_pollution:10,source_obfuscated_ad:10,chapter_boundary_artifact:9,platform_artifact:9,anti_scrape_injection:8,split_punct_ad:7,learned_exact:6,group_code_ad:5,full_line_ad:4,distributed_pollution:3,pollution:2,numeric_injection:1,roman_numeral:0};
  ms.sort((a,b)=>a.line-b.line||a.start-b.start||(b.end-b.start)-(a.end-a.start)||b.score-a.score);
  const out=[];
  for(const m of ms){
    const i=out.findIndex(x=>x.line===m.line&&!(x.end<=m.start||m.end<=x.start));
    if(i<0){out.push(m);continue}
    const x=out[i],rank=y=>[(y.action==='delete'?2:1),priority[y.kind]||0,y.score,y.end-y.start],a=rank(m),b=rank(x);
    for(let k=0;k<a.length;k++){if(a[k]!==b[k]){if(a[k]>b[k])out[i]=m;break}}
  }
  return out.sort((a,b)=>a.line-b.line||a.start-b.start);
}

export function applyMatches(text,matches,preserveBlank=true){
  const lines=text.split(/\r?\n/),by=new Map();
  for(const m of matches){if(!by.has(m.line))by.set(m.line,[]);by.get(m.line).push(m)}
  const out=lines.map((l,i)=>{let n=l;for(const m of (by.get(i+1)||[]).sort((a,b)=>b.start-a.start))n=n.slice(0,m.start)+n.slice(m.end);return n});
  if(preserveBlank)return out.join('\n');
  let blank=0;return out.filter(x=>x.trim()?(blank=0,true):++blank<=2).join('\n');
}

export function scanText(text,rules={},opts={}){
  const lines=text.split(/\r?\n/),book=analyzeBook(lines),keep=new Set(rules.keepFields||[]),all=[];
  lines.forEach((line,i)=>{
    if(!line.trim())return;
    const no=i+1,s=line.trim();
    all.push(...exact(no,line,rules),...web(no,line));
    const pa=platformArtifact(no,line);if(pa)all.push(pa);
    const ca=chapterBoundaryArtifact(no,line,book);if(ca)all.push(ca);
    all.push(...antiScrapeMatches(no,line,book));
    for(const[a,b,score]of adPinyinRegions(line))all.push(match(no,line,a,b,'ad_pinyin_pollution',score,score>=7?'delete':'review','拼音化广告/群号：ling meng / Qun / 数字拼音等'));
    for(const[a,b,score]of sourceUpdateRegions(line))all.push(match(no,line,a,b,'source_obfuscated_ad',score,'delete','来源广告：每天更新/交流群/备用群号的标点拆分变体'));
    for(const[a,b,score]of fuzzyRuoShuiAd(line))all.push(match(no,line,a,b,'split_punct_ad',score,'delete','若水小说群/中转群：高密度标点拆分广告'));
    for(const[a,b,score]of denseGroupCodeRegions(line))all.push(match(no,line,a,b,'group_code_ad',score,'delete','群号被标点拆分：高密度数字/标点广告'));
    const fa=fullAd(no,line,book.counts.get(s)||1,opts.publishers||[]);if(fa)all.push(fa);
    all.push(...numericInjection(no,line));
    if(!CHAPTER.test(s)){
      const regs=pollutionRegions(line),hardSignals=regs.reduce((n,[a,b])=>n+Array.from(line.slice(a,b)).filter(c=>risk(c)>=2).length,0);
      const distributed=regs.length>=2&&hardSignals>=3&&!DOMAIN_RX.test(line);
      for(const [a,b] of regs){
        const part=line.slice(a,b),f=feat(part),group=GROUP.test(part),domain=DOMAIN_RX.test(line)&&!group&&!adPinyinEvidence(part).family;
        let sc=f.score+(distributed?0.8:0)-(domain?3:0);
        if(f.high>=2&&(sc>=6.2||(group&&sc>=4.5)||(distributed&&sc>=5.8))){
          let aa=a,bb=b;
          if(group&&sc>=5.2){
            const left=line.slice(Math.max(0,a-10),a),right=line.slice(b,b+10);
            if(/^[\s\p{P}\p{S}]*$/u.test(left))aa=Math.max(0,a-left.length);
            if(/^[\s\p{P}\p{S}]*$/u.test(right))bb=Math.min(line.length,b+right.length);
          }
          const kind=distributed?'distributed_pollution':'pollution';
          all.push(match(no,line,aa,bb,kind,sc,sc>=7?'delete':'review',(distributed?'整句多污染岛、':'')+(group?'群系锚点、':'')+'异常 Unicode/汉字/数字混写'));
        }
      }
    }
    for(const m of line.matchAll(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]+/gu))all.push(match(no,line,m.index,m.index+m[0].length,'roman_numeral',4.5,'review','罗马数字复核'));
  });
  const ms=dedupe(all).filter(m=>!keep.has(m.field)),auto=ms.filter(x=>x.action==='delete'),review=ms.filter(x=>x.action==='review');
  return {cleaned:applyMatches(text,auto,opts.preserveBlank!==false),auto,review,stats:{auto:auto.length,review:review.length,lines:lines.length,bookBoundary:book.boundaryArtifacts.size,antiScrape:book.antiParen.size+book.antiNum.size}};
}

function pySeg(raw,p,max=4){
  const s=raw.toLowerCase().replaceAll('ü','v').replaceAll('u:','v'),memo=new Map();
  function rec(i,n){const k=i+':'+n;if(memo.has(k))return memo.get(k);if(i===s.length)return[[]];if(!n)return[];const out=[];for(let j=Math.min(s.length,i+6);j>i;j--){const q=s.slice(i,j);if(!p[q])continue;for(const r of rec(j,n-1)){out.push([q,...r]);if(out.length>=20)break}}memo.set(k,out);return out}
  return(p[s]&&s.length>=2?[[s]]:rec(0,max)).filter(x=>!x.some(q=>q.length===1)).slice(0,10);
}

function english(raw,left,right,rules,model){
  if(UPPER.has(raw))return true;
  if(/[A-Z]/.test(raw)&&(raw===raw.toUpperCase()||raw[0]===raw[0].toUpperCase()))return true;
  const low=raw.toLowerCase(),learn=new Set([...(rules.englishKeep||[]),...(model.e||[])].map(x=>String(x).toLowerCase()));
  return ENGLISH.has(low)||learn.has(low)||(!(isHan(left)||isHan(right)));
}

function candidates(parts,left,right,m){
  let beam=[[0,'']];
  for(const py of parts){
    const cs=(m.p[py]||[]).slice(0,10),next=[];
    for(const [s,prefix] of beam){const prev=prefix.slice(-1)||left;for(const ch of cs){let sc=s+.22*Math.log1p(m.u[ch]||0);if(isHan(prev))sc+=2.4*Math.log1p(m.b[prev+ch]||0);next.push([sc,prefix+ch])}}
    next.sort((a,b)=>b[0]-a[0]);beam=next.slice(0,50);
  }
  return beam.map(([s,t])=>[s+(t&&isHan(right)?2.4*Math.log1p(m.b[t.slice(-1)+right]||0):0),t]).sort((a,b)=>b[0]-a[0]);
}

function repair(raw,left,right,rules,m){
  if(english(raw,left,right,rules,m))return null;
  const segs=pySeg(raw,m.p);if(!segs.length)return null;
  const all=[];for(const seg of segs.slice(0,5))for(const [s,t] of candidates(seg,left,right,m).slice(0,8))all.push([s-.12*(seg.length-1),t,seg]);
  all.sort((a,b)=>b[0]-a[0]);if(!all.length)return null;
  const best=all[0],second=all.find((x,i)=>i&&x[1]!==best[1]),margin=best[0]-(second?second[0]:best[0]-4),cand=best[1];
  const le=isHan(left)?m.b[left+cand[0]]||0:0,re=isHan(right)?m.b[cand.slice(-1)+right]||0:0,tri=cand.length===1&&isHan(left)&&isHan(right)?m.t[left+cand+right]||0:0,ev=Math.max(le,re,tri);
  let conf=1/(1+Math.exp(-(margin-1)));if(tri>=20)conf=Math.max(conf,.98);else if(le>=100&&re>=100)conf=Math.max(conf,.96);else if(ev>=300)conf=Math.max(conf,.92);else if(ev>=100)conf=Math.max(conf,.84);
  const both=isHan(left)&&isHan(right);
  return {replacement:cand,confidence:conf,action:(!both&&conf>=.9&&ev>=200)?'auto':'review',reason:`拼音 ${best[2].join('+')}；左${le}/右${re}/候选差${margin.toFixed(2)}`};
}

function pinyinGate(line){
  const ad=adPinyinEvidence(line);if(ad.score>=7)return `疑似拼音化广告/群号（分数 ${ad.score.toFixed(1)}）`;
  const latin=foldLatinText(line).match(/[a-z]+/g)||[],numPy=latin.filter(x=>NUMBER_PINYIN.has(x)).length;
  const hard=Array.from(line).filter(c=>risk(c)>=2).length;
  if(numPy>=1&&(line.trim().length<=24||hard>=1||GROUP.test(line)||CIRCLED.test(line)||ROMAN.test(line)))return '疑似数字拼音广告污染，跳过普通拼音修复';
  const regs=pollutionRegions(line),strong=regs.filter(([a,b])=>{const f=feat(line.slice(a,b));return f.high>=2&&f.score>=4.5});
  if(strong.length>=2)return `仍存在 ${strong.length} 个乱码污染岛`;
  const f=feat(line);if(f.high>=5&&f.score>=5.5)return '整行乱码风险仍高';
  return '';
}

export function contextualFix(c,line){
  const l=c.start>0?Array.from(line.slice(0,c.start)).slice(-1)[0]||'':'',r=c.end<line.length?Array.from(line.slice(c.end))[0]||'':'';
  let s=c.original,t=c.replacement;if(isHan(l)){s=l+s;t=l+t}if(isHan(r)){s+=r;t+=r}return{source:s,target:t,count:1};
}

export function repairPinyin(text,rules,m){
  const fixes=[...(rules.pinyinFixes||[])].filter(x=>x?.source&&x?.target).sort((a,b)=>b.source.length-a.source.length),keep=new Set(rules.pinyinKeep||[]),auto=[],review=[],blocked=[];
  const lines=text.split('\n').map((original,idx)=>{
    const gate=pinyinGate(original);
    if(gate){blocked.push({line:idx+1,reason:gate,context:original.slice(0,180)});return original}
    let line=original;
    for(const f of fixes){let p=0;while((p=line.indexOf(f.source,p))>=0){const ctx=line.slice(Math.max(0,p-14),Math.min(line.length,p+f.source.length+14));line=line.slice(0,p)+f.target+line.slice(p+f.source.length);auto.push({line:idx+1,start:p,end:p+f.source.length,original:f.source,replacement:f.target,confidence:1,action:'auto',reason:'个人/内置拼音经验',context:ctx,learnFix:f});p+=f.target.length}}
    const cs=[];
    for(const x of line.matchAll(/[A-Za-z]{2,12}/g)){
      const a=x.index,b=a+x[0].length,left=a?line[a-1]:'',right=b<line.length?line[b]:'';
      if(!(isHan(left)||isHan(right)||((left==='('||left==='（')&&isHan(right))||((right===')'||right==='）')&&isHan(left))))continue;
      const key=(isHan(left)?left:'')+x[0]+(isHan(right)?right:'');if(keep.has(key))continue;
      const rep=repair(x[0],left,right,rules,m);if(!rep)continue;if(isHan(left)&&isHan(right))rep.action='review';
      const c={line:idx+1,start:a,end:b,original:x[0],replacement:rep.replacement,confidence:+rep.confidence.toFixed(4),action:rep.action,reason:rep.reason,context:line.slice(Math.max(0,a-14),Math.min(line.length,b+14))};c.learnFix=contextualFix(c,line);cs.push(c);
    }
    let n=line;for(const c of cs.sort((a,b)=>b.start-a.start)){if(c.action==='auto'){n=n.slice(0,c.start)+c.replacement+n.slice(c.end);auto.push(c)}else review.push(c)}return n;
  });
  return {text:lines.join('\n'),auto,review,blocked};
}

export function applyPinyinReview(text,review,decisions){
  const lines=text.split('\n'),by=new Map();
  review.forEach((c,i)=>{if(decisions[i]==='replace'){if(!by.has(c.line))by.set(c.line,[]);by.get(c.line).push(c)}});
  return lines.map((line,i)=>{let n=line;for(const c of(by.get(i+1)||[]).sort((a,b)=>b.start-a.start)){let p=c.start;if(n.slice(p,p+c.original.length)!==c.original)p=n.indexOf(c.original);if(p>=0)n=n.slice(0,p)+c.replacement+n.slice(p+c.original.length)}return n}).join('\n');
}

export function mergeRules(base={},delta={}){
  const o=structuredClone(base||{});
  for(const k of['adExact','garbleSamples','keepFields','pinyinKeep','englishKeep'])o[k]=uniq([...(o[k]||[]),...(delta[k]||[])]);
  const map=new Map();
  for(const f of[...(o.pinyinFixes||[]),...(delta.pinyinFixes||[])])if(f?.source&&f?.target){const k=f.source+'\0'+f.target,old=map.get(k);map.set(k,{source:f.source,target:f.target,count:Math.max(old?.count||0,f.count||1)})}
  o.pinyinFixes=[...map.values()].sort((a,b)=>b.count-a.count||b.source.length-a.source.length);
  o.version=Math.max(+o.version||0,+delta.version||0);
  o.stats={...(o.stats||{}),adExact:o.adExact.length,garbleSamples:o.garbleSamples.length,pinyinFixes:o.pinyinFixes.length};
  return o;
}
