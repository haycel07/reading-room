// A seven-row, week-column calendar. Dates and totals come only from saved reading records.
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const atMidnight = value => {const d=new Date(value);d.setHours(0,0,0,0);return d};
const minutes = seconds => Math.floor(Math.max(0, Number(seconds)||0)/60);
const duration = seconds => seconds>0&&seconds<60?'不足 1 分钟':`${minutes(seconds)} 分钟`;

export function calendarDays({now=new Date(),year=null}={}) {
 const today=atMidnight(now),end=year?new Date(year,11,31):today;
 const first=year?new Date(year,0,1):new Date(today.getFullYear(),today.getMonth(),today.getDate()-364);
 const start=new Date(first);start.setDate(start.getDate()-start.getDay());
 const last=new Date(end);last.setDate(last.getDate()+6-last.getDay());
 const result=[];
 for(let date=new Date(start);date<=last;date.setDate(date.getDate()+1)) {
  result.push({key:dayKey(date),date:new Date(date),inRange:date>=first&&date<=end,future:date>today});
 }
 return result;
}

export function renderReadingCalendar({root,summary,list,days,books,perBook,now=new Date()}) {
 const today=dayKey(now),clean={};
 for(const [key,value]of Object.entries(days))if(/^\d{4}-\d{2}-\d{2}$/.test(key)&&Number.isFinite(Number(value))&&Number(value)>0)clean[key]=Number(value);
 const total=Object.values(clean).reduce((a,b)=>a+b,0),activeDays=Object.keys(clean).length;
 summary.replaceChildren();
 for(const [value,label]of [[minutes(clean[today]),'今日阅读 · 分钟'],[minutes(total),'累计阅读 · 分钟'],[activeDays,'有阅读记录的天数']]) {
  const item=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('span');
  strong.textContent=String(value);small.textContent=label;item.append(strong,small);summary.append(item);
 }
 root.replaceChildren();
 const header=document.createElement('div');header.className='calendar-heading';
 const title=document.createElement('h4');title.textContent='阅读足迹';
 const select=document.createElement('select');select.setAttribute('aria-label','阅读记录年份');
 select.add(new Option('最近一年','rolling'));
 const years=new Set([now.getFullYear(),...Object.keys(clean).map(k=>Number(k.slice(0,4)))]);
 for(const y of [...years].filter(y=>y>=2000&&y<=now.getFullYear()).sort((a,b)=>b-a))select.add(new Option(y+' 年',String(y)));
 header.append(title,select);root.append(header);
 const scroller=document.createElement('div');scroller.className='calendar-scroll';
 const chart=document.createElement('div');chart.className='calendar-chart';
 const months=document.createElement('div');months.className='calendar-months';months.setAttribute('aria-hidden','true');
 const weekdays=document.createElement('div');weekdays.className='calendar-weekdays';weekdays.setAttribute('aria-hidden','true');
 for(const text of ['','一','','三','','五','']){const span=document.createElement('span');span.textContent=text;weekdays.append(span)}
 const grid=document.createElement('div');grid.className='calendar-grid';grid.setAttribute('role','grid');grid.setAttribute('aria-label','每日阅读时间，方向键按日期移动，点击查看当天记录');
 chart.append(months,weekdays,grid);scroller.append(chart);root.append(scroller);
 const footer=document.createElement('div');footer.className='calendar-footer';
 const note=document.createElement('span');note.textContent='每天读一点，都算数。';
 const legend=document.createElement('div');legend.className='calendar-legend';legend.append('少');
 for(let i=0;i<5;i++){const cell=document.createElement('i');cell.dataset.level=i;legend.append(cell)}legend.append('多');footer.append(note,legend);root.append(footer);
 const detail=document.createElement('div');detail.className='calendar-day-detail';detail.setAttribute('aria-live','polite');root.append(detail);
 const tooltip=document.createElement('div');tooltip.className='calendar-tooltip';tooltip.id='readingCalendarTooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;root.append(tooltip);
 function showDay(key,selected=true){
  if(selected)for(const button of grid.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.date===key));
  detail.replaceChildren();const b=document.createElement('b');b.textContent=key===today?'今天':key;const span=document.createElement('span');span.textContent='阅读 '+duration(clean[key]||0);detail.append(b,span);
  list.replaceChildren();const entries=books.map(book=>({book,seconds:Number(perBook(book.id)?.[key])||0})).filter(x=>x.seconds>0).sort((a,b)=>b.seconds-a.seconds);
  if(!entries.length){const p=document.createElement('p');p.className='stats-no-record';p.textContent='这一天还没有阅读记录。';list.append(p)}
  for(const {book,seconds}of entries){const row=document.createElement('div');row.className='stats-book-row';const icon=document.createElement('span');icon.className='stats-book-icon';icon.textContent=book.name.slice(0,1);const title=document.createElement('span');title.textContent=book.name.replace(/\.[^.]+$/,'');const time=document.createElement('small');time.textContent=duration(seconds);row.append(icon,title,time);list.append(row)}
 }
 function showTooltip(button){
  tooltip.textContent=button.getAttribute('aria-label');tooltip.hidden=false;
  button.setAttribute('aria-describedby',tooltip.id);
  const rect=button.getBoundingClientRect(),bounds=root.getBoundingClientRect();
  tooltip.style.left=Math.max(8,Math.min(root.clientWidth-tooltip.offsetWidth-8,rect.left-bounds.left-tooltip.offsetWidth/2+6))+'px';
  tooltip.style.top=rect.top-bounds.top-36+'px';
 }
 function draw(){
  grid.replaceChildren();months.replaceChildren();tooltip.hidden=true;
  const dates=calendarDays({now,year:select.value==='rolling'?null:Number(select.value)}),columns=dates.length/7;
  chart.style.setProperty('--calendar-weeks',columns);
  let lastMonth='';
  dates.forEach((entry,index)=>{
   if(index%7===0){const month=entry.date.getMonth();const label=document.createElement('span');label.style.gridColumn=String(index/7+1);if(month!==lastMonth){label.textContent=(month+1)+'月';lastMonth=month}months.append(label)}
   if(!entry.inRange){const blank=document.createElement('span');blank.className='calendar-blank';grid.append(blank);return}
   const seconds=clean[entry.key]||0,button=document.createElement('button');button.type='button';button.dataset.date=entry.key;
   button.dataset.level=seconds>=3600?'4':seconds>=1800?'3':seconds>=600?'2':seconds>0?'1':'0';
   button.disabled=entry.future;button.setAttribute('role','gridcell');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',entry.key+'，'+duration(seconds));button.tabIndex=entry.key===today?0:-1;
   button.onclick=()=>showDay(entry.key);button.onpointerenter=button.onfocus=()=>showTooltip(button);button.onpointerleave=button.onblur=()=>{tooltip.hidden=true;button.removeAttribute('aria-describedby')};grid.append(button);
  });
  const selectedDay=select.value==='rolling'||Number(select.value)===now.getFullYear()?today:select.value+'-12-31';
  if(!grid.querySelector('button[tabindex="0"]'))(grid.querySelector('button[data-date="'+selectedDay+'"]')||grid.querySelector('button:not(:disabled)'))?.setAttribute('tabindex','0');
  requestAnimationFrame(()=>{scroller.scrollLeft=scroller.scrollWidth});showDay(selectedDay);
 }
 grid.addEventListener('keydown',event=>{
  const delta={ArrowUp:-1,ArrowDown:1,ArrowLeft:-7,ArrowRight:7}[event.key];if(!delta)return;
  const cells=[...grid.querySelectorAll('button')],at=cells.indexOf(event.target),next=cells[at+delta];
  if(next&&!next.disabled){event.preventDefault();event.target.tabIndex=-1;next.tabIndex=0;next.focus()}
 });
 select.onchange=draw;draw();
}
