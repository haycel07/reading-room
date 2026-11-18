// A deterministic model substitute for the current and compatibility protocols.
exports.commentFixture=(p,value)=>p.selectionVersion===2?{speak:true,candidateId:p.candidates[0].id,...value}:value;
exports.candidateId=text=>text.match(/〔(?:候选 )?(s\d+)〕/)?.[1];
exports.unlabel=text=>text.replace(/\n〔候选 s\d+〕|〔s\d+〕/g,'');
