const assert=require('node:assert/strict');
const {commentFixture}=require('./prepared-fixture.cjs');
(async()=>{const {PreparedBook,PreparedReader,commentPoints}=await import('../dist/prepared-reading.js');
 const text=Array.from({length:7},(_,i)=>'Chapter '+(i+1)+'\n'+('她把伞借给陌生人，自己留在书店读书，雨点落在窗边。\n').repeat(180)).join('');
 const cache=new Map(),requests=[],events=[];let pos=0,release,entered;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);let first=true;
 const book=await PreparedBook.create({bookId:'priority-fiction',text,promptKey:'test',get:async k=>cache.get(k),put:async v=>cache.set(v.id,structuredClone(v)),request:async(p,signal)=>{requests.push(p);if(first){first=false;entered();await gate}return p.task==='prepared-comment'?commentFixture(p,{text:'她留在书店读书。'}):{summary:'书店',memory:'她在书店读书。'}}});
 const snap={},pump=new PreparedReader({snapshot:()=>snap,valid:()=>true,resolve:async()=>({book,position:pos}),withdraw(){},status(){},error:e=>{throw e},deliver:async(_,n)=>{events.push(n);return true}});
 pump.schedule();await started;pos=book.regions[3].start+30;const jumped=pump.tick();
 for(let i=0;i<40&&!requests.some(p=>p.regionIndex===3);i++)await new Promise(r=>setTimeout(r,10));
 assert(requests.some(p=>p.regionIndex===3&&p.task==='prepared-comment'),'jump starts current comments before abandoned slow response finishes');
 release();await jumped;await new Promise(r=>setTimeout(r,180));assert(!requests.some(p=>p.regionIndex===0&&p.task==='region-summary'),'abandoned summary cannot block current comments');assert(events.every(e=>e.regionIndex>=2),'no distant old bubble');pump.cancel();

 // Adjacent summaries are low priority; a prefetched next region is not abandoned.
 const hooks=(b,getPos)=>({snapshot:()=>snap,valid:()=>true,resolve:async()=>({book:b,position:getPos()}),withdraw(){},status(){},error:e=>{throw e},deliver:async()=>true});
 let at=0,summaryEntered;const summaryStarted=new Promise(r=>summaryEntered=r),summaryCalls=[];
 const local=new Map(),slowSummary=await PreparedBook.create({bookId:'slow-summary',text,promptKey:'test',get:async k=>local.get(k),put:async v=>local.set(v.id,structuredClone(v)),request:async(p,signal)=>{summaryCalls.push(p);if(p.task==='region-summary'&&p.regionIndex===0){summaryEntered();await new Promise((_,reject)=>{const abort=()=>reject(new DOMException('Aborted','AbortError'));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true})})}return p.task==='prepared-comment'?commentFixture(p,{text:'当前区细节。'}):{summary:'概述',memory:'累计'}}});
 const secondary=new PreparedReader(hooks(slowSummary,()=>at));secondary.schedule();await summaryStarted;at=slowSummary.regions[1].start+10;const moved=secondary.tick();for(let i=0;i<40&&!summaryCalls.some(p=>p.regionIndex===1);i++)await new Promise(r=>setTimeout(r,10));assert(summaryCalls.some(p=>p.regionIndex===1&&p.task==='prepared-comment'),'previous summary cannot delay adjacent comments');await moved;secondary.cancel();
 let nextEntered,allowNext,nextSignal;const nextStarted=new Promise(r=>nextEntered=r),nextGate=new Promise(r=>allowNext=r),prefetchCache=new Map();
 const prefetched=await PreparedBook.create({bookId:'legitimate-prefetch',text,promptKey:'test',get:async k=>prefetchCache.get(k),put:async v=>prefetchCache.set(v.id,structuredClone(v)),request:async(p,signal)=>{if(p.task==='prepared-comment'&&p.regionIndex===1&&!nextSignal){nextSignal=signal;nextEntered();await nextGate}return p.task==='prepared-comment'?commentFixture(p,{text:'预备下一段细节。'}):{summary:'概述',memory:'累计'}}});
 const stillAt=Math.floor(prefetched.regions[0].end*.6),prefetchReader=new PreparedReader(hooks(prefetched,()=>stillAt));prefetchReader.schedule();await nextStarted;await prefetchReader.tick();assert(!nextSignal.aborted,'remaining in the current region must not cancel legitimate lookahead');allowNext();await new Promise(r=>setTimeout(r,120));prefetchReader.cancel();
 const region=book.regions.find(r=>r.end-r.start>4500),points=commentPoints(text,region);assert(points[0].offset-region.start<=1000);assert(points[1].offset-points[0].offset>1500);assert.equal(commentPoints(text,region,'quiet').length,1);
 console.log('PASS slow abandoned requests do not block current region, no stale summary/remote old bubble, early first batch with unchanged 5000 limit and two-comment cap');
})().catch(e=>{console.error(e);process.exitCode=1});
