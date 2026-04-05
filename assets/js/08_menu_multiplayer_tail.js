function menuShowSP(){menuOpenPanel('sp-panel',['mp-panel','settings-menu-panel']);}function menuHideSP(){menuClosePanel('sp-panel');}function menuShowSettings(){menuOpenPanel('settings-menu-panel',['sp-panel','mp-panel'],updateTextureModeUi);}function menuHideSettings(){menuClosePanel('settings-menu-panel');}function menuStartSP(level='advanced'){ensureUiBootstrap();selectedAIDifficulty=level||'advanced';playMenuUi('click');const mainMenu=document.getElementById('main-menu');if(mainMenu)mainMenu.style.display='none';resize();init();startLoop();}
const REPO_ZIP_FILE_LIST=['ARCHITECTURE.md','CHUNK_MAP.md','DEPLOYMENT_VERSION_CHANGELOG.md','FILE_MAP.md','INSTRUCTIONS.md','INTEGRITY_REPORT.md','README.md','VERSION.md','index.html','integrity-report.json','mod.js','assets/css/base.css','assets/css/mobile.css','assets/js/01_bootstrap_config.js','assets/js/02_visibility_ai_fp.js','assets/js/03_world_entities_transport.js','assets/js/04_path_audio_build_mobile_ai.js','assets/js/05_units_render2d.js','assets/js/06_threejs_loop.js','assets/js/07_graphics_modes_beauty.js','assets/js/08_menu_multiplayer_tail.js','original/command_zero_station_fp_mobile_browser_adapt_fix14 (2).html','server/server.js','tools/deploy.py','tools/integrity_check.py','.github/copilot-instructions.md'];
let _menuZipLibPromise=null;
function menuEnsureDownloadButton(){const root=document.getElementById('menu-root');if(!root||document.getElementById('btn-download-repo'))return;const btn=document.createElement('button');btn.className='menu-btn back';btn.id='btn-download-repo';btn.type='button';btn.style.width='196px';btn.style.fontSize='10px';btn.style.padding='8px 0';btn.style.letterSpacing='2px';btn.style.marginTop='10px';btn.textContent='⬇ DOWNLOAD ZIP';btn.onclick=menuDownloadRepoZip;root.appendChild(btn);}
function menuSetDownloadBtnState(text,disabled){const btn=document.getElementById('btn-download-repo');if(!btn)return;btn.textContent=text;btn.disabled=!!disabled;btn.style.opacity=disabled?'0.6':'1';}
function menuLoadZipLib(){if(window.JSZip)return Promise.resolve(window.JSZip);if(_menuZipLibPromise)return _menuZipLibPromise;const sources=['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'];_menuZipLibPromise=new Promise((resolve,reject)=>{let idx=0;const loadNext=()=>{if(idx>=sources.length){reject(new Error('JSZip CDN unavailable'));return;}const script=document.createElement('script');script.src=sources[idx++];script.async=true;script.onload=()=>resolve(window.JSZip);script.onerror=loadNext;document.head.appendChild(script);};loadNext();});return _menuZipLibPromise;}
const _REPO_FETCH_REMAP={'.github/':'_github/'};function _repoFetchPath(rel){for(const k in _REPO_FETCH_REMAP){if(rel.startsWith(k))return _REPO_FETCH_REMAP[k]+rel.slice(k.length);}return rel;}
async function menuDownloadRepoZip(){playMenuUi('click');if(window.location.protocol==='file:'){alert('ZIP download needs local HTTP hosting (not file://).');return;}menuSetDownloadBtnState('ZIP PREP 0%',true);try{const JSZipCtor=await menuLoadZipLib();if(!JSZipCtor)throw new Error('JSZip failed to load');const zip=new JSZipCtor();const missing=[];for(let i=0;i<REPO_ZIP_FILE_LIST.length;i++){const rel=REPO_ZIP_FILE_LIST[i];menuSetDownloadBtnState(`ZIP PREP ${Math.round(((i+1)/REPO_ZIP_FILE_LIST.length)*100)}%`,true);const fetchRel=_repoFetchPath(rel);let resp=null;try{resp=await fetch('./'+fetchRel,{cache:'no-store'});}catch(err){missing.push(`${rel} (${err.message})`);continue;}if(!resp||!resp.ok){missing.push(`${rel} (HTTP ${resp?resp.status:'0'})`);continue;}zip.file(rel,await resp.arrayBuffer());}if(missing.length){throw new Error('Missing files: '+missing.join(', '));}menuSetDownloadBtnState('ZIP BUILDING...',true);const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});const stamp=new Date().toISOString().slice(0,10);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`command_zero_station_repo_${stamp}.zip`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}catch(err){console.error('[menuDownloadRepoZip]',err);alert(`ZIP download failed: ${err&&err.message?err.message:err}`);}finally{menuSetDownloadBtnState('⬇ DOWNLOAD ZIP',false);}}
menuEnsureDownloadButton();
function menuShowMP(){menuOpenPanel('mp-panel',['sp-panel','settings-menu-panel']);}
function menuHideMP(){document.getElementById('mp-panel').classList.remove('open');document.getElementById('menu-root').classList.remove('hidden');document.getElementById('mp-status').textContent='';document.getElementById('mp-status').className='';document.getElementById('lan-results').innerHTML='';const log=document.getElementById('mp-conn-log');if(log)log.innerHTML='';}
function mpDisconnect(){MP.disconnect();document.getElementById('main-menu').style.display='';document.getElementById('menu-root').classList.remove('hidden');document.getElementById('sp-panel').classList.remove('open');document.getElementById('settings-menu-panel').classList.remove('open');document.getElementById('mp-panel').classList.remove('open');}
function setMpSt(msg,cls=''){const el=document.getElementById('mp-status');el.textContent=msg;el.className=cls;}
function mpLog(msg,cls=''){const el=document.getElementById('mp-conn-log');if(!el)return;const ts=new Date().toLocaleTimeString('cs',{hour:'2-digit',minute:'2-digit',second:'2-digit'});const line=document.createElement('div');line.className='mplog-'+cls;line.textContent=`${ts}  ${msg}`;el.appendChild(line);while(el.children.length>8)el.removeChild(el.firstChild);el.scrollTop=el.scrollHeight;}
function mpConnect(addrOverride){let addr=addrOverride||document.getElementById('srv-addr').value.trim();if(!addr){setMpSt('⚠ Zadej adresu serveru!','err');return;}
if(window.location.protocol==='https:'&&addr.startsWith('ws://')){addr=addr.replace('ws://','wss://');document.getElementById('srv-addr').value=addr;mpLog(`Auto-upgrade na wss://`,'warn');}
if(!addr.startsWith('ws://')&&!addr.startsWith('wss://')){setMpSt('⚠ Adresa musí začínat ws:// nebo wss://','err');mpLog('Chyba: neplatný prefix (musí být ws:// nebo wss://)','err');return;}
setMpSt('Připojuji…','warn');mpLog(`Připojuji → ${addr}`,'info');MP.disconnect();let ws;try{ws=new WebSocket(addr);}catch(e){setMpSt(`⚠ Neplatná adresa: ${e.message}`,'err');mpLog(`Chyba: ${e.message}`,'err');return;}
MP.socket=ws;const connTimeout=setTimeout(()=>{if(ws.readyState!==WebSocket.OPEN){ws.close();setMpSt('⚠ Timeout — server neodpovídá (8s)','err');mpLog('Timeout po 8s — server nedostupný nebo blokuje WebSocket','err');mpLog('Zkontroluj: správná URL? Server běží? Firewall?','warn');}},8000);ws.onopen=()=>{clearTimeout(connTimeout);setMpSt('✓ Připojeno — čekám na soupeře…','ok');mpLog('Spojení navázáno ✓','ok');};ws.onmessage=ev=>{try{MP.onMessage(JSON.parse(ev.data));}catch(e){mpLog(`Chyba zpracování zprávy: ${e.message}`,'err');}};ws.onclose=(e)=>{clearTimeout(connTimeout);if(MP.active){MP.active=false;MP.stopPing();}
MP.hideOverlay();const diagnoses={1000:['Spojení ukončeno normálně','info'],1001:['Stránka zavřena nebo přechod jinam','warn'],1002:['Chyba protokolu — nekompatibilní server?','err'],1006:['Spojení přerušeno bez důvodu — nejčastější příčiny:','err'],1011:['Interní chyba serveru — zkontroluj server logy','err'],1012:['Server se restartuje — zkus za chvíli','warn'],1015:['TLS/SSL chyba — certifikát nedůvěryhodný?','err'],};const[diagMsg,diagCls]=diagnoses[e.code]||[`Spojení ztraceno (kód ${e.code})`,'err'];setMpSt(`⚠ ${diagMsg}`,'err');mpLog(`Odpojeno: ${diagMsg}`,diagCls);if(e.code===1006){if(addr.startsWith('wss://')&&window.location.protocol==='http:'){mpLog('→ Načítáš hru přes http:// ale server je wss:// — Mixed content blokován prohlížečem','err');}else if(addr.startsWith('ws://')&&window.location.protocol==='https:'){mpLog('→ Načítáš hru přes https:// ale server je ws:// — použij wss://','err');}else{mpLog('→ Server neběží, špatná URL, nebo firewall blokuje port','warn');mpLog('→ Railway/cloud: použij wss://  |  LAN: použij ws://','info');}}else if(e.code===1015){mpLog('→ Self-signed certifikát nebo expirovaný SSL','err');}};ws.onerror=()=>{mpLog('WebSocket error (detail viz onclose)','err');};}
async function mpScanLAN(){const container=document.getElementById('lan-results');container.innerHTML='<div style="color:#4a7a8a;font-size:11px">Skenuji LAN…</div>';setMpSt('Hledám servery…','warn');const found=[];const localHost=window.location.hostname;const candidates=['localhost'];if(/^192\.168\.\d+\.\d+$/.test(localHost)){const p=localHost.split('.');for(let i=1;i<=254;i++)candidates.push(`${p[0]}.${p[1]}.${p[2]}.${i}`);}else{for(let i=1;i<=30;i++)candidates.push(`192.168.1.${i}`);for(let i=1;i<=30;i++)candidates.push(`192.168.0.${i}`);}
await Promise.allSettled(candidates.map(async h=>{try{const c=new AbortController();setTimeout(()=>c.abort(),400);const r=await fetch(`http://${h}:8081/ping`,{signal:c.signal});if(r.ok){const d=await r.json();found.push({h,d});}}catch{}}));container.innerHTML='';if(!found.length){container.innerHTML='<div style="color:#4a7a8a;font-size:11px">Nenalezeno.</div>';setMpSt('','');return;}
found.forEach(({h,d})=>{const div=document.createElement('div');div.className='lan-item';div.innerHTML=`<span>${h}:8080</span><span style="color:#4a7a8a">${d.waiting?'čeká':'hraje'}</span>`;div.onclick=()=>{document.getElementById('srv-addr').value=`ws://${h}:8080`;mpConnect(`ws://${h}:8080`);};container.appendChild(div);});setMpSt(`Nalezeno ${found.length} server(ů)`,'ok');}
function getHelicopterShotOrigin2D(h){if(!h)return{x:0,y:0};const aim=h._aimAng!=null?h._aimAng:(Math.hypot(h.vx||0,h.vy||0)>0.08?Math.atan2(h.vy||0,h.vx||0):0);return{x:h.x+Math.cos(aim)*16,y:h.y+Math.sin(aim)*16};}
function getHelicopterShotVisualOrigin2D(h){if(!h)return{x:0,y:0};const visual=getHelicopterVisualCenter?getHelicopterVisualCenter(h):{x:h.x,y:h.y};const aim=h._aimAng!=null?h._aimAng:(Math.hypot(h.vx||0,h.vy||0)>0.08?Math.atan2(h.vy||0,h.vx||0):0);return{x:visual.x+Math.cos(aim)*18,y:visual.y+Math.sin(aim)*18-3};}
function getHelicopterMuzzleWorld(h,aimOverride){if(FP_RENDER_BACKEND==='three'&&threeFP&&threeFP.enabled&&fpMode&&fp.avatar===h&&threeFP.camera){const dir=new THREE.Vector3();threeFP.camera.getWorldDirection(dir);dir.normalize();const worldUp=new THREE.Vector3(0,1,0);let right=new THREE.Vector3().crossVectors(dir,worldUp);if(right.lengthSq()<0.00001)right.set(1,0,0);else right.normalize();const up=new THREE.Vector3().crossVectors(right,dir).normalize();h._rocketPodSide=(h._rocketPodSide===-1?1:-1);const podSide=h._rocketPodSide||1;return threeFP.camera.position.clone().add(dir.clone().multiplyScalar(2.65)).add(right.multiplyScalar(0.78*podSide)).add(up.multiplyScalar(-0.58));}
const aim=Number.isFinite(aimOverride)?aimOverride:(h&&h._aimAng!=null?h._aimAng:0);const p=threeFPWorldPos(h.x,h.y);const gy=(threeFP.groundHeight?threeFP.groundHeight(p.x,p.z):0);const alt=((h&&(h._fpAlt!=null?h._fpAlt:h.alt))||HELICOPTER_ALTITUDE)/TILE;return new THREE.Vector3(p.x+Math.cos(aim)*1.75,gy+alt+1.48,p.z+Math.sin(aim)*1.75);}
function getHelicopterTargetWorldPoint(e){if(!e||!threeFP||!threeFP.enabled)return null;const c=getHelicopterTargetCenter(e);if(!c)return null;const wp=threeFPWorldPos(c.x,c.y);const gy=(threeFP.groundHeight?threeFP.groundHeight(wp.x,wp.z):0);let y=gy+Math.max(0.95,threeFPUnitBarHeight(e)*0.45);if(e.type==='helicopter')y=gy+((e.alt||HELICOPTER_ALTITUDE)/TILE)+1.85;else if(e.type==='base')y=gy+threeFPUnitBarHeight(e)*0.62;else if(e.type==='tower')y=gy+threeFPUnitBarHeight(e)*0.66;else if(e.type==='house'||e.type==='apartment'||e.type==='training'||e.type==='harbor')y=gy+threeFPUnitBarHeight(e)*0.58;else if(e.type==='wall')y=gy+threeFPUnitBarHeight(e)*0.72;return new THREE.Vector3(wp.x,y,wp.z);}
function fpHelicopterLockTarget(maxRange){if(!fp||!fp.avatar||fp.avatar.type!=='helicopter')return null;if(!(FP_RENDER_BACKEND==='three'&&threeFP&&threeFP.enabled&&threeFP.camera))return null;const from={x:fp.avatar.x,y:fp.avatar.y};const candidates=getHelicopterRocketCandidates(fp.avatar.faction);let best=null;let bestScore=1e18;for(const e of candidates){if(!e||e.hp<=0||e.faction===fp.avatar.faction)continue;const c=getHelicopterTargetCenter(e);if(!c)continue;const d=Math.hypot(c.x-from.x,c.y-from.y);if(d>maxRange*1.10)continue;const point3=getHelicopterTargetWorldPoint(e);if(!point3)continue;const ndc=point3.clone().project(threeFP.camera);if(!Number.isFinite(ndc.x)||!Number.isFinite(ndc.y)||!Number.isFinite(ndc.z))continue;if(ndc.z<-1||ndc.z>1.06)continue;const radius=getHelicopterHitRadius(e);const slack=Math.min(0.22,0.050+radius/Math.max(70,d*1.9));const dx=Math.abs(ndc.x);const dy=Math.abs(ndc.y);if(dx>0.06+slack||dy>0.10+slack*1.4)continue;const score=Math.hypot(ndc.x*1.18,ndc.y*0.92)*900+d-radius*5.0;if(score<bestScore){bestScore=score;best={entity:e,aimPoint:c,point3};}}
return best;}
function fpHelicopterAimAssist(maxRange){if(!fp||!fp.avatar||fp.avatar.type!=='helicopter')return null;const enemies=(fp.avatar.faction==='player')?[...ai.units,...ai.workers,...(ai.villagers||[]),...ai.tanks,...(ai.launchers||[]),...ai.drones,...ai.helicopters,...(ai.patriots||[]),...(ai.supplies||[]),...ai.bikes,...ai.leaders,...ai.ships,...ai.towers,...ai.harbors,...ai.houses,...(ai.apartments||[]),...(ai.trainings||[]),...ai.walls,...ai.bases]:[...player.units,...player.workers,...(player.villagers||[]),...player.tanks,...(player.launchers||[]),...player.drones,...player.helicopters,...(player.patriots||[]),...(player.supplies||[]),...player.bikes,...player.leaders,...player.ships,...player.towers,...player.harbors,...player.houses,...(player.apartments||[]),...(player.trainings||[]),...player.walls,...player.bases];const fx=fp.avatar.x,fy=fp.avatar.y;const aimA=fp.ang;let best=null,bestScore=1e9;for(const e of enemies){if(!e||e.hp<=0)continue;const c=entityCenter(e);const dx=c.x-fx,dy=c.y-fy;const d=Math.hypot(dx,dy);if(d>maxRange*1.02)continue;const a=Math.atan2(dy,dx);let da=Math.atan2(Math.sin(a-aimA),Math.cos(a-aimA));da=Math.abs(da);const accept=(e.type==='worker'||e.type==='unit'||e.type==='villager'||e.type==='leader'||e.type==='bike')?0.17:0.12;if(da>accept)continue;const score=da*260+d;if(score<bestScore){bestScore=score;best=e;}}
return best;}
function fpFindTargetAlongRay(from,ang,maxRange,avatarType){if(!from||!isFinite(from.x)||!isFinite(from.y))return null;const enemy=(fp&&fp.avatar&&fp.avatar.faction==='player')?ai:player;const candidates=[...(enemy.units||[]),...(enemy.workers||[]),...(enemy.villagers||[]),...(enemy.tanks||[]),...(enemy.launchers||[]),...(enemy.drones||[]),...(enemy.helicopters||[]),...(enemy.ships||[]),...(enemy.bikes||[]),...(enemy.leaders||[]),...(enemy.towers||[]),...(enemy.houses||[]),...(enemy.apartments||[]),...(enemy.trainings||[]),...(enemy.harbors||[]),...(enemy.walls||[]),...(enemy.bases||[])];const ca=Math.cos(ang),sa=Math.sin(ang);let best=null,bestScore=1e18;for(const e of candidates){if(!e||e.hp<=0||e.faction===fp.avatar.faction)continue;const c=entityCenter(e);const dx=c.x-from.x,dy=c.y-from.y;const along=dx*ca+dy*sa;if(along<4||along>maxRange)continue;const perp=Math.abs(-dx*sa+dy*ca);let radius=8;if(e.type==='worker'||e.type==='unit'||e.type==='villager')radius=10;else if(e.type==='helicopter')radius=14;else if(e.type==='tank'||e.type==='launcher'||e.type==='ship'||e.type==='tower')radius=16;else if(e.type==='base'||e.type==='harbor'||e.type==='house'||e.type==='apartment'||e.type==='training'||e.type==='wall')radius=18;const aimSlack=(avatarType==='helicopter')?1.45:1.0;if(perp>radius*aimSlack)continue;const score=perp*2.0+along*0.015;if(score<bestScore){bestScore=score;best=e;}}
return best;}
(function(){const sidebar=document.getElementById('sidebar');if(!sidebar)return;sidebar.addEventListener('mousemove',function(e){const tips=document.querySelectorAll('#sidebar .icon-tip');tips.forEach(t=>{const vw=window.innerWidth,vh=window.innerHeight;const tw=180,th=120;let x=e.clientX-tw-12;if(x<4)x=e.clientX+12;let y=e.clientY-20;if(y+th>vh-4)y=vh-th-4;if(y<4)y=4;t.style.left=x+'px';t.style.top=y+'px';});});})();

