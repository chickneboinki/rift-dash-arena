const $ = (id) => document.getElementById(id);
const STORAGE = 'rift-profile-v1';
const SKINS = [
  { id:'bone', name:'BONE REVENANT', rarity:'Starter', price:0, mark:'☠', color:'#d7d5c8', desc:'Night patrol operative' },
  { id:'gilded', name:'GILDED SENTINEL', rarity:'Rare', price:800, mark:'✦', color:'#e8bf55', desc:'Gold-series guardian' },
  { id:'arctic', name:'ARCTIC STRIKE', rarity:'Rare', price:650, mark:'❄', color:'#a9e6f5', desc:'Cold-front specialist' },
  { id:'neon', name:'NEON PHANTOM', rarity:'Epic', price:1200, mark:'✧', color:'#e58bff', desc:'After-hours infiltrator' }
];
const MODES = [
  {name:'FREE PLAY',sub:'Warm up against bots',icon:'⌖',mode:'Free Play'},
  {name:'CREATIVE',sub:'Practice your builds',icon:'▧',mode:'Creative'},
  {name:'1 V 1',sub:'Solo build-fight practice',icon:'⚔',mode:'1v1'},
  {name:'2 V 2',sub:'Team practice with bots',icon:'♟',mode:'2v2'},
  {name:'BOX FIGHTS',sub:'Close-range combat drills',icon:'▦',mode:'Box Fights'},
  {name:'ZONE WARS',sub:'Rotate through the arena',icon:'◉',mode:'Zone Wars'}
];
function loadProfile(){
  try { const p=JSON.parse(localStorage.getItem(STORAGE)||'{}'); return {coins:Number.isFinite(p.coins)?p.coins:1500,unlocked:Array.isArray(p.unlocked)?[...new Set(['bone',...p.unlocked])]:['bone'],equipped:p.equipped||localStorage.getItem('rift-skin')||'bone',matches:p.matches||0,elims:p.elims||0}; }
  catch { return {coins:1500,unlocked:['bone'],equipped:'bone',matches:0,elims:0}; }
}
let profile=loadProfile(),tab='PLAY';
function save(){localStorage.setItem(STORAGE,JSON.stringify(profile));localStorage.setItem('rift-skin',profile.equipped);render();}
function setTab(next){tab=next;render();}
function start(mode,practice=false){
  const card=[...document.querySelectorAll('.mode-card')].find(x=>x.dataset.mode===mode);
  if(card)card.click();
  profile.matches+=1;localStorage.setItem(STORAGE,JSON.stringify(profile));
  (practice?$('practiceBtn'):$('playBtn')).click();
}
function equip(id){
  if(!profile.unlocked.includes(id))return;
  profile.equipped=id;localStorage.setItem('rift-skin',id);
  const card=document.querySelector('.skin-card[data-skin="'+id+'"]');if(card)card.click();
  save();
}
function buy(id){
  const skin=SKINS.find(s=>s.id===id);if(!skin||profile.unlocked.includes(id))return;
  if(profile.coins<skin.price){notify('NOT ENOUGH RIFT COINS');return;}
  profile.coins-=skin.price;profile.unlocked.push(id);profile.equipped=id;
  const card=document.querySelector('.skin-card[data-skin="'+id+'"]');if(card)card.click();
  save();notify(skin.name+' UNLOCKED');
}
function notify(msg){let n=$('riftNotice');if(!n){n=document.createElement('div');n.id='riftNotice';document.body.append(n);}n.textContent=msg;n.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>n.classList.remove('show'),1800);}
function shell(){
  const root=document.createElement('div');root.id='metaLobby';root.innerHTML=`
    <header class="lobby-head">
      <div class="lobby-brand"><span class="lobby-logo">R</span><span>RIFT<span>/</span>ARENA</span><small>SEASON ZERO</small></div>
      <div class="lobby-user"><span class="user-avatar">R</span><div><b>ROOKIE</b><small>ARENA RECRUIT</small></div></div>
      <div class="wallet"><span class="coin-symbol">✦</span><b id="walletCoins">1,500</b><small>RIFT COINS</small></div>
    </header>
    <div class="lobby-body">
      <nav class="lobby-nav">
        <button data-tab="PLAY">⌂ <span>PLAY</span></button>
        <button data-tab="LOCKER">◈ <span>LOCKER</span></button>
        <button data-tab="SHOP">✧ <span>ITEM SHOP</span></button>
        <div class="nav-spacer"></div><div class="nav-foot"><b>RIFT ARENA</b><small>BUILD 0.2 · LOCAL PROFILE</small></div>
      </nav>
      <main class="lobby-content" id="lobbyContent"></main>
    </div>
    <footer class="lobby-footer"><span><i></i> TRAINING INSTANCE READY</span><span>ONLINE MATCHMAKING NOT CONNECTED · LOCAL BOT PLAY</span><span>V 0.2.0</span></footer>`;
  $('menu').classList.add('meta-lobby-active');$('menu').append(root);
  root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
}
function skinCard(s,shop=false){
  const unlocked=profile.unlocked.includes(s.id),equipped=profile.equipped===s.id;
  return `<article class="locker-card ${equipped?'is-equipped':''}">
    <div class="skin-preview" style="--skin-accent:${s.color}"><span>${s.mark}</span><small>${s.rarity.toUpperCase()}</small></div>
    <div class="skin-info"><b>${s.name}</b><small>${s.desc}</small></div>
    ${unlocked?(equipped?'<button class="owned-btn" disabled>EQUIPPED ✓</button>':`<button class="equip-btn" data-equip="${s.id}">EQUIP</button>`):`<button class="buy-btn" data-buy="${s.id}">✦ ${s.price.toLocaleString()} COINS</button>`}
  </article>`;
}
function render(){
  if(!$('lobbyContent'))return;
  $('walletCoins').textContent=profile.coins.toLocaleString();
  document.querySelectorAll('.lobby-nav [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const content=$('lobbyContent');
  if(tab==='PLAY'){
    content.innerHTML=`
      <div class="lobby-welcome"><div><span class="lobby-kicker">WELCOME BACK, RECRUIT</span><h1>YOUR ARENA<br><em>AWAITS.</em></h1><p>Choose a playlist, sharpen your mechanics, and earn Rift Coins by playing.</p></div><div class="welcome-emblem">R<span>✦</span></div></div>
      <div class="section-row"><div><span class="lobby-kicker">SELECT YOUR PLAYLIST</span><h2>GAME MODES</h2></div><span class="local-tag">LOCAL BOT MATCHES</span></div>
      <div class="playlist-grid">${MODES.map(m=>`<button class="playlist-card" data-mode-start="${m.mode}"><span class="playlist-icon">${m.icon}</span><b>${m.name}</b><small>${m.sub}</small><i>↗</i></button>`).join('')}</div>
      <div class="lobby-bottom-grid"><section class="featured-skin"><div><span class="lobby-kicker">CURRENT OUTFIT</span><h3>${(SKINS.find(s=>s.id===profile.equipped)||SKINS[0]).name}</h3><p>Ready for the next drop.</p><button class="outline-action" data-goto="LOCKER">OPEN LOCKER ↗</button></div><div class="featured-mark">${(SKINS.find(s=>s.id===profile.equipped)||SKINS[0]).mark}</div></section><section class="career-card"><span class="lobby-kicker">CAREER SNAPSHOT</span><div class="career-stats"><div><b>${profile.matches}</b><small>MATCHES</small></div><div><b>${profile.elims}</b><small>ELIMS</small></div><div><b>${profile.unlocked.length}</b><small>OUTFITS</small></div></div><small class="career-note">Progress is saved in this browser on this device.</small></section></div>`;
  } else if(tab==='LOCKER'){
    content.innerHTML=`<div class="page-heading"><div><span class="lobby-kicker">YOUR COLLECTION</span><h1>THE LOCKER</h1><p>Equip an outfit you own. Unlock more in the Item Shop.</p></div><div class="locker-count">${profile.unlocked.length}<small>/ ${SKINS.length} OUTFITS</small></div></div><div class="locker-grid">${SKINS.map(s=>skinCard(s)).join('')}</div>`;
  } else {
    content.innerHTML=`<div class="page-heading"><div><span class="lobby-kicker">ROTATING COSMETICS</span><h1>ITEM SHOP</h1><p>Original RIFT outfits. Purchases use local demo currency.</p></div><div class="shop-wallet">✦ ${profile.coins.toLocaleString()}<small>YOUR BALANCE</small></div></div><div class="shop-feature"><div><span class="lobby-kicker">FEATURED DROP · SEASON ZERO</span><h2>GEAR UP.<br><em>STAND OUT.</em></h2><p>Unlock new looks for your next arena run.</p></div><div class="shop-spark">✧</div></div><div class="section-row"><div><span class="lobby-kicker">AVAILABLE NOW</span><h2>OUTFIT STORE</h2></div><span class="local-tag">DEMO SHOP</span></div><div class="locker-grid shop-grid">${SKINS.filter(s=>s.id!=='bone').map(s=>skinCard(s,true)).join('')}</div>`;
  }
  content.querySelectorAll('[data-mode-start]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.modeStart)));
  content.querySelectorAll('[data-equip]').forEach(b=>b.addEventListener('click',()=>equip(b.dataset.equip)));
  content.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>buy(b.dataset.buy)));
  content.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.goto)));
}
function init(){
  if(!$('menu')||$('metaLobby'))return;
  shell();render();
  const elims=$('elims');
  if(elims)new MutationObserver(()=>{const n=Number(elims.textContent)||0;if(n>profile.elims){profile.coins+=(n-profile.elims)*25;profile.elims=n;save();notify('+25 RIFT COINS · ELIMINATION');}}).observe(elims,{childList:true,characterData:true,subtree:true});
  window.addEventListener('storage',e=>{if(e.key===STORAGE){profile=loadProfile();render();}});
}
init();
