// Local-only HTTPS relay for explicitly configured compatible AI providers.
// No disk persistence, redirects, credentials in diagnostics, or private-network targets.
const https=require('node:https'),dns=require('node:dns').promises,net=require('node:net');
function publicAddress(ip){
 if(net.isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&[0,168].includes(b)||a===100&&b>=64&&b<=127||a===198&&[18,19,51].includes(b)||a===203&&b===0)}
 if(net.isIP(ip)===6)return /^[23][0-9a-f]{0,3}:/i.test(ip)&&!ip.toLowerCase().startsWith('2001:db8:');return false;
}
async function relay(input,{lookup=dns.lookup,request=https.request,signal}={}){
 const url=new URL(input.endpoint);if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||url.port&&!['443'].includes(url.port)||!url.pathname.endsWith('/chat/completions'))throw Error('请使用公共HTTPS服务的Chat Completions地址');
 if(typeof input.sk!=='string'||input.sk.length>4096||/[\r\n]/.test(input.sk)||!input.body||typeof input.body.model!=='string'||!Array.isArray(input.body.messages))throw Error('API请求格式有误');
 const addresses=await lookup(url.hostname,{all:true});if(!addresses.length||!addresses.every(x=>publicAddress(x.address)))throw Error('此API地址不是允许的公共HTTPS服务');const address=addresses[0];
 return new Promise((resolve,reject)=>{let settled=false;const finish=(error,value)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);error?reject(error):resolve(value)};
 const req=request(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+input.sk},lookup:(_host,_opts,cb)=>cb(null,address.address,address.family),timeout:90000},res=>{if(res.statusCode<200||res.statusCode>=300){res.resume();finish(Error('API请求失败（HTTP '+res.statusCode+'），请检查配置或额度'));return}let bytes=0,chunks=[];res.on('data',c=>{bytes+=c.length;if(bytes>2000000){req.destroy();finish(Error('API返回过长'))}else chunks.push(c)});res.on('end',()=>{try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));finish(null,data)}catch{finish(Error('API返回不是有效JSON'))}});res.on('error',()=>finish(Error('API连接中断')))});
 const abort=()=>{req.destroy();finish(Error('API请求已取消'))};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return}req.on('timeout',()=>{req.destroy();finish(Error('API响应超时'))});req.on('error',()=>finish(Error('无法连接API，请检查HTTPS地址与网络')));req.end(JSON.stringify(input.body));
 });
}
module.exports={relay,publicAddress};
