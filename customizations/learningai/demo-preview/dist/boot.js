/* Missing configuration fails closed. Demo is restricted to local preview origins. */
(function(){
 const local = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 window.LAI_MODE = window.LAI_CONFIG?.mode === 'demo' && local ? 'demo' : 'production';
 const load = src => new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.append(s)});
 (async()=>{if(window.LAI_MODE==='demo')await load('demo-accounts.js');await load('site.js')})().catch(()=>{document.getElementById('root').textContent='Preview unavailable. Reload to try again.'});
})();
