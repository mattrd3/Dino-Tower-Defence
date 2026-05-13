(() => {
  if (typeof Phaser === 'undefined') return;

  const rim = 0xffffff;
  const dark = 0x07100d;
  const metal = 0x40584d;
  const glow = 0xa7ff8f;

  function addPart(list, item) {
    if (item) list.push(item);
    return item;
  }

  function addFin(scene, x, y, size, color, flip = 1) {
    return scene.add.triangle(x, y, 0, size, size * 1.2, 0, size * 1.5, size * 1.4, color, 0.9)
      .setRotation(flip > 0 ? -0.4 : 0.4)
      .setStrokeStyle(1, dark, 0.45);
  }

  function addTowerBolts(scene, parts, x, y, color) {
    [[-18, -11], [18, -11], [-18, 13], [18, 13]].forEach(([dx, dy]) => {
      addPart(parts, scene.add.circle(x + dx, y + dy, 3, color, 0.85).setStrokeStyle(1, dark, 0.55));
    });
  }

  function addUpgradeRing(scene, parts, x, y, color) {
    addPart(parts, scene.add.circle(x, y, 38, color, 0.05).setStrokeStyle(2, color, 0.24));
    addPart(parts, scene.add.circle(x, y, 45, color, 0.02).setStrokeStyle(1, color, 0.16));
  }

  function installTowerVisuals() {
    if (typeof Tower === 'undefined' || Tower.__visualOverhaul) return;
    Tower.__visualOverhaul = true;

    Tower.prototype.draw = function visualTowerDraw() {
      this.parts = [];
      const scene = this.scene;
      const x = this.x, y = this.y;
      const c = this.def.color;
      const b = this.def.barrel || 0xffffff;

      addPart(this.parts, scene.add.ellipse(x, y + 24, 78, 23, 0x000000, 0.36));
      addPart(this.parts, scene.add.circle(x, y + 3, 36, 0x17251f).setStrokeStyle(4, c, 0.9));
      addPart(this.parts, scene.add.circle(x, y + 3, 27, 0x0c1713).setStrokeStyle(2, rim, 0.18));
      addPart(this.parts, scene.add.rectangle(x, y + 24, 42, 13, metal, 0.85).setStrokeStyle(2, dark, 0.45));
      addUpgradeRing(scene, this.parts, x, y, c);
      addTowerBolts(scene, this.parts, x, y, b);

      if (this.type === 'ranger') {
        this.turret = addPart(this.parts, scene.add.rectangle(x, y - 12, 22, 48, c, 0.95).setStrokeStyle(3, b, 0.8));
        this.barrel = addPart(this.parts, scene.add.rectangle(x + 22, y - 27, 48, 8, b, 0.98).setStrokeStyle(1, dark, 0.5));
        addPart(this.parts, scene.add.circle(x - 10, y - 25, 7, 0x102019).setStrokeStyle(2, b, 0.7));
        addPart(this.parts, scene.add.rectangle(x + 47, y - 27, 9, 13, 0xeafaff, 0.86));
      }

      if (this.type === 'cannon') {
        this.turret = addPart(this.parts, scene.add.rectangle(x, y - 2, 54, 34, c, 0.96).setStrokeStyle(3, b, 0.75));
        this.barrel = addPart(this.parts, scene.add.rectangle(x + 31, y - 14, 58, 16, b, 0.96).setRotation(-0.18).setStrokeStyle(2, dark, 0.55));
        addPart(this.parts, scene.add.circle(x - 18, y - 4, 9, 0x2b2118).setStrokeStyle(2, 0xffe0b8, 0.6));
        addPart(this.parts, scene.add.circle(x + 55, y - 22, 11, 0xffefd4, 0.28));
      }

      if (this.type === 'cryo') {
        this.turret = addPart(this.parts, scene.add.circle(x, y - 7, 24, c, 0.94).setStrokeStyle(4, b, 0.8));
        this.barrel = addPart(this.parts, scene.add.circle(x, y - 7, 11, 0xffffff, 0.82));
        addPart(this.parts, scene.add.circle(x, y - 7, 37, c, 0.08).setStrokeStyle(2, b, 0.22));
        addPart(this.parts, scene.add.rectangle(x - 25, y - 7, 22, 8, b, 0.55).setRotation(0.35));
        addPart(this.parts, scene.add.rectangle(x + 25, y - 7, 22, 8, b, 0.55).setRotation(-0.35));
      }

      this.rangeCircle = addPart(this.parts, scene.add.circle(x, y, this.range, 0xffffff, 0.035).setStrokeStyle(1, 0xffffff, 0.12).setVisible(false));
      this.levelBadge = addPart(this.parts, scene.add.text(x, y + 42, 'L1', { fontSize: '13px', fontStyle: 'bold', color: '#eef7f0', backgroundColor: '#0008', padding: { x: 5, y: 2 } }).setOrigin(0.5));
      this.parts.forEach(p => p?.setInteractive?.({ useHandCursor: true }).on('pointerdown', () => this.scene.selectTower(this)));
    };

    const originalUpgrade = Tower.prototype.upgrade;
    Tower.prototype.upgrade = function visualUpgrade() {
      originalUpgrade.call(this);
      if (this.levelBadge) this.levelBadge.setText(this.level >= 5 ? 'MAX' : `L${this.level}`);
      if (this.base) this.base.setScale(1 + this.level * 0.03);
      this.scene.tweens.add({ targets: this.parts.filter(Boolean), scaleX: '+=0.035', scaleY: '+=0.035', yoyo: true, duration: 110 });
    };

    const originalFire = Tower.prototype.fire;
    Tower.prototype.fire = function visualFire(target, enemies) {
      if (this.barrel) {
        this.scene.tweens.add({ targets: this.barrel, scaleX: 0.84, yoyo: true, duration: 80 });
      }
      originalFire.call(this, target, enemies);
    };
  }

  function installEnemyVisuals() {
    if (typeof Enemy === 'undefined' || Enemy.__visualOverhaul) return;
    Enemy.__visualOverhaul = true;

    Enemy.prototype.draw = function visualEnemyDraw() {
      const d = this.def;
      const s = d.size * (this.elite ? 1.14 : 1);
      const scene = this.scene;
      const x = this.x, y = this.y;
      this.group = scene.add.group();
      this.visualParts = [];

      const add = item => { this.visualParts.push(item); this.group.add(item); return item; };
      this.shadow = add(scene.add.ellipse(x, y + s * 0.82, s * 3.05, s * 0.78, 0x000000, 0.38));
      this.tail = add(scene.add.ellipse(x - s * 1.15, y + s * 0.05, s * 1.45, s * 0.38, d.color, 0.92).setRotation(0.12).setStrokeStyle(1, dark, 0.5));
      this.body = add(scene.add.ellipse(x, y, s * 2.3, s * 1.14, d.color, 0.96).setStrokeStyle(this.elite ? 4 : 2, this.elite ? 0xffd86d : dark, 0.92));
      this.belly = add(scene.add.ellipse(x + s * 0.08, y + s * 0.18, s * 1.25, s * 0.35, d.accent, 0.22));
      this.neck = add(scene.add.rectangle(x + s * 0.72, y - s * 0.22, s * 0.75, s * 0.34, d.color, 0.88).setRotation(-0.22).setStrokeStyle(1, dark, 0.35));
      this.head = add(scene.add.ellipse(x + s * 1.25, y - s * 0.38, s * 0.9, s * 0.58, d.accent, 0.96).setStrokeStyle(1, dark, 0.65));
      this.eye = add(scene.add.circle(x + s * 1.48, y - s * 0.47, Math.max(2, s * 0.07), 0x06100d, 0.95));
      this.jaw = add(scene.add.rectangle(x + s * 1.54, y - s * 0.28, s * 0.45, s * 0.08, 0xf6e8c8, 0.8).setRotation(0.1));
      this.mark = add(scene.add.rectangle(x - s * 0.18, y - s * 0.2, s * 1.12, 4, d.accent, 0.52).setRotation(0.08));
      this.legA = add(scene.add.rectangle(x - s * 0.35, y + s * 0.55, s * 0.24, s * 0.8, d.color, 0.86).setRotation(0.18));
      this.legB = add(scene.add.rectangle(x + s * 0.45, y + s * 0.54, s * 0.22, s * 0.72, d.color, 0.78).setRotation(-0.12));

      if (d.shape === 'trike') {
        this.frill = add(scene.add.ellipse(x + s * 0.8, y - s * 0.35, s * 1.05, s * 0.9, d.accent, 0.5).setStrokeStyle(2, 0xf4f0db, 0.45));
        this.h1 = add(scene.add.triangle(x + s * 1.72, y - s * 0.48, 0, 0, s * 0.85, -s * 0.1, 0, s * 0.12, 0xf4f0db, 0.95));
        this.h2 = add(scene.add.triangle(x + s * 1.70, y - s * 0.17, 0, 0, s * 0.72, -s * 0.08, 0, s * 0.1, 0xf4f0db, 0.95));
      }
      if (d.shape === 'dilo') {
        this.frill = add(scene.add.circle(x + s * 0.95, y - s * 0.38, s * 0.66, d.accent, 0.38).setStrokeStyle(2, 0xffd6ff, 0.45));
      }
      if (d.shape === 'raptor' || d.shape === 'rex') {
        this.claw = add(scene.add.triangle(x + s * 0.55, y + s * 0.16, 0, 0, s * 0.35, s * 0.18, s * 0.1, s * 0.38, 0xf6e8c8, 0.82).setRotation(0.4));
      }
      if (d.shape === 'rex') {
        this.spikeA = addFin(scene, x - s * 0.32, y - s * 0.62, s * 0.22, d.accent, 1));
        this.spikeB = addFin(scene, x + s * 0.24, y - s * 0.68, s * 0.2, d.accent, 1));
        this.group.addMultiple([this.spikeA, this.spikeB]);
      }
      if (this.elite) add(scene.add.circle(x, y, s * 1.55, 0xffd86d, 0.08).setStrokeStyle(2, 0xffd86d, 0.18));

      this.nameTag = add(scene.add.text(x, y - s - 33, `${d.name} · ${formatResist(this.base)}`, { fontSize: '11px', color: '#eef7f0', backgroundColor: '#0008', padding: { x: 3, y: 1 } }).setOrigin(0.5).setAlpha(0));
      this.hpBg = add(scene.add.rectangle(x, y - s - 16, 62, 7, 0x111111));
      this.hpBar = add(scene.add.rectangle(x, y - s - 16, 62, 7, this.elite ? 0xffd86d : 0x9dff87));

      this.body.setInteractive({ useHandCursor: true }).on('pointerover', () => this.nameTag.setAlpha(1)).on('pointerout', () => this.nameTag.setAlpha(0)).on('pointerdown', () => { this.nameTag.setAlpha(1); setTimeout(() => this.nameTag?.setAlpha(0), 1200); });
      this.drawSize = s;
    };

    Enemy.prototype.position = function visualEnemyPosition() {
      const s = this.drawSize;
      const x = this.x, y = this.y;
      const bob = Math.sin((performance.now() / 130) + this.path) * 2;
      const leg = Math.sin(performance.now() / 95) * 0.22;
      this.shadow?.setPosition(x, y + s * 0.82);
      this.tail?.setPosition(x - s * 1.15, y + s * 0.05 + bob * 0.2).setRotation(0.12 + bob * 0.025);
      this.body?.setPosition(x, y + bob * 0.25);
      this.belly?.setPosition(x + s * 0.08, y + s * 0.18 + bob * 0.25);
      this.neck?.setPosition(x + s * 0.72, y - s * 0.22 + bob * 0.25);
      this.head?.setPosition(x + s * 1.25, y - s * 0.38 + bob * 0.35);
      this.eye?.setPosition(x + s * 1.48, y - s * 0.47 + bob * 0.35);
      this.jaw?.setPosition(x + s * 1.54, y - s * 0.28 + bob * 0.35);
      this.mark?.setPosition(x - s * 0.18, y - s * 0.2 + bob * 0.2);
      this.legA?.setPosition(x - s * 0.35, y + s * 0.55).setRotation(0.18 + leg);
      this.legB?.setPosition(x + s * 0.45, y + s * 0.54).setRotation(-0.12 - leg);
      this.frill?.setPosition(x + s * 0.9, y - s * 0.35 + bob * 0.3);
      this.h1?.setPosition(x + s * 1.72, y - s * 0.48 + bob * 0.3);
      this.h2?.setPosition(x + s * 1.70, y - s * 0.17 + bob * 0.3);
      this.claw?.setPosition(x + s * 0.55, y + s * 0.16 + bob * 0.2);
      this.spikeA?.setPosition(x - s * 0.32, y - s * 0.62 + bob * 0.2);
      this.spikeB?.setPosition(x + s * 0.24, y - s * 0.68 + bob * 0.2);
      this.nameTag?.setPosition(x, y - s - 33);
      const pct = Math.max(0, this.hp / this.maxHp);
      this.hpBg?.setPosition(x, y - s - 16);
      this.hpBar?.setPosition(x - (62 - 62 * pct) / 2, y - s - 16).setSize(62 * pct, 7);
    };
  }

  function installAtmosphere() {
    const tryInstall = () => {
      if (typeof sceneRef === 'undefined' || !sceneRef || sceneRef.__visualAtmosphere) return false;
      sceneRef.__visualAtmosphere = true;
      for (let i = 0; i < 28; i++) {
        const mote = sceneRef.add.circle(Phaser.Math.Between(0, 1280), Phaser.Math.Between(0, 720), Phaser.Math.Between(2, 7), 0xdfffe9, Phaser.Math.FloatBetween(0.025, 0.08));
        mote.setDepth(20);
        sceneRef.tweens.add({ targets: mote, x: mote.x + Phaser.Math.Between(-80, 120), y: mote.y + Phaser.Math.Between(-30, 50), alpha: Phaser.Math.FloatBetween(0.02, 0.12), duration: Phaser.Math.Between(2600, 5200), repeat: -1, yoyo: true });
      }
      return true;
    };
    if (!tryInstall()) {
      const timer = setInterval(() => { if (tryInstall()) clearInterval(timer); }, 200);
      setTimeout(() => clearInterval(timer), 6000);
    }
  }

  installTowerVisuals();
  installEnemyVisuals();
  installAtmosphere();
})();
