function getVirtualNukeState(silo){if(!silo||silo.hp<=0||!silo.nukeTarget||(!(silo.nukeTimer>0)&&!(silo.nukePendingDetonate>0))||silo.nukeDetonated||silo.nukeIntercepted)return null;const start={x:silo.x+TILE/2,y:silo.y+TILE/2};const target={x:silo.nukeTarget.x,y:silo.nukeTarget.y};const maxT=Math.max(1,silo.nukeMaxTimer||NUKE_COUNTDOWN);const progress=(silo.nukePendingDetonate>0)?1:(1-Math.max(0,Math.min(1,(silo.nukeTimer||0)/maxT)));const current={x:start.x+(target.x-start.x)*progress,y:start.y+(target.y-start.y)*progress};return{silo,start,target,current,progress,pending:Math.max(0,silo.nukePendingDetonate||0)};}
function getActiveEnemyNukesForPatriot(faction){const enemy=faction==='player'?ai:player;const out=[];for(const silo of (enemy.silos||[])){const n=getVirtualNukeState(silo);if(n)out.push(n);}return out;}
function pickPatriotRelevantNuke(p){const pc=entityCenter(p);const rr=PATRIOT_NUKE_PROTECT_RADIUS*PATRIOT_NUKE_PROTECT_RADIUS;let best=null,bestScore=Infinity;for(const n of getActiveEnemyNukesForPatriot(p.faction)){const dxT=n.target.x-pc.x,dyT=n.target.y-pc.y;const dxC=n.current.x-pc.x,dyC=n.current.y-pc.y;const targetIn=dxT*dxT+dyT*dyT<=rr;const currentIn=dxC*dxC+dyC*dyC<=rr;const corridorIn=pointSegDistSq(pc.x,pc.y,n.start.x,n.start.y,n.target.x,n.target.y)<=rr;const launchIn=((n.start.x-pc.x)*(n.start.x-pc.x)+(n.start.y-pc.y)*(n.start.y-pc.y))<=rr;if(!(targetIn||currentIn||corridorIn||launchIn))continue;const score=(targetIn?0:1e8)+Math.min(dxT*dxT+dyT*dyT,dxC*dxC+dyC*dyC)+(1-n.progress)*5000; if(score<bestScore){bestScore=score;best=n;}}return best;}
function clearSiloNukeState(silo,intercepted=false){if(!silo)return;silo.nukeTarget=null;silo.nukeTimer=0;silo.nukePendingDetonate=0;silo.nukeUsed=true;silo.nukeDetonated=false;silo.nukeIntercepted=!!intercepted;}
function findPatriotLastChanceInterceptor(silo){const target=silo&&silo.nukeTarget;if(!target)return null;const defenders=[...((player&&player.patriots)||[]),...((ai&&ai.patriots)||[])];let best=null,bestScore=Infinity;for(const p of defenders){if(!p||p.hp<=0||(p.nukeCooldown||0)>0)continue;const faction=getFactionId?getFactionId(p):p.faction;const enemy=faction==='player'?ai:player;if(!enemy||(enemy.silos||[]).indexOf(silo)<0)continue;const pc=entityCenter(p);const rr=PATRIOT_NUKE_PROTECT_RADIUS*PATRIOT_NUKE_PROTECT_RADIUS;const dx=target.x-pc.x,dy=target.y-pc.y;if(dx*dx+dy*dy>rr)continue;const score=dx*dx+dy*dy; if(score<bestScore){bestScore=score;best=p;}}return best;}function interceptEnemyNuke(silo,patriot,opts={}){const n=getVirtualNukeState(silo);if(!n)return false;clearSiloNukeState(silo,true);if(patriot){const from=entityCenter(patriot);spawnShotFx(patriot.faction,from.x,from.y,n.current.x,n.current.y,'rocket',patriot);try{AudioRTS.shot('rocket');}catch(_){}}if(patriot&&patriot.faction==='player')log('🛡 Patriot sestřelil atomovku!','player-log');if(MP.active&&!opts.fromNetwork&&silo.id)MP.sendCmd({action:'interceptNuke',siloId:silo.id});return true;}
function isWaterAt(wx,wy){let tx=Math.floor(wx/TILE),ty=Math.floor(wy/TILE);if(tx<0||tx>=MAP_W||ty<0||ty>=MAP_H)return false;let t=map[ty][tx];return t===1;}
function getRailsForFaction(faction){const fac=getFaction(faction);return fac&&(fac.rails||[])?fac.rails:[];}
const _railTileCache={player:null,ai:null};
function railTileIndex(tx,ty){return ty*MAP_W+tx;}
function railIndexToTile(idx){return{tx:idx%MAP_W,ty:(idx/MAP_W)|0};}
function getRailTileCache(faction){
  const cached=_railTileCache[faction];
  if(cached&&cached.ver===_buildingChangeCounter)return cached;
  const occ=new Uint8Array(MAP_W*MAP_H);
  const tiles=[];
  const rails=getRailsForFaction(faction);
  for(let i=0;i<rails.length;i++){
    const r=rails[i];
    if(!r||r.hp<=0)continue;
    const tx=Math.round(r.x/TILE),ty=Math.round(r.y/TILE);
    if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H)continue;
    const idx=railTileIndex(tx,ty);
    if(occ[idx])continue;
    occ[idx]=1;
    tiles.push(idx);
  }
  const cache={ver:_buildingChangeCounter,occ,tiles,components:null,work:null};
  _railTileCache[faction]=cache;
  return cache;
}
function getRailComponentInfo(faction){
  const cache=getRailTileCache(faction);
  if(cache.components&&cache.components.ver===cache.ver)return cache.components;
  const ids=new Int32Array(MAP_W*MAP_H);
  const occ=cache.occ;
  const queue=new Int32Array(Math.max(1,cache.tiles.length));
  let comp=0;
  for(let i=0;i<cache.tiles.length;i++){
    const start=cache.tiles[i];
    if(ids[start])continue;
    comp++;
    let head=0,tail=0;
    queue[tail++]=start;
    ids[start]=comp;
    while(head<tail){
      const cur=queue[head++];
      const tx=cur%MAP_W,ty=(cur/MAP_W)|0;
      if(tx>0){const ni=cur-1;if(occ[ni]&&!ids[ni]){ids[ni]=comp;queue[tail++]=ni;}}
      if(tx<MAP_W-1){const ni=cur+1;if(occ[ni]&&!ids[ni]){ids[ni]=comp;queue[tail++]=ni;}}
      if(ty>0){const ni=cur-MAP_W;if(occ[ni]&&!ids[ni]){ids[ni]=comp;queue[tail++]=ni;}}
      if(ty<MAP_H-1){const ni=cur+MAP_W;if(occ[ni]&&!ids[ni]){ids[ni]=comp;queue[tail++]=ni;}}
    }
  }
  cache.components={ver:cache.ver,ids,count:comp};
  return cache.components;
}
function getRailPathWorkingSet(faction){
  const cache=getRailTileCache(faction);
  if(cache.work&&cache.work.ver===cache.ver)return cache.work;
  cache.work={ver:cache.ver,visit:new Uint32Array(MAP_W*MAP_H),parent:new Int32Array(MAP_W*MAP_H),queue:new Int32Array(MAP_W*MAP_H),token:1};
  return cache.work;
}
function nextRailVisitToken(work){
  work.token=(work.token+1)>>>0;
  if(work.token===0){work.visit.fill(0);work.token=1;}
  return work.token;
}
function isRailTileForFaction(faction,tx,ty){
  if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H)return false;
  return !!getRailTileCache(faction).occ[railTileIndex(tx,ty)];
}
function isRailWorldForFaction(faction,x,y){return isRailTileForFaction(faction,Math.floor(x/TILE),Math.floor(y/TILE));}
function hasFriendlyCraneAura(faction,x,y,ignoreSite=null){const fac=getFaction(faction);if(!fac||!(fac.cranes||[]).length)return false;const rr=CRANE_BUILD_RADIUS*CRANE_BUILD_RADIUS;for(const crane of fac.cranes||[]){if(!crane||crane.hp<=0||crane===ignoreSite)continue;const cx=crane.x+TILE/2,cy=crane.y+TILE/2;const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy<=rr)return true;}return false;}
function updateCrane(crane){if(!crane||crane.hp<=0||!crane.target)return;const tx=Math.floor(crane.target.x/TILE),ty=Math.floor(crane.target.y/TILE);if(!isRailTileForFaction(crane.faction,tx,ty)){crane.target=null;return;}const cx=crane.x+TILE/2,cy=crane.y+TILE/2;const dx=crane.target.x-cx,dy=crane.target.y-cy;const d=Math.hypot(dx,dy);if(d<=CRANE_MOVE_SPEED){crane.x=tx*TILE;crane.y=ty*TILE;crane.target=null;return;}crane.x+=dx/d*CRANE_MOVE_SPEED;crane.y+=dy/d*CRANE_MOVE_SPEED;}function getStructureTile(obj){return{x:Math.round(obj.x/TILE),y:Math.round(obj.y/TILE)};}function getAdjacentRailTilesForBase(base,faction){if(!base||base.hp<=0)return[];const out=[];const btx=Math.round(base.x/TILE),bty=Math.round(base.y/TILE);const seen=new Set();for(let y=bty-1;y<=bty+2;y++){for(let x=btx-1;x<=btx+2;x++){const onPerimeter=(x===btx-1||x===btx+2||y===bty-1||y===bty+2);const besideBody=(x>=btx&&x<=btx+1&&y>=bty&&y<=bty+1);if(!onPerimeter||besideBody)continue;if(isRailTileForFaction(faction,x,y)){const key=x+','+y;if(!seen.has(key)){seen.add(key);out.push({tx:x,ty:y});}}}}return out;}function getAdjacentRailTilesForStation(station,faction){if(!station||station.hp<=0)return[];const stx=Math.round(station.x/TILE),sty=Math.round(station.y/TILE);const out=[];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=stx+dx,y=sty+dy;if(isRailTileForFaction(faction,x,y))out.push({tx:x,ty:y});}return out;}function railTileToWorld(t){return{x:t.tx*TILE+TILE/2,y:t.ty*TILE+TILE/2};}
function bfsRailPathTiles(faction,start,end){
  if(!start||!end)return null;
  const cache=getRailTileCache(faction),occ=cache.occ;
  const startIdx=railTileIndex(start.tx,start.ty),endIdx=railTileIndex(end.tx,end.ty);
  if(!occ[startIdx]||!occ[endIdx])return null;
  const comp=getRailComponentInfo(faction).ids;
  if(!comp[startIdx]||comp[startIdx]!==comp[endIdx])return null;
  const work=getRailPathWorkingSet(faction);
  const token=nextRailVisitToken(work);
  const visit=work.visit,parent=work.parent,queue=work.queue;
  let head=0,tail=0,explored=0;
  const hardCap=Math.max(16,Math.min(MAP_W*MAP_H,cache.tiles.length+4));
  queue[tail++]=startIdx;
  visit[startIdx]=token;
  parent[startIdx]=-1;
  while(head<tail&&explored<hardCap){
    const cur=queue[head++];
    explored++;
    if(cur===endIdx)break;
    const tx=cur%MAP_W,ty=(cur/MAP_W)|0;
    if(tx>0){const ni=cur-1;if(occ[ni]&&visit[ni]!==token){visit[ni]=token;parent[ni]=cur;queue[tail++]=ni;}}
    if(tx<MAP_W-1){const ni=cur+1;if(occ[ni]&&visit[ni]!==token){visit[ni]=token;parent[ni]=cur;queue[tail++]=ni;}}
    if(ty>0){const ni=cur-MAP_W;if(occ[ni]&&visit[ni]!==token){visit[ni]=token;parent[ni]=cur;queue[tail++]=ni;}}
    if(ty<MAP_H-1){const ni=cur+MAP_W;if(occ[ni]&&visit[ni]!==token){visit[ni]=token;parent[ni]=cur;queue[tail++]=ni;}}
  }
  if(visit[endIdx]!==token)return null;
  const path=[];
  let idx=endIdx;
  while(idx!==-1){path.push(railIndexToTile(idx));idx=parent[idx];}
  path.reverse();
  return path;
}
function findContinuousRailRouteForStation(station){
  if(!station||station.hp<=0)return null;
  const fac=getFaction(station.faction);
  if(!fac||(fac.bases||[]).length===0)return null;
  const cache=getRailTileCache(station.faction);
  if(station._routeCache&&station._routeCache.ver===_buildingChangeCounter&&station._routeCache.baseCount===fac.bases.length&&station._routeCache.railVer===cache.ver)return station._routeCache.route;
  const starts=getAdjacentRailTilesForStation(station,station.faction);
  if(!starts.length){station._routeCache={ver:_buildingChangeCounter,baseCount:fac.bases.length,railVer:cache.ver,route:null};return null;}
  const endBaseByIdx=new Map();
  for(const base of fac.bases||[]){
    if(!base||base.hp<=0)continue;
    const ends=getAdjacentRailTilesForBase(base,station.faction);
    for(const e of ends){
      const idx=railTileIndex(e.tx,e.ty);
      if(cache.occ[idx]&&!endBaseByIdx.has(idx))endBaseByIdx.set(idx,base);
    }
  }
  if(!endBaseByIdx.size){station._routeCache={ver:_buildingChangeCounter,baseCount:fac.bases.length,railVer:cache.ver,route:null};return null;}
  const compInfo=getRailComponentInfo(station.faction).ids;
  const startIdxs=[];
  const startSeen=new Set();
  for(const s of starts){
    const idx=railTileIndex(s.tx,s.ty);
    if(!cache.occ[idx]||startSeen.has(idx))continue;
    startSeen.add(idx);
    startIdxs.push(idx);
  }
  if(!startIdxs.length){station._routeCache={ver:_buildingChangeCounter,baseCount:fac.bases.length,railVer:cache.ver,route:null};return null;}
  let reachableEnd=false;
  outerReach: for(const sidx of startIdxs){
    const cid=compInfo[sidx];
    if(!cid)continue;
    for(const eidx of endBaseByIdx.keys()){
      if(compInfo[eidx]===cid){reachableEnd=true;break outerReach;}
    }
  }
  if(!reachableEnd){station._routeCache={ver:_buildingChangeCounter,baseCount:fac.bases.length,railVer:cache.ver,route:null};return null;}
  const work=getRailPathWorkingSet(station.faction);
  const token=nextRailVisitToken(work);
  const visit=work.visit,parent=work.parent,queue=work.queue,occ=cache.occ;
  let head=0,tail=0,explored=0,bestEndIdx=-1;
  const hardCap=Math.max(16,Math.min(MAP_W*MAP_H,cache.tiles.length+startIdxs.length+8));
  for(const idx of startIdxs){visit[idx]=token;parent[idx]=-1;queue[tail++]=idx;if(endBaseByIdx.has(idx)){bestEndIdx=idx;break;}}
  while(bestEndIdx===-1&&head<tail&&explored<hardCap){
    const cur=queue[head++];
    explored++;
    if(endBaseByIdx.has(cur)){bestEndIdx=cur;break;}
    const tx=cur%MAP_W,ty=(cur/MAP_W)|0;
    if(tx>0){const ni=cur-1;if(occ[ni]&&visit[ni]!==token){visit[ni]=token;parent[ni]=cur;queue[tail++]=ni;}}
    if(tx<MAP_W-1){const ni=cur+1;if(occ[ni]&&visit[ni]!==token){visit[ni]=token;parent[ni]=cur;queue[tail++]=ni;}}
    if(ty>0){const ni=cur-MAP_W;if(occ[ni]&&visit[ni]!==token){visit[ni]=token;parent[ni]=cur;queue[tail++]=ni;}}
    if(ty<MAP_H-1){const ni=cur+MAP_W;if(occ[ni]&&visit[ni]!==token){visit[ni]=token;parent[ni]=cur;queue[tail++]=ni;}}
  }
  let route=null;
  if(bestEndIdx!==-1){
    const path=[];
    let idx=bestEndIdx;
    while(idx!==-1){path.push(railIndexToTile(idx));idx=parent[idx];}
    path.reverse();
    route={base:endBaseByIdx.get(bestEndIdx)||null,tiles:path,points:path.map(railTileToWorld)};
  }
  station._routeCache={ver:_buildingChangeCounter,baseCount:fac.bases.length,railVer:cache.ver,route};
  return route;
}
function hasContinuousRailConnectionToFriendlyBase(faction,tx,ty){const fake={faction,x:tx*TILE,y:ty*TILE,hp:1};return !!findContinuousRailRouteForStation(fake);}function ensureStationShuttle(station,route){if(!station.shuttle)station.shuttle={x:0,y:0,active:false,routeDir:'toBase',routeIndex:0,segT:0,cargo:0,state:'idle',wait:0,passengers:[],transportMode:null,pausedState:null,passengerCapacity:TRAIN_PASSENGER_CAPACITY};const sh=station.shuttle;const start=(route&&route.points&&route.points[0])?route.points[0]:{x:station.x+TILE/2,y:station.y+TILE/2};if(!Array.isArray(sh.passengers))sh.passengers=[];if(!Number.isFinite(sh.x)||!Number.isFinite(sh.y)||(sh.state==='idle'&&!sh.active)){sh.x=start.x;sh.y=start.y;}return sh;}function advanceShuttleAlongPoints(sh,points){if(!points||points.length===0)return true;if(points.length===1){sh.x=points[0].x;sh.y=points[0].y;return true;}let remaining=TRAIN_MOVE_SPEED;while(remaining>0&&sh.routeIndex<points.length-1){const a=points[sh.routeIndex],b=points[sh.routeIndex+1];const segLen=Math.max(0.0001,Math.hypot(b.x-a.x,b.y-a.y));const used=Math.max(0,Math.min(1,sh.segT||0));const left=(1-used)*segLen;let prevX=Number.isFinite(sh.x)?sh.x:a.x;let prevY=Number.isFinite(sh.y)?sh.y:a.y;if(remaining>=left){sh.routeIndex++;sh.segT=0;sh.x=b.x;sh.y=b.y;remaining-=left;}else{sh.segT=used+remaining/segLen;sh.x=a.x+(b.x-a.x)*sh.segT;sh.y=a.y+(b.y-a.y)*sh.segT;remaining=0;}const mdx=sh.x-prevX,mdy=sh.y-prevY;if(Math.abs(mdx)+Math.abs(mdy)>0.001){const adx=Math.abs(mdx),ady=Math.abs(mdy);if(adx>=ady)sh.heading={x:mdx>=0?1:-1,y:0};else sh.heading={x:0,y:mdy>=0?1:-1};}}return sh.routeIndex>=points.length-1;}function startStationTrip(station,route){const sh=ensureStationShuttle(station,route);sh.active=true;sh.routeDir='toBase';sh.routeIndex=0;sh.segT=0;sh.state='toBase';sh.wait=0;sh.cargo=Math.min(TRAIN_CARGO_CAPACITY,Math.max(0,station.cargoWaiting||0));station.cargoWaiting=Math.max(0,(station.cargoWaiting||0)-sh.cargo);const p=route.points[0]||{x:station.x+TILE/2,y:station.y+TILE/2};sh.x=p.x;sh.y=p.y;}function updateTrain(train){if(!train||train.hp<=0)return;train.cargoWaiting=Math.max(0,train.cargoWaiting||0);const route=findContinuousRailRouteForStation(train);const sh=ensureStationShuttle(train,route);if(!route||!route.points||route.points.length===0){if((sh.cargo||0)>0)train.cargoWaiting=(train.cargoWaiting||0)+sh.cargo;train.routeStatus='offline';if(sh.passengers&&sh.passengers.length){sh.pausedState=sh.state;sh.state='paused';sh.active=false;return;}sh.active=false;sh.state='idle';sh.cargo=0;sh.wait=0;return;}if(sh.state==='paused'){sh.state=sh.pausedState||'idle';sh.pausedState=null;}const revPoints=route.points.slice().reverse();const wantsStation=stationHasTransportDemand(train,false);const wantsBase=stationHasTransportDemand(train,true);const hasPassengers=!!(sh.passengers&&sh.passengers.length);if(sh.state==='idle'){train.routeStatus=(hasPassengers||wantsStation||wantsBase)?'boarding':(train.cargoWaiting>0?'waiting':'ready');const p=route.points[0];sh.x=p.x;sh.y=p.y;sh.active=true;sh.routeDir='toBase';sh.routeIndex=0;sh.segT=0;if(wantsStation){pickupUnitsForStation(train,false);sh.state='toBase';sh.transportMode='fromStation';}else if(wantsBase){sh.state='toBase';sh.transportMode='pickupBase';}else if(train.cargoWaiting>0)startStationTrip(train,route);}else if(sh.state==='toBase'){train.routeStatus='toBase';if(advanceShuttleAlongPoints(sh,route.points)){sh.state='unloading';sh.wait=TRAIN_DWELL_TICKS;const fac=getFaction(train.faction);fac.resources+=(train.faction==='ai'&&!MP.active?Math.round(sh.cargo*currentAICfg().workerDepositMult):sh.cargo);train.cargoDelivered=(train.cargoDelivered||0)+sh.cargo;sh.cargo=0;unloadTrainPassengersAtBase(train);if(sh.transportMode==='pickupBase')pickupUnitsForStation(train,true);}}else if(sh.state==='unloading'){train.routeStatus='unloading';if(sh.wait>0)sh.wait--;else{sh.state='toStation';sh.routeDir='toStation';sh.routeIndex=0;sh.segT=0;if(sh.transportMode==='pickupBase'&&sh.passengers&&sh.passengers.length)sh.transportMode='toStation';else if(!sh.passengers.length)sh.transportMode=null;}}else if(sh.state==='toStation'){train.routeStatus='toStation';if(advanceShuttleAlongPoints(sh,revPoints)){unloadTrainPassengersAtStation(train);sh.state='idle';sh.routeDir='toBase';sh.routeIndex=0;sh.segT=0;sh.transportMode=null;const p=route.points[0];sh.x=p.x;sh.y=p.y;}}}
const RAIL_TRANSPORT_BOARD_RADIUS=24;const RAIL_TRANSPORT_PICKUP_RADIUS=34;const TRAIN_PASSENGER_CAPACITY=5;const RAIL_TRANSPORT_WAIT_PULSE=36;const RAIL_TRANSPORT_REVEAL_TICKS=20;let railTransportOrder=null;
function isEntityTransportHidden(ent){return !!(ent&&ent.transportHidden);}
function getRailTransportUnitArrays(faction){const fac=getFaction(faction);if(!fac)return[];return[fac.units||[],fac.workers||[],fac.tanks||[],fac.launchers||[],fac.patriots||[],fac.supplies||[],fac.drones||[],fac.helicopters||[],fac.bikes||[],fac.leaders||[],fac.villagers||[]];}
function getRailTransportUnits(faction){return getRailTransportUnitArrays(faction).flat().filter(Boolean);}
function getTrainPassengerCount(station){const sh=station&&station.shuttle;return sh&&Array.isArray(sh.passengers)?sh.passengers.filter(Boolean).length:0;}
function getTrainPassengerCapacity(){return TRAIN_PASSENGER_CAPACITY;}
function updateRailTransportFx(unit,mode,maxTicks=RAIL_TRANSPORT_REVEAL_TICKS){if(!unit)return;unit.railTransportFx={mode,ticks:maxTicks,maxTicks};}
function tickRailTransportFx(unit){if(!unit||!unit.railTransportFx)return;unit.railTransportFx.ticks=Math.max(0,(unit.railTransportFx.ticks||0)-1);if(unit.railTransportFx.ticks<=0)unit.railTransportFx=null;}
function isRailTransportWaitingPhase(unit){const rt=unit&&unit.railTransport;return !!(rt&&(rt.phase==='waitingOrigin'||rt.phase==='transferBase'));}
function isRailTransportRevealActive(unit){return !!(unit&&unit.railTransportFx&&unit.railTransportFx.mode==='reveal'&&unit.railTransportFx.ticks>0);}
function isRailTransportBoardingActive(unit){return !!(unit&&unit.railTransportFx&&unit.railTransportFx.mode==='boarding'&&unit.railTransportFx.ticks>0);}
function isRailTransportUnitVisibleForOverlay(unit){if(!unit||unit.hp<=0||unit.hidden||unit.transportHidden)return false;if(unit.faction==='player')return true;return isEntityVisibleAtNight(unit,'player')&&isEntityVisibleByDiscovery(unit,'player');}
function isRailTransportTrainVisibleForOverlay(st){if(!st||st.hp<=0)return false;if(st.faction==='player')return true;return isEnemyStructureDiscovered(st,'player')&&isEntityVisibleByDiscovery(st,'player');}
function isRailTransportEligibleUnit(ent){return !!(ent&&ent.faction==='player'&&ent.hp>0&&!ent.hidden&&!ent.transportHidden&&['unit','tank','launcher','patriot','supply','drone','helicopter','leader','bike','villager'].includes(ent.type));}
function getRailTransportSelection(){return selection.filter(isRailTransportEligibleUnit);}
function getRailTransportEndpointAt(wx,wy){const hit=hitTestPlayerEntity(wx,wy);return(hit&&hit.faction==='player'&&(hit.type==='base'||hit.type==='train'))?hit:null;}
function getRailEndpointPoint(ent,fromX,fromY){if(!ent)return{x:fromX||0,y:fromY||0};return ent.type==='base'?getBaseDepositPoint(ent,fromX??(ent.x+TILE),fromY??(ent.y+TILE)):getStationDepositPoint(ent,fromX??(ent.x+TILE/2),fromY??(ent.y+TILE/2));}
function getRailTransportUnitRadius(unit){return(unit&&(unit.type==='tank'||unit.type==='patriot'||unit.type==='supply'||unit.type==='launcher'))?UNIT_RADIUS+8:UNIT_RADIUS+4;}
function isStationTransportSpawnClear(station,faction,x,y,radius=UNIT_RADIUS+4){
  if(!isGroundSpawnPointClear(faction,x,y,radius))return false;
  const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
  if(isRailTileForFaction(faction,tx,ty))return false;
  if(x>station.x-radius&&x<station.x+TILE+radius&&y>station.y-radius&&y<station.y+TILE+radius)return false;
  for(const fac of [player,ai]){
    for(const st of (fac.trains||[])){
      if(!st||st.hp<=0||st===station)continue;
      if(x>st.x-radius&&x<st.x+TILE+radius&&y>st.y-radius&&y<st.y+TILE+radius)return false;
    }
  }
  return true;
}function findGroundSpawnNearStation(station,faction,fromX,fromY,radius=UNIT_RADIUS+4){
  const cx=station.x+TILE/2,cy=station.y+TILE/2;
  let dx=(Number.isFinite(fromX)&&fromX>-2048&&fromX<MAP_W*TILE+2048)?fromX-cx:0;
  let dy=(Number.isFinite(fromY)&&fromY>-2048&&fromY<MAP_H*TILE+2048)?fromY-cy:0;
  if(Math.abs(dx)+Math.abs(dy)<1){
    const route=findContinuousRailRouteForStation(station);
    const ref=route&&route.points&&route.points[0]?route.points[0]:null;
    if(ref){dx=cx-ref.x;dy=cy-ref.y;}
  }
  if(Math.abs(dx)+Math.abs(dy)<1)dx=1;
  const baseAng=Math.atan2(dy,dx);
  const angleOffsets=[0,0.3,-0.3,0.62,-0.62,0.96,-0.96,1.28,-1.28,Math.PI];
  const ringR=[TILE*1.15,TILE*1.45,TILE*1.85,TILE*2.3,TILE*2.8,TILE*3.35];
  let best=null,bestScore=-Infinity;
  for(let rr of ringR){
    for(let ao of angleOffsets){
      const ang=baseAng+ao;
      const x=cx+Math.cos(ang)*rr;
      const y=cy+Math.sin(ang)*rr;
      if(!isStationTransportSpawnClear(station,faction,x,y,radius))continue;
      const exitDist=Math.max(rr+TILE*1.35,TILE*2.85);
      const exitTarget={x:cx+Math.cos(ang)*exitDist,y:cy+Math.sin(ang)*exitDist};
      const edgeDist=Math.min(x,y,MAP_W*TILE-x,MAP_H*TILE-y);
      const railPenalty=isRailTileForFaction(faction,Math.floor(exitTarget.x/TILE),Math.floor(exitTarget.y/TILE))?80:0;
      const score=edgeDist*0.25-Math.abs(ao)*28-rr*0.04-railPenalty;
      if(score>bestScore){bestScore=score;best={x,y,exitTarget};}
    }
  }
  if(best)return best;
  const fallbackAng=baseAng;
  const fallbackR=TILE*2.4;
  const fx=cx+Math.cos(fallbackAng)*fallbackR;
  const fy=cy+Math.sin(fallbackAng)*fallbackR;
  return{x:fx,y:fy,exitTarget:{x:fx+Math.cos(fallbackAng)*TILE*1.4,y:fy+Math.sin(fallbackAng)*TILE*1.4}};
}function getRailBoardPointForUnit(endpoint,unit,fromX,fromY){
  if(!endpoint)return{x:fromX||0,y:fromY||0,exitTarget:null};
  const fac=endpoint.faction||unit?.faction||'player';
  const rad=getRailTransportUnitRadius(unit);
  if(endpoint.type==='base'){
    const spawn=findGroundSpawnNearBase(endpoint,fac,rad);
    if(spawn&&Number.isFinite(spawn.x)&&Number.isFinite(spawn.y))return{x:spawn.x,y:spawn.y,exitTarget:spawn.exitTarget||null};
  }else if(endpoint.type==='train'){
    const spawn=findGroundSpawnNearStation(endpoint,fac,fromX,fromY,rad);
    if(spawn&&Number.isFinite(spawn.x)&&Number.isFinite(spawn.y))return{x:spawn.x,y:spawn.y,exitTarget:spawn.exitTarget||null};
  }
  const p=getRailEndpointPoint(endpoint,fromX,fromY);
  return{x:p.x,y:p.y,exitTarget:null};
}
function getRailEndpointLabel(ent){return ent?(ent.type==='base'?'základna':'nádraží'):'bod';}
function getRailTransportHoverEndpoint(){if(mode!=='rail-transport'||!mouseOverCanvas)return null;const wx=mouseScreenX+camera.x,wy=mouseScreenY+camera.y;return getRailTransportEndpointAt(wx,wy);}
function updateRailTransportCursor(){if(typeof canvas==='undefined'||!canvas)return;let cur='crosshair';const mineAimActive=mode==='mine-place'&&mouseOverCanvas;if(mode==='rail-transport'){const hover=getRailTransportHoverEndpoint();if(hover)cur=railTransportOrder&&railTransportOrder.origin!==hover?'copy':'pointer';else cur='crosshair';}else if(mineAimActive){cur='cell';}canvas.style.cursor=cur;}
function drawRailTransportEndpointMarker(ent,role,hovered,valid){if(!ent||ent.hp<=0)return;const cx=ent.x+((ent.type==='base')?TILE:TILE/2)-camera.x,cy=ent.y+((ent.type==='base')?TILE:TILE/2)-camera.y;const rad=ent.type==='base'?34:24;const main=role==='start'?'#00ffd0':(valid===false?'#ff4d4d':'#ffd54a');const soft=role==='start'?'rgba(0,255,208,0.14)':(valid===false?'rgba(255,77,77,0.14)':'rgba(255,213,74,0.14)');ctx.save();ctx.fillStyle=soft;ctx.beginPath();ctx.arc(cx,cy,rad+(hovered?8:0),0,Math.PI*2);ctx.fill();ctx.strokeStyle=main;ctx.lineWidth=hovered?3:2;ctx.setLineDash(role==='start'?[8,5]:[]);ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(cx-rad-8,cy);ctx.lineTo(cx+rad+8,cy);ctx.moveTo(cx,cy-rad-8);ctx.lineTo(cx,cy+rad+8);ctx.stroke();ctx.fillStyle='rgba(6,10,16,0.92)';const label=role==='start'?'START':(valid===false?'NEPLATNÝ CÍL':'CÍL');ctx.font='bold 11px monospace';const tw=Math.ceil(ctx.measureText(label).width)+12;ctx.fillRect(Math.round(cx-tw/2),Math.round(cy-rad-24),tw,16);ctx.fillStyle=main;ctx.fillText(label,Math.round(cx-tw/2+6),Math.round(cy-rad-12));ctx.restore();}
function drawRailTransportCommandOverlay(){if(mode!=='rail-transport'||!railTransportOrder||!railTransportOrder.origin||!mouseOverCanvas)return;const origin=railTransportOrder.origin;const hover=getRailTransportHoverEndpoint();let plan=null,validHover=false;if(hover&&hover!==origin){plan=buildRailTransportPlan(origin,hover);validHover=!plan.error;}drawRailTransportEndpointMarker(origin,'start',hover===origin,true);if(hover&&hover!==origin)drawRailTransportEndpointMarker(hover,'end',true,validHover);const wx=mouseScreenX+camera.x,wy=mouseScreenY+camera.y,sx=wx-camera.x,sy=wy-camera.y;ctx.save();ctx.strokeStyle=hover?(validHover?'rgba(255,213,74,0.95)':'rgba(255,77,77,0.95)'):'rgba(255,255,255,0.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,14,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(sx-20,sy);ctx.lineTo(sx+20,sy);ctx.moveTo(sx,sy-20);ctx.lineTo(sx,sy+20);ctx.stroke();if(hover&&hover!==origin){const ox=origin.x+((origin.type==='base')?TILE:TILE/2)-camera.x,oy=origin.y+((origin.type==='base')?TILE:TILE/2)-camera.y;const hx=hover.x+((hover.type==='base')?TILE:TILE/2)-camera.x,hy=hover.y+((hover.type==='base')?TILE:TILE/2)-camera.y;ctx.setLineDash([10,7]);ctx.strokeStyle=validHover?'rgba(255,213,74,0.72)':'rgba(255,77,77,0.72)';ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(hx,hy);ctx.stroke();ctx.setLineDash([]);}ctx.font='bold 11px monospace';const msg=hover?(hover===origin?'Vyber jiný výstupní bod.':(validHover?`CÍL: ${getRailEndpointLabel(hover).toUpperCase()}`:(plan&&plan.error?plan.error:'Neplatný cíl.'))):'PRAVÝ KLIK = VÝSTUPNÍ BOD';const sub='ESC = zrušit přepravu';const panelX=Math.round(sx+18),panelY=Math.round(sy-46);const w=Math.max(210,Math.ceil(ctx.measureText(msg).width)+18);ctx.fillStyle='rgba(6,10,16,0.90)';ctx.fillRect(panelX,panelY,w,34);ctx.strokeStyle=hover?(validHover?'rgba(255,213,74,0.85)':'rgba(255,77,77,0.85)'):'rgba(0,255,208,0.85)';ctx.strokeRect(panelX+0.5,panelY+0.5,w-1,33);ctx.fillStyle=hover?(validHover?'#ffd54a':'#ff6666'):'#00ffd0';ctx.fillText(msg,panelX+8,panelY+13);ctx.font='10px monospace';ctx.fillStyle='#cfe7f4';ctx.fillText(sub,panelX+8,panelY+26);ctx.restore();}
function drawMinePlacementOverlay(){if(mode!=='mine-place'||!mouseOverCanvas)return;const soldiers=(selection||[]).filter(s=>s&&s.type==='unit'&&s.faction==='player'&&s.hp>0);if(!soldiers.length)return;const ready=soldiers.some(s=>!s.pendingMinePlacement&&(s.mineCooldown||0)<=0);const canPlace=ready&&player.resources>=MINE_COST;const wx=mouseScreenX+camera.x,wy=mouseScreenY+camera.y,sx=wx-camera.x,sy=wy-camera.y;ctx.save();ctx.strokeStyle=canPlace?'rgba(255,220,0,0.95)':'rgba(255,90,90,0.95)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,11,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(sx-18,sy);ctx.lineTo(sx+18,sy);ctx.moveTo(sx,sy-18);ctx.lineTo(sx,sy+18);ctx.stroke();ctx.setLineDash([6,5]);ctx.strokeStyle=canPlace?'rgba(255,220,0,0.55)':'rgba(255,90,90,0.55)';ctx.beginPath();ctx.arc(sx,sy,MINE_KILL_RADIUS,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 11px monospace';const msg=canPlace?('MINA ('+MINE_COST+') - 30 s pokladani'):(player.resources<MINE_COST?('MINA: chybi '+MINE_COST):'MINA: vojak je zaneprazdnen');const sub='Vojak dojde, 30 s poklada minu. M nebo Esc = zrusit';const panelX=Math.round(sx+16),panelY=Math.round(sy-44);const w=Math.max(220,Math.ceil(ctx.measureText(msg).width)+16);ctx.fillStyle='rgba(6,10,16,0.90)';ctx.fillRect(panelX,panelY,w,32);ctx.strokeStyle=canPlace?'rgba(255,220,0,0.8)':'rgba(255,90,90,0.8)';ctx.strokeRect(panelX+0.5,panelY+0.5,w-1,31);ctx.fillStyle=canPlace?'#ffdf66':'#ff8a8a';ctx.fillText(msg,panelX+8,panelY+12);ctx.font='10px monospace';ctx.fillStyle='#cfe7f4';ctx.fillText(sub,panelX+8,panelY+24);ctx.restore();}
function safeClearUnitOrders(unit){if(!unit)return;unit.attackTarget=null;unit.pendingAttack=null;unit.target=null;if(unit.type==='worker'){unit.state='idle';unit.buildSite=null;unit.repairTarget=null;unit.mineTarget=null;}try{clearUnitPath(unit);}catch(_){}}
function abortRailTransportUnit(unit,endpoint){if(!unit)return;const drop=endpoint||((unit.railTransport&&unit.railTransport.origin)||null);const p=getRailBoardPointForUnit(drop,unit,unit.x,unit.y);unit.transportHidden=false;unit.vx=0;unit.vy=0;unit.x=Math.max(8,Math.min(MAP_W*TILE-8,p.x));unit.y=Math.max(8,Math.min(MAP_H*TILE-8,p.y));safeClearUnitOrders(unit);unit.railTransport=null;}
function cancelRailTransportOrder(silent){railTransportOrder=null;if(mode==='rail-transport'){mode='select';setModeDisplay('Výběr');}updateRailTransportCursor();if(!silent)log('🚉 Příkaz přepravy zrušen.','player-log');}
function buildRailTransportPlan(origin,destination){if(!origin||!destination)return{error:'Vyber nástupní i výstupní bod.'};if(origin===destination)return{error:'Nástupní a výstupní bod musí být odlišné.'};if(origin.type==='base'&&destination.type==='base')return{error:'Base → Base zatím není implementováno.'};if(origin.type==='base'&&destination.type==='train'){const route=findContinuousRailRouteForStation(destination);if(!route||!route.base)return{error:'Cílové nádraží nemá nepřerušené kolejové spojení se základnou.'};if(route.base!==origin)return{error:'Base → Nádraží funguje jen mezi vybranou základnou a nádražím napojeným na tuto základnu.'};return{origin,destination,originStation:destination,destinationStation:destination,sharedBase:origin};}if(origin.type==='train'&&destination.type==='base'){const route=findContinuousRailRouteForStation(origin);if(!route||!route.base)return{error:'Nástupní nádraží nemá nepřerušené kolejové spojení se základnou.'};if(route.base!==destination)return{error:'Nádraží → Base funguje jen mezi nádražím a jeho napojenou základnou.'};return{origin,destination,originStation:origin,destinationStation:origin,sharedBase:destination};}if(origin.type==='train'&&destination.type==='train'){const ra=findContinuousRailRouteForStation(origin),rb=findContinuousRailRouteForStation(destination);if(!ra||!rb||!ra.base||!rb.base)return{error:'Obě nádraží musí mít nepřerušené kolejové spojení se základnou.'};if(ra.base!==rb.base)return{error:'Nádraží → Nádraží nyní funguje jen mezi stanicemi napojenými na stejnou základnu.'};return{origin,destination,originStation:origin,destinationStation:destination,sharedBase:ra.base};}return{error:'Tato kombinace zatím není podporována.'};}
function assignUnitTransportOrder(unit,plan){if(!unit||!plan)return;const board=getRailBoardPointForUnit(plan.origin,unit,unit.x,unit.y);safeClearUnitOrders(unit);unit.transportHidden=false;unit.railTransport={origin:plan.origin,destination:plan.destination,originStation:plan.originStation||null,destinationStation:plan.destinationStation||null,sharedBase:plan.sharedBase||null,phase:'toOrigin',boardPoint:{x:board.x,y:board.y},leg:1,waitTicks:0};unit.railTransportFx=null;unit.target={x:board.x,y:board.y};if(unit.type==='worker')unit.state='idle';}
function disembarkTransportUnit(unit,endpoint){
  if(!unit||!endpoint)return;
  let x=0,y=0,target=null;
  const refX=endpoint.type==='train'?(endpoint.shuttle&&Number.isFinite(endpoint.shuttle.x)?endpoint.shuttle.x:endpoint.x):unit.x;
  const refY=endpoint.type==='train'?(endpoint.shuttle&&Number.isFinite(endpoint.shuttle.y)?endpoint.shuttle.y:endpoint.y):unit.y;
  const p=getRailBoardPointForUnit(endpoint,unit,refX,refY);
  x=p.x;y=p.y;target=p.exitTarget||null;
  unit.x=Math.max(8,Math.min(MAP_W*TILE-8,x));
  unit.y=Math.max(8,Math.min(MAP_H*TILE-8,y));
  unit.vx=0;unit.vy=0;
  unit.transportHidden=false;
  safeClearUnitOrders(unit);
  unit.railTransport=null;
  updateRailTransportFx(unit,'reveal',RAIL_TRANSPORT_REVEAL_TICKS);
  if(target){
    unit.target={x:Math.max(8,Math.min(MAP_W*TILE-8,target.x)),y:Math.max(8,Math.min(MAP_H*TILE-8,target.y))};
  }
}
function updateRailTransportUnit(unit){if(!unit){return false;}tickRailTransportFx(unit);if(!unit.railTransport)return false;const rt=unit.railTransport;if(unit.hp<=0){unit.transportHidden=false;unit.railTransport=null;return false;}if((rt.origin&&rt.origin.hp<=0)||(rt.destination&&rt.destination.hp<=0)){abortRailTransportUnit(unit,rt.origin||rt.destination);return false;}if(rt.phase==='toOrigin'){const p=rt.boardPoint||getRailBoardPointForUnit(rt.origin,unit,unit.x,unit.y);rt.boardPoint={x:p.x,y:p.y};unit.target={x:p.x,y:p.y};if(unit.type==='worker')unit.state='idle';if(Math.hypot(unit.x-p.x,unit.y-p.y)<=RAIL_TRANSPORT_BOARD_RADIUS){unit.target=null;unit.vx*=0.35;unit.vy*=0.35;rt.phase='waitingOrigin';rt.waitTicks=0;updateRailTransportFx(unit,'boarding',RAIL_TRANSPORT_WAIT_PULSE);}return false;}if(rt.phase==='waitingOrigin'||rt.phase==='transferBase'){rt.waitTicks=(rt.waitTicks||0)+1;const endpoint=rt.phase==='transferBase'?(rt.sharedBase||rt.destination):rt.origin;const p=rt.boardPoint||getRailBoardPointForUnit(endpoint,unit,unit.x,unit.y);rt.boardPoint={x:p.x,y:p.y};unit.x=p.x;unit.y=p.y;unit.vx=0;unit.vy=0;unit.target=null;unit.attackTarget=null;unit.pendingAttack=null;if(unit.type==='worker')unit.state='idle';updateRailTransportFx(unit,'boarding',RAIL_TRANSPORT_WAIT_PULSE);return true;}if(rt.phase==='onTrain'){unit.vx=0;unit.vy=0;unit.target=null;unit.attackTarget=null;unit.pendingAttack=null;if(unit.type==='worker')unit.state='idle';return true;}return false;}
function updateAllRailTransportUnits(faction){getRailTransportUnits(faction).forEach(unit=>{if(unit&&unit.railTransportFx&&!unit.railTransport)tickRailTransportFx(unit);updateRailTransportUnit(unit);});}
function railTransportCandidatesForStation(station,atBase){return getRailTransportUnits(station.faction).filter(u=>{const rt=u&&u.railTransport;if(!u||!rt||u.transportHidden||u.hp<=0)return false;if(atBase){if(rt.phase==='transferBase'&&rt.destinationStation===station)return true;if(rt.phase==='waitingOrigin'&&rt.origin&&rt.origin.type==='base'&&rt.destinationStation===station)return true;return false;}return rt.phase==='waitingOrigin'&&rt.originStation===station;});}
function pickupUnitsForStation(station,atBase){const sh=station&&station.shuttle;if(!station||!sh)return 0;let picked=0;for(const unit of railTransportCandidatesForStation(station,atBase)){if(getTrainPassengerCount(station)>=getTrainPassengerCapacity())break;if(sh.passengers.includes(unit))continue;const rt=unit.railTransport;const endpoint=atBase?(rt.sharedBase||rt.destination):station;if(!endpoint)continue;const p=rt.boardPoint||getRailBoardPointForUnit(endpoint,unit,unit.x,unit.y);rt.boardPoint={x:p.x,y:p.y};if(Math.hypot(unit.x-p.x,unit.y-p.y)>RAIL_TRANSPORT_PICKUP_RADIUS)continue;unit.transportHidden=true;unit.vx=0;unit.vy=0;safeClearUnitOrders(unit);rt.phase='onTrain';rt.leg=atBase?2:1;rt.waitTicks=0;unit.railTransportFx=null;unit.x=-10000;unit.y=-10000;sh.passengers.push(unit);picked++;}return picked;}
function unloadTrainPassengersAtBase(train){const sh=train&&train.shuttle;if(!train||!sh||!sh.passengers.length)return 0;let moved=0;const remain=[];for(const unit of sh.passengers){if(!unit||!unit.railTransport)continue;const rt=unit.railTransport;if(rt.destination&&rt.destination.type==='base'){disembarkTransportUnit(unit,rt.destination);moved++;continue;}if(rt.destinationStation&&rt.destinationStation!==train){const bp=getRailBoardPointForUnit(rt.sharedBase||rt.destination,unit,train.x,train.y);unit.x=bp.x;unit.y=bp.y;unit.vx=0;unit.vy=0;unit.transportHidden=false;safeClearUnitOrders(unit);rt.phase='transferBase';rt.boardPoint={x:bp.x,y:bp.y};rt.waitTicks=0;moved++;continue;}remain.push(unit);}sh.passengers=remain;return moved;}
function unloadTrainPassengersAtStation(train){const sh=train&&train.shuttle;if(!train||!sh||!sh.passengers.length)return 0;let moved=0;const remain=[];for(const unit of sh.passengers){if(!unit||!unit.railTransport)continue;const rt=unit.railTransport;if(rt.destination===train){disembarkTransportUnit(unit,train);moved++;continue;}remain.push(unit);}sh.passengers=remain;return moved;}
function stationHasTransportDemand(station,atBase){return railTransportCandidatesForStation(station,atBase).length>0;}


function isSoftObstacle(wx,wy){let tx=Math.floor(wx/TILE),ty=Math.floor(wy/TILE);if(tx<0||tx>=MAP_W||ty<0||ty>=MAP_H)return false;let t=map[ty][tx];return t===5||t===6||t===7;}
let _obstacleGridVersion=-1;let _obstacleGridBuildSitesLen=-1;let _obstacleGrid=null;let _buildingChangeCounter=0;let _barrierCacheVersion=-1;let _barrierCacheBuildSitesLen=-1;let _barrierCache={oneTile:[],bases:[],sites:[]};function getObstacleGrid(){if(_obstacleGrid&&_obstacleGridVersion===_buildingChangeCounter&&_obstacleGridBuildSitesLen===buildSites.length)return _obstacleGrid;_obstacleGrid=new Uint8Array(MAP_W*MAP_H);for(let y=0;y<MAP_H;y++){for(let x=0;x<MAP_W;x++){let t=map[y][x];let idx=y*MAP_W+x;if(t===1||t===2||t===8||t===9||t===10)_obstacleGrid[idx]=1;else if(t===5||t===6||t===7)_obstacleGrid[idx]=2;else _obstacleGrid[idx]=0;}}
for(let fac of[player,ai]){for(let b of fac.walls){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of fac.towers){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of fac.bases){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){let nx=tx+dx,ny=ty+dy;if(nx>=0&&nx<MAP_W&&ny>=0&&ny<MAP_H)_obstacleGrid[ny*MAP_W+nx]=1;}}
for(let b of fac.houses){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of(fac.apartments||[])){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of(fac.trainings||[])){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of fac.harbors){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of(fac.cranes||[])){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of(fac.trains||[])){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of(fac.silos||[])){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}
for(let b of(fac.radars||[])){let tx=Math.round(b.x/TILE),ty=Math.round(b.y/TILE);if(tx>=0&&tx<MAP_W&&ty>=0&&ty<MAP_H)_obstacleGrid[ty*MAP_W+tx]=1;}}
for(let s of buildSites){let tw2=s.tw||1,th2=s.th||1;for(let dy=0;dy<th2;dy++)for(let dx=0;dx<tw2;dx++){let nx=s.tx+dx,ny=s.ty+dy;if(nx>=0&&nx<MAP_W&&ny>=0&&ny<MAP_H&&s.type!=='rail')_obstacleGrid[ny*MAP_W+nx]=1;}}
_obstacleGridVersion=_buildingChangeCounter;_obstacleGridBuildSitesLen=buildSites.length;return _obstacleGrid;}
function getBarrierCollisionCache(){if(_barrierCacheVersion===_buildingChangeCounter&&_barrierCacheBuildSitesLen===buildSites.length)return _barrierCache;const oneTile=[];const pushArr=(arr)=>{if(!arr)return;for(let i=0;i<arr.length;i++){const e=arr[i];if(e&&e.hp>0)oneTile.push(e);}};pushArr(player.walls);pushArr(player.towers);pushArr(player.houses);pushArr(player.apartments);pushArr(player.trainings);pushArr(player.harbors);pushArr(player.cranes);pushArr(player.trains);pushArr(player.silos);pushArr(player.radars);pushArr(ai.walls);pushArr(ai.towers);pushArr(ai.houses);pushArr(ai.apartments);pushArr(ai.trainings);pushArr(ai.harbors);pushArr(ai.cranes);pushArr(ai.trains);pushArr(ai.silos);pushArr(ai.radars);const bases=[];for(let i=0;i<player.bases.length;i++){const b=player.bases[i];if(b&&b.hp>0)bases.push(b);}
for(let i=0;i<ai.bases.length;i++){const b=ai.bases[i];if(b&&b.hp>0)bases.push(b);}
const sites=[];for(let i=0;i<buildSites.length;i++){const s=buildSites[i];if(s&&s.hp>0&&s.type!=='rail')sites.push(s);}
_barrierCache.oneTile=oneTile;_barrierCache.bases=bases;_barrierCache.sites=sites;_barrierCacheVersion=_buildingChangeCounter;_barrierCacheBuildSitesLen=buildSites.length;return _barrierCache;}
class MinHeap{constructor(){this.data=[];}
push(node){this.data.push(node);let i=this.data.length-1;while(i>0){let p=(i-1)>>1;if(this.data[p].f<=this.data[i].f)break;[this.data[p],this.data[i]]=[this.data[i],this.data[p]];i=p;}}
pop(){let top=this.data[0];let last=this.data.pop();if(this.data.length>0){this.data[0]=last;let i=0,n=this.data.length;while(true){let l=2*i+1,r=2*i+2,min=i;if(l<n&&this.data[l].f<this.data[min].f)min=l;if(r<n&&this.data[r].f<this.data[min].f)min=r;if(min===i)break;[this.data[i],this.data[min]]=[this.data[min],this.data[i]];i=min;}}
return top;}
get length(){return this.data.length;}}



