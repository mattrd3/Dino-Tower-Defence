window.__JO_READY = false;

const PATH = [
  {x:-40,y:260},{x:220,y:260},{x:290,y:140},{x:500,y:140},{x:590,y:360},
  {x:820,y:360},{x:910,y:190},{x:1130,y:190},{x:1200,y:500},{x:1320,y:500}
];

const PAD_POS = [[190,150],[330,290],[450,80],[530,250],[670,470],[760,270],[930,120],[980,340],[1080,110],[1080,420]];
const SPEEDS = [0.5,1,2,3];
const MAPS = [{id:'jungle',name:'Jungle Perimeter'},{id:'canyon',name:'Canyon Basin'},{id:'marsh',name:'Research Marsh'}];
const SAVE_KEY = 'jurassic-outpost-progress-v1';

const TOWERS = {
  ranger:{name:'Ranger',path:'Sharpshooter',type:'pierce',cost:75,color:0x9fdcff,range:175,damage:14,rate:430,barrel:0xeafaff,perk:'Anti-light precision'},
  cannon:{name:'Cannon',path:'Demolition',type:'blast',cost:120,color:0xffbf73,range:150,damage:32,rate:980,splash:65,barrel:0xffe0b8,perk:'Armour breaker'},
  cryo:{name:'Cryo',path:'Containment',type:'frost',cost:100,color:0x9ef5ff,range:145,damage:8,rate:720,slow:.55,barrel:0xe0ffff,perk:'Slow and control'}
};

const ENEMIES = {
  compy:{name:'Compy',hp:35,speed:112,reward:8,damage:1,color:0x8de16c,accent:0xd8ffb5,size:12,shape:'small',armour:'light',resist:{pierce:.85,blast:1.15,frost:1}},
  raptor:{name:'Raptor',hp:82,speed:130,reward:16,damage:1,color:0xc7a16f,accent:0xf0d19c,size:19,shape:'raptor',armour:'light',resist:{pierce:.9,blast:1.05,frost:1.1}},
  trike:{name:'Triceratops',hp:230,speed:60,reward:28,damage:2,color:0x7f9e6a,accent:0xe9efe1,size:26,shape:'trike',armour:'armoured',resist:{pierce:1.25,blast:.8,frost:1.05}},
  dilo:{name:'Dilophosaur',hp:110,speed:90,reward:22,damage:1,color:0xc06bd8,accent:0xf2b8ff,size:22,shape:'dilo',armour:'toxic',resist:{pierce:1,blast:1,frost:.78}},
  rex:{name:'Rex Alpha',hp:1200,speed:40,reward:200,damage:8,color:0xc85440,accent:0xffb19c,size:42,shape:'rex',armour:'boss',resist:{pierce:1.15,blast:.9,frost:.85}}
};

const ELITE = {hp:1.55,speed:1.12,reward:1.7,damage:1.3,color:0xffd86d};
const WAVES = [
  {compy:8},{compy:10,raptor:2},{compy:12,raptor:5},{raptor:8,dilo:2},{compy:16,trike:2},
  {raptor:10,dilo:5},{compy:18,trike:4,dilo:4},{raptor:16,trike:5},
  {compy:24,raptor:14,dilo:7,trike:4},{rex:1,compy:18,raptor:10,trike:4}
];

const PROGRESS = loadProgress();
const STATE = {credits:350,lives:20,wave:0,maxWaves:10,type:'ranger',selected:null,active:false,queue:[],timer:0,speed:1,paused:false,over:false,elitesDefeated:0,activeWaves:0,mapId:PROGRESS.currentMap||'jungle'};
let sceneRef;
const el = id => document.getElementById(id);

