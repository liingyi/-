/* Hash routes work from file:// and from any static hosting subdirectory. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const works = window.PORTFOLIO_WORKS || [];
  const series = window.STUDIO_SERIES || [];
  const content = $('page-content'), home = $('home-view'), menu = $('directory');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const copy = {
    zh: { skip:'跳到作品内容',siteName:'摄影档案',series:'作品系列',about:'关于',menu:'目录',directory:'作品目录',homeTitle:'角色之间',homeDescription:'以人物为中心，在光线与场景之间，留下角色的另一种可能。',exploreSeries:'展开作品系列',gatherHint:'向下滚动，让纸张聚拢',rotateHint:'拖动或滚轮，自由旋转',replay:'重新散开',showInfo:'显示介绍',hideInfo:'收起介绍',renderError:'浏览器暂时无法展示立体纸张。',photoError:'图片无法打开，请检查作品文件。',return:'返回',exhibition:'纸张展厅',allSeries:'全部系列',indexNote:'五种拍摄方式，同一个关于角色与人物的主题。',seriesCount:'个系列',works:'幅作品',viewCollection:'浏览本系列作品',collection:'系列作品',method:'方式',subject:'主题',cosplay:'Cosplay 人像',nextSeries:'下一个系列',backSeries:'返回系列目录',backHome:'返回展厅',aboutLabel:'关于这份档案',aboutTitle:'人物、光线',aboutTitle2:'与角色。',aboutSubject:'拍摄主题',aboutApproach:'作品分类',aboutApproachValue:'合成 / 白棚 / 灯阵 / 外景 / 室内',aboutLink:'从一个系列开始',selected:'已收录作品',pageMissing:'这一页没有收录',missingCopy:'可以从作品系列继续浏览。',menuClose:'关闭目录',menuOpen:'打开目录',previous:'上一张',next:'下一张',closePhoto:'关闭大图',original:'打开高清原图',zoom:'放大细看',fit:'适合屏幕',themes:['白色','米色','深色'],archive:'摄影作品档案',browse:'浏览系列',footer:'以人物为中心',allPhotos:'全部作品' },
    en: { skip:'Skip to photographs',siteName:'Photo archive',series:'Series',about:'About',menu:'Index',directory:'Portfolio index',homeTitle:'Portrait archive',homeDescription:'Portraits of characters, shaped through light, setting and imagination.',exploreSeries:'Explore the series',gatherHint:'Scroll down to gather the pages',rotateHint:'Drag or scroll to rotate',replay:'Scatter again',showInfo:'Show introduction',hideInfo:'Hide introduction',renderError:'The 3D exhibition is unavailable in this browser.',photoError:'This photograph could not be opened. Please check the image file.',return:'Return',exhibition:'The exhibition',allSeries:'All series',indexNote:'Five approaches to photography, connected by characters and portraiture.',seriesCount:'series',works:'photographs',viewCollection:'View the photographs',collection:'The photographs',method:'Approach',subject:'Subject',cosplay:'Cosplay portraits',nextSeries:'Next series',backSeries:'Back to all series',backHome:'Back to the exhibition',aboutLabel:'About the archive',aboutTitle:'People, light',aboutTitle2:'& character.',aboutSubject:'Subject',aboutApproach:'Approaches',aboutApproachValue:'Composite / Studio / Event / Outdoor / Interior',aboutLink:'Start with a series',selected:'Photographs in the archive',pageMissing:'Page not found',missingCopy:'Continue exploring through the series index.',menuClose:'Close index',menuOpen:'Open index',previous:'Previous photograph',next:'Next photograph',closePhoto:'Close photograph',original:'Open the original image',zoom:'Enlarge photograph',fit:'Fit to screen',themes:['White','Warm paper','Dark'],archive:'Photographic archive',browse:'Explore series',footer:'Portraits, in character',allPhotos:'All photographs' }
  };
  const storage = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key,value) { try { localStorage.setItem(key,value); } catch {} } };
  let lang = storage.get('studio-language') === 'en' ? 'en' : 'zh';
  let currentBase = null, currentRoute = null, processing = false, pending = null;
  let menuOrigin = null, menuAnimation = null, menuClosing = false, infoAnimation = null;
  let phase = 'gather', pendingPoint = null, uiVisible = false;
  const scrollPositions = new Map();
  let routeAnimation=null,routeRevision=0;
  const t = key => key === 'siteName' ? (window.PORTFOLIO_SITE?.name?.[lang] || '零壹') : copy[lang][key] || key;
  const local = object => object ? object[lang] || object.zh || '' : '';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  const count = value => String(value).padStart(2,'0');
  const name = item => lang === 'en' ? item.titleEn || item.title : item.title || item.titleEn;
  const l = (zh,en) => lang === 'en' ? en : zh;
  const formations = { composite:'orbit', 'white-studio':'grid', 'event-lighting':'ring', outdoor:'ribbon', interior:'field' };
  let selectedSeries = series[0]?.id, ambientPaused = false, managerOpen = false;
  const seriesWorks = id => works.filter(work => work.series === id).sort((a,b)=>Number(b.featured===true)-Number(a.featured===true)||(a.featured===true?(a.featuredOrder??0)-(b.featuredOrder??0):0));
  const seriesName = item => lang === 'en' ? item.en : item.zh;
  const footer = () => `<footer class="page-footer"><span>${esc(t('archive'))} / Cosplay</span><a href="#/">${esc(t('backHome'))} ↗</a></footer>`;
  const routeLink = (href,label,extra='') => `<a class="text-link" href="${href}" ${extra}><span>${esc(label)}</span><span aria-hidden="true">↗</span></a>`;
  const workLink = (work,base,classes='',extra='') => `<a href="#${base === '/' ? '' : base}/work/${esc(work.id)}" class="${classes}" aria-label="${esc((lang==='en'?'View ':'查看 ') + name(work))}" ${extra}>`;

  function renderSeries(id) {
    if (!series.some(s=>s.id===id)) return renderMissing();
    return window.CollectionPages.render(id);
  }

  function renderGallery(id) {
    const s=series.find(item=>item.id===id); if(!s)return renderMissing();
    const items=seriesWorks(id),base='/series/'+id+'/gallery';
    return `<div class="wrap gallery-page"><div class="page-kicker"><a href="#/series/${id}">← ${esc(seriesName(s))}</a><span>${count(items.length)} ${t('works')}</span></div><h1 class="journey-title" tabindex="-1">${l('系列作品','The photographs.')}</h1><p class="gallery-intro">${esc(local(s.subtitle))}</p><div class="masonry${items.length===1?' single':''}">${items.map((work,i)=>workLink(work,base,'work-tile')+`<img src="${work.image}" alt="${esc(name(work))}" loading="lazy"><span class="work-number">${count(i+1)}</span></a>`).join('')}</div>${footer()}</div>`;
  }

  function renderMissing() {
    return `<div class="wrap"><div class="page-kicker">404 / Archive</div><div class="about-layout"><div><h1 class="about-title" tabindex="-1">${esc(t('pageMissing'))}</h1><p class="series-lead">${t('missingCopy')}</p>${routeLink('#/series',t('exploreSeries'))}</div>${works[0]?`<img src="${esc(works[0].image)}" alt="${esc(name(works[0]))}">`:''}</div>${footer()}</div>`;
  }

  function parseRoute() {
    let path = location.hash.replace(/^#/,'') || '/';
    if (/^\/(?:author|about)(?:\/|$)/.test(path)) { path='/series'; history.replaceState({},'','#/series'); }
    const parts = path.split('/').filter(Boolean);
    const wi = parts.indexOf('work');
    const work = wi >= 0 ? works.find(work=>work.id === parts[wi+1]) : null;
    const baseParts = wi >= 0 ? parts.slice(0,wi) : parts;
    const base = '/' + baseParts.join('/');
    const valid = ['/', '/series'].includes(base) || window.LoopCollections?.isRoute(base) || /^\/series\/[^/]+(?:\/gallery)?$/.test(base) && series.some(s=>s.id===baseParts[1]);
    return { path, base:valid && (wi < 0 || work) ? base : '/404', work };
  }

  function updateShell() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $('language-toggle').textContent = lang === 'zh' ? 'EN' : '中';
    $('language-toggle').setAttribute('aria-label',lang==='zh'?'Switch to English':'切换为中文');
    $('identity').setAttribute('aria-label',t('siteName')+', '+t('backHome'));
    $('menu-toggle')?.setAttribute('aria-label',t('menuOpen'));
    $('menu-close').setAttribute('aria-label',t('menuClose'));
    const themeLabels = t('themes');
    const labels = { white: themeLabels[0], paper: lang === 'zh' ? '米白色' : 'Ivory', dark: lang === 'zh' ? '夜间' : 'Night' };
    document.querySelectorAll('[data-theme-group]').forEach(group=>group.setAttribute('aria-label',lang==='zh'?'页面配色':'Page appearance'));
    document.querySelectorAll('[data-theme-choice]').forEach(b=>{
      const label = labels[b.dataset.themeChoice];
      b.title = label; b.setAttribute('aria-label',label);
      const span = b.querySelector('span'); if (span) span.textContent = label;
    });
    $('directory-links').innerHTML = [ ['/',l('首页','Home'),'Exhibition'],['/series',l('作品分类','Collections'),'Collections'] ].map(([href,label,en],i)=>`<a class="directory-link" href="#${href}" data-menu-preview="${i}"><small>0${i+1}</small><span>${esc(label)}</span><em>${esc(lang==='zh'?en:'')}</em></a>`).join('')+`<button class="directory-link" type="button" data-studio-action="search"><small>05</small><span>${l('作品检索','Search')}</span><em>Search</em></button><button class="directory-link" type="button" data-studio-action="contact"><small>06</small><span>${l('联系作者','Contact')}</span><em>Contact</em></button>`;
    $('info-label').textContent = t(uiVisible?'hideInfo':'showInfo');
    if ($('motion-toggle')) $('motion-toggle').textContent=ambientPaused?l('继续动态','Resume motion'):l('暂停动态','Pause motion');
    updatePhase();
    StudioViewer?.translate();
  }

  function updatePhase() {
    $('scroll-cue').textContent = phase === 'carousel'
      ? l('滚轮纵向浏览 · 拖动浏览 · 点击看大图','Scroll or drag to browse · Click a photograph')
      : phase === 'unfold' ? l('照片展开，进入逐张浏览','Opening the photograph stream')
      : phase === 'rotate' ? l('继续向下滚动或向右拖动，展开照片','Scroll down or drag right to open the photographs') : t('gatherHint');
    $('home-phase').textContent = phase === 'carousel' || phase === 'unfold' ? '03 / 03' : phase === 'rotate' ? '02 / 03' : '01 / 03';
  }

  function renderBase(base) {
    const isHome = base === '/';
    window.LoopCollections?.teardown();
    window.CollectionPages?.teardown();
    document.body.toggleAttribute('data-collection-page',!!window.CollectionPages?.isRoute(base));
    home.hidden = false; home.inert = !!window.LoopCollections?.isRoute(base);
    if(home.classList.contains('piano-home')){home.hidden=!isHome;home.inert=!isHome;}
    content.hidden = isHome; content.inert = isHome;
    document.body.dataset.view = isHome?'home':base;
    if (!isHome) {
      content.innerHTML = window.LoopCollections?.isRoute(base) ? LoopCollections.render() : /^\/series\/[^/]+\/gallery$/.test(base) ? renderGallery(base.split('/')[2]) : base.startsWith('/series/') ? renderSeries(base.split('/')[2]) : renderMissing();
      content.scrollTop = scrollPositions.get(base) || 0;
      if (window.LoopCollections?.isRoute(base)) { content.scrollTop=0;LoopCollections.mount(content); }
      if (window.CollectionPages?.isRoute(base)) CollectionPages.mount(content);
    }
    currentBase = base;
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (base.startsWith('/'+link.dataset.nav)) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    const label = base === '/' ? (home.classList.contains('piano-home')?l('摄影档案','Portrait archive'):t('exhibition')) : base === '/series' || window.LoopCollections?.isRoute(base) ? t('series') : seriesName(series.find(s=>base.split('/')[2]===s.id) || {zh:t('pageMissing'),en:t('pageMissing')});
    document.title = label + ' · ' + t('siteName');
    $('route-announcement').textContent = label;
    applySceneRoute(base);
    window.Exhibit?.setSuspended(!!window.CollectionPages?.isRoute(base) || !!window.CompositeCarousel?.isActive() || menu.open || StudioViewer.isOpen() || managerOpen);
  }

  function applySceneRoute(base = currentBase) {
    window.CompositeCarousel?.sync(base,selectedSeries,ambientPaused || managerOpen);
    if (!window.Exhibit) return;
    if(window.LoopCollections?.isRoute(base)){Exhibit.setActive(false);return;}
    Exhibit.setActive(true);
    const id = base?.split('/')[2];
    const kind = base === '/' ? 'home' : base === '/series' ? formations[selectedSeries] : base?.endsWith('/gallery') ? 'grid' : 'carousel';
    Exhibit.setLayout(kind || 'orbit',base === '/series' ? selectedSeries : id || null);
  }

  async function returnToCollections(base){
    const id=currentBase.split('/')[2],coverId=window.PortfolioStore?.getState().covers?.[id];
    const photos=[...content.querySelectorAll('[data-paper-destination]')];
    const source=photos.find(n=>n.dataset.paperDestination===coverId)||photos.find(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight});
    const from=source?.getBoundingClientRect();
    const rect=content.getBoundingClientRect(),scroll=content.scrollTop;
    const departure=document.createElement('div');
    Object.assign(departure.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',overflow:'hidden',background:'var(--bg)',zIndex:'25',pointerEvents:'none',willChange:'transform',transformOrigin:'100% 50%'});
    while(content.firstChild)departure.append(content.firstChild);
    document.body.append(departure);departure.scrollTop=scroll;
    window.LoopCollections?.selectSeries(id);renderBase(base);
    const destination=content.querySelector('.loop-hero picture'),to=destination?.getBoundingClientRect();
    const arrival=content.querySelector('.loop-collections');
    let paper;
    if(source&&from&&to&&from.bottom>0&&from.top<innerHeight){
      paper=source;document.body.append(paper);
      Object.assign(paper.style,{position:'fixed',left:to.left+'px',top:to.top+'px',width:to.width+'px',height:to.height+'px',margin:'0',overflow:'hidden',zIndex:'26',pointerEvents:'none',willChange:'transform',transformOrigin:'0 0'});
      const image=paper.querySelector('img');if(image)Object.assign(image.style,{width:'100%',height:'100%',objectFit:'cover'});
      destination.style.visibility='hidden';
    }
    try{await new Promise(resolve=>{
      routeAnimation=gsap.timeline({onComplete:resolve});
      routeAnimation.fromTo(arrival,{x:-32,rotationY:6,transformPerspective:1400,scale:.985},{x:0,rotationY:0,scale:1,duration:.38,ease:'power2.out',clearProps:'transform'},0);
      routeAnimation.to(departure,{x:Math.min(innerWidth*.65,700),rotationY:-9,transformPerspective:1400,duration:.38,ease:'power2.inOut'},0);
      if(paper)routeAnimation.fromTo(paper,{x:from.left-to.left,y:from.top-to.top,scaleX:from.width/to.width,scaleY:from.height/to.height},{x:0,y:0,scaleX:1,scaleY:1,duration:.42,ease:'power2.inOut'},0);
    });}finally{departure.remove();paper?.remove();if(destination)destination.style.visibility='';if(arrival)gsap.set(arrival,{clearProps:'transform'});routeAnimation=null;}
  }
  async function transition(base, initial = false) {
    const revision=routeRevision,previous=currentBase,revisit=scrollPositions.has(base);
    if (currentBase && currentBase !== '/') scrollPositions.set(currentBase,content.scrollTop);
    if (window.CollectionPages?.isRoute(base)) {
      await CollectionPages.ready(base.split('/')[2]);
      if(revision!==routeRevision)return;
      // Revisit at the saved reading position; do not fly photos toward offscreen slots.
      if(initial||revisit||reduced.matches){renderBase(base);return;}
      const departure = CollectionPages.capture(content,base.split('/')[2],{initial});
      renderBase(base);
      try { await CollectionPages.enter(content,departure,{initial}); }
      finally { window.CompositeCarousel?.finishDeparture(); }
      return;
    }
    if (initial || reduced.matches || !window.gsap) { renderBase(base); return; }
    if(window.CollectionPages?.isRoute(previous)&&window.LoopCollections?.isRoute(base)){
      await returnToCollections(base);return;
    }
    // One entrance for the page and its title. No second hidden-title replay.
    renderBase(base);
    await new Promise(resolve=>{
      routeAnimation=gsap.fromTo(content,{x:previous==='/'?18:-18},{x:0,duration:.32,ease:'power2.out',clearProps:'transform',onComplete:resolve});
    });routeAnimation=null;
  }

  async function handleRoute() {
    pending = parseRoute();routeRevision++;
    if (processing) {
      routeAnimation?.progress(1);
      window.CollectionPages?.finishTransition?.();
      return;
    }
    processing = true;
    while (pending) {
      const next = pending; pending = null;
      if (menu.open) await closeMenu(false);
      if (StudioViewer.isOpen() && (!next.work || next.base !== currentBase)) await StudioViewer.hide();
      if (next.base !== currentBase) await transition(next.base,currentBase===null);
      currentRoute = next;
      if (pending) continue;
      if (next.work) {
        const subset = next.base.startsWith('/series/') ? seriesWorks(next.base.split('/')[2]) : works;
        const list = subset.some(work=>work.id===next.work.id) ? subset : works;
        StudioViewer.open(list,list.findIndex(work=>work.id===next.work.id),pendingPoint);
        pendingPoint = null;
      }
      window.Exhibit?.setSuspended(!!window.CollectionPages?.isRoute(currentBase) || !!window.CompositeCarousel?.isActive() || menu.open || StudioViewer.isOpen() || managerOpen);
      document.body.dataset.routing = 'idle';
    }
    processing = false;
  }

  function navigate(path, replace = false, state = {}) {
    window.StudioGlass?.closePanels();
    const normalized = path.startsWith('/') ? path : '/' + path;
    if (location.hash === '#'+normalized && !replace) return;
    document.body.dataset.routing = 'busy';
    history[replace?'replaceState':'pushState'](state,'','#'+normalized);
    handleRoute();
  }

  function openWork(id,replace=false,point=null) {
    if (!works.some(work=>work.id===id)) return;
    const base = currentBase || '/';
    pendingPoint = point;
    navigate((base==='/'?'':base)+'/work/'+id,replace,{photoFrom:base});
  }

  function closeWork() {
    if (!StudioViewer.isOpen()) return;
    const base = currentRoute?.base || '/';
    if (history.state?.photoFrom === base) history.back();
    else navigate(base,true);
  }

  function toggleInfo(value = !uiVisible) {
    uiVisible = value;
    $('info-toggle').setAttribute('aria-expanded',String(value));
    $('info-label').textContent = t(value?'hideInfo':'showInfo');
    infoAnimation?.kill();
    const panel = $('home-info');
    if (value) {
      panel.hidden = false; panel.inert = false;
      if (gsap && !reduced.matches) infoAnimation = gsap.fromTo(panel,{autoAlpha:0,y:12},{autoAlpha:1,y:0,duration:.6,ease:'power3.out'});
    } else {
      panel.inert = true;
      if (gsap && !reduced.matches) infoAnimation = gsap.to(panel,{autoAlpha:0,y:8,duration:.3,onComplete:()=>{panel.hidden=true;}});
      else panel.hidden=true;
    }
  }

  function openMenu() {
    if (menu.open) return;
    menuClosing=false; menuOrigin=document.activeElement;
    menu.showModal(); $('menu-toggle')?.setAttribute('aria-expanded','true');
    window.Exhibit?.setSuspended(!!window.CollectionPages?.isRoute(currentBase) || !!window.CompositeCarousel?.isActive() || StudioViewer.isOpen());
    menuAnimation?.kill();
    if (gsap && !reduced.matches) {
      menuAnimation=gsap.timeline().fromTo(menu,{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)',duration:.55,ease:'power3.inOut'})
        .fromTo(menu.querySelectorAll('.directory-link'),{autoAlpha:0,y:18},{autoAlpha:1,y:0,stagger:.06,duration:.5,ease:'power3.out'},.2);
    }
    $('menu-close').focus({preventScroll:true});
  }

  async function closeMenu(restore=true) {
    if (!menu.open || menuClosing) return;
    menuClosing=true; menuAnimation?.kill();
    if (gsap && !reduced.matches) await new Promise(resolve=>{menuAnimation=gsap.to(menu,{clipPath:'inset(0 0 100% 0)',duration:.3,ease:'power2.inOut',onComplete:resolve});});
    menu.close(); menu.style.clipPath=''; menuClosing=false;
    $('menu-toggle')?.setAttribute('aria-expanded','false');
      window.Exhibit?.setSuspended(!!window.CollectionPages?.isRoute(currentBase) || !!window.CompositeCarousel?.isActive() || StudioViewer.isOpen());
    if (restore && menuOrigin?.isConnected) menuOrigin.focus({preventScroll:true});
  }

  function setTheme(value) {
    document.documentElement.dataset.theme=value;
    document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===value)));
    document.querySelector('meta[name="theme-color"]').content={white:'#fafafa',paper:'#f3f1ed',dark:'#1a1d1b'}[value];
    storage.set('studio-theme',value);
  }

  let refreshing=null,refreshPending=false;
  function refreshWorks(){
    refreshPending=true;
    if(refreshing)return refreshing;
    refreshing=(async()=>{
      while(refreshPending){
        refreshPending=false;
        while(processing)await new Promise(resolve=>requestAnimationFrame(resolve));
        await window.Exhibit?.refreshWorks?.();
        while(processing)await new Promise(resolve=>requestAnimationFrame(resolve));
        const base=currentBase||parseRoute().base,top=content.scrollTop;
        const viewer=StudioViewer.getState();
        window.CompositeCarousel?.refreshWorks?.();
        window.CollectionPages?.invalidate?.();
        if(base!=='/')scrollPositions.set(base,top);
        renderBase(base);content.scrollTop=top;
        if(viewer.open){
          const subset=base.startsWith('/series/')?seriesWorks(base.split('/')[2]):works;
          if(works.some(w=>w.id===viewer.id))StudioViewer.refresh(subset.some(w=>w.id===viewer.id)?subset:works,viewer.id);
          else{await StudioViewer.hide();history.replaceState({},'','#'+base);currentRoute=parseRoute()}
        }
        updateShell();window.StudioGlass?.refreshData?.();
        const fallback=$('paper-fallback');
        if(works[0]){fallback.href='#/work/'+works[0].id;fallback.querySelector('img').src=works[0].image;fallback.querySelector('img').alt=name(works[0])}
        else fallback.hidden=true;
        document.dispatchEvent(new Event('studio:works-refreshed'));
      }
    })().finally(()=>{refreshing=null});
    return refreshing;
  }
  window.Studio = { t,local,getLanguage:()=>lang,name,seriesName,openWork,closeWork,navigate,openMenu,closeMenu,setTheme,refreshWorks,getState:()=>({base:currentBase,route:currentRoute?.path,language:lang,uiVisible,menuOpen:menu.open,processing,refreshing:!!refreshing}) };
  document.addEventListener('portfolio:data-change',event=>{
    if(event.detail?.scope==='music')return;
    if(event.detail?.scope==='covers'){
      if(window.LoopCollections?.isRoute(currentBase)&&!processing){renderBase(currentBase);document.dispatchEvent(new Event('studio:works-refreshed'))}
      return;
    }
    refreshWorks().catch(error=>console.error('Portfolio refresh:',error));
  });
  for(const kind of ['open','close'])document.addEventListener('portfolio-manager:'+kind,()=>{
    managerOpen=kind==='open';applySceneRoute();
    window.Exhibit?.setSuspended(managerOpen||!!window.CollectionPages?.isRoute(currentBase)||!!window.CompositeCarousel?.isActive()||menu.open||StudioViewer.isOpen());
  });
  window.PaperLightbox = { open:(index,point)=>openWork(works[index]?.id,false,point) };
  $('language-toggle').addEventListener('click',()=>{
    lang=lang==='zh'?'en':'zh'; storage.set('studio-language',lang); updateShell();
    if (currentBase && currentBase !== '/') { scrollPositions.set(currentBase,content.scrollTop); renderBase(currentBase); }
    if (StudioViewer.isOpen()) StudioViewer.translate();
    document.dispatchEvent(new Event('studio:language'));
  });
  $('menu-toggle')?.addEventListener('click',()=>menu.open?closeMenu():openMenu());
  $('menu-close').addEventListener('click',()=>closeMenu());
  menu.addEventListener('cancel',event=>{event.preventDefault();closeMenu();});
  $('info-toggle').addEventListener('click',()=>toggleInfo());
  $('replay-button').addEventListener('click',()=>window.Exhibit?.replay());
  document.addEventListener('exhibit:toggle-ui',()=>document.dispatchEvent(new Event('studio:toggle-dock')));
  document.addEventListener('exhibit:phase',event=>{phase=event.detail;updatePhase();});
  document.addEventListener('exhibit:ready',()=>{
    applySceneRoute(); Exhibit.setSuspended(!!window.CollectionPages?.isRoute(currentBase)||!!window.CompositeCarousel?.isActive()||menu.open||StudioViewer.isOpen()||managerOpen); Exhibit.setAmbientPaused(ambientPaused);
  });
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.themeChoice)));
  $('motion-toggle')?.addEventListener('click',()=>{
    ambientPaused=!ambientPaused; window.Exhibit?.setAmbientPaused(ambientPaused);
    window.CompositeCarousel?.sync(currentBase,selectedSeries,ambientPaused);
    $('motion-toggle').setAttribute('aria-pressed',String(ambientPaused));
    $('motion-toggle').textContent=ambientPaused?l('继续动态','Resume motion'):l('暂停动态','Pause motion');
  });
  document.addEventListener('click',event=>{
    if (event.target.closest('.skip-link')) {
      event.preventDefault();
      (currentBase === '/' ? $('scroll-canvas') : content).focus({preventScroll:true});
      return;
    }
    const link=event.target.closest('a[href^="#/"]');
    if (!link || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const path=link.getAttribute('href').slice(1);
    if (path.includes('/work/')) pendingPoint={x:event.clientX,y:event.clientY};
    if (path===currentRoute?.path && menu.open) { closeMenu(); return; }
    navigate(path,false,path.includes('/work/')?{photoFrom:currentBase}:{});
  });
  content.addEventListener('click',event=>{
    if (event.target.closest('[data-action="collection"]')) {
      const target=$('series-works');
      content.scrollTo({top:target.offsetTop-32,behavior:reduced.matches?'instant':'smooth'});
    }
  });
  document.addEventListener('keydown',event=>{
    if (event.key==='Escape' && !menu.open && !StudioViewer.isOpen() && uiVisible && currentBase==='/') toggleInfo(false);
  });
  $('directory-links').addEventListener('pointerover',event=>{
    const link=event.target.closest('[data-menu-preview]');
    if (link) { const work=[works[0],works[2],works[5]][Number(link.dataset.menuPreview)]||works[0];if(work){$('directory-image').src=work.image;$('directory-image').alt=name(work)} }
  });
  window.addEventListener('hashchange',handleRoute);
  window.addEventListener('popstate',handleRoute);
  setTheme(['white','paper','dark'].includes(storage.get('studio-theme'))?storage.get('studio-theme'):'paper');
  updateShell();
  Promise.resolve(window.PortfolioStore?.ready).then(()=>{window.CollectionPages?.invalidate?.();return handleRoute()}).catch(error=>console.error('Portfolio startup:',error));
})();