(function(){
const __origBuildTerrainSpriteCache = buildTerrainSpriteCache;
const __origDrawResourceTileFast = drawResourceTileFast;
function __beautyPatchHash(a,b,c){let n=((a|0)*73856093)^((b|0)*19349663)^((c|0)*83492791);n=(n^(n>>>13))>>>0;return (n%1000)/1000;}
function __beautyFillRoundedRect(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
function __beautyStrokeRoundedRect(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);g.stroke();}

drawBeautyShadow=function(sx,sy,rx,ry,dy=3,alpha=0.34){
  ctx.fillStyle=`rgba(0,0,0,${Math.max(0.06,alpha*0.62).toFixed(3)})`;
  ctx.beginPath();ctx.ellipse(sx+1.5,sy+dy+1.5,rx*1.08,ry*1.10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=`rgba(0,0,0,${Math.max(0.04,alpha*0.42).toFixed(3)})`;
  ctx.beginPath();ctx.ellipse(sx+0.5,sy+dy,rx*0.92,ry*0.92,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=`rgba(255,255,255,${Math.max(0.02,alpha*0.06).toFixed(3)})`;
  ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(sx-0.5,sy+dy-0.5,rx*0.65,Math.max(1.2,ry*0.52),0,0,Math.PI*2);ctx.stroke();
};

drawBeautyGroundDecal=function(cx,cy,rx,ry,rgb='18,35,24',alpha=0.10){
  const soft=Math.max(0.03,alpha*0.48), core=Math.max(0.04,alpha*0.75);
  ctx.fillStyle=`rgba(${rgb},${soft.toFixed(3)})`;
  ctx.beginPath();ctx.ellipse(cx,cy+0.8,rx*1.28,ry*1.26,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=`rgba(${rgb},${core.toFixed(3)})`;
  ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=`rgba(255,255,255,${Math.max(0.02,alpha*0.12).toFixed(3)})`;
  ctx.lineWidth=0.8;
  ctx.beginPath();ctx.ellipse(cx,cy-0.2,rx*0.82,Math.max(1.1,ry*0.62),0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=`rgba(0,0,0,${Math.max(0.02,alpha*0.11).toFixed(3)})`;
  ctx.beginPath();ctx.ellipse(cx+rx*0.16,cy+0.4,rx*0.48,Math.max(0.9,ry*0.42),0,0,Math.PI*2);ctx.fill();
};

drawBeautyMicroLight=function(x,y,r=1.5,col='rgba(255,220,120,0.75)'){
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.24)';ctx.beginPath();ctx.arc(x-0.35,y-0.35,Math.max(0.7,r*0.52),0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(x,y,r+0.7,0,Math.PI*2);ctx.stroke();
};

drawBeautyHpBar=function(x,y,w,pct,col){
  const p=Math.max(0,Math.min(1,pct||0));
  ctx.fillStyle='rgba(4,8,11,0.95)';ctx.beginPath();ctx.roundRect(x,y,w,6,2.4);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(x+1,y+1,w-2,1);
  const fillCol=p>0.45?col:p>0.22?'#ffcc44':'#ff5533';
  ctx.fillStyle=fillCol;ctx.beginPath();ctx.roundRect(x+1,y+1,Math.max(0,(w-2)*p),4,1.8);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.16)';ctx.fillRect(x+1,y+2,Math.max(0,(w-2)*p),1);
  ctx.strokeStyle='rgba(255,255,255,0.11)';ctx.lineWidth=0.8;ctx.beginPath();ctx.roundRect(x+0.5,y+0.5,w-1,5,2.1);ctx.stroke();
};

drawBeautySelectionRing=function(cx,cy,r,col='rgba(255,255,255,0.92)'){
  ctx.strokeStyle=col;ctx.lineWidth=1.15;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(255,255,255,0.16)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r+2.6,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.10)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,Math.max(2,r-2.2),0,Math.PI*2);ctx.stroke();
};

drawBeautyStructureFinish=function(kind,obj,sx,sy,w,h,opts={}){
  const style=getBeautyFactionStyle(obj.faction,'structure');
  const decalRgb=opts.decalRgb||style.decalRgb;
  const decalAlpha=opts.decalAlpha==null?0.12:opts.decalAlpha;
  drawBeautyGroundDecal(sx+w*0.5,sy+h*0.92,w*0.36,h*0.12,decalRgb,decalAlpha);
  ctx.drawImage(getBeautyStructureSprite(kind,w,h,obj.faction,opts),sx,sy);
  ctx.fillStyle='rgba(255,255,255,0.05)';
  ctx.fillRect(sx+3,sy+3,Math.max(1,w-6),1);
  ctx.strokeStyle='rgba(255,255,255,0.05)';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(sx+4,sy+h*0.28);
  ctx.lineTo(sx+w-4,sy+h*0.28);
  ctx.moveTo(sx+w*0.18,sy+5);
  ctx.lineTo(sx+w*0.18,sy+h-6);
  ctx.stroke();
  if((kind==='base'||kind==='radar'||kind==='harbor'||kind==='tower'||kind==='silo')&&((tick+Math.floor((obj.x||0)+(obj.y||0)))%90<22)){
    drawBeautyMicroLight(sx+w*0.76,sy+h*0.25,1.55,style.glow);
  }
};

buildTerrainSpriteCache=function(){
  const mode=getGraphicsMode();
  if(mode!=='beauty') return __origBuildTerrainSpriteCache();
  if(_terrainSpriteCache&&_terrainSpriteCache.__mode===mode) return _terrainSpriteCache;
  const mkSprite=(paint)=>{const c=document.createElement('canvas');c.width=TILE;c.height=TILE;const g=c.getContext('2d');g.lineCap='round';g.lineJoin='round';paint(g);return c;};
  const grassPal=[
    ['#2d723c','#23562f'],['#2f7740','#255d33'],['#367f47','#285f36'],
    ['#2b6939','#204b2b'],['#3c8750','#2b6439'],['#285e35','#1c4527'],
    ['#316f43','#245331']
  ];
  const grassSprites=grassPal.map((pal,variant)=>mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);
    grd.addColorStop(0,pal[0]);grd.addColorStop(1,pal[1]);
    g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='rgba(255,255,255,0.05)';g.fillRect(0,0,TILE,4);
    g.fillStyle='rgba(20,50,18,0.08)';g.fillRect(0,TILE-4,TILE,4);
    for(let i=0;i<6;i++){
      const x=3+__beautyPatchHash(variant,i,1)*(TILE-6), y=3+__beautyPatchHash(variant,i,2)*(TILE-6);
      g.fillStyle=`rgba(${i%2===0?'87,145,76':'55,118,48'},${0.08+__beautyPatchHash(variant,i,3)*0.08})`;
      g.beginPath();g.ellipse(x,y,2.4+__beautyPatchHash(variant,i,4)*2.2,1.2+__beautyPatchHash(variant,i,5)*1.2,__beautyPatchHash(variant,i,6)*Math.PI,0,Math.PI*2);g.fill();
    }
    for(let i=0;i<5;i++){
      const x=4+i*6+(__beautyPatchHash(variant,i,7)-0.5)*2;
      const y=7+((i*5+variant*3)%14);
      g.strokeStyle='rgba(210,255,210,0.05)';
      g.lineWidth=1;
      g.beginPath();g.moveTo(x,y+2);g.lineTo(x+0.8,y-1.4);g.stroke();
    }
  }));
  const waterSprites=[0,1].map(variant=>mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);
    grd.addColorStop(0,variant===0?'#215f92':'#28689c');
    grd.addColorStop(1,variant===0?'#143b64':'#18446d');
    g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='rgba(255,255,255,0.06)';g.fillRect(0,0,TILE,3);
    for(let i=0;i<4;i++){
      const yy=6+i*7+__beautyPatchHash(variant,i,9)*2;
      g.strokeStyle=`rgba(190,235,255,${0.08+__beautyPatchHash(variant,i,10)*0.05})`;
      g.lineWidth=1;
      g.beginPath();g.moveTo(4,yy);g.bezierCurveTo(TILE*0.28,yy-2,TILE*0.72,yy+2,TILE-4,yy);g.stroke();
    }
    g.strokeStyle='rgba(255,255,255,0.05)';g.beginPath();g.moveTo(5,5);g.lineTo(TILE-5,5);g.stroke();
  }));
  const mountainSprite=mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);
    grd.addColorStop(0,'#50515d');grd.addColorStop(1,'#272933');
    g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='#656776';g.beginPath();g.moveTo(4,24);g.lineTo(12,8);g.lineTo(18,17);g.lineTo(25,6);g.lineTo(28,24);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,0.13)';g.beginPath();g.moveTo(12,8);g.lineTo(16,14);g.lineTo(18,17);g.lineTo(25,6);g.lineTo(21,10);g.closePath();g.fill();
    g.fillStyle='rgba(0,0,0,0.14)';g.fillRect(0,24,TILE,8);
  });
  const stoneWallSprite=mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);
    grd.addColorStop(0,'#726e67');grd.addColorStop(1,'#4d4944');
    g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    for(let row=0;row<3;row++){
      const yy=4+row*9, off=row%2?4:0;
      for(let x=-off;x<TILE;x+=10){
        g.fillStyle=(row+(x/10|0))%2===0?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.10)';
        g.fillRect(x+1,yy,8,7);
      }
    }
    g.strokeStyle='rgba(255,255,255,0.12)';g.beginPath();g.moveTo(0,4);g.lineTo(TILE,4);g.stroke();
  });
  const resourceBaseSprite=mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);
    grd.addColorStop(0,'#2e6a27');grd.addColorStop(1,'#1d4718');
    g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='rgba(255,255,255,0.06)';g.fillRect(0,0,TILE,3);
    g.fillStyle='rgba(30,60,18,0.15)';g.beginPath();g.ellipse(16,24,10,4,0,0,Math.PI*2);g.fill();
    g.fillStyle='#d9c35c';g.beginPath();g.arc(16,14,5.4,0,Math.PI*2);g.fill();
    g.fillStyle='#fff2a8';g.beginPath();g.arc(14.5,12.6,1.8,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba(95,70,18,0.35)';g.lineWidth=1;g.beginPath();g.arc(16,14,5.4,0,Math.PI*2);g.stroke();
    for(let i=0;i<3;i++){g.fillStyle=`rgba(255,216,110,${0.11+i*0.03})`;g.beginPath();g.arc(9+i*7,19+i%2,1.2+i*0.2,0,Math.PI*2);g.fill();}
  });
  const forestKinds=['pine','oak','birch','spruce','dead'];
  const forestSprites=forestKinds.map((kind,variant)=>mkSprite(g=>{
    const pal=terrainTreePalette(kind), grd=g.createLinearGradient(0,0,0,TILE);
    grd.addColorStop(0,pal.ground);grd.addColorStop(1,'#162819');
    g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='rgba(0,0,0,0.12)';g.beginPath();g.ellipse(16,25,10,4,0,0,Math.PI*2);g.fill();
    if(kind==='dead'){
      g.strokeStyle=pal.trunk;g.lineWidth=2;g.beginPath();g.moveTo(16,22);g.lineTo(16,8);g.moveTo(16,12);g.lineTo(10,16);g.moveTo(16,10);g.lineTo(21,14);g.stroke();
    }else{
      g.fillStyle=pal.trunk;g.fillRect(14,17,4,9);
      for(let i=0;i<3;i++){
        const yy=15-i*4, rr=10-i*1.8;
        g.fillStyle=i===1?pal.leaf2:pal.leaf;
        g.beginPath();g.arc(16+(i===2?1:0),yy,rr,0,Math.PI*2);g.fill();
      }
      g.fillStyle='rgba(255,255,255,0.10)';g.beginPath();g.arc(12,10,4.5,0,Math.PI*2);g.fill();
    }
  }));
  const palmSprite=mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);grd.addColorStop(0,'#285932');grd.addColorStop(1,'#17311e');
    g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='#7e5e37';g.fillRect(15,12,3,12);
    g.strokeStyle='#66bf6d';g.lineWidth=2;
    for(const [dx,dy] of [[-10,-2],[-6,-6],[0,-8],[6,-6],[10,-1]]){g.beginPath();g.moveTo(16,12);g.quadraticCurveTo(16+dx*0.45,8,16+dx,12+dy);g.stroke();}
  });
  const cactusSprites=[0,1].map(variant=>mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);grd.addColorStop(0,'#54461f');grd.addColorStop(1,'#352b12');g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='rgba(0,0,0,0.10)';g.beginPath();g.ellipse(16,25,9,3,0,0,Math.PI*2);g.fill();
    g.fillStyle='#88c35a';g.fillRect(14,7,4,17);g.fillRect(9,11,4,8);g.fillRect(19,13,4,7);
    g.fillStyle='rgba(255,255,255,0.08)';g.fillRect(15,8,1,15);g.fillRect(10,12,1,6);g.fillRect(20,14,1,5);
  }));
  const boulderSprites=[0,1,2,3,4,5].map(variant=>mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);grd.addColorStop(0,'#615b57');grd.addColorStop(1,'#3c3936');g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='rgba(0,0,0,0.11)';g.beginPath();g.ellipse(16,25,11,4,0,0,Math.PI*2);g.fill();
    g.fillStyle='#7f7872';g.beginPath();g.moveTo(8,23);g.lineTo(6,15);g.lineTo(11,8);g.lineTo(22,9);g.lineTo(26,15);g.lineTo(24,23);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,0.13)';g.beginPath();g.moveTo(11,10);g.lineTo(18,11);g.lineTo(14,16);g.closePath();g.fill();
    for(let i=0;i<3;i++){g.strokeStyle=`rgba(255,255,255,${0.06+__beautyPatchHash(variant,i,21)*0.04})`;g.beginPath();g.moveTo(10+i*4,14+i);g.lineTo(14+i*3,12+i*2);g.stroke();}
  }));
  const isletSprites=[0,1].map(variant=>mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);grd.addColorStop(0,'#1f6291');grd.addColorStop(1,'#153b62');g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    g.fillStyle='rgba(255,255,255,0.08)';g.fillRect(0,0,TILE,3);
    g.fillStyle='#7b6e56';g.beginPath();g.ellipse(16,18,11,8,0,0,Math.PI*2);g.fill();
    g.fillStyle='#a0906e';g.beginPath();g.ellipse(15,16,8,5,0,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,255,255,0.16)';g.beginPath();g.arc(12,14,2.2,0,Math.PI*2);g.fill();
  }));
  const buildSprite=mkSprite(g=>{
    const grd=g.createLinearGradient(0,0,0,TILE);grd.addColorStop(0,'#5a4e2f');grd.addColorStop(1,'#382e18');g.fillStyle=grd;g.fillRect(0,0,TILE,TILE);
    for(let i=0;i<4;i++){
      const x=5+i*6;
      g.fillStyle='rgba(255,255,255,0.05)';g.fillRect(x,5,2,TILE-10);
      g.fillStyle='rgba(0,0,0,0.10)';g.fillRect(x+2,5,2,TILE-10);
    }
    g.fillStyle='rgba(210,194,150,0.10)';g.fillRect(3,3,TILE-6,TILE-6);
    g.strokeStyle='rgba(245,225,185,0.14)';g.lineWidth=1;g.beginPath();g.moveTo(4,8);g.lineTo(28,8);g.moveTo(6,16);g.lineTo(26,16);g.moveTo(8,24);g.lineTo(24,24);g.stroke();
  });
  _terrainSpriteCache={grass:grassSprites,water:waterSprites,mountain:mountainSprite,stone:stoneWallSprite,resourceBase:resourceBaseSprite,forest:forestSprites,palm:palmSprite,cactus:cactusSprites,boulder:boulderSprites,islet:isletSprites,build:buildSprite,__mode:mode};
  return _terrainSpriteCache;
};