function loadProgress(){ try{return JSON.parse(localStorage.getItem(SAVE_KEY))||{bestWave:0,eliteKills:0,currentMap:'jungle',unlocked:['jungle']};}catch{return {bestWave:0,eliteKills:0,currentMap:'jungle',unlocked:['jungle']};} }
function saveProgress(){ localStorage.setItem(SAVE_KEY,JSON.stringify(PROGRESS)); }
function updateProgress(){ PROGRESS.bestWave=Math.max(PROGRESS.bestWave||0,STATE.wave); PROGRESS.eliteKills=Math.max(PROGRESS.eliteKills||0,STATE.elitesDefeated); PROGRESS.currentMap=STATE.mapId; if(STATE.wave>=5&&!PROGRESS.unlocked.includes('canyon'))PROGRESS.unlocked.push('canyon'); if(STATE.wave>=10&&!PROGRESS.unlocked.includes('marsh'))PROGRESS.unlocked.push('marsh'); saveProgress(); }
function effectiveDamage(base, towerType, enemyDef){ return Math.max(1, base * (enemyDef.resist?.[towerType] ?? 1)); }
function formatResist(def){ return `${def.armour}: P${Math.round((def.resist.pierce||1)*100)} B${Math.round((def.resist.blast||1)*100)} F${Math.round((def.resist.frost||1)*100)}`; }
function speedLabel(){ return STATE.speed === 0.5 ? 'x0.5' : `x${STATE.speed}`; }
function mapName(){ return MAPS.find(m=>m.id===STATE.mapId)?.name||'Jungle Perimeter'; }

const UI = {
  init(){
    this.credits=el('credits'); this.lives=el('lives'); this.wave=el('wave'); this.status=el('status'); this.start=el('startWave'); this.info=el('selectedInfo'); this.upgrade=el('upgradeBtn'); this.sell=el('sellBtn'); this.pause=el('pauseBtn'); this.speed=el('speedBtn'); this.logBox=el('log'); this.previewTitle=el('previewTitle'); this.previewList=el('previewList'); this.previewHint=el('previewHint'); this.cards=[...document.querySelectorAll('.towerCard')]; this.sectorName=el('sectorName'); this.bestWave=el('bestWave'); this.eliteKills=el('eliteKills'); this.mapList=el('mapList');
    this.cards.forEach(card => card.onclick = () => { STATE.type = card.dataset.type; this.cards.forEach(c => c.classList.toggle('active', c === card)); this.log(`${TOWERS[STATE.type].name} selected — ${TOWERS[STATE.type].perk}.`); sceneRef?.highlightPads(); this.render(); });
    this.start.onclick = () => sceneRef?.startWave(); this.upgrade.onclick = () => sceneRef?.upgradeSelected(); this.sell.onclick = () => sceneRef?.sellSelected();
    this.pause.onclick = () => { STATE.paused = !STATE.paused; this.render(); };
    this.speed.onclick = () => { const i=SPEEDS.indexOf(STATE.speed); STATE.speed = SPEEDS[(i+1)%SPEEDS.length]; this.log(STATE.speed === 0.5 ? 'Child speed enabled: slower waves for younger players.' : `Speed set to ${speedLabel()}.`); this.render(); };
    this.render();
  },
  log(message){ this.logBox.textContent = message; },
  renderMaps(){ if(!this.mapList)return; this.mapList.innerHTML=''; MAPS.forEach(map=>{ const unlocked=PROGRESS.unlocked.includes(map.id); const span=document.createElement('span'); span.className='pill '+(STATE.mapId===map.id?'boss':''); span.textContent=unlocked?map.name:`${map.name} 🔒`; span.onclick=()=>{ if(!unlocked){this.log('Map locked. Reach later waves to unlock it.');return;} STATE.mapId=map.id; PROGRESS.currentMap=map.id; saveProgress(); sceneRef?.drawMap?.(); this.log(`Selected map: ${map.name}.`); this.render(); }; this.mapList.appendChild(span); }); },
  renderProgress(){ if(this.sectorName)this.sectorName.textContent=mapName(); if(this.bestWave)this.bestWave.textContent=PROGRESS.bestWave||0; if(this.eliteKills)this.eliteKills.textContent=PROGRESS.eliteKills||0; this.renderMaps(); },
  renderPreview(){
    const def = WAVES[Math.min(STATE.wave, WAVES.length-1)]; this.previewTitle.textContent = STATE.wave >= STATE.maxWaves ? 'All waves launched' : `Next: Wave ${STATE.wave+1}`; this.previewList.innerHTML='';
    Object.entries(def||{}).forEach(([type,count])=>{ const span=document.createElement('span'); span.className='pill '+(type==='rex'?'boss':''); span.textContent=`${ENEMIES[type].name} x${count} · ${formatResist(ENEMIES[type])}`; this.previewList.appendChild(span); });
    const eliteText = STATE.wave >= 5 ? ' Elite variants may appear.' : ''; this.previewHint.textContent = STATE.wave>=STATE.maxWaves ? 'Survive the remaining dinosaurs.' : STATE.activeWaves > 0 ? `You can launch early. Active waves: ${STATE.activeWaves}.` : `Prepare defenses before starting.${eliteText}`;
  },
  render(){
    this.credits.textContent=STATE.credits; this.lives.textContent=STATE.lives; this.wave.textContent=`${STATE.wave}/${STATE.maxWaves}`; this.status.textContent=STATE.over?'Over':STATE.activeWaves>0?'Breach':STATE.wave>=STATE.maxWaves?'Secured':'Ready'; this.start.disabled=STATE.over||STATE.wave>=STATE.maxWaves; this.start.textContent = STATE.activeWaves > 0 && STATE.wave < STATE.maxWaves ? 'LAUNCH NEXT WAVE EARLY' : 'START NEXT WAVE'; this.pause.textContent=STATE.paused?'Resume':'Pause'; this.speed.textContent=speedLabel();
    this.cards.forEach(card => card.classList.toggle('unaffordable', STATE.credits < TOWERS[card.dataset.type].cost)); this.renderProgress(); this.renderPreview();
    if(!STATE.selected){ const d=TOWERS[STATE.type]; this.info.innerHTML=`Build mode: <strong>${d.name}</strong><br>${d.path} path · ${d.type}<br>${d.perk}<br>Click a glowing pad to place.`; this.upgrade.disabled=true; this.sell.disabled=true; return; }
    const t=STATE.selected, cost=t.upgradeCost(); this.info.innerHTML=`<strong>${t.def.name}</strong> · ${t.def.path}<br>Level ${t.level}/5 · ${t.def.type}<br>Damage ${Math.round(t.damage)} Range ${Math.round(t.range)}<br>${t.nextPerk()}<br>Upgrade $${cost}`; this.upgrade.disabled=STATE.credits<cost||t.level>=5; this.sell.disabled=false;
  }
};

