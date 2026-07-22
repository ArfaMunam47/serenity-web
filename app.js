(() => {
'use strict';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hasGSAP = typeof gsap !== 'undefined';
if (hasGSAP && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

const mouse = { x: innerWidth/2, y: innerHeight/2 };
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

/* ---------- SCENE COLORS ---------- */
const SCENE_COLOR = {
  ocean:'112,180,210', aurora:'150,200,190', forest:'150,190,130',
  night:'217,178,124', rain:'150,170,200', snow:'220,230,240'
};
const SCENE_NAMES = {
  ocean:'Ocean · dusk', aurora:'Aurora · night sky', forest:'Forest · falling petals',
  night:'Night · fireflies', rain:'Rain · on glass', snow:'Snow · falling quiet'
};

/* ---------- LIVING BACKGROUND ---------- */
const bg = document.getElementById('bgCanvas');
const bctx = bg.getContext('2d');
let W,H,dpr;
function resizeBg(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;bg.width=W*dpr;bg.height=H*dpr;bctx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resizeBg);resizeBg();

let currentScene='ocean', targetScene='ocean', mix=1;
function sceneAlpha(name){ return currentScene===name ? mix : (targetScene===name ? 1-mix : 0); }

const stars=Array.from({length:110},()=>({x:rand(0,1),y:rand(0,0.6),r:rand(.5,1.6),tw:rand(0,6.28)}));
const fireflies=Array.from({length:24},()=>({x:rand(0,1)*innerWidth,y:rand(.3,1)*innerHeight,a:rand(0,6.28),spd:rand(.001,.003)}));
const petals=Array.from({length:18},()=>({x:rand(0,1)*innerWidth,y:rand(-1,0)*innerHeight,spd:rand(.4,1),drift:rand(0,6.28)}));
const rainDrops=Array.from({length:140},()=>({x:rand(0,1),y:rand(0,1),len:rand(10,26),spd:rand(4,9)}));
const snowFlakes=Array.from({length:90},()=>({x:rand(0,1)*innerWidth,y:rand(0,1)*innerHeight,r:rand(1,3.5),spd:rand(.3,1),drift:rand(0,6.28)}));
let waveT=0, auroraT=0;

function repelParticle(p, radius, force){
  const dx=p.x-mouse.x, dy=p.y-mouse.y, dist=Math.hypot(dx,dy);
  if(dist<radius){
    const f=(radius-dist)/radius*force;
    p.x += (dx/(dist||1))*f; p.y += (dy/(dist||1))*f;
  }
}

function drawOcean(a){
  if(a<=0)return; bctx.save();bctx.globalAlpha=a;
  const g=bctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1B2A3A');g.addColorStop(.6,'#0F2233');g.addColorStop(1,'#081420');
  bctx.fillStyle=g;bctx.fillRect(0,0,W,H);
  for(let i=0;i<4;i++){
    bctx.beginPath();const yy=H*0.55+i*30;bctx.moveTo(0,yy);
    for(let x=0;x<=W;x+=24)bctx.lineTo(x,yy+Math.sin(x*0.01+waveT*0.6+i)*10);
    bctx.lineTo(W,H);bctx.lineTo(0,H);bctx.closePath();
    bctx.fillStyle=`rgba(200,225,240,${0.03+i*0.015})`;bctx.fill();
  }
  bctx.restore();
}
function drawAurora(a){
  if(a<=0)return; bctx.save();bctx.globalAlpha=a;
  bctx.fillStyle='#0A0E18';bctx.fillRect(0,0,W,H);
  stars.forEach(s=>{
    const tw=0.5+0.5*Math.sin(auroraT*0.8+s.tw);
    bctx.beginPath();bctx.arc(s.x*W,s.y*H,s.r,0,6.283);
    bctx.fillStyle=`rgba(255,255,255,${tw*0.8})`;bctx.fill();
  });
  for(let i=0;i<3;i++){
    const grad=bctx.createLinearGradient(0,H*0.1,W,H*0.5);
    grad.addColorStop(0,'rgba(120,220,190,0)');
    grad.addColorStop(.5,`rgba(120,220,190,${0.12-i*0.03})`);
    grad.addColorStop(1,'rgba(160,140,220,0)');
    bctx.beginPath();const baseY=H*(0.15+i*0.12);bctx.moveTo(0,baseY);
    for(let x=0;x<=W;x+=30)bctx.lineTo(x,baseY+Math.sin(x*0.006+auroraT*0.4+i*2)*40);
    bctx.lineTo(W,baseY+140);bctx.lineTo(0,baseY+140);bctx.closePath();
    bctx.fillStyle=grad;bctx.fill();
  }
  bctx.restore();
}
function drawForest(a){
  if(a<=0)return; bctx.save();bctx.globalAlpha=a;
  const g=bctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#15201A');g.addColorStop(1,'#0A120D');
  bctx.fillStyle=g;bctx.fillRect(0,0,W,H);
  petals.forEach(p=>{
    p.y+=p.spd;p.drift+=0.01; if(p.y>H+10){p.y=-10;p.x=rand(0,W);}
    repelParticle(p,90,3);
    bctx.save();bctx.translate(p.x,p.y);bctx.rotate(p.drift);
    bctx.fillStyle='rgba(217,178,124,0.55)';
    bctx.beginPath();bctx.ellipse(0,0,7,3.5,0,0,6.283);bctx.fill();
    bctx.restore();
  });
  bctx.restore();
}
function drawNight(a){
  if(a<=0)return; bctx.save();bctx.globalAlpha=a;
  const g=bctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#05070C');g.addColorStop(1,'#0A0F14');
  bctx.fillStyle=g;bctx.fillRect(0,0,W,H);
  fireflies.forEach(f=>{
    f.a+=f.spd*10;
    f.x += Math.sin(f.a)*0.6; f.y += Math.cos(f.a*0.7)*0.4;
    repelParticle(f,110,2.4);
    if(f.x<0)f.x=W; if(f.x>W)f.x=0; if(f.y<0)f.y=H; if(f.y>H)f.y=0;
    const glow=0.4+0.6*Math.sin(f.a*2);
    bctx.beginPath();bctx.arc(f.x,f.y,2.2,0,6.283);
    bctx.fillStyle=`rgba(217,178,124,${glow})`;bctx.fill();
    bctx.beginPath();bctx.arc(f.x,f.y,7,0,6.283);
    bctx.fillStyle=`rgba(217,178,124,${glow*0.15})`;bctx.fill();
  });
  bctx.restore();
}
function drawRain(a){
  if(a<=0)return; bctx.save();bctx.globalAlpha=a;
  const g=bctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#141B26');g.addColorStop(1,'#0A0F17');
  bctx.fillStyle=g;bctx.fillRect(0,0,W,H);
  bctx.strokeStyle='rgba(160,190,220,0.35)';bctx.lineWidth=1;
  rainDrops.forEach(d=>{
    d.y+=d.spd*0.01;
    if(d.y>1.05)d.y=-0.05;
    const x=d.x*W, y=d.y*H;
    bctx.beginPath();bctx.moveTo(x,y);bctx.lineTo(x-4,y+d.len);bctx.stroke();
  });
  bctx.restore();
}
function drawSnow(a){
  if(a<=0)return; bctx.save();bctx.globalAlpha=a;
  const g=bctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1A2028');g.addColorStop(1,'#0C1015');
  bctx.fillStyle=g;bctx.fillRect(0,0,W,H);
  snowFlakes.forEach(f=>{
    f.y+=f.spd; f.drift+=0.01; f.x+=Math.sin(f.drift)*0.3;
    if(f.y>H+5){f.y=-5;f.x=rand(0,W);}
    repelParticle(f,80,2);
    bctx.beginPath();bctx.arc(f.x,f.y,f.r,0,6.283);
    bctx.fillStyle='rgba(255,255,255,0.75)';bctx.fill();
  });
  bctx.restore();
}
const SCENES={ocean:drawOcean,aurora:drawAurora,forest:drawForest,night:drawNight,rain:drawRain,snow:drawSnow};

function bgLoop(){
  waveT+=0.01;auroraT+=0.006;
  bctx.clearRect(0,0,W,H);
  Object.keys(SCENES).forEach(name=>SCENES[name](sceneAlpha(name)));
  requestAnimationFrame(bgLoop);
}
requestAnimationFrame(bgLoop);

/* scene switch on scroll */
const sceneEls=document.querySelectorAll('[data-scene]');
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const s=e.target.dataset.scene;
        if(s!==targetScene){
          currentScene=targetScene; targetScene=s; mix=0;
          document.getElementById('sceneName').textContent=SCENE_NAMES[s];
          document.documentElement.style.setProperty('--scene-color', SCENE_COLOR[s]);
          const anim=()=>{mix=Math.min(1,mix+0.02);if(mix<1)requestAnimationFrame(anim);};
          anim();
        }
      }
    });
  },{threshold:0.5});
  sceneEls.forEach(el=>io.observe(el));
}

