const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
  const {composeContext,planContext,POLICY}=await import(pathToFileURL(__dirname+'/../dist/reading-context.js'));
  for(const length of [0,23999,24000,24001,26668,35999,47999,360000]) {
    const text=('雨中散步😀。\n'.repeat(Math.ceil(length/8))).slice(0,length).replace(/[\uD800-\uDBFF]$/,'');
    const cache=new Map();let calls=0;
    const options={text,bookId:'budget-'+length,get:k=>cache.get(k),put:v=>cache.set(v.id,v),summarize:async()=>{calls++;return '概'.repeat(1600)}};
    const result=await composeContext(options);
    assert(result.text.length<=POLICY.threshold,'including labels and separators: '+length+' => '+result.text.length);
    assert(result.text.endsWith(text.slice(-Math.min(text.length,POLICY.recent))),'continuous recent text retained');
    if(result.summarized)assert.equal(result.text.slice(result.text.indexOf('【以下为连续原文')).split('】\n')[1],text.slice(result.rawStart));
    const count=calls;assert.equal((await composeContext(options)).text,result.text);assert.equal(calls,count,'summaries reused');
  }
  const shortChapters=Array.from({length:50},(_,i)=>{
    const heading=`第${i+1}章 虚构章节\n`;
    return heading+'雨'.repeat(900-heading.length-1)+'\n';
  }).join('');
  const storage=new Map(),requests=[];
  const args={bookId:'short-chapter-fiction',get:k=>storage.get(k),put:v=>storage.set(v.id,v),
    summarize:async(source,kind)=>{requests.push({source,kind});return '几章虚构的雨景和书店。'}};
  const firstText=shortChapters.slice(0,25000);
  const firstPlan=planContext(firstText);
  const first=await composeContext({...args,text:firstText});
  assert.deepEqual(firstPlan.segments.map(x=>[x.start,x.end]),[[0,3600],[3600,7200],[7200,10800]]);
  assert.equal(requests.length,3,'complete short chapters share bounded requests');
  assert.equal(requests.map(r=>r.source).join(''),firstText.slice(0,first.rawStart));
  assert(requests.every(r=>r.kind==='original'&&r.source.length<=POLICY.shortGroup));
  assert(firstPlan.segments[0].label.includes('第1章')&&firstPlan.segments[0].label.includes('第4章'));
  const advanced=await composeContext({...args,text:shortChapters.slice(0,25040)});
  assert.equal(advanced.rawStart,first.rawStart);
  assert(advanced.text.startsWith(first.text),'within the same group, constant header preserves the old prefix');
  assert.equal(requests.length,3,'advancing within a group does not recreate it');
  const later=await composeContext({...args,text:shortChapters.slice(0,33000)});
  assert.equal(later.reused,3,'a new group preserves earlier group keys');
  const rollback=await composeContext({...args,text:firstText});
  assert.equal(rollback.text,first.text,'rolling back cannot reuse an overview containing later text');
  assert(!rollback.text.includes('第35章'));
  console.log('PASS context <=24000 UTF-16 units including framing; continuous recent source and cached summaries; long/short/emoji');
})().catch(e=>{console.error(e);process.exitCode=1});
