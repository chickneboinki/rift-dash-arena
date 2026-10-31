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
 const root=new THREE.Group();
 const cloth=material(primary,.78),trim=material(accent,.42,.28),dark=material(0x18212a,.72,.12),rubber=material(0x10161c,.94),skinMat=material(skin,.78),metal=material(0x89979b,.34,.72),glow=material(0x8ce5ec,.22,.5,{emissive:0x236b78,emissiveIntensity:.55});
 const bone=material(0xe8e4d7,.88),socket=material(0x11171c,.96),accentDark=material(0x303c43,.68,.2);
 const sphere=(parent,r,pos,mat,scale=[1,1,1],detail=16)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,detail,12),mat);m.position.copy(pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const panel=(size,pos,mat,bevel=.035)=>{const m=box(root,size,pos,mat);return m;};
 // Boots, shin armor, knee caps and articulated legs.
 for(const s of [-1,1]){
  const x=s*.2;
  box(root,[.31,.13,.43],[x,.105,.09],rubber);
  box(root,[.29,.11,.35],[x,.19,.035],dark);
  capsule(root,.135,.34,V(x,.43,0),cloth);
  box(root,[.29,.27,.16],[x,.47,.12],dark);
  sphere(root,.16,V(x,.67,.12),trim,[1,.72,.5]);
  box(root,[.31,.13,.22],[x,.68,.035],accentDark);
  box(root,[.25,.22,.11],[x,.37,.13],trim);
  box(root,[.075,.29,.1],[x+s*.09,.39,.19],metal);
  // Boot tongue, toe cap and ankle cuff.
  box(root,[.22,.055,.24],[x,.24,.22],trim);
  box(root,[.27,.09,.18],[x,.13,.2],dark);
 }
 // Pelvis, belt, waist rig and layered torso armor.
 capsule(root,.29,.24,V(0,.84,0),dark);
 box(root,[.66,.15,.34],[0,.84,.015],trim);
 box(root,[.23,.16,.07],[0,.84,.205],metal);
 for(const s of [-1,1]){
  box(root,[.19,.19,.16],[s*.31,.83,.04],dark);
  box(root,[.15,.2,.13],[s*.33,.82,.14],trim);
  box(root,[.13,.19,.12],[s*.39,.72,-.015],accentDark);
 }
 capsule(root,.31,.43,V(0,1.13,0),cloth);
 // Segmented chest plate with raised center, ribs and shoulder straps.
 box(root,[.56,.48,.2],[0,1.16,.15],trim);
 box(root,[.38,.32,.075],[0,1.17,.265],cloth);
 box(root,[.16,.29,.045],[0,1.17,.315],dark);
 for(let row=0;row<3;row++)for(const s of [-1,1]){
  box(root,[.13,.075,.035],[s*(.115+row*.012),1.27-row*.105,.31],row===1?metal:accentDark);
 }
 for(const s of [-1,1]){
  const strap=box(root,[.09,.52,.065],[s*.22,1.18,.255],dark);strap.rotation.z=s*.23;
  box(root,[.12,.12,.07],[s*.22,1.29,.3],metal);
 }
 // Shoulder pauldrons and articulated arms.
 for(const s of [-1,1]){
  sphere(root,.19,V(s*.43,1.38,0),trim,[1.15,.83,1.05]);
  box(root,[.31,.12,.25],[s*.44,1.49,0],metal);
  capsule(root,.12,.27,V(s*.48,1.13,.015),cloth);
  sphere(root,.13,V(s*.49,.99,.04),dark,[1,.9,.9]);
  capsule(root,.095,.27,V(s*.48,.82,.1),cloth);
  box(root,[.23,.22,.12],[s*.48,.83,.17],trim);
  box(root,[.17,.13,.13],[s*.48,.69,.13],dark);
  capsule(root,.105,.11,V(s*.48,.66,.13),rubber);
  // Forearm bracer with metal ridge and glove knuckle plates.
  box(root,[.22,.28,.16],[s*.48,.84,.19],accentDark);
  box(root,[.2,.075,.18],[s*.48,.94,.2],metal);
  box(root,[.2,.075,.18],[s*.48,.74,.2],trim);
  box(root,[.2,.11,.18],[s*.48,.62,.18],dark);
  for(let f=0;f<4;f++)box(root,[.035,.07,.045],[s*.48-.075+f*.05,.58,.25],rubber);
  // Side utility pouches and holster.
  box(root,[.16,.19,.13],[s*.39,.92,-.13],dark);
  box(root,[.12,.1,.035],[s*.39,.94,-.055],metal);
 }
 // Neck seal and head with a custom helmet/mask silhouette.
 capsule(root,.12,.16,V(0,1.47,0),dark);
 sphere(root,.19,V(0,1.68,0),skinMat,[.9,1.12,.86],20);
 // Helmet shell, crown, brow, ear guards and rear neck protection.
 sphere(root,.225,V(0,1.79,-.015),style==='skull'?dark:trim,[1.05,.78,1.05],20);
 box(root,[.4,.07,.29],[0,1.78,.11],dark);
 for(const s of [-1,1]){
  box(root,[.095,.22,.19],[s*.205,1.68,-.015],metal);
  sphere(root,.07,V(s*.22,1.69,.055),glow,[.6,1,.45]);
 }
 box(root,[.36,.12,.19],[0,1.54,-.08],dark);
 if(style==='skull'){
  // Bone faceplate, deep sockets, glowing eyes, nasal cavity and segmented teeth.
  sphere(root,.177,V(0,1.66,.12),bone,[1,.92,.68],20);
  for(const s of [-1,1]){
   sphere(root,.061,V(s*.073,1.69,.229),socket,[1,.92,.45]);
   sphere(root,.023,V(s*.073,1.69,.251),glow,[1,1,.6],12);
   box(root,[.035,.085,.025],[s*.13,1.59,.205],socket);
  }
  box(root,[.045,.065,.035],[0,1.615,.224],socket);
  box(root,[.16,.055,.045],[0,1.555,.195],socket);
  for(let i=0;i<5;i++)box(root,[.022,.045,.025],[-.055+i*.027,1.545,.22],bone);
  sphere(root,.23,V(0,1.84,-.035),trim,[1.1,.58,1.12]);
 }else{
  // Sealed visor with a bright horizontal lens and reinforced jaw.
  box(root,[.31,.12,.09],[0,1.7,.205],glow);
  box(root,[.34,.055,.075],[0,1.76,.19],metal);
  box(root,[.25,.11,.12],[0,1.57,.13],dark);
  for(const s of [-1,1])box(root,[.08,.18,.08],[s*.16,1.59,.16],trim);
 }
 // Back-mounted pack, canisters, straps and equipment silhouette.
 box(root,[.42,.48,.2],[0,1.12,-.235],dark);
 box(root,[.34,.32,.09],[0,1.18,-.36],trim);
 box(root,[.24,.2,.07],[0,1.18,-.42],accentDark);
 for(const s of [-1,1]){
  box(root,[.12,.28,.13],[s*.28,1.2,-.22],metal);
  const can=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.3,10),trim);can.position.set(s*.29,1.05,-.27);can.castShadow=true;root.add(can);
  box(root,[.07,.37,.06],[s*.18,1.17,-.14],metal);
 }
 box(root,[.25,.07,.08],[0,.94,-.34],metal);
 // Style-specific armor crests and trim, keeping silhouettes distinguishable.
 if(style==='gold'){
  const crest=new THREE.Mesh(new THREE.ConeGeometry(.12,.28,5),metal);crest.position.set(0,1.98,-.005);crest.rotation.z=Math.PI;root.add(crest);
  box(root,[.7,.09,.24],[0,1.42,0],metal);
  for(const s of [-1,1])box(root,[.13,.3,.14],[s*.43,1.31,0],metal);
 }else if(style==='standard'){
  box(root,[.12,.22,.055],[0,1.36,.29],glow);
 }
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return root;
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
 clock=new THREE.Clock();spawnBots(7);window.addEventListener('resize',onResize);
 canvas.addEventListener('click',()=>{if(!$('settings').classList.contains('hidden'))return;canvas.requestPointerLock();});
 document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;$('hint').style.opacity=pointerLocked?'0':'1';});
 document.addEventListener('mousemove',e=>{if(!pointerLocked)return;yaw-=e.movementX*.0019*sensitivity;pitch-=e.movementY*.0019*sensitivity;pitch=Math.max(-.65,Math.min(.45,pitch));});
 document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape'&&pointerLocked)openSettings();if(['KeyQ','KeyF','KeyC','KeyV'].includes(e.code))placeBuild(e.code);if(e.code==='KeyG')editBuild();});
 document.addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('mousedown',e=>{if(pointerLocked&&e.button===0)shoot();});$('fov').dispatchEvent(new Event('input'));updateCamera();
}
function onResize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function updateCamera(){const target=player.position.clone().add(V(0,1.35,0)),d=5.4,h=Math.cos(pitch)*d;camera.position.set(target.x+Math.sin(yaw)*h,target.y+Math.sin(pitch)*d+1.1,target.z+Math.cos(yaw)*h);camera.lookAt(target.clone().add(V(-Math.sin(yaw)*3,Math.sin(pitch)*3,-Math.cos(yaw)*3)));}
function spawnBots(n){const palette=[[0x9a4f42,0xffb46b],[0x314f79,0x79c9ed],[0x66517e,0xd6a4ed],[0x6c7542,0xd6e66e],[0x6c5550,0xe4b1a0]];for(let i=0;i<n;i++){const [body,accent]=palette[i%palette.length],bot=new THREE.Group(),model=makeCharacter(body,accent,0xb98262);bot.add(model);const bx=player.position.x+(Math.random()-.5)*42,bz=player.position.z-12-Math.random()*35;bot.position.set(bx,terrainHeight(bx,bz)+.25,bz);bot.userData={hp:100,phase:Math.random()*6,model};scene.add(bot);bots.push(bot);}}
function resetArena(){player.position.set(-5,terrainHeight(-5,8)+.25,8);yaw=0;pitch=-.08;velocityY=0;health=100;$('healthNum').textContent='100';$('healthBar').style.width='100%';elims=0;$('elims').textContent='0';buildItems.forEach(o=>scene.remove(o));buildItems=[];bots.forEach(b=>scene.remove(b));bots=[];spawnBots(5);}
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
function update(dt){const f=V(-Math.sin(yaw),0,-Math.cos(yaw)),r=V(Math.cos(yaw),0,-Math.sin(yaw)),move=V();if(keys.KeyW)move.add(f);if(keys.KeyS)move.sub(f);if(keys.KeyD)move.add(r);if(keys.KeyA)move.sub(r);if(move.lengthSq())move.normalize().multiplyScalar(8.5*dt);player.position.add(move);if(keys.Space&&grounded){velocityY=7.2;grounded=false;}velocityY-=18*dt;player.position.y+=velocityY*dt;if(player.position.y<0){player.position.y=0;velocityY=0;grounded=true;}player.position.x=THREE.MathUtils.clamp(player.position.x,-103,103);player.position.z=THREE.MathUtils.clamp(player.position.z,-103,103);const ground=terrainHeight(player.position.x,player.position.z)+.25;if(player.position.y<ground){player.position.y=ground;velocityY=0;grounded=true;}player.rotation.y=yaw;if(move.lengthSq()){const t=performance.now()*.012;playerModel.position.y=Math.sin(t)*.035;playerModel.rotation.z=Math.sin(t*.5)*.025;}else{playerModel.position.y=0;playerModel.rotation.z=0;}for(const b of bots){b.userData.phase+=dt;b.position.x+=Math.sin(b.userData.phase)*dt*.9;b.position.z+=Math.cos(b.userData.phase*.7)*dt*.55;b.lookAt(player.position.x,0,player.position.z);}updateCamera();}
function animate(){if(game.classList.contains('hidden'))return;requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);update(dt);renderer.render(scene,camera);frameCount++;const now=performance.now();if(now-lastFrame>500){$('fps').textContent=String(Math.round(frameCount*1000/(now-lastFrame)));frameCount=0;lastFrame=now;}}
