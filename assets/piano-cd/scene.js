/* Code-built material study. Studio reflections and textures are generated locally. */
(async () => {
  'use strict';
  const modules = await window.PianoModulesReady;
  await window.PortfolioStore?.ready;
  const { THREE, RoomEnvironment, HDRLoader }=modules;
  const $ = id => document.getElementById(id === 'scene' ? 'scroll-canvas' : 'piano-' + id);
  const canvas = $('scene'), stage = $('stage');
  const reducedPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = reducedPreference.matches;
  // Keep authored transition durations in wall-clock time even when a software GPU drops frames.

  const mod = (n, d) => ((n % d) + d) % d;
  const root=document.getElementById('home-view');
  const l=(zh,en)=>window.Studio?.getLanguage()==='en'?en:zh;
  let records=[];
  function readRecords(){records=(window.PORTFOLIO_WORKS||[]).map((work,i)=>{const s=(window.STUDIO_SERIES||[]).find(s=>s.id===work.series);const si=Math.max(0,(window.STUDIO_SERIES||[]).indexOf(s));return {...work,code:String(i+1).padStart(3,'0'),category:si%3,seriesLabel:s?Studio.seriesName(s):'',medium:s?Studio.local(s.method):''};});}
  readRecords();
  const palettes = [
    { name:'ICE / 冰蓝', color:0x9cc9e5, edge:0x719eb7, light:0x86bde2, css:'#6f9db7' },
    { name:'CELADON / 浅绿', color:0xb4d5c3, edge:0x7d9e8b, light:0xa9d5b8, css:'#7e9e88' },
    { name:'AMBER / 琥珀', color:0xe5c78c, edge:0xb49963, light:0xe5bf6f, css:'#b39354' }
  ];
  const state = { mode: 'auto', paused: reduced, sound: false, selected: false, detail: false,
    busy: false, pixel: false, resting: false, note: null };
  const travel = { value: 0 }, select = { value: 0 }, lid = { value: 0 }, detailShift = { value: 0 };
  let target = 0, autoIndex = 0, nextBeat = 0, clockTime = 0, lastFrame = performance.now();
  let hostTimeline, scrollTween, selectedTween, openTimeline, drag = null, lastWheel = 0;
  const pulses = [], keys = [], hitTargets = [], materials = new Set();
  const keyNames = ['C4', 'C♯4', 'D4', 'D♯4', 'E4', 'F4', 'F♯4', 'G4', 'G♯4', 'A4', 'A♯4', 'B4', 'C5'];
  const natural = [0, 2, 4, 5, 7, 9, 11, 12];
  const keyMap = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12 };
  const melody = [0,0,7,7,9,9,[7,2],5,5,4,4,2,2,[0,2],7,7,5,5,4,4,[2,2],7,7,5,5,4,4,[2,2],0,0,7,7,9,9,[7,2],5,5,4,4,2,2,[0,3]];
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    $('loading').textContent = '3D 初始化失败。请用开启硬件加速的 Edge / Chrome 打开。';
    throw err;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background=new THREE.Color(0xf5f5f0);
  const camera = new THREE.OrthographicCamera(-16, 16, 7, -7, .1, 100);
  camera.position.set(3.6, 14, 27); camera.lookAt(0, 1.8, .7);
  scene.add(new THREE.HemisphereLight(0xeef4ff, 0xb8b2a3, .48));
  const light = new THREE.DirectionalLight(0xfff6e5, 1.7);
  light.position.set(-8, 19, 10); light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -21, right: 21, top: 15, bottom: -15, near: .1, far: 65 });
  light.shadow.normalBias = .025; light.shadow.bias = -.0001;light.shadow.radius=4;
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xdceaff, .55); fill.position.set(9, 7, 11); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xf4f8ff, 1.5);rim.position.set(1,9,-9);scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ color: 0x69695f, opacity: .13 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.12; ground.receiveShadow = true; scene.add(ground);
  // Actual HDR reflection environment: broad softboxes, a narrow rear strip, and a dark flag.
  // These are used only by the renderer, never shown as objects in the interface.
  const studio = new THREE.Scene();studio.background=new THREE.Color(0x89949f);
  function softbox(w,h,x,y,z,color,intensity) {
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({
      color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide,toneMapped:false
    }));mesh.position.set(x,y,z);mesh.lookAt(0,2,0);studio.add(mesh);
  }
  softbox(10,7,-8,12,5,0xfff4e5,2.2);
  softbox(3,12,10,6,4,0xe8f2ff,1.6);
  softbox(21,1.4,1,9,-8,0xe7f0ff,3.5);
  softbox(16,12,0,17,0,0xffffff,1.2);
  softbox(8,2.1,-10,-3.5,1,0xf5f9ff,1.8);
  softbox(12,3,0,4,-12,0xffffff,2.5);
  softbox(3.2,12,-12,4,0,0x10151c,.7);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(studio,.035,.1,80);
  scene.environment=environment.texture;
  studio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});pmrem.dispose();
  // CD-only environment: preserve the existing instrument, character and studio lighting.
  const cdPmrem=new THREE.PMREMGenerator(renderer),cdMaterials=new Set();
  const room=new RoomEnvironment();
  let cdEnvironment=cdPmrem.fromScene(room,.04),cdEnvironmentName='RoomEnvironment';
  room.dispose();
  function cdMaterial(m) {
    m.envMap=cdEnvironment.texture;
    if(m.envMapRotation)m.envMapRotation.z=-.72;
    cdMaterials.add(m);return m;
  }
  function mat(color, roughness = .5, metalness = .1) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.add(m); return m;
  }
  function physical(options) {
    const m=new THREE.MeshPhysicalMaterial(options);materials.add(m);return m;
  }
  // Instrument-only reflection studio. Its long rear cards are placed along the reflected
  // viewing direction of the keys, so the bevels and polish read without relighting the CDs.
  const pianoStudio=new THREE.Scene();pianoStudio.background=new THREE.Color(0x727b85);
  function instrumentBox(w,h,x,y,z,intensity,color=0xffffff,roll=0){
    const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));
    p.position.set(x,y,z);p.lookAt(0,0,0);p.rotateZ(roll);pianoStudio.add(p);
  }
  instrumentBox(13,3,-3,8.5,-10,2.5,0xfff5e6,-.12);
  instrumentBox(13,.75,0,4.7,-10,3.6,0xffffff,-.10);
  instrumentBox(3,11,10,6,2,2.1,0xe8f2ff);
  instrumentBox(9,7,-8,10,5,2.0,0xfff6e9);
  instrumentBox(4,7,6,3,-8,.045,0x131a22);
  instrumentBox(15,9,0,14,0,1.3);
  const pianoPmrem=new THREE.PMREMGenerator(renderer),pianoEnvironment=pianoPmrem.fromScene(pianoStudio,.025);
  pianoStudio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});pianoPmrem.dispose();
  const pianoMaterials=new Set();
  function instrument(m){m.envMap=pianoEnvironment.texture;pianoMaterials.add(m);return m;}
  // Separate albedo, roughness and microscopic height fields. All data maps remain linear;
  // only the subtle pigment map is sRGB. Texture directions follow physical surface units.
  function surfaceMaps(kind,seed){
    const w=1024,h=512,canvases=[0,1,2].map(()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});
    const contexts=canvases.map(c=>c.getContext('2d')),data=contexts.map(c=>c.createImageData(w,h));
    let random=seed>>>0;const rowNoise=new Float32Array(h),colNoise=new Float32Array(w);
    const rnd=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
    for(let y=0;y<h;y++)rowNoise[y]=rnd()-.5;for(let x=0;x<w;x++)colNoise[x]=rnd()-.5;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,n=rnd()-.5,broad=Math.sin(x*.024+y*.017)*.5+Math.sin(y*.071-x*.008)*.25;
      let pigment=249,height=128,roughness=210;
      if(kind==='enamel'){pigment=248+n*3+broad*1.5;height=128+n*17+broad*2;roughness=204+n*16+broad*9;}
      if(kind==='resin'){const fibre=colNoise[x]*.6+Math.sin(x*.047+Math.sin(y*.009)*1.4)*.22; pigment=251+fibre*2+n; height=128+fibre*7+n*3;roughness=192+fibre*13+n*5;}
      if(kind==='satin'){const grain=colNoise[x]*18+Math.sin(x*.035+Math.sin(y*.008)*2)*4; pigment=247+grain*.20+n*2;height=128+grain*.65+n*5;roughness=201+grain*.6+n*8;}
      if(kind==='metal'){const brush=rowNoise[y]*33+Math.sin(y*1.65)*4; pigment=249+brush*.11;height=128+brush*.6+n*3;roughness=201+brush*.65+n*4;}
      if(kind==='felt'){const weave=Math.sin(x*1.9)*Math.sin(y*1.9);pigment=241+n*9+weave*3;height=128+n*23+weave*13;roughness=243+n*9;}
      for(let channel=0;channel<3;channel++){data[0].data[i+channel]=pigment;data[1].data[i+channel]=roughness;data[2].data[i+channel]=height;}
      data[0].data[i+3]=data[1].data[i+3]=data[2].data[i+3]=255;
    }
    const textures=canvases.map((c,i)=>{contexts[i].putImageData(data[i],0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;});
    textures[0].colorSpace=THREE.SRGBColorSpace;
    return {map:textures[0],roughnessMap:textures[1],bumpMap:textures[2]};
  }
  const enamelMaps=surfaceMaps('enamel',1348),resinMaps=surfaceMaps('resin',7351),satinMaps=surfaceMaps('satin',1852),metalMaps=surfaceMaps('metal',9763),feltMaps=surfaceMaps('felt',5147);
  const ivory=instrument(physical({color:0xe3ddcf,metalness:.06,roughness:.34,clearcoat:.72,clearcoatRoughness:.16,
    envMapIntensity:.85,bumpScale:.006,...enamelMaps}));
  const housingSides=instrument(physical({color:0xd6d0c4,metalness:.08,roughness:.38,clearcoat:.58,clearcoatRoughness:.20,
    envMapIntensity:.75,bumpScale:.005,...enamelMaps}));
  const white=instrument(physical({color:0xf8f3e6,metalness:0,roughness:.20,ior:1.48,clearcoat:.92,clearcoatRoughness:.09,
    envMapIntensity:.85,bumpScale:.0028,...resinMaps}));
  const keySides=instrument(physical({color:0xe8e2d4,metalness:0,roughness:.31,clearcoat:.45,clearcoatRoughness:.19,
    envMapIntensity:.65,bumpScale:.003,...resinMaps}));
  const black=instrument(physical({color:0x171b1d,metalness:.025,roughness:.29,clearcoat:.26,clearcoatRoughness:.15,
    specularIntensity:.78,envMapIntensity:.70,bumpScale:.005,...satinMaps}));
  const blackSides=instrument(physical({color:0x111416,metalness:.025,roughness:.34,clearcoat:.28,clearcoatRoughness:.20,
    envMapIntensity:.85,bumpScale:.004,...satinMaps}));
  const under=instrument(physical({color:0x555c5a,metalness:.22,roughness:.49,clearcoat:.1,envMapIntensity:.65,bumpScale:.005,...enamelMaps}));
  const keybed=instrument(physical({color:0x151a18,metalness:0,roughness:.88,sheen:.42,sheenColor:0x535a4c,sheenRoughness:.92,
    envMapIntensity:.35,bumpScale:.011,...feltMaps}));
  const rearRail=instrument(physical({color:0x333b3c,metalness:.78,roughness:.37,clearcoat:.12,envMapIntensity:.8,bumpScale:.003,...metalMaps}));
  const restSurface=instrument(physical({color:0xa8afa4,metalness:0,roughness:.78,envMapIntensity:.45,bumpScale:.009,...feltMaps}));
  const trim=instrument(physical({color:0xc7cbd0,metalness:1,roughness:.28,anisotropy:.75,envMapIntensity:1.05,bumpScale:.0025,...metalMaps}));
  const rubber=instrument(physical({color:0x303632,metalness:0,roughness:.88,envMapIntensity:.3,bumpScale:.008,...feltMaps}));
  const ink = mat(0x252a26,.46);
  const gray = mat(0xaab2ac,.36,.18), edge = mat(0x79847c,.5,.15);
  const yellow = mat(0xc7ac37,.42,.14), trayMat = mat(0xc4cac3);
  const gold=cdMaterial(physical({color:0xd6a441,metalness:1,roughness:.15,iridescence:1,
    iridescenceIOR:1.5,iridescenceThicknessRange:[100,400],envMapIntensity:1.5,side:THREE.DoubleSide}));
  const grooves=document.createElement('canvas');grooves.width=grooves.height=1024;
  const groovesContext=grooves.getContext('2d'),groovesImage=groovesContext.createImageData(1024,1024);
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const r=Math.hypot(x-512,y-512),i=(y*1024+x)*4;
    const value=128+Math.sin(r*2.65)*22+Math.sin(r*8.3)*6;
    groovesImage.data[i]=groovesImage.data[i+1]=groovesImage.data[i+2]=value;groovesImage.data[i+3]=255;
  }
  groovesContext.putImageData(groovesImage,0,0);
  gold.bumpMap=new THREE.CanvasTexture(grooves);gold.bumpScale=.005;
  // Radial brush direction and a restrained spectral base give a flat optical disc its
  // characteristic wedges; the environment still supplies the moving specular response.
  const brushed=document.createElement('canvas'),directions=document.createElement('canvas');
  brushed.width=brushed.height=directions.width=directions.height=512;
  const bc=brushed.getContext('2d'),dc=directions.getContext('2d');
  const bi=bc.createImageData(512,512),di=dc.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const a=Math.atan2(y-256,x-256),r=Math.hypot(x-256,y-256),i=(y*512+x)*4;
    const bright=Math.pow(Math.abs(Math.cos(a+.48)),12),dark=Math.pow(Math.abs(Math.sin(a+.48)),5);
    const v=236+bright*19-dark*35+Math.sin(r*3.8)*2;
    bi.data[i]=v*(1+.025*Math.sin(a*3));bi.data[i+1]=v*(1+.025*Math.sin(a*3+2));bi.data[i+2]=v*(1+.035*Math.sin(a*3+4));bi.data[i+3]=255;
    di.data[i]=(Math.cos(a)*.5+.5)*255;di.data[i+1]=(Math.sin(a)*.5+.5)*255;di.data[i+2]=255;di.data[i+3]=255;
  }
  bc.putImageData(bi,0,0);dc.putImageData(di,0,0);
  gold.map=new THREE.CanvasTexture(brushed);gold.map.colorSpace=THREE.SRGBColorSpace;
  gold.anisotropy=.45;gold.anisotropyMap=new THREE.CanvasTexture(directions);
  // Keep the requested 100–400nm range, while the procedural coating varies within its
  // warm-gold portion instead of leaving every pixel at the green 400nm endpoint.
  const coating=document.createElement('canvas');coating.width=coating.height=512;
  const cc=coating.getContext('2d'),ci=cc.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const r=Math.hypot(x-256,y-256),a=Math.atan2(y-256,x-256),i=(y*512+x)*4;
    const v=108+10*Math.sin(r*.035)+6*Math.cos(a*2);
    ci.data[i]=ci.data[i+1]=ci.data[i+2]=v;ci.data[i+3]=255;
  }
  cc.putImageData(ci,0,0);gold.iridescenceThicknessMap=new THREE.CanvasTexture(coating);
  const hubMetal=cdMaterial(mat(0xc9ced3,.25,1));hubMetal.envMapIntensity=1.4;
  const patterns=[gold,gold,gold];
  const pale = mat(0xdadcd4), cloth = mat(0x485043,.85), skin = mat(0xd2cfc0,.85);
  const clearPlastic=cdMaterial(physical({color:0xffffff,metalness:0,roughness:.05,transmission:1,ior:1.5,
    thickness:.11,clearcoat:.5,clearcoatRoughness:.045,envMapIntensity:.8,side:THREE.DoubleSide,transparent:true}));
  clearPlastic.forceSinglePass=true;
  // Thin optical front window; the thicker sidewalls retain the original glass.
  // A .5-unit refraction slab over printed imagery makes portraits look frosted.
  const lidWindow=cdMaterial(physical({color:0xffffff,metalness:0,roughness:.015,
    transmission:0,opacity:.085,depthWrite:false,ior:1.49,thickness:.045,clearcoat:.3,clearcoatRoughness:.03,
    envMapIntensity:.65,side:THREE.DoubleSide,transparent:true}));
  lidWindow.forceSinglePass=true;
  const glassSets=palettes.map(p=>({
    pane:lidWindow,back:lidWindow,frame:clearPlastic,selected:clearPlastic,tray:clearPlastic,
    tab:mat(p.edge,.34,.30)
  }));
  // Bundled HDR works from file://. A failed parse retains RoomEnvironment.
  try {
    const bytes=Uint8Array.from(atob(modules.hdr),c=>c.charCodeAt(0));
    const parsed=new HDRLoader().parse(bytes.buffer);
    const hdr=new THREE.DataTexture(parsed.data,parsed.width,parsed.height,THREE.RGBAFormat,parsed.type);
    hdr.colorSpace=THREE.LinearSRGBColorSpace;hdr.minFilter=hdr.magFilter=THREE.LinearFilter;
    hdr.generateMipmaps=false;hdr.flipY=true;hdr.needsUpdate=true;
    const next=cdPmrem.fromEquirectangular(hdr),old=cdEnvironment;
    cdEnvironment=next;cdEnvironmentName='studio_small_03_1k';
    cdMaterials.forEach(m=>{m.envMap=next.texture;m.needsUpdate=true;});old.dispose();hdr.dispose();
  } catch(error) { console.info('CD reflection fallback: RoomEnvironment',error.message); }
  cdPmrem.dispose();
  function glowMap() {
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
    const r=g.createRadialGradient(64,64,3,64,64,62);r.addColorStop(0,'rgba(255,255,255,.7)');
    r.addColorStop(.4,'rgba(255,255,255,.27)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c);
  }
  const softMap=glowMap(),groundPlane=new THREE.PlaneGeometry(1,1);
  const geoCache = new Map();
  function roundShape(w,h,r) {
    const s = new THREE.Shape(), x = -w/2, y = -h/2;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s;
  }
  function slab(w,h,d,r,m) {
    const id = `${w}/${h}/${d}/${r}`;
    if (!geoCache.has(id)) {
      const bevel=w>10&&d>.35?.075:.025;
      const g = new THREE.ExtrudeGeometry(roundShape(w,h,r), { depth: d, bevelEnabled: true,
        bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments: 7 });
      g.translate(0,0,-d/2); geoCache.set(id,g);
    }
    const mesh = new THREE.Mesh(geoCache.get(id),m); mesh.castShadow = mesh.receiveShadow = true; return mesh;
  }
  const unitBox = new THREE.BoxGeometry(1,1,1);
  // Six real cut-outs in the silver plate, rather than painted dark dots.
  const hubShape=new THREE.Shape();hubShape.absarc(0,0,.36,0,Math.PI*2,false);
  const centerHole=new THREE.Path();centerHole.absarc(0,0,.19,0,Math.PI*2,true);hubShape.holes.push(centerHole);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,hole=new THREE.Path();hole.absarc(Math.cos(a)*.29,Math.sin(a)*.29,.025,0,Math.PI*2,true);hubShape.holes.push(hole);
  }
  const hubGeometry=new THREE.ExtrudeGeometry(hubShape,{depth:.025,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:2,curveSegments:24,steps:1});
  function consolidateFrames(parent,parts) {
    const own=parts.filter(p=>p.parent===parent);if(!own.length)return null;
    const streams={position:[],normal:[],uv:[]};
    for(const mesh of own){
      mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);
      for(const name of Object.keys(streams))streams[name].push(g.getAttribute(name).array);
      parent.remove(mesh);g.dispose();
    }
    const geometry=new THREE.BufferGeometry();
    for(const [name,list] of Object.entries(streams)){
      const data=new Float32Array(list.reduce((n,a)=>n+a.length,0));let offset=0;
      for(const array of list){data.set(array,offset);offset+=array.length;}
      geometry.setAttribute(name,new THREE.BufferAttribute(data,name==='uv'?2:3));
    }
    geometry.computeBoundingSphere();const merged=new THREE.Mesh(geometry,clearPlastic);parent.add(merged);return merged;
  }
  function box(parent,w,h,d,x,y,z,m) {
    const mesh = new THREE.Mesh(unitBox,m); mesh.scale.set(w,h,d); mesh.position.set(x,y,z);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function top(parent,w,d,h,x,y,z,r,m) {
    const mesh = slab(w,d,h,r,m); mesh.rotation.x = -Math.PI/2; mesh.position.set(x,y,z); parent.add(mesh); return mesh;
  }
  function instrumentUV(mesh,frequency=1){
    const geometry=mesh.geometry.clone(),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
    const uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i)*mesh.scale.x,y=p.getY(i)*mesh.scale.y,z=p.getZ(i)*mesh.scale.z;
      const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
      if(nz>=nx&&nz>=ny){uv[i*2]=x*frequency;uv[i*2+1]=y*frequency;}
      else if(ny>=nx){uv[i*2]=x*frequency;uv[i*2+1]=z*frequency;}
      else{uv[i*2]=y*frequency;uv[i*2+1]=z*frequency;}
    }
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));mesh.geometry=geometry;return mesh;
  }
  function print(text, width, height, color = '#596354', size = 33, background = null) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const p = c.getContext('2d'); if(background) { p.fillStyle = background; p.fillRect(0,0,512,128); }
    p.fillStyle = color; p.font = `${size}px Consolas,monospace`; p.textBaseline = 'middle'; p.fillText(text,20,65);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide });
    return new THREE.Mesh(new THREE.PlaneGeometry(width,height), material);
  }
  // Maintained jewel-case model. XY is the tray plane; +Z is its outward normal.
  // Shared geometry/materials keep the thirteen archive slots inexpensive.
  const opticalSilver=cdMaterial(physical({color:0xbcc1c5,metalness:.94,roughness:.15,
    envMapIntensity:1.35,clearcoat:.38,iridescence:.18,
    iridescenceIOR:1.35,iridescenceThicknessRange:[160,360],side:THREE.FrontSide}));
  opticalSilver.bumpMap=gold.bumpMap;opticalSilver.bumpScale=.002;
  opticalSilver.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vDiscLocal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvDiscLocal=position.xy;');
    shader.fragmentShader='varying vec2 vDiscLocal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      vec3 discEye=normalize(vViewPosition);
      float discAngle=atan(vDiscLocal.y,vDiscLocal.x);
      float discFacing=clamp(dot(normal,discEye),0.0,1.0);
      float discPhase=discAngle+atan(normal.x,normal.z)*0.75+discFacing*1.6;
      float discWedge=pow(abs(cos(discPhase)),14.0);
      vec3 discSpectrum=0.5+0.5*cos(6.2831853*(vec3(0.0,0.33,0.67)
        +discFacing*0.65+length(vDiscLocal)*0.14+discAngle*0.10));
      diffuseColor.rgb=mix(diffuseColor.rgb*0.82,discSpectrum*0.72+0.1,discWedge*0.72);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float discSheen=0.35+0.85*pow(abs(sin(discPhase+0.6)),2.0);
      outgoingLight=outgoingLight*discSheen+discSpectrum*discWedge*0.16;
      #include <opaque_fragment>`);
  };
  opticalSilver.customProgramCacheKey=()=> 'archive-optical-wedges-v1';
  const discEdge=cdMaterial(physical({color:0xd8dce0,metalness:.75,roughness:.2,envMapIntensity:1.1}));
  const innerPlastic=cdMaterial(physical({color:0xf1f2f1,metalness:0,roughness:.16,
    transparent:true,opacity:.68,depthWrite:false,envMapIntensity:.55}));
  const discFaceGeometry=new THREE.RingGeometry(.245,1.655,128);
  const discBackGeometry=new THREE.RingGeometry(.19,1.67,128);
  const discRimGeometry=new THREE.CylinderGeometry(1.67,1.67,.045,128,1,true);
  const discHoleGeometry=new THREE.CylinderGeometry(.19,.19,.045,64,1,true);
  const discRingGeometry=new THREE.RingGeometry(.19,.245,64);
  // Surface-only reflection: no screen blur, lights or effect on adjacent CDs.
  const hoverSurfaceGeometry=new THREE.PlaneGeometry(4.08,4.08);
  const hoverSurfaceMaterial=new THREE.ShaderMaterial({
    uniforms:{contact:{value:new THREE.Vector2(.5,.5)},strength:{value:0},surfaceAspect:{value:1}},
    transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,
    blending:THREE.AdditiveBlending,toneMapped:false,
    vertexShader:`varying vec2 surfaceUV;
      void main(){surfaceUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 surfaceUV;uniform vec2 contact;uniform float strength;uniform float surfaceAspect;
      void main(){
        vec2 d=surfaceUV-contact;
        d.x*=surfaceAspect;
        float radial=exp(-dot(d,d)*19.0);
        float sheen=exp(-pow((d.x+d.y*.58)*8.0,2.0))*exp(-dot(d,d)*4.0);
        float edge=smoothstep(0.0,.035,min(min(surfaceUV.x,1.0-surfaceUV.x),min(surfaceUV.y,1.0-surfaceUV.y)));
        float alpha=(radial*.15+sheen*.055)*strength*edge;
        gl_FragColor=vec4(vec3(.93,.96,1.0),alpha);
      }`
  });materials.add(hoverSurfaceMaterial);
  function makeCase(){
    const root=new THREE.Group(),frameParts=[],glass=glassSets[0];
    root.name='Photographic jewel case';
    const back=slab(4.25,4.25,.12,.075,glass.back);root.add(back);
    const tray=slab(3.93,4.02,.035,.035,glass.tray);tray.position.set(.065,0,.115);root.add(tray);
    back.castShadow=tray.castShadow=false;back.receiveShadow=tray.receiveShadow=false;
    // The continuous thick perimeter is hollow, not a solid refracting slab.
    frameParts.push(box(root,.24,4.16,.76,-2.02,0,.20,glass.frame));
    for(const y of [-2.08,2.08])frameParts.push(box(root,4.16,.055,.56,0,y,.19,glass.frame));
    frameParts.push(box(root,.055,4.12,.56,2.08,0,.19,glass.frame));
    for(const y of [-1.98,1.98])frameParts.push(box(root,3.96,.026,.07,0,y,.425,glass.frame));
    for(const x of [-1.97,1.97])frameParts.push(box(root,.025,3.96,.07,x,0,.425,glass.frame));
    // Tray recess and ribs remain attached to the bottom case on extraction.
    const recess=new THREE.Mesh(new THREE.TorusGeometry(1.76,.018,6,128),innerPlastic);
    recess.position.set(.06,0,.16);root.add(recess);
    for(const x of [-1.79,1.79])for(const y of [-1.8,1.8]){
      frameParts.push(box(root,.25,.045,.11,x,y,.16,glass.frame));
    }
    const hub=new THREE.Group();hub.position.set(.06,0,.16);hub.name='Fixed tray retention hub';root.add(hub);
    const hubCore=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,.16,32),innerPlastic);
    hubCore.rotation.x=Math.PI/2;hubCore.position.z=.06;hub.add(hubCore);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      const tab=box(hub,.044,.065,.14,Math.cos(angle)*.145,Math.sin(angle)*.145,.065,innerPlastic);
      tab.rotation.z=angle;
    }
    const discRig=new THREE.Group();discRig.position.set(.06,0,.255);
    discRig.name='Removable disc — photograph / optical reverse';root.add(discRig);
    const label=cdMaterial(physical({color:0xffffff,metalness:.025,roughness:.48,
      clearcoat:.16,clearcoatRoughness:.2,envMapIntensity:.16,side:THREE.FrontSide,toneMapped:false}));
    const disc=new THREE.Mesh(discFaceGeometry,label);disc.position.z=.024;discRig.add(disc);
    const reverse=new THREE.Mesh(discBackGeometry,opticalSilver);reverse.position.z=-.024;
    reverse.rotation.y=Math.PI;discRig.add(reverse);
    for(const geometry of [discRimGeometry,discHoleGeometry]){
      const rim=new THREE.Mesh(geometry,discEdge);rim.rotation.x=Math.PI/2;discRig.add(rim);
    }
    for(const side of [-1,1]){
      const ring=new THREE.Mesh(discRingGeometry,discEdge);ring.position.z=side*.025;
      if(side<0)ring.rotation.y=Math.PI;discRig.add(ring);
    }
    const hinge=new THREE.Group();hinge.position.set(-2.02,0,.49);root.add(hinge);
    const lidBody=slab(4.02,4.2,.045,.065,glass.pane);lidBody.position.x=2.02;hinge.add(lidBody);
    lidBody.castShadow=lidBody.receiveShadow=false;
    for(const [w,h,x,y] of [[4.02,.045,2.02,2.06],[4.02,.045,2.02,-2.06],[.045,4.12,.025,0],[.045,4.12,4.015,0]]){
      frameParts.push(box(hinge,w,h,.12,x,y,0,glass.frame));
    }
    for(const y of [-1.42,1.42]){
      const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.4,20),glass.frame);
      barrel.position.set(-2.02,y,.49);root.add(barrel);frameParts.push(barrel);
      frameParts.push(box(hinge,.14,.22,.14,.01,y,-.015,glass.frame));
    }
    for(let i=0;i<4;i++)frameParts.push(box(root,.014,3.72,.026,-2.13+i*.03,0,.49,glass.frame));
    // Fine catalogue identifier stays on the sleeve; no duplicate rectangular artwork.
    const code=print('001',2.45,.61,'#546064',42);code.position.set(2.02,-1.65,.04);hinge.add(code);
    const tabs=[];
    for(let i=0;i<3;i++)tabs.push(box(hinge,.10,.028,.012,.4+i*.18,1.84,.04,glass.tab));
    // A real paper insert on the INNER side of the hinged lid. Its front faces
    // local -Z, becoming readable from the camera only as the lid opens left.
    const insertMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.FrontSide,toneMapped:false});
    materials.add(insertMaterial);
    const inside=new THREE.Mesh(new THREE.PlaneGeometry(3.76,3.94),insertMaterial);
    inside.position.set(2.02,0,-.04);inside.rotation.y=Math.PI;
    inside.name='Work introduction — inside hinged paper insert';hinge.add(inside);
    const cover=new THREE.Group();hinge.add(cover);
    const hoverSurface=new THREE.Mesh(hoverSurfaceGeometry,hoverSurfaceMaterial);
    hoverSurface.position.z=.63;hoverSurface.visible=false;
    hoverSurface.raycast=()=>{};root.add(hoverSurface);
    const merged=[consolidateFrames(root,frameParts),consolidateFrames(hinge,frameParts)].filter(Boolean);
    frameParts.splice(0,frameParts.length,...merged);
    frameParts.forEach(p=>{p.castShadow=p.receiveShadow=false;});
    const pool=new THREE.Mesh(groundPlane,new THREE.MeshBasicMaterial({map:softMap,color:0x999999,
      transparent:true,opacity:.055,depthWrite:false,toneMapped:false}));
    pool.rotation.x=-Math.PI/2;pool.scale.set(4.6,5.5,1);pool.position.y=-.10;scene.add(pool);
    const contact=new THREE.Mesh(groundPlane,new THREE.MeshBasicMaterial({map:softMap,color:0x555555,
      transparent:true,opacity:.085,depthWrite:false,toneMapped:false}));
    contact.rotation.x=-Math.PI/2;contact.scale.set(3.9,3.2,1);contact.position.y=-.095;scene.add(contact);
    root.userData.role='cd';hitTargets.push(root);scene.add(root);
    return {root,hinge,code,cover,inside,disc,discRig,reverse,hub,back,tray,lidBody,frameParts,tabs,pool,contact,hoverSurface,logical:-1,active:null,category:-1};
  }

  const cases = Array.from({length:13}, makeCase);
  // One octave: C4 to C5, eight white and five black keys. Each key is a separate mesh.
  const piano = new THREE.Group();piano.name='PIANO / instrument';piano.position.set(0,0,6.0);scene.add(piano);
  instrumentUV(top(piano,14.35,3.42,.16,0,.24,0,.22,under),.18);
  const housing=instrumentUV(top(piano,14.6,3.6,.63,0,.61,0,.22,ivory),.12);housing.material=[ivory,housingSides];
  instrumentUV(box(piano,13.6,.027,.025,0,.39,1.882,trim),.35);
  // A narrow actual recess separates the lacquered shell from its graphite bottom assembly.
  const gasket=instrumentUV(top(piano,14.39,3.44,.035,0,.315,0,.21,rubber));
  for(const x of [-5.95,5.95])for(const z of [-1.03,1.03])instrumentUV(top(piano,.70,.72,.27,x,.025,z,.13,rubber));
  const pianoContact=new THREE.Mesh(groundPlane,new THREE.MeshBasicMaterial({map:softMap,color:0x655e50,transparent:true,opacity:.16,depthWrite:false,toneMapped:false}));
  pianoContact.rotation.x=-Math.PI/2;pianoContact.scale.set(15.4,4.9,1);pianoContact.position.set(.2,-.085,6.0);scene.add(pianoContact);
  for(const x of [-6.98,6.98]) {
    const screw=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,.012,12),trim);
    screw.rotation.x=Math.PI/2;screw.position.set(x,.59,1.886);piano.add(screw);
    box(piano,.043,.009,.008,x,.59,1.897,rearRail);
  }
  instrumentUV(top(piano,13.94,.41,.08,0,.99,-1.36,.055,rearRail));
  instrumentUV(top(piano,11.08,2.65,.055,-.87,.965,.15,.045,keybed));
  instrumentUV(top(piano,.54,1.70,.10,-6.56,.975,-.55,.055,rearRail));
  const kw=1.335, start=-6.2;
  natural.forEach((note,i) => {
    const x=start+(i+.5)*kw,mesh=instrumentUV(top(piano,kw-.028,2.42,.22,x,1.095,.23,.04,white),.4);mesh.material=[white,keySides];
    mesh.userData={role:'key',note}; keys[note]={mesh,x,base:1.095,stand:1.22,z:6.65,press:0}; hitTargets.push(mesh);
    instrumentUV(top(piano,kw-.09,.08,.05,x,.99,1.44,.015,keySides));
    const label=print(keyNames[note],.48,.13,'#8c9385',35);label.position.set(0,-.89,.14);mesh.add(label);
  });
  [[0,1],[1,3],[3,6],[4,8],[5,10]].forEach(([i,note]) => {
    const x=start+(i+1)*kw,mesh=instrumentUV(top(piano,.69,1.47,.20,x,1.325,-.28,.04,black),.3);mesh.material=[black,blackSides];
    mesh.userData={role:'key',note}; keys[note]={mesh,x,base:1.325,stand:1.44,z:5.90,press:0}; hitTargets.push(mesh);
  });
  instrumentUV(top(piano,1.72,2.65,.045,5.87,.97,.13,.12,restSurface),.25);
  const restPrint=print('REST',1.28,.31,'#66715d',50);restPrint.rotation.x=-Math.PI/2;restPrint.position.set(5.87,1.025,7.03-6);piano.add(restPrint);
  for(let i=0;i<2;i++) {
    const knob=new THREE.Mesh(new THREE.CylinderGeometry(.105,.12,.09,40),trim);
    knob.position.set(-6.56,1.07,-.94+i*.37); piano.add(knob);
    const grip=new THREE.Mesh(new THREE.TorusGeometry(.111,.012,6,40),black);grip.rotation.x=Math.PI/2;grip.position.set(-6.56,1.06,-.94+i*.37);piano.add(grip);
    box(piano,.012,.007,.055,-6.56,1.118,-.96+i*.37,rearRail);
  }
  const led=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,.02,12),yellow); led.position.set(-6.55,1.08,.1); piano.add(led);
  const pianoPrint=print((window.PORTFOLIO_SITE?.name?.zh||'零壹')+' / ARCHIVE',3.3,.36,'#51554e',50);pianoPrint.position.set(-4.6,.58,1.889);piano.add(pianoPrint);
  const oldPrintMaterial=pianoPrint.material;
  pianoPrint.material=instrument(new THREE.MeshStandardMaterial({map:oldPrintMaterial.map,transparent:true,depthWrite:false,roughness:.62,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  materials.add(pianoPrint.material);oldPrintMaterial.dispose();
  // The character is deliberately made from boxes so geometry quality can be inspected.
  const host = new THREE.Group(); host.position.set(keys[0].x,1.22,6.65); scene.add(host);
  const body = new THREE.Group(); host.add(body);
  const voxel = new THREE.Group(); body.add(voxel);
  box(voxel,.46,.53,.28,0,.82,0,cloth);
  box(voxel,.48,.07,.30,0,1.04,0,yellow);
  box(voxel,.43,.43,.38,0,1.32,0,skin);
  box(voxel,.48,.15,.43,0,1.55,-.025,ink);
  box(voxel,.12,.35,.43,-.19,1.38,-.025,ink);
  for(const x of [-.085,.085]) box(voxel,.038,.06,.02,x,1.34,.201,ink);
  const limbs = [];
  for(const x of [-.135,.135]) {
    const leg=new THREE.Group(); leg.position.set(x,.58,0); voxel.add(leg);
    box(leg,.18,.40,.20,0,-.20,0,ink); box(leg,.20,.13,.34,0,-.45,.06,ink); limbs.push(leg);
  }
  for(const x of [-.32,.32]) {
    const arm=new THREE.Group(); arm.position.set(x,.99,0); voxel.add(arm);
    box(arm,.14,.39,.20,0,-.20,0,cloth); box(arm,.14,.12,.19,0,-.40,.015,skin); limbs.push(arm);
  }
  const spriteRoot=new THREE.Group(); body.add(spriteRoot); spriteRoot.visible=false;
  const spriteCanvas=document.createElement('canvas'); spriteCanvas.width=32; spriteCanvas.height=40;
  const ctx=spriteCanvas.getContext('2d');
  const spriteTex=new THREE.CanvasTexture(spriteCanvas); spriteTex.magFilter=THREE.NearestFilter; spriteTex.minFilter=THREE.NearestFilter;
  spriteTex.colorSpace=THREE.SRGBColorSpace;
  const spriteGeo=new THREE.PlaneGeometry(1.23,1.54); spriteGeo.translate(0,.77,0);
  const sprite=new THREE.Mesh(spriteGeo,new THREE.MeshBasicMaterial({map:spriteTex,transparent:true,alphaTest:.1,side:THREE.DoubleSide,toneMapped:false}));
  spriteRoot.add(sprite);
  let spritePose='';
  function drawSprite(pose) {
    if(pose===spritePose) return; spritePose=pose; ctx.clearRect(0,0,32,40);
    const p=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    const sit=pose==='sit';
    p(10,3,12,4,'#30362f');p(8,7,15,7,'#30362f');p(11,10,10,7,'#d2cfc0');p(8,10,4,6,'#30362f');p(18,12,1,2,'#30362f');
    p(10,17,12,12,'#485043');p(10,17,12,2,'#c7ac37');p(7,20,4,8,'#485043');p(21,20,4,8,'#485043');
    if(sit){p(12,29,14,4,'#30362f');p(23,30,4,7,'#30362f');p(21,36,8,3,'#252a26');}
    else {const walk=pose==='walk'?2:0;p(11,29,5,8-walk,'#30362f');p(18,29,5,8,'#30362f');p(9,36-walk,7,3,'#252a26');p(18,36,8,3,'#252a26');}
    spriteTex.needsUpdate=true;
  }
  drawSprite('stand');
  const hostHit=new THREE.Mesh(new THREE.BoxGeometry(1,1.8,.9),new THREE.MeshBasicMaterial({visible:false}));
  hostHit.position.y=.8; hostHit.userData.role='host'; host.add(hostHit); hitTargets.push(hostHit);
  const gait={walk:0,sit:0}, hop={value:0};
  const rest={x:5.87,y:1.12,z:6.18};
  function stopHost() {
    hostTimeline?.kill(); gsap.killTweensOf(host.position); gsap.killTweensOf(gait); gsap.killTweensOf(hop); hop.value=0;
  }
  function parkHost() {
    stopHost(); state.resting=false;
    $('host-status').textContent='小人沿琴键退到右端休息';
    const duration=reduced?.01:Math.max(.55,Math.abs(host.position.x-rest.x)*.08);
    hostTimeline=gsap.timeline({onComplete:()=>{state.resting=true;syncUI();}})
      .to(gait,{walk:1,sit:0,duration:.12},0)
      .to(host.position,{x:rest.x,y:rest.y,z:rest.z,duration,ease:'power1.inOut'},0)
      .to(gait,{walk:0,sit:1,duration:reduced?.01:.3},duration);
  }
  function returnHost() {
    stopHost(); state.resting=false; gait.sit=0;
    const key=keys[0];
    $('host-status').textContent='小人返回琴键，准备演奏';
    hostTimeline=gsap.timeline({onComplete:()=>{nextBeat=clockTime+.2;syncUI();}})
      .to(gait,{walk:1,sit:0,duration:.12},0)
      .to(host.position,{x:key.x,y:key.stand,z:key.z,duration:reduced?.01:1,ease:'power1.inOut'},0)
      .to(gait,{walk:0,duration:.12},reduced?.01:.95);
    nextBeat=clockTime+1.4; autoIndex=0;
  }
  function hostStep(note) {
    hostTimeline?.kill(); const key=keys[note];
    const dur=reduced?.01:.24;
    hostTimeline=gsap.timeline()
      .to(host.position,{x:key.x,y:key.stand,z:key.z,duration:dur,ease:'power2.inOut'},0)
      .to(hop,{value:reduced?0:.32,duration:dur*.48,ease:'power1.out'},0)
      .to(hop,{value:0,duration:dur*.52,ease:'power1.in'},dur*.48);
    gsap.to(gait,{walk:1,duration:.08}); gsap.to(gait,{walk:0,duration:.1,delay:dur});
  }
  // Short additive piano-like voices. Audio is created only following a user gesture.
  let audio, master, compressor; const voices=new Set();
  function ensureAudio() {
    if(!audio) {
      audio=new (window.AudioContext||window.webkitAudioContext)();
      compressor=audio.createDynamicsCompressor(); compressor.threshold.value=-16; compressor.ratio.value=5;
      master=audio.createGain(); master.gain.value=.24; master.connect(compressor); compressor.connect(audio.destination);
    }
    if(audio.state==='suspended') audio.resume();
  }
  function toggleSound(force) {
    state.sound=force ?? !state.sound;
    if(state.sound) ensureAudio();
    if(master) master.gain.setTargetAtTime(state.sound?.24:0,audio.currentTime,.025);
    syncUI();
  }
  function sound(note) {
    if(!state.sound||!audio||audio.state!=='running') return;
    const now=audio.currentTime, freq=261.625565*Math.pow(2,note/12), gain=audio.createGain();
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.52,now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+1.3);gain.connect(master);
    const oscs=[];
    [1,2,3].forEach((h,i)=>{
      const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq*h*(i===2?1.0004:1);g.gain.value=[.75,.18,.06][i];
      o.connect(g);g.connect(gain);o.start(now);o.stop(now+1.35);oscs.push(o);
    });
    const voice={oscs,gain};voices.add(voice);
    oscs[0].onended=()=>{gain.disconnect();voices.delete(voice);};
    if(voices.size>24){const old=voices.values().next().value;old.oscs.forEach(o=>{try{o.stop();}catch{}});}
  }
  function triggerNote(note, manual=false) {
    if(manual) {
      if(state.mode!=='play') setMode('play');
      if(!state.sound) toggleSound(true);
      manualPianoNote();
    }
    state.note=note; if(manual) sound(note);
    const key=keys[note];gsap.killTweensOf(key);key.press=1;
    gsap.to(key,{press:0,duration:.33,ease:'power2.out'});
    queueKeyPulse(note,manual);
    $('note-label').textContent=`${keyNames[note]} / ${manual?'YOUR INPUT':'MELODY 01'}`;
    if(pulses.length>10)pulses.shift();
  }

  // Site adapter. The model and material code above is copied from the authored scene.
  const currentIndex=()=>mod(Math.round(travel.value),Math.max(1,records.length));
  // The original camera remains untouched. CD-only transforms align the selected
  // cover to its screen plane and keep the paired open case upright.
  // Restore the authored oblique viewing angle; the opened pair still faces the camera.
  const shelfTurn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-.69);
  const shelfOrientation=new THREE.Quaternion(),screenRight=new THREE.Vector3(),screenUp=new THREE.Vector3(),screenOut=new THREE.Vector3();
  const rowAnchor=new THREE.Vector3(0,2.8,-3.75),shelfPoint=new THREE.Vector3(),selectedPoint=new THREE.Vector3();
  let shelfScale=1,selectedScale=1.5,selectedScreenOffset=0,selectedUpOffset=0,selectionReadyAt=0;
  const smooth=value=>{const v=THREE.MathUtils.clamp(value,0,1);return v*v*(3-2*v)};
  const hover={x:0,y:0,vx:0,vy:0,tx:0,ty:0,glow:0,targetGlow:0,u:.5,v:.5,inside:false};
  const hoverRotation=new THREE.Quaternion(),hoverEuler=new THREE.Euler();
  const hoverPivot=new THREE.Vector3(),hoverPivotTurned=new THREE.Vector3();
  let discSpin=0;
  const motion={travelV:0,selectV:0,lidV:0,selectionGoal:0,lidGoal:0,navigating:false,lastInput:0,selectedAbsolute:0,spinSpeed:0};
  const spinAngles=new Map();
  const focusAbsolute=()=>motion.selectedAbsolute;
  // Exact critically damped step. Retargeting preserves both value and velocity.
  function damp(value,velocity,goal,frequency,dt,epsilon=.0001){
    if(reduced)return [goal,0];
    const offset=value-goal,c=velocity+frequency*offset,e=Math.exp(-frequency*dt);
    let next=goal+(offset+c*dt)*e,speed=(velocity-frequency*c*dt)*e;
    if(Math.abs(next-goal)<epsilon&&Math.abs(speed)<epsilon*frequency){next=goal;speed=0;}
    return [next,speed];
  }
  function stepArchive(dt){
    const before=[travel.value,select.value,lid.value,discSpin];
    if(motion.navigating){
      if(!drag&&performance.now()-motion.lastInput>130)target=Math.round(target);
      const clearance=1-smooth(select.value);
      [travel.value,motion.travelV]=damp(travel.value,motion.travelV,travel.value+(target-travel.value)*clearance,14,dt,.00005);
      if(!drag&&performance.now()-motion.lastInput>130&&Math.abs(target-travel.value)<.002&&Math.abs(motion.travelV)<.025&&select.value<.002){
        motion.selectedAbsolute=Math.round(target);discSpin=spinAngles.get(focusAbsolute())||0;motion.navigating=false;motion.selectionGoal=1;
      }
    }
    if(!motion.navigating)[travel.value,motion.travelV]=damp(travel.value,motion.travelV,target,14,dt,.00005);
    [select.value,motion.selectV]=damp(select.value,motion.selectV,motion.selectionGoal,16,dt);
    [lid.value,motion.lidV]=damp(lid.value,motion.lidV,motion.lidGoal,16,dt);
    if(lid.value<0||lid.value>1){lid.value=THREE.MathUtils.clamp(lid.value,0,1);motion.lidV=0;}
    if(state.busy&&state.phase!=='preparing'){
      if(returning&&lid.value===0){
        motion.selectionGoal=0;
        if(select.value===0){
          state.busy=false;state.selected=false;state.detail=false;state.phase='shelved';openedWork=null;returning=false;
          const action=pendingAction;pendingAction=null;pendingTarget=null;syncUI();action?.();
        }
      }else if(!returning&&lid.value===1&&select.value===1){
        state.busy=false;state.detail=true;state.phase='open';syncUI();
      }
    }
    if(state.selected&&!motion.navigating&&select.value===1&&selectionReadyAt===Infinity)selectionSettled();
    const instantStop=state.paused||reduced||!canInput();
    const spinGoal=!instantStop&&state.detail&&!state.busy&&lid.value===1?-.48:0;
    if(instantStop)motion.spinSpeed=0;
    else motion.spinSpeed+=(spinGoal-motion.spinSpeed)*(1-Math.exp(-dt/ .18));
    if(Math.abs(motion.spinSpeed-spinGoal)<.0001)motion.spinSpeed=spinGoal;
    if(Math.abs(motion.spinSpeed)>.0001){discSpin=(discSpin+motion.spinSpeed*dt)%(Math.PI*2);spinAngles.set(focusAbsolute(),discSpin);}
    return before.some((v,i)=>v!==[travel.value,select.value,lid.value,discSpin][i]);
  }
  function resetHover(immediate=false){
    hover.tx=hover.ty=hover.targetGlow=0;hover.inside=false;
    if(immediate){hover.x=hover.y=hover.vx=hover.vy=hover.glow=0;}
    dirty=true;
  }
  const hoverAllowed=()=>canInput()&&state.selected&&!motion.navigating&&!state.busy&&select.value>.999&&(lid.value===0||(state.detail&&lid.value>.999))&&!reduced;
  function updateHover(clientX,clientY){
    if(!hoverAllowed()){if(hover.inside)resetHover();return false;}
    const selected=cases.find(c=>c.root.visible&&c.root.userData.absolute===focusAbsolute());
    if(!selected)return false;
    const hit=pick(clientX,clientY);
    if(hit!==selected.root){if(hover.inside)resetHover();return false;}
    // Project to the actual front plane, including the small current tilt.
    const plane=new THREE.Plane(new THREE.Vector3(0,0,1),-.63).applyMatrix4(selected.root.matrixWorld);
    const contact=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,contact))return false;
    selected.root.worldToLocal(contact);
    const open=state.detail;
    const x=THREE.MathUtils.clamp((contact.x+(open?2.02:0))/(open?4.145:2.125),-1,1),y=THREE.MathUtils.clamp(contact.y/2.125,-1,1);
    hover.tx=-y*.115;hover.ty=x*.14;
    hover.u=(x+1)*.5;hover.v=(y+1)*.5;hover.targetGlow=1;hover.inside=true;dirty=true;return true;
  }
  function stepHover(dt){
    if(!hoverAllowed()&&(hover.inside||hover.targetGlow))resetHover();
    const moving=Math.abs(hover.x-hover.tx)+Math.abs(hover.y-hover.ty)+Math.abs(hover.vx)+Math.abs(hover.vy)+Math.abs(hover.glow-hover.targetGlow)>.0001;
    if(!moving)return false;
    // Semi-implicit integration at <=120Hz: underdamped return without long-frame explosions.
    const count=Math.max(1,Math.ceil(Math.min(dt,.05)*120)),h=Math.min(dt,.05)/count;
    for(let i=0;i<count;i++){
      hover.vx+=(190*(hover.tx-hover.x)-22*hover.vx)*h;hover.x+=hover.vx*h;
      hover.vy+=(190*(hover.ty-hover.y)-22*hover.vy)*h;hover.y+=hover.vy*h;
      hover.glow+=(hover.targetGlow-hover.glow)*(1-Math.exp(-h*14));
    }
    if(Math.abs(hover.x-hover.tx)+Math.abs(hover.y-hover.ty)+Math.abs(hover.vx)+Math.abs(hover.vy)<.00015){hover.x=hover.tx;hover.y=hover.ty;hover.vx=hover.vy=0;}
    if(Math.abs(hover.glow-hover.targetGlow)<.0001)hover.glow=hover.targetGlow;
    return true;
  }
  const pulseDelay=.075,pulseDuration=.54,pulseLifetime=pulseDuration+12*pulseDelay;
  let pulseSerial=0;
  function queueKeyPulse(note,manual){
    if(state.paused||reduced||!Number.isInteger(note)||!keys[note])return;
    // Slot identity is musical pitch, not work ID: recycled photos keep their key.
    pulses.push({time:clockTime,origin:note-6,note,manual,serial:++pulseSerial,amplitude:.82});
    if(pulses.length>12)pulses.shift();dirty=true;
  }
  function keyPulseHeight(slot){
    if(state.paused||reduced)return 0;
    let height=0;
    for(const p of pulses){
      const distance=Math.abs(slot-p.origin),age=clockTime-p.time-distance*pulseDelay;
      if(age<0||age>=pulseDuration)continue;
      const arc=Math.pow(Math.sin(Math.PI*age/pulseDuration),1.15);
      height+=arc*Math.exp(-age*1.1)*p.amplitude*Math.pow(.84,distance);
    }
    return Math.min(1.2,height);
  }
  function placeUprightCase(c,rel,focus,wave){
    const k=focus?select.value:0,turn=smooth(k),pull=k*(2-k);
    const open=focus?lid.value:0;
    const spread=!focus?Math.sign(rel)*smooth(Math.min(1,Math.abs(rel)*2))*6.0*select.value*Math.exp(-Math.abs(rel)*.17):0;
    const slot=THREE.MathUtils.clamp(Math.round(rel)+6,0,12);
    // Restore the complete resting layout from cd-upright-20261119/before:
    // x = rel * 1.80; y = 2.38 + wave; z = -3.75 + .050 * rel * rel;
    // unit scale, world-Y angle -.69. Musical pitch only selects the wave slot.
    shelfPoint.set(rel*1.80,2.38+wave,-3.75+.050*rel*rel)
      .addScaledVector(screenRight,spread);
    selectedPoint.copy(rowAnchor).addScaledVector(screenOut,5)
      .addScaledVector(screenRight,selectedScreenOffset)
      .addScaledVector(screenUp,selectedUpOffset)
      .addScaledVector(screenRight,smooth(open)*1.98*selectedScale);
    // Withdraw before turning; on return, turn before reinserting into the row.
    c.root.position.copy(shelfPoint).lerp(selectedPoint,pull);
    c.root.quaternion.copy(shelfOrientation).slerp(camera.quaternion,turn);
    if(focus&&k>0){
      // Keep the center of the open spread steady as the paired pages tilt.
      hoverPivot.set(-2.02*smooth(open),0,0).multiplyScalar(selectedScale);
      hoverPivotTurned.copy(hoverPivot).applyQuaternion(c.root.quaternion);
      hoverRotation.setFromEuler(hoverEuler.set(hover.x*k,hover.y*k,0));c.root.quaternion.multiply(hoverRotation);
      hoverPivot.applyQuaternion(c.root.quaternion);
      c.root.position.add(hoverPivotTurned).sub(hoverPivot);
    }
    c.hoverSurface.visible=focus&&hover.glow>.0001&&k>0;
    c.hoverSurface.scale.x=focus?1+smooth(open):1;
    c.hoverSurface.position.x=focus?-2.02*smooth(open):0;
    if(c.hoverSurface.visible){hoverSurfaceMaterial.uniforms.contact.value.set(hover.u,hover.v);hoverSurfaceMaterial.uniforms.strength.value=hover.glow*k;hoverSurfaceMaterial.uniforms.surfaceAspect.value=c.hoverSurface.scale.x;}
    c.root.scale.setScalar(THREE.MathUtils.lerp(shelfScale,selectedScale,turn));
    c.keyNote=slot;c.waveHeight=wave;
    c.hinge.rotation.y=-Math.PI*open;
    c.inside.visible=true;c.cover.visible=false;
    c.back.visible=c.tray.visible=focus&&lid.value>.025;
    c.discRig.position.set(.06,0,.255);c.discRig.rotation.set(0,0,spinAngles.get(c.root.userData.absolute)||0);
    c.pool.position.set(c.root.position.x+.6,-.10,c.root.position.z+1.2);
    c.pool.material.opacity=.055*(1-.35*k);
    c.contact.position.set(c.root.position.x,-.095,c.root.position.z);
    c.contact.material.opacity=.085*(1-k*.5);
  }
  let pendingAction=null,pendingTarget=null,returning=false;
  state.phase='shelved';
  // Reuse the existing action's visual language; expose a touch-reachable return.
  const caseActions=document.createElement('div');caseActions.className='piano-case-actions';
  $('open-button').before(caseActions);caseActions.append($('open-button'));
  const returnButton=document.createElement('button');returnButton.type='button';
  returnButton.className='piano-control liquid-surface';returnButton.id='piano-return-button';
  returnButton.hidden=true;caseActions.append(returnButton);
  canvas.setAttribute('aria-label','钢琴与摄影档案。滚轮或拖动浏览，方向键选择，Enter 选中、开盒、查看作品。左侧内页为作品介绍，右侧光盘可点击查看原图；Esc 合盒归位。A S D F G H J K 弹奏。');
  let active=true,suspended=false,viewerOpen=false,dirty=true,disposed=false,tickCount=0;
  let layoutKind='home',layoutSeries=null,coverRequest=0,coverTexture=null,openedWork=null;
  let rafPause=[];
  const heldPianoKeys=new Set();
  let followingMusic=false,lastMusicBeat=-1,restRequested=false;
  const musicPlayback=()=>window.StudioMusic?.getPlaybackState?.()||{playing:false,currentTime:0};
  function manualPianoNote(){
    window.StudioMusic?.beginPiano();
    if(!heldPianoKeys.size)window.StudioMusic?.endPiano();
    followingMusic=false;lastMusicBeat=-1;
  }
  function releasePianoKeys(){heldPianoKeys.clear();window.StudioMusic?.endPiano()}
  function startMusicPerformance(){
    setMode('auto');
    const player=window.StudioMusic;if(!player)return;
    if(player.getState().tracks.length){if(!player.getPlaybackState().playing)void player.play();}
    else{
      window.StudioGlass?.toggle(true);
      if(!player.getState().expanded)document.getElementById('music-toggle')?.click();
    }
  }
  function syncMusic(){
    const music=musicPlayback();
    if(music.playing&&state.mode==='play')setMode('auto');
    const follow=music.playing&&!music.buffering&&!music.seeking&&!music.pianoPending
      &&state.mode==='auto'&&!state.paused&&!reduced&&enabled();
    if(follow&&!followingMusic){followingMusic=true;restRequested=false;lastMusicBeat=-1;returnHost();}
    else if(!follow){
      followingMusic=false;lastMusicBeat=-1;
      if(enabled()&&!restRequested){restRequested=true;parkHost();pulses.length=0;}
    }
    syncUI();
  }
  document.addEventListener('studio:music-playback',syncMusic);
  const covers=new Map();
  const discPrints=new Map(),readyPrints=new Map();let artworkEpoch=0;
  const artworkKey=record=>record.id+'|'+(record.texture||window.PAPER_TEXTURES?.[record.id]||record.thumb||record.image);
  function releaseCovers(){artworkEpoch++;for(const texture of covers.values())texture.then(value=>value?.dispose());covers.clear();for(const texture of discPrints.values())texture.then(value=>value?.dispose());discPrints.clear();readyPrints.clear();}
  function trimArtworkCache(){
    if(covers.size<=28)return;
    const visible=new Set(cases.filter(c=>c.root.visible).map(c=>c.artworkKey));
    for(const [key,texture]of covers){
      if(covers.size<=24)break;
      if(visible.has(key))continue;
      covers.delete(key);texture.then(value=>value?.dispose());
      const printed=discPrints.get(key);discPrints.delete(key);readyPrints.delete(key);printed?.then(value=>value?.dispose());
    }
  }
  function prepareDiscPrint(record){
    const key=artworkKey(record),epoch=artworkEpoch;
    if(!discPrints.has(key))discPrints.set(key,prepareCover(record).then(source=>{
      if(!source)return null;
      const image=source.image,side=Math.min(image.width,image.height);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=768;
      const p=canvas.getContext('2d');
      // Equal scale on both axes. Portrait labels favor the upper crop to retain faces.
      p.drawImage(image,(image.width-side)/2,(image.height-side)*.25,side,side,0,0,768,768);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(epoch===artworkEpoch)readyPrints.set(key,texture);return texture;
    }));
    return discPrints.get(key);
  }
  function applyDiscPrint(c,record){
    const key=artworkKey(record),epoch=artworkEpoch;
    if(c.artworkKey===key)return;
    c.artworkKey=key;c.artworkReady=false;
    const revision=c.artworkRevision=(c.artworkRevision||0)+1;
    // Recycled render slots must never flash the previous photograph.
    c.disc.material.map=null;c.disc.material.needsUpdate=true;
    const cached=readyPrints.get(key);
    if(cached){c.disc.material.map=cached;c.disc.material.needsUpdate=true;c.artworkReady=true;return;}
    prepareDiscPrint(record);
    discPrints.get(key).then(texture=>{
      if(disposed||epoch!==artworkEpoch||c.artworkRevision!==revision||c.artworkKey!==key||!texture)return;
      c.disc.material.map=texture;c.disc.material.needsUpdate=true;c.artworkReady=true;dirty=true;
      trimArtworkCache();
    }).catch(error=>console.info('Disc photograph unavailable:',record.id,error.message));
  }
  const currentRecord=()=>records[currentIndex()];
  const enabled=()=>active&&!suspended&&!viewerOpen&&!document.hidden&&!disposed&&layoutKind==='home';
  const canInput=()=>enabled()&&!Studio.getState().processing&&!document.querySelector('dialog[open],.pm-dialog[open]');
  function animateChanged(){dirty=true;}
  function selectionSettled(){selectionReadyAt=performance.now()+(reduced?0:80);syncUI();}
  function tweenSelection(value){selectedTween?.kill();motion.selectionGoal=value;dirty=true;}
  function resetOpening(immediate=true){
    resetHover(immediate);
    motion.lidGoal=motion.lidV=0;
    coverRequest++;openTimeline?.kill();lid.value=0;detailShift.value=0;
    state.detail=false;state.busy=false;openedWork=null;
    pendingAction=null;pendingTarget=null;returning=false;state.phase=state.selected?'selected':'shelved';dirty=true;
  }
  function setMode(mode){
    if(!['auto','play','browse'].includes(mode))return;
    if(state.mode===mode){
      // A second mode choice can cancel a queued switch during safe return.
      if(returning){pendingAction=null;pendingTarget=null;}
      if(mode==='auto')syncMusic();return;
    }
    if(state.detail||state.busy||lid.value>0){pendingTarget=null;pendingAction=()=>setMode(mode);closeCase(true);return;}
    scrollTween?.kill();target=Math.round(travel.value);motion.navigating=false;
    resetOpening(false);state.mode=mode;state.selected=false;tweenSelection(0);pulses.length=0;
    followingMusic=false;restRequested=false;
    if(mode==='auto')syncMusic();else{parkHost();restRequested=true;}syncUI();
  }
  function selectAt(index,continuous=false){
    resetHover();
    if(!records.length)return;
    if(state.detail||state.busy||lid.value>0){pendingTarget=index;pendingAction=()=>selectAt(pendingTarget??index,continuous);closeCase(true);return;}
    if(state.mode!=='browse')setMode('browse');
    state.selected=true;state.phase='selected';selectionReadyAt=Infinity;target=index;motion.lastInput=performance.now();
    scrollTween?.kill();selectedTween?.kill();
    if(continuous||motion.navigating||Math.abs(index-travel.value)>.003){motion.navigating=true;motion.selectionGoal=0;}
    else {motion.selectedAbsolute=Math.round(index);discSpin=spinAngles.get(focusAbsolute())||0;tweenSelection(1);}
    prepareCover(records[mod(Math.round(index),records.length)]);
    // Prepare the next two edge slots before the cyclic pool needs to display them.
    for(const offset of [-8,-7,7,8])prepareDiscPrint(records[mod(Math.round(index)+offset,records.length)]);
    dirty=true;syncUI();
  }
  function go(step){if(records.length)selectAt(Math.round(pendingTarget??target)+step);}
  function browseBy(delta){if(records.length)selectAt((pendingTarget??target)+delta,true);}
  function prepareCover(record){
    if(!record)return Promise.resolve(null);
    const source=record.texture||window.PAPER_TEXTURES?.[record.id]||record.thumb||record.image;
    const key=artworkKey(record);
    if(!covers.has(key))covers.set(key,new Promise(resolve=>{
      const image=new Image();image.onload=()=>{const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());resolve(texture);};image.onerror=()=>resolve(null);image.src=source;
    }));
    return covers.get(key);
  }
  async function openCase(){
    if(!records.length)return;
    if(state.detail&&!state.busy){viewPhotograph();return;}
    if(!state.selected){selectAt(Math.round(travel.value));return;}
    if(motion.navigating)return;
    if(!returning&&!state.busy&&(select.value<.999||performance.now()<selectionReadyAt))return;
    resetHover();pendingAction=null;pendingTarget=null;returning=false;motion.selectionGoal=1;
    const record=currentRecord(),request=++coverRequest;state.busy=true;state.phase='preparing';syncUI();
    const texture=await prepareCover(record);
    if(request!==coverRequest)return;
    if(!canInput()){resetOpening();syncUI();return;}
    coverTexture=texture;openedWork=record.id;dirty=true;
    const selectedCase=cases.find(c=>c.root.userData.absolute===focusAbsolute());
    if(selectedCase)updateInsert(selectedCase,record);
    state.phase='opening';motion.lidGoal=1;syncUI();
  }
  function viewPhotograph(){
    if(!state.detail||state.busy||!canInput())return;
    const record=currentRecord();if(record&&record.id===openedWork)Studio.openWork(record.id,false,{rect:workRect(record.id)});
  }
  function closeCase(preservePending=false){
    resetHover();
    if(!preservePending){pendingAction=null;pendingTarget=null;}
    if(returning)return;
    if(!state.detail&&!state.busy&&lid.value===0){
      motion.navigating=false;target=Math.round(travel.value);
      if(state.selected){state.selected=false;state.phase='shelved';tweenSelection(0);syncUI();}return;
    }
    coverRequest++;openTimeline?.kill();selectedTween?.kill();
    state.detail=false;state.busy=true;returning=true;state.phase='returning';motion.lidGoal=0;
    syncUI();dirty=true;if(enabled())canvas.focus({preventScroll:true});
  }
  let controlsSignature='';
  function syncUI(){
    const record=currentRecord(),name=window.PORTFOLIO_SITE?.name?.[Studio.getLanguage()]||'零壹';
    $('author').textContent=name+' / COSPLAY PORTRAITURE';
    $('title').textContent=l('角色之间','In character.');
    $('title-en').textContent=l('In character.','Cosplay portrait archive');
    $('intro-copy').textContent=l('以人物为中心，在光线与场景之间，留下角色的另一种可能。','Portraits of characters, shaped through light, setting and imagination.');
    document.querySelectorAll('[data-piano-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.pianoMode===state.mode));b.textContent=b.dataset.pianoMode==='auto'?l('跟随音乐','Follow music'):l('浏览档案','Browse archives');});
    const soundButton=$('sound-button');soundButton.setAttribute('aria-pressed',String(state.sound));soundButton.setAttribute('aria-label',state.sound?l('关闭钢琴声音','Mute piano'):l('开启钢琴声音','Enable piano sound'));soundButton.title=soundButton.getAttribute('aria-label');
    soundButton.dataset.sound=String(state.sound);
    $('progress').textContent=String(records.length?currentIndex()+1:0).padStart(2,'0')+' / '+String(records.length).padStart(2,'0');
    $('shelf-label').textContent=state.mode==='auto'?l('人物 · 光线 · 角色','PEOPLE · LIGHT · CHARACTER'):state.mode==='play'?l('自由弹奏','YOUR MELODY'):l('摄影档案','PHOTO ARCHIVE');
    $('shelf-title').textContent=state.mode==='browse'&&record?record.code:l('零壹摄影作品集','Cosplay portrait archive');
    $('category-label').textContent=record?.seriesLabel||'';
    $('shelf-description').textContent=state.detail?l('左侧作品介绍 · 点击右侧光盘查看原图 · Esc 合盒','Introduction on the left · Click the disc to view · Esc to return'):state.mode==='auto'?l('播放音乐，小人随之演奏 · 点击琴键接管','Play music to animate the pianist · Play a key to take over'):state.mode==='play'?(musicPlayback().pianoPending?l('停止弹奏 3 秒后，音乐从原处继续','Music resumes from the same position after 3 seconds'):l('A S D F G H J K 弹奏 · 音乐保持暂停','A S D F G H J K to play · Music stays paused')):state.selected?l('再次点击 CD 或按 Enter，向左展开盒盖。','Click the CD again or press Enter to open the lid.'):l('点击 CD 选中，再次点击开盒。','Select a CD, then click again to open.');
    $('open-button').textContent=!records.length?l('浏览作品系列','Explore series'):state.busy?l('正在开合','Opening / closing'):state.detail?l('查看作品','View photograph'):state.selected?l('打开 CD 盒','Open case'):l('选中当前档案','Select archive');
    $('open-button').disabled=!records.length;
    returnButton.hidden=!(state.selected||state.detail||state.busy);
    returnButton.textContent=l('合盒归位','Return');returnButton.disabled=false;
    $('previous').disabled=$('next').disabled=records.length<2;
    $('host-button').hidden=!state.resting;$('host-button').textContent=musicPlayback().playing?l('跟随音乐演奏 ↗','Follow music ↗'):l('播放音乐并演奏 ↗','Play music ↗');
    $('host-status').textContent=followingMusic?l('小人正跟随音乐演奏，钢琴静音','The figure follows the music; automatic piano is silent'):state.resting?l('小人在琴体右端休息','The figure is resting at the right end'):l('小人沿琴键退到右端休息','The figure is walking to the rest area');
    $('browse-link').textContent=l('浏览作品系列 ↗','Explore the series ↗');
    const nextSignature=JSON.stringify([state.mode,state.sound,state.resting,followingMusic,Studio.getLanguage()]);
    if(nextSignature!==controlsSignature){controlsSignature=nextSignature;document.dispatchEvent(new Event('piano:controls-change'));}
    dirty=true;
  }
  function insertCopy(record){
    const english=Studio.getLanguage()==='en';
    return {title:String(english?(record.titleEn||record.title):(record.title||record.titleEn)||''),
      series:record.seriesLabel||'',description:String(english?(record.descriptionEn||record.description):(record.description||record.descriptionEn)||'')};
  }
  function updateInsert(c,record){
    const copy=insertCopy(record),theme=document.documentElement.dataset.theme||'paper';
    const key=JSON.stringify([record.id,copy,theme,stageWidth<700]);if(c.insertKey===key)return;
    const dark=theme==='dark',canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
    const p=canvas.getContext('2d'),sans=getComputedStyle(document.documentElement).getPropertyValue('--sans').trim()||'sans-serif';
    p.fillStyle=dark?'#242725':theme==='white'?'#fafafa':'#f1eee5';p.fillRect(0,0,1024,1024);
    const ink=dark?'#ecebe4':'#242725',muted=dark?'#b8bcb5':'#666b65';
    const wrap=(text,font,maxWidth)=>{
      p.font=font;const lines=[];
      for(const paragraph of String(text).split(/\r?\n/)){
        let line='';for(const token of paragraph.match(/[A-Za-z0-9][A-Za-z0-9’'·.,:/-]*\s*|\s+|[^\s]/gu)||[]){
          if(line&&p.measureText(line+token).width>maxWidth){lines.push(line.trimEnd());line=token.trimStart();}else line+=token;
        }lines.push(line.trimEnd());
      }return lines;
    };
    p.textBaseline='top';p.fillStyle=muted;p.font=`500 38px ${sans}`;p.fillText(record.code,96,94);
    let titleSize=86,titleLines;
    do{titleLines=wrap(copy.title,`500 ${titleSize}px ${sans}`,832);if(titleLines.length<=3||titleSize<=34)break;titleSize-=4;}while(titleSize>0);
    let y=194;p.fillStyle=ink;for(const line of titleLines){p.fillText(line,96,y);y+=titleSize*1.21;}
    y+=26;p.fillStyle=muted;const seriesLines=wrap(copy.series,`400 44px ${sans}`,832);
    for(const line of seriesLines){p.fillText(line,96,y);y+=58;}
    if(copy.description){
      y+=50;let size=stageWidth<700?58:52,lines;
      do{lines=wrap(copy.description,`400 ${size}px ${sans}`,832);if(y+lines.length*size*1.52<=930||size<=20)break;size-=2;}while(size>0);
      p.fillStyle=ink;for(const line of lines){p.fillText(line,96,y);y+=size*1.52;}
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const old=c.inside.material.map;c.inside.material.map=texture;c.inside.material.needsUpdate=true;old?.dispose();
    c.insertKey=key;c.insertCopy=copy;dirty=true;
  }
  function updateCaseIdentity(c,index,activeCase){
    const record=records[index];if(!record)return;
    applyDiscPrint(c,record);
    if(activeCase&&state.selected)updateInsert(c,record);
    if(c.logical!==index||c.recordId!==record.id){
      c.logical=index;c.recordId=record.id;
      const old=c.code.material.map,fresh=print(record.code,2.45,.61,'#34515c',42);
      c.code.material.map=fresh.material.map;c.code.material.needsUpdate=true;fresh.geometry.dispose();fresh.material.dispose();old?.dispose();
      c.tabs.forEach((tab,i)=>tab.visible=i<=record.category);
    }
    const category=record.category;
    if(c.active!==activeCase||c.category!==category){
      c.active=activeCase;c.category=category;const glass=glassSets[category];
      c.back.material=glass.back;c.tray.material=glass.tray;c.lidBody.material=glass.pane;
      c.frameParts.forEach(p=>p.material=activeCase?glass.selected:glass.frame);c.tabs.forEach(p=>p.material=glass.tab);
    }
  }
  const point=new THREE.Vector3();
  function project(x,y,z){point.set(x,y,z).project(camera);return{x:(point.x*.5+.5)*stage.clientWidth,y:(-.5*point.y+.5)*stage.clientHeight};}
  function positionLabels(){} // No prototype status labels over the model.
  let stageWidth=0,stageHeight=0;
  function resize(){
    stageWidth=stage.clientWidth;stageHeight=stage.clientHeight;if(!stageWidth||!stageHeight)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,stageWidth<700?1.5:1.6));renderer.setSize(stageWidth,stageHeight,false);
    const aspect=stageWidth/stageHeight,w=aspect<1.25?22:Math.max(29,Math.min(35,aspect*13));
    camera.left=-w/2;camera.right=w/2;camera.top=w/aspect/2;camera.bottom=-w/aspect/2;
    camera.position.set(3.6,14,27);camera.lookAt(0,aspect<1.25?2.5:1.8,.7);camera.updateProjectionMatrix();camera.updateMatrixWorld();dirty=true;
    screenRight.set(1,0,0).applyQuaternion(camera.quaternion);
    screenUp.set(0,1,0).applyQuaternion(camera.quaternion);
    screenOut.set(0,0,1).applyQuaternion(camera.quaternion);
    // Exactly the former -0.69 rad world-Y presentation, without rotating the piano.
    shelfOrientation.copy(shelfTurn);
    selectedScreenOffset=-rowAnchor.clone().sub(camera.position).dot(screenRight);
    selectedUpOffset=(camera.top-camera.bottom)*.16-rowAnchor.clone().sub(camera.position).dot(screenUp);
    shelfScale=1;
    // Uniform scale only: both square halves fit as a single landscape object.
    selectedScale=Math.min(w*.88/8.35,(camera.top-camera.bottom)*.58/4.25);
    selectedScale=Math.min(selectedScale,stageWidth<700?2.6:1.75);
  }
  const observer=new ResizeObserver(resize);observer.observe(stage);
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function pick(clientX,clientY){
    const rect=canvas.getBoundingClientRect();pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
    if(state.detail){
      const c=cases.find(c=>c.root.visible&&c.root.userData.absolute===focusAbsolute());
      if(c&&ray.intersectObject(c.discRig,true).length)return c.root;
    }
    for(const hit of ray.intersectObjects(hitTargets.filter(o=>o.visible),true)){let o=hit.object;while(o&&!o.userData.role)o=o.parent;if(o?.userData.role)return o;}return null;
  }
  function discAt(clientX,clientY){
    pick(clientX,clientY); // Establish the ray using the same canvas rect.
    const c=cases.find(c=>c.root.visible&&c.root.userData.absolute===focusAbsolute());
    return !!(c&&ray.intersectObject(c.discRig,true).length);
  }
  function projectedRect(object,corners){
    const rect=canvas.getBoundingClientRect();object.updateWorldMatrix(true,false);
    const points=corners.map(([x,y,z])=>new THREE.Vector3(x,y,z).applyMatrix4(object.matrixWorld).project(camera));
    const xs=points.map(p=>rect.left+(p.x*.5+.5)*rect.width),ys=points.map(p=>rect.top+(-p.y*.5+.5)*rect.height);
    return {left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
  }
  function openCaseRect(){
    const c=cases.find(c=>c.root.visible&&c.root.userData.absolute===focusAbsolute());if(!c)return null;
    return projectedRect(c.root,[-6.1,2.125].flatMap(x=>[-2.125,2.125].map(y=>[x,y,.5])));
  }
  function caseRects(){
    const c=cases.find(c=>c.root.visible&&c.root.userData.absolute===focusAbsolute());if(!c)return null;
    return {whole:openCaseRect(),disc:workRect(records[c.logical]?.id),
      insert:projectedRect(c.inside,[-1.88,1.88].flatMap(x=>[-1.97,1.97].map(y=>[x,y,0])))};
  }
  function workRect(id){
    if(!active||layoutKind!=='home')return null;
    const c=cases.find(c=>c.root.visible&&records[c.logical]?.id===id&&c.root.userData.absolute===focusAbsolute());if(!c||!state.selected)return null;
    // Bounds belong to the circular disc, not its spinning square coordinate frame.
    const rect=canvas.getBoundingClientRect(),points=[],object=c.root;
    object.updateWorldMatrix(true,false);const extent=state.detail?1.67:2.125;
    for(const x of [-extent,extent])for(const y of [-extent,extent]){const p=new THREE.Vector3(x+(state.detail?.06:0),y,state.detail?.28:.6).applyMatrix4(object.matrixWorld).project(camera);points.push({x:rect.left+(p.x*.5+.5)*rect.width,y:rect.top+(-p.y*.5+.5)*rect.height});}
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return{left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
  }
  function pauseLifecycle(){
    if(!enabled()){
      resetHover(true);
      releasePianoKeys();followingMusic=false;restRequested=false;
      const pending=[hostTimeline,scrollTween,selectedTween,openTimeline,...gsap.getTweensOf([gait,hop,host.position,...keys])].filter(t=>t&&!t.paused()&&t.progress()<1);rafPause=[...new Set([...rafPause,...pending])];pending.forEach(t=>t.pause());
      if(master)master.gain.setTargetAtTime(0,audio.currentTime,.025);
    }else{rafPause.forEach(t=>t.resume());rafPause=[];if(master)master.gain.setTargetAtTime(state.sound?.24:0,audio.currentTime,.025);lastFrame=performance.now();dirty=true;syncMusic();}
  }
  canvas.addEventListener('pointerdown',e=>{if(!canInput()||e.button!==0||!e.isPrimary)return;
    const tilting=e.pointerType!=='mouse'&&updateHover(e.clientX,e.clientY);
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,tilting,onDisc:state.detail&&discAt(e.clientX,e.clientY)};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(!canInput())return;
    if(drag){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>16){drag.moved=true;canvas.classList.add('is-dragging');}
      const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;
      if(drag.tilting)updateHover(e.clientX,e.clientY);
      else if(drag.moved){resetHover();browseBy(-(Math.abs(dx)>Math.abs(dy)?dx:dy)/160);}
      drag.lastX=e.clientX;drag.lastY=e.clientY;}
    else {updateHover(e.clientX,e.clientY);canvas.classList.toggle('is-hovering',!!pick(e.clientX,e.clientY));}
  });
  canvas.addEventListener('pointerup',e=>{
    const was=drag;drag=null;canvas.classList.remove('is-dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    resetHover();
    if(!canInput()||!was||was.moved)return;
    const o=pick(e.clientX,e.clientY);if(!o){
      if(state.detail||state.busy||state.selected)closeCase();
      else document.dispatchEvent(new Event('exhibit:toggle-ui'));
      return;
    }
    if(o.userData.role==='key'){triggerNote(o.userData.note,true);dirty=true;}
    if(o.userData.role==='host'&&!followingMusic)startMusicPerformance();
    if(o.userData.role==='cd'){
      if(state.busy){if(o.userData.absolute!==focusAbsolute())selectAt(o.userData.absolute);else if(returning)openCase();else closeCase();return;}
      if(state.detail){
        if(o.userData.absolute!==focusAbsolute())selectAt(o.userData.absolute);
        else if(was.onDisc&&discAt(e.clientX,e.clientY))viewPhotograph();
        return;
      }
      const n=o.userData.absolute;if(state.selected&&Math.round(target)===n&&Math.abs(travel.value-target)<.02)openCase();else selectAt(n);
    }
  });
  canvas.addEventListener('pointerleave',()=>{if(!drag)resetHover();});
  canvas.addEventListener('pointercancel',()=>{drag=null;resetHover();canvas.classList.remove('is-dragging');});
  canvas.addEventListener('lostpointercapture',()=>{drag=null;resetHover();canvas.classList.remove('is-dragging');});
  // The intro/shelf gutters are outside the canvas but are still scene background.
  // Controls, navigation, paper insert and dialogs keep their own interactions.
  document.addEventListener('click',event=>{
    if(!canInput()||!(state.detail||state.busy||state.selected))return;
    const node=event.target;if(!(node instanceof Element)||!root.contains(node)||node===canvas)return;
    if(node.closest('a,button,input,select,textarea,[role="button"],dialog,.music-panel,.pm-dialog'))return;
    closeCase();
  });
  canvas.addEventListener('wheel',e=>{if(!canInput()||e.ctrlKey)return;e.preventDefault();const delta=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1);if(delta)browseBy(THREE.MathUtils.clamp(delta/140,-2,2));},{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(!canInput()||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='Escape'){e.preventDefault();closeCase();return;}
    if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)){
      e.preventDefault();
      go(['ArrowRight','ArrowDown'].includes(e.key)?1:-1);
    }
    else if(e.key==='Enter'){e.preventDefault();openCase();}
    else if(!e.repeat&&keyMap[e.key.toLowerCase()]!==undefined){e.preventDefault();heldPianoKeys.add(e.code||e.key.toLowerCase());triggerNote(keyMap[e.key.toLowerCase()],true);dirty=true;}
  });
  window.addEventListener('keyup',e=>{heldPianoKeys.delete(e.code||e.key.toLowerCase());if(!heldPianoKeys.size)window.StudioMusic?.endPiano()});
  canvas.addEventListener('blur',releasePianoKeys);window.addEventListener('blur',()=>{releasePianoKeys();resetHover();});
  document.querySelectorAll('[data-piano-mode]').forEach(b=>b.addEventListener('click',()=>b.dataset.pianoMode==='auto'?startMusicPerformance():setMode(b.dataset.pianoMode)));
  $('host-button').addEventListener('click',startMusicPerformance);
  $('sound-button').addEventListener('click',()=>toggleSound());
  $('previous').addEventListener('click',()=>go(-1));$('next').addEventListener('click',()=>go(1));
  $('open-button').addEventListener('click',()=>records.length?openCase():Studio.navigate('/series'));
  returnButton.addEventListener('click',()=>closeCase());
  document.addEventListener('visibilitychange',()=>{nextBeat=clockTime+.35;lastFrame=performance.now();pauseLifecycle();});
  document.addEventListener('studio:language',()=>{readRecords();syncUI();});
  document.addEventListener('paper-viewer:open',()=>{viewerOpen=true;pauseLifecycle();});
  document.addEventListener('paper-viewer:close',()=>{viewerOpen=false;pauseLifecycle();if(state.detail||state.busy)closeCase();});
  for(const id of ['contact-dialog','search-dialog','directory']){
    const dialog=document.getElementById(id);if(dialog)new MutationObserver(()=>{if(dialog.open){suspended=true;pauseLifecycle();}else{const base=Studio.getState().base;suspended=base!=='/'||!!StudioViewer.isOpen()||!!document.querySelector('.pm-dialog[open],dialog[open]');pauseLifecycle();}}).observe(dialog,{attributes:true,attributeFilter:['open']});
  }
  function syncTheme(){scene.background=new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#f3f1ed');dirty=true;}
  const themeObserver=new MutationObserver(syncTheme);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});syncTheme();
  reducedPreference.addEventListener('change',()=>{reduced=reducedPreference.matches;if(reduced){stopHost();pulses.length=0;resetHover(true);}restRequested=false;syncMusic();});
  let lastIndex=-1;
  function frame(_time,deltaMilliseconds){
    const now=performance.now();if(!enabled()){lastFrame=now;return;}
    // Keep melody scheduling on the same clock as the host's GSAP steps. Under a
    // slow GPU GSAP smooths elapsed time; wall time would keep cancelling a step
    // before its note callback can run. Do not change the site's global ticker.
    const dt=Math.min((deltaMilliseconds??(now-lastFrame))/1000,.25);lastFrame=now;
    const archiveMoving=stepArchive(Math.min(dt,.12));
    const hoverMoving=stepHover(dt);
    if(!state.paused&&!reduced)clockTime+=dt;
    // Render through the delayed tail after a manual key has already released.
    // A final dirty frame restores every case exactly to its resting position.
    for(let i=pulses.length-1;i>=0;i--)if(clockTime-pulses[i].time>=pulseLifetime){pulses.splice(i,1);dirty=true;}
    const moving=archiveMoving||hoverMoving||dirty||(!state.paused&&!reduced&&pulses.length>0)||[hostTimeline,scrollTween,selectedTween,openTimeline].some(t=>t?.isActive())||gsap.isTweening(keys)||gsap.isTweening(gait)||gsap.isTweening(hop);
    if(!followingMusic&&!moving)return;
    // Read the existing player's media clock, not wall-clock time. Seeking or
    // switching tracks cannot leave a queue of old choreography behind.
    const music=musicPlayback(),beat=Math.floor(music.currentTime/.49);
    if(followingMusic&&!hostTimeline?.isActive()&&records.length&&beat!==lastMusicBeat){
      lastMusicBeat=beat;
      const item=melody[beat%melody.length],note=Array.isArray(item)?item[0]:item;
      hostStep(note);hostTimeline.call(()=>{if(followingMusic&&enabled())triggerNote(note);});
    }
    dirty=false;tickCount++;
    const center=Math.round(travel.value), cur=mod(center,Math.max(1,records.length));
    cases.forEach((_,i)=>{
      const absolute=center+i-6,rel=absolute-travel.value,idx=mod(absolute,Math.max(1,records.length)),focus=absolute===focusAbsolute();
      const c=cases[mod(absolute,cases.length)];
      const visibleCount=Math.min(records.length,13),slot=i-6;
      const present=slot>=-Math.floor(visibleCount/2)&&slot<Math.ceil(visibleCount/2);
      c.root.visible=c.pool.visible=c.contact.visible=present;
      if(!present)return;
      c.root.userData.absolute=absolute;updateCaseIdentity(c,idx,focus);
      const wave=keyPulseHeight(i-6);
      placeUprightCase(c,rel,focus,wave);
    });
    keys.forEach(k=>{k.mesh.position.y=k.base-k.press*.095;k.mesh.rotation.x=-Math.PI/2+k.press*.02;});
    const walking=gait.walk, phase=clockTime*18;
    limbs[0].rotation.x=Math.sin(phase)*.56*walking-gait.sit*1.45;
    limbs[1].rotation.x=-Math.sin(phase)*.56*walking-gait.sit*1.45;
    limbs[2].rotation.x=-Math.sin(phase)*.4*walking-.25*gait.sit;limbs[3].rotation.x=Math.sin(phase)*.4*walking-.25*gait.sit;
    body.position.y=hop.value-gait.sit*.19;
    spriteRoot.quaternion.copy(camera.quaternion);
    if(state.pixel)drawSprite(gait.sit>.7?'sit':walking>.5&&Math.sin(phase)>0?'walk':'stand');
    if(cur!==lastIndex){lastIndex=cur;syncUI();}
    positionLabels();renderer.render(scene,camera);
  }

  async function refreshWorks(){
    const id=currentRecord()?.id;readRecords();coverRequest++;releaseCovers();coverTexture=null;
    cases.forEach(c=>{c.logical=-1;c.recordId=null;c.artworkKey=null;});resetOpening();scrollTween?.kill();selectedTween?.kill();select.value=0;state.selected=false;
    target=travel.value=Math.max(0,records.findIndex(w=>w.id===id));motion.selectedAbsolute=target;motion.navigating=false;motion.travelV=motion.selectV=motion.selectionGoal=0;resize();syncUI();return records.length;
  }
  const api={
    getMotionState:()=>({...motion,discSpin}),
    getHoverState:()=>({x:hover.x,y:hover.y,vx:hover.vx,vy:hover.vy,targetX:hover.tx,targetY:hover.ty,
      glow:hover.glow,u:hover.u,v:hover.v,inside:hover.inside,
      visible:cases.filter(c=>c.hoverSurface.visible).map(c=>c.recordId)}),
    getKeyWaves:()=>({time:clockTime,serial:pulseSerial,delay:pulseDelay,duration:pulseDuration,
      pulses:pulses.map(p=>({note:p.note,origin:p.origin,age:clockTime-p.time,serial:p.serial})),
      slots:cases.filter(c=>c.root.visible).map(c=>({id:c.recordId,note:c.keyNote,height:c.waveHeight||0,
        point:project(c.root.position.x,c.root.position.y,c.root.position.z)})),
      heights:Array.from({length:13},(_,note)=>keyPulseHeight(note-6))}),
    getOpenCaseRect:openCaseRect,getCaseRects:caseRects,
    getCaseState:()=>({phase:state.phase,lid:lid.value,extraction:0,lowering:0,
      shelfScale,selectedScale,readyToOpen:state.selected&&select.value>.999&&performance.now()>=selectionReadyAt,
      camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray()},
      cases:cases.filter(c=>c.root.visible).map(c=>({id:records[c.logical]?.id,
        absolute:c.root.userData.absolute,hinge:c.hinge.rotation.y,
        position:c.root.position.toArray(),quaternion:c.root.quaternion.toArray(),scale:c.root.scale.toArray(),
        screenAlignment:Math.abs(c.root.quaternion.dot(camera.quaternion)),insert:c.insertCopy,
        insertParent:c.inside.parent===c.hinge,
        disc:{position:c.discRig.position.toArray(),rotation:c.discRig.rotation.toArray().slice(0,3)},
        hub:c.hub.position.toArray(),faces:c.discRig.children.length,
        frontSide:c.disc.material.side,backSide:c.reverse.material.side,
        frontTexture:c.disc.material.map?.uuid,backMaterial:c.reverse.material.uuid,
        window:{thickness:c.lidBody.material.thickness,ior:c.lidBody.material.ior},
        detached:c.discRig.parent!==c.root}))}),
    getDiscArtwork:()=>({cachedImages:covers.size,cachedPrints:discPrints.size,
      discs:cases.filter(c=>c.root.visible).map(c=>({id:records[c.logical]?.id,ready:c.artworkReady===true,
        width:c.disc.material.map?.image?.width||0,height:c.disc.material.map?.image?.height||0,
        backDepth:c.back.geometry.parameters.options.depth,hingeDepth:c.hinge.position.z}))}),
    getState:()=>({ready:true,failed:false,active,suspended,viewing:viewerOpen,progress:1,count:records.length,photographs:records.length,...state,followingMusic,musicBeat:lastMusicBeat,index:currentIndex(),workId:currentRecord()?.id,target,position:travel.value,selection:select.value,lid:lid.value,caseCount:cases.filter(c=>c.root.visible).length,keyCount:keys.length,draws:tickCount,audio:audio?.state||'not-created',voices:voices.size,rest,host:{x:host.position.x,y:host.position.y,z:host.position.z},rendering:{revision:THREE.REVISION,cdEnvironment:cdEnvironmentName,independentPianoEnvironment:!!pianoEnvironment.texture,iridescence:gold.iridescence,transmission:clearPlastic.transmission,materialCount:pianoMaterials.size}}),
    setActive(value){if(active===!!value)return;active=!!value;pauseLifecycle();},
    setSuspended(value){if(suspended===!!value)return;suspended=!!value;pauseLifecycle();},
    setLayout(kind='home',series=null){if(layoutKind!==kind){layoutKind=kind;root.dataset.pianoActive=String(kind==='home');pauseLifecycle();}layoutSeries=series;},
    getLayout:()=>({kind:layoutKind,series:layoutSeries,ambientPaused:state.paused}),
    setAmbientPaused(value){state.paused=!!value;restRequested=false;syncMusic();},
    refreshWorks,getWorkRect:workRect,getCandidates:()=>[],replay:()=>setMode('auto'),gather:()=>setMode('browse'),
    points:()=>{const rect=canvas.getBoundingClientRect(),add=p=>({...p,x:p.x+rect.left,y:p.y+rect.top});return{keys:keys.map(k=>add(project(k.x,k.stand,k.z+.2))),cases:cases.filter(c=>c.root.visible).map(c=>({id:records[c.logical]?.id,absolute:c.root.userData.absolute,...add(project(c.root.position.x,c.root.position.y,c.root.position.z+.25))})),host:add(project(host.position.x,host.position.y+.8,host.position.z))};},
    hitTest:(x,y)=>{const o=pick(x,y);return o?{role:o.userData.role,note:o.userData.note,absolute:o.userData.absolute}:null;}
  };
  window.Exhibit=window.ScrollPaper=window.PianoArchive=api;
  canvas.classList.add('is-ready');$('loading').hidden=true;document.getElementById('paper-loading').hidden=true;
  resize();syncUI();nextBeat=.4;gsap.ticker.add(frame);document.dispatchEvent(new Event('exhibit:ready'));syncMusic();
  addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;gsap.ticker.remove(frame);observer.disconnect();themeObserver.disconnect();[hostTimeline,scrollTween,selectedTween,openTimeline].forEach(t=>t?.kill());stopHost();audio?.close();releaseCovers();cases.forEach(c=>c.inside.material.map?.dispose());scene.traverse(o=>{o.geometry?.dispose();});materials.forEach(m=>m.dispose());environment.dispose();cdEnvironment.dispose();pianoEnvironment.dispose();renderer.dispose();});
})().catch(error=>{console.error('Piano archive:',error);const node=document.getElementById('piano-loading');if(node){node.textContent='展厅暂时无法初始化，请从「作品分类」继续浏览。';node.hidden=false;}document.getElementById('paper-fallback').hidden=false;});
