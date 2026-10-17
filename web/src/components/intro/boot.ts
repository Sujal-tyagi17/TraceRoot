/**
 * Runs in <head> before first paint. Decides once whether the Origin Sequence plays:
 * landing page only (a QR scan to a batch page never waits), first visit of the session,
 * and never for people who prefer reduced motion. Marking the session as seen HERE means
 * React Strict Mode double effects and refreshes can't replay or strand the intro.
 */
export const INTRO_KEY = "traceroot.intro.v2";
/** When the curtain starts to lift; the landing entrance is offset by this much. */
export const LIFT_AT_S = 2.6;

export const INTRO_BOOT = `(function(){try{var d=document.documentElement;
if(location.pathname!=='/')return;
if(sessionStorage.getItem('${INTRO_KEY}')==='1')return;
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
sessionStorage.setItem('${INTRO_KEY}','1');
d.setAttribute('data-intro','play');
d.style.setProperty('--intro-offset','${LIFT_AT_S}s');
}catch(e){}})();`;