/* ---------- CURSOR: simplified standard cursor + subtle sound feedback ---------- */
const cc=document.getElementById('cursorCanvas');
if(cc) cc.remove();

let lastCursorTone=0;
document.addEventListener('pointermove', e=>{
  if(!audioUnlocked) return;
  const now=performance.now();
  if(now - lastCursorTone < 300) return;
  lastCursorTone = now;
  AudioEngine.cursorTone();
});

/* ---------- GSAP: staged reveals + parallax (falls back gracefully) ---------- */
if(hasGSAP){
  document.querySelectorAll('.reveal').forEach(el=>{
    gsap.set(el,{opacity:0,y:34,filter:'blur(6px)'});
    ScrollTrigger.create({
      trigger: el, start:'top 85%',
      onEnter: () => gsap.to(el,{opacity:1,y:0,filter:'blur(0px)',duration:1.1,ease:'power3.out'}),
      once:true
    });
  });
  document.querySelectorAll('[data-scene]').forEach(sec=>{
    gsap.to(sec,{ backgroundPositionY:'20%', ease:'none',
      scrollTrigger:{ trigger:sec, start:'top bottom', end:'bottom top', scrub:true } });
  });
} else {
  document.querySelectorAll('.reveal').forEach(el=>el.style.opacity=1);
}

