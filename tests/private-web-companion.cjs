// Runs the browser API path on the private Site origin, with local assets and a fictional provider.
// Production resource equality is verified separately; this never contacts a provider account.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {browserExecutable,importIntoReader,scrollNear}=require('./reader-helpers.cjs');
const {candidateId}=require('./prepared-fixture.cjs');
const origin='https://reading-room-1109.tangqichen2007.chatgpt.site',provider='https://fictional-provider.test',root=path.resolve(__dirname,'../dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.wasm':'application/wasm'};
(async()=>{const browser=await chromium.launch({headless:true,executablePath:browserExecutable()});try{for(const width of [390,1440]){
 const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),p=await c.newPage(),calls=[],errors=[],otherAPI=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
 await p.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(u.origin===provider){
   const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
   if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers});
   assert.equal(r.request().headers().authorization,'Bearer fictional-key');const body=r.request().postDataJSON(),system=body.messages[0].content,user=body.messages.at(-1).content;
   const task=system.includes('candidateId')?'comment':system.includes('"summary"')?'summary':'chat',range=user.match(/本次新增原文｜(\d+)—(\d+)/),candidate=candidateId(user);calls.push({task,body,end:range?Number(range[2]):null});
   const content=task==='comment'?JSON.stringify({speak:true,candidateId:candidate,text:'她把伞留在门口，却没有催来客离开，这个动作挺温柔的。',carry:'来客在书店听雨，店主留下蓝伞。'}):task==='summary'?JSON.stringify({summary:'来客在书店听雨。',memory:'店主把伞留在门口。'}):'我是在接着那条关于蓝伞的短评说，只依据你读到的原句。';
   return r.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({choices:[{message:{content},finish_reason:'stop'}]})});
  }
  if(u.origin!==origin)return r.abort();
  if(u.pathname.startsWith('/api/')){otherAPI.push(u.pathname);return r.fulfill({status:503,body:'No local relay in this web-origin test'})}
  const file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return r.fulfill({status:404,body:'Not found'});
  return r.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await p.goto(origin);await importIntoReader(p,{name:'私有网页伴读-完全虚构.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 蓝伞\n'+'她把蓝伞留在门口，却没有催来客离开；来客在书店听雨。\n'.repeat(280)+'未读终点专号：孔雀邮差橘子。')});
 await p.locator('#companionToggle').click();assert.equal(calls.length,0);await p.locator('#companionStateAction').click();await p.locator('#aiProvider').selectOption('custom');await p.locator('#aiEndpoint').fill(provider+'/v1');await p.locator('#aiModel').fill('fictional-model');await p.locator('#aiKey').fill('fictional-key');await p.locator('#aiRemember').uncheck();await p.locator('#saveAI').click();await p.locator('#closeSettings').click();
 await p.locator('#companionToggle').click();await p.locator('#companionStateAction').click();await p.locator('#companionClose').click();await p.waitForFunction(()=>document.getElementById('proactiveStatus').textContent.includes('2 / 2 处已处理'));const first=calls.find(x=>x.task==='comment');assert(first?.end>0);assert(!first.body.messages.at(-1).content.includes('孔雀邮差橘子'));await scrollNear(p,first.end+20);await p.locator('#initiativeCard').waitFor({state:'visible'});const before=calls.length;await p.locator('#initiativeReply').click();assert.equal(calls.length,before,'opening the quoted conversation is free of additional model calls');
 await p.locator('#chatInput').fill('你刚才为什么这么想？');await p.locator('#chatSend').click();await p.waitForFunction(()=>!document.getElementById('chatSend').disabled);const chat=calls.filter(x=>x.task==='chat').at(-1);assert(chat);assert(chat.body.messages.at(-1).content.includes('阅读助手')||chat.body.messages.at(-1).content.includes('伙伴当时说'));assert(!JSON.stringify(chat.body).includes('孔雀邮差橘子'));assert((await p.locator('#chatLog').innerText()).includes('接着那条关于蓝伞'));assert(await p.evaluate(()=>!Object.values(localStorage).some(v=>v.includes('fictional-key'))),'fictional credentials remain session-only');assert.deepEqual(otherAPI,[],'the private web never tries to call the desktop relay');assert.deepEqual(errors,[]);await c.close();console.log('PASS private web origin: explicit API setup, cached comment while reading, quoted followup, no future ending, no desktop relay or real credentials '+width);
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
