// A single motion vocabulary for CSS and JavaScript. Text is never stretched.
export const MOTION_PROFILES = Object.freeze({
  standard: Object.freeze({panel:220,exit:160,notice:150,tab:160,book:220,feedback:90,layout:200,disclosure:180,shift:8,bookShift:10}),
  gentle: Object.freeze({panel:240,exit:180,notice:160,tab:180,book:230,feedback:100,layout:220,disclosure:200,shift:3,bookShift:4}),
  off: Object.freeze({panel:0,exit:0,notice:0,tab:0,book:0,feedback:0,layout:0,disclosure:0,shift:0,bookShift:0}),
});
export function motionProfile(mode='standard', reduced=false) {
  return MOTION_PROFILES[reduced?'off':mode] || MOTION_PROFILES.standard;
}
export function currentMotionProfile() {
  return motionProfile(globalThis.document?.documentElement.dataset.motionMode,
    typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
}
export function applyMotionTokens(root, mode) {
  const profile=motionProfile(mode);
  for(const name of ['panel','exit','notice','tab','book','feedback','layout','disclosure'])
    root.style.setProperty('--motion-'+name,profile[name]+'ms');
  root.style.setProperty('--motion-duration',profile.panel+'ms');
  root.style.setProperty('--motion-shift',profile.shift+'px');
  root.style.setProperty('--motion-ease','cubic-bezier(.2,0,0,1)');
  return profile;
}
export function animateUi(element, keyframes, {kind='panel',persist=false}={}) {
  const profile=currentMotionProfile(),duration=profile[kind]??profile.panel;
  if(!duration)return {finished:Promise.resolve(),cancel(){},readerDuration:0};
  const animation=element.animate(keyframes,{duration,easing:'cubic-bezier(.2,0,0,1)',fill:'both'});
  animation.readerDuration=duration;
  if(!persist)animation.finished.then(()=>animation.cancel(),()=>{});
  return animation;
}
