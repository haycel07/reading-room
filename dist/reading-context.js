// Offsets are UTF-16 positions in the extracted, already-read prefix only.
export const POLICY = {version: 1, threshold: 24000, recent: 12000, chunk: 12000, summary: 1600, budget: 16000};
const heading = /^(?:第[零〇一二三四五六七八九十百千万两0-9]+[章节回卷部篇集].{0,45}|(?:序章|序言|前言|楔子|引子|后记|尾声|番外|附录)(?:[\s：:·—-].{0,35})?|chapter\s+\d+\b.{0,45})$/i;

export function planContext(text, boundaries = []) {
  if (text.length <= POLICY.threshold) return {segments: [], rawStart: 0};
  const starts = new Map([[0, '开篇']]);
  for (const b of boundaries) if (b.start >= 0 && b.start < text.length) starts.set(b.start, String(b.label || '分段').slice(0, 80));
  let offset = 0;
  for (const line of text.split('\n')) {
    if (heading.test(line.trim())) starts.set(offset, line.trim());
    offset += line.length + 1;
  }
  const chapters = [...starts.keys()].sort((a,b)=>a-b), segments = [];
  const cutoff = text.length - POLICY.recent;
  let start = 0, chapter = 0;
  while (start < cutoff) {
    while (chapter + 1 < chapters.length && chapters[chapter + 1] <= start) chapter++;
    const next = chapters[chapter + 1] ?? text.length;
    let end = Math.min(start + POLICY.chunk, next);
    // Use only complete, stable chunks. The incomplete chunk stays verbatim.
    if (end > cutoff) break;
    if (end < next) {
      const newline = text.lastIndexOf('\n', end - 1);
      if (newline >= start + POLICY.chunk / 2) end = newline + 1;
      else if (end > start && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    segments.push({start, end, label: starts.get(chapters[chapter]) || '段落区间'});
    start = end;
  }
  return {segments, rawStart: start};
}

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export async function composeContext({text, bookId, boundaries, get, put, summarize, check = ()=>{}, progress = ()=>{}}) {
  const plan = planContext(text, boundaries);
  if (!plan.segments.length) return {text, originalLength:text.length, summarized:false, summaryCount:0, rawStart:0};
  let generated = 0, reused = 0;
  async function summaryOf(source, meta, kind) {
    check();
    const id = await digest(JSON.stringify([POLICY.version, bookId, kind, meta.start, meta.end, source]));
    const cached = await get(id);
    check();
    if (cached?.bookId === bookId && cached.start === meta.start && cached.end === meta.end && typeof cached.summary === 'string' && cached.summary.trim() && cached.summary.length <= POLICY.summary) {reused++;return cached.summary;}
    progress({generated, total:plan.segments.length, kind});
    const summary = (await summarize(source, kind)).trim();
    check();
    if (!summary || summary.length > POLICY.summary) throw Error('前文概括未完成或过长，请重试；本次没有省略正文发送。');
    await put({id, bookId, start:meta.start, end:meta.end, summary});
    generated++;
    return summary;
  }
  const render = s => `【${s.label}｜已读字符 ${s.start + 1}—${s.end}】\n${s.summary}`;
  let summaries = [];
  for (const segment of plan.segments) {
    const summary = await summaryOf(text.slice(segment.start, segment.end), segment, 'original');
    summaries.push({...segment, summary});
  }
  // Extremely long books need bounded grouped overviews too. All ranges remain
  // represented; leaf summaries remain cached, and are usable after a rollback.
  let levels = 0;
  while (summaries.map(render).join('\n\n').length > POLICY.budget) {
    const grouped = [];
    for (let i=0;i<summaries.length;i+=6) {
      const group = summaries.slice(i,i+6), first=group[0], last=group.at(-1);
      const meta = {start:first.start,end:last.end,label:`${first.label} 至 ${last.label}`.slice(0,170)};
      grouped.push({...meta,summary:await summaryOf(group.map(render).join('\n\n'),meta,'overview')});
    }
    summaries = grouped; levels++;
  }
  check();
  return {text:'【较早已读内容的概括｜可能损失细节，不是原文引文】\n'+summaries.map(render).join('\n\n')+'\n\n【以下为连续原文｜已读字符 '+(plan.rawStart+1)+'—'+text.length+'】\n'+text.slice(plan.rawStart), originalLength:text.length, summarized:true, summaryCount:plan.segments.length, rawStart:plan.rawStart, generated, reused, levels};
}