drawResourceTileFast=function(sx,sy,tx,ty,sprites){
  if(!isBeautyGraphicsMode()) return __origDrawResourceTileFast(sx,sy,tx,ty,sprites);
  const key=`${tx},${ty}`, hp=resourceHp[key]||0, pct=hp/RESOURCE_HP;
  const grd=ctx.createLinearGradient(sx,sy,sx,sy+TILE);
  grd.addColorStop(0,'#2d6d28');grd.addColorStop(1,'#1b4317');
  ctx.fillStyle=grd;ctx.fillRect(sx,sy,TILE,TILE);
  ctx.drawImage(sprites.resourceBase,sx,sy);
  ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(sx,sy,TILE,2);
  ctx.strokeStyle='rgba(255,230,150,0.10)';ctx.beginPath();ctx.arc(sx+16,sy+13,7.5,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,0.24)';ctx.beginPath();ctx.ellipse(sx+16,sy+26,11,3.5,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<RESOURCE_HP;i++){
    ctx.fillStyle='rgba(5,8,12,0.90)';ctx.fillRect(sx+2+i*5,sy+TILE-6,4,4);
    ctx.fillStyle=i<hp?(i===RESOURCE_HP-1?'#fff0a6':'#d8ff5b'):'rgba(30,35,30,0.95)';
    ctx.fillRect(sx+2+i*5,sy+TILE-6,4,3);
  }
  if(pct<0.40){
    ctx.strokeStyle='rgba(255,120,80,0.18)';ctx.beginPath();ctx.moveTo(sx+7,sy+21);ctx.lineTo(sx+25,sy+10);ctx.stroke();
  }
};