class Tower {
  constructor(scene,pad,type){ this.scene=scene; this.pad=pad; this.type=type; this.def=TOWERS[type]; this.x=pad.xp; this.y=pad.yp; this.level=1; this.damage=this.def.damage; this.range=this.def.range; this.rate=this.def.rate; this.cool=0; this.parts=[]; this.draw(); }
  draw(){
    this.parts.push(this.scene.add.ellipse(this.x,this.y+20,62,20,0x000000,.34)); this.base=this.scene.add.circle(this.x,this.y,31,0x263b33).setStrokeStyle(5,this.def.color); this.parts.push(this.base); this.parts.push(this.scene.add.circle(this.x,this.y,21,0x14241e).setStrokeStyle(2,0xffffff22));
    if(this.type==='ranger'){this.turret=this.scene.add.rectangle(this.x,this.y-9,18,42,this.def.color).setStrokeStyle(2,this.def.barrel);this.barrel=this.scene.add.rectangle(this.x+16,this.y-20,34,7,this.def.barrel);} if(this.type==='cannon'){this.turret=this.scene.add.rectangle(this.x,this.y,44,30,this.def.color).setStrokeStyle(3,this.def.barrel);this.barrel=this.scene.add.rectangle(this.x+23,this.y-12,44,11,this.def.barrel).setRotation(-.2);} if(this.type==='cryo'){this.turret=this.scene.add.circle(this.x,this.y-5,20,this.def.color).setStrokeStyle(4,this.def.barrel);this.barrel=this.scene.add.circle(this.x,this.y-5,9,0xffffff,.78);this.parts.push(this.scene.add.circle(this.x,this.y-5,30,this.def.color,.08));}
    this.parts.push(this.turret,this.barrel); this.rangeCircle=this.scene.add.circle(this.x,this.y,this.range,0xffffff,.04).setStrokeStyle(1,0xffffff,.12).setVisible(false); this.parts.push(this.rangeCircle); this.levelBadge=this.scene.add.text(this.x,this.y+34,'1',{fontSize:'13px',fontStyle:'bold',color:'#eef7f0',backgroundColor:'#0007',padding:{x:4,y:1}}).setOrigin(.5); this.parts.push(this.levelBadge); this.parts.forEach(p => p?.setInteractive?.({useHandCursor:true}).on('pointerdown',()=>this.scene.selectTower(this)));
  }
  select(on){ this.rangeCircle.setVisible(on); this.base.setStrokeStyle(on?7:5,on?0xf5ff9c:this.def.color); }
  upgradeCost(){ return Math.round(this.def.cost*(.7+this.level*.62)); } sellValue(){ return Math.round(this.def.cost*(.45+this.level*.18)); }
  nextPerk(){ if(this.level>=5)return 'MAX: final upgrade installed'; if(this.type==='ranger')return this.level>=3?'Next: Overwatch targeting':'Next: Sharpshooter damage'; if(this.type==='cannon')return this.level>=3?'Next: Siege shell splash':'Next: Armour breaker'; return this.level>=3?'Next: Cryo lockdown':'Next: deeper slow field'; }
  upgrade(){ if(this.level>=5)return; this.level++; const typeBoost=this.type==='cannon'?1.5:this.type==='cryo'?1.28:1.42; this.damage*=typeBoost; this.range+=this.type==='ranger'?19:14; this.rate*=this.type==='ranger'?.84:this.type==='cryo'?.86:.9; if(this.type==='cannon')this.def.splash+=this.level>=4?18:10; if(this.type==='cryo')this.def.slow=Math.max(.32,this.def.slow-.06); this.rangeCircle.setRadius(this.range); this.levelBadge.setText(String(this.level)); this.scene.floatText(this.x,this.y-46,this.nextPerk().replace('Next: ','UPGRADE: '),0xa7ff8f); this.scene.pulse(this.x,this.y,0xa7ff8f,52); }
  destroy(){ this.parts.forEach(p=>p?.destroy()); }
  aimAt(target){ if(!target)return; const a=Phaser.Math.Angle.Between(this.x,this.y,target.x,target.y); if(this.turret&&this.type!=='cryo')this.turret.setRotation(a+Math.PI/2); if(this.barrel&&this.type!=='cryo')this.barrel.setRotation(a); }
  update(delta,enemies){ this.cool-=delta*STATE.speed; const target=enemies.find(e=>e.alive&&Phaser.Math.Distance.Between(this.x,this.y,e.x,e.y)<=this.range); this.aimAt(target); if(this.cool>0||!target)return; this.cool=this.rate; this.fire(target,enemies); }
  fire(target,enemies){ const shot=this.scene.add.circle(this.x,this.y-12,this.type==='cannon'?7:5,this.def.barrel||this.def.color); const trail=this.scene.add.line(0,0,this.x,this.y-12,target.x,target.y,this.def.color,.28).setDepth(2); const flash=this.scene.add.circle(this.x+14,this.y-14,12,this.def.color,.55); this.scene.tweens.add({targets:flash,alpha:0,radius:24,duration:120,onComplete:()=>flash.destroy()}); this.scene.tweens.add({targets:shot,x:target.x,y:target.y,duration:this.type==='cannon'?180:115,onComplete:()=>{shot.destroy();trail.destroy();this.hit(target,enemies);}}); }
  hit(target,enemies){ if(this.def.splash){ this.scene.pulse(target.x,target.y,this.def.color,this.def.splash); enemies.forEach(e=>{ if(e.alive&&Phaser.Math.Distance.Between(target.x,target.y,e.x,e.y)<=this.def.splash)e.damage(this.damage,this.def.type,0); }); } else target.damage(this.damage,this.def.type,this.def.slow||0); }
}

