// Android grants a channel to this top-level asset page only. Books get no bridge.
(() => {
  if (location.origin !== 'https://appassets.androidplatform.net' || window !== window.top || !location.pathname.startsWith('/assets/')) return;
  let port;
  const queue=[];
  const send=(bridge,action,args)=>{
    const message=JSON.stringify({bridge,action,args});
    if(port)port.postMessage(message);
    else if(queue.length<32)queue.push(message);
    else throw Error('原生通道尚未就绪，请重新打开应用');
  };
  window.addEventListener('message',event=>{
    if(port||event.data!=='onepage-native-port'||(event.source!==null&&event.source!==window)||event.ports.length!==1)return;
    port=event.ports[0];port.start();
    for(const message of queue.splice(0))port.postMessage(message);
  });
  for(const [name,bridge,methods]of [
    ['OnePageAI','ai',['request','cancel']],
    ['OnePageFiles','files',['save']],
    ['OnePageSpeech','speech',['speak','stop','sleep']],
    ['OnePageReading','reading',['keepAwake','fullscreen','readClipboard']],
  ]) {
    const facade={};
    for(const action of methods)facade[action]=(...args)=>send(bridge,action,args);
    window[name]=Object.freeze(facade);
  }
})();
