/* Full-screen, route-aware viewing; the photograph remains intact at every aspect ratio. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const dialog=$('photo-viewer'), area=$('photo-area'), picture=$('photo-image');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let items=[],index=0,token=0,zoomed=false,closing=false,origin=null,swipe=null,lastSwipe=-1000;
  let animation=null, imageAnimation=null, openedAt=-1000;
  let source=null,pendingSource=null,flightToken=0,backdropPress=null,backdropTap=false;
  let pan=null,panClickUntil=0;
  const label=key=>window.Studio?.t(key)||key;
  const currentWork=()=>items[index];
  const rectOf=node=>{
    if(!node?.isConnected)return null;
    const r=node.getBoundingClientRect();
    return r.width>2&&r.height>2?{left:r.left,top:r.top,width:r.width,height:r.height}:null;
  };
  const cardVisual=node=>node?.querySelector('.collection-feature-frame,picture,img')||node;
  const sourceRect=()=>{
    const id=currentWork()?.id;
    if(source?.id===id)return rectOf(cardVisual(source.node))||window.Exhibit?.getWorkRect(id)||source.rect;
    // After A → B, never shrink B back into A's CD or photographic card.
    const target=[...document.querySelectorAll('a[href*="/work/"]')].find(node=>node.getAttribute('href').split('/work/')[1]===id&&rectOf(node));
    return rectOf(cardVisual(target))||window.Exhibit?.getWorkRect(id)||null;
  };
  function resetFlight(){
    window.gsap?.set(picture,{clearProps:'transform,transformOrigin,willChange,visibility'});
    picture.style.transform='';picture.style.transformOrigin='';picture.style.willChange='';picture.style.visibility='';
    picture.style.opacity='';
    dialog.classList.remove('is-flipping');
  }
  function finishFlight(){animation?.progress(1);animation?.kill();animation=null;resetFlight();}
  function flipVars(from,to){
    return {x:from.left-to.left,y:from.top-to.top,scaleX:from.width/to.width,scaleY:from.height/to.height};
  }
  // Remember the exact clicked DOM card without changing the router or its history.
  document.addEventListener('click',event=>{
    if(dialog.open)return;
    const link=event.target.closest?.('a[href*="/work/"],[data-search-work]');
    if(link)pendingSource={node:link,rect:rectOf(cardVisual(link)),id:link.dataset.searchWork||link.getAttribute('href').split('/work/')[1]};
  },true);
  function translate() {
    for (const [id,key] of [['photo-close','closePhoto'],['photo-prev','previous'],['photo-next','next'],['photo-original','original'],['photo-zoom',zoomed?'fit':'zoom']]) {
      $(id).setAttribute('aria-label',label(key));$(id).title=label(key);
    }
    const work=currentWork();
    if (!work) return;
    $('photo-title').textContent=Studio.name(work);
    $('photo-subtitle').textContent=[Studio.getLanguage()==='zh'?work.titleEn:work.title,work.year].filter(Boolean).join(' / ');
    const s=(window.STUDIO_SERIES||[]).find(s=>s.id===work.series);
    $('photo-series').textContent=s?Studio.seriesName(s):label('allPhotos');
    picture.alt=Studio.name(work);
  }
  function zoom(value) {
    endPan();
    zoomed=value;area.classList.toggle('is-zoomed',value);
    $('photo-zoom').setAttribute('aria-pressed',String(value));translate();area.scrollTo(0,0);
    if (value) loadOriginal(token);
  }
  function loadOriginal(request) {
    const work=currentWork();
    if (!work?.original) return;
    const image=new Image();
    image.onload=()=>{if(dialog.open&&!closing&&request===token){picture.src=image.src;}};
    image.src=work.large||work.original;
  }
  function select(next) {
    if(dialog.classList.contains('is-flipping')){flightToken++;finishFlight();}
    const oldIndex=index, previousId=currentWork()?.id;
    const request=++token;
    index=(next%items.length+items.length)%items.length;
    const work=currentWork();zoom(false);translate();
    $('photo-counter').textContent=String(index+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');
    $('photo-prev').disabled=$('photo-next').disabled=items.length<2;
    $('photo-original').href=work.original||work.image||work.thumb;
    $('photo-error').hidden=true;picture.hidden=false;picture.src=work.image||work.thumb;
    const medium=new Image();
    medium.onload=()=>{
      if(dialog.open&&!closing&&request===token){picture.src=medium.src;loadOriginal(request);}
    };
    medium.onerror=()=>{if(request===token)loadOriginal(request);};
    medium.src=work.image||work.thumb;
    if (previousId && previousId!==work.id && window.gsap && !reduced.matches) {
      imageAnimation?.kill();
      picture.style.opacity='';
      imageAnimation=gsap.fromTo(picture,{x:next>=oldIndex?14:-14},{x:0,duration:.45,ease:'power3.out',clearProps:'transform'});
    }
  }
  async function open(list,next,point) {
    if(!list.length)return;
    const wasOpen=dialog.open;
    const changed=!wasOpen||currentWork()?.id!==list[next]?.id;
    items=list.slice();
    if (!wasOpen) {
      closing=false;origin=document.activeElement;openedAt=performance.now();
      source=point?.rect?{rect:point.rect,sheetIndex:point.sheetIndex,id:list[next]?.id}
        :pendingSource?.id===list[next]?.id?pendingSource
        :{rect:window.Exhibit?.getWorkRect(list[next]?.id),id:list[next]?.id};
      pendingSource=null;
      dialog.style.setProperty('--viewer-shade',reduced.matches?'1':'0');
      dialog.showModal();document.dispatchEvent(new Event('paper-viewer:open'));
    }
    if(changed)select(next);
    if(!wasOpen){
      animation?.kill();imageAnimation?.kill();
      if(window.gsap&&!reduced.matches){
        const request=++flightToken;
        picture.style.visibility='hidden';
        try{await picture.decode()}catch{}
        await new Promise(resolve=>requestAnimationFrame(resolve));
        if(request!==flightToken||closing||!dialog.open)return;
        const end=rectOf(picture),start=sourceRect();
        picture.style.visibility='';dialog.classList.add('is-flipping');picture.style.willChange='transform';
        animation=gsap.timeline({onComplete:resetFlight});
        animation.to(dialog,{'--viewer-shade':1,duration:.28,ease:'power2.out'},0);
        if(start&&end){
          animation.fromTo(picture,{...flipVars(start,end),transformOrigin:'0 0'},{x:0,y:0,scaleX:1,scaleY:1,duration:.34,ease:'power3.out',clearProps:'transform,transformOrigin,willChange'},0);
        }else{
          animation.fromTo(picture,{scale:.94,transformOrigin:'50% 50%'},{scale:1,duration:.28,ease:'power3.out',clearProps:'transform,transformOrigin,willChange'},0);
        }
      }else dialog.style.setProperty('--viewer-shade','1');
      $('photo-close').focus({preventScroll:true});
    }
  }
  async function hide() {
    if(!dialog.open||closing)return;
    closing=true;token++;flightToken++;endPan();
    // Capture the visible zoom/pan/flight before cancelling. Do not first fit the photo.
    const start=rectOf(picture),end=sourceRect(),savedStyle=picture.getAttribute('style');
    animation?.kill();animation=null;imageAnimation?.kill();
    if(start){
      dialog.append(picture);
      Object.assign(picture.style,{position:'fixed',left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px',maxWidth:'none',maxHeight:'none',margin:'0',objectFit:'contain',zIndex:'1',transform:'none',transformOrigin:'0 0',visibility:'visible'});
      window.gsap?.set(picture,{x:0,y:0,scaleX:1,scaleY:1});
    }
    if(window.gsap&&!reduced.matches)await new Promise(resolve=>{
      dialog.classList.add('is-flipping');picture.style.willChange='transform';
      animation=gsap.timeline({onComplete:resolve});
      if(start&&end&&end.top<innerHeight&&end.top+end.height>0&&end.left<innerWidth&&end.left+end.width>0){
        animation.to(picture,{...flipVars(end,start),transformOrigin:'0 0',duration:.28,ease:'power3.inOut'},0);
      }else animation.to(picture,{scale:.94,duration:.24,ease:'power2.out'},0);
      animation.to(dialog,{'--viewer-shade':0,duration:.28,ease:'power2.inOut'},0);
    });
    animation?.kill();animation=null;
    area.append(picture);if(savedStyle===null)picture.removeAttribute('style');else picture.setAttribute('style',savedStyle);
    zoom(false);resetFlight();
    dialog.close();dialog.style.opacity='';dialog.style.clipPath='';dialog.style.removeProperty('--viewer-shade');closing=false;source=null;
    if(origin?.isConnected)origin.focus({preventScroll:true});
    document.dispatchEvent(new Event('paper-viewer:close'));
  }
  function step(direction){if(items.length>1&&!closing){flightToken++;finishFlight();Studio.openWork(items[(index+direction+items.length)%items.length].id,true);}}
  // Pan the existing zoomed scroll surface; do not transform or resample the photo.
  function endPan(event){
    if(!pan||(event&&event.pointerId!==pan.id))return;
    const active=pan;pan=null;
    if(active.moved)panClickUntil=performance.now()+400;
    area.classList.remove('is-panning');
    if(picture.hasPointerCapture(active.id))picture.releasePointerCapture(active.id);
  }
  picture.addEventListener('pointerdown',event=>{
    if(!zoomed||closing||!event.isPrimary||event.button!==0)return;
    pan={id:event.pointerId,x:event.clientX,y:event.clientY,left:area.scrollLeft,top:area.scrollTop,moved:false};
    picture.setPointerCapture(event.pointerId);area.classList.add('is-panning');
  });
  picture.addEventListener('pointermove',event=>{
    if(!pan||event.pointerId!==pan.id)return;
    const dx=event.clientX-pan.x,dy=event.clientY-pan.y;
    if(!pan.moved&&Math.hypot(dx,dy)<4)return;
    pan.moved=true;
    area.scrollLeft=pan.left-dx;area.scrollTop=pan.top-dy;
  });
  picture.addEventListener('pointerup',endPan);
  picture.addEventListener('pointercancel',endPan);
  picture.addEventListener('lostpointercapture',endPan);
  window.addEventListener('blur',()=>endPan());
  $('photo-close').addEventListener('click',()=>Studio.closeWork());
  $('photo-return').addEventListener('click',()=>Studio.closeWork());
  dialog.addEventListener('cancel',event=>{event.preventDefault();Studio.closeWork();});
  $('photo-prev').addEventListener('click',()=>step(-1));$('photo-next').addEventListener('click',()=>step(1));
  $('photo-zoom').addEventListener('click',()=>zoom(!zoomed));
  picture.addEventListener('click',()=>{if(performance.now()>panClickUntil&&performance.now()-openedAt>450&&performance.now()-lastSwipe>500)zoom(!zoomed);});
  picture.addEventListener('load',()=>{if(dialog.open&&picture.naturalWidth){picture.hidden=false;$('photo-error').hidden=true;}});
  picture.addEventListener('error',()=>{if(dialog.open&&!picture.naturalWidth){picture.hidden=true;$('photo-error').hidden=false;}});
  // Consume only viewer-backdrop presses before the global blank-space navigation.
  // Image swipes, buttons and every non-viewer page keep their existing input paths.
  const isBackdrop=target=>target===area||target===dialog;
  window.addEventListener('pointerdown',event=>{
    if(!dialog.open||!isBackdrop(event.target)||!event.isPrimary||event.button!==0)return;
    backdropTap=false;backdropPress={x:event.clientX,y:event.clientY,id:event.pointerId};event.stopPropagation();
  },true);
  window.addEventListener('pointerup',event=>{
    if(!dialog.open||!isBackdrop(event.target)){backdropPress=null;return;}
    const press=backdropPress;backdropPress=null;event.stopPropagation();
    backdropTap=press?.id===event.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)<6;
  },true);
  window.addEventListener('pointercancel',()=>{backdropPress=null;backdropTap=false},true);
  dialog.addEventListener('click',event=>{if(isBackdrop(event.target)&&backdropTap&&!closing){backdropTap=false;Studio.closeWork()}});
  area.addEventListener('pointerdown',event=>{swipe=!zoomed&&event.isPrimary?{x:event.clientX,y:event.clientY}:null;});
  area.addEventListener('pointercancel',()=>{swipe=null;});
  area.addEventListener('pointerup',event=>{
    if(!swipe||zoomed)return;
    const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;swipe=null;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){lastSwipe=performance.now();step(dx<0?1:-1);}
  });
  dialog.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}
  });
  function refresh(list,id){
    const at=list.findIndex(work=>work.id===id);if(at<0)return;
    const previousImage=currentWork()?.image;
    items=list.slice();index=at;translate();
    if(previousImage!==items[index].image)select(index);
    $('photo-original').href=items[index].original||items[index].image;
    $('photo-counter').textContent=String(index+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');
    $('photo-prev').disabled=$('photo-next').disabled=items.length<2;
    document.dispatchEvent(new Event('portfolio:viewer-update'));
  }
  window.StudioViewer={open,hide,translate,refresh,isOpen:()=>dialog.open,getState:()=>({open:dialog.open,index,id:currentWork()?.id,count:items.length,zoomed,closing})};
})();
