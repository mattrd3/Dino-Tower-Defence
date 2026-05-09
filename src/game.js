window.__JO_READY = false;

const PATH = [
  {x:-40,y:260},{x:220,y:260},{x:290,y:140},{x:500,y:140},{x:590,y:360},
  {x:820,y:360},{x:910,y:190},{x:1130,y:190},{x:1200,y:500},{x:1320,y:500}
];

const PAD_POS = [[190,150],[330,290],[450,80],[530,250],[670,470],[760,270],[930,120],[980,340],[1080,110],[1080,420]];

const TOWERS = {
  ranger:{name:'Ranger',cost:75,color:0x9fdcff,range:175,damage:14,rate:430,barrel:0xeafaff},
  cannon:{name:'Cannon',cost:120,color:0xffbf73,range:150,damage:32,rate:980,splash:65,barrel:0xffe0b8},
  cryo:{name:'Cryo',cost:100,color:0x9ef5ff,range:145,damage:8,rate:720,slow:.55,barrel:0xe0ffff}
};

const ENEMIES = {
  compy:{name:'Compy',hp:35,speed:112,reward:8,damage:1,color:0x8de16c,accent:0xd8ffb5,size:12,shape:'small'},
  raptor:{name:'Raptor',hp:82,speed:130,reward:16,damage:1,color:0xc7a16f,accent:0xf0d19c,size:19,shape:'raptor'},
  trike:{name:'Triceratops',hp:230,speed:60,reward:28,damage:2,color:0x7f9e6a,accent:0xe9efe1,size:26,shape:'trike'},
  dilo:{name:'Dilophosaur',hp:110,speed:90,reward:22,damage:1,color:0xc06bd8,accent:0xf2b8ff,size:22,shape:'dilo'},
  rex:{name:'Rex Alpha',hp:1200,speed:40,reward:200,damage:8,color:0xc85440,accent:0xffb19c,size:42,shape:'rex'}
};

const WAVES = [
  {compy:8},{compy:10,raptor:2},{compy:12,raptor:5},{raptor:8,dilo:2},{compy:16,trike:2},
  {raptor:10,dilo:5},{compy:18,trike:4,dilo:4},{raptor:16,trike:5},
  {compy:24,raptor:14,dilo:7,trike:4},{rex:1,compy:18,raptor:10,trike:4}
];

const STATE = {credits:350,lives:20,wave:0,maxWaves:10,type:'ranger',selected:null,active:false,queue:[],timer:0,speed:1,paused:false,over:false};
let sceneRef;
const el = id => document.getElementById(id);