class Enemy {
  constructor(scene,type){ this.scene=scene; this.type=type; this.base=ENEMIES[type]; this.elite=STATE.wave>=6 && type!=='rex' && Math.random()<.18; this.def={...this.base}; if(this.elite){this.def={...this.def,hp:Math.round(this.def.hp*ELITE.hp),speed:Math.round(this.def.speed*ELITE.speed),reward:Math.round(this.def.reward*ELITE.reward),damage:Math.ceil(this.def.damage*ELITE.damage),accent:ELITE.color,name:`Elite ${this.def.name}`};} this.alive=true; this.hp=this.def.hp; this.maxHp=this.def.hp; this.path=0; this.slow=1; this.x=PATH[0].x; this.y=PATH[0].y; this.group=scene.add.group(); this.draw(); }
  draw(){ const d=this.def,s=d.size*(this.elite?1.12:1); this.shadow=this.scene.add.ellipse(this.x,this.y+s*.8,s*2.6,s*.7,0x000000,.38); this.body=this.scene.add.ellipse(this.x,this.y,s*2.1,s*1.08,d.color).setStrokeStyle(this.elite?4:2,this.elite?0xffd86d:0x0b130f); this.head=this.scene.add.circle(this.x+s,this.y-s*.25,s*.48,d.accent).setStrokeStyle(1,0x0b130f); this.mark=this.scene.add.rectangle(this.x-s*.2,this.y-s*.12,s*.95,3,d.accent,.55).setRotation(.08); this.nameTag=this.scene.add.text(this.x,this.y-s-30,`${d.name} · ${formatResist(this.base)}`,{fontSize:'11px',color:'#eef7f0',backgroundColor:'#0008',padding:{x:3,y:1}}).setOrigin(.5).setAlpha(0); this.group.addMultiple([this.shadow,this.body,this.head,this.mark,this.nameTag]); if(d.shape==='raptor'||d.shape==='rex'){this.tail=this.scene.add.rectangle(this.x-s*1.05,this.y+s*.08,s*1.25,s*.25,d.color).setRotation(.16);this.group.add(this.tail);} if(d.shape==='trike'){this.h1=this.scene.add.rectangle(this.x+s*1.42,this.y-s*.18,s*.72,3,0xf4f0db).setRotation(.18);this.h2=this.scene.add.rectangle(this.x+s*1.42,this.y+s*.12,s*.72,3,0xf4f0db).setRotation(-.18);this.frill=this.scene.add.circle(this.x+s*.65,this.y,s*.7,d.accent,.35);this.group.addMultiple([this.frill,this.h1,this.h2]);} if(d.shape==='dilo'){this.frill=this.scene.add.circle(this.x+s*.55,this.y-s*.05,s*.9,d.accent,.45);this.group.add(this.frill);} if(d.shape==='rex'){this.label=this.scene.add.text(this.x,this.y+s*1.08,'REX',{fontSize:'15px',fontStyle:'bold',color:'#fff4e9'}).setOrigin(.5);this.group.add(this.label);} this.hpBg=this.scene.add.rectangle(this.x,this.y-s-14,60,6,0x111111); this.hpBar=this.scene.add.rectangle(this.x,this.y-s-14,60,6,this.elite?0xffd86d:0x9dff87); this.group.addMultiple([this.hpBg,this.hpBar]); this.body.setInteractive({useHandCursor:true}).on('pointerover',()=>this.nameTag.setAlpha(1)).on('pointerout',()=>this.nameTag.setAlpha(0)).on('pointerdown',()=>{this.nameTag.setAlpha(1);setTimeout(()=>this.nameTag?.setAlpha(0),1200);}); this.drawSize=s; }
  damage(amount,type,slow){ if(!this.alive)return; const real=effectiveDamage(amount,type,this.base); this.hp-=real; if(slow)this.slow=slow; this.scene.floatText(this.x,this.y-this.drawSize-25,String(Math.round(real)), type==='blast'?0xffbf73:type==='frost'?0x9ef5ff:0xfff2a8); if(this.hp<=0)this.kill(); }
  kill(){ if(!this.alive)return; this.alive=false; if(this.elite)STATE.elitesDefeated++; STATE.credits+=this.def.reward; this.scene.floatText(this.x,this.y-28,`+$${this.def.reward}`,this.elite?0xffd86d:0xffd86d); this.scene.pulse(this.x,this.y,this.elite?0xffd86d:0xf3ffb0,this.elite?50:35); this.group.destroy(true); UI.render(); }
  breach(){ if(!this.alive)return; this.alive=false; STATE.lives-=this.def.damage; this.group.destroy(true); UI.log(`${this.def.name} breached the gate.`); if(STATE.lives<=0)this.scene.endGame(false); UI.render(); }
  update(delta){ const target=PATH[this.path+1]; if(!target){this.breach();return;} const move=this.def.speed*this.slow*(delta/1000)*STATE.speed; const angle=Phaser.Math.Angle.Between(this.x,this.y,target.x,target.y); const dist=Phaser.Math.Distance.Between(this.x,this.y,target.x,target.y); if(dist<=move){this.x=target.x; this.y=target.y; this.path++;} else {this.x+=Math.cos(angle)*move; this.y+=Math.sin(angle)*move;} this.slow=Math.min(1,this.slow+.004); this.position(); }
  position(){ const s=this.drawSize; this.shadow.setPosition(this.x,this.y+s*.8); this.body.setPosition(this.x,this.y); this.head.setPosition(this.x+s,this.y-s*.25); this.mark.setPosition(this.x-s*.2,this.y-s*.12); this.nameTag.setPosition(this.x,this.y-s-30); if(this.tail)this.tail.setPosition(this.x-s*1.05,this.y+s*.08); if(this.frill)this.frill.setPosition(this.x+s*.55,this.y-s*.05); if(this.h1)this.h1.setPosition(this.x+s*1.42,this.y-s*.18); if(this.h2)this.h2.setPosition(this.x+s*1.42,this.y+s*.12); if(this.label)this.label.setPosition(this.x,this.y+s*1.08); const pct=Math.max(0,this.hp/this.maxHp); this.hpBg.setPosition(this.x,this.y-s-14); this.hpBar.setPosition(this.x-(60-60*pct)/2,this.y-s-14); this.hpBar.setSize(60*pct,6); }
}