/* ---------- SOFT UI SOUND ---------- */
let audioUnlocked=false;
function unlockAudioOnce(){ if(!audioUnlocked){ audioUnlocked=true; } }
addEventListener('pointerdown', unlockAudioOnce, {once:true});

/* ---------- MINDFUL TRACKER ---------- */
const Mindful=(()=>{
  const KEY='serenity-mindful';const today=()=>new Date().toDateString();
  let state; try{state=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
  if(!state||state.date!==today())state={date:today(),seconds:0};
  const badge=document.getElementById('mindfulBadge');
  function render(){badge.textContent=`${Math.floor(state.seconds/60)} min of calm today`;}
  function add(){state.seconds++;try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}render();}
  render();return{add};
})();

/* ---------- AUDIO ENGINE ---------- */
const AudioEngine=(()=>{
  let ctx=null,noiseBuf=null;
  function getCtx(){if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();return ctx;}
  function noiseBuffer(c){if(noiseBuf)return noiseBuf;const len=c.sampleRate*2;const b=c.createBuffer(1,len,c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;noiseBuf=b;return b;}
  function noiseSrc(c){const s=c.createBufferSource();s.buffer=noiseBuffer(c);s.loop=true;return s;}
  function lfo(c,{freq=.15,depth=200,target}){const o=c.createOscillator();o.frequency.value=freq;const g=c.createGain();g.gain.value=depth;o.connect(g).connect(target);o.start();return o;}
  function schedule(fn,min,max){let cancelled=false;const tick=()=>{if(cancelled)return;fn();setTimeout(tick,rand(min,max));};const id=setTimeout(tick,rand(min,max));return()=>{cancelled=true;clearTimeout(id);};}

  function rain(c,out){const s=noiseSrc(c);const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=700;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=6500;s.connect(hp).connect(lp).connect(out);s.start();const l=lfo(c,{freq:.08,depth:800,target:lp.frequency});return()=>{s.stop();l.stop();};}
  function ocean(c,out){const s=noiseSrc(c);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;const sw=c.createGain();sw.gain.value=.6;s.connect(lp).connect(sw).connect(out);s.start();const l1=lfo(c,{freq:.09,depth:.35,target:sw.gain});const l2=lfo(c,{freq:.05,depth:500,target:lp.frequency});return()=>{s.stop();l1.stop();l2.stop();};}
  function fire(c,out){const s=noiseSrc(c);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500;const bed=c.createGain();bed.gain.value=.5;s.connect(lp).connect(bed).connect(out);s.start();const stop=schedule(()=>{const cr=c.createBufferSource();cr.buffer=noiseBuffer(c);const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=rand(1200,3200);bp.Q.value=4;const g=c.createGain();g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(rand(.25,.5),c.currentTime+.005);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+rand(.05,.15));cr.connect(bp).connect(g).connect(out);cr.start();cr.stop(c.currentTime+.2);},120,500);return()=>{s.stop();stop();};}
  function forestBed(c,out){const s=noiseSrc(c);const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1800;bp.Q.value=.5;const g=c.createGain();g.gain.value=.25;s.connect(bp).connect(g).connect(out);s.start();return()=>s.stop();}
  function birds(c,out){return schedule(()=>{const notes=[1600,1800,2100,2400];let t=c.currentTime;const n=Math.floor(rand(2,5));for(let i=0;i<n;i++){const o=c.createOscillator();o.type='sine';const f=notes[Math.floor(Math.random()*notes.length)];o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.3,t+.06);const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g).connect(out);o.start(t);o.stop(t+.15);t+=rand(.1,.2);}},1500,4500);}
  function forest(c,out){const b=forestBed(c,out);const bi=birds(c,out);return()=>{b();bi();};}
  function windf(c,out){const s=noiseSrc(c);const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=500;bp.Q.value=.6;const g=c.createGain();g.gain.value=.4;s.connect(bp).connect(g).connect(out);s.start();const l1=lfo(c,{freq:.12,depth:250,target:bp.frequency});const l2=lfo(c,{freq:.2,depth:.15,target:g.gain});return()=>{s.stop();l1.stop();l2.stop();};}
  function thunder(c,out){return schedule(()=>{const s=c.createBufferSource();s.buffer=noiseBuffer(c);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=180;const g=c.createGain();const t=c.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(rand(.3,.55),t+rand(.3,.8));g.gain.exponentialRampToValueAtTime(.001,t+rand(2,3.5));s.connect(lp).connect(g).connect(out);s.start(t);s.stop(t+4);},6000,16000);}
  function crickets(c,out){return schedule(()=>{let t=c.currentTime;const n=Math.floor(rand(3,7));for(let i=0;i<n;i++){const o=c.createOscillator();o.type='square';o.frequency.value=rand(3800,4400);const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=4000;bp.Q.value=8;const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.05);o.connect(bp).connect(g).connect(out);o.start(t);o.stop(t+.06);t+=.09;}},300,900);}
  function water(c,out){const s=noiseSrc(c);const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1400;bp.Q.value=1.2;const g=c.createGain();g.gain.value=.22;s.connect(bp).connect(g).connect(out);s.start();const l=lfo(c,{freq:1.1,depth:300,target:bp.frequency});return()=>{s.stop();l.stop();};}
  function whitenoise(c,out){const s=noiseSrc(c);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=9000;s.connect(lp).connect(out);s.start();return()=>s.stop();}

  const builders={rain,ocean,fireplace:fire,forest,wind:windf,thunder,birds,crickets,water,whitenoise};
  function start(name,vol=.6){
    const c=getCtx();const out=c.createGain();out.gain.value=0;out.gain.linearRampToValueAtTime(clamp(vol,0,1),c.currentTime+.9);
    const analyser=c.createAnalyser();analyser.fftSize=64;analyser.smoothingTimeConstant=.8;
    out.connect(analyser).connect(c.destination);
    const stopFn=builders[name]?builders[name](c,out):()=>{};
    let stopped=false;
    return{analyser,setVolume(v){out.gain.cancelScheduledValues(c.currentTime);out.gain.linearRampToValueAtTime(clamp(v,0,1),c.currentTime+.25);},
      stop(){if(stopped)return;stopped=true;out.gain.cancelScheduledValues(c.currentTime);out.gain.setValueAtTime(out.gain.value,c.currentTime);out.gain.linearRampToValueAtTime(0,c.currentTime+.5);setTimeout(()=>{try{stopFn();}catch(e){}out.disconnect();analyser.disconnect();},550);}};
  }
  function click(){ if(!audioUnlocked)return; const c=getCtx();const o=c.createOscillator();o.type='sine';o.frequency.value=880;const g=c.createGain();const t=c.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+.12);o.connect(g).connect(c.destination);o.start(t);o.stop(t+.14); }
  function cursorTone(){ if(!audioUnlocked) return; const c=getCtx(); const o=c.createOscillator(); o.type='triangle'; o.frequency.value=520; const g=c.createGain(); const t=c.currentTime; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.02,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+.18); o.connect(g).connect(c.destination); o.start(t); o.stop(t+.16); }
  return{start,click,cursorTone};
})();