drawMap=function(){
  if(getGraphicsMode()==='classic'){drawMapClassic();return;}
  const visuals=buildTerrainVisualCache();
  const sprites=buildTerrainSpriteCache();
  const beauty=isBeautyGraphicsMode();
  const startX=Math.floor(camera.x/TILE), startY=Math.floor(camera.y/TILE);
  const endX=Math.min(MAP_W,startX+Math.ceil(getViewportWorldWidth()/TILE)+1), endY=Math.min(MAP_H,startY+Math.ceil(getViewportWorldHeight()/TILE)+1);
  const waves=_drawMapWaveScratch;waves.length=0;
  for(let y=startY;y<endY;y++){
    for(let x=startX;x<endX;x++){
      const tileType=map[y][x], sx=x*TILE-camera.x, sy=y*TILE-camera.y;
      if(!isTileDiscoveredForFaction(x,y,'player')){ctx.fillStyle='#000';ctx.fillRect(sx,sy,TILE,TILE);continue;}
      const visual=visuals[_terrainIdx(x,y)];
      if(tileType===0) ctx.drawImage(sprites.grass[visual%sprites.grass.length],sx,sy);
      else if(tileType===1){ctx.drawImage(sprites.water[visual?1:0],sx,sy);waves.push(sx,sy,x,y,0,visual);}
      else if(tileType===2) ctx.drawImage(sprites.mountain,sx,sy);
      else if(tileType===3) drawResourceTileFast(sx,sy,x,y,sprites);
      else if(tileType===4) ctx.drawImage(sprites.build,sx,sy);
      else if(tileType===5) ctx.drawImage(sprites.forest[visual%sprites.forest.length],sx,sy);
      else if(tileType===6) ctx.drawImage(sprites.palm,sx,sy);
      else if(tileType===7) ctx.drawImage(sprites.cactus[visual?1:0],sx,sy);
      else if(tileType===8) ctx.drawImage(sprites.boulder[visual%sprites.boulder.length],sx,sy);
      else if(tileType===9) ctx.drawImage(sprites.stone,sx,sy);
      else if(tileType===10){ctx.drawImage(sprites.islet[visual?1:0],sx,sy);waves.push(sx,sy,x,y,1,visual);}
      if(beauty) drawBeautyTerrainBlendAdvanced(sx,sy,x,y,tileType,visual);
    }
  }
  if(beauty){
    const sun=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    sun.addColorStop(0,'rgba(255,241,210,0.048)');
    sun.addColorStop(0.55,'rgba(255,255,255,0.010)');
    sun.addColorStop(1,'rgba(8,14,22,0.072)');
    ctx.fillStyle=sun;ctx.fillRect(0,0,canvas.width,canvas.height);
    const haze=ctx.createLinearGradient(0,0,0,canvas.height);
    haze.addColorStop(0,'rgba(255,255,255,0.014)');
    haze.addColorStop(1,'rgba(0,0,0,0.040)');
    ctx.fillStyle=haze;ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  if(waves.length>0){
    const wt=tick*0.016;
    ctx.strokeStyle=beauty?'rgba(185,230,255,0.28)':'rgba(70,170,255,0.20)';
    ctx.lineWidth=1;ctx.beginPath();
    for(let i=0;i<waves.length;i+=6){
      const sx=waves[i],sy=waves[i+1],x=waves[i+2],y=waves[i+3],isIslet=waves[i+4],visual=waves[i+5];
      if(isIslet&&map[y]&&map[y][x]===10)continue;
      const phase=x*0.7+y*0.3+visual*0.8;
      const y1=sy+8+(wt*12+phase)%12, y2=sy+21+(wt*10+phase+6)%12;
      const amp1=1.8+Math.sin(wt*2.1+phase)*1.2, amp2=1.5+Math.sin(wt*1.7+phase+1)*1.0;
      ctx.moveTo(sx+3,y1+amp1);ctx.lineTo(sx+TILE-3,y1-amp1);
      ctx.moveTo(sx+3,y2-amp2);ctx.lineTo(sx+TILE-3,y2+amp2);
      if(beauty){
        const y3=sy+14+(wt*8+phase+2)%10;
        ctx.moveTo(sx+5,y3);ctx.lineTo(sx+TILE-5,y3+Math.sin(wt+phase)*1.2);
      }
    }
    ctx.stroke();
    if(beauty){
      ctx.strokeStyle='rgba(255,255,255,0.08)';
      ctx.beginPath();
      for(let i=0;i<waves.length;i+=6){
        const sx=waves[i],sy=waves[i+1],x=waves[i+2],y=waves[i+3],isIslet=waves[i+4];
        if(isIslet&&map[y]&&map[y][x]===10)continue;
        ctx.moveTo(sx+4,sy+5);ctx.lineTo(sx+TILE-5,sy+5);
      }
      ctx.stroke();
    }
  }
};
})();