class GameScene extends Phaser.Scene {
  constructor(){ super('main'); this.enemies=[]; this.towers=[]; this.pads=[]; }
  create(){ sceneRef=this; window.__JO_SCENE=this; this.drawMap(); this.createPads(); UI.render(); this.highlightPads(); window.__JO_READY=true; }
  update(time,delta){ if(STATE.paused||STATE.over)return; this.spawn(delta); this.enemies=this.enemies.filter(e=>e.alive); this.enemies.forEach(e=>e.update(delta)); this.towers.forEach(t=>t.update(delta,this.enemies)); if(STATE.activeWaves>0&&STATE.queue.length===0&&this.enemies.length===0)this.allWavesComplete(); }
  drawMap(){ const bg=STATE.mapId==='canyon'?0x3d2f22:STATE.mapId==='marsh'?0x18392f:0x17372c; this.add.rectangle(640,360,1280,720,bg); for(let i=0;i<170;i++){this.add.circle(Phaser.Math.Between(0,1280),Phaser.Math.Between(0,720),Phaser.Math.Between(5,26),Phaser.Math.RND.pick(STATE.mapId==='canyon'?[0x5f4730,0x7d5e3c,0x3a2a1d]:[0x244e3d,0x2f5e48,0x173026,0x3b5b31]),Phaser.Math.FloatBetween(.2,.55));} const g=this.add.graphics(); [[78,0x473b27,1],[60,0x6b583a,1],[44,0x9a8158,1],[3,0xe0c680,.22]].forEach(([w,c,a])=>{g.lineStyle(w,c,a);g.beginPath();g.moveTo(PATH[0].x,PATH[0].y);PATH.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.strokePath();}); this.add.rectangle(1170,500,124,144,0x243239).setStrokeStyle(4,0x7fffd0); this.add.rectangle(1170,500,86,102,0x101c1d,.4).setStrokeStyle(2,0xb5fff0,.5); this.add.text(1170,430,'EVAC\nGATE',{fontSize:'24px',align:'center',fontStyle:'bold'}).setOrigin(.5); this.add.text(24,24,`${mapName().toUpperCase()} - CONTAINMENT BREACH`,{fontSize:'24px',fontStyle:'bold',color:'#effff4'}); this.add.rectangle(640,360,1280,720,0x020605,.12); }
  createPads(){ PAD_POS.forEach(([x,y])=>{ const pad=this.add.circle(x,y,35,0x22362e).setStrokeStyle(5,0x95c9a5); pad.xp=x; pad.yp=y; pad.tower=null; pad.setInteractive({useHandCursor:true}); pad.on('pointerdown',()=>this.buildTower(pad)); pad.glow=this.add.circle(x,y,47,0x9cff7d,.04); pad.core=this.add.circle(x,y,10,0xa7ff8f,.72); this.pads.push(pad); }); }
  highlightPads(){ this.pads.forEach(p=>{ const affordable=STATE.credits>=TOWERS[STATE.type].cost&&!p.tower; p.setStrokeStyle(affordable?6:4,affordable?0xb8ff9d:0x547060); if(p.glow)p.glow.setAlpha(affordable?.12:.025); }); }
  buildTower(pad){ if(pad.tower||STATE.over)return; const def=TOWERS[STATE.type]; if(STATE.credits<def.cost){UI.log(`Need $${def.cost} for ${def.name}.`);return;} STATE.credits-=def.cost; const tower=new Tower(this,pad,STATE.type); pad.tower=tower; this.towers.push(tower); this.selectTower(tower); this.floatText(pad.xp,pad.yp-46,`${def.name} built`,0xa7ff8f); UI.log(`${def.name} built. ${def.perk}.`); UI.render(); this.highlightPads(); }
  selectTower(tower){ if(STATE.selected)STATE.selected.select(false); STATE.selected=tower; tower.select(true); UI.render(); }
  upgradeSelected(){ const tower=STATE.selected; if(!tower)return; const cost=tower.upgradeCost(); if(STATE.credits<cost||tower.level>=5)return; STATE.credits-=cost; tower.upgrade(); UI.log(`${tower.def.name} upgraded on ${tower.def.path} path.`); UI.render(); this.highlightPads(); }
  sellSelected(){ const tower=STATE.selected; if(!tower)return; STATE.credits+=tower.sellValue(); tower.pad.tower=null; this.towers=this.towers.filter(t=>t!==tower); tower.destroy(); STATE.selected=null; UI.log('Tower sold.'); UI.render(); this.highlightPads(); }
  startWave(){ if(STATE.over||STATE.wave>=STATE.maxWaves)return; const def=WAVES[STATE.wave]; Object.entries(def).forEach(([type,count])=>{for(let i=0;i<count;i++)STATE.queue.push(type);}); Phaser.Utils.Array.Shuffle(STATE.queue); STATE.wave++; STATE.active=true; STATE.activeWaves++; STATE.timer=Math.min(STATE.timer,0); updateProgress(); if(STATE.wave===6)UI.log('Elite variants now detected in the jungle.'); if(STATE.wave===10)this.bossWarning(); else UI.log(`Wave ${STATE.wave} launched. Active waves: ${STATE.activeWaves}.`); UI.render(); }
  bossWarning(){ const bg=this.add.rectangle(640,110,680,76,0x3b120d,.88).setStrokeStyle(3,0xff886e); const tx=this.add.text(640,110,'⚠ REX ALPHA INBOUND ⚠',{fontSize:'34px',fontStyle:'bold',color:'#ffd1c4'}).setOrigin(.5); this.cameras.main.shake(700,.009); this.tweens.add({targets:[bg,tx],alpha:0,delay:1300,duration:700,onComplete:()=>{bg.destroy();tx.destroy();}}); }
  spawn(delta){ if(STATE.activeWaves<=0)return; STATE.timer-=delta*STATE.speed; if(STATE.timer>0||STATE.queue.length===0)return; const enemy=new Enemy(this,STATE.queue.shift()); this.enemies.push(enemy); if(enemy.elite)this.floatText(enemy.x+75,enemy.y-20,'ELITE',0xffd86d); if(enemy.type==='rex')this.cameras.main.shake(600,.008); STATE.timer=STATE.wave===STATE.maxWaves?430:650; }
  allWavesComplete(){ STATE.active=false; STATE.activeWaves=0; STATE.credits+=45+STATE.wave*8+STATE.elitesDefeated*5; updateProgress(); if(STATE.wave>=STATE.maxWaves){this.endGame(true);return;} UI.log(`Area clear. You can launch the next wave. Elite takedowns: ${STATE.elitesDefeated}.`); UI.render(); this.highlightPads(); }
  endGame(win){ STATE.over=true; STATE.active=false; STATE.activeWaves=0; updateProgress(); UI.log(win?`Jungle secured. Elite takedowns: ${STATE.elitesDefeated}.`:'Outpost overrun.'); this.add.rectangle(640,360,620,180,0x06100d,.9).setStrokeStyle(3,win?0xa7ff8f:0xff7760); this.add.text(640,340,win?'SECTOR SECURED':'CONTAINMENT FAILED',{fontSize:'44px',fontStyle:'bold',color:win?'#d9ffc1':'#ffb3a1'}).setOrigin(.5); UI.render(); }
  pulse(x,y,color,r){ const c=this.add.circle(x,y,8,color,.22).setStrokeStyle(2,color,.5); this.tweens.add({targets:c,radius:r,alpha:0,duration:340,onComplete:()=>c.destroy()}); }
  floatText(x,y,text,color){ const t=this.add.text(x,y,text,{fontSize:'13px',fontStyle:'bold',color:'#'+color.toString(16).padStart(6,'0')}).setOrigin(.5).setAlpha(.95); this.tweens.add({targets:t,y:y-24,alpha:0,duration:700,onComplete:()=>t.destroy()}); }
}

UI.init();
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1280,height:720,backgroundColor:'#12251d',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:GameScene});
