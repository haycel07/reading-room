import {downloadFile,noteExport,shareNoteCard} from './library-data.js';
// Local annotations never modify book text or participate in AI context.
const STROKES=['solid','dashed','marker'];
const highlightName=(color,stroke)=>'reader-'+color+(stroke==='solid'?'':'-'+stroke);
const $ = id => document.getElementById(id);
export const COLORS = {gold:'#b99150',blue:'#819cb6',sage:'#8b9f81',rose:'#b68d94'};
export const annotationStyles = `
::selection { background:#dfe7ef !important; color:#293541 !important }
${Object.entries(COLORS).flatMap(([name,color])=>STROKES.map(stroke=>`::highlight(${highlightName(name,stroke)}) { text-decoration:${stroke==='marker'?'none':'underline '+stroke+' '+color+' 2px'}; background-color:${color}${stroke==='marker'?'38':'14'}; }`)).join('\n')}`;

export function captureRange(root,range) {
  if(!root.contains(range.commonAncestorContainer))return null;
  const prefix=root.ownerDocument.createRange();prefix.selectNodeContents(root);prefix.setEnd(range.startContainer,range.startOffset);
  const start=prefix.toString().length,quote=range.toString(),end=start+quote.length,text=root.textContent;
  if(!quote.trim()||text.slice(start,end)!==quote)return null;
  return {start,end,quote,before:text.slice(Math.max(0,start-40),start),after:text.slice(end,end+40)};
}

export function restoreRange(root,mark) {
  const text=root.textContent;let start=mark.start,end=mark.end;
  if(text.slice(start,end)!==mark.quote) {
    const candidates=[];let at=text.indexOf(mark.quote);
    while(at>=0) {if((!mark.before||text.slice(Math.max(0,at-mark.before.length),at)===mark.before)&&(!mark.after||text.slice(at+mark.quote.length,at+mark.quote.length+mark.after.length)===mark.after))candidates.push(at);at=text.indexOf(mark.quote,at+1)}
    if(candidates.length!==1)return null;start=candidates[0];end=start+mark.quote.length;
  }
  const walker=root.ownerDocument.createTreeWalker(root,NodeFilter.SHOW_TEXT),range=root.ownerDocument.createRange();let n,at=0,found=false;
  while(n=walker.nextNode()) {const next=at+n.length;if(!found&&start<next){range.setStart(n,start-at);found=true}if(found&&end<=next){range.setEnd(n,end-at);return range}at=next}
  return null;
}
const sameScope=(a,b)=>a.type===b.type&&(a.type==='txt'?a.encoding===b.encoding:a.type==='pdf'?a.page===b.page:a.section===b.section);
const sameMark=(a,b)=>a.bookId===b.bookId&&sameScope(a,b)&&a.start===b.start&&a.end===b.end&&a.quote===b.quote;

export async function openAnnotationStore() {
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('between-pages-annotations',1);q.onupgradeneeded=()=>q.result.createObjectStore('marks',{keyPath:'id'}).createIndex('bookId','bookId');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
  const tx=(mode,run)=>new Promise((resolve,reject)=>{const t=db.transaction('marks',mode),q=run(t.objectStore('marks'));t.oncomplete=()=>resolve(q?.result);t.onerror=t.onabort=()=>reject(t.error)});
  return {list:bookId=>tx('readonly',s=>s.index('bookId').getAll(bookId)),put:mark=>tx('readwrite',s=>s.put(mark)),remove:id=>tx('readwrite',s=>s.delete(id)),deleteBook:bookId=>tx('readwrite',s=>{const q=s.index('bookId').openCursor(bookId);q.onsuccess=()=>{const c=q.result;if(c){c.delete();c.continue()}};return q})};
}

