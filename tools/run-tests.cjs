// Explicit allowlists keep model calls and historical UI contracts out of npm test.
const {spawn} = require('node:child_process');
const path = require('node:path');
const {createPreviewServer} = require('./preview-server.cjs');
const unit = ['content-selection','token-budget','proactive-server','request-timeout','context-budget'];
const browser = ['onboarding','reading-appearance','companion','token-api','reader-navigation','anx-runtime-ui','companion-bubble','continuous-reading','content-selection-browser','prepared-formats','android-navigation','style-position','shared-motion','api-connection','data-api','annotations','review-security'];
const extended = ['prepared','preparation-resume','summaries','anx-library-notes','anx-features','reading-preferences','mobile-platform'];
async function main() {
  if(process.argv.includes('--live')) throw Error('Live tests are never automatic. See tests/README.md and run an individual test with explicit authorization.');
  if(process.argv.includes('--android')) {require('./test-native-policy.cjs');return;}
  const server=createPreviewServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const suites=process.argv.includes('--unit')?unit:process.argv.includes('--browser')?browser:[...unit,...browser,...(process.argv.includes('--all')?extended:[])];
  let active;
  const stop=()=>{active?.kill();server.closeAllConnections();server.close();};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  try {
    for(const name of suites) {
      console.log('\nTEST '+name);
      const code=await new Promise((resolve,reject)=>{active=spawn(process.execPath,[path.join(__dirname,'../tests',name+'.cjs')],{stdio:'inherit',env:{...process.env,READER_TEST_URL:url}});active.on('error',reject);active.on('exit',resolve);});
      active=null;if(code!==0)throw Error(name+' failed ('+code+')');
    }
    console.log('\nPASS '+suites.length+' isolated suites; no live AI providers');
  } finally {stop();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
