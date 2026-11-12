const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
  global.window={};global.location={hostname:'reader.test'};
  const {requestAPI}=await import(pathToFileURL(__dirname+'/../dist/ai-client.js'));
  const req={endpoint:'https://api.example.test/chat/completions',sk:'fictional',body:{messages:[],model:'fictional'}};
  let aborted=false;
  global.fetch=async(_,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'))}));
  const timeout=await requestAPI(req,{timeoutMs:20});assert.equal(timeout.status,504);assert(aborted);
  const controller=new AbortController(),canceled=requestAPI(req,{signal:controller.signal});controller.abort();await assert.rejects(canceled,{name:'AbortError'});
  global.fetch=async()=>({ok:true,json:()=>new Promise(()=>{})});assert.equal((await requestAPI(req,{timeoutMs:20})).status,504,'body decode bounded too');
  let canceledNative=false;
  window.OnePageAI={request(){},cancel(){canceledNative=true}};
  assert.equal((await requestAPI(req,{timeoutMs:20})).status,504);assert(canceledNative);assert.equal(Object.keys(window.__onepageAI).length,0);
  console.log('PASS web/native deadline, body timeout, caller cancellation, native callback cleanup; no real endpoint');
})().catch(e=>{console.error(e);process.exitCode=1});