export class Annotations {
  static async create(hooks){return new Annotations(await openAnnotationStore(),hooks)}
  constructor(store,hooks) {
    this.store=store;this.hooks=hooks;this.marks=[];this.docs=new Set();this.bookId=null;this.revision=0;
    $('notesToggle').onclick=()=>this.openLibrary();
    $('notesClose').onclick=()=>$('notesDialog').close();$('notesSort').onchange=$('notesColor').onchange=()=>this.renderLibrary();$('exportNotes').onclick=async()=>{try{const marks=this.visibleMarks(),format=$('notesFormat').value;await downloadFile('阅读笔记.'+format,format==='csv'?'text/csv':'text/plain',noteExport(marks,format,this.hooks.state().name||''));this.hooks.notify('已生成当前筛选的已读笔记文件')}catch(e){this.hooks.notify(e.message)}};
    $('noteCancel').onclick=()=>$('noteDialog').close();
    $('noteForm').onsubmit=e=>{e.preventDefault();this.saveEditor()};
    $('deleteNote').onclick=()=>this.removeEditing();
    for(const id of ['noteDialog','notesDialog']) {
      $(id).addEventListener('close',()=>{if(id==='noteDialog'&&$('notesDialog').open)this.renderLibrary();this.hooks.resume()});
      $(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close()}});
    }
    $('noteText').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('noteForm').requestSubmit()}});
  }
  reset(){this.revision++;this.bookId=null;this.marks=[];this.editing=null;for(const id of ['noteDialog','notesDialog'])if($(id).open)$(id).close();this.clearPaint();$('notesCount').textContent=''}
  async load(bookId) {
    const revision=++this.revision;this.clearPaint();this.bookId=bookId;this.marks=[];
    try{const marks=await this.store.list(bookId);if(revision!==this.revision||this.hooks.state().bookId!==bookId)return;this.marks=marks;this.paint();$('notesCount').textContent=marks.length||''}catch{this.hooks.notify('笔记读取失败，原有书籍仍可阅读')}
  }
  surfaces(){return this.hooks.state().surfaces||[]}
  clearPaint(){for(const doc of this.docs)for(const color of Object.keys(COLORS))for(const stroke of STROKES)doc.defaultView?.CSS?.highlights?.delete(highlightName(color,stroke));this.docs.clear()}
  paint() {
    this.clearPaint();if(this.bookId!==this.hooks.state().bookId)return;
    for(const surface of this.surfaces()) {
      const {root}=surface,doc=root.ownerDocument,win=doc.defaultView;if(!win?.CSS?.highlights||!win.Highlight)continue;
      if(!doc.querySelector('style[data-reader-annotations]')){const style=doc.createElement('style');style.dataset.readerAnnotations='';style.textContent=annotationStyles;doc.head.append(style)}
      for(const color of Object.keys(COLORS))for(const stroke of STROKES) {
        const ranges=this.marks.filter(m=>m.underline&&m.color===color&&(m.stroke||'solid')===stroke&&sameScope(m,surface)).map(m=>restoreRange(root,m)).filter(Boolean);
        win.CSS.highlights.set(highlightName(color,stroke),new win.Highlight(...ranges));
      }
      this.docs.add(doc);
    }
  }
  existing(excerpt){return this.marks.find(m=>sameMark(m,excerpt))}
  draft(excerpt){const existing=this.existing(excerpt);return existing?{...existing}:{...excerpt,id:crypto.randomUUID(),created:Date.now(),color:'gold',underline:true,note:''}}
  async persist(mark) {
    await this.store.put({...mark,updated:Date.now()});
    if(this.bookId===mark.bookId&&this.hooks.state().bookId===mark.bookId){this.marks=this.marks.filter(m=>m.id!==mark.id);this.marks.push(mark);this.paint();$('notesCount').textContent=this.marks.length||''}
  }
  async toggleUnderline(excerpt) {
    const mark=this.draft(excerpt);mark.underline=!this.existing(excerpt)?.underline;
    if(!mark.underline&&!mark.note)await this.remove(mark);else await this.persist(mark);
    this.hooks.clearSelection();this.hooks.notify(mark.underline?'已划线，可在“笔记”里换色或补记':'已取消划线');
    if(mark.underline&&!globalThis.CSS?.highlights)this.hooks.notify('划线已保存；当前浏览器不支持正文绘制，请从“笔记”查看');
  }
  openEditor(excerpt) {
    this.hooks.pause();this.editing=this.draft(excerpt);this.hooks.clearSelection();
    $('noteQuote').textContent=this.editing.quote;$('noteText').value=this.editing.note;
    $('noteUnderline').checked=this.editing.underline;$('noteStroke').value=this.editing.stroke||'solid';
    document.querySelector('#noteForm input[name=noteColor][value='+this.editing.color+']').checked=true;
    $('deleteNote').classList.toggle('hidden',!this.existing(excerpt));$('noteError').textContent='';
    $('noteDialog').showModal();$('noteText').focus();
  }
  async saveEditor() {
    if(!this.editing||this.editing.bookId!==this.hooks.state().bookId){$('noteError').textContent='书籍已切换，请重新选择原文。';return}
    const mark={...this.editing,note:$('noteText').value.trim(),underline:$('noteUnderline').checked,stroke:$('noteStroke').value,color:document.querySelector('#noteForm input[name=noteColor]:checked').value};
    if(!mark.note&&!mark.underline){$('noteError').textContent='写一点笔记，或保留划线。';return}
    $('saveNote').disabled=true;
    try{await this.persist(mark);$('noteDialog').close();this.hooks.notify('已保存到这本书的笔记')}catch{$('noteError').textContent='保存失败，请检查浏览器存储空间；输入仍保留。'}finally{$('saveNote').disabled=false}
  }
  async remove(mark) {
    await this.store.remove(mark.id);if(this.bookId===mark.bookId){this.marks=this.marks.filter(m=>m.id!==mark.id);this.paint();$('notesCount').textContent=this.marks.length||''}
  }
  async removeEditing(){if(!this.editing||!confirm('删除这条划线和笔记？'))return;try{await this.remove(this.editing);$('noteDialog').close()}catch{$('noteError').textContent='删除失败，请重试。'}}
  openLibrary(){if(!this.hooks.state().bookId)return;this.hooks.pause();this.hooks.clearSelection();this.renderLibrary();$('notesDialog').showModal()}
  visibleMarks(){const marks=this.marks.filter(m=>this.hooks.visible(m.anchor)&&($('notesColor').value==='all'||m.color===$('notesColor').value));return marks.sort($('notesSort').value==='time'?(a,b)=>b.created-a.created:(a,b)=>(a.page||a.section||0)-(b.page||b.section||0)||a.start-b.start)}
  renderLibrary() {
    const state=this.hooks.state(),visible=this.visibleMarks(),list=$('notesList');list.replaceChildren();
    $('notesBook').textContent=state.name||'';$('notesSummary').textContent=visible.length+' 条划线与笔记'+(this.marks.some(m=>!this.hooks.visible(m.anchor))?' · 较后阅读位置的记录已隐藏':'')+($('notesColor').value!=='all'?' · 按颜色筛选':'');
    if(!visible.length){const p=document.createElement('p');p.className='notes-empty';p.textContent='选中文字，划下一句喜欢的话，或记下你的想法。';list.append(p)}
    for(const mark of visible) {
      const card=document.createElement('article');card.className='note-entry';card.style.setProperty('--annotation-color',COLORS[mark.color]||COLORS.gold);
      const quote=document.createElement('blockquote');quote.textContent=mark.quote;card.append(quote);
      if(mark.note){const note=document.createElement('p');note.className='note-body';note.textContent=mark.note;card.append(note)}
      const actions=document.createElement('div');actions.className='note-entry-actions';
      for(const [label,run] of [['回到原文',async()=>{$('notesDialog').close();try{await this.hooks.jump(mark)}catch{this.hooks.notify('未能定位这条原文；笔记仍保留。')}}],['编辑',()=>this.openEditor(mark)],['分享卡片',()=>shareNoteCard(mark,this.hooks.state().name||'阅读摘记')],['复制',async()=>{await navigator.clipboard.writeText(mark.quote+(mark.note?'\n\n'+mark.note:''));this.hooks.notify('已复制')}],['删除',async()=>{if(confirm('删除这条划线和笔记？')){await this.remove(mark);this.renderLibrary()}}]]) {
        const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=async()=>{try{await run()}catch{this.hooks.notify('操作未完成，请重试')}};actions.append(button);
      }
      card.append(actions);list.append(card);
    }
  }
  hit(doc,x,y) {
    for(const surface of this.surfaces().filter(s=>s.root.ownerDocument===doc))for(const mark of this.marks.filter(m=>m.underline&&sameScope(m,surface))) {
      const range=restoreRange(surface.root,mark);if(range&&[...range.getClientRects()].some(r=>x>=r.left-2&&x<=r.right+2&&y>=r.top-2&&y<=r.bottom+3))return mark;
    }
    return null;
  }
}
