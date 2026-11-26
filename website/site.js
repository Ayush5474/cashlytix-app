
(function(){
var d=document.documentElement,tb=document.getElementById('theme'),saved=null;try{saved=localStorage.getItem('cx-theme')}catch(e){}
d.dataset.theme=saved||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
tb.onclick=function(){var t=d.dataset.theme==='dark'?'light':'dark';d.dataset.theme=t;try{localStorage.setItem('cx-theme',t)}catch(e){}};
var cal=document.getElementById('cal'),heat=[0,1,0,2,1,0,0,2,1,3,0,1,2,0,1,1,0,3,2,1,0,2,1,1,0,2,3,1,0,1,1],h='';
'SMTWTFS'.split('').forEach(function(x){h+='<b>'+x+'</b>'});for(var n=0;n<31;n++)h+='<span class="'+(heat[n]?'h'+heat[n]:'')+'" style="--i:'+n+'">'+(n+1)+'</span>';cal.innerHTML=h;
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);
 e.target.querySelectorAll('[data-count]').forEach(function(el){var to=+el.dataset.count,t0=performance.now();(function f(t){var p=Math.min((t-t0)/1400,1);el.textContent='₹'+Math.round(to*(1-Math.pow(1-p,3))).toLocaleString('en-IN');if(p<1)requestAnimationFrame(f)})(t0)})}})},{threshold:.3});
document.querySelectorAll('.rev').forEach(function(e){io.observe(e)});
var amt=document.getElementById('amt'),sv=document.getElementById('sv'),pad=[].slice.call(document.querySelectorAll('#pad span')),c0=document.getElementById('c0'),save=document.getElementById('save'),toast=document.getElementById('toast');
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
async function loop(){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){amt.textContent='640';sv.textContent='640';c0.classList.add('on');return}
 while(true){amt.textContent='';sv.textContent='0';c0.classList.remove('on');toast.classList.remove('show');await sleep(900);
  for(var ch of ['6','4','0']){var k=pad.find(function(p){return p.textContent===ch});k.classList.add('hit');amt.textContent+=ch;sv.textContent=amt.textContent;await sleep(130);k.classList.remove('hit');await sleep(330)}
  c0.classList.add('on');await sleep(700);save.classList.add('hit');await sleep(160);save.classList.remove('hit');toast.classList.add('show');await sleep(2600)}}
loop();
})();