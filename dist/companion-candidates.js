// Exact source ranges, never text found later by a first-match search.
function fallbackSegments(raw){
 const pieces=[];let start=0;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];if(!/[。！？!?；;.\n]/.test(c))continue;
  if(c==='.'&&(/[0-9]/.test(raw[i-1]||'')&&/[0-9]/.test(raw[i+1]||'')||/[\p{L}\p{N}]/u.test(raw[i+1]||'')))continue;
  let end=i+1;while(end<raw.length&&/[”’"'」]/.test(raw[end]))end++;
  pieces.push({index:start,segment:raw.slice(start,end)});start=end;i=end-1;
 }
 if(start<raw.length)pieces.push({index:start,segment:raw.slice(start)});return pieces;
}
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh',{granularity:'sentence'}):{segment:fallbackSegments};
const heading=/^(?:第[零〇一二三四五六七八九十百千万两0-9]+[章节回卷部篇集]|chapter\s+\d+\b)/i;
const abbreviation=/(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc)|\b[A-Z]|\be\.g|\bi\.e)\.\s*$/i;
const unclosedQuote=s=>[...s].reduce((n,c)=>n+('“「'.includes(c)?1:'”」'.includes(c)?-1:0),0)>0;
export function candidatesIn(text,start,end){
 const out=[];let paragraphStart=start,open=false;
 const flush=limit=>{
  const raw=text.slice(paragraphStart,limit);
  const pieces=[...segmenter.segment(raw)],joined=[];
  for(const s of pieces){const last=joined.at(-1);if(last&&(abbreviation.test(last.segment)||unclosedQuote(last.segment)))last.segment+=s.segment;else joined.push({index:s.index,segment:s.segment})}
  for(const s of joined){
   let a=paragraphStart+s.index,b=a+s.segment.length;
   while(a<b&&/\s/.test(text[a]))a++;while(b>a&&/\s/.test(text[b-1]))b--;
   const quote=text.slice(a,b);if(!quote||quote.length>360||heading.test(quote)||!/[\p{L}\p{N}]/u.test(quote))continue;
   // A window ending inside a sentence is context, not an invented complete quote.
   if(b===end&&end<text.length&&!/[。！？!?；;.”’"']$/.test(quote)&&!/\s/.test(text[end]))continue;
   out.push({id:'s'+a,start:a,end:b,quote});
  }
  paragraphStart=limit;
 };
 for(let i=start;i<end;i++){
  if(text[i]==='“'||text[i]==='「')open=true;
  if(text[i]==='”'||text[i]==='」')open=false;
  if(text[i]==='\n'&&!open)flush(i+1);
 }
 if(paragraphStart<end)flush(end);return out;
}
export const validCandidate=(text,c,start,end)=>!!c&&typeof c.id==='string'&&Number.isInteger(c.start)&&Number.isInteger(c.end)&&c.start>=start&&c.end>c.start&&c.end<=end&&text.slice(c.start,c.end)===c.quote;
export function annotateCandidates(text,start,end,candidates){
 let at=start,out='';for(const c of candidates){if(!validCandidate(text,c,start,end))continue;out+=text.slice(at,c.start)+'\n〔候选 '+c.id+'〕'+text.slice(c.start,c.end);at=c.end}return out+text.slice(at,end);
}