document.addEventListener('click', e=>{ if(e.target.closest('button, .chip, .btn, .mood-btn')) AudioEngine.click(); });

/* ---------- SOUND LIBRARY ---------- */
const SOUND_DEFS=[
  {key:'rain',title:'Rain',desc:'A soft steady shower'},
  {key:'ocean',title:'Ocean Waves',desc:'Slow tide, distant and warm'},
  {key:'fireplace',title:'Fireplace',desc:'A gentle crackling glow'},
  {key:'forest',title:'Forest',desc:'Leaves, wind, quiet birdsong'},
  {key:'wind',title:'Wind',desc:'A steady open-air breeze'},
  {key:'water',title:'Stream',desc:'Water over smooth stone'},
];
const grid=document.getElementById('soundGrid');
let favs=new Set();try{favs=new Set(JSON.parse(localStorage.getItem('serenity-favs')||'[]'));}catch(e){}
function saveFavs(){try{localStorage.setItem('serenity-favs',JSON.stringify([...favs]));}catch(e){}}

grid.innerHTML=SOUND_DEFS.map(d=>`
  <article class="sound-card glass" data-key="${d.key}">
    <div class="sound-card__top">
      <div><div class="sound-card__title">${d.title}</div><div class="sound-card__desc">${d.desc}</div></div>
      <button class="fav-btn magnetic ${favs.has(d.key)?'is-fav':''}" aria-label="Favorite ${d.title}">★</button>
    </div>
    <canvas class="wave" width="300" height="44"></canvas>
    <div class="sound-card__ctrl">
      <button class="play-btn magnetic" aria-label="Play ${d.title}">
        <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5Z"/></svg>
        <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
      </button>
      <input class="vol" type="range" min="0" max="100" value="60">
    </div>
  </article>
`).join('');

