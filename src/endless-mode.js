(() => {
  const CAMPAIGN_WAVES = WAVES.length;
  const ENDLESS_CAP = 999;
  STATE.maxWaves = ENDLESS_CAP;

  function survivalLevelFor(nextWaveNumber) {
    return Math.max(0, nextWaveNumber - CAMPAIGN_WAVES);
  }

  function survivalWave(nextWaveNumber) {
    const level = survivalLevelFor(nextWaveNumber);
    const tier = Math.floor(level / 3);
    const bossWave = level > 0 && level % 5 === 0;
    const def = {
      compy: Math.min(42, 14 + level * 2),
      raptor: Math.min(26, 6 + level + tier),
      dilo: Math.min(18, Math.max(3, Math.floor(level * 0.8))),
      trike: Math.min(14, Math.max(2, Math.floor(level * 0.55)))
    };
    if (bossWave) def.rex = Math.min(3, 1 + Math.floor(level / 15));
    return def;
  }

  function ensureProgressShape() {
    if (!PROGRESS.survival) PROGRESS.survival = {};
    if (!PROGRESS.survival[STATE.mapId]) PROGRESS.survival[STATE.mapId] = { bestWave: 0, runs: 0 };
    return PROGRESS.survival[STATE.mapId];
  }

  function recordSurvivalProgress() {
    const level = survivalLevelFor(STATE.wave);
    if (level <= 0) return;
    const rec = ensureProgressShape();
    rec.bestWave = Math.max(rec.bestWave || 0, level);
    saveProgress();
  }

  const originalRender = UI.render.bind(UI);
  UI.render = function patchedRender() {
    originalRender();
    const survivalLevel = survivalLevelFor(STATE.wave);
    if (this.wave) this.wave.textContent = survivalLevel > 0 ? `S${survivalLevel}` : `${STATE.wave}/10`;
    if (this.status && survivalLevel > 0 && !STATE.over) this.status.textContent = STATE.activeWaves > 0 ? 'Survival' : 'Ready';
    if (this.start && !STATE.over) this.start.textContent = STATE.activeWaves > 0 ? 'LAUNCH NEXT SURVIVAL WAVE' : (survivalLevel > 0 ? 'START SURVIVAL WAVE' : 'START NEXT WAVE');
  };

  UI.renderPreview = function patchedPreview() {
    const nextWaveNumber = STATE.wave + 1;
    const survivalLevel = survivalLevelFor(nextWaveNumber);
    const def = survivalLevel > 0 ? survivalWave(nextWaveNumber) : WAVES[Math.min(STATE.wave, WAVES.length - 1)];
    if (this.previewTitle) this.previewTitle.textContent = survivalLevel > 0 ? `Survival Wave ${survivalLevel}` : `Next: Wave ${nextWaveNumber}`;
    if (!this.previewList) return;
    this.previewList.innerHTML = '';
    Object.entries(def || {}).forEach(([type, count]) => {
      const span = document.createElement('span');
      span.className = 'pill ' + (type === 'rex' ? 'boss' : '');
      span.textContent = `${ENEMIES[type].name} x${count}${survivalLevel > 0 ? ' · escalating' : ' · tougher'}`;
      this.previewList.appendChild(span);
    });
    const rec = ensureProgressShape();
    if (this.previewHint) {
      this.previewHint.textContent = survivalLevel > 0
        ? `Endless mode. Best on this map: S${rec.bestWave || 0}. Enemy caps protect mobile performance.`
        : `${nextUnlockText()} Clear Wave 10 to enter Endless Survival.`;
    }
  };

  UI.renderProgress = function patchedProgress() {
    if (this.sectorName) this.sectorName.textContent = `${mapName()} · ${mapConfig().label}`;
    if (this.bestWave) {
      const rec = ensureProgressShape();
      this.bestWave.textContent = `${PROGRESS.bestWave || 0} / S${rec.bestWave || 0}`;
    }
    if (this.eliteKills) this.eliteKills.textContent = PROGRESS.eliteKills || 0;
    this.renderMaps();
  };

  function markCampaignComplete() {
    if (!PROGRESS.stars) PROGRESS.stars = {};
    if (!PROGRESS.unlocked) PROGRESS.unlocked = ['jungle'];
    if (!PROGRESS.unlocked.includes('canyon')) PROGRESS.unlocked.push('canyon');
    if (!PROGRESS.unlocked.includes('marsh')) PROGRESS.unlocked.push('marsh');
    PROGRESS.stars[STATE.mapId] = Math.max(PROGRESS.stars[STATE.mapId] || 0, rating());
    saveProgress();
  }

  GameScene.prototype.startWave = function patchedStartWave() {
    if (STATE.over) return;
    const nextWaveNumber = STATE.wave + 1;
    const survivalLevel = survivalLevelFor(nextWaveNumber);
    const def = survivalLevel > 0 ? survivalWave(nextWaveNumber) : WAVES[STATE.wave];
    if (!def) return;
    Object.entries(def).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) STATE.queue.push(type);
    });
    Phaser.Utils.Array.Shuffle(STATE.queue);
    STATE.wave++;
    STATE.active = true;
    STATE.activeWaves++;
    STATE.timer = Math.min(STATE.timer, 0);
    updateProgress();
    recordSurvivalProgress();
    if (STATE.wave === 6) UI.log('Elite variants now detected.');
    if (STATE.wave === 10 || survivalLevel % 5 === 0) this.bossWarning();
    UI.log(survivalLevel > 0 ? `Survival Wave ${survivalLevel} launched.` : `Wave ${STATE.wave} launched.`);
    UI.render();
  };

  GameScene.prototype.allWavesComplete = function patchedAllWavesComplete() {
    STATE.active = false;
    STATE.activeWaves = 0;
    const survivalLevel = survivalLevelFor(STATE.wave);
    STATE.credits += survivalLevel > 0 ? 75 + survivalLevel * 12 + STATE.elitesDefeated * 5 : 45 + STATE.wave * 8 + STATE.elitesDefeated * 5;
    updateProgress();
    if (STATE.wave >= CAMPAIGN_WAVES) {
      markCampaignComplete();
      recordSurvivalProgress();
      UI.log(survivalLevel > 0 ? `Survival Wave ${survivalLevel} cleared. Best saved.` : 'Campaign cleared. Endless Survival unlocked.');
    } else {
      UI.log(`Area clear. ${nextUnlockText()} Elite takedowns: ${STATE.elitesDefeated}.`);
    }
    UI.render();
    this.highlightPads();
  };
})();
