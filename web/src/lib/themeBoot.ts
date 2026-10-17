/** Shared by the server layout (boot script) and the client theme hook. Not a client module. */
export const THEME_KEY = "traceroot.theme";

/** Runs in <head> before first paint so the page never flashes the wrong theme. */
export const THEME_BOOT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'system';
var d=p==='dark'||(p==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
var h=document.documentElement;h.classList.toggle('dark',d);h.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