let activeCard=null, activeCtrl=null, activeRaf=null;
grid.querySelectorAll('.sound-card').forEach(card=>{
  const key=card.dataset.key;
  const playBtn=card.querySelector('.play-btn');
  const favBtn=card.querySelector('.fav-btn');
  const vol=card.querySelector('.vol');
  const wave=card.querySelector('.wave');
  const wctx=wave.getContext('2d');

  favBtn.addEventListener('click',()=>{
    if(favs.has(key)){favs.delete(key);favBtn.classList.remove('is-fav');}
    else{favs.add(key);favBtn.classList.add('is-fav');}
    saveFavs();
  });

  function drawWave(){
    if(!activeCtrl||activeCard!==card){wctx.clearRect(0,0,300,44);return;}
    const data=new Uint8Array(activeCtrl.analyser.frequencyBinCount);
    activeCtrl.analyser.getByteFrequencyData(data);
    wctx.clearRect(0,0,300,44);
    const bars=28,bw=300/bars;
    for(let i=0;i<bars;i++){
      const v=data[i+1]||0;const h=Math.max(2,(v/255)*38);
      wctx.fillStyle='rgba(217,178,124,.85)';
      wctx.fillRect(i*bw+1,44-h,bw-2,h);
    }
    activeRaf=requestAnimationFrame(drawWave);
  }

  playBtn.addEventListener('click',()=>{
    const isPlaying=card.classList.contains('playing');
    if(activeCard && activeCard!==card){
      activeCard.classList.remove('playing');
      if(activeCtrl)activeCtrl.stop();
      cancelAnimationFrame(activeRaf);
    }
    if(isPlaying){
      card.classList.remove('playing');
      if(activeCtrl)activeCtrl.stop();
      cancelAnimationFrame(activeRaf);
      activeCard=null;activeCtrl=null;
    }else{
      card.classList.add('playing');
      activeCtrl=AudioEngine.start(key,vol.value/100);
      activeCard=card;
      drawWave();
    }
  });
  vol.addEventListener('input',()=>{if(card===activeCard&&activeCtrl)activeCtrl.setVolume(vol.value/100);});
});

