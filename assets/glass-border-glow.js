/* Local pointer-edge glow for existing liquid-glass surfaces. No React or layout wrappers. */
(() => {
  'use strict';
  const selector=[
    '.site-header','.site-header .identity','.site-header .nav-control',
    '.liquid-surface','.glass-dialog','.glass-action','.quiet-button','.home-info',
    '.photo-controls','.photo-heading .icon-button',
    '.collection-selection','.collection-featured-row',
    '.collection-track-controls button:not(.collection-scrollbar)',
    '.gallery-page .masonry','#directory','#directory .icon-button','#directory .directory-link',
    '.music-panel','.music-capsule','.music-panel .music-button','.music-add',
    '.pm-dialog','.pm-button','.pm-viewer-tools'
  ].join(',');
  const overlay=document.createElement('div');overlay.id='glass-border-glow-layer';
  overlay.setAttribute('popover','manual');overlay.setAttribute('aria-hidden','true');
  document.body.append(overlay);
  const layers=Array.from({length:4},()=>{
    const layer=document.createElement('div');layer.className='glass-border-glow';
    layer.innerHTML='<div class="glass-border-glow-color"><i class="glass-border-glow-ring"></i></div><div class="glass-border-glow-light"></div>';
    overlay.append(layer);return layer;
  });
  const hover=matchMedia('(any-hover: hover)');
  let pointer=null,raf=0,active=[],lastModal=null,disposed=false,followUntil=0;
  function hide(){pointer=null;active=[];layers.forEach(layer=>{layer.removeAttribute('data-lit');layer.style.removeProperty('will-change')});}
  function schedule(){if(!raf&&!disposed&&pointer)raf=requestAnimationFrame(paint);}
  function paint(){
    raf=0;if(!pointer||document.hidden||!hover.matches||document.body.hasAttribute('data-collection-turn')){hide();return;}
    // Hit test ignores the pointer-transparent overlay and follows the current scrolled page.
    let node=document.elementFromPoint(pointer.x,pointer.y),targets=[];
    for(;node;node=node.parentElement){if(node.matches(selector))targets.push(node);if(targets.length===layers.length)break;}
    // Batch every geometry/style read before writing the overlay; page elements are untouched.
    const measurements=targets.map(target=>{
      const rect=target.getBoundingClientRect(),style=getComputedStyle(target);
      const x=pointer.x-rect.left,y=pointer.y-rect.top;
      // Same normalized edge proximity as the official React component.
      const cx=rect.width/2,cy=rect.height/2;
      const proximity=Math.min(1,Math.max(Math.abs(x-cx)/Math.max(1,cx),Math.abs(y-cy)/Math.max(1,cy)));
      return {target,rect,x,y,radius:style.borderRadius,visibility:style.visibility,opacity:+style.opacity,
        strength:Math.max(0,(proximity-.52)/.48),colorStrength:Math.max(0,(proximity-.72)/.28),angle:Math.atan2(y-cy,x-cx)*180/Math.PI+90};
    });
    const modal=[...document.querySelectorAll('dialog[open],.music-panel:popover-open')].at(-1)||null;
    // A newly opened native modal/popover must sit below this non-interactive light layer.
    if(!overlay.matches(':popover-open')||modal!==lastModal){if(overlay.matches(':popover-open'))overlay.hidePopover();overlay.showPopover();lastModal=modal;}
    active=targets;
    layers.forEach((layer,i)=>{
      const m=measurements[i];
      if(!m||m.visibility==='hidden'||m.opacity===0||m.strength<.015||m.rect.width<2||m.rect.height<2){layer.removeAttribute('data-lit');return;}
      layer.dataset.lit='';
      layer.style.width=m.rect.width+'px';layer.style.height=m.rect.height+'px';
      layer.style.transform=`translate3d(${m.rect.left}px,${m.rect.top}px,0)`;
      layer.style.setProperty('--glow-corners',m.radius);
      layer.style.setProperty('--glow-edge',String(m.strength));
      layer.style.setProperty('--glow-color-edge',String(m.colorStrength));
      layer.style.setProperty('--glow-angle',m.angle+'deg');
    });
    if(targets.length&&performance.now()<followUntil)schedule();
  }
  document.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!hover.matches){hide();return;}
    pointer={x:event.clientX,y:event.clientY};followUntil=performance.now()+260;schedule();
  },{passive:true,capture:true});
  document.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')hide();},{passive:true});
  document.documentElement.addEventListener('pointerleave',hide);
  window.addEventListener('blur',hide);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
  document.addEventListener('scroll',schedule,{capture:true,passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  // Observe changes that can hide/move a panel beneath a stationary pointer.
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','data-nav-visible','data-collection-turn']});
  window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();hide();});
  window.GlassBorderGlow={getState:()=>({targets:active.map(n=>n.id||n.className),lit:layers.filter(n=>n.hasAttribute('data-lit')).length,pending:!!raf})};
})();
