// Hero phone: tabs swap the screenshot; rotates by itself until the visitor picks one.
(function(){
  var imgs=[].slice.call(document.querySelectorAll('.stage .phone img'));
  var tabs=[].slice.call(document.querySelectorAll('.stage [role=tab]'));
  if(!imgs.length)return;
  var i=0,timer=null,touched=false;
  function show(n){i=n;imgs.forEach(function(im,k){im.classList.toggle('on',k===n)});
    tabs.forEach(function(t,k){t.setAttribute('aria-selected',k===n)});}
  tabs.forEach(function(t,k){t.addEventListener('click',function(){touched=true;clearInterval(timer);show(k)})});
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce)timer=setInterval(function(){if(!touched)show((i+1)%imgs.length)},4200);
  show(0);
})();
