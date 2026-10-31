import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const $=id=>document.getElementById(id),menu=$('menu'),game=$('game'),canvas=$('world');
let selectedMode='Free Play',selectedSkin=localStorage.getItem('rift-skin')||'bone',renderer,scene,camera,clock,player,playerModel,weapon,yaw=0,pitch=-.08,keys={},velocityY=0,grounded=true,sensitivity=1,health=100,elims=0,bots=[],buildItems=[],buildGhost=null,buildType='WALL',buildMode=false,buildRotation=0,buildMaterialIndex=0,pointerLocked=false,gameStarted=false,lastFrame=performance.now(),frameCount=0,quality='High',performanceMode=false,characterAsset=null,characterLoadPromise=null;
const SKINS={
 bone:{name:'BONE REVENANT',body:0x333a43,accent:0xd8d9d4,skin:0xd9d8d1,style:'skull'},
 gilded:{name:'GILDED SENTINEL',body:0x80601e,accent:0xffd45a,skin:0xb98759,style:'gold'},
 arctic:{name:'ARCTIC STRIKE',body:0x536d80,accent:0xbfe8f3,skin:0xc99b7d,style:'arctic'},
 neon:{name:'NEON PHANTOM',body:0x28233e,accent:0xd75bff,skin:0xb98772,style:'neon'},
 vanguard:{name:'VANGUARD',body:0x263446,accent:0xf2b544,skin:0xb98772,style:'standard'},
 pathfinder:{name:'PATHFINDER',body:0x315d52,accent:0x7de0c0,skin:0xb98772,style:'standard'},
 specter:{name:'SPECTER',body:0x191d2b,accent:0x9c7cff,skin:0xb98772,style:'neon'},
 striker:{name:'STRIKER',body:0x5b2d2d,accent:0xff6b55,skin:0xb98772,style:'standard'},
 warden:{name:'WARDEN',body:0x4b5142,accent:0xd6e890,skin:0xb98772,style:'arctic'},
 nova:{name:'NOVA',body:0x3d2a58,accent:0x66d8ff,skin:0xb98772,style:'neon'},
 seraph:{name:'SERAPH',body:0x8d8468,accent:0xffe9b0,skin:0xb98772,style:'gold'},
 corsair:{name:'CORSAIR',body:0x1f5f66,accent:0x53e0d8,skin:0xb98772,style:'arctic'},
 vesper:{name:'VESPER',body:0x5e2438,accent:0xff9ec2,skin:0xb98772,style:'neon'},
 dragoon:{name:'DRAGOON',body:0x4c5230,accent:0xff9d3c,skin:0xb98772,style:'gold'},
 tempest:{name:'TEMPEST',body:0x2e4a6b,accent:0xffd23c,skin:0xb98772,style:'standard'},
 reaper:{name:'REAPER',body:0x1c1c20,accent:0xe84040,skin:0xb98772,style:'skull'}
};
document.querySelectorAll('.skin-card').forEach(card=>{if(card.dataset.skin===selectedSkin)card.classList.add('selected');card.addEventListener('click',()=>selectSkin(card.dataset.skin));});
function makeRigCharacter(skinId){
 if(!characterAsset)return null;
 const spec=SKINS[skinId]||SKINS.bone,root=SkeletonUtils.clone(characterAsset.scene);
 const box3=new THREE.Box3().setFromObject(root),height=Math.max(.01,box3.max.y-box3.min.y);
 root.scale.setScalar(1.82/height);
 root.position.y=-box3.min.y*root.scale.y;
 root.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const mats=Array.isArray(o.material)?o.material:[o.material];for(const old of mats){const mat=old.clone();if(mat.color){const n=old.name.toLowerCase();if(n.includes('swat')||n.includes('grey')||n.includes('cloth')||n.includes('body'))mat.color.lerp(new THREE.Color(spec.body),.34);else if(n.includes('black'))mat.color.lerp(new THREE.Color(spec.body),.12);else if(n.includes('visor')||n.includes('accent'))mat.color.lerp(new THREE.Color(spec.accent),.4);}if(mat.roughness!==undefined)mat.roughness=.68;o.material=Array.isArray(o.material)?o.material.map(m=>m===old?mat:m):mat;}}});
 const mixer=new THREE.AnimationMixer(root),actions={};
 for(const clip of characterAsset.animations||[]){const n=clip.name.toLowerCase();let key=null;if(n.includes('idle'))key='idle';else if(n.includes('walk'))key='walk';else if(n.includes('sprint')||n.includes('run'))key='run';else if(n.includes('jump'))key='jump';else if(n.includes('shoot')||n.includes('fire'))key='shoot';else if(n.includes('reload'))key='reload';else if(n.includes('death'))key='death';if(key&&!actions[key])actions[key]=mixer.clipAction(clip);}
 const initial=actions.idle||actions.walk||Object.values(actions)[0];if(initial){initial.play();root.userData.activeAction=initial;}
 root.userData={...root.userData,animMixer:mixer,animActions:actions,activeAction:initial,animState:'idle',skinId};
 return root;
}
async function loadCharacterAssets(){
 if(characterLoadPromise)return characterLoadPromise;
 characterLoadPromise=(async()=>{try{
  const loader=new GLTFLoader();
  const gltf=await loader.loadAsync('https://raw.githubusercontent.com/TKY-27/Xo-Beta/master/public/assets/models/characters/swat-modular.glb');
  characterAsset=gltf;
  if(player){const old=playerModel,newModel=makeRigCharacter(selectedSkin);if(newModel){if(old)player.remove(old);playerModel=newModel;player.add(newModel);}}
  for(const bot of bots){const next=makeRigCharacter(bot.userData.skinId||'bone');if(next){if(bot.userData.model)bot.remove(bot.userData.model);bot.userData.model=next;bot.add(next);}}
  toast('AUTHORED CHARACTER RIGS LOADED');
 }catch(e){console.warn('[RIFT] authored character model unavailable; procedural rig retained',e);}})();
 return characterLoadPromise;
}
function updateRigAnimation(model,moving,dt,jumping,aiming){
 const data=model.userData;if(!data.animMixer)return false;
 const actions=data.animActions||{},wanted=jumping?(actions.jump?'jump':'idle'):moving?(aiming&&actions.shoot?'shoot':actions.run?'run':'walk'):'idle';
 const next=actions[wanted]||actions.idle||actions.walk||Object.values(actions)[0];
 if(next&&next!==data.activeAction){next.reset().fadeIn(.18).play();if(data.activeAction)data.activeAction.fadeOut(.18);data.activeAction=next;data.animState=wanted;}
 data.animMixer.update(dt);return true;
}
function selectSkin(id){if(!SKINS[id])return;selectedSkin=id;localStorage.setItem('rift-skin',id);document.querySelectorAll('.skin-card').forEach(c=>c.classList.toggle('selected',c.dataset.skin===id));if(player&&playerModel){player.remove(playerModel);playerModel=makeRigCharacter(id)||makeCharacter(SKINS[id].body,SKINS[id].accent,SKINS[id].skin,SKINS[id].style);player.add(playerModel);}toast(SKINS[id].name+' EQUIPPED');}
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
 const root=new THREE.Group(),rig={};
 const cloth=material(primary,.72),trim=material(accent,.38,.42),dark=material(0x18212a,.72,.16),rubber=material(0x10161c,.94),skinMat=material(skin,.78),steel=material(0x89979b,.32,.72),glow=material(0x8ce5ec,.2,.5,{emissive:0x236b78,emissiveIntensity:.7}),black=material(0x080d12,.96);
 const bone=material(0xe8e4d7,.86),gold=material(0xd7a93d,.28,.82),accentDark=material(0x303c43,.68,.2);
 const group=(parent,pos)=>{const g=new THREE.Group();g.position.set(...pos);parent.add(g);return g;};
 const mesh=(parent,geo,mat,pos,scale)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const cube=(p,size,pos,mat)=>mesh(p,new THREE.BoxGeometry(...size),mat,pos);
 const ball=(p,r,pos,mat,scale=[1,1,1])=>mesh(p,new THREE.SphereGeometry(r,20,14),mat,pos,scale);
 const capsulePart=(p,r,len,pos,mat)=>mesh(p,new THREE.CapsuleGeometry(r,len,6,12),mat,pos);
 const limb=(parent,pos,upperMat,lowerMat,side)=>{
  const pivot=group(parent,pos);
  capsulePart(pivot,.115,.31,[0,-.22,0],upperMat);
  ball(pivot,.13,[0,-.43,0],dark,[1,.8,1]);
  const elbow=group(pivot,[0,-.43,0]);
  capsulePart(elbow,.09,.28,[0,-.19,.015],lowerMat);
  cube(elbow,[.2,.27,.14],[0,-.2,.06],accentDark);
  cube(elbow,[.205,.07,.18],[0,-.08,.12],steel);
  cube(elbow,[.18,.07,.16],[0,-.32,.12],trim);
  const hand=group(elbow,[0,-.39,.075]);
  ball(hand,.105,[0,0,.025],rubber,[1,.8,.8]);
  for(let f=0;f<4;f++)cube(hand,[.035,.07,.055],[-.065+f*.043,-.025,.105],dark);
  return {pivot,elbow,hand};
 };
 // Pelvis and articulated torso.
 const hips=group(root,[0,.88,0]);rig.hips=hips;
 capsulePart(hips,.27,.2,[0,0,0],dark);
 cube(hips,[.68,.17,.37],[0,0,.015],trim);
 cube(hips,[.19,.15,.06],[0,0,.22],style==='gold'?gold:steel);
 for(const s of [-1,1]){
  cube(hips,[.17,.2,.16],[s*.31,-.02,.04],dark);
  cube(hips,[.14,.18,.13],[s*.34,-.04,.13],trim);
  cube(hips,[.11,.16,.1],[s*.39,-.13,-.02],accentDark);
 }
 const torso=group(hips,[0,.26,0]);rig.torso=torso;
 capsulePart(torso,.29,.39,[0,.16,0],cloth);
 cube(torso,[.59,.45,.2],[0,.17,.12],trim);
 cube(torso,[.4,.3,.075],[0,.18,.235],cloth);
 cube(torso,[.16,.29,.045],[0,.18,.282],dark);
 for(let row=0;row<3;row++)for(const s of [-1,1])cube(torso,[.14,.065,.035],[s*.115,.28-row*.105,.285],row===1?steel:accentDark);
 for(const s of [-1,1]){
  const strap=cube(torso,[.085,.48,.065],[s*.22,.19,.245],dark);strap.rotation.z=s*.24;
  cube(torso,[.12,.12,.07],[s*.22,.3,.285],steel);
 }
 // Neck, head pivot, helmet and facial identity.
 const neck=group(torso,[0,.45,0]);capsulePart(neck,.105,.14,[0,0,0],dark);
 const head=group(neck,[0,.17,0]);rig.head=head;
 ball(head,.18,[0,.02,0],skinMat,[.9,1.08,.86]);
 ball(head,.22,[0,.13,-.015],style==='skull'?dark:trim,[1.08,.8,1.05]);
 cube(head,[.4,.07,.28],[0,.13,.1],dark);
 for(const s of [-1,1]){
  cube(head,[.09,.2,.17],[s*.205,.02,-.015],steel);
  ball(head,.06,[s*.22,.02,.055],glow,[.65,1,.5]);
 }
 if(style==='skull'){
  ball(head,.17,[0,.005,.12],bone,[1,.95,.68]);
  for(const s of [-1,1]){
   ball(head,.06,[s*.073,.035,.226],black,[1,.92,.45]);
   ball(head,.023,[s*.073,.035,.247],glow,[1,1,.6]);
   cube(head,[.035,.08,.025],[s*.13,-.075,.205],black);
  }
  cube(head,[.045,.06,.03],[0,-.045,.225],black);
  cube(head,[.17,.05,.04],[0,-.11,.195],black);
  for(let i=0;i<5;i++)cube(head,[.022,.04,.022],[-.055+i*.027,-.12,.22],bone);
  ball(head,.23,[0,.2,-.035],trim,[1.12,.58,1.12]);
 }else if(style==='arctic'){
  cube(head,[.34,.13,.09],[0,.045,.205],material(0xd9f2f5,.2,.4));
  cube(head,[.29,.075,.07],[0,.06,.255],glow);
  cube(head,[.25,.13,.12],[0,-.09,.13],dark);
  for(const s of [-1,1]){cube(head,[.1,.23,.12],[s*.18,-.01,-.015],steel);mesh(head,new THREE.ConeGeometry(.09,.28,5),trim,[s*.22,.18,-.015],[1,1,1]);}
  cube(head,[.38,.06,.12],[0,-.17,.13],trim);
 }else if(style==='neon'){
  cube(head,[.34,.16,.1],[0,.025,.205],dark);
  for(const s of [-1,1]){cube(head,[.14,.09,.055],[s*.085,.04,.265],glow);ball(head,.025,[s*.085,.04,.3],material(0xff4fd8,.18,.3,{emissive:0xb50088,emissiveIntensity:1.2}));}
  cube(head,[.19,.13,.11],[0,-.1,.16],trim);
  for(const s of [-1,1]){mesh(head,new THREE.ConeGeometry(.075,.22,5),trim,[s*.19,.27,-.005]);cube(head,[.07,.2,.1],[s*.19,-.015,.13],glow);}
  cube(head,[.42,.055,.1],[0,-.18,.08],glow);
 }else{
  cube(head,[.31,.12,.09],[0,.04,.205],glow);
  cube(head,[.34,.05,.075],[0,.1,.19],steel);
  cube(head,[.25,.1,.12],[0,-.09,.13],dark);
  for(const s of [-1,1])cube(head,[.08,.17,.08],[s*.16,-.075,.16],trim);
 }
 if(style==='gold'){
  mesh(head,new THREE.ConeGeometry(.12,.3,5),gold,[0,.38,-.005]);
  cube(head,[.46,.1,.2],[0,.27,-.01],gold);
 }
 if(style==='arctic'){for(const s of [-1,1]){mesh(head,new THREE.ConeGeometry(.1,.34,6),steel,[s*.23,.27,-.04]);cube(head,[.13,.28,.11],[s*.31,.0,-.02],trim);}}
 if(style==='neon'){for(const s of [-1,1]){mesh(head,new THREE.ConeGeometry(.1,.25,5),glow,[s*.24,.27,-.02]);cube(head,[.12,.3,.1],[s*.32,.02,0],trim);}}
 // Shoulder armor and articulated arms.
 const left=limb(torso,[-.43,.34,0],cloth,trim,-1),right=limb(torso,[.43,.34,0],cloth,trim,1);
 rig.leftArm=left;rig.rightArm=right;
 for(const s of [-1,1]){
  const shoulder=group(torso,[s*.43,.34,0]);
  ball(shoulder,.18,[0,.04,0],trim,[1.16,.85,1.08]);
  cube(shoulder,[.29,.1,.23],[0,.14,0],style==='gold'?gold:steel);
  // Extra segmented shoulder inset and rivets.
  cube(shoulder,[.18,.055,.17],[0,.19,.04],accentDark);
  for(let i=0;i<3;i++)ball(shoulder,.018,[-.06+i*.06,.2,.13],steel,[1,1,1]);
  if(s<0)rig.leftShoulder=shoulder;else rig.rightShoulder=shoulder;
 }
 // Backpack, harness, canisters, utility and hip holster.
 const pack=group(root,[0,1.13,-.24]);rig.pack=pack;
 cube(pack,[.42,.5,.2],[0,0,-.025],dark);
 cube(pack,[.34,.32,.09],[0,.02,-.14],trim);
 cube(pack,[.24,.2,.07],[0,.02,-.205],accentDark);
 for(const s of [-1,1]){
  cube(pack,[.12,.28,.13],[s*.28,-.08,-.01],steel);
  mesh(pack,new THREE.CylinderGeometry(.055,.055,.3,12),style==='gold'?gold:trim,[s*.29,-.19,-.06]);
  cube(pack,[.07,.37,.06],[s*.18,0,.04],steel);
  cube(root,[.14,.18,.12],[s*.39,.94,-.13],dark);
  cube(root,[.12,.08,.035],[s*.39,.96,-.055],steel);
 }
 cube(pack,[.25,.07,.08],[0,-.19,-.16],steel);
 // Articulated legs with thigh plates, knees, shin guards and detailed boots.
 for(const s of [-1,1]){
  const leg=group(hips,[s*.2,-.08,0]);
  capsulePart(leg,.13,.32,[0,-.25,0],cloth);
  cube(leg,[.27,.25,.14],[0,-.25,.1],dark);
  cube(leg,[.25,.19,.11],[0,-.25,.18],trim);
  ball(leg,.13,[0,-.48,.1],style==='gold'?gold:steel,[1,.78,.5]);
  const knee=group(leg,[0,-.49,0]);
  capsulePart(knee,.095,.32,[0,-.2,0],dark);
  cube(knee,[.24,.27,.12],[0,-.2,.09],accentDark);
  cube(knee,[.19,.22,.1],[0,-.2,.17],trim);
  cube(knee,[.055,.24,.06],[0,-.2,.23],steel);
  const foot=group(knee,[0,-.39,.055]);
  cube(foot,[.27,.13,.4],[0,-.02,.1],rubber);
  cube(foot,[.25,.07,.29],[0,.055,.13],dark);
  cube(foot,[.21,.05,.18],[0,.095,.23],trim);
  cube(foot,[.23,.06,.1],[0,-.075,.25],steel);
  if(s<0){rig.leftLeg=leg;rig.leftKnee=knee;rig.leftFoot=foot;}else{rig.rightLeg=leg;rig.rightKnee=knee;rig.rightFoot=foot;}
 }
 // Tactical chest badge and style-specific insignia.
 cube(torso,[.13,.14,.035],[0,.12,.3],style==='gold'?gold:glow);
 for(let i=0;i<4;i++)cube(torso,[.08,.035,.035],[-.23+i*.15,-.08,.29],steel);
 // A compact weapon is parented to the character's hand so third-person views show a real held prop.
 const heldWeapon=group(right.hand,[0,-.015,.075]);rig.heldWeapon=heldWeapon;
 cube(heldWeapon,[.105,.12,.42],[0,.005,.19],dark);
 cube(heldWeapon,[.075,.075,.48],[0,.025,.53],steel);
 cube(heldWeapon,[.09,.075,.16],[0,.085,.23],trim);
 cube(heldWeapon,[.075,.19,.12],[0,-.12,.18],dark);
 cube(heldWeapon,[.12,.055,.18],[0,-.045,-.025],accentDark);
 cube(heldWeapon,[.12,.045,.1],[0,.12,.2],glow);
 const sight=mesh(heldWeapon,new THREE.BoxGeometry(.07,.07,.12),steel,[0,.105,.48]);
 rig.heldMuzzle=group(heldWeapon,[0,.025,.79]);
 ball(rig.heldMuzzle,.035,[0,0,0],glow,[1,1,1]);
 rig.idlePhase=Math.random()*Math.PI*2;rig.landPulse=0;
 root.userData.rig=rig;
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return root;
}
function animateCharacter(model,moving,dt,jumping,onGround,aiming=false,sprinting=false){
 if(!model)return;if(updateRigAnimation(model,moving,dt,jumping,aiming))return;
 if(!model.userData?.rig)return;
 const r=model.userData.rig;
 r.idlePhase+=dt*(moving?(sprinting?13:9):2.15);
 const phase=r.idlePhase, stride=moving?(sprinting?1.12:.76):0;
 const wave=Math.sin(phase), opposite=Math.sin(phase+Math.PI);
 const blend=(v,target,k)=>v+(target-v)*Math.min(1,k*dt);
 const airborne=jumping||!onGround,runBob=moving&&!airborne?Math.abs(wave)*(sprinting?.075:.045):0;
 const landing=airborne?0:Math.max(0,r.landPulse-dt*2.8);
 r.landPulse=landing;
 const legSwing=wave*stride, kneeLeft=Math.max(0,-wave)*stride*.9, kneeRight=Math.max(0,wave)*stride*.9;
 r.leftLeg.rotation.x=blend(r.leftLeg.rotation.x,airborne?-.2:legSwing*.66,13);
 r.rightLeg.rotation.x=blend(r.rightLeg.rotation.x,airborne?-.35:-legSwing*.66,13);
 r.leftKnee.rotation.x=blend(r.leftKnee.rotation.x,airborne?.42:kneeLeft,13);
 r.rightKnee.rotation.x=blend(r.rightKnee.rotation.x,airborne?.55:kneeRight,13);
 r.leftFoot.rotation.x=blend(r.leftFoot.rotation.x,airborne?-.18:-kneeLeft*.2+opposite*.07,13);
 r.rightFoot.rotation.x=blend(r.rightFoot.rotation.x,airborne?-.22:-kneeRight*.2-wave*.07,13);
 const aim=aiming?1:0,air=airborne?1:0;
 r.torso.rotation.x=blend(r.torso.rotation.x,air?-.28:(aim?-.42:(moving?-.04:0)),9);
 r.torso.rotation.z=blend(r.torso.rotation.z,moving?(sprinting?-.055:.035)*Math.sin(phase*.5):0,8);
 r.torso.position.y=blend(r.torso.position.y,.26+runBob+landing*.035,12);
 r.leftArm.pivot.rotation.x=blend(r.leftArm.pivot.rotation.x,air?-.45:(aim?-.82:(moving?opposite*.22:-.06)),10);
 r.rightArm.pivot.rotation.x=blend(r.rightArm.pivot.rotation.x,air?-.58:(aim?-.98:(moving?wave*.2:-.16)),10);
 r.leftArm.pivot.rotation.z=blend(r.leftArm.pivot.rotation.z,aim?-.08:(moving?-.08:0),9);
 r.rightArm.pivot.rotation.z=blend(r.rightArm.pivot.rotation.z,aim?.06:0,9);
 r.leftArm.elbow.rotation.x=blend(r.leftArm.elbow.rotation.x,aim?-.46:0,10);
 r.rightArm.elbow.rotation.x=blend(r.rightArm.elbow.rotation.x,aim?-.62:-.12,10);
 r.leftArm.hand.rotation.x=blend(r.leftArm.hand.rotation.x,aim?-.12:0,10);
 r.rightArm.hand.rotation.x=blend(r.rightArm.hand.rotation.x,aim?-.2:0,10);
 r.head.rotation.x=blend(r.head.rotation.x,air?-.1:(aim?-.035:Math.sin(phase*.5)*.012),7);
 r.head.rotation.y=blend(r.head.rotation.y,moving?Math.sin(phase*.25)*.035:0,6);
 r.hips.position.y=blend(r.hips.position.y,.88+runBob+landing*.025,12);
 r.heldWeapon.rotation.x=blend(r.heldWeapon.rotation.x,aim?-.08:0,10);
 r.heldWeapon.rotation.y=blend(r.heldWeapon.rotation.y,aim?-.04:0,10);
}
function makeRifle(parent){
 const g=new THREE.Group(),metal=material(0x252d35,.34,.78),dark=material(0x11171d,.42,.42),steel=material(0x8fa1a7,.32,.6),glow=material(0x9bdce4,.25,.5,{emissive:0x1b5961,emissiveIntensity:.65});
 box(g,[.18,.16,.68],[0,0,0],metal);box(g,[.15,.11,.27],[0,-.09,.16],dark);box(g,[.11,.24,.14],[0,-.19,.12],dark);box(g,[.13,.1,.28],[0,.02,-.39],dark);box(g,[.095,.095,.48],[0,.015,-.76],metal);box(g,[.07,.07,.2],[0,.015,-1.06],dark);
 const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.1,12),steel);muzzle.rotation.x=Math.PI/2;muzzle.position.set(0,.015,-1.12);g.add(muzzle);
 box(g,[.17,.06,.18],[0,.13,-.18],dark);box(g,[.12,.1,.13],[0,.21,-.18],steel);box(g,[.04,.025,.22],[0,.27,-.18],glow);box(g,[.12,.22,.16],[0,-.24,-.25],dark);box(g,[.2,.07,.14],[0,-.05,.36],steel);
 g.position.set(.48,-.38,-.72);g.rotation.set(-.08,-.12,-.04);parent.add(g);
 const flash=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),material(0xffd36b,.2,0,{emissive:0xff6b1a,emissiveIntensity:2}));flash.scale.set(.6,.6,1.8);flash.position.set(0,.015,-1.22);flash.visible=false;g.add(flash);return {group:g,flash};
}
function terrainHeight(x,z){
 const island=Math.max(0,1-Math.pow(Math.sqrt(x*x+z*z)/112,2));
 const hills=(Math.sin(x*.055+1.2)*Math.cos(z*.047)+Math.sin(z*.083-x*.026)*.42)*5.2;
 const ridges=Math.max(0,Math.sin(x*.035+z*.028))*Math.max(0,Math.cos(z*.045-x*.02))*5;
 return Math.max(-1.8, island*(1.4+hills+Math.max(0,ridges))-1.8);
}
function addTree(x,z,scale=1){
 const y=terrainHeight(x,z),g=new THREE.Group();g.position.set(x,y,z);
 const trunk=material(0x60432c,.95),leafA=material(0x315d3f,1),leafB=material(0x47774a,1);
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.22*scale,.34*scale,2.8*scale,7),trunk);stem.position.y=1.4*scale;stem.castShadow=true;g.add(stem);
 for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.ConeGeometry((2.05-i*.34)*scale,3.1*scale,7),i%2?leafB:leafA);crown.position.set(0,(3.1+i*1.12)*scale,0);crown.rotation.y=i*.7;crown.castShadow=true;g.add(crown);}
 scene.add(g);
}
function addBuilding(x,z,w,d,levels=1,style='harbor'){
 const base=terrainHeight(x,z),g=new THREE.Group();g.position.set(x,base,z);scene.add(g);
 const wall=material(style==='harbor'?0xc8bda4:style==='industrial'?0x77858a:0xd1c8b6,.86),dark=material(0x303b40,.7),roof=material(style==='harbor'?0x465b60:style==='industrial'?0x424c52:0x59645c,.8),glass=material(0x77aeb9,.22,.25,{transparent:true,opacity:.72,side:THREE.DoubleSide}),trim=material(0x6b5140,.78);
 box(g,[w,.35,d],[0,.18,0],dark);
 const h=3.3;
 for(let floor=0;floor<levels;floor++){
  const y=.35+floor*h;
  box(g,[w,.18,d],[0,y,0],material(0x8a8170,.9));
  // Four exterior walls are split around windows and a central doorway, leaving real openings.
  for(const side of [-1,1]){
   const zSide=side*(d/2-.09),xSide=side*(w/2-.09);
   box(g,[w,.3,.18],[0,y+h-.15,zSide],wall);
   box(g,[w,.3,.18],[0,y+.15,zSide],wall);
   box(g,[w*.32,h-.6,.18],[-w*.34,y+h/2,zSide],wall);
   box(g,[w*.32,h-.6,.18],[w*.34,y+h/2,zSide],wall);
   box(g,[.18,h-.6,d],[xSide,y+h/2,0],wall);
   for(const wx of [-w*.17,w*.17]){box(g,[w*.13,1.05,.07],[wx,y+1.95,zSide-side*.015],glass);box(g,[w*.14,.09,.1],[wx,y+1.39,zSide],trim);}
  }
  // Interior partition and stair run create readable rooms and vertical circulation.
  if(w>9){box(g,[.16,h-0.35,d*.56],[0,y+h/2,-d*.18],wall);for(let s=0;s<7;s++)box(g,[1.25,.16,.48],[-w*.28+s*.23,y+.42+s*.35,d*.22],trim);}
  box(g,[.16,h-.35,d*.72],[w*.22,y+h/2,d*.04],wall);
 }
 const top=levels*h+.42;box(g,[w+.7,.38,d+.7],[0,top,0],roof);
 for(const side of [-1,1]){box(g,[w+.25,.25,.25],[0,top+.28,side*(d/2+.22)],trim);box(g,[.25,.25,d+.25],[side*(w/2+.22),top+.28,0],trim);}
 // Rooftop access block and HVAC props.
 box(g,[2.2,1.3,2],[w*.25,top+.82,-d*.2],dark);box(g,[1.1,.22,1.1],[-w*.25,top+.42,d*.18],material(0x9ba5a3,.45,.25));
 // Exterior porch and steps.
 box(g,[3,.2,2.1],[0,.18,d/2+1.1],trim);for(let i=0;i<3;i++)box(g,[2.4,.16,.55],[0,.08+i*.12,d/2+2.05+i*.5],dark);
 return g;
}
function initWorld(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9bc3d1);scene.fog=new THREE.Fog(0x9bc3d1,125,310);camera=new THREE.PerspectiveCamera(92,innerWidth/innerHeight,.1,520);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 scene.add(new THREE.HemisphereLight(0xe9f8ff,0x53604c,1.65));
 const sun=new THREE.DirectionalLight(0xffe7c4,3.0);sun.position.set(-75,110,45);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-130;sun.shadow.camera.right=130;sun.shadow.camera.top=130;sun.shadow.camera.bottom=-130;scene.add(sun);
 const fill=new THREE.DirectionalLight(0x9bd5e8,.55);fill.position.set(80,35,-80);scene.add(fill);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(700,700),material(0x347f9b,.24,.22));water.rotation.x=-Math.PI/2;water.position.y=-2.15;scene.add(water);
 const geo=new THREE.PlaneGeometry(224,224,112,112),pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i);pos.setZ(i,terrainHeight(x,z));}
 geo.computeVertexNormals();const land=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x668b58,roughness:1,vertexColors:false}));land.rotation.x=-Math.PI/2;land.receiveShadow=true;land.castShadow=false;scene.add(land);
 // Sandy coastal shelf and pale beaches around the island perimeter.
 const beach=new THREE.Mesh(new THREE.RingGeometry(91,111,112),material(0xc7b88c,1));beach.rotation.x=-Math.PI/2;beach.position.y=-.35;scene.add(beach);
 // Curving paved roads connect the three authored points of interest.
 const roadMat=material(0x555b58,.95),roadEdge=material(0xb7ad91,1);
 function road(points,width=5){for(let i=0;i<points.length-1;i++){const a=V(points[i][0],terrainHeight(points[i][0],points[i][1])+.06,points[i][1]),b=V(points[i+1][0],terrainHeight(points[i+1][0],points[i+1][1])+.06,points[i+1][1]),d=b.clone().sub(a),m=new THREE.Mesh(new THREE.BoxGeometry(width,.12,d.length()+1),roadMat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,0,1),d.clone().normalize());m.receiveShadow=true;scene.add(m);}}
 road([[-70,35],[-42,20],[-12,12],[18,4],[48,-10],[72,-28]],6);
 road([[-42,20],[-48,-5],[-42,-36]],5);
 // Three named districts, with complete walk-in structures and distinct silhouettes.
 addBuilding(-39,18,15,12,2,'harbor');addBuilding(-55,29,10,9,1,'harbor');addBuilding(-25,34,12,10,1,'harbor');
 addBuilding(39,-14,17,13,2,'industrial');addBuilding(58,-26,12,10,1,'industrial');addBuilding(28,-34,10,11,1,'industrial');
 addBuilding(-35,-39,13,12,2,'pine');addBuilding(-52,-45,10,9,1,'pine');
 // Scattered homes, sheds, boulders and tree lines break up sightlines.
 for(let i=0;i<44;i++){const a=i*2.399,r=57+(i%7)*5,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x,z)<91)addTree(x,z,.72+(i%4)*.13);}
 for(let i=0;i<22;i++){const a=i*2.4,r=24+(i%5)*9,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x,z)>19&&Math.hypot(x,z)<83){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1.2+(i%3)*.4,0),material(0x777d76,.95));rock.position.set(x,terrainHeight(x,z)+.65,z);rock.scale.set(1.4,.8,1);rock.castShadow=true;scene.add(rock);}}
 // Low ridgelines frame the island and distant horizon.
 for(let i=0;i<28;i++){const a=i/28*Math.PI*2,r=132+(i%4)*7,h=16+(i%6)*4,m=new THREE.Mesh(new THREE.ConeGeometry(13,h,6),material(i%2?0x607d72:0x718b80,1));m.position.set(Math.cos(a)*r,h/2-3,Math.sin(a)*r);scene.add(m);}
 player=new THREE.Group();player.position.set(-5,terrainHeight(-5,8)+.25,8);scene.add(player);
 {const s=SKINS[selectedSkin]||SKINS.bone;playerModel=makeCharacter(s.body,s.accent,s.skin,s.style);player.add(playerModel);}
 const rig=new THREE.Group();camera.add(rig);weapon=makeRifle(rig);
 clock=new THREE.Clock();spawnBots(modeBotCount());loadCharacterAssets();window.addEventListener('resize',onResize);
 canvas.addEventListener('click',()=>{if(!$('settings').classList.contains('hidden'))return;canvas.requestPointerLock();});
 document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;$('hint').style.opacity=pointerLocked?'0':'1';});
 document.addEventListener('mousemove',e=>{if(!pointerLocked)return;yaw-=e.movementX*.0019*sensitivity;pitch-=e.movementY*.0019*sensitivity;pitch=Math.max(-.65,Math.min(.45,pitch));});
 document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape'&&pointerLocked)openSettings();if(e.code==='KeyQ')setBuildMode('WALL');if(e.code==='KeyF')setBuildMode('FLOOR');if(e.code==='KeyC')setBuildMode('RAMP');if(e.code==='KeyV')setBuildMode('PYRAMID');if(e.code==='KeyR'&&buildMode){buildRotation+=Math.PI/2;updateBuildPreview();}if(e.code==='KeyG')editBuild();});
 document.addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('wheel',e=>{if(buildMode&&e.shiftKey){buildMaterialIndex=(buildMaterialIndex+(e.deltaY>0?1:BUILD_MATERIALS.length-1))%BUILD_MATERIALS.length;setBuildMode(buildType);toast(BUILD_MATERIALS[buildMaterialIndex].name+' BUILD MATERIAL');return;}if(!pointerLocked||buildMode||!buildItems.length)return;const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(V()),0,9),hits=ray.intersectObjects(buildItems,true);if(!hits.length)return;let item=hits[0].object;while(item.parent&&!buildItems.includes(item))item=item.parent;if(!buildItems.includes(item))return;item.userData.edited=false;item.traverse(o=>{if(o.isMesh&&o.userData.editTile){o.visible=true;o.material=o.userData.baseMaterial;}});toast('EDIT RESET');},{passive:true});
 document.addEventListener('contextmenu',e=>{if(pointerLocked)e.preventDefault();});
 document.addEventListener('mousedown',e=>{if(!pointerLocked)return;if(e.button===2){buildMode=!buildMode;if(buildMode)setBuildMode(buildType);else clearBuildGhost();return;}if(e.button===0){if(buildMode)placeBuild();else shoot();}});$('fov').dispatchEvent(new Event('input'));updateCamera();
}
function onResize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function updateCamera(){const target=player.position.clone().add(V(0,1.35,0)),d=5.4,h=Math.cos(pitch)*d;camera.position.set(target.x+Math.sin(yaw)*h,target.y+Math.sin(pitch)*d+1.1,target.z+Math.cos(yaw)*h);camera.lookAt(target.clone().add(V(-Math.sin(yaw)*3,Math.sin(pitch)*3,-Math.cos(yaw)*3)));}
function modeBotCount(){return ({'Creative':0,'1v1':1,'2v2':3,'Box Fights':3,'Zone Wars':5,'Free Play':7})[selectedMode]??5;}
function spawnBots(n){const palette=[[0x9a4f42,0xffb46b,0xb98262,'standard'],[0x314f79,0x79c9ed,0xb98262,'standard'],[0x66517e,0xd6a4ed,0x9a694e,'skull'],[0x6c7542,0xd6e66e,0x9b765e,'arctic'],[0x80601e,0xffd45a,0xb98759,'gold'],[0x26343b,0x8ce5ec,0xc99b7d,'neon']];for(let i=0;i<n;i++){const [body,accent,skin,style]=palette[i%palette.length],bot=new THREE.Group(),skinId=Object.keys(SKINS)[i%Object.keys(SKINS).length],model=makeRigCharacter(skinId)||makeCharacter(body,accent,skin,style);bot.add(model);const bx=player.position.x+(Math.random()-.5)*42,bz=player.position.z-12-Math.random()*35;bot.position.set(bx,terrainHeight(bx,bz)+.25,bz);bot.userData={hp:100,phase:Math.random()*6,model,skinId};scene.add(bot);bots.push(bot);}}
function resetArena(){clearBuildGhost();buildMode=false;buildRotation=0;player.position.set(-5,terrainHeight(-5,8)+.25,8);yaw=0;pitch=-.08;velocityY=0;health=100;$('healthNum').textContent='100';$('healthBar').style.width='100%';elims=0;$('elims').textContent='0';buildItems.forEach(o=>scene.remove(o));buildItems=[];bots.forEach(b=>scene.remove(b));bots=[];spawnBots(modeBotCount());}
const BUILD_MATERIALS=[{id:'wood',name:'WOOD',color:0x95613b,hp:150,metalness:.02,roughness:.86},{id:'stone',name:'STONE',color:0x899197,hp:300,metalness:.12,roughness:.9},{id:'metal',name:'METAL',color:0x647d8b,hp:450,metalness:.72,roughness:.34}];
function buildMaterial(){const spec=BUILD_MATERIALS[buildMaterialIndex];return material(spec.color,spec.roughness,spec.metalness,{side:THREE.DoubleSide});}
function makeRampGeometry(){
 const s=3,verts=[-s/2,-s/2,s/2,s/2,-s/2,s/2,-s/2,-s/2,-s/2,s/2,-s/2,-s/2,-s/2,s/2,-s/2,s/2,s/2,-s/2],geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex([0,3,1,0,2,3,2,4,5,2,5,3,0,1,5,0,5,4,0,4,2,1,3,5]);geo.computeVertexNormals();return geo;
}
function makeBuildPiece(type,position,rotation,matIndex=buildMaterialIndex){
 const root=new THREE.Group();root.position.copy(position);root.rotation.y=rotation;
 const spec=BUILD_MATERIALS[matIndex]||BUILD_MATERIALS[0],frame=material(spec.color,.44,spec.metalness),panel=material(spec.color,spec.roughness,spec.metalness,{side:THREE.DoubleSide}),accent=material(0xd5e8ec,.3,.62),add=(size,pos,mat)=>box(root,size,pos,mat);
 if(type==='WALL'){
  add([3,.14,.16],[0,-1.44,0],frame);add([3,.14,.16],[0,1.44,0],frame);
  for(const x of [-1.44,0,1.44])add([.14,2.82,.16],[x,0,0],frame);
  for(let x=0;x<3;x++)for(let y=0;y<3;y++){const tile=add([.84,.84,.065],[-.96+x*.96,-.96+y*.96,.025],panel);tile.userData.editTile=true;tile.userData.baseMaterial=panel;add([.035,.84,.08],[-1.38+x*.96,-.96+y*.96,.07],accent);}
 }else if(type==='FLOOR'||type==='ROOF'){
  add([3,.14,3],[0,0,0],frame);
  for(let i=0;i<4;i++){add([.055,.04,3],[-1.125+i*.75,.09,0],accent);add([3,.04,.055],[0,.095,-1.125+i*.75],accent);}
  for(let x=0;x<3;x++)for(let z=0;z<3;z++){const tile=add([.91,.045,.91],[-.96+x*.96,.1,-.96+z*.96],panel);tile.userData.editTile=true;tile.userData.baseMaterial=panel;}
 }else if(type==='RAMP'){
  const ramp=new THREE.Group();ramp.rotation.x=-Math.PI/5;root.add(ramp);
  for(let i=0;i<7;i++)box(ramp,[3,.13,.42],[0,i*.24,-1.26+i*.42],panel);
  for(const x of [-1.4,1.4])box(ramp,[.14,.16,3],[x,.68,0],frame);
 }else if(type==='PYRAMID'){
  const pyramid=new THREE.Mesh(new THREE.CylinderGeometry(0,3*.707,3,4,1),panel);pyramid.rotation.y=Math.PI/4;pyramid.position.y=.65;pyramid.castShadow=true;pyramid.receiveShadow=true;root.add(pyramid);
  for(let i=0;i<4;i++){const beam=box(root,[.12,2.05,.12],[0,.55,0],frame);beam.rotation.y=i*Math.PI/2;beam.rotation.z=Math.PI/4;}
 }
 root.userData={type,edited:false,hp:spec.hp,maxHp:spec.hp,material:spec.id,materialIndex:matIndex};
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 scene.add(root);buildItems.push(root);return root;
}
function buildPosition(type){
 const direction=camera.getWorldDirection(V()),ray=new THREE.Raycaster(camera.position,direction,0,6);
 const excluded=new Set([player,buildGhost,...bots]),targets=scene.children.filter(o=>!excluded.has(o));
 const hits=ray.intersectObjects(targets,true);
 let raw;
 if(hits.length){const hit=hits[0],normal=hit.face?.normal?.clone()||V(0,1,0);normal.transformDirection(hit.object.matrixWorld);raw=hit.point.clone().add(normal.multiplyScalar(1.5));}
 else raw=player.position.clone().add(direction.multiplyScalar(5));
 const x=Math.round(raw.x/3)*3,z=Math.round(raw.z/3)*3,ground=terrainHeight(x,z);
 let y=type==='FLOOR'?ground+.12:type==='ROOF'?ground+3.05:ground+1.5;
 if(hits.length){const hit=hits[0];if(hit.point.y>ground+.8)y=hit.point.y+(type==='FLOOR'?.12:type==='ROOF'?3.05:1.5);}
 return V(x,Math.round(y*10)/10,z);
}
function clearBuildGhost(){if(buildGhost){scene.remove(buildGhost);buildGhost=null;}}
function setBuildMode(type){
 buildType=type;buildMode=true;clearBuildGhost();
 const p=buildPosition(type);makeBuildPiece(type,p,buildRotation);buildGhost=buildItems.pop();
 buildGhost.userData.preview=true;
 buildGhost.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.38;o.material.depthWrite=false;o.material.color.set(0x83e7ed);o.material.emissive=new THREE.Color(0x164c55);o.material.emissiveIntensity=.35; o.castShadow=false; o.receiveShadow=false;}});
 toast(type+' · '+BUILD_MATERIALS[buildMaterialIndex].name+' · R ROTATE · SHIFT+SCROLL MATERIAL');
}
function updateBuildPreview(){
 if(!buildMode||!buildGhost||!player)return;
 const p=buildPosition(buildType);buildGhost.position.copy(p);buildGhost.rotation.y=yaw+buildRotation;
}
function placeBuild(){
 if(!buildMode){setBuildMode(buildType);return;}
 updateBuildPreview();
 const p=buildGhost.position.clone();
 if(p.distanceTo(player.position)>8.5){toast('TOO FAR TO BUILD');return;}
 makeBuildPiece(buildType,p,yaw+buildRotation,buildMaterialIndex);
 toast(buildType+' PLACED');
}
function editBuild(){
 if(!buildItems.length){toast('PLACE A BUILD PIECE FIRST');return;}
 const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(V()),0,9);
 const hits=ray.intersectObjects(buildItems,true);
 let item=null;
 if(hits.length){let node=hits[0].object;while(node.parent&&!buildItems.includes(node))node=node.parent;if(buildItems.includes(node))item=node;}
 if(!item)item=[...buildItems].sort((a,b)=>a.position.distanceTo(player.position)-b.position.distanceTo(player.position))[0];
 if(!item||item.position.distanceTo(player.position)>9){toast('AIM AT A BUILD PIECE TO EDIT');return;}
 item.userData.edited=!item.userData.edited;
 let index=0;
 item.traverse(o=>{if(o.isMesh&&o.userData.editTile){const cell=index++;o.visible=item.userData.edited?![4,7].includes(cell):true;o.material=item.userData.edited?material(0x86e7ed,.24,.4,{emissive:0x1d5960,emissiveIntensity:.5}):o.userData.baseMaterial;}});
 toast(item.userData.edited?'EDIT APPLIED · G TO RESET':'BUILD RESET');
}
function shoot(){
 const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(V()),0,80),botHits=ray.intersectObjects(bots,true),buildHits=ray.intersectObjects(buildItems,true),bh=buildHits[0],eh=botHits[0];
 if(bh&&(!eh||bh.distance<eh.distance)){
  let piece=bh.object;while(piece.parent&&!buildItems.includes(piece))piece=piece.parent;
  if(buildItems.includes(piece)){piece.userData.hp=Math.max(0,piece.userData.hp-34);toast(piece.userData.material.toUpperCase()+' BUILD · '+piece.userData.hp+'/'+piece.userData.maxHp);if(piece.userData.hp===0){scene.remove(piece);buildItems=buildItems.filter(x=>x!==piece);toast('BUILD PIECE DESTROYED');}}
 }else if(eh){
  let target=eh.object;while(target.parent&&!target.userData.hp)target=target.parent;
  if(target.userData.hp){target.userData.hp-=34;if(target.userData.hp<=0){scene.remove(target);bots=bots.filter(b=>b!==target);elims++;$('elims').textContent=String(elims);if(!bots.length)spawnBots(modeBotCount());}}
 }
 if(weapon){weapon.flash.visible=true;setTimeout(()=>{if(weapon)weapon.flash.visible=false;},65);weapon.group.position.z=-.78;setTimeout(()=>{if(weapon)weapon.group.position.z=-.72;},90);}
}
function update(dt){const f=V(-Math.sin(yaw),0,-Math.cos(yaw)),r=V(Math.cos(yaw),0,-Math.sin(yaw)),move=V(),sprinting=!!(keys.ShiftLeft||keys.ShiftRight);if(keys.KeyW)move.add(f);if(keys.KeyS)move.sub(f);if(keys.KeyD)move.add(r);if(keys.KeyA)move.sub(r);if(move.lengthSq())move.normalize().multiplyScalar((sprinting?12.2:8.5)*dt);player.position.add(move);if(keys.Space&&grounded){velocityY=7.2;grounded=false;}velocityY-=18*dt;player.position.y+=velocityY*dt;if(player.position.y<0){player.position.y=0;velocityY=0;grounded=true;}player.position.x=THREE.MathUtils.clamp(player.position.x,-103,103);player.position.z=THREE.MathUtils.clamp(player.position.z,-103,103);const ground=terrainHeight(player.position.x,player.position.z)+.25;if(player.position.y<ground){player.position.y=ground;velocityY=0;grounded=true;}player.rotation.y=yaw;animateCharacter(playerModel,move.lengthSq()>0,dt,velocityY>0.5,Math.abs(velocityY)<0.5&&grounded,pointerLocked,sprinting);for(const b of bots){b.userData.phase+=dt;b.position.x+=Math.sin(b.userData.phase)*dt*.9;b.position.z+=Math.cos(b.userData.phase*.7)*dt*.55;b.lookAt(player.position.x,b.position.y,player.position.z);animateCharacter(b.userData.model,true,dt,false,true,true,false);}updateBuildPreview();updateCamera();}
function animate(){if(game.classList.contains('hidden'))return;requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);update(dt);renderer.render(scene,camera);frameCount++;const now=performance.now();if(now-lastFrame>500){$('fps').textContent=String(Math.round(frameCount*1000/(now-lastFrame)));frameCount=0;lastFrame=now;}}
