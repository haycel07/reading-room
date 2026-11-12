// Shared by browser API transport and the local Codex server. No credentials.
export const PREPARED_BUDGET={version:2,carry:320,carryLimit:320,comment:180,summary:240,memory:900,lookahead:.5};
export const PERSONAS={witty:'机灵、俏皮，适度吐槽；像朋友说话，别尖刻。',gentle:'轻柔、耐心，善于倾听，少吐槽。',curious:'好奇，围绕已读内容一起讨论，不剧透。'};
export const facts='概括只记录书中事实，保留说话者、否定、条件、时序、数值单位和不确定性。称呼或立场变化必须保留前后原词，不能只写“改口”。未交代性别就沿用名字；先后不等于目的或因果。读者与伙伴的解读不能写成书中事实。';
export function conversationInstruction(payload){
 let out='';const c=payload.conversationContext;
 if(c&&typeof c==='object'){
  for(const [key,label] of [['reader','读者观点与手动对话'],['shown','伙伴已展示的评论'],['prepared','尚未展示的预写评论，仅供去重，读者还没看过']])if(Array.isArray(c[key])&&c[key].length)out+='\n<'+label+'>\n'+JSON.stringify(c[key].slice(-2).map(x=>({question:String(x.question||'').slice(0,600),reply:String(x.reply||x.text||'').slice(0,600),quote:String(x.quote||'').slice(0,360)})))+'\n</'+label+'>';
 }
 const ref=payload.reference;if(ref&&typeof ref.quote==='string'&&typeof ref.text==='string')out+='\n<读者正在回复的短评与原句>\n原句：'+ref.quote.slice(0,360)+'\n伙伴当时说：'+ref.text.slice(0,220)+'\n这是伙伴的解读，不是书中事实。\n</读者正在回复的短评与原句>';
 if(Array.isArray(payload.evidence)&&payload.evidence.length)out+='\n<已读原文回查，按原始位置引用>\n'+JSON.stringify(payload.evidence.slice(0,2).map(e=>({start:e.start,end:e.end,quote:String(e.quote||'').slice(0,600)})))+'\n</已读原文回查，按原始位置引用>';
 return out;
}
export function taskInstruction(payload){
 if(payload.task==='prepared-comment'&&payload.selectionVersion===2)return '在标有编号的候选原句中最多选一处愿意和读者聊的话：注意具体动作、措辞、称呼变化、限定条件、证据或例外。小说看细节和语气，非虚构看定义与条件；严肃段落平实回应。只能复述、泛泛评价、重复前评时可以跳过；不因读者没回复而减少下一次选句。只用本次材料，不预告后文。以当前人物口吻说一两句，推测要说明。只输出JSON {"speak":true或false,"candidateId":"候选编号，跳过为null","text":"短评最多180字符，跳过为空串","carry":"仅本区从区起点到本次截止位置的前缀概括，最多320字符"}。无论开口或跳过都更新carry，结合前缀概括与新增原文；不混入前区内容，不复写评论。'+facts;
 if(payload.task==='prepared-comment')return '围绕指定句子写一两句自然短评，不复述整段、不催回复、不预告后文。只输出JSON '+(payload.compact===true?'{"text":"短评，最多180字符","carry":"仅本区从区起点到此评论点的概括，最多320字符"}。carry结合本区前缀概括与新增原文更新，保留人物、因果和未解问题；不混入前区内容，不复写短评。'+facts:'{"text":"短评"}，text不超过180字符。');
 if(payload.task==='region-summary')return (payload.compact===true?'只依据前文概括、本区前缀概括与剩余原文，输出JSON {"summary":"本区概述，最多240字符","memory":"合并前文与本区的累计概括，最多900字符"}。保留关键关系、因果、名字、数字及未解问题，合并重复信息，不补全缺失背景。':'只输出JSON {"summary":"本区概述，最多600字符","memory":"合并前文与本区的累计概括，最多2400字符"}。')+facts;
 if(payload.task==='summary')return '只输出中文概括，最多1200字符，保留人物关系、因果、关键观点与未解问题，不补充未提供内容。'+facts;
 return '自然回复，不添加表演式标签。概括不能冒充原文引语；优先依据本轮引文或已读原文回查讨论具体措辞、数字和因果，找不到原文证据时明确说明能确定到哪里，不补全。';
}
export const isSummaryTask=payload=>['summary','region-summary'].includes(payload.task);
export function outputBudget(payload){return payload.task==='prepared-comment'?1024:payload.task==='region-summary'&&payload.compact===true?2048:payload.task==='summary'?2400:null}
