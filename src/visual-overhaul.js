(() => {
  try {
    if (typeof Phaser === 'undefined') return;

    const dark = 0x07100d;
    const rim = 0xffffff;

    function safe(fn) {
      try { return fn(); } catch (err) { console.warn('[visual-overhaul]', err?.message || err); }
    }

    function addToGroup(group, item) {
      if (!item) return item;
      try { group?.add?.(item); } catch {}
      return item;
    }

    function installTowerDecorators() {
      if (typeof Tower === 'undefined' || Tower.__safeVisualOverhaul) return;
      Tower.__safeVisualOverhaul = true;
      const originalDraw = Tower.prototype.draw;
      const originalFire = Tower.prototype.fire;
      const originalUpgrade = Tower.prototype.upgrade;

      Tower.prototype.draw = function visualDrawWrapper() {
        originalDraw.call(this);
        safe(() => {
          const scene = this.scene;
          const x = this.x, y = this.y;
          const color = this.def.color;
          const barrel = this.def.barrel || rim;
          this.parts = this.parts || [];

          const shadow = scene.add.ellipse(x, y + 26, 82, 24, 0x000000, 0.22);
          const ring = scene.add.circle(x, y, 42, color, 0.035).setStrokeStyle(2, color, 0.2);
          const core = scene.add.circle(x, y - 2, 8, barrel, 0.75).setStrokeStyle(1, dark, 0.45);
          const plate = scene.add.rectangle(x, y + 23, 44, 10, 0x40584d, 0.7).setStrokeStyle(1, dark, 0.4);
          this.parts.push(shadow, ring, core, plate);
          this.visualCore = core;

          if (this.type === 'ranger') {
            this.parts.push(scene.add.rectangle(x + 42, y - 20, 13, 11, 0xeafaff, 0.76).setStrokeStyle(1, dark, 0.35));
            this.parts.push(scene.add.circle(x - 11, y - 24, 6, 0x102019, 0.9).setStrokeStyle(2, barrel, 0.6));
          }
          if (this.type === 'cannon') {
            this.parts.push(scene.add.circle(x + 48, y - 19, 14, 0xffefd4, 0.18).setStrokeStyle(1, barrel, 0.25));
            this.parts.push(scene.add.rectangle(x - 18, y - 5, 18, 12, 0x2b2118, 0.62).setStrokeStyle(1, barrel, 0.4));
          }
          if (this.type === 'cryo') {
            this.parts.push(scene.add.circle(x, y - 5, 38, color, 0.07).setStrokeStyle(2, barrel, 0.2));
            this.parts.push(scene.add.rectangle(x - 25, y - 6, 20, 7, barrel, 0.42).setRotation(0.35));
            this.parts.push(scene.add.rectangle(x + 25, y - 6, 20, 7, barrel, 0.42).setRotation(-0.35));
          }
        });
      };

      Tower.prototype.fire = function visualFireWrapper(target, enemies) {
        safe(() => {
          if (this.barrel) this.scene.tweens.add({ targets: this.barrel, scaleX: 0.84, yoyo: true, duration: 80 });
          if (this.visualCore) this.scene.tweens.add({ targets: this.visualCore, scale: 1.35, alpha: 1, yoyo: true, duration: 90 });
        });
        return originalFire.call(this, target, enemies);
      };

      Tower.prototype.upgrade = function visualUpgradeWrapper() {
        const result = originalUpgrade.call(this);
        safe(() => {
          if (this.levelBadge) this.levelBadge.setText(this.level >= 5 ? 'MAX' : `L${this.level}`);
          this.scene.tweens.add({ targets: (this.parts || []).filter(Boolean), scaleX: '+=0.025', scaleY: '+=0.025', yoyo: true, duration: 120 });
        });
        return result;
      };
    }

    function installEnemyDecorators() {
      if (typeof Enemy === 'undefined' || Enemy.__safeVisualOverhaul) return;
      Enemy.__safeVisualOverhaul = true;
      const originalDraw = Enemy.prototype.draw;
      const originalPosition = Enemy.prototype.position;

      Enemy.prototype.draw = function visualEnemyDrawWrapper() {
        originalDraw.call(this);
        safe(() => {
          const s = this.drawSize || this.def.size || 16;
          const scene = this.scene;
          const d = this.def;
          const x = this.x, y = this.y;
          const extras = {};

          extras.belly = addToGroup(this.group, scene.add.ellipse(x + s * 0.05, y + s * 0.18, s * 1.15, s * 0.34, d.accent, 0.2));
          extras.eye = addToGroup(this.group, scene.add.circle(x + s * 1.1, y - s * 0.45, Math.max(2, s * 0.07), dark, 0.95));
          extras.jaw = addToGroup(this.group, scene.add.rectangle(x + s * 1.18, y - s * 0.25, s * 0.38, s * 0.08, 0xf6e8c8, 0.75).setRotation(0.1));
          extras.legA = addToGroup(this.group, scene.add.rectangle(x - s * 0.34, y + s * 0.58, s * 0.18, s * 0.55, d.color, 0.72).setRotation(0.12));
          extras.legB = addToGroup(this.group, scene.add.rectangle(x + s * 0.38, y + s * 0.56, s * 0.18, s * 0.52, d.color, 0.62).setRotation(-0.12));

          if (d.shape === 'trike') {
            extras.crest = addToGroup(this.group, scene.add.ellipse(x + s * 0.72, y - s * 0.18, s * 0.8, s * 0.62, d.accent, 0.28).setStrokeStyle(1, 0xf4f0db, 0.35));
          }
          if (d.shape === 'dilo') {
            extras.frillGlow = addToGroup(this.group, scene.add.circle(x + s * 0.65, y - s * 0.08, s * 0.78, d.accent, 0.18).setStrokeStyle(1, 0xffd6ff, 0.3));
          }
          if (d.shape === 'raptor' || d.shape === 'rex') {
            extras.claw = addToGroup(this.group, scene.add.triangle(x + s * 0.55, y + s * 0.12, 0, 0, s * 0.32, s * 0.14, s * 0.08, s * 0.32, 0xf6e8c8, 0.72).setRotation(0.35));
          }
          if (this.elite) {
            extras.eliteAura = addToGroup(this.group, scene.add.circle(x, y, s * 1.5, 0xffd86d, 0.055).setStrokeStyle(2, 0xffd86d, 0.14));
          }
          this.visualExtras = extras;
        });
      };

      Enemy.prototype.position = function visualEnemyPositionWrapper() {
        originalPosition.call(this);
        safe(() => {
          const e = this.visualExtras;
          if (!e) return;
          const s = this.drawSize || this.def.size || 16;
          const x = this.x, y = this.y;
          const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
          const bob = Math.sin(now / 130 + this.path) * 2;
          const leg = Math.sin(now / 95) * 0.18;
          e.belly?.setPosition(x + s * 0.05, y + s * 0.18 + bob * 0.2);
          e.eye?.setPosition(x + s * 1.1, y - s * 0.45 + bob * 0.25);
          e.jaw?.setPosition(x + s * 1.18, y - s * 0.25 + bob * 0.25);
          e.legA?.setPosition(x - s * 0.34, y + s * 0.58).setRotation(0.12 + leg);
          e.legB?.setPosition(x + s * 0.38, y + s * 0.56).setRotation(-0.12 - leg);
          e.crest?.setPosition(x + s * 0.72, y - s * 0.18 + bob * 0.2);
          e.frillGlow?.setPosition(x + s * 0.65, y - s * 0.08 + bob * 0.2);
          e.claw?.setPosition(x + s * 0.55, y + s * 0.12 + bob * 0.1);
          e.eliteAura?.setPosition(x, y + bob * 0.12);
        });
      };
    }

    function installAtmosphere() {
      const tryInstall = () => safe(() => {
        const scene = window.__JO_SCENE;
        if (!scene || scene.__visualAtmosphere) return false;
        scene.__visualAtmosphere = true;
        for (let i = 0; i < 18; i++) {
          const mote = scene.add.circle(Phaser.Math.Between(0, 1280), Phaser.Math.Between(0, 720), Phaser.Math.Between(2, 6), 0xdfffe9, Phaser.Math.FloatBetween(0.025, 0.065));
          mote.setDepth(20);
          scene.tweens.add({ targets: mote, x: mote.x + Phaser.Math.Between(-70, 100), y: mote.y + Phaser.Math.Between(-25, 45), alpha: Phaser.Math.FloatBetween(0.02, 0.1), duration: Phaser.Math.Between(2800, 5400), repeat: -1, yoyo: true });
        }
        return true;
      });

      if (!tryInstall()) {
        const timer = setInterval(() => { if (tryInstall()) clearInterval(timer); }, 250);
        setTimeout(() => clearInterval(timer), 6000);
      }
    }

    installTowerDecorators();
    installEnemyDecorators();
    installAtmosphere();
  } catch (err) {
    console.warn('[visual-overhaul disabled]', err?.message || err);
  }
})();