const UI = {
  init(){
    this.credits=el('credits'); this.lives=el('lives'); this.wave=el('wave'); this.status=el('status'); this.start=el('startWave'); this.info=el('selectedInfo'); this.upgrade=el('upgradeBtn'); this.sell=el('sellBtn'); this.pause=el('pauseBtn'); this.speed=el('speedBtn'); this.logBox=el('log'); this.previewTitle=el('previewTitle'); this.previewList=el('previewList'); this.previewHint=el('previewHint'); this.cards=[...document.querySelectorAll('.towerCard')];
    this.cards.forEach(card => card.onclick = () => { STATE.type = card.dataset.type; this.cards.forEach(c => c.classList.toggle('active', c === card)); this.log(`${TOWERS[STATE.type].name} selected. Valid pads are glowing.`); sceneRef?.highlightPads(); this.render(); });
    this.start.onclick = () => sceneRef?.startWave();
    this.upgrade.onclick = () => sceneRef?.upgradeSelected();
    this.sell.onclick = () => sceneRef?.sellSelected();
    this.pause.onclick = () => { STATE.paused = !STATE.paused; this.render(); };
    this.speed.onclick = () => { STATE.speed = STATE.speed === 1 ? 2 : STATE.speed === 2 ? 3 : 1; this.render(); };
    this.render();
  },
  log(message){ this.logBox.textContent = message; },
  renderPreview(){
    const def = WAVES[Math.min(STATE.wave, WAVES.length-1)];
    this.previewTitle.textContent = STATE.wave >= STATE.maxWaves ? 'Final wave complete' : `Wave ${STATE.wave+1}`;
    this.previewList.innerHTML='';
    Object.entries(def||{}).forEach(([type,count])=>{
      const span=document.createElement('span');
      span.className='pill '+(type==='rex'?'boss':'');
      span.textContent=`${ENEMIES[type].name} x${count}`;
      this.previewList.appendChild(span);
    });
    this.previewHint.textContent = STATE.wave===9 ? 'Boss warning: Rex Alpha will breach the perimeter.' : STATE.active ? 'Wave in progress.' : 'Prepare defenses before starting.';
  },
  render(){
    this.credits.textContent=STATE.credits; this.lives.textContent=STATE.lives; this.wave.textContent=`${STATE.wave}/${STATE.maxWaves}`;
    this.status.textContent=STATE.over?'Over':STATE.active?'Breach':STATE.wave>=STATE.maxWaves?'Secured':'Ready';
    this.start.disabled=STATE.active||STATE.over||STATE.wave>=STATE.maxWaves;
    this.pause.textContent=STATE.paused?'Resume':'Pause'; this.speed.textContent=`x${STATE.speed}`;
    this.cards.forEach(card => card.classList.toggle('unaffordable', STATE.credits < TOWERS[card.dataset.type].cost));
    this.renderPreview();
    if(!STATE.selected){ this.info.innerHTML=`Build mode: <strong>${TOWERS[STATE.type].name}</strong><br>Click a glowing pad to place.`; this.upgrade.disabled=true; this.sell.disabled=true; return; }
    const cost=STATE.selected.upgradeCost();
    this.info.innerHTML=`<strong>${STATE.selected.def.name}</strong><br>Level ${STATE.selected.level}<br>Damage ${Math.round(STATE.selected.damage)} Range ${Math.round(STATE.selected.range)}<br>Upgrade $${cost}`;
    this.upgrade.disabled=STATE.credits<cost||STATE.selected.level>=4; this.sell.disabled=false;
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
  upgradeCost(){ return Math.round(this.def.cost*(.8+this.level*.65)); }
  sellValue(){ return Math.round(this.def.cost*(.45+this.level*.18)); }
  upgrade(){ if(this.level>=4)return; this.level++; this.damage*=1.45; this.range+=15; this.rate*=.88; this.rangeCircle.setRadius(this.range); this.levelBadge.setText(String(this.level)); this.scene.floatText(this.x,this.y-46,'UPGRADE',0xa7ff8f); this.scene.pulse(this.x,this.y,0xa7ff8f,52); }
  destroy(){ this.parts.forEach(p=>p?.destroy()); }
  aimAt(target){ if(!target)return; const a=Phaser.Math.Angle.Between(this.x,this.y,target.x,target.y); if(this.turret&&this.type!=='cryo')this.turret.setRotation(a+Math.PI/2); if(this.barrel&&this.type!=='cryo')this.barrel.setRotation(a); }
  update(delta,enemies){ this.cool-=delta*STATE.speed; const target=enemies.find(e=>e.alive&&Phaser.Math.Distance.Between(this.x,this.y,e.x,e.y)<=this.range); this.aimAt(target); if(this.cool>0||!target)return; this.cool=this.rate; this.fire(target,enemies); }
  fire(target,enemies){ const shot=this.scene.add.circle(this.x,this.y-12,this.type==='cannon'?7:5,this.def.barrel||this.def.color); const trail=this.scene.add.line(0,0,this.x,this.y-12,target.x,target.y,this.def.color,.28).setDepth(2); const flash=this.scene.add.circle(this.x+14,this.y-14,12,this.def.color,.55); this.scene.tweens.add({targets:flash,alpha:0,radius:24,duration:120,onComplete:()=>flash.destroy()}); this.scene.tweens.add({targets:shot,x:target.x,y:target.y,duration:this.type==='cannon'?180:115,onComplete:()=>{shot.destroy();trail.destroy();this.hit(target,enemies);}}); }
  hit(target,enemies){ if(this.def.splash){ this.scene.pulse(target.x,target.y,this.def.color,this.def.splash); enemies.forEach(e=>{ if(e.alive&&Phaser.Math.Distance.Between(target.x,target.y,e.x,e.y)<=this.def.splash)e.damage(this.damage,0); }); } else target.damage(this.damage,this.def.slow||0); }
}

class Enemy {
  constructor(scene,type){ this.scene=scene; this.type=type; this.def=ENEMIES[type]; this.alive=true; this.hp=this.def.hp; this.maxHp=this.def.hp; this.path=0; this.slow=1; this.x=PATH[0].x; this.y=PATH[0].y; this.group=scene.add.group(); this.draw(); }
  draw(){ const d=this.def,s=d.size; this.shadow=this.scene.add.ellipse(this.x,this.y+s*.8,s*2.6,s*.7,0x000000,.38); this.body=this.scene.add.ellipse(this.x,this.y,s*2.1,s*1.08,d.color).setStrokeStyle(2,0x0b130f); this.head=this.scene.add.circle(this.x+s,this.y-s*.25,s*.48,d.accent).setStrokeStyle(1,0x0b130f); this.mark=this.scene.add.rectangle(this.x-s*.2,this.y-s*.12,s*.95,3,d.accent,.55).setRotation(.08); this.nameTag=this.scene.add.text(this.x,this.y-s-30,d.name,{fontSize:'11px',color:'#eef7f0',backgroundColor:'#0008',padding:{x:3,y:1}}).setOrigin(.5).setAlpha(0); this.group.addMultiple([this.shadow,this.body,this.head,this.mark,this.nameTag]);
    if(d.shape==='raptor'||d.shape==='rex'){this.tail=this.scene.add.rectangle(this.x-s*1.05,this.y+s*.08,s*1.25,s*.25,d.color).setRotation(.16);this.group.add(this.tail);} if(d.shape==='trike'){this.h1=this.scene.add.rectangle(this.x+s*1.42,this.y-s*.18,s*.72,3,0xf4f0db).setRotation(.18);this.h2=this.scene.add.rectangle(this.x+s*1.42,this.y+s*.12,s*.72,3,0xf4f0db).setRotation(-.18);this.frill=this.scene.add.circle(this.x+s*.65,this.y,s*.7,d.accent,.35);this.group.addMultiple([this.frill,this.h1,this.h2]);} if(d.shape==='dilo'){this.frill=this.scene.add.circle(this.x+s*.55,this.y-s*.05,s*.9,d.accent,.45);this.group.add(this.frill);} if(d.shape==='rex'){this.label=this.scene.add.text(this.x,this.y+s*1.08,'REX',{fontSize:'15px',fontStyle:'bold',color:'#fff4e9'}).setOrigin(.5);this.group.add(this.label);} this.hpBg=this.scene.add.rectangle(this.x,this.y-s-14,60,6,0x111111); this.hpBar=this.scene.add.rectangle(this.x,this.y-s-14,60,6,0x9dff87); this.group.addMultiple([this.hpBg,this.hpBar]); this.body.setInteractive({useHandCursor:true}).on('pointerover',()=>this.nameTag.setAlpha(1)).on('pointerout',()=>this.nameTag.setAlpha(0)).on('pointerdown',()=>{this.nameTag.setAlpha(1);setTimeout(()=>this.nameTag?.setAlpha(0),1200);}); }
  damage(amount,slow){ if(!this.alive)return; this.hp-=amount; if(slow)this.slow=slow; this.scene.floatText(this.x,this.y-this.def.size-25,String(Math.round(amount)),0xfff2a8); if(this.hp<=0)this.kill(); }
  kill(){ if(!this.alive)return; this.alive=false; STATE.credits+=this.def.reward; this.scene.floatText(this.x,this.y-28,`+$${this.def.reward}`,0xffd86d); this.scene.pulse(this.x,this.y,0xf3ffb0,35); this.group.destroy(true); UI.render(); }
  breach(){ if(!this.alive)return; this.alive=false; STATE.lives-=this.def.damage; this.group.destroy(true); UI.log(`${this.def.name} breached the gate.`); if(STATE.lives<=0)this.scene.endGame(false); UI.render(); }
  update(delta){ const target=PATH[this.path+1]; if(!target){this.breach();return;} const move=this.def.speed*this.slow*(delta/1000)*STATE.speed; const angle=Phaser.Math.Angle.Between(this.x,this.y,target.x,target.y); const dist=Phaser.Math.Distance.Between(this.x,this.y,target.x,target.y); if(dist<=move){this.x=target.x; this.y=target.y; this.path++;} else {this.x+=Math.cos(angle)*move; this.y+=Math.sin(angle)*move;} this.slow=Math.min(1,this.slow+.004); this.position(); }
  position(){ const d=this.def,s=d.size; this.shadow.setPosition(this.x,this.y+s*.8); this.body.setPosition(this.x,this.y); this.head.setPosition(this.x+s,this.y-s*.25); this.mark.setPosition(this.x-s*.2,this.y-s*.12); this.nameTag.setPosition(this.x,this.y-s-30); if(this.tail)this.tail.setPosition(this.x-s*1.05,this.y+s*.08); if(this.frill)this.frill.setPosition(this.x+s*.55,this.y-s*.05); if(this.h1)this.h1.setPosition(this.x+s*1.42,this.y-s*.18); if(this.h2)this.h2.setPosition(this.x+s*1.42,this.y+s*.12); if(this.label)this.label.setPosition(this.x,this.y+s*1.08); const pct=Math.max(0,this.hp/this.maxHp); this.hpBg.setPosition(this.x,this.y-s-14); this.hpBar.setPosition(this.x-(60-60*pct)/2,this.y-s-14); this.hpBar.setSize(60*pct,6); }
}

class GameScene extends Phaser.Scene {
  constructor(){ super('main'); this.enemies=[]; this.towers=[]; this.pads=[]; }
  create(){ sceneRef=this; window.__JO_SCENE=this; this.drawMap(); this.createPads(); UI.render(); this.highlightPads(); window.__JO_READY=true; }
  update(time,delta){ if(STATE.paused||STATE.over)return; this.spawn(delta); this.enemies=this.enemies.filter(e=>e.alive); this.enemies.forEach(e=>e.update(delta)); this.towers.forEach(t=>t.update(delta,this.enemies)); if(STATE.active&&STATE.queue.length===0&&this.enemies.length===0)this.waveComplete(); }
  drawMap(){ this.add.rectangle(640,360,1280,720,0x17372c); for(let i=0;i<170;i++){this.add.circle(Phaser.Math.Between(0,1280),Phaser.Math.Between(0,720),Phaser.Math.Between(5,26),Phaser.Math.RND.pick([0x244e3d,0x2f5e48,0x173026,0x3b5b31]),Phaser.Math.FloatBetween(.2,.55));} for(let i=0;i<40;i++){this.add.rectangle(Phaser.Math.Between(0,1280),Phaser.Math.Between(0,720),Phaser.Math.Between(6,22),Phaser.Math.Between(4,12),0x2c2419,.22).setRotation(Phaser.Math.FloatBetween(0,3.14));} const g=this.add.graphics(); [[78,0x473b27,1],[60,0x6b583a,1],[44,0x9a8158,1],[3,0xe0c680,.22]].forEach(([w,c,a])=>{g.lineStyle(w,c,a);g.beginPath();g.moveTo(PATH[0].x,PATH[0].y);PATH.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.strokePath();}); this.add.rectangle(1170,500,124,144,0x243239).setStrokeStyle(4,0x7fffd0); this.add.rectangle(1170,500,86,102,0x101c1d,.4).setStrokeStyle(2,0xb5fff0,.5); this.add.text(1170,430,'EVAC\nGATE',{fontSize:'24px',align:'center',fontStyle:'bold'}).setOrigin(.5); this.add.text(24,24,'JUNGLE PERIMETER - CONTAINMENT BREACH',{fontSize:'24px',fontStyle:'bold',color:'#effff4'}); this.add.rectangle(640,360,1280,720,0x020605,.12); }
  createPads(){ PAD_POS.forEach(([x,y])=>{ const pad=this.add.circle(x,y,35,0x22362e).setStrokeStyle(5,0x95c9a5); pad.xp=x; pad.yp=y; pad.tower=null; pad.setInteractive({useHandCursor:true}); pad.on('pointerdown',()=>this.buildTower(pad)); pad.glow=this.add.circle(x,y,47,0x9cff7d,.04); pad.core=this.add.circle(x,y,10,0xa7ff8f,.72); this.pads.push(pad); }); }
  highlightPads(){ this.pads.forEach(p=>{ const affordable=STATE.credits>=TOWERS[STATE.type].cost&&!p.tower; p.setStrokeStyle(affordable?6:4,affordable?0xb8ff9d:0x547060); if(p.glow)p.glow.setAlpha(affordable?.12:.025); }); }
  buildTower(pad){ if(pad.tower||STATE.over)return; const def=TOWERS[STATE.type]; if(STATE.credits<def.cost){UI.log(`Need $${def.cost} for ${def.name}.`);return;} STATE.credits-=def.cost; const tower=new Tower(this,pad,STATE.type); pad.tower=tower; this.towers.push(tower); this.selectTower(tower); this.floatText(pad.xp,pad.yp-46,`${def.name} built`,0xa7ff8f); UI.log(`${def.name} built.`); UI.render(); this.highlightPads(); }
  selectTower(tower){ if(STATE.selected)STATE.selected.select(false); STATE.selected=tower; tower.select(true); UI.render(); }
  upgradeSelected(){ const tower=STATE.selected; if(!tower)return; const cost=tower.upgradeCost(); if(STATE.credits<cost||tower.level>=4)return; STATE.credits-=cost; tower.upgrade(); UI.log(`${tower.def.name} upgraded.`); UI.render(); this.highlightPads(); }
  sellSelected(){ const tower=STATE.selected; if(!tower)return; STATE.credits+=tower.sellValue(); tower.pad.tower=null; this.towers=this.towers.filter(t=>t!==tower); tower.destroy(); STATE.selected=null; UI.log('Tower sold.'); UI.render(); this.highlightPads(); }
  startWave(){ if(STATE.active||STATE.over||STATE.wave>=STATE.maxWaves)return; const def=WAVES[STATE.wave]; STATE.queue=[]; Object.entries(def).forEach(([type,count])=>{for(let i=0;i<count;i++)STATE.queue.push(type);}); Phaser.Utils.Array.Shuffle(STATE.queue); STATE.wave++; STATE.active=true; STATE.timer=0; if(STATE.wave===10)this.bossWarning(); UI.log(STATE.wave===STATE.maxWaves?'Boss wave incoming.':`Wave ${STATE.wave} incoming.`); UI.render(); }
  bossWarning(){ const bg=this.add.rectangle(640,110,680,76,0x3b120d,.88).setStrokeStyle(3,0xff886e); const tx=this.add.text(640,110,'⚠ REX ALPHA INBOUND ⚠',{fontSize:'34px',fontStyle:'bold',color:'#ffd1c4'}).setOrigin(.5); this.cameras.main.shake(700,.009); this.tweens.add({targets:[bg,tx],alpha:0,delay:1300,duration:700,onComplete:()=>{bg.destroy();tx.destroy();}}); }
  spawn(delta){ if(!STATE.active)return; STATE.timer-=delta*STATE.speed; if(STATE.timer>0||STATE.queue.length===0)return; const enemy=new Enemy(this,STATE.queue.shift()); this.enemies.push(enemy); if(enemy.type==='rex')this.cameras.main.shake(600,.008); STATE.timer=STATE.wave===STATE.maxWaves?430:650; }
  waveComplete(){ STATE.active=false; STATE.credits+=45+STATE.wave*8; if(STATE.wave>=STATE.maxWaves){this.endGame(true);return;} UI.log('Wave cleared. Start the next wave when ready.'); UI.render(); this.highlightPads(); }
  endGame(win){ STATE.over=true; STATE.active=false; UI.log(win?'Jungle Perimeter secured.':'Outpost overrun.'); this.add.rectangle(640,360,620,180,0x06100d,.9).setStrokeStyle(3,win?0xa7ff8f:0xff7760); this.add.text(640,340,win?'SECTOR SECURED':'CONTAINMENT FAILED',{fontSize:'44px',fontStyle:'bold',color:win?'#d9ffc1':'#ffb3a1'}).setOrigin(.5); UI.render(); }
  pulse(x,y,color,r){ const c=this.add.circle(x,y,8,color,.22).setStrokeStyle(2,color,.5); this.tweens.add({targets:c,radius:r,alpha:0,duration:340,onComplete:()=>c.destroy()}); }
  floatText(x,y,text,color){ const t=this.add.text(x,y,text,{fontSize:'13px',fontStyle:'bold',color:'#'+color.toString(16).padStart(6,'0')}).setOrigin(.5).setAlpha(.95); this.tweens.add({targets:t,y:y-24,alpha:0,duration:700,onComplete:()=>t.destroy()}); }
}

UI.init();
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1280,height:720,backgroundColor:'#12251d',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:GameScene});