/* ---------- MIXER + PRESETS ---------- */
const MIXER_DEFS=[{key:'rain',label:'Rain'},{key:'thunder',label:'Thunder'},{key:'wind',label:'Wind'},{key:'birds',label:'Birds'},{key:'fireplace',label:'Fire'},{key:'crickets',label:'Crickets'},{key:'water',label:'Water'},{key:'whitenoise',label:'White noise'}];
const mixerGrid=document.getElementById('mixerGrid');
const masterVol=document.getElementById('masterVol');
const BASE=0.45;const controllers={};let master=Number(masterVol.value)/100;

mixerGrid.innerHTML=MIXER_DEFS.map(d=>`
  <button class="mixer-toggle glass magnetic" data-key="${d.key}" aria-pressed="false">
    <span class="dot-ring"></span><span>${d.label}</span>
  </button>
`).join('');

function setMixState(activeKeys){
  mixerGrid.querySelectorAll('.mixer-toggle').forEach(t=>{
    const key=t.dataset.key, shouldBeActive=activeKeys.includes(key), isActive=t.classList.contains('active');
    if(shouldBeActive && !isActive){ t.classList.add('active'); t.setAttribute('aria-pressed','true'); controllers[key]=AudioEngine.start(key,BASE*master); }
    if(!shouldBeActive && isActive){ t.classList.remove('active'); t.setAttribute('aria-pressed','false'); if(controllers[key]){controllers[key].stop();delete controllers[key];} }
  });
}
mixerGrid.querySelectorAll('.mixer-toggle').forEach(t=>{
  t.addEventListener('click',()=>{
    const key=t.dataset.key;const active=t.classList.toggle('active');
    t.setAttribute('aria-pressed',String(active));
    if(active){controllers[key]=AudioEngine.start(key,BASE*master);}
    else if(controllers[key]){controllers[key].stop();delete controllers[key];}
  });
});
masterVol.addEventListener('input',()=>{master=Number(masterVol.value)/100;Object.values(controllers).forEach(c=>c.setVolume(BASE*master));});

