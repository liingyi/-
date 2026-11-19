/* Local search, contact and a single top glass navigation. No external UI dependencies. */
(() => {
  'use strict';
  const works=window.PORTFOLIO_WORKS||[],series=window.STUDIO_SERIES||[];
  const lang=()=>window.Studio?.getLanguage()||'zh';
  const text=(zh,en)=>lang()==='en'?en:zh;
  const local=value=>typeof value==='string'?value:value?.[lang()]||value?.zh||'';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dock=document.querySelector('.site-header');
  dock.id='top-navigation';dock.setAttribute('popover','manual');
  const contact=document.createElement('dialog');contact.id='contact-dialog';contact.className='glass-dialog liquid-surface';contact.setAttribute('aria-labelledby','contact-title');
  const search=document.createElement('dialog');search.id='search-dialog';search.className='glass-dialog search-dialog liquid-surface';search.setAttribute('aria-labelledby','search-title');
  document.body.append(contact,search);
  let lastGestureAt=-Infinity,lastInputAt=-Infinity,inputSource='',inputDirection=0,inputDistance=0;
  let dockOpen=true,requestedVisible=true,topHover=false,keyboardFocus=false,hideTimer=null;
  let origin=null,dialogOrigin=null,press=null,opening=0;
  const navLabels={collections:['作品分类','Collections'],contact:['联系作者','Contact']};
  const themeButton=document.getElementById('theme-toggle');
  const themeToolbar=document.createElement('div');themeToolbar.id='theme-toolbar';themeToolbar.className='theme-toolbar liquid-surface';themeToolbar.hidden=true;themeToolbar.setAttribute('role','group');
  const themeIcons={white:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',paper:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h4"/>',dark:'<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>'};
  themeToolbar.innerHTML=['white','paper','dark'].map(value=>`<button type="button" class="nav-control" data-theme-choice="${value}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true">${themeIcons[value]}</svg><span></span></button>`).join('');dock.append(themeToolbar);
  function setThemeToolbar(open,restore=false){themeToolbar.hidden=!open;themeButton.setAttribute('aria-expanded',String(open));if(open){toggle(true);themeToolbar.querySelector('[aria-pressed=true]')?.focus({preventScroll:true})}else if(restore)themeButton.focus({preventScroll:true});paintNavigation()}
  themeToolbar.addEventListener('click',event=>{const choice=event.target.closest('[data-theme-choice]');if(choice){Studio.setTheme(choice.dataset.themeChoice);setThemeToolbar(false,true)}});
  document.addEventListener('pointerdown',event=>{if(!themeToolbar.hidden&&!themeToolbar.contains(event.target)&&!themeButton.contains(event.target))setThemeToolbar(false)},true);
  dock.addEventListener('keydown',event=>{if(event.key==='Escape'&&!themeToolbar.hidden){event.preventDefault();event.stopPropagation();setThemeToolbar(false,true)}});
  function refresh(){
    dock.querySelector('.header-nav').setAttribute('aria-label',text('作品集导航','Portfolio navigation'));
    dock.querySelectorAll('[data-nav-label]').forEach(el=>{const labels=navLabels[el.dataset.navLabel];el.textContent=text(...labels)});
    const searchButton=dock.querySelector('[data-glass-action=search]');searchButton.setAttribute('aria-label',text('作品检索','Search photographs'));searchButton.title=text('作品检索','Search photographs');
    const base=Studio.getState().base;
    dock.querySelectorAll('a[href^="#/"]').forEach(a=>{
      const href=a.getAttribute('href').slice(1);
      if(href==='/'?base==='/':base?.startsWith(href))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    refreshTheme();
    if(contact.open)renderContact();if(search.open)renderSearch(search.querySelector('input')?.value||'');
  }
  function refreshTheme(){
    const theme=document.documentElement.dataset.theme||'paper';
    const label={paper:text('米白色','Ivory'),dark:text('夜间','Night'),white:text('白色','White')}[theme];
    const button=document.getElementById('theme-toggle');
    button.dataset.themeCurrent=theme;
    button.setAttribute('aria-label',text('页面配色：','Appearance: ')+label+text('，打开配色工具栏','; open appearance toolbar'));button.title=button.getAttribute('aria-label');
    themeToolbar.setAttribute('aria-label',text('页面配色','Page appearance'));
    themeToolbar.querySelectorAll('[data-theme-choice]').forEach(choice=>{const value=choice.dataset.themeChoice;choice.setAttribute('aria-pressed',String(value===theme));choice.querySelector('span').textContent={white:text('白色','White'),paper:text('米白色','Ivory'),dark:text('夜间','Night')}[value]});
    button.title=text('切换夜间、白色、米白色','Cycle Night, White and Ivory');
  }
  function paintNavigation(){
    const visible=requestedVisible||topHover||keyboardFocus||!themeToolbar.hidden;
    dockOpen=visible;dock.dataset.navVisible=String(visible);dock.setAttribute('aria-hidden',String(!visible));
    if(!visible&&dock.contains(document.activeElement))document.activeElement.blur();
    dock.inert=!visible;
  }
  function closeDock(restore=false){toggle(false);if(restore&&origin?.isConnected)origin.focus({preventScroll:true});}
  function toggle(value=!dockOpen){
    clearTimeout(hideTimer);requestedVisible=!!value;
    if(value)origin=document.activeElement;
    paintNavigation();
  }
  function deferHide(){
    clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>{requestedVisible=false;paintNavigation()},650);
  }
  function updateHover(event){
    if(event.pointerType==='touch')return;
    const inside=event.clientY>=0&&(event.clientY<=110||dock.contains(event.target));
    if(inside===topHover)return;
    topHover=inside;
    if(inside){clearTimeout(hideTimer);paintNavigation()}else deferHide();
  }
  // Keep a single header above native modal top layers, with the modal as its owner.
  // Moving the existing element preserves every button's router and event bindings.
  function syncNavigationLayer(){
    const modal=[...document.querySelectorAll('dialog[open]')].at(-1);
    const parent=modal||document.body;
    if(dock.parentElement!==parent){if(dock.matches(':popover-open'))dock.hidePopover();parent.append(dock)}
    if(!dock.matches(':popover-open'))dock.showPopover();
  }
  document.addEventListener('pointermove',updateHover,{passive:true});
  document.addEventListener('keydown',event=>{if(event.key==='Tab'&&!dockOpen)toggle(true)},true);
  document.documentElement.addEventListener('pointerleave',()=>{topHover=false;deferHide()});
  dock.addEventListener('focusin',event=>{keyboardFocus=event.target.matches(':focus-visible');paintNavigation()});
  dock.addEventListener('focusout',()=>queueMicrotask(()=>{keyboardFocus=dock.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');paintNavigation()}));
  dock.addEventListener('pointermove',event=>{const r=dock.getBoundingClientRect();dock.style.setProperty('--nav-glint',((event.clientX-r.left)/r.width*100).toFixed(1)+'%')});
  themeButton.addEventListener('click',()=>setThemeToolbar(themeToolbar.hidden));
  const themeObserver=new MutationObserver(refreshTheme);
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const layerObserver=new MutationObserver(()=>{syncNavigationLayer();refreshCurrent()});
  const refreshCurrent=()=>{dock.querySelectorAll('a[href^="#/"]').forEach(a=>{const href=a.getAttribute('href').slice(1),base=Studio.getState().base;if(href==='/'?base==='/':base?.startsWith(href))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})};
  layerObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','data-view']});
  syncNavigationLayer();paintNavigation();
  const top=(kicker,titleId)=>`<div class="glass-dialog-top"><p class="eyebrow">${kicker}</p><button class="glass-dialog-close" type="button" data-dialog-close aria-label="${text('关闭弹窗','Close dialog')}">×</button></div>`;
  function qrMarkup(qr){
    const title=local(qr.label),hasImage=!!qr.src;
    return `<figure class="qr-unit" data-qr="${esc(title)}"><div class="qr-paper${hasImage?'':' is-empty'}">${hasImage?`<a class="qr-original" href="${esc(qr.src)}" target="_blank" rel="noopener" aria-label="${esc(title+' '+text('查看二维码原图','View full-size QR code'))}" title="${text('点击查看二维码原图','View full-size QR code')}"><img src="${esc(qr.src)}" alt="${esc(title+' '+text('二维码','QR code'))}"></a>`:`<span class="qr-empty">${text('二维码<br>待放入','QR image<br>to be added')}</span>`}</div><figcaption><span>${esc(title)}</span><small>${esc(local(qr.caption))}</small></figcaption></figure>`;
  }
  function renderContact(){
    const data=window.PORTFOLIO_CONTACT||{},methods=data.methods||[],qrs=data.qrCodes||[];
    contact.innerHTML=top('GET IN TOUCH','contact-title')+`<div class="contact-layout"><div class="contact-details"><h2 id="contact-title" class="contact-title">${esc(local(data.name)||'零壹')}</h2><p class="contact-lead">${esc(local(data.intro))}</p><div class="contact-intro"><h3>Let's make<br>something real.</h3><p>${text('关于角色、光线和想象。<br>欢迎从一次交流开始。','Characters, light and imagination.<br>It begins with a conversation.')}</p>${methods.map((m,i)=>`<div class="contact-method"><small>${esc(local(m.label))}</small>${m.value?`<div class="contact-method-line">${m.href?`<a href="${esc(m.href)}">${esc(m.value)}</a>`:`<span>${esc(m.value)}</span>`}<button type="button" class="contact-copy" data-copy-method="${i}">${text('复制','Copy')}</button></div>`:`<span class="contact-pending">${text('邮箱地址待填写','Email to be added')}</span>`}</div>`).join('')}</div></div><div class="contact-qr-grid">${qrs.map(qrMarkup).join('')}</div></div><div class="contact-foot"><span>${text('QQ / 微信 · 直接联系','QQ / WeChat · Direct contact')}</span><span>${text('抖音 / 小红书 · 关注作品','Douyin / Xiaohongshu · Follow the work')}</span></div><span class="sr-only" id="contact-feedback" role="status" aria-live="polite"></span>`;
    contact.querySelectorAll('.qr-paper img').forEach(img=>img.addEventListener('error',()=>{const box=img.closest('.qr-paper');box.classList.add('is-empty');box.innerHTML=`<span class="qr-empty">${text('图片未找到<br>请检查路径','Image missing<br>Check file path')}</span>`}));
  }
  function renderSearch(query=''){
    search.innerHTML=top('THE PHOTOGRAPHIC ARCHIVE','search-title')+`<h2 class="search-title" id="search-title">${text('作品检索','Find a photograph.')}</h2><label class="search-field"><span aria-hidden="true">⌕</span><input type="search" autocomplete="off" spellcheck="false" aria-label="${text('搜索作品或系列','Search photographs or series')}" placeholder="${text('输入作品名、角色或系列名称','Search by title, character or series')}" value="${esc(query)}"></label><p id="search-status" class="search-status" role="status" aria-live="polite"></p><div class="search-results"></div>`;updateResults(query);
  }
  function updateResults(query){
    const needle=query.trim().toLocaleLowerCase();
    const found=works.filter(work=>{const s=series.find(item=>item.id===work.series);return[work.title,work.titleEn,work.description,work.descriptionEn,s?.zh,s?.en].filter(Boolean).join(' ').toLocaleLowerCase().includes(needle)});
    search.querySelector('#search-status').textContent=text(`找到 ${found.length} 幅作品`,`Found ${found.length} photograph${found.length===1?'':'s'}`);
    search.querySelector('.search-results').innerHTML=found.length?found.map(work=>`<button type="button" class="search-result" data-search-work="${esc(work.id)}"><img src="${esc(work.thumb||work.image)}" alt="${esc(Studio.name(work))}"><strong>${esc(Studio.name(work))}</strong><small>${esc(Studio.seriesName(series.find(s=>s.id===work.series)))}</small></button>`).join(''):`<div class="search-empty">${text('没有找到作品，试试其他名称或系列。','No photographs found. Try another name or series.')}</div>`;
  }
  async function prepareDialog(dialog){
    const ticket=++opening;
    dialogOrigin=document.activeElement;
    if(document.getElementById('directory').open)await Studio.closeMenu(false);
    for(const other of [contact,search])if(other!==dialog&&other.open)other.close();
    if(ticket!==opening)return false;
    if(dialog===contact)renderContact();else renderSearch();
    if(!dialog.open)dialog.showModal();
    (dialog.querySelector('input')||dialog.querySelector('[data-dialog-close]')).focus({preventScroll:true});
    return true;
  }
  function closeDialog(dialog){
    if(!dialog.open)return;opening++;dialog.close();
    if(dialogOrigin?.isConnected)dialogOrigin.focus({preventScroll:true});
  }
  function closePanels(){setThemeToolbar(false);for(const dialog of [contact,search])if(dialog.open)closeDialog(dialog);}
  async function openContact(){await prepareDialog(contact);}
  async function openSearch(){await prepareDialog(search);}
  for(const dialog of [contact,search]){
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog)});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog(dialog)}});
    dialog.addEventListener('click',event=>{
      if(event.target.closest('[data-dialog-close]'))closeDialog(dialog);
      else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(dialog);}
    });
  }
  search.addEventListener('input',event=>{if(event.target.matches('input'))updateResults(event.target.value)});
  search.addEventListener('click',event=>{const b=event.target.closest('[data-search-work]');if(b){closeDialog(search);Studio.openWork(b.dataset.searchWork);}});
  contact.addEventListener('click',async event=>{
    const b=event.target.closest('[data-copy-method]');if(!b)return;
    const value=window.PORTFOLIO_CONTACT.methods[Number(b.dataset.copyMethod)]?.value;if(!value)return;
    let copied=false;
    try{await navigator.clipboard.writeText(value);copied=true}catch{const field=document.createElement('textarea');field.value=value;field.style.cssText='position:fixed;left:-9999px;top:0';contact.append(field);field.select();try{copied=document.execCommand('copy')}catch{}field.remove()}
    b.textContent=copied?text('已复制','Copied'):text('请手动复制','Select to copy');
    contact.querySelector('#contact-feedback').textContent=b.textContent;
  });
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-glass-action],[data-studio-action]');if(!button)return;
    const action=button.dataset.glassAction||button.dataset.studioAction;
    if(action==='search')await openSearch();if(action==='contact')await openContact();
    if(action==='close')closeDock(true);
    if(action==='directory'){for(const d of [contact,search])if(d.open)d.close();Studio.openMenu();}
  });
  document.getElementById('menu-toggle')?.addEventListener('click',()=>closePanels(),true);
  const isBlank=target=>{
    if(!(target instanceof Element)||target.closest('#top-navigation,#contact-dialog,#search-dialog,.circular-carousel,.depth-carousel,.infinite-spiral,.drift-wall,.flex-carousel,canvas,a,button,input,select,textarea,label,img,svg,h1,h2,h3,p,small,span,dt,dd,figcaption'))return false;
    if(target.closest('#directory'))return target.id==='directory'||target.classList.contains('directory-body');
    return !!target.closest('#main,#photo-viewer')||target===document.body;
  };
  document.addEventListener('pointerdown',event=>{press=event.isPrimary&&event.button===0?{x:event.clientX,y:event.clientY,blank:isBlank(event.target)}:null},true);
  document.addEventListener('pointerup',event=>{const start=press;press=null;if(!start?.blank||!isBlank(event.target)||Math.hypot(event.clientX-start.x,event.clientY-start.y)>6||window.getSelection()?.toString())return;toggle()},true);
  document.addEventListener('pointercancel',()=>{press=null},true);
  document.addEventListener('studio:toggle-dock',()=>toggle());
  document.addEventListener('studio:language',refresh);
  window.addEventListener('hashchange',()=>closePanels());
  function homeInputAllowed(){return Studio.getState().base==='/'&&!Studio.getState().processing&&!document.querySelector('dialog[open]')}
  document.addEventListener('exhibit:home-input',event=>{
    if(!homeInputAllowed())return;
    const {source,delta}=event.detail;if(!delta)return;
    const now=performance.now(),direction=Math.sign(source==='wheel'?delta:-delta);
    if(source!==inputSource||direction!==inputDirection||now-lastInputAt>220)inputDistance=0;
    inputSource=source;inputDirection=direction;lastInputAt=now;
    if(now-lastGestureAt<650){inputDistance=0;return}
    inputDistance+=Math.abs(delta);
    if(inputDistance>=(source==='wheel'?40:Math.PI/18)){
      inputDistance=0;
      if(requestedVisible!==(direction>0)){lastGestureAt=now;toggle(direction>0)}
      else if(direction>0)clearTimeout(hideTimer);
    }
  });
  window.StudioGlass={toggle,closeDock,closePanels,openContact,openSearch,refresh,refreshData:()=>{if(search.open)updateResults(search.querySelector('input')?.value||'')},getState:()=>({dockOpen,requestedVisible,topHover,keyboardFocus,contactOpen:contact.open,searchOpen:search.open})};
  refresh();
})();
