/* Collection index. Local images, finite DOM, infinite compositor-only track. */
(() => {
  'use strict';
  const route='/series';
  const series=window.STUDIO_SERIES||[],works=window.PORTFOLIO_WORKS||[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const lowPower=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
  const mod=(n,m)=>((n%m)+m)%m;
  const wrap=(n,m)=>mod(n+m/2,m)-m/2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const en=()=>window.Studio?.getLanguage()==='en';
  const text=(zh,eng)=>en()?eng:zh;
  const title=s=>en()?s.en:s.zh;
  const deriveCovers=()=>series.map(s=>{
    const pool=works.filter(w=>w.series===s.id);
    const selected=window.PortfolioStore?.getState().covers?.[s.id];
    const work=pool.find(w=>w.id===selected)||pool.find(w=>w.width>=w.height)||pool[0];
    return {series:s,work,src:work?.image||''};
  });
  let current=null,savedIndex=0;
  function render(){
    return `<article class="wrap journey-index loop-collections" aria-labelledby="loop-title">
      <header class="loop-topline"><span>Photography / Collections</span></header>
      <div class="loop-layout"><aside class="loop-directory">
        <div class="loop-heading"><h1 id="loop-title" tabindex="-1">${text('作品分类','The collections.')}</h1><p>${text('五种拍摄方式，同一个关于角色与人物的主题。','Five approaches, connected by characters and portraiture.')}</p></div>
        <nav class="loop-index" aria-label="${text('选择作品分类','Choose a collection')}">${series.map((s,i)=>`<button type="button" data-loop-select="${i}" aria-controls="loop-stage"><small>(${i+1})</small><span class="loop-index-copy"><strong>${esc(title(s))}</strong><em>${esc(en()?s.zh:s.en)}</em></span></button>`).join('')}</nav>
        <div class="loop-selected"><p data-loop-description></p><a data-loop-enter href="#/series/${series[savedIndex]?.id||series[0].id}">${text('浏览本系列','Explore collection')}<span aria-hidden="true">↗</span></a></div>
      </aside><section class="loop-stage" id="loop-stage" tabindex="0" role="region" aria-roledescription="${text('循环作品分类','Looping collections')}" aria-label="${text('滚轮或拖动浏览分类，上下方向键切换，回车进入系列','Scroll or drag to browse; up and down arrows select, Enter opens a collection')}"></section></div>
      <footer class="loop-foot"><span>${text('滚轮 / 拖动浏览 · 点击封面进入系列','Scroll / drag to explore · Select a cover to enter')}</span><span class="loop-foot-output" aria-hidden="true"></span></footer>
      <span class="sr-only" data-loop-status role="status" aria-live="polite" aria-atomic="true"></span>
    </article>`;
  }
  function mount(content){
    teardown();
    const page=content.querySelector('.loop-collections');if(!page)return;
    const covers=deriveCovers();
    const stage=page.querySelector('.loop-stage'),buttons=[...page.querySelectorAll('[data-loop-select]')];
    const description=page.querySelector('[data-loop-description]'),enter=page.querySelector('[data-loop-enter]');
    const status=page.querySelector('[data-loop-status]'),counter=page.querySelector('.loop-foot-output');
    const abort=new AbortController(),signal=abort.signal;
    let economy=lowPower||reduced.matches,count=series.length*(economy?1:2);
    const soft=false;
    const hero=document.createElement('a');hero.className='loop-hero';
    hero.innerHTML='<picture><img alt="" draggable="false" decoding="async"></picture>';
    stage.append(hero);
    const heroPicture=hero.querySelector('picture'),heroImage=hero.querySelector('img');
    const arm=document.createElement('span');arm.className='loop-tonearm';arm.setAttribute('aria-hidden','true');stage.append(arm);
    let heroToken=0,heroAnimation=null,heroIndex=-1;
    const angles=series.map(()=>0),spinSpeeds=series.map(()=>0);
    const nodes=Array.from({length:count},(_,i)=>{
      const cover=covers[i%series.length],s=cover.series;
      const card=document.createElement('a');card.className='loop-card';card.href='#/series/'+s.id;
      card.dataset.loopCard=String(i%series.length);card.setAttribute('aria-label',text('浏览','Explore ')+title(s));card.tabIndex=-1;
      // The large rectangular photograph supplies the existing shared-paper origin.
      // Circular labels must not overwrite its readable source bounds.
      card.innerHTML=`<span class="loop-card-number" aria-hidden="true">(${i%series.length+1})</span><span class="loop-card-frame"><span class="loop-disc-spin"><picture>${cover.src?`<img src="${esc(cover.src)}" alt="${esc(title(s))}" draggable="false" decoding="async" fetchpriority="${i===savedIndex?'high':'low'}">`:''}</picture></span></span>`;
      stage.append(card);
      const surface=card.querySelector('.loop-card-frame'),sheen=document.createElement('span');
      sheen.className='loop-disc-sheen';sheen.setAttribute('aria-hidden','true');surface.append(sheen);
      return {card,surface,sheen,picture:card.querySelector('picture'),rotor:card.querySelector('.loop-disc-spin'),cover,visible:false,index:i};
    });
    function updateHero(index,direction){
      const cover=covers[index],token=++heroToken;
      const commit=()=>{
        if(disposed||token!==heroToken)return;
        heroAnimation?.cancel();hero.href='#/series/'+cover.series.id;
        heroImage.src=cover.src;heroImage.alt=title(cover.series);
        if(cover.work)heroPicture.dataset.paperDestination=cover.work.id;
        else heroPicture.removeAttribute('data-paper-destination');
        hero.dataset.series=cover.series.id;
        if(heroIndex!==-1&&!reduced.matches)heroAnimation=heroPicture.animate([
          {transform:`translate3d(0,${direction*22}px,0) scale(1.015)`},{transform:'translate3d(0,0,0) scale(1)'}
        ],{duration:300,easing:'cubic-bezier(.22,1,.36,1)'});
        heroIndex=index;
      };
      if(heroIndex===-1){commit();return;}
      const preload=new Image();preload.src=cover.src;
      preload.decode().then(commit).catch(commit);
    }
    const canSpin=()=>!reduced.matches&&!document.hidden&&!document.querySelector('dialog[open],.pm-dialog[open]')&&document.getElementById('motion-toggle')?.getAttribute('aria-pressed')!=='true';
    let position=0,target=0,step=1,total=1,height=0,cardHeight=0,arcRadius=1,active=-1;
    let raf=0,lastFrame=0,lastInput=0,velocity=0,positionV=0,mode='idle',drag=null,suppressClickUntil=0,disposed=false,measurePending=true;
    let renderedFrames=0,frameSamples=[],sampleTime=0;
    let budgetFrames=0,slowFrames=0,reduceAtRest=false;
    const trailingTilts=[];
    const tilt={node:null,x:0,y:0,vx:0,vy:0,tx:0,ty:0,glow:0,targetGlow:0};
    function resetTilt(immediate=false){
      tilt.tx=tilt.ty=tilt.targetGlow=0;
      if(immediate&&tilt.node){
        tilt.x=tilt.y=tilt.vx=tilt.vy=tilt.glow=0;
        tilt.node.surface.style.transform='';tilt.node.surface.style.willChange='';
        tilt.node.sheen.style.opacity='0';tilt.node=null;
      }
    }
    function pointTilt(event){
      if(reduced.matches)return;
      const card=event.target.closest('.loop-card');
      const node=nodes.find(n=>n.card===card&&n.visible&&n.card.tabIndex===0);
      if(!node){resetTilt();wake();return;}
      // Read the unchanged track wrapper, so feedback cannot distort its own hit coordinates.
      const rect=card.getBoundingClientRect();
      const x=clamp((event.clientX-rect.left)/rect.width,0,1),y=clamp((event.clientY-rect.top)/rect.height,0,1);
      if(Math.hypot(x-.5,y-.5)>.52){resetTilt();wake();return;}
      if(tilt.node!==node){
        if(tilt.node)trailingTilts.push({...tilt,tx:0,ty:0,targetGlow:0});
        Object.assign(tilt,{node,x:0,y:0,vx:0,vy:0,tx:0,ty:0,glow:0,targetGlow:0});
      }
      tilt.tx=-(y-.5)*16;tilt.ty=(x-.5)*20;tilt.targetGlow=1;
      node.sheen.style.setProperty('--disc-light-x',x*100+'%');
      node.sheen.style.setProperty('--disc-light-y',y*100+'%');
      wake();
    }
    function stepTilt(milliseconds){
      const integrate=t=>{
        if(!t.node)return false;
        if(reduced.matches||!t.node.visible){t.x=t.y=t.vx=t.vy=t.glow=t.tx=t.ty=t.targetGlow=0;}
        if(t.node.card.tabIndex!==0)t.tx=t.ty=t.targetGlow=0;
        const dt=Math.min(milliseconds/1000,.048),steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
        for(let i=0;i<steps;i++){
          t.vx+=(190*(t.tx-t.x)-22*t.vx)*h;t.x+=t.vx*h;
          t.vy+=(190*(t.ty-t.y)-22*t.vy)*h;t.y+=t.vy*h;
          t.glow+=(t.targetGlow-t.glow)*(1-Math.exp(-h*15));
        }
        if(Math.abs(t.x-t.tx)+Math.abs(t.y-t.ty)+Math.abs(t.vx)+Math.abs(t.vy)<.001){t.x=t.tx;t.y=t.ty;t.vx=t.vy=0;}
        if(Math.abs(t.glow-t.targetGlow)<.0001)t.glow=t.targetGlow;
        t.node.surface.style.transform=`perspective(900px) rotateX(${t.x}deg) rotateY(${t.y}deg)`;
        t.node.sheen.style.opacity=String(t.glow);
        const moving=t.x!==t.tx||t.y!==t.ty||t.vx!==0||t.vy!==0||t.glow!==t.targetGlow;
        t.node.surface.style.willChange=moving?'transform':'';
        if(!moving&&!t.targetGlow){t.node.surface.style.transform='';t.node=null;}
        return moving;
      };
      let moving=integrate(tilt);
      for(let i=trailingTilts.length-1;i>=0;i--){moving=integrate(trailingTilts[i])||moving;if(!trailingTilts[i].node)trailingTilts.splice(i,1);}
      return moving;
    }
    function measure(){
      // One batched read, then fixed dimensions. The animation loop never reads rects.
      const width=stage.clientWidth,newHeight=stage.clientHeight;
      if(!width||!newHeight)return;
      const oldStep=step;
      const compact=matchMedia('(max-width:700px)').matches;
      const cardWidth=Math.max(70,Math.min(width*(compact?.57:.4104),newHeight*.4902,compact?216.6:387.6));
      height=newHeight;cardHeight=cardWidth;
      arcRadius=Math.max(height*.78,cardHeight*1.9);
      step=cardHeight*.96+clamp(height*.018,10,18);total=step*count;
      if(oldStep===1)position=target=savedIndex*step;
      else {position=position/oldStep*step;target=target/oldStep*step;if(drag)drag.start=position;}
      stage.style.setProperty('--loop-card-width',cardWidth+'px');
      stage.style.setProperty('--loop-card-height',cardHeight+'px');
      measurePending=false;
    }
    function select(index){
      if(index===active)return;const previous=active;active=index;savedIndex=index;
      resetTilt();
      updateHero(index,previous<0?1:Math.sign(wrap(index-previous,series.length))||1);
      buttons.forEach((button,i)=>{
        button.classList.toggle('is-active',i===index);
        if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
      });
      const s=series[index];description.textContent=s.subtitle?.[en()?'en':'zh']||'';
      enter.href='#/series/'+s.id;counter.textContent=String(index+1).padStart(2,'0')+' / '+String(series.length).padStart(2,'0');
    }
    function paint(){
      if(!height)return;
      const centered=Math.round(position/step),index=mod(centered,series.length);
      select(index);
      for(const node of nodes){
        const distance=wrap(node.index*step-position,total);
        const angle=distance/arcRadius;
        const arcY=Math.sin(angle)*arcRadius,arcX=(Math.cos(angle)-1)*arcRadius;
        // Only the front-facing arc is shown; cyclic recycling happens offscreen.
        const visible=Math.abs(angle)<Math.PI/2&&Math.abs(arcY)<height/2+cardHeight*.6;
        if(visible!==node.visible){
          node.visible=visible;node.card.style.visibility=visible?'visible':'hidden';
          node.card.setAttribute('aria-hidden',String(!visible));
          if(!visible){node.card.style.willChange='';node.picture.style.willChange='';}
        }
        if(!visible)continue;
        const proximity=clamp(1-Math.abs(distance)/step,0,1);
        const focus=proximity*proximity*(3-2*proximity);
        const scale=.82+.18*focus,opacity=.5+.5*focus;
        node.card.style.transform=`translate3d(${arcX}px,${height/2-cardHeight/2+arcY}px,0) scale(${scale})`;
        node.card.style.opacity=String(opacity);
        node.rotor.style.transform=`rotate(${angles[node.index%series.length]}rad)`;
        // Layer order is a discrete selection state, never a per-pixel animation.
        node.card.style.zIndex=Math.abs(distance)<step*.5?'2':'1';
        node.card.tabIndex=Math.abs(distance)<step*.5?0:-1;
        if(soft)node.picture.style.opacity=economy||reduced.matches?'1':String(focus);
        node.card.style.willChange=mode==='idle'?'':'transform, opacity';
        node.picture.style.willChange=soft&&!economy&&mode!=='idle'?'opacity':'';
      }
      renderedFrames++;
    }
    function wake(){if(!raf&&!disposed&&!document.hidden){lastFrame=0;sampleTime=0;raf=requestAnimationFrame(frame);}}
    function finish(){
      mode='idle';velocity=0;positionV=0;
      // Change quality only at rest: replacing identical cyclic copies is invisible.
      if(reduceAtRest&&!economy){
        economy=true;count=series.length;total=step*count;
        if(nodes.slice(count).some(n=>n.card.contains(document.activeElement)))stage.focus({preventScroll:true});
        nodes.splice(count).forEach(n=>n.card.remove());
        nodes.forEach(n=>n.card.querySelector('.loop-card-soft')?.remove());
        position=target=mod(position,total);reduceAtRest=false;
      }
      status.textContent=title(series[active])+' · '+text('点击封面或回车进入系列','Select the cover or press Enter to open');
      paint();
    }
    function frame(now){
      raf=0;if(disposed||document.hidden)return;
      if(sampleTime&&mode!=='idle'){frameSamples.push(now-sampleTime);if(frameSamples.length>240)frameSamples.shift();}sampleTime=now;
      const dt=lastFrame?Math.min(48,now-lastFrame):16.67;lastFrame=now;
      const tiltMoving=stepTilt(dt);
      const spinningAllowed=canSpin();
      for(let i=0;i<series.length;i++){
        const desired=spinningAllowed&&mode==='idle'&&i===active?1:0;
        spinSpeeds[i]=spinningAllowed?spinSpeeds[i]+(desired-spinSpeeds[i])*(1-Math.exp(-dt/180)):0;
        if(Math.abs(spinSpeeds[i]-desired)<.001)spinSpeeds[i]=desired;
        if(spinSpeeds[i])angles[i]=(angles[i]+dt*.00032*spinSpeeds[i])%(Math.PI*2);
      }
      arm.classList.toggle('is-lifted',mode!=='idle');
      if(!economy&&mode!=='idle'&&mode!=='drag'){
        budgetFrames++;if(dt>24)slowFrames++;
        if(budgetFrames>=36){if(slowFrames>=6)reduceAtRest=true;budgetFrames=slowFrames=0;}
      }
      if(measurePending){measure();paint();}
      if(mode==='idle'){
        // At rest only update the selected rotor; do not rewrite the entire track.
        for(const node of nodes)if(node.visible&&spinSpeeds[node.index%series.length])node.rotor.style.transform=`rotate(${angles[node.index%series.length]}rad)`;
        if(canSpin()||tiltMoving)raf=requestAnimationFrame(frame);
        return;
      }
      if(mode==='inertia'){
        const decay=Math.exp(-dt/165);target+=velocity*165*(1-decay);velocity*=decay;
        if(Math.abs(velocity)<.055){mode='snap';target=Math.round(target/step)*step;}
      }else if(mode==='wheel'&&now-lastInput>150){mode='snap';target=Math.round(target/step)*step;}
      if(mode==='drag'){position=target;positionV=velocity;}
      else if(reduced.matches){position=target;positionV=0;}
      else {
        const w=.022,offset=position-target,c=positionV+w*offset,e=Math.exp(-w*dt);
        position=target+(offset+c*dt)*e;positionV=(positionV-w*c*dt)*e;
      }
      // Normalize both ends together, without touching the DOM order or layout.
      if(Math.abs(position)>total*2){const shift=Math.trunc(position/total)*total;position-=shift;target-=shift;if(drag)drag.start-=shift;}
      if(!drag&&mode!=='wheel'&&mode!=='inertia'&&Math.abs(target-position)<.025&&Math.abs(positionV)<.001){position=target;finish();if(canSpin()||tiltMoving)raf=requestAnimationFrame(frame);return;}
      paint();
      if((mode!=='idle'&&mode!=='drag')||tiltMoving)raf=requestAnimationFrame(frame);
    }
    function go(index){
      if(disposed)return;
      resetTilt();
      const nearest=Math.round(target/step);
      let delta=wrap(index-mod(nearest,series.length),series.length);
      target=(nearest+delta)*step;velocity=0;mode='snap';wake();
    }
    function wheel(event){
      if(event.ctrlKey||drag||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
      event.preventDefault();event.stopPropagation();
      resetTilt();
      const delta=event.deltaY*(event.deltaMode===1?18:event.deltaMode===2?height:1);
      velocity=0;target+=clamp(delta,-step*2,step*2);lastInput=performance.now();mode='wheel';wake();
    }
    function endDrag(event,cancel=false){
      if(!drag||(event&&event.pointerId!==drag.id))return;
      const end=drag;drag=null;stage.classList.remove('is-dragging');
      if(end.intent==='tilt'||!end.moved)velocity=positionV=0;
      resetTilt();
      if(end.capture.hasPointerCapture(end.id))end.capture.releasePointerCapture(end.id);
      if(end.moved)suppressClickUntil=performance.now()+450;
      if(cancel||end.intent==='tilt'||!end.moved||performance.now()-end.last>100||reduced.matches){velocity=positionV=0;mode='snap';target=Math.round(target/step)*step;}
      else mode='inertia';
      wake();
    }
    function stop(){
      resetTilt();
      if(drag)endDrag(null,true);cancelAnimationFrame(raf);raf=0;target=position;finish();
    }
    stage.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0||drag)return;
      velocity=0;target=position;mode='drag';
      const capture=event.target.closest('.loop-card,.loop-hero')||stage;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,start:position,lastY:event.clientY,last:performance.now(),moved:false,capture,disc:capture.matches('.loop-card[tabindex="0"]'),intent:null};
      if(drag.disc)pointTilt(event);
      capture.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');wake();
    },{signal});
    stage.addEventListener('pointermove',event=>{
      if(!drag){if(event.pointerType==='mouse')pointTilt(event);return;}
      if(event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.intent&&Math.hypot(dx,dy)>5)drag.intent=drag.disc&&Math.abs(dx)>Math.abs(dy)*1.2?'tilt':'scroll';
      if(drag.intent==='tilt'){drag.moved=true;pointTilt(event);return;}
      if(!drag.intent&&drag.disc)pointTilt(event);
      if(drag.intent==='scroll')resetTilt();
      const now=performance.now(),delta=drag.lastY-event.clientY,dt=Math.max(1,now-drag.last);
      if(!drag.moved&&Math.abs(event.clientY-drag.y)<5)return;
      drag.moved=true;target=drag.start+drag.y-event.clientY;
      velocity=clamp(velocity*.3+(delta/dt)*.7,-2.8,2.8);
      drag.lastY=event.clientY;drag.last=now;wake();
    },{signal});
    stage.addEventListener('pointerup',event=>endDrag(event),{signal});
    stage.addEventListener('pointercancel',event=>endDrag(event,true),{signal});
    stage.addEventListener('lostpointercapture',event=>endDrag(event,true),{signal});
    stage.addEventListener('pointerleave',()=>{if(!drag){resetTilt();wake();}},{signal});
    stage.addEventListener('click',event=>{
      if(performance.now()<suppressClickUntil){event.preventDefault();event.stopPropagation();return;}
      if(event.target.closest('.loop-card,.loop-hero'))stop();
    },{capture:true,signal});
    stage.addEventListener('dragstart',event=>event.preventDefault(),{signal});
    page.addEventListener('wheel',wheel,{passive:false,signal});
    buttons.forEach((button,i)=>button.addEventListener('click',()=>go(i),{signal}));
    page.addEventListener('keydown',event=>{
      if(event.target.closest('input,select,textarea'))return;
      if(['ArrowDown','ArrowUp','PageDown','PageUp'].includes(event.key)){
        event.preventDefault();go(mod(Math.round(target/step)+(event.key==='ArrowDown'||event.key==='PageDown'?1:-1),series.length));
      }else if(event.key==='Home'||event.key==='End'){
        event.preventDefault();go(event.key==='Home'?0:series.length-1);
      }else if(event.key==='Enter'&&event.target===stage){event.preventDefault();Studio.navigate('/series/'+series[active].id);}
    },{signal});
    window.addEventListener('blur',()=>{resetTilt();if(drag)endDrag(null,true);wake()},{signal});
    reduced.addEventListener('change',()=>{
      if(drag)endDrag(null,true);velocity=0;mode='snap';target=Math.round(target/step)*step;wake();
    },{signal});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)stop();else {measurePending=true;wake();}
    },{signal});
    // Modal tools are unchanged; only suspend this index's pending input.
    document.addEventListener('paper-viewer:open',stop,{signal});
    document.getElementById('motion-toggle')?.addEventListener('click',wake,{signal});
    const observer=new ResizeObserver(()=>{measurePending=true;wake();});observer.observe(stage);
    const modalObserver=new MutationObserver(()=>{if(document.querySelector('dialog[open]'))stop();else wake();});
    modalObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
    const ready=Promise.all(nodes.slice(0,series.length).map(n=>n.card.querySelector('picture img')?.decode().catch(()=>{})));
    measure();paint();ready.then(()=>{if(!disposed)wake();});
    current={
      stop,go,
      selectSeries:id=>go(series.findIndex(s=>s.id===id)),
      getTiltState:()=>({x:tilt.x,y:tilt.y,glow:tilt.glow,targetX:tilt.tx,targetY:tilt.ty,active:tilt.node?.index??null}),
      getState:()=>({active,series:series[active]?.id,position,target,positionV,spinSpeeds:spinSpeeds.slice(),step,total,mode,settled:mode==='idle',lowPower,economy,clones:count-series.length,cards:count,visible:nodes.filter(n=>n.visible).length,renderedFrames,frames:frameSamples.slice(),width:stage.clientWidth,height}),
      destroy(){resetTilt(true);savedIndex=active<0?0:active;disposed=true;heroToken++;heroAnimation?.cancel();cancelAnimationFrame(raf);if(drag){const d=drag;drag=null;if(d.capture.hasPointerCapture(d.id))d.capture.releasePointerCapture(d.id);}abort.abort();observer.disconnect();modalObserver.disconnect();nodes.forEach(n=>{n.card.style.willChange='';n.picture.style.willChange='';});}
    };
  }
  function teardown(){current?.destroy();current=null;}
  window.addEventListener('pagehide',teardown);
  window.LoopCollections={route,render,mount,teardown,isRoute:base=>base===route||base==='/series-loop',getState:()=>current?.getState()||null,getTiltState:()=>current?.getTiltState()||null,selectSeries:id=>{savedIndex=Math.max(0,series.findIndex(s=>s.id===id));current?.selectSeries(id)}};
})();
