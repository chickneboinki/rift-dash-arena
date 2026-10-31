import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const menu = $('menu'), game = $('game'), canvas = $('world');
let selectedMode = 'Free Play', renderer, scene, camera, clock, player, yaw = 0, pitch = 0;
let keys = {}, velocityY = 0, grounded = true, health = 100, elims = 0, sensitivity = 1;
let buildItems = [], bots = [], lastFrame = performance.now(), frameCount = 0;
let pointerLocked = false, gameStarted = false;

document.querySelectorAll('.mode-card').forEach(card => card.addEventListener('click', () => {
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected'); selectedMode = card.dataset.mode;
}));
$('playBtn').onclick = () => startGame(false);
$('practiceBtn').onclick = () => { selectedMode = 'Free Play'; startGame(true); };
$('leaveBtn').onclick = leaveGame;
$('settingsBtn').onclick = () => $('settings').classList.remove('hidden');
$('closeSettings').onclick = $('resumeBtn').onclick = () => $('settings').classList.add('hidden');
$('sensitivity').oninput = e => { sensitivity = +e.target.value; $('sensOut').textContent = sensitivity.toFixed(1)+'x'; };
$('fov').oninput = e => { $('fovOut').textContent = e.target.value+'°'; if(camera){camera.fov=+e.target.value;camera.updateProjectionMatrix();} };
$('quality').onchange = e => toast(e.target.value+' graphics selected');
$('perfMode').onchange = e => { if(renderer) renderer.setPixelRatio(e.target.checked ? 1 : Math.min(devicePixelRatio,1.8)); toast(e.target.checked?'Performance mode enabled':'Performance mode disabled'); };
$('editRelease').onchange = e => toast('Edit on release '+(e.target.checked?'enabled':'disabled'));