// saved presets (named mixes of active keys), persisted locally
const PRESET_KEY='serenity-presets';
function loadPresets(){ try{return JSON.parse(localStorage.getItem(PRESET_KEY)||'[]');}catch(e){return [];} }
function savePresets(list){ try{localStorage.setItem(PRESET_KEY,JSON.stringify(list));}catch(e){} }
const presetList=document.getElementById('presetList');
function renderPresetOptions(){
  const list=loadPresets();
  presetList.innerHTML='<option value="">Saved mixes…</option>'+list.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');
}
renderPresetOptions();
document.getElementById('savePreset').addEventListener('click',()=>{
  const active=[...mixerGrid.querySelectorAll('.mixer-toggle.active')].map(t=>t.dataset.key);
  if(!active.length)return;
  const name=prompt('Name this mix:','My mix');
  if(!name)return;
  const list=loadPresets(); list.push({name,keys:active}); savePresets(list); renderPresetOptions();
});
presetList.addEventListener('change',()=>{
  const i=presetList.value; if(i==='')return;
  const list=loadPresets(); const p=list[Number(i)];
  if(p) setMixState(p.keys);
});

/* ---------- BREATHING ---------- */
(function initBreathing(){
  const orb=document.getElementById('orb'),label=document.getElementById('orbLabel'),count=document.getElementById('orbCount');
  const timerDisplay=document.getElementById('breatheTimer'),toggleBtn=document.getElementById('breatheToggle'),resetBtn=document.getElementById('breatheReset');
  const PATTERNS={
    calm:[{n:'phase-in',t:'Breathe in',d:4},{n:'phase-hold',t:'Hold',d:4},{n:'phase-out',t:'Breathe out',d:6},{n:'phase-hold',t:'Hold',d:2}],
    box:[{n:'phase-in',t:'Breathe in',d:4},{n:'phase-hold',t:'Hold',d:4},{n:'phase-out',t:'Breathe out',d:4},{n:'phase-hold',t:'Hold',d:4}],
    '478':[{n:'phase-in',t:'Breathe in',d:4},{n:'phase-hold',t:'Hold',d:7},{n:'phase-out',t:'Breathe out',d:8}],
  };
  let phases=PATTERNS.calm,running=false,idx=0,left=phases[0].d,total=0,iv=null;
  function renderPhase(){const p=phases[idx];orb.classList.remove('phase-in','phase-hold','phase-out');orb.classList.add(p.n);label.textContent=p.t;count.textContent=String(left);}
  function tick(){total++;left--;const m=String(Math.floor(total/60)).padStart(2,'0'),s=String(total%60).padStart(2,'0');timerDisplay.textContent=`${m}:${s}`;Mindful.add();if(left<=0){idx=(idx+1)%phases.length;left=phases[idx].d;}renderPhase();}
  function start(){running=true;toggleBtn.textContent='Pause session';renderPhase();iv=setInterval(tick,1000);}
  function pause(){running=false;toggleBtn.textContent='Resume session';clearInterval(iv);label.textContent='Paused';}
  function reset(){pause();idx=0;left=phases[0].d;total=0;timerDisplay.textContent='00:00';orb.classList.remove('phase-in','phase-hold','phase-out');label.textContent='Begin';count.textContent='';toggleBtn.textContent='Start session';}
  toggleBtn.addEventListener('click',()=>running?pause():start());
  orb.addEventListener('click',()=>running?pause():start());
  resetBtn.addEventListener('click',reset);
  document.querySelectorAll('.chips .chip').forEach(chip=>chip.addEventListener('click',()=>{
    document.querySelectorAll('.chips .chip').forEach(c=>c.setAttribute('aria-pressed','false'));
    chip.setAttribute('aria-pressed','true');
    phases=PATTERNS[chip.dataset.pattern]||PATTERNS.calm;reset();
  }));
})();

