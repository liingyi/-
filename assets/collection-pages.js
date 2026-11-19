/* Category-only exhibition layout, featured rail and paper-to-masonry transitions. */
(() => {
  'use strict';
  const works=window.PORTFOLIO_WORKS||[],series=window.STUDIO_SERIES||[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const dimensions=new Map(works.filter(w=>w.width&&w.height).map(w=>[w.id,{width:w.width,height:w.height}])),loads=new Map(),decodedImages=new Map(),sharedPapers=new Map();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const en=()=>window.Studio?.getLanguage()==='en';
  const t=(zh,eng)=>en()?eng:zh;
  const local=value=>typeof value==='string'?value:value?.[en()?'en':'zh']||value?.zh||'';
  const name=work=>en()?work.titleEn||work.title:work.title||work.titleEn;
  const isRoute=base=>/^\/series\/[^/]+$/.test(base)&&series.some(s=>s.id===base.split('/')[2]);
  let cleanup=null,currentTransition=null,lastTransition=null,transitionEpoch=0;
  const imageReady=work=>{
    if(loads.has(work.id))return loads.get(work.id);
    const promise=new Promise(resolve=>{const img=new Image();img.decoding='async';img.onload=async()=>{try{await img.decode()}catch{}dimensions.set(work.id,{width:img.naturalWidth,height:img.naturalHeight});decodedImages.set(work.id,img);resolve()};img.onerror=resolve;img.src=work.image;});
    loads.set(work.id,promise);return promise;
  };
  works.slice(0,12).forEach(imageReady);
  function picture(work,extra=''){
    const size=dimensions.get(work.id);
    return `<img src="${esc(work.image)}" alt="${esc(name(work))}"${size?` width="${size.width}" height="${size.height}"`:''} decoding="async" ${extra}>`;
  }
  function render(id){
    const s=series.find(s=>s.id===id);if(!s)return '';
    const items=works.filter(w=>w.series===id),next=series[(series.indexOf(s)+1)%series.length];
    // Imported photographs use their real counts and original aspect ratios.
    const featured=items.filter(w=>w.featured===true).sort((a,b)=>(a.featuredOrder??0)-(b.featuredOrder??0));
    const featuredIds=new Set(featured.map(w=>w.id));
    const photographs=items.filter(w=>!featuredIds.has(w.id));
    const ratio=work=>{const size=work.width&&work.height?work:dimensions.get(work.id);return size?size.width/size.height:1.5};
    const author=esc(local(window.PORTFOLIO_SITE?.name)||'零壹');
    const base='/series/'+id,title=en()?s.en:s.zh;
    const open=(work,cls,body)=>`<a class="${cls}" style="--collection-ratio:${ratio(work)}" href="#${base}/work/${esc(work.id)}" data-collection-work="${esc(work.id)}" aria-label="${esc(t('查看 ','View ')+name(work))}">${body}</a>`;
    return `<article class="wrap collection-page" data-collection="${id}">
      <div class="collection-breadcrumb"><a href="#/series">← ${t('返回分类目录','All collections')}</a><span>Series ${s.number} / 05</span></div>
      <header class="collection-intro" data-collection-reveal><p class="eyebrow">${esc(en()?s.zh:s.en)} / ${esc(local(s.subtitle))}</p><h1 class="collection-title" tabindex="-1">${esc(title)}</h1><p>${esc(local(s.intro))}</p></header>
      <section class="collection-featured" aria-labelledby="collection-featured-title" data-collection-reveal>
        <div class="collection-featured-heading"><p class="eyebrow">${t('作品展示','THE PHOTOGRAPHS')}</p><h2 id="collection-featured-title">${t('精选作品','Selected works.')}</h2><button type="button" class="collection-selection" data-collection-all>${t('零壹精选摄影作品','Photographs selected by 零壹')}<span aria-hidden="true">↓</span></button></div>
        <div class="collection-featured-row">
          <div class="collection-track" id="collection-selected-track" tabindex="0" role="region" aria-label="${t('横向浏览精选作品','Browse selected photographs horizontally')}">${featured.map((w,i)=>open(w,'collection-feature-card',`<div class="collection-feature-frame"><picture data-paper-destination="${esc(w.id)}">${picture(w,i<4?'loading="eager"':'loading="lazy"')}</picture></div><div class="collection-feature-caption"><span>${author}</span><span>${String(i+1).padStart(2,'0')} / ${String(featured.length).padStart(2,'0')}</span></div>` )).join('')}</div>
          <div class="collection-track-controls"><button type="button" data-collection-prev aria-label="${t('上一组作品','Previous photographs')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button><button type="button" class="collection-scrollbar" role="slider" tabindex="0" aria-controls="collection-selected-track" aria-orientation="horizontal" aria-label="${t('精选作品浏览进度','Selected photographs scroll progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i aria-hidden="true"></i></button><button type="button" data-collection-next aria-label="${t('下一组作品','Next photographs')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5 7 7-7 7"/></svg></button></div>
        </div>
      </section>
      <section class="collection-wall" id="collection-wall" aria-labelledby="collection-wall-title"${photographs.length?'':' hidden'}><div class="collection-wall-heading"><h2 id="collection-wall-title">${t('全部作品','All photographs.')}</h2><span>${items.length} ${t('幅作品','photographs')} / ${esc(title)}</span></div><div class="collection-masonry" data-count="${photographs.length}">${photographs.map((w,i)=>open(w,'collection-masonry-item',`<picture data-paper-destination="${esc(w.id)}">${picture(w,i<6?'loading="eager"':'loading="lazy"')}</picture><div class="collection-wall-caption"><span>${author}</span><span>${String(featured.length+i+1).padStart(2,'0')}${w.year?' · '+esc(w.year):''}</span></div>` )).join('')}</div></section>
      <a class="collection-next" href="#/series/${next.id}"><span>${t('下一个分类','Next collection')} / ${next.number}</span><strong>${esc(en()?next.en:next.zh)} ↗</strong></a>
    </article>`;
  }
  function mount(content){
    teardown();const page=content.querySelector('.collection-page');if(!page)return;
    const track=page.querySelector('.collection-track'),bar=page.querySelector('.collection-scrollbar'),thumb=bar.querySelector('i'),prev=page.querySelector('[data-collection-prev]'),next=page.querySelector('[data-collection-next]');
    const featured=page.querySelector('.collection-featured-row');
    let raf=0,drag=null,wheelRaf=0,wheelTarget=0,wheelTime=0;
    const stopWheel=()=>{cancelAnimationFrame(wheelRaf);wheelRaf=0;wheelTime=0;track.classList.remove('is-wheel-scrolling')};
    const wheelFrame=now=>{
      const dt=wheelTime?Math.min(64,now-wheelTime):16;wheelTime=now;
      const distance=wheelTarget-track.scrollLeft;
      if(Math.abs(distance)<2){track.scrollLeft=wheelTarget;stopWheel();return}
      track.scrollLeft+=distance*(1-Math.exp(-dt/65));
      wheelRaf=requestAnimationFrame(wheelFrame);
    };
    const wheel=event=>{
      if(event.ctrlKey||drag||currentTransition?.running)return;
      const max=Math.max(0,track.scrollWidth-track.clientWidth);
      const raw=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      if(!raw||max<=1)return;
      const delta=raw*(event.deltaMode===1?18:event.deltaMode===2?track.clientWidth:1);
      const origin=wheelRaf?wheelTarget:track.scrollLeft;
      const target=Math.max(0,Math.min(max,origin+delta));
      // At either end return the wheel to normal page scrolling.
      if(Math.abs(target-origin)<.1)return;
      event.preventDefault();event.stopPropagation();wheelTarget=target;
      if(reduced.matches){stopWheel();track.scrollLeft=target;return}
      track.classList.add('is-wheel-scrolling');
      if(!wheelRaf)wheelRaf=requestAnimationFrame(wheelFrame);
    };
    const update=()=>{
      raf=0;if(currentTransition?.running)return;
      const max=Math.max(0,track.scrollWidth-track.clientWidth),p=max>1?Math.min(1,Math.max(0,track.scrollLeft/max)):0;
      const fraction=Math.min(1,track.clientWidth/Math.max(1,track.scrollWidth));
      thumb.style.width=(fraction*100)+'%';thumb.style.transform=`translateX(${fraction<1?p*(1-fraction)/fraction*100:0}%)`;
      bar.setAttribute('aria-valuenow',String(Math.round((max>1?p:1)*100)));prev.disabled=max<=1||track.scrollLeft<2;next.disabled=max<=1||track.scrollLeft>=max-2;
      bar.setAttribute('aria-disabled',String(max<=1));
    };
    const scroll=()=>{if(!raf)raf=requestAnimationFrame(update)};
    const step=direction=>{stopWheel();track.scrollBy({left:direction*Math.max(240,track.clientWidth*.85),behavior:reduced.matches?'instant':'smooth'})};
    const key=event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();step(event.key==='ArrowRight'?1:-1)}};
    const previous=()=>step(-1),following=()=>step(1);
    const seek=(clientX)=>{
      if(!drag)return;
      const p=Math.min(1,Math.max(0,(clientX-drag.left-drag.offset)/drag.travel));
      track.scrollLeft=p*drag.max;scroll();
    };
    const dragStart=event=>{
      if(event.button!==0||!event.isPrimary||currentTransition?.running)return;
      const rect=bar.getBoundingClientRect(),handle=thumb.getBoundingClientRect(),max=track.scrollWidth-track.clientWidth;
      if(max<=1||rect.width<=handle.width)return;
      stopWheel();
      event.preventDefault();event.stopPropagation();
      drag={id:event.pointerId,left:rect.left,travel:rect.width-handle.width,max,offset:event.clientX>=handle.left&&event.clientX<=handle.right?event.clientX-handle.left:handle.width/2};
      track.classList.add('is-rail-dragging');bar.classList.add('is-dragging');
      track.scrollTo({left:track.scrollLeft,behavior:'instant'});
      bar.setPointerCapture(event.pointerId);bar.focus({preventScroll:true});seek(event.clientX);
    };
    const dragMove=event=>{if(drag&&event.pointerId===drag.id){event.preventDefault();seek(event.clientX)}};
    const dragEnd=event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const id=drag.id;drag=null;
      if(bar.hasPointerCapture(id))bar.releasePointerCapture(id);
      track.classList.remove('is-rail-dragging');bar.classList.remove('is-dragging');scroll();
    };
    const railKey=event=>{
      const max=Math.max(0,track.scrollWidth-track.clientWidth);
      const steps={ArrowLeft:-.05,ArrowRight:.05,PageUp:-.2,PageDown:.2};
      if(!(event.key in steps)&&event.key!=='Home'&&event.key!=='End')return;
      stopWheel();
      event.preventDefault();event.stopPropagation();
      track.scrollTo({left:event.key==='Home'?0:event.key==='End'?max:track.scrollLeft+steps[event.key]*max,behavior:reduced.matches?'instant':'smooth'});
    };
    const stopClick=event=>event.stopPropagation();
    const all=()=>{const wall=page.querySelector('.collection-wall'),target=wall.hidden?track:wall;content.scrollTo({top:content.scrollTop+target.getBoundingClientRect().top-content.getBoundingClientRect().top-32,behavior:reduced.matches?'instant':'smooth'})};
    track.addEventListener('scroll',scroll,{passive:true});track.addEventListener('keydown',key);prev.addEventListener('click',previous);next.addEventListener('click',following);page.querySelector('[data-collection-all]').addEventListener('click',all);
    bar.addEventListener('pointerdown',dragStart);bar.addEventListener('pointermove',dragMove);bar.addEventListener('pointerup',dragEnd);bar.addEventListener('pointercancel',dragEnd);bar.addEventListener('lostpointercapture',dragEnd);bar.addEventListener('keydown',railKey);bar.addEventListener('click',stopClick);
    const observer=new ResizeObserver(update);observer.observe(track);page.querySelectorAll('img').forEach(img=>{if(!img.complete)img.addEventListener('load',update,{once:true})});update();
    page.addEventListener('collection:turn-rest',update);
    featured.addEventListener('wheel',wheel,{passive:false});
    featured.addEventListener('pointerleave',stopWheel);
    cleanup=()=>{stopWheel();featured.removeEventListener('wheel',wheel);featured.removeEventListener('pointerleave',stopWheel);if(drag)dragEnd({pointerId:drag.id});observer.disconnect();cancelAnimationFrame(raf);track.removeEventListener('scroll',scroll);track.removeEventListener('keydown',key);prev.removeEventListener('click',previous);next.removeEventListener('click',following);bar.removeEventListener('pointerdown',dragStart);bar.removeEventListener('pointermove',dragMove);bar.removeEventListener('pointerup',dragEnd);bar.removeEventListener('pointercancel',dragEnd);bar.removeEventListener('lostpointercapture',dragEnd);bar.removeEventListener('keydown',railKey);bar.removeEventListener('click',stopClick);page.removeEventListener('collection:turn-rest',update)};
  }
  function teardown(){currentTransition?.finish();cleanup?.();cleanup=null;}
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const easing='cubic-bezier(.22,1,.36,1)';
  const profile=()=>{
    const slow=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
    return {lowPower:slow,limit:slow?2:4,duration:slow?760:940,stagger:slow?40:50};
  };
  function sharedPaper(work){
    let node=sharedPapers.get(work.id);
    if(!node){
      node=document.createElement('picture');node.dataset.paperDestination=work.id;
      const image=decodedImages.get(work.id)||new Image();
      image.alt=name(work);if(!image.src)image.src=work.image;
      node.append(image);sharedPapers.set(work.id,node);
    }
    return node;
  }
  function capture(content,id,{initial=false}={}){
    // READ phase: every source is measured before any node is moved or styled.
    const points=window.Exhibit?.getCandidates()||[],sources=new Map();
    const old=content.querySelector('.journey-index');
    const indexRect=old?.getBoundingClientRect();
    for(let i=0;i<works.length;i++){
      const group=points.filter(p=>p.workIndex===i);if(group.length<4)continue;
      const xs=group.map(p=>p.x),ys=group.map(p=>p.y);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const width=Math.max(60,(maxX-minX)/.86),height=Math.max(45,(maxY-minY)/.6);
      let rotation=0;
      if(group.length===21){rotation=Math.atan2(group[19].y-group[1].y,group[19].x-group[1].x)*180/Math.PI;rotation=((rotation+270)%180)-90;}
      sources.set(works[i].id,{x:(minX+maxX-width)/2,y:(minY+maxY-height)/2,width,height,rotation});
    }
    content.querySelectorAll('[data-paper-destination]').forEach(node=>{
      const r=node.getBoundingClientRect();
      sources.set(node.dataset.paperDestination,{x:r.left,y:r.top,width:r.width,height:r.height,rotation:0});
      sharedPapers.set(node.dataset.paperDestination,node);
    });
    content.querySelectorAll('[data-loop-work]').forEach(node=>{
      const picture=node.querySelector('picture'),rect=picture?.getBoundingClientRect();
      if(rect?.width>2&&rect.height>2&&rect.bottom>0&&rect.top<innerHeight)sources.set(node.dataset.loopWork,{x:rect.left,y:rect.top,width:rect.width,height:rect.height,rotation:0});
    });
    // The Composite preview now uses the real React Bits CSS ring. Read its
    // projected card bounds before the existing shared-paper turn starts.
    for(const source of window.CompositeCarousel?.sources()||[])sources.set(source.id,source);
    const from=window.Studio?.getState().base;
    if(initial||reduced.matches||!Element.prototype.animate)return {sources,from,initial:true};
    const config=profile(),pool=works.filter(w=>w.series===id);
    const coverId=window.PortfolioStore?.getState().covers?.[id];
    const cover=pool.find(work=>work.id===coverId&&sources.has(work.id));
    const items=(cover?[cover,...pool.filter(work=>work!==cover)]:pool).slice(0,config.limit);
    window.CompositeCarousel?.beginDeparture();
    // WRITE phase: these are persistent shared picture nodes, not fading ghost copies.
    const layer=document.createElement('div');layer.className='collection-transition';
    layer.dataset.variant=id;layer.setAttribute('aria-hidden','true');
    const departure=document.createElement('div');departure.className='collection-spatial-departure';
    const viewport=document.querySelector('.paper-viewport'),viewportParent=viewport?.parentElement;
    if(old&&indexRect){
      Object.assign(old.style,{position:'absolute',left:indexRect.left+'px',top:indexRect.top+'px',width:indexRect.width+'px',height:indexRect.height+'px',margin:'0'});
      departure.append(old);
    }
    if(viewport){departure.prepend(viewport);}
    const shade=document.createElement('div');shade.className='collection-turn-shade';departure.append(shade);
    layer.append(departure);document.body.append(layer);
    const papers=items.map(work=>{
      const source=sources.get(work.id)||{x:innerWidth*.68,y:innerHeight*.35,width:240,height:150,rotation:0};
      const node=sharedPaper(work);node.classList.add('collection-shared-paper');
      node.style.cssText='width:'+source.width+'px;height:'+source.height+'px;transform:translate3d('+source.x+'px,'+source.y+'px,0) rotate('+source.rotation+'deg)';
      layer.append(node);return {node,work,source};
    });
    document.body.setAttribute('data-collection-turn','');
    window.Exhibit?.setSuspended(true);
    return {sources,from,config,layer,departure,shade,papers,viewport,viewportParent};
  }
  function variantPath(id,source,target,index,short){
    const sx=source.width/Math.max(1,target.width),sy=source.height/Math.max(1,target.height);
    const start={x:source.x,y:source.y,z:0,rx:0,ry:0,rz:source.rotation,sx,sy};
    let mid={x:source.x+(target.x-source.x)*.45,y:source.y+(target.y-source.y)*.4,z:80,rx:0,ry:-12,rz:-4,sx:sx+(1-sx)*.4,sy:sy+(1-sy)*.4};
    if(id==='composite'){
      mid={...mid,x:source.x-65-index*25,y:source.y+32+index*24,z:short?60:160+index*42,ry:index%2?14:-14,rz:index%2?5:-5};
    }else if(id==='white-studio'){
      mid={...mid,x:innerWidth*.5-target.width*mid.sx*.5+(index%2?1:-1)*80,y:target.y-75,z:45,rx:10,ry:index%2?-12:12,rz:index%2?6:-6};
    }else if(id==='event-lighting'){
      mid={...mid,x:(source.x+target.x)*.5,y:target.y-50,z:100,rx:0,ry:index%2?-76:76,rz:-3};
    }else if(id==='outdoor'){
      mid={...mid,x:Math.max(28,target.x-140),y:Math.min(source.y,target.y)-125,z:65,rx:8,ry:-14,rz:index%2?-16:16};
    }else if(id==='interior'){
      mid={...mid,x:target.x+target.width*.25+index*24,y:target.y-35,z:90,rx:-6,ry:index%2?-68:68,rz:2};
    }
    return [start,mid,{x:target.x,y:target.y,z:0,rx:0,ry:0,rz:0,sx:1,sy:1}];
  }
  const transform=p=>'translate3d('+p.x+'px,'+p.y+'px,'+p.z+'px) rotateX('+p.rx+'deg) rotateY('+p.ry+'deg) rotateZ('+p.rz+'deg) scale('+p.sx+','+p.sy+')';
  async function enter(content,snapshot,{initial=false}={}){
    const page=content.querySelector('.collection-page');if(!page)return;
    const epoch=transitionEpoch;
    const id=page.dataset.collection;
    if(initial||snapshot?.initial||reduced.matches||!Element.prototype.animate){
      lastTransition={variant:id,animated:false,reason:initial?'direct-entry':'reduced-motion'};
      return;
    }
    const {layer,departure,shade,papers,config}=snapshot;
    const heading=page.querySelector('.collection-title'),wall=page.querySelector('.collection-wall');
    const section=page.querySelector('.collection-featured'),intro=page.querySelector('.collection-intro');
    const headingBits=[intro];
    // Establish the preparation state before image decoding can yield a painted frame.
    const initialVisibility=page.style.visibility;
    page.style.visibility='hidden';
    // Decode DOM images as well as cached images, then allow one stable layout.
    await Promise.all([...page.querySelectorAll('img')].filter(img=>img.loading!=='lazy').map(img=>img.decode().catch(()=>{})));
    await nextFrame();
    if(epoch!==transitionEpoch){
      page.style.visibility=initialVisibility;
      if(snapshot.viewport&&snapshot.viewportParent)snapshot.viewportParent.prepend(snapshot.viewport);
      snapshot.layer?.remove();return;
    }
    // READ phase: the existing column layout is resolved once. No scrollTop animation.
    const pageRect=page.getBoundingClientRect();
    const targetRecords=papers.map(record=>{
      const slot=page.querySelector('[data-paper-destination="'+record.work.id+'"]');
      return {...record,slot,rect:slot.getBoundingClientRect()};
    });
    const lift=0;
    const sourceBackground=getComputedStyle(document.body).getPropertyValue('--bg').trim();
    const duration=config.duration,stagger=config.stagger;
    const flightDuration=Math.min(config.lowPower?420:530,duration-250-(Math.max(0,papers.length-1)*stagger));
    const landedAt=flightDuration+Math.max(0,papers.length-1)*stagger;
    const animations=[],meta={variant:id,animated:true,engine:'web-animations',duration:duration/1000,stagger:stagger/1000,lowPower:config.lowPower,maxConcurrent:config.limit,from:snapshot.from,flights:[],started:0,landed:false,decoded:true,frames:[],longTasks:[],layoutShifts:[],animationProperties:['transform','opacity'],sharedIdentity:true};
    lastTransition=meta;
    page.style.visibility=initialVisibility;
    const savedStyles=new Map([[page,page.getAttribute('style')],[content,content.getAttribute('style')],[wall,wall.getAttribute('style')],[intro,intro.getAttribute('style')],[section,section.getAttribute('style')]]);
    const previousInert=content.inert;
    const save=node=>{if(!savedStyles.has(node))savedStyles.set(node,node.getAttribute('style'))};
    // WRITE phase: move the same decoded nodes above the turning pages; size once.
    const surface=document.createElement('div');surface.className='collection-spatial-arrival';surface.style.background=sourceBackground;
    layer.insertBefore(surface,departure);
    Object.assign(page.style,{position:'absolute',left:pageRect.left+'px',top:pageRect.top+'px',width:pageRect.width+'px',height:pageRect.height+'px',margin:'0'});
    surface.append(page);
    content.inert=true;content.style.background='transparent';
    page.style.transformOrigin='50% 0';page.style.willChange='transform';
    wall.style.willChange='transform';intro.style.willChange='transform, opacity';section.style.willChange='transform';
    for(const record of targetRecords){
      const {node,slot,rect}=record;save(slot);
      slot.style.visibility='hidden';node.style.width=rect.width+'px';node.style.height=rect.height+'px';
      node.style.willChange='transform';node.style.borderRadius='18px';
      // Every endpoint is frozen; CSS columns never run inside the animation.
      // Every paper goes directly to its final viewing position.
      const target={x:rect.left,y:rect.top+(slot.closest('.collection-wall')?lift:0),width:rect.width,height:rect.height};
      record.path=variantPath(id,record.source,target,meta.flights.length,config.lowPower);
      node.style.transform=transform(record.path[0]);
      meta.flights.push({workId:record.work.id,start:record.path[0],via:record.path[1],end:record.path[2],delay:meta.flights.length*stagger/1000,nodeIdentity:true,targetRect:{x:rect.left,y:rect.top,width:rect.width,height:rect.height}});
    }
    const turnConfigs={
      composite:{rx:8,ry:-14,x:innerWidth*.8,z:-100},
      'white-studio':{rx:10,ry:8,x:innerWidth*.65,z:-70},
      'event-lighting':{rx:8,ry:-18,x:innerWidth*.75,z:-120},
      outdoor:{rx:-8,ry:12,x:innerWidth*.7,z:-80},
      interior:{rx:8,ry:18,x:innerWidth*.7,z:-110}
    };
    const turn=turnConfigs[id],pageTurn='perspective(1400px) translate3d('+turn.x+'px,0,'+turn.z+'px) rotateX('+turn.rx+'deg) rotateY('+turn.ry+'deg) scale(.965)';
    const neutral='perspective(1400px) translate3d(0,0,0) rotateX(0deg) rotateY(0deg) scale(1)';
    const animate=(node,frames,options={})=>{
      // Ease each segment, not the entire clock: holds and stagger retain real timing.
      const animation=node.animate(frames.map(frame=>({easing,...frame})),{duration,easing:'linear',fill:'both',...options});animation.pause();animations.push(animation);return animation;
    };
    // Page surfaces stay opaque. Their geometry carries the transition.
    animate(surface,[{transform:pageTurn},{transform:neutral}],{duration:Math.min(landedAt-40,duration*.5)});
    animate(departure,[{transform:neutral},{transform:'perspective(1400px) translate3d('+(-innerWidth*1.12)+'px,0,-160px) rotateX(8deg) rotateY(-16deg) scale(.96)'}],{duration:duration*.6});
    animate(shade,[{opacity:.04,transform:'scaleX(.7)'},{opacity:.17,transform:'scaleX(1)'},{opacity:0,transform:'scaleX(.9)'}],{duration:duration*.6});
    // Staging: the rail, its frame and its captions enter as one unit with the page.
    // No delayed frame reveal or temporary wall that must be transported a second time.
    meta.featuredSynchronized=true;
    meta.principles=['staging','anticipation','arcs','slow-in-slow-out','overlap','follow-through','timing'];
    for(const node of headingBits){
      save(node);node.style.willChange='transform, opacity';
      animate(node,[{opacity:.001,transform:'translate3d(0,14px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:Math.max(140,duration-landedAt),delay:landedAt});
    }
    for(const [index,record] of targetRecords.entries()){
      const path=record.path,delay=index*stagger,remaining=duration-delay;
      const flightEnd=flightDuration/remaining,holdEnd=(landedAt-delay)/remaining;
      const start=path[0],end=path[2];
      // A small counter-motion builds intent; an arc accelerates into a restrained settle.
      // Photograph proportions remain stable: no squash/stretch applied to the image.
      const prepare={...start,x:start.x-(end.x-start.x)*.012,y:start.y+3,rz:start.rz-.6};
      const settle={...end,y:end.y-1,rz:index%2?.15:-.15};
      const frames=[
        {transform:transform(start),offset:0,easing:'cubic-bezier(.4,0,.7,1)'},
        {transform:transform(prepare),offset:flightEnd*.1,easing:'cubic-bezier(.38,.1,.7,.7)'},
        {transform:transform(path[1]),offset:flightEnd*.45,easing:'cubic-bezier(.25,.25,.55,1)'},
        {transform:transform(settle),offset:flightEnd*.86,easing:'cubic-bezier(.22,1,.36,1)'},
        {transform:transform(end),offset:flightEnd}
      ];
      if(holdEnd>flightEnd+.0001)frames.push({transform:transform(path[2]),offset:holdEnd});
      frames.push({transform:transform({...path[2],y:record.rect.top}),offset:1});
      // Keep the same paper node in the overlay through landing, then adopt it once at rest.
      const a=animate(record.node,frames,{duration:remaining,delay});
      record.animation=a;
      if(id==='event-lighting'){
        const glint=document.createElement('span');glint.className='collection-paper-glint';record.node.append(glint);
        animate(glint,[{opacity:0,transform:'translate3d(-110%,0,0)'},{opacity:.3,transform:'translate3d(0,0,0)'},{opacity:0,transform:'translate3d(110%,0,0)'}],{duration:150,delay:index*stagger+flightDuration*.34});
      }
    }
    const oldContain=content.style.contain;content.style.contain='layout style';
    let frameRaf=0,previousFrame=0,observer;
    const sample=now=>{if(previousFrame)meta.frames.push(now-previousFrame);previousFrame=now;if(now-meta.started>=landedAt&&!meta.landed){meta.landed=true;meta.landedAt=now}if(currentTransition?.running)frameRaf=requestAnimationFrame(sample)};
    try{
      observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())if(meta.started&&entry.startTime>=meta.started&&entry.startTime<=meta.started+duration){
        if(entry.entryType==='longtask')meta.longTasks.push(entry.duration);
        if(entry.entryType==='layout-shift'&&!entry.hadRecentInput)meta.layoutShifts.push(entry.value);
      }});observer.observe({entryTypes:['longtask','layout-shift']});
    }catch{}
    let resolved=false,complete;
    const promise=new Promise(resolve=>{complete=resolve});
    function finish(cancelled=false){
      if(resolved)return;resolved=true;currentTransition=null;
      cancelAnimationFrame(frameRaf);observer?.disconnect();
      animations.forEach(a=>a.cancel());
      for(const record of targetRecords){
        const {node,slot}=record;
        node.querySelector('.collection-paper-glint')?.remove();
        node.classList.remove('collection-shared-paper');node.removeAttribute('style');
        slot.replaceWith(node);
      }
      content.append(page);
      if(snapshot.viewport&&snapshot.viewportParent)snapshot.viewportParent.prepend(snapshot.viewport);
      for(const [node,style] of savedStyles){if(!node.isConnected)continue;if(style===null)node.removeAttribute('style');else node.setAttribute('style',style)}
      content.inert=previousInert;content.style.contain=oldContain;
      document.body.removeAttribute('data-collection-turn');layer.remove();
      meta.completed=performance.now();meta.cancelled=cancelled;meta.landed=true;
      const sorted=meta.frames.slice().sort((a,b)=>a-b),mean=meta.frames.reduce((a,b)=>a+b,0)/Math.max(1,meta.frames.length);
      meta.performance={samples:sorted.length,averageFps:mean?1000/mean:0,p95FrameMs:sorted[Math.floor(sorted.length*.95)]||0,maxFrameMs:sorted.at(-1)||0,over25ms:sorted.filter(x=>x>25).length};
      page.dispatchEvent(new Event('collection:turn-rest'));
      if(!cancelled)heading.focus({preventScroll:true});
      complete();
    }
    currentTransition={running:false,animations,finish:()=>finish(true)};
    // Warm compositing layers for two frames; decoding/layout never overlaps playback.
    await nextFrame();await nextFrame();
    if(resolved)return promise;
    meta.started=performance.now();currentTransition.running=true;
    const start=document.timeline.currentTime;
    animations.forEach(a=>{a.play();a.startTime=start});
    frameRaf=requestAnimationFrame(sample);
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>finish());
    return promise;
  }
  addEventListener('pagehide',()=>{currentTransition?.finish();teardown()});
  addEventListener('resize',()=>currentTransition?.finish());
  function invalidate(){teardown();dimensions.clear();loads.clear();decodedImages.clear();sharedPapers.clear();works.forEach(w=>{if(w.width&&w.height)dimensions.set(w.id,{width:w.width,height:w.height})})}
  window.CollectionPages={finishTransition:()=>{transitionEpoch++;currentTransition?.finish()},render,mount,teardown,capture,enter,isRoute,invalidate,ready:id=>Promise.all(works.filter(w=>w.series===id||works.length<=12).slice(0,24).map(imageReady)),getTransition:()=>lastTransition,pauseTransition:()=>currentTransition?.animations.forEach(a=>a.pause()),resumeTransition:()=>currentTransition?.animations.forEach(a=>a.play())};
})();