function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1700);}
function startGame(quick){
  menu.classList.add('hidden'); game.classList.remove('hidden');
  $('modeLabel').textContent=(quick?'FREE PLAY':selectedMode).toUpperCase();
  if(!gameStarted){initWorld();gameStarted=true;} else {resetArena();}
  $('hint').textContent='CLICK TO LOCK MOUSE · WASD MOVE · SPACE JUMP · Q/F/C/V BUILD · LEFT CLICK FIRE';
  animate();
}
function leaveGame(){if(document.pointerLockElement)document.exitPointerLock();game.classList.add('hidden');menu.classList.remove('hidden');}
function initWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x9bc4d1);scene.fog=new THREE.Fog(0x9bc4d1,45,125);
  camera=new THREE.PerspectiveCamera(90,innerWidth/innerHeight,.1,250);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;
  scene.add(new THREE.HemisphereLight(0xd8efff,0x39434a,2.1));
  const sun=new THREE.DirectionalLight(0xfff1d8,2.2);sun.position.set(-18,32,12);sun.castShadow=true;scene.add(sun);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x647c68,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(180,90,0x9db49b,0x8aa18b);grid.position.y=.015;scene.add(grid);
  for(let i=-5;i<=5;i++){for(let j=-5;j<=5;j++){if(Math.abs(i)<2&&Math.abs(j)<2)continue;const h=1+Math.random()*3;const box=new THREE.Mesh(new THREE.BoxGeometry(2,h,2),new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.48+Math.random()*.08,.18,.28+Math.random()*.12)}));box.position.set(i*8,h/2,j*8);box.castShadow=true;box.receiveShadow=true;scene.add(box);}}
  player=new THREE.Group();player.position.set(0,0,7);scene.add(player);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.8,4,8),new THREE.MeshStandardMaterial({color:0xc7f36b}));body.position.y=.95;body.castShadow=true;player.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,12),new THREE.MeshStandardMaterial({color:0xe8c5a1}));head.position.y=1.65;player.add(head);
  camera.position.set(0,2.1,0);player.add(camera);
  clock=new THREE.Clock();spawnBots(4);
  window.addEventListener('resize',onResize);
  canvas.addEventListener('click',()=>{if(!$('settings').classList.contains('hidden'))return;canvas.requestPointerLock();});
  document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;$('hint').style.opacity=pointerLocked?'0':'1';});
  document.addEventListener('mousemove',e=>{if(!pointerLocked)return;yaw-=e.movementX*.002*sensitivity;pitch-=e.movementY*.002*sensitivity;pitch=Math.max(-1.2,Math.min(1.2,pitch));camera.rotation.set(pitch,yaw,0,'YXZ');});
  document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape'&&pointerLocked){$('settings').classList.remove('hidden');}if(['KeyQ','KeyF','KeyC','KeyV'].includes(e.code))placeBuild(e.code);if(e.code==='KeyG')editBuild();});
  document.addEventListener('keyup',e=>keys[e.code]=false);
  document.addEventListener('mousedown',e=>{if(pointerLocked&&e.button===0)shoot();});
  $('fov').dispatchEvent(new Event('input'));
}
function onResize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function resetArena(){player.position.set(0,0,7);health=100;$('healthNum').textContent=100;$('healthBar').style.width='100%';elims=0;$('elims').textContent='0';buildItems.forEach(o=>scene.remove(o));buildItems=[];bots.forEach(b=>scene.remove(b));bots=[];spawnBots(4);}
function spawnBots(count){for(let i=0;i<count;i++){const bot=new THREE.Group();const color=[0xf07858,0x77a7ed,0xd4a4ef,0xe6b84d][i%4];const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.75,4,8),new THREE.MeshStandardMaterial({color}));torso.position.y=.85;bot.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.23,12,12),new THREE.MeshStandardMaterial({color:0xe6bd9a}));head.position.y=1.5;bot.add(head);bot.position.set((Math.random()-.5)*22,0,-8-Math.random()*17);bot.userData={hp:100,phase:Math.random()*6};scene.add(bot);bots.push(bot);}}
function placeBuild(code){const types={KeyQ:{name:'WALL',size:[3,3,.18]},KeyF:{name:'FLOOR',size:[3,.18,3]},KeyC:{name:'RAMP',size:[3,.18,3]},KeyV:{name:'ROOF',size:[3,.18,3]}};const t=types[code];const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));const pos=player.position.clone().add(dir.multiplyScalar(4));pos.y=code==='KeyF'?1.7:code==='KeyV'?2.9:1.5;const mat=new THREE.MeshStandardMaterial({color:0xb6d9e0,transparent:true,opacity:.82,metalness:.15,roughness:.45});const mesh=new THREE.Mesh(new THREE.BoxGeometry(...t.size),mat);mesh.position.copy(pos);mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);buildItems.push(mesh);toast(t.name+' placed');}
function editBuild(){if(!buildItems.length){toast('No build piece nearby');return;}const item=buildItems[buildItems.length-1];item.material.color.set(0xc7f36b);item.scale.y=.65;toast('EDIT / RESET: last piece modified (prototype)');}
function shoot(){const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));const ray=new THREE.Raycaster(camera.position,dir,0,70);const hits=ray.intersectObjects(bots,true);if(hits.length){let target=hits[0].object;while(target.parent&&!target.userData.hp)target=target.parent;if(target.userData.hp){target.userData.hp-=34;target.scale.setScalar(.94);if(target.userData.hp<=0){scene.remove(target);bots=bots.filter(b=>b!==target);elims++;$('elims').textContent=elims;if(!bots.length)spawnBots(4);}}}}
function update(dt){const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const move=new THREE.Vector3();if(keys.KeyW)move.add(forward);if(keys.KeyS)move.sub(forward);if(keys.KeyD)move.add(right);if(keys.KeyA)move.sub(right);if(move.lengthSq())move.normalize().multiplyScalar(9*dt);player.position.add(move);if(keys.Space&&grounded){velocityY=7.5;grounded=false;}velocityY-=19*dt;player.position.y+=velocityY*dt;if(player.position.y<0){player.position.y=0;velocityY=0;grounded=true;}player.position.x=Math.max(-48,Math.min(48,player.position.x));player.position.z=Math.max(-48,Math.min(48,player.position.z));for(const b of bots){b.userData.phase+=dt;b.position.x+=Math.sin(b.userData.phase)*dt*1.3;b.position.z+=Math.cos(b.userData.phase*.7)*dt*.8;b.lookAt(player.position.x,0,player.position.z);}}
function animate(){if(game.classList.contains('hidden'))return;requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);update(dt);renderer.render(scene,camera);frameCount++;const now=performance.now();if(now-lastFrame>500){$('fps').textContent=Math.round(frameCount*1000/(now-lastFrame));frameCount=0;lastFrame=now;}}
