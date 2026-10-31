import * as THREE from 'three';
const $=id=>document.getElementById(id),menu=$('menu'),game=$('game'),canvas=$('world');
let selectedMode='Free Play',selectedSkin=localStorage.getItem('rift-skin')||'bone',renderer,scene,camera,clock,player,playerModel,weapon,yaw=0,pitch=-.08,keys={},velocityY=0,grounded=true,sensitivity=1,health=100,elims=0,bots=[],buildItems=[],pointerLocked=false,gameStarted=false,lastFrame=performance.now(),frameCount=0,quality='High',performanceMode=false;
const SKINS={bone:{name:'BONE REVENANT',body:0x333a43,accent:0xd8d9d4,skin:0xd9d8d1,style:'skull'},gilded:{name:'GILDED SENTINEL',body:0x80601e,accent:0xffd45a,skin:0xb98759,style:'gold'},arctic:{name:'ARCTIC STRIKE',body:0x536d80,accent:0xbfe8f3,skin:0xc99b7d,style:'standard'},neon:{name:'NEON PHANTOM',body:0x28233e,accent:0xd75bff,skin:0xb98772,style:'standard'}};
document.querySelectorAll('.skin-card').forEach(card=>{if(card.dataset.skin===selectedSkin)card.classList.add('selected');card.addEventListener('click',()=>selectSkin(card.dataset.skin));});
function selectSkin(id){if(!SKINS[id])return;selectedSkin=id;localStorage.setItem('rift-skin',id);document.querySelectorAll('.skin-card').forEach(c=>c.classList.toggle('selected',c.dataset.skin===id));if(player&&playerModel){player.remove(playerModel);const s=SKINS[id];playerModel=makeCharacter(s.body,s.accent,s.skin,s.style);player.add(playerModel);}toast(SKINS[id].name+' EQUIPPED');}
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
document.querySelectorAll('.mode-card').forEach(card=>card.addEventListener('click',()=>{document.querySelectorAll('.mode-card').forEach(c=>c.classList.remove('selected'));card.classList.add('selected');selectedMode=card.dataset.mode;}));
$('playBtn').onclick=()=>startGame(false);$('practiceBtn').onclick=()=>{selectedMode='Free Play';startGame(true);};$('leaveBtn').onclick=leaveGame;$('settingsBtn').onclick=openSettings;$('closeSettings').onclick=$('resumeBtn').onclick=closeSettings;
$('sensitivity').oninput=e=>{sensitivity=+e.target.value;$('sensOut').textContent=sensitivity.toFixed(1)+'x';};
$('fov').oninput=e=>{$('fovOut').textContent=e.target.value+'°';if(camera){camera.fov=+e.target.value;camera.updateProjectionMatrix();}};
$('quality').onchange=e=>setQuality(e.target.value);$('perfMode').onchange=e=>{performanceMode=e.target.checked;if(renderer)renderer.setPixelRatio(performanceMode?1:Math.min(devicePixelRatio,quality==='Ultra'?2:1.5));toast(performanceMode?'Performance mode enabled':'Performance mode disabled');};
$('editRelease').onchange=e=>toast('Edit on release '+(e.target.checked?'enabled':'disabled'));
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600);}
function openSettings(){$('settings').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();}
function closeSettings(){$('settings').classList.add('hidden');}
function material(color,roughness=.65,metalness=0,extra={}){return new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});}
function box(parent,size,pos,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function capsule(parent,r,l,pos,mat){const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,l,5,10),mat);m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function rod(parent,a,b,r,mat){const d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),10),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m;}
function startGame(quick){menu.classList.add('hidden');game.classList.remove('hidden');$('modeLabel').textContent=(quick?'FREE PLAY':selectedMode).toUpperCase();if(!gameStarted){initWorld();gameStarted=true;}else resetArena();$('hint').textContent='CLICK TO CAPTURE MOUSE · WASD MOVE · SPACE JUMP · Q/F/C/V BUILD · LEFT CLICK FIRE';animate();}
function leaveGame(){if(document.pointerLockElement)document.exitPointerLock();game.classList.add('hidden');menu.classList.remove('hidden');}
function setQuality(v){quality=v;if(renderer){renderer.shadowMap.enabled=v!=='Low';renderer.setPixelRatio(performanceMode?1:Math.min(devicePixelRatio,v==='Ultra'?2:v==='High'?1.5:1));}toast(v+' graphics quality');}
function makeCharacter(primary,accent,skin=0xd5a27f,style='standard'){
 const root=new THREE.Group(),cloth=material(primary,.82),trim=material(accent,.52,.12),dark=material(0x202832,.72),skinMat=material(skin,.78),boot=material(0x171d25,.6,.08);
 for(const s of [-1,1]){const x=s*.19;capsule(root,.115,.48,V(x,.53,0),dark);capsule(root,.13,.28,V(x,.25,.015),boot);box(root,[.28,.14,.38],[x,.12,.07],boot);
 const shoulder=V(s*.39,1.34,0),elbow=V(s*.48,.98,.03),wrist=V(s*.45,.76,.14);capsule(root,.15,.25,shoulder,trim);rod(root,shoulder,elbow,.105,cloth);capsule(root,.095,.2,elbow,dark);rod(root,elbow,wrist,.085,cloth);capsule(root,.095,.1,wrist,skinMat);box(root,[.13,.1,.12],[s*.45,.7,.15],dark);}
 capsule(root,.285,.48,V(0,1.08,0),cloth);box(root,[.48,.46,.18],[0,1.12,.16],trim);box(root,[.18,.26,.045],[0,1.13,.265],dark);
 for(const s of [-1,1])box(root,[.12,.18,.045],[s*.14,1.17,.27],material(0x82929b,.48,.22));
 box(root,[.54,.09,.24],[0,.83,0],dark);for(let i=0;i<3;i++)box(root,[.1,.13,.06],[-.16+i*.16,.82,.15],trim);
 capsule(root,.09,.1,V(0,1.43,0),skinMat);const head=new THREE.Mesh(new THREE.SphereGeometry(.19,18,14),skinMat);head.position.set(0,1.62,0);head.castShadow=true;root.add(head);
 if(style==='skull'){
   const bone=material(0xe7e5d9,.85),socket=material(0x10151b,.95),eye=material(0xff4c3d,.25,.1,{emissive:0xff1d12,emissiveIntensity:1.2});
   const mask=new THREE.Mesh(new THREE.SphereGeometry(.195,18,14),bone);mask.position.set(0,1.62,.055);mask.scale.set(1,.92,.78);root.add(mask);
   for(const s of [-1,1]){const eyeSocket=new THREE.Mesh(new THREE.SphereGeometry(.052,12,10),socket);eyeSocket.position.set(s*.075,1.66,.206);root.add(eyeSocket);const glowEye=new THREE.Mesh(new THREE.SphereGeometry(.018,8,8),eye);glowEye.position.set(s*.075,1.66,.25);root.add(glowEye);}
   box(root,[.11,.035,.035],[0,1.56,.22],socket);for(let i=0;i<4;i++)box(root,[.018,.045,.018],[-.045+i*.03,1.535,.235],bone);
   const hood=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12,0,Math.PI*2,0,Math.PI*.62),trim);hood.position.set(0,1.69,-.025);root.add(hood);
 }else{
   const helmet=new THREE.Mesh(new THREE.SphereGeometry(.205,18,12,0,Math.PI*2,0,Math.PI*.62),trim);helmet.position.set(0,1.68,-.015);helmet.castShadow=true;root.add(helmet);
   box(root,[.27,.075,.19],[0,1.58,.12],dark);box(root,[.22,.045,.035],[0,1.61,.225],material(0x9be8f1,.25,.45,{emissive:0x17404b,emissiveIntensity:.5}));
   if(style==='gold'){box(root,[.52,.07,.22],[0,1.39,0],trim);box(root,[.12,.28,.08],[-.31,1.22,.02],trim);box(root,[.12,.28,.08],[.31,1.22,.02],trim);}
 }
 box(root,[.2,.36,.13],[0,1.08,-.19],dark);box(root,[.25,.16,.08],[0,1.24,-.25],trim);return root;
}
function makeRifle(parent){
 const g=new THREE.Group(),metal=material(0x252d35,.34,.78),dark=material(0x11171d,.42,.42),steel=material(0x8fa1a7,.32,.6),glow=material(0x9bdce4,.25,.5,{emissive:0x1b5961,emissiveIntensity:.65});
 box(g,[.18,.16,.68],[0,0,0],metal);box(g,[.15,.11,.27],[0,-.09,.16],dark);box(g,[.11,.24,.14],[0,-.19,.12],dark);box(g,[.13,.1,.28],[0,.02,-.39],dark);box(g,[.095,.095,.48],[0,.015,-.76],metal);box(g,[.07,.07,.2],[0,.015,-1.06],dark);
 const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.1,12),steel);muzzle.rotation.x=Math.PI/2;muzzle.position.set(0,.015,-1.12);g.add(muzzle);
 box(g,[.17,.06,.18],[0,.13,-.18],dark);box(g,[.12,.1,.13],[0,.21,-.18],steel);box(g,[.04,.025,.22],[0,.27,-.18],glow);box(g,[.12,.22,.16],[0,-.24,-.25],dark);box(g,[.2,.07,.14],[0,-.05,.36],steel);
 g.position.set(.48,-.38,-.72);g.rotation.set(-.08,-.12,-.04);parent.add(g);
 const flash=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),material(0xffd36b,.2,0,{emissive:0xff6b1a,emissiveIntensity:2}));flash.scale.set(.6,.6,1.8);flash.position.set(0,.015,-1.22);flash.visible=false;g.add(flash);return {group:g,flash};
}
function initWorld(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9ebac2);scene.fog=new THREE.Fog(0x9ebac2,65,150);camera=new THREE.PerspectiveCamera(90,innerWidth/innerHeight,.1,260);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 scene.add(new THREE.HemisphereLight(0xe7f6ff,0x52606a,1.7));const sun=new THREE.DirectionalLight(0xffe9ca,3.1);sun.position.set(-22,38,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;scene.add(sun);
 const fill=new THREE.DirectionalLight(0x9bd5e8,.7);fill.position.set(18,12,-22);scene.add(fill);
 box(scene,[180,.4,180],[0,-.22,0],material(0x536d68,.95));const grid=new THREE.GridHelper(180,60,0x9ebbb2,0x748e88);grid.position.y=.005;scene.add(grid);
 for(let i=-4;i<=4;i++)for(const z of [-32,32]){box(scene,[1.4,5,1.4],[i*8,2.5,z],material(0x35434a,.6,.18));box(scene,[1.55,.16,1.55],[i*8,5.05,z],material(0x9bdce4,.25,.35,{emissive:0x1d5660,emissiveIntensity:.35}));}
 for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){if(Math.abs(i)<2&&Math.abs(j)<2)continue;const h=1.4+Math.random()*1.4;box(scene,[2.7,h,2.7],[i*9,h/2,j*9],material([0x52636b,0x687b7d,0x5b6a72][(i+j+12)%3],.8));box(scene,[2.75,.1,2.75],[i*9,h+.03,j*9],material(0x9baea9,.45,.2));}
 for(let i=0;i<18;i++){const h=12+Math.random()*15,m=new THREE.Mesh(new THREE.ConeGeometry(8+Math.random()*7,h,5),material(0x667f83,1));m.position.set((i-9)*17,h/2-1,-83-Math.random()*16);scene.add(m);}
 player=new THREE.Group();player.position.set(0,0,8);scene.add(player);{const s=SKINS[selectedSkin]||SKINS.bone;playerModel=makeCharacter(s.body,s.accent,s.skin,s.style);player.add(playerModel);}const rig=new THREE.Group();camera.add(rig);weapon=makeRifle(rig);
 clock=new THREE.Clock();spawnBots(5);window.addEventListener('resize',onResize);
 canvas.addEventListener('click',()=>{if(!$('settings').classList.contains('hidden'))return;canvas.requestPointerLock();});
 document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;$('hint').style.opacity=pointerLocked?'0':'1';});
 document.addEventListener('mousemove',e=>{if(!pointerLocked)return;yaw-=e.movementX*.0019*sensitivity;pitch-=e.movementY*.0019*sensitivity;pitch=Math.max(-.65,Math.min(.45,pitch));});
 document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape'&&pointerLocked)openSettings();if(['KeyQ','KeyF','KeyC','KeyV'].includes(e.code))placeBuild(e.code);if(e.code==='KeyG')editBuild();});
 document.addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('mousedown',e=>{if(pointerLocked&&e.button===0)shoot();});$('fov').dispatchEvent(new Event('input'));updateCamera();
}
function onResize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function updateCamera(){const target=player.position.clone().add(V(0,1.35,0)),d=5.4,h=Math.cos(pitch)*d;camera.position.set(target.x+Math.sin(yaw)*h,target.y+Math.sin(pitch)*d+1.1,target.z+Math.cos(yaw)*h);camera.lookAt(target.clone().add(V(-Math.sin(yaw)*3,Math.sin(pitch)*3,-Math.cos(yaw)*3)));}
function spawnBots(n){const palette=[[0x9a4f42,0xffb46b],[0x314f79,0x79c9ed],[0x66517e,0xd6a4ed],[0x6c7542,0xd6e66e],[0x6c5550,0xe4b1a0]];for(let i=0;i<n;i++){const [body,accent]=palette[i%palette.length],bot=new THREE.Group(),model=makeCharacter(body,accent,0xb98262);bot.add(model);bot.position.set((Math.random()-.5)*26,0,-10-Math.random()*25);bot.userData={hp:100,phase:Math.random()*6,model};scene.add(bot);bots.push(bot);}}
function resetArena(){player.position.set(0,0,8);yaw=0;pitch=-.08;velocityY=0;health=100;$('healthNum').textContent='100';$('healthBar').style.width='100%';elims=0;$('elims').textContent='0';buildItems.forEach(o=>scene.remove(o));buildItems=[];bots.forEach(b=>scene.remove(b));bots=[];spawnBots(5);}
function buildMaterial(){return material(0xb4d9e2,.32,.28,{transparent:true,opacity:.88,side:THREE.DoubleSide});}
function makeBuildPiece(type,position,rotation){
 const root=new THREE.Group();root.position.copy(position);root.rotation.y=rotation;const frame=material(0x243f4a,.38,.55),panel=buildMaterial(),accent=material(0x8de4eb,.26,.5,{emissive:0x174e59,emissiveIntensity:.35}),add=(s,p,m)=>box(root,s,p,m);
 if(type==='WALL'){add([3,.12,.14],[0,-1.44,0],frame);add([3,.12,.14],[0,1.44,0],frame);for(const x of [-1.44,0,1.44])add([.12,2.82,.14],[x,0,0],frame);for(let x=0;x<3;x++)for(let y=0;y<3;y++){const tile=add([.84,.84,.055],[-.96+x*.96,-.96+y*.96,.015],panel);tile.userData.editTile=true;tile.userData.baseMaterial=panel;add([.035,.84,.065],[-1.38+x*.96,-.96+y*.96,.05],accent);}}
 else if(type==='FLOOR'||type==='ROOF'){add([3,.12,3],[0,0,0],frame);for(let i=0;i<4;i++){add([.055,.035,3],[-1.125+i*.75,.08,0],accent);add([3,.035,.055],[0,.085,-1.125+i*.75],accent);}for(let x=0;x<3;x++)for(let z=0;z<3;z++)add([.91,.035,.91],[-.96+x*.96,.09,-.96+z*.96],panel);}
 else if(type==='RAMP'){const ramp=new THREE.Group();ramp.rotation.x=-Math.PI/5;root.add(ramp);for(let i=0;i<7;i++){const step=box(ramp,[3,.12,.42],[0,i*.24,-1.26+i*.42],panel);step.castShadow=true;}for(const x of [-1.4,1.4])box(ramp,[.12,.14,3],[x,.68,0],frame);}
 root.userData={type,edited:false};root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(root);buildItems.push(root);return root;
}
function placeBuild(code){const type=({KeyQ:'WALL',KeyF:'FLOOR',KeyC:'RAMP',KeyV:'ROOF'})[code],dir=V(-Math.sin(yaw),0,-Math.cos(yaw)),raw=player.position.clone().add(dir.multiplyScalar(4.5)),pos=V(Math.round(raw.x/3)*3,type==='FLOOR'?1.6:type==='ROOF'?3:1.5,Math.round(raw.z/3)*3);makeBuildPiece(type,pos,yaw);toast(type+' BUILT');}
function editBuild(){if(!buildItems.length){toast('PLACE A BUILD PIECE FIRST');return;}const item=buildItems[buildItems.length-1];item.userData.edited=!item.userData.edited;let i=0;item.traverse(o=>{if(o.isMesh&&o.userData.editTile){o.visible=item.userData.edited?i++!==4:true;o.material=item.userData.edited?material(0x86e7ed,.24,.4,{emissive:0x1d5960,emissiveIntensity:.5}):o.userData.baseMaterial;}});toast(item.userData.edited?'EDIT PREVIEW APPLIED':'BUILD RESET');}
function shoot(){const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(V()),0,80),hits=ray.intersectObjects(bots,true);if(hits.length){let t=hits[0].object;while(t.parent&&!t.userData.hp)t=t.parent;if(t.userData.hp){t.userData.hp-=34;if(t.userData.hp<=0){scene.remove(t);bots=bots.filter(b=>b!==t);elims++;$('elims').textContent=String(elims);if(!bots.length)spawnBots(5);}}}if(weapon){weapon.flash.visible=true;setTimeout(()=>{if(weapon)weapon.flash.visible=false;},65);weapon.group.position.z=-.78;setTimeout(()=>{if(weapon)weapon.group.position.z=-.72;},90);}}
function update(dt){const f=V(-Math.sin(yaw),0,-Math.cos(yaw)),r=V(Math.cos(yaw),0,-Math.sin(yaw)),move=V();if(keys.KeyW)move.add(f);if(keys.KeyS)move.sub(f);if(keys.KeyD)move.add(r);if(keys.KeyA)move.sub(r);if(move.lengthSq())move.normalize().multiplyScalar(8.5*dt);player.position.add(move);if(keys.Space&&grounded){velocityY=7.2;grounded=false;}velocityY-=18*dt;player.position.y+=velocityY*dt;if(player.position.y<0){player.position.y=0;velocityY=0;grounded=true;}player.position.x=THREE.MathUtils.clamp(player.position.x,-48,48);player.position.z=THREE.MathUtils.clamp(player.position.z,-48,48);player.rotation.y=yaw;if(move.lengthSq()){const t=performance.now()*.012;playerModel.position.y=Math.sin(t)*.035;playerModel.rotation.z=Math.sin(t*.5)*.025;}else{playerModel.position.y=0;playerModel.rotation.z=0;}for(const b of bots){b.userData.phase+=dt;b.position.x+=Math.sin(b.userData.phase)*dt*.9;b.position.z+=Math.cos(b.userData.phase*.7)*dt*.55;b.lookAt(player.position.x,0,player.position.z);}updateCamera();}
function animate(){if(game.classList.contains('hidden'))return;requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);update(dt);renderer.render(scene,camera);frameCount++;const now=performance.now();if(now-lastFrame>500){$('fps').textContent=String(Math.round(frameCount*1000/(now-lastFrame)));frameCount=0;lastFrame=now;}}
