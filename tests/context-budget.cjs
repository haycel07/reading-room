const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
  const {composeContext,POLICY}=await import(pathToFileURL(__dirname+'/../dist/reading-context.js'));
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
  console.log('PASS context <=24000 UTF-16 units including framing; continuous recent source and cached summaries; long/short/emoji');
})().catch(e=>{console.error(e);process.exitCode=1});
