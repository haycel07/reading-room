// Local Codex configuration, without credentials. Chosen from the short-text
// measurements recorded in tests/model-latency-results.json, not a speed SLA.
const model='gpt-6.1-terra';
const reasoningEffort='low';
function codexArgs(){return ['exec','--skip-git-repo-check','--ephemeral','--ignore-user-config','--model',model,'-c',`model_reasoning_effort="${reasoningEffort}"`,'-s','read-only','-']}
module.exports={model,reasoningEffort,label:'GPT-6.1 Terra · 低推理',codexArgs};
