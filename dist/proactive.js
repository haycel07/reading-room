// Reading events queue a sample; continuous scrolling never postpones it.
export const PACES={
 frequent:{sampleDelay:250,interval:20000,minNewText:100,hourly:90},
 lively:{sampleDelay:150,interval:8000,minNewText:50,hourly:180},
 quiet:{sampleDelay:250,interval:60000,minNewText:240,hourly:30}
};
export class ProactiveReader {
  constructor(hooks, policy={}) {
    this.hooks=hooks;
    this.policy={...PACES.frequent,...policy};
    this.revision=0;
  }
  cancel() {
    clearTimeout(this.timer);this.timer=null;this.scheduledSnapshot=null;this.revision++;
    this.controller?.abort(); this.controller=null;
    this.pendingSnapshot=null;
    this.hooks.withdraw();
  }
  schedule() {
    const latest=this.hooks.snapshot();
    if(!latest){this.cancel();return}
    if(this.pendingSnapshot&&this.hooks.valid(this.pendingSnapshot))return;
    if(this.pendingSnapshot)this.cancel();
    // Preserve both sampling and cooldown deadlines while the reader advances.
    if(this.timer!==null&&this.timer!==undefined&&this.scheduledSnapshot&&this.hooks.valid(this.scheduledSnapshot))return;
    if(this.timer!==null&&this.timer!==undefined)this.cancel();
    this.queue(this.policy.sampleDelay,latest);
  }
  queue(delay,snapshot){
    clearTimeout(this.timer);this.scheduledSnapshot=snapshot;
    this.timer=setTimeout(()=>{this.timer=null;this.scheduledSnapshot=null;this.run()},delay);
  }
  setPace(pace){this.cancel();this.policy={...(PACES[pace]||PACES.frequent)};this.schedule()}
  async run() {
    if(this.controller)return;
    const revision=this.revision, snapshot=this.hooks.snapshot();
    if(!snapshot)return;
    const controller=new AbortController(); this.controller=controller;
    this.pendingSnapshot=snapshot;
    const valid=()=>{
      if(revision!==this.revision||controller.signal.aborted||!this.hooks.valid(snapshot))throw new DOMException('Reading changed','AbortError');
    };
    try {
      const state=this.hooks.state(snapshot.key), now=Date.now();
      const recent=(state.attempts||[]).filter(t=>t>now-3600000);
      const wait=recent.length>=this.policy.hourly?recent[0]+3600000-now:state.lastAttempt?this.policy.interval-(now-state.lastAttempt):0;
      if(wait>0){this.queue(wait+10,snapshot);return}
      let next;
      const begin=length=>{
        valid();
        if(length-(state.length||0)<this.policy.minNewText)return false;
        // Reserve an attempt before any background summaries are generated.
        next={...state,length,lastAttempt:now,attempts:[...recent,now]};
        this.hooks.saveState(snapshot.key,next);return true;
      };
      const context=await this.hooks.prepare(snapshot,controller.signal,valid,begin);
      valid();
      if(!next&&!begin(context.originalLength))return;
      const result=await this.hooks.request(snapshot,context,controller.signal);
      valid();
      if(!result||result.speak!==true||typeof result.text!=='string'||!result.text.trim()||result.text.length>220)return;
      await this.hooks.deliver(snapshot,result.text.trim(),valid);
      valid();
    } catch(error) {
      if(error.name!=='AbortError'&&revision===this.revision)this.hooks.error(error);
    } finally {
      if(this.controller===controller){
        this.controller=null;this.pendingSnapshot=null;
        if(revision===this.revision&&this.hooks.valid(snapshot)&&JSON.stringify(this.hooks.snapshot()?.anchor)!==JSON.stringify(snapshot.anchor))this.queue(this.policy.sampleDelay,this.hooks.snapshot());
      }
    }
  }
}

export function parseInitiative(reply) {
  try {return JSON.parse(reply)} catch {return {speak:false,text:''}}
}