/* ---------- FOCUS TIMER ---------- */
(function initFocus(){
  const timeEl=document.getElementById('ringTime'),stateEl=document.getElementById('ringState'),ring=document.getElementById('ringProgress');
  const startBtn=document.getElementById('focusStart'),pauseBtn=document.getElementById('focusPause'),resetBtn=document.getElementById('focusReset');
  const presets=document.querySelectorAll('#focusPresets .chip'),sessionsEl=document.getElementById('focusSessions');
  const CIRC=2*Math.PI*88;let total=300,left=total,iv=null,running=false;
  let sessions=0;try{const raw=JSON.parse(localStorage.getItem('serenity-focus-sessions')||'null');if(raw&&raw.date===new Date().toDateString())sessions=raw.count;}catch(e){}
  function renderSessions(){sessionsEl.textContent=`${sessions} session${sessions===1?'':'s'} today`;}
  function record(){sessions++;try{localStorage.setItem('serenity-focus-sessions',JSON.stringify({date:new Date().toDateString(),count:sessions}));}catch(e){}renderSessions();}
  function render(){const m=String(Math.floor(left/60)).padStart(2,'0'),s=String(left%60).padStart(2,'0');timeEl.textContent=`${m}:${s}`;const p=1-left/total;ring.style.strokeDashoffset=String(CIRC*(1-p));}
  function setMin(min){total=min*60;left=total;stateEl.textContent='ready';render();}
  function tick(){left--;render();Mindful.add();if(left<=0)complete();}
  function start(){running=true;stateEl.textContent='focusing';startBtn.disabled=true;pauseBtn.disabled=false;iv=setInterval(tick,1000);}
  function pause(){running=false;stateEl.textContent='paused';clearInterval(iv);startBtn.disabled=false;pauseBtn.disabled=true;}
  function reset(){clearInterval(iv);running=false;left=total;stateEl.textContent='ready';startBtn.disabled=false;pauseBtn.disabled=true;render();}
  function complete(){clearInterval(iv);running=false;stateEl.textContent='complete';startBtn.disabled=false;pauseBtn.disabled=true;record();}
  startBtn.addEventListener('click',start);pauseBtn.addEventListener('click',pause);resetBtn.addEventListener('click',reset);
  presets.forEach(btn=>btn.addEventListener('click',()=>{if(running)pause();presets.forEach(b=>b.setAttribute('aria-pressed','false'));btn.setAttribute('aria-pressed','true');setMin(Number(btn.dataset.min));}));
  render();renderSessions();
})();

/* ---------- QUOTE ---------- */
const QUOTES=[
  {t:'Peace is not the absence of noise, but the presence of stillness within it.'},
  {t:'Slowness is not a delay. It is a different kind of arrival.'},
  {t:'The quietest room in the house is the one inside your own breath.'},
  {t:'Rest is not earned. It is simply allowed.'},
  {t:'A calm mind is not empty — it is spacious.'},
  {t:'Exhale a little longer than you inhaled. That is the whole secret.'},
];
(function initQuote(){
  const textEl=document.getElementById('quoteText'),btn=document.getElementById('quoteBtn');
  let last=-1;
  btn.addEventListener('click',()=>{
    let i=last;while(i===last)i=Math.floor(Math.random()*QUOTES.length);last=i;
    textEl.style.opacity=0;
    setTimeout(()=>{textEl.textContent=QUOTES[i].t;textEl.style.opacity=1;},250);
  });
})();

/* ---------- MOOD ---------- */
(function initMood(){
  const buttons=document.querySelectorAll('.mood-btn'),resp=document.getElementById('moodResp');
  buttons.forEach(btn=>btn.addEventListener('click',()=>{
    buttons.forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');
    resp.textContent=`Feeling ${btn.dataset.mood.toLowerCase()} today — we're glad you're here.`;
  }));
})();

})();