const ZERO=/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/gu;
const ROMAN=/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅺⅻⅼⅽⅾⅿ]/u;
const CIRCLED=/[①②③④⑤⑥⑦⑧⑨⑩⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑]/u;
const GROUP_HAN=/[群羣裙]|君\s*羊/u;
const STORY_GROUP=/(?:【\s*(?:群提示|群消息|群公告)|聊天群(?:系统|任务|公告)|群成员|群友|群主(?:说|问|回复)|加入聊天群)/u;
const DOMAIN=/\b(?:EDG|LPL|LCK|SKT|RNG|IG|WE|OMG|TES|JDG|BLG|LOL|MVP|SMVP|ADC|TOP|SOLO|BP|MSI|AG|BO\d|S\d{1,2}|Letme|TheShy|Faker|Scout|mouse|iboy|meiko|clearlove)\b/iu;
const STRONG=new Set(Array.from('弍貳陾迩侕爾倭鸸洱栮贰玖镹泗児亻俬祁岜飼琦玐鳍陕衤瘤柒坝鹨氿捌叁轳咝鸠罒揪吆叄镏遛芭翏崎鏾覇壹陵紦磷硫傘陸熘厁韭锍澪掺彡氵焐邬裠箘逡麇踆帬峮羣囷宭鷗儛'));
const NUMBER_WORDS=['ling','yi','yao','er','liang','san','si','wu','liu','qi','ba','jiu'];
const SEP='[\\s\\p{P}\\p{S}\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]*';
const CONF={a:'[aAаɑ]',b:'[bB]',e:'[eEе]',g:'[gG]',i:'[iIіІıɩ]',j:'[jJ]',l:'[lLⅼӏ]',m:'[mM]',n:'[nN]',o:'[oOοо0]',q:'[qQ]',r:'[rR]',s:'[sS]',u:'[uU]',w:'[wW]',y:'[yY]'};
function fuzzyWord(word){return `(?<![A-Za-z])${word.split('').map(c=>CONF[c]||c).join(SEP)}(?![A-Za-z])`}
const tokenDefs=[
  ...NUMBER_WORDS.map(x=>({kind:'num',name:x,rx:new RegExp(fuzzyWord(x),'giu')})),
  {kind:'qun',name:'qun',rx:new RegExp(fuzzyWord('qun'),'giu')},
  {kind:'family',name:'ling_meng',rx:new RegExp(`(?:${fuzzyWord('ling')}${SEP}(?:${fuzzyWord('meng')}|[梦夢])|[灵凌玲铃陵靈鈴零]${SEP}${fuzzyWord('meng')})`,'giu')},
  {kind:'family',name:'yue_yi',rx:new RegExp(`(?:${fuzzyWord('yue')}${SEP}(?:${fuzzyWord('yi')}|漪)|月${SEP}${fuzzyWord('yi')})`,'giu')},
  {kind:'family',name:'ruo_shui',rx:new RegExp(`(?:${fuzzyWord('ruo')}${SEP}(?:${fuzzyWord('shui')}|水)|若${SEP}${fuzzyWord('shui')})`,'giu')},
  {kind:'family',name:'ruo_xi',rx:new RegExp(`(?:${fuzzyWord('ruo')}${SEP}(?:${fuzzyWord('xi')}|曦)|若${SEP}${fuzzyWord('xi')})`,'giu')}
];
function punctCount(s){return Array.from(s).filter(c=>/[\p{P}\p{S}]/u.test(c)).length}
function specialCount(s){return Array.from(s).filter(c=>ROMAN.test(c)||CIRCLED.test(c)).length}
function strongCount(s){return Array.from(s).filter(c=>STRONG.has(c)).length}
function digitCount(s){return (s.match(/[0-9０-９]/gu)||[]).length}
function matchObj(lineNo,line,a,b,score,action,reason){return{line:lineNo,start:a,end:b,kind:'ad_pinyin_pollution',score:+score.toFixed(2),field:line.slice(a,b),action,reason,originalLine:line}}
function collectTokens(line){
  const out=[];
  for(const d of tokenDefs){d.rx.lastIndex=0;for(const m of line.matchAll(d.rx)){if(!m[0])continue;out.push({kind:d.kind,name:d.name,start:m.index,end:m.index+m[0].length})}}
  for(const m of line.matchAll(/[群羣裙]/gu))out.push({kind:'qun',name:'group_han',start:m.index,end:m.index+m[0].length});
  out.sort((a,b)=>a.start-b.start||b.end-a.end);const ded=[];
  for(const t of out)if(!ded.some(x=>x.kind===t.kind&&x.start===t.start&&x.end===t.end))ded.push(t);
  return ded;
}
function clusters(tokens){if(!tokens.length)return[];const out=[];let cur=[tokens[0]];for(const t of tokens.slice(1)){const prev=cur[cur.length-1];if(t.start-prev.end<=56)cur.push(t);else{out.push(cur);cur=[t]}}out.push(cur);return out}
function extend(line,a,b){const noisy=c=>/[\s\p{P}\p{S}0-9０-９]/u.test(c)||STRONG.has(c)||ROMAN.test(c)||CIRCLED.test(c);let x=a,y=b;while(x>0&&a-x<18&&noisy(line[x-1]))x--;while(y<line.length&&y-b<28&&noisy(line[y]))y++;return[x,y]}
function scoreCluster(line,ts,a,b){
  const core=line.slice(a,b),family=ts.some(x=>x.kind==='family'),qun=ts.some(x=>x.kind==='qun'),num=ts.filter(x=>x.kind==='num').length;
  const digit=digitCount(core),special=specialCount(core),strong=strongCount(core),punct=punctCount(core);let score=0;
  if(family)score+=6;if(qun)score+=5;if(num>=2)score+=4;if(num>=4)score+=3;if(num>=1&&(digit+special+strong)>=2)score+=3;if(num>=1&&special>=2)score+=3;if(special)score+=2;if(strong>=2)score+=3;if(punct>=4)score+=1.5;if(family&&(qun||num||digit||special||strong))score+=2;
  if(STORY_GROUP.test(line)&&!family&&num<2&&digit===0&&special===0&&strong===0)score-=7;if(DOMAIN.test(line)&&!family&&!qun)score-=5;
  return{score,family,qun,num,digit,special,strong,punct};
}
export function detectAdPinyin(text){
  const out=[],lines=String(text||'').replace(ZERO,'').split(/\r?\n/);
  lines.forEach((line,i)=>{const ts=collectTokens(line);for(const c of clusters(ts)){let a=Math.min(...c.map(x=>x.start)),b=Math.max(...c.map(x=>x.end));[a,b]=extend(line,a,b);const e=scoreCluster(line,c,a,b);const high=(e.family&&(e.qun||e.num>=1||e.digit+e.special+e.strong>=2))||(e.qun&&e.num>=2)||(e.num>=3&&(e.special+e.strong+e.digit>=1))||(e.num>=1&&e.special+e.strong>=3);const review=(e.family||(e.qun&&(e.num>=1||e.special+e.strong>=2))||e.num>=2||(e.num>=1&&e.special>=2))&&e.score>=5;if(!high&&!review)continue;out.push(matchObj(i+1,line,a,b,e.score,high&&e.score>=8?'delete':'review',`拼音化广告优先检测：${e.family?'广告主体 ':''}${e.qun?'Qun/群 ':''}${e.num?`数字拼音×${e.num} `:''}${e.special?'圈号/罗马数字 ':''}${e.strong?'乱码混写':''}`.trim()))}});
  return out;
}
export function mergeAdPinyinScan(result,text,applyMatches,preserveBlank=true){
  const auto=[...(result?.auto||[])],review=[...(result?.review||[])],existing=[...auto,...review];
  for(const m of detectAdPinyin(text)){const overlap=existing.some(x=>x.line===m.line&&!(x.end<=m.start||m.end<=x.start));if(overlap)continue;(m.action==='delete'?auto:review).push(m);existing.push(m)}
  auto.sort((a,b)=>a.line-b.line||a.start-b.start);review.sort((a,b)=>a.line-b.line||a.start-b.start);
  return{...result,auto,review,cleaned:applyMatches(text,auto,preserveBlank),stats:{...(result?.stats||{}),auto:auto.length,review:review.length,adPinyinOverlay:[...auto,...review].filter(x=>x.kind==='ad_pinyin_pollution').length}};
}
export function gatePinyinResult(text,result){
  const suspicious=new Map();for(const m of detectAdPinyin(text))if(m.score>=5)suspicious.set(m.line,m.reason);if(!suspicious.size)return result;
  const original=String(text||'').split(/\r?\n/),produced=String(result?.text||text).split(/\r?\n/);for(const[line]of suspicious)if(line>=1&&line<=produced.length)produced[line-1]=original[line-1];
  const auto=(result?.auto||[]).filter(x=>!suspicious.has(x.line)),review=(result?.review||[]).filter(x=>!suspicious.has(x.line)),blocked=[...(result?.blocked||[])];
  for(const[line,reason]of suspicious)if(!blocked.some(x=>x.line===line))blocked.push({line,reason:'广告拼音门控：'+reason,context:(original[line-1]||'').slice(0,180)});
  return{...result,text:produced.join('\n'),auto,review,blocked};
}
