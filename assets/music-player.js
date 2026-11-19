/* Public playback only; no library editing. */
(() => {
  'use strict';
  const header=document.querySelector('.site-header'),tools=header?.querySelector('.header-tools');
  if(!tools||document.getElementById('music-panel'))return;
  const DB_NAME='lingyi-music',STORE='tracks',SETTINGS='lingyi-music-settings-v1';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const iconPaths={note:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',play:'<path d="m9 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',prev:'<path d="M5 5v14m14-14L8 12l11 7Z"/>',next:'<path d="M19 5v14M5 5l11 7-11 7Z"/>',volume:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',muted:'<path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6"/>',repeat:'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',one:'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3m7-8 2-1v6"/>',shuffle:'<path d="m17 3 4 4-4 4M3 17l4-1 10-9h4M3 7l4 1 3 3m4 3 3 3h4m-4-4 4 4-4 4"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',plus:'<path d="M12 5v14M5 12h14"/>',drag:'<path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>'};
  const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]}</svg>`;
  const lang=()=>window.Studio?.getLanguage()==='en'?'en':'zh';
  const t=(zh,en)=>lang()==='en'?en:zh;
  const modes=['list','one','shuffle'];
  let saved={};try{saved=JSON.parse(localStorage.getItem(SETTINGS)||'{}')||{}}catch{}
  const audio=new Audio();audio.preload='metadata';
  audio.volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.65;audio.muted=!!saved.muted;
  let tracks=[],currentId=null,mode=modes.includes(saved.mode)?saved.mode:'list',loading=true;
  let projectStore=null,legacy=[],configured=false,signature='',managing=false,admin=null,adminBusy=false;
  const surfaces=[];
  let expanded=false,animation=null,loadToken=0,activeUrl=null,queue=Promise.resolve(),dragId=null,dragDepth=0,positionFrame=0;
  let volumeFrame=0,timeFrame=0,volumeGoal=audio.volume,previousIds=[];
  // A temporary piano interruption is distinct from the listener's pause intent.
  let pianoTimer=0,pianoResumeId=null,pianoHolding=false,pianoUntil=0,playbackEpoch=0;
  let buffering=false;
  const playbackState=()=>({currentId,playing:!audio.paused&&!audio.ended,
    currentTime:audio.currentTime||0,seeking:audio.seeking,buffering,
    pianoHolding,pianoPending:!!pianoResumeId,resumeAt:pianoUntil});
  function notifyPlayback(){document.dispatchEvent(new CustomEvent('studio:music-playback',{detail:playbackState()}))}
  function clearPianoResume(){clearTimeout(pianoTimer);pianoTimer=0;pianoResumeId=null;pianoUntil=0;pianoHolding=false;}
  function explicitPlayback(){++playbackEpoch;clearPianoResume();notifyPlayback()}
  function pause(){explicitPlayback();audio.pause();paint();notifyPlayback()}
  function beginPiano(){
    clearTimeout(pianoTimer);pianoTimer=0;pianoUntil=0;pianoHolding=true;
    if(!audio.paused&&!audio.ended)pianoResumeId=currentId;
    audio.pause();paint();notifyPlayback();
  }
  function endPiano(){
    if(!pianoHolding)return;pianoHolding=false;
    if(!pianoResumeId){notifyPlayback();return}
    const epoch=playbackEpoch,id=pianoResumeId;pianoUntil=performance.now()+3000;
    pianoTimer=setTimeout(async()=>{
      pianoTimer=0;
      if(epoch!==playbackEpoch||pianoHolding||id!==currentId||pianoResumeId!==id)return;
      clearPianoResume();notifyPlayback();
      // Resume the same media element and position. Never restart a manually
      // paused song or replace a more recent track / playback decision.
      await play(false);
    },3000);
    notifyPlayback();
  }
  const dock=document.createElement('div');dock.className='music-dock';
  dock.innerHTML=`<button class="music-capsule" id="music-toggle" type="button" aria-expanded="false" aria-controls="music-panel">${svg('note')}</button>`;
  tools.append(dock);
  const toggle=dock.firstElementChild;
  const panel=document.createElement('section');panel.id='music-panel';panel.className='music-panel';panel.setAttribute('popover','manual');panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','music-title');panel.tabIndex=-1;
  // Both surfaces are built from the same template; playback belongs to the single Audio above.
  function markup(){
    const control=(name,icon,extra='')=>`<button type="button" class="music-button ${extra}" data-music="${name}">${icon?svg(icon):''}</button>`;
    return `<div class="music-top"><div><p class="music-eyebrow">SOUND / PLAYLIST</p><h2 id="music-title"></h2></div>${control('close','close')}</div><p class="music-now" id="music-now"></p><div class="music-seek"><input type="range" id="music-seek" min="0" max="0" step="0.1" value="0"><div class="music-time"><span id="music-elapsed">0:00</span><span id="music-duration">0:00</span></div></div><div class="music-transport">${control('prev','prev')}${control('play','play','music-play')}${control('next','next')}</div><div class="music-volume-row">${control('mute','volume')}<input type="range" id="music-volume" min="0" max="1" step="0.01">${control('mode','','music-mode')}</div><div class="music-list-head"><span id="music-count"></span></div><ol class="music-playlist" id="music-playlist"></ol><p class="music-empty" id="music-empty"></p><p class="music-status" id="music-status" role="status" aria-live="polite"></p>`;
  }
  panel.innerHTML=markup();document.body.append(panel);
  const pianoControls=document.createElement('section');pianoControls.className='music-scene-controls';
  pianoControls.setAttribute('aria-labelledby','music-piano-title');
  pianoControls.innerHTML='<h3 id="music-piano-title"></h3><div class="music-scene-actions"></div><p class="music-scene-status" role="status" aria-live="polite"></p>';
  pianoControls.hidden=true;panel.append(pianoControls);
  function syncPianoControls(){
    const actions=pianoControls.querySelector('.music-scene-actions');
    // Move the original controls with their listeners intact. Playback stays on one Audio.
    const follow=document.querySelector('[data-piano-mode="auto"]');
    for(const node of [follow,document.getElementById('piano-sound-button'),document.getElementById('piano-host-button')]){
      if(node&&node.parentElement!==actions){node.classList.add('music-button');actions.append(node);}
    }
    pianoControls.hidden=false;
    pianoControls.querySelector('h3').textContent=t('首页钢琴','Homepage piano');
    const sound=document.getElementById('piano-sound-button');
    if(!window.PianoArchive){
      if(follow)follow.disabled=true;if(sound)sound.disabled=true;
      pianoControls.querySelector('.music-scene-status').textContent=t('正在准备首页钢琴…','Preparing the homepage piano…');return;
    }
    if(sound)sound.disabled=false;
    const scene=PianoArchive.getState();
    const status=scene.followingMusic?t('随音乐演奏 · 钢琴不额外发声','Following music · automatic piano is silent')
      :pianoResumeId?t('手动演奏中断音乐 · 停止后三秒恢复','Music interrupted by piano · resumes after 3 seconds')
      :scene.mode==='browse'?t('正在浏览档案，演奏暂停','Browsing archives · performance paused')
      :t('播放音乐后，小人随之演奏','Play music to animate the pianist');
    pianoControls.querySelector('.music-scene-status').textContent=status;
    if(sound)sound.title=t('手动钢琴：','Manual piano: ')+(scene.sound?t('声音开启','sound on'):t('静音','muted'));
    if(follow){follow.disabled=!tracks.length||loading;follow.title=tracks.length?t('播放音乐并跟随演奏','Play music and perform'):t('暂无音乐','No music yet');}
  }
  document.addEventListener('exhibit:ready',syncPianoControls);
  document.addEventListener('piano:controls-change',syncPianoControls);
  document.addEventListener('studio:music-playback',syncPianoControls);
  function surface(node){const value={node,$:id=>node.querySelector('#music-'+id),button:name=>node.querySelector(`[data-music="${name}"]`)};surfaces.push(value);bindPlayback(value);return value;}
  const publicUI=surface(panel),$=publicUI.$,button=publicUI.button;
  const current=()=>tracks.find(track=>track.id===currentId);
  const format=seconds=>Number.isFinite(seconds)&&seconds>=0?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'—:—';
  function message(zh,en){for(const ui of surfaces)ui.$('status').textContent=t(zh,en)}
  function save(){try{localStorage.setItem(SETTINGS,JSON.stringify({order:saved.order,currentId,volume:volumeGoal,muted:audio.muted,mode}))}catch{}}
  function renderList(){for(const ui of surfaces){const fragment=document.createDocumentFragment();for(const track of tracks){const row=document.createElement('li');row.className='music-track';row.dataset.id=track.id;row.dataset.current=String(track.id===currentId);row.innerHTML='<button type="button" class="music-track-name" data-music-track><strong></strong><small></small></button>';row.querySelector('strong').textContent=track.title;row.querySelector('small').textContent=format(track.duration);const name=row.firstElementChild;name.setAttribute('aria-label',t('播放：','Play: ')+track.title);name.setAttribute('aria-current',String(track.id===currentId));fragment.append(row)}ui.$('playlist').replaceChildren(fragment);ui.$('empty').hidden=tracks.length>0;ui.$('count').textContent=t(`歌单 · ${tracks.length} 首`,`Playlist · ${tracks.length}`)}}
  function paintTime(){
    const duration=Number.isFinite(audio.duration)?audio.duration:current()?.duration||0;
    for(const ui of surfaces){
      const seek=ui.$('seek');seek.max=duration;seek.disabled=!current()||!duration;
      if(!ui.seeking){seek.value=audio.currentTime||0;ui.$('elapsed').textContent=format(audio.currentTime||0)}
      ui.$('duration').textContent=format(duration);
    }
  }
  function visible(){return expanded}
  function progressFrame(){timeFrame=0;if(!visible()||audio.paused||document.hidden)return;paintTime();timeFrame=requestAnimationFrame(progressFrame)}
  function paint(){
    const playing=!audio.paused&&!audio.ended,pending=!!pianoResumeId;toggle.dataset.playing=String(playing);
    toggle.title=t('音乐播放器','Music player')+(current()?' · '+current().title:'');toggle.setAttribute('aria-label',toggle.title);
    for(const ui of surfaces){
      ui.button('play').innerHTML=svg(playing||pending?'pause':'play');ui.button('play').setAttribute('aria-label',pending?t('暂停，不自动恢复','Pause; cancel automatic resume'):playing?t('暂停','Pause'):t('播放','Play'));
      for(const name of ['play','prev','next'])ui.button(name).disabled=!tracks.length||loading;
      ui.$('now').textContent=current()?.title||t('暂无音乐','No music yet');
      ui.button('mute').innerHTML=svg(audio.muted||volumeGoal===0?'muted':'volume');ui.button('mute').setAttribute('aria-pressed',String(audio.muted));ui.button('mute').setAttribute('aria-label',audio.muted?t('取消静音','Unmute'):t('静音','Mute'));
      if(document.activeElement!==ui.$('volume'))ui.$('volume').value=volumeGoal;
      const name={list:t('列表循环','Repeat all'),one:t('单曲循环','Repeat one'),shuffle:t('随机播放','Shuffle')}[mode];
      ui.button('mode').innerHTML=svg({list:'repeat',one:'one',shuffle:'shuffle'}[mode])+`<span>${name}</span>`;ui.button('mode').title=t('播放模式：','Playback mode: ')+name;ui.button('mode').setAttribute('aria-label',ui.button('mode').title);ui.button('mode').dataset.mode=mode;
    }
    audio.loop=mode==='one';paintTime();syncPianoControls();
    if(visible()&&playing&&!timeFrame)timeFrame=requestAnimationFrame(progressFrame);
  }
  function translate(){for(const ui of surfaces){ui.$('title').textContent=t('音乐播放器','Music player');ui.$('empty').textContent=t('暂无音乐','No music yet');ui.button('close').setAttribute('aria-label',t('收起播放器','Collapse player'));ui.button('prev').setAttribute('aria-label',t('上一首','Previous track'));ui.button('next').setAttribute('aria-label',t('下一首','Next track'));ui.$('seek').setAttribute('aria-label',t('播放进度','Playback position'));ui.$('volume').setAttribute('aria-label',t('音量','Volume'));ui.$('playlist').setAttribute('aria-label',t('歌单','Playlist'))}renderList();paint()}
  function position(){
    positionFrame=0;if(!expanded)return;
    const rect=toggle.getBoundingClientRect(),width=Math.min(374,innerWidth-24);
    panel.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right-width))+'px';
    const y=Math.min(Math.max(rect.bottom+12,header.getBoundingClientRect().bottom+10),innerHeight-160);panel.style.top=Math.max(12,y)+'px';panel.style.maxHeight=Math.max(120,innerHeight-y-12)+'px';
  }
  function fit(){
    // Remove only this module from the flex row if it would crowd the existing tools.
    dock.removeAttribute('data-detached');
    const h=header.getBoundingClientRect(),tRect=tools.getBoundingClientRect();
    if(tRect.right>h.right-6||tools.scrollWidth>tools.clientWidth+2||header.scrollWidth>header.clientWidth+2)dock.dataset.detached='';
    if(!positionFrame)positionFrame=requestAnimationFrame(position);
  }
  function expand(value,focus=false){
    if(value===expanded)return;expanded=value;animation?.cancel();toggle.setAttribute('aria-expanded',String(value));
    if(value){
      const parent=header.closest('dialog')||document.body;if(panel.parentElement!==parent)parent.append(panel);
      panel.showPopover();position();
      animation=panel.animate([{opacity:0,transform:'translateY(-7px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:reduced.matches?0:300,easing:'cubic-bezier(.22,1,.36,1)'});
      if(focus)button('close').focus({preventScroll:true});
      paint();
    }else{
      cancelAnimationFrame(timeFrame);timeFrame=0;
      const closing=panel.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-5px) scale(.98)'}],{duration:reduced.matches?0:260,easing:'ease-out',fill:'forwards'});animation=closing;
      closing.finished.then(()=>{if(!expanded)panel.hidePopover();closing.cancel()}).catch(()=>{});
      if(focus)toggle.focus({preventScroll:true});
    }
  }
  async function play(explicit=true){
    if(explicit)explicitPlayback();
    if(!current()&&tracks.length){await select(tracks[0].id,true);return}
    try{await audio.play()}catch(e){if(e.name!=='AbortError')message('无法播放这首音乐，请检查文件格式或重新选择文件。','This track could not be played. Check its format or select the file again.')}
    paint();notifyPlayback();
  }
  function unload(){explicitPlayback();buffering=false;audio.pause();audio.removeAttribute('src');audio.load();if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null}}
  async function select(id,autoplay=false,remember=true){
    if(!tracks.some(track=>track.id===id))return;
    if(id===currentId&&audio.hasAttribute('src')){if(autoplay)await play();return}
    const ticket=++loadToken;if(remember&&currentId&&currentId!==id)previousIds.push(currentId);
    unload();currentId=id;paint();renderList();save();
    try{
      const track=current();
      if(track.src)audio.src=projectStore?.url(track.src)||track.src;
      else {const record=legacy.find(item=>item.id===id);if(!record?.blob)throw Error('Missing audio');activeUrl=URL.createObjectURL(record.blob);audio.src=activeUrl}
      if(ticket!==loadToken)return;
      audio.load();if(autoplay)await play();
    }catch{if(ticket===loadToken)message('无法读取音频，请检查音乐文件。','The audio could not be read. Check the music file.')}
  }
  async function next(direction=1){
    if(!tracks.length)return;
    let id;
    if(mode==='shuffle'&&direction<0){while(previousIds.length&&!id){const previous=previousIds.pop();if(tracks.some(track=>track.id===previous))id=previous}}
    if(!id&&mode==='shuffle'&&direction>0){const pool=tracks.filter(track=>track.id!==currentId);id=(pool.length?pool:tracks)[Math.floor(Math.random()*(pool.length||tracks.length))].id}
    if(!id){const at=tracks.findIndex(track=>track.id===currentId);id=tracks[(Math.max(0,at)+direction+tracks.length)%tracks.length].id}
    if(id===currentId){audio.currentTime=0;await play()}else await select(id,true,direction>0);
  }
  function syncStore(next){
    const nextConfigured=next.musicConfigured===true;
    const items=nextConfigured?(Array.isArray(next.music)?next.music:[]):legacy.map(({blob,...meta})=>meta);
    const key=JSON.stringify([nextConfigured,items]);if(key===signature)return;
    const before=current();configured=nextConfigured;signature=key;tracks=items.map(track=>({...track}));
    previousIds=previousIds.filter(id=>tracks.some(track=>track.id===id));
    const after=current();
    if(!after||(before?.src&&before.src!==after.src)){
      ++loadToken;unload();currentId=null;
      const id=tracks.some(track=>track.id===saved.currentId)?saved.currentId:tracks[0]?.id;
      if(id)void select(id,false,false);
    }
    renderList();paint();document.dispatchEvent(new CustomEvent('studio:musicchange',{detail:{tracks:tracks.map(track=>({...track}))}}));
  }
  function rampVolume(){
    const difference=volumeGoal-audio.volume;
    if(Math.abs(difference)<.002||reduced.matches){audio.volume=volumeGoal;volumeFrame=0;return}
    audio.volume+=difference*.32;volumeFrame=requestAnimationFrame(rampVolume);
  }
  function bindPlayback(ui){
    ui.node.addEventListener('click',event=>{
      const action=event.target.closest('[data-music]')?.dataset.music;
      if(action==='close')expand(false,true);
      if(action==='play'){if(!audio.paused||pianoResumeId)pause();else void play()}
      if(action==='next')void next(1);if(action==='prev')void next(-1);
      if(action==='mute'){audio.muted=!audio.muted;save();paint()}
      if(action==='mode'){mode=modes[(modes.indexOf(mode)+1)%modes.length];save();paint()}
      const target=event.target.closest('[data-music-track]');if(target)void select(target.closest('[data-id]').dataset.id,true);
    });
    const seek=ui.$('seek'),volume=ui.$('volume');
    seek.addEventListener('input',()=>{ui.seeking=true;ui.$('elapsed').textContent=format(Number(seek.value));if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,Number(seek.value));for(const other of surfaces)if(other!==ui)other.$('seek').value=seek.value});
    for(const type of ['change','blur','pointercancel'])seek.addEventListener(type,()=>{ui.seeking=false;paintTime()});
    volume.addEventListener('input',()=>{volumeGoal=Number(volume.value);audio.muted=false;if(!volumeFrame)volumeFrame=requestAnimationFrame(rampVolume);for(const other of surfaces)if(other!==ui)other.$('volume').value=volumeGoal;save();paint()});
  }
  toggle.addEventListener('click',()=>expand(!expanded));
  panel.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();expand(false,true)}});
  panel.addEventListener('pointermove',event=>event.stopPropagation());
  document.addEventListener('pointerdown',event=>{if(expanded&&!panel.contains(event.target)&&!dock.contains(event.target))expand(false)},true);
  // Discard dropped files here: only the owner section has an import/drop path.
  for(const node of [panel,dock])for(const type of ['dragover','drop'])node.addEventListener(type,event=>{if(Array.from(event.dataTransfer?.types||[]).includes('Files')){event.preventDefault();event.stopPropagation();if(event.dataTransfer)event.dataTransfer.dropEffect='none'}});
  for(const event of ['play','playing','pause','ended','loadedmetadata','durationchange','waiting','seeking','seeked','error'])audio.addEventListener(event,()=>{
    if(event==='waiting')buffering=true;
    if(['playing','pause','ended','loadedmetadata','seeked','error'].includes(event))buffering=false;
    if(event==='error')clearPianoResume();
    paint();notifyPlayback();
  });
  audio.addEventListener('timeupdate',()=>{if(visible())paintTime()});
  audio.addEventListener('ended',()=>{if(mode!=='one')void next(1)});
  audio.addEventListener('error',()=>{if(audio.hasAttribute('src'))message('这首音乐无法解码，请检查音频文件。','This track could not be decoded. Check the audio file.')});
  const resize=new ResizeObserver(()=>requestAnimationFrame(fit));resize.observe(header);
  const modalObserver=new MutationObserver(records=>{if(records.some(record=>record.target instanceof HTMLDialogElement&&record.target.open))expand(false)});modalObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);document.addEventListener('studio:language',()=>{translate();fit()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(timeFrame);timeFrame=0}else paint()});
  window.addEventListener('pagehide',()=>{save();++loadToken;explicitPlayback();audio.pause();if(activeUrl)URL.revokeObjectURL(activeUrl);cancelAnimationFrame(volumeFrame)},{once:true});
  async function initialize(){
    projectStore=window.PortfolioStore||null;
    if(projectStore)await projectStore.ready;
    loading=false;syncStore(projectStore?.getState()||{});projectStore?.onChange(syncStore);translate();
  }
  translate();fit();const initialized=initialize();
  window.StudioMusic=Object.freeze({
    ready:initialized,
    getState:()=>({tracks:tracks.map(track=>({...track})),...playbackState(),expanded,managing,mode,volume:volumeGoal,muted:audio.muted,musicConfigured:configured,loading,editing:adminBusy}),
    getPlaybackState:playbackState,play,pause,beginPiano,endPiano,
    close:()=>expand(false)
  });
})();
