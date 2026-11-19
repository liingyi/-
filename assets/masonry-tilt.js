/* Local pointer lighting and a damped physical spring. Does not capture touch scrolling. */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const selector='.collection-masonry-item';
  const states=new Map();let raf=0,last=0;
  const blocked=()=>reduced.matches||document.hidden||document.body.hasAttribute('data-collection-turn')||!!document.querySelector('dialog[open]');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function wake(){if(!raf){last=0;raf=requestAnimationFrame(frame)}}
  function neutral(s){s.active=false;s.tx=0;s.ty=0;s.tg=0;wake()}
  function clear(s){s.card.classList.remove('has-paper-tilt');s.card.style.removeProperty('transform');s.card.style.removeProperty('will-change');s.picture.style.removeProperty('--reflection-x');s.picture.style.removeProperty('--reflection-y');s.picture.style.removeProperty('--reflection-alpha');states.delete(s.card)}
  function frame(now){
    raf=0;const dt=Math.min((last?now-last:16)/1000,.032);last=now;let moving=false;
    for(const s of states.values()){
      if(!s.card.isConnected){clear(s);continue}
      if(blocked()){clear(s);continue}
      // Semi-implicit integration, substepped for stable release after a dropped frame.
      const steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
      for(let i=0;i<steps;i++)for(const [p,v,t]of [['x','vx','tx'],['y','vy','ty'],['g','vg','tg']]){
        s[v]+=(190*(s[t]-s[p])-20*s[v])*h;s[p]+=s[v]*h;
      }
      s.card.style.transform=`perspective(1000px) rotateX(${s.x.toFixed(3)}deg) rotateY(${s.y.toFixed(3)}deg)`;
      s.picture.style.setProperty('--reflection-x',s.px+'%');s.picture.style.setProperty('--reflection-y',s.py+'%');
      s.picture.style.setProperty('--reflection-alpha',clamp(s.g,0,.25).toFixed(4));
      const settling=Math.abs(s.x-s.tx)+Math.abs(s.y-s.ty)+Math.abs(s.g-s.tg)+Math.abs(s.vx)+Math.abs(s.vy)+Math.abs(s.vg)>.015;
      if(!s.active&&!settling){clear(s);continue}
      if(settling)moving=true;
    }
    if(moving)raf=requestAnimationFrame(frame);
  }
  function aim(event){
    if(blocked()||!event.isPrimary)return;
    const card=event.target.closest?.(selector);if(!card)return;
    let s=states.get(card);
    if(!s){
      const picture=card.querySelector('picture');if(!picture)return;
      // Read resting bounds once, never read a tilted element on every animation frame.
      const rect=card.getBoundingClientRect();
      s={card,picture,rect,x:0,y:0,g:0,vx:0,vy:0,vg:0,tx:0,ty:0,tg:0,px:50,py:50,pointer:event.pointerId,active:true};
      states.set(card,s);card.classList.add('has-paper-tilt');card.style.willChange='transform';
    }
    const x=clamp((event.clientX-s.rect.left)/s.rect.width,0,1),y=clamp((event.clientY-s.rect.top)/s.rect.height,0,1);
    s.active=true;s.pointer=event.pointerId;s.tx=(.5-y)*14;s.ty=(x-.5)*14;s.tg=.2;s.px=x*100;s.py=y*100;wake();
  }
  document.addEventListener('pointerover',event=>{if(event.pointerType!=='touch')aim(event)},{passive:true});
  document.addEventListener('pointermove',event=>{if(event.pointerType!=='touch'||event.buttons)aim(event)},{passive:true});
  document.addEventListener('pointerdown',aim,{passive:true});
  document.addEventListener('pointerout',event=>{const card=event.target.closest?.(selector),s=states.get(card);if(s&&!card.contains(event.relatedTarget))neutral(s)},{passive:true});
  for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{for(const s of states.values())if(s.pointer===event.pointerId)neutral(s)},{passive:true});
  // A fresh rect will be measured on the next interaction after scrolling or resizing.
  const reset=()=>{for(const s of states.values())clear(s);cancelAnimationFrame(raf);raf=0;last=0};
  document.addEventListener('scroll',reset,{capture:true,passive:true});
  for(const type of ['resize','blur','pagehide','hashchange'])addEventListener(type,reset);
  for(const type of ['paper-viewer:open','portfolio-manager:open','visibilitychange'])document.addEventListener(type,reset);
  reduced.addEventListener('change',reset);
})();