(function(){
const __origDrawShip = drawShip;
const __origDrawBike = drawBike;
const __origDrawLeader = drawLeader;
const __origDrawVillager = drawVillager;
const __origDrawHelicopter = drawHelicopter;
const __origDrawBeautyStructureFinish = drawBeautyStructureFinish;

function __beautyEntityColor(faction, kind='unit'){
  const style = getBeautyFactionStyle(faction, kind);
  return style && style.main ? style.main : getFactionMainColor(faction);
}

function __beautyReloadPct(entity){
  const maxR = entity && (entity.maxReload || entity.reload || 0);
  if(!maxR || !entity || entity.reload == null) return null;
  return 1 - Math.min(1, entity.reload / Math.max(1, maxR));
}

function __beautyVehicleOverlay(sx, sy, faction, rx=10.5, ry=2.4, alpha=0.12){
  drawBeautyGroundDecal(sx, sy, rx, ry, getBeautyFactionStyle(faction).decalRgb, alpha);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(sx, sy+0.5, rx*0.86, ry*0.56, 0, 0, Math.PI*2);
  ctx.stroke();
}

 drawShip = function(s){
  if(isBeautyGraphicsMode()){
    const sx=s.x-camera.x, sy=s.y-camera.y;
    const col=__beautyEntityColor(s.faction), style=getBeautyFactionStyle(s.faction);
    const isPlayer=getVisualFactionId(s.faction)==='player';
    const hpPct=s.hp/Math.max(1,s.maxHp||1);
    let angle=0;
    if(s.attackTarget){const ec=entityCenter(s.attackTarget); angle=Math.atan2(ec.y-s.y,ec.x-s.x);}else if(Math.hypot(s.vx||0,s.vy||0)>0.1){angle=Math.atan2(s.vy,s.vx);}    
    const wakeBase=0.20+0.08*Math.sin(tick*0.12+s.x*0.009+s.y*0.007);
    ctx.strokeStyle=`rgba(${isPlayer?'165,232,255':'255,182,132'},${wakeBase.toFixed(3)})`;
    ctx.lineWidth=1.1;
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.ellipse(sx+Math.sin(angle)*(i*2),sy+8+i*4,12+i*2.7,3.4+i*0.75,0,0,Math.PI*2);
      ctx.stroke();
    }
    drawBeautyShadow(sx+2,sy+7,16.5,5.3,5,0.18);
    __beautyVehicleOverlay(sx+1,sy+11,s.faction,13.5,3.0,0.11);
    drawBeautySpriteAt(sx,sy+2,getBeautyUnitSprite('ship',s.faction),0.5,0.48);
    ctx.strokeStyle='rgba(255,255,255,0.08)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(sx-10,sy+5);ctx.lineTo(sx+10,sy+5);
    ctx.stroke();
    if(s.attackTarget||Math.hypot(s.vx||0,s.vy||0)>0.12){
      ctx.strokeStyle=col;
      ctx.lineWidth=2.2;
      ctx.beginPath();
      ctx.moveTo(sx+3,sy+1);
      ctx.lineTo(sx+3+Math.cos(angle)*13,sy+1+Math.sin(angle)*13);
      ctx.stroke();
    }
    drawBeautyMicroLight(sx+8,sy-4,1.25,style.glow);
    const reloadPct=__beautyReloadPct(s);
    if(reloadPct!=null)drawBeautyHpBar(sx-14,sy-24,28,reloadPct,'#9ed8ff');
    drawBeautyHpBar(sx-16,sy-18,32,hpPct,col);
    if(selection.includes(s))drawBeautySelectionRing(sx,sy,18.5);
    return;
  }
  return __origDrawShip(s);
 };

 drawBike = function(bk){
  if(isBeautyGraphicsMode()){
    const sx=bk.x-camera.x, sy=bk.y-camera.y;
    const col=__beautyEntityColor(bk.faction), hpPct=bk.hp/Math.max(1,bk.maxHp||1);
    drawBeautyShadow(sx+1,sy+6,10.5,3.4,3,0.22);
    __beautyVehicleOverlay(sx+1,sy+8,bk.faction,8.5,2.0,0.11);
    drawBeautySpriteAt(sx,sy+1,getBeautyUnitSprite('bike',bk.faction),0.5,0.31);
    ctx.strokeStyle='rgba(255,255,255,0.10)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(sx-7,sy+2);ctx.lineTo(sx+6,sy+2);
    ctx.stroke();
    drawBeautyMicroLight(sx+5,sy-4,1.1,getBeautyFactionStyle(bk.faction).glow);
    drawBeautyHpBar(sx-10,sy-16,20,hpPct,col);
    if(selection.includes(bk))drawBeautySelectionRing(sx,sy,13.5);
    return;
  }
  return __origDrawBike(bk);
 };

 drawLeader = function(l){
  if(isBeautyGraphicsMode()){
    const sx=l.x-camera.x, sy=l.y-camera.y;
    const col=__beautyEntityColor(l.faction), hpPct=l.hp/Math.max(1,l.maxHp||1);
    const pulse=(tick*0.05)%(Math.PI*2);
    ctx.strokeStyle=pickFactionRgba(l.faction,'255,220,90','255,165,85',(0.10+Math.sin(pulse)*0.05).toFixed(3));
    ctx.lineWidth=1;
    ctx.setLineDash([4,6]);
    ctx.beginPath();ctx.arc(sx,sy,LEADER_RALLY_RADIUS,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    drawBeautyShadow(sx,sy+4,8.4,3.0,4,0.20);
    drawBeautyGroundDecal(sx,sy+8,7.2,2.1,getBeautyFactionStyle(l.faction).decalRgb,0.11);
    drawBeautySpriteAt(sx,sy,getBeautyUnitSprite('leader',l.faction),0.5,0.30);
    drawBeautyMicroLight(sx,sy-10,1.2,'rgba(255,230,145,0.86)');
    ctx.fillStyle='rgba(255,248,210,0.85)';
    ctx.font='bold 10px sans-serif';
    ctx.textAlign='center';
    ctx.fillText('★',sx,sy-13);
    drawBeautyHpBar(sx-10,sy-18,20,hpPct,col);
    if(selection.includes(l))drawBeautySelectionRing(sx,sy,13.8,'rgba(255,232,180,0.95)');
    return;
  }
  return __origDrawLeader(l);
 };

 drawVillager = function(v){
  if(!v||v.hidden) return;
  if(isBeautyGraphicsMode()){
    const sx=v.x-camera.x, sy=v.y-camera.y;
    const col=__beautyEntityColor(v.faction), lifePct=Math.max(0,Math.min(1,(v.life||0)/Math.max(1,VILLAGER_LIFE||1)));
    drawBeautyShadow(sx,sy+4,6.7,2.6,3,0.16);
    drawBeautyGroundDecal(sx,sy+7,5.7,1.7,getBeautyFactionStyle(v.faction).decalRgb,0.08);
    drawBeautySpriteAt(sx,sy,getBeautyUnitSprite('villager',v.faction),0.5,0.26);
    drawBeautyMicroLight(sx+1,sy-5,0.95,'rgba(255,255,255,0.62)');
    drawBeautyHpBar(sx-8,sy-14,16,lifePct,col);
    if(selection.includes(v))drawBeautySelectionRing(sx,sy,11.5,col);
    return;
  }
  return __origDrawVillager(v);
 };

 drawHelicopter = function(h){
  if(isBeautyGraphicsMode()){
    const sx=h.x-camera.x, sy=h.y-camera.y;
    const col=__beautyEntityColor(h.faction), style=getBeautyFactionStyle(h.faction);
    const hpPct=h.hp/Math.max(1,h.maxHp||1);
    const rotor=(h.rotorPhase||tick)*1.05;
    const lift=getHelicopterVisualLift(h);
    const bx=sx, by=sy+lift;
    const shadowShift=Math.min(38,Math.round((h.alt||HELICOPTER_ALTITUDE)*0.20));
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath();ctx.ellipse(sx+6,sy+shadowShift,21,7.5,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.10)';
    ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(bx,by-2,13.5+Math.sin(rotor)*1.4,0,Math.PI*2);ctx.stroke();
    drawBeautyGroundDecal(sx+1,sy+shadowShift-1,9.5,2.3,style.decalRgb,0.08);
    drawBeautySpriteAt(bx,by,getBeautyUnitSprite('helicopter',h.faction),0.5,0.42);
    ctx.strokeStyle=pickFactionRgba(h.faction,'180,235,255','255,180,130',0.22);
    ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(bx-15,by-14);ctx.lineTo(bx+15,by-14);
    ctx.moveTo(bx+12,by-1);ctx.lineTo(bx+20,by-3);
    ctx.stroke();
    drawBeautyMicroLight(bx+16,by-3,1.2,style.glow);
    const reloadPct=__beautyReloadPct(h);
    if(reloadPct!=null)drawBeautyHpBar(bx-12,by-24,24,reloadPct,'#ffe08a');
    drawBeautyHpBar(bx-14,by-18,28,hpPct,col);
    if(selection.includes(h))drawBeautySelectionRing(bx,by,17.2);
    return;
  }
  return __origDrawHelicopter(h);
 };

 drawBeautyStructureFinish = function(kind,obj,sx,sy,w,h,opts={}){
  __origDrawBeautyStructureFinish(kind,obj,sx,sy,w,h,opts);
  const rgb = opts.decalRgb || getBeautyFactionStyle(obj.faction,'structure').decalRgb;
  ctx.strokeStyle='rgba(255,255,255,0.07)';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(sx+3,sy+3);ctx.lineTo(sx+w-3,sy+3);
  ctx.stroke();
  const edgeFade = ctx.createLinearGradient(sx,sy,sx,sy+h);
  edgeFade.addColorStop(0,'rgba(255,255,255,0.035)');
  edgeFade.addColorStop(0.4,'rgba(255,255,255,0.00)');
  edgeFade.addColorStop(1,'rgba(0,0,0,0.05)');
  ctx.fillStyle=edgeFade;
  ctx.fillRect(sx+1,sy+1,w-2,h-2);
  if((kind==='base'||kind==='silo'||kind==='radar'||kind==='harbor'||kind==='tower') && w>=TILE && h>=TILE){
    drawBeautyGroundDecal(sx+w*0.5,sy+h*0.93,w*0.38,h*0.08,rgb,0.055);
    drawBeautyMicroLight(sx+w*0.18,sy+h*0.24,0.9,'rgba(255,255,255,0.14)');
    drawBeautyMicroLight(sx+w*0.82,sy+h*0.24,0.9,'rgba(255,255,255,0.14)');
  }
 };
})();


