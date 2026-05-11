(() => {
  const SETTINGS_KEY = 'jurassic-outpost-settings-v1';
  const PROGRESS_KEY = 'jurassic-outpost-progress-v1';
  const $ = id => document.getElementById(id);

  const defaults = { audioEnabled: true };
  const loadSettings = () => {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) }; }
    catch { return { ...defaults }; }
  };
  const saveSettings = settings => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  const settings = loadSettings();

  let audioCtx = null;
  let lastSoundAt = 0;

  function ensureAudio() {
    if (!settings.audioEnabled) return null;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq = 440, duration = 0.08, type = 'sine', volume = 0.04, slideTo = null) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function play(name) {
    if (!settings.audioEnabled) return;
    const now = Date.now();
    if (now - lastSoundAt < 45 && name !== 'boss') return;
    lastSoundAt = now;
    if (name === 'tap') tone(520, 0.045, 'triangle', 0.025);
    else if (name === 'build') { tone(420, 0.06, 'square', 0.025); setTimeout(() => tone(650, 0.06, 'triangle', 0.025), 55); }
    else if (name === 'upgrade') { tone(620, 0.07, 'triangle', 0.035); setTimeout(() => tone(920, 0.08, 'triangle', 0.03), 70); }
    else if (name === 'sell') tone(260, 0.09, 'sawtooth', 0.025, 180);
    else if (name === 'wave') { tone(330, 0.09, 'square', 0.035); setTimeout(() => tone(495, 0.12, 'square', 0.03), 90); }
    else if (name === 'boss') { tone(120, 0.22, 'sawtooth', 0.05, 80); setTimeout(() => tone(95, 0.28, 'sawtooth', 0.04, 70), 180); }
    else if (name === 'clear') { tone(700, 0.08, 'triangle', 0.035); setTimeout(() => tone(980, 0.12, 'triangle', 0.035), 80); }
    else if (name === 'damage') tone(180, 0.08, 'sawtooth', 0.022, 130);
  }

  function progressSummary() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(PROGRESS_KEY)); } catch {}
    if (!p) return 'No saved progress yet.';
    const stars = Object.entries(p.stars || {}).map(([map, count]) => `${map}: ${'★'.repeat(count) || '0'}`).join(' · ') || 'No map stars yet';
    const unlocked = (p.unlocked || ['jungle']).join(', ');
    return `Best wave: ${p.bestWave || 0}\nElite kills: ${p.eliteKills || 0}\nCurrent map: ${p.currentMap || 'jungle'}\nUnlocked: ${unlocked}\nStars: ${stars}`;
  }

  function injectPanel() {
    if ($('settingsPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'settingsPanel';
    panel.className = 'settingsPanel hidden';
    panel.innerHTML = `
      <div class="settingsCard">
        <div class="settingsHeader"><strong>Settings</strong><button id="settingsClose" type="button">×</button></div>
        <button id="settingsAudio" type="button">Audio On</button>
        <div class="settingsLabel">Saved Progress</div>
        <pre id="progressSummary"></pre>
        <button id="clearProgress" type="button" class="danger">Clear Saved Progress</button>
      </div>`;
    document.body.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = `
      .settingsPanel{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:#0008;padding:16px}.settingsPanel.hidden{display:none}
      .settingsCard{width:min(420px,94vw);background:linear-gradient(180deg,#14251f,#08110d);border:1px solid #456553;border-radius:18px;padding:14px;color:#eef7f0;box-shadow:0 24px 70px #000c}
      .settingsHeader{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.settingsHeader strong{font-size:20px}.settingsHeader button{width:36px;height:36px;border-radius:999px;border:1px solid #456553;background:#20362d;color:#eef7f0;font-size:22px}
      #settingsAudio,#clearProgress{width:100%;padding:11px;border-radius:12px;border:1px solid #456553;background:#1a2a23;color:#eef7f0;font-weight:800;margin:6px 0}.settingsLabel{margin:12px 0 6px;color:#97f27a;font-size:11px;text-transform:uppercase;letter-spacing:.12em}
      #progressSummary{white-space:pre-wrap;background:#07100d;border:1px solid #355145;border-radius:12px;padding:10px;color:#cfe4d6;font:12px/1.4 system-ui;margin:0 0 8px}.danger{border-color:#ff886e!important;color:#ffd1c4!important}
      @media(max-width:900px){.settingsCard{padding:12px}.settingsHeader strong{font-size:17px}#progressSummary{font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function render() {
    const audioBtn = $('audioBtn');
    const settingsAudio = $('settingsAudio');
    const label = settings.audioEnabled ? 'Audio On' : 'Audio Off';
    if (audioBtn) audioBtn.textContent = label;
    if (settingsAudio) settingsAudio.textContent = label;
    const summary = $('progressSummary');
    if (summary) summary.textContent = progressSummary();
  }

  function toggleAudio() {
    settings.audioEnabled = !settings.audioEnabled;
    saveSettings(settings);
    render();
    if (settings.audioEnabled) play('clear');
  }

  function attach() {
    injectPanel();
    render();
    $('audioBtn')?.addEventListener('click', () => { toggleAudio(); play('tap'); });
    $('settingsBtn')?.addEventListener('click', () => { $('settingsPanel')?.classList.remove('hidden'); render(); play('tap'); });
    $('settingsClose')?.addEventListener('click', () => { $('settingsPanel')?.classList.add('hidden'); play('tap'); });
    $('settingsAudio')?.addEventListener('click', toggleAudio);
    $('clearProgress')?.addEventListener('click', () => {
      if (!confirm('Clear saved progress and reload the game?')) return;
      localStorage.removeItem(PROGRESS_KEY);
      play('damage');
      setTimeout(() => location.reload(), 150);
    });

    document.querySelectorAll('button,.towerCard,.pill').forEach(node => node.addEventListener('pointerdown', () => play('tap')));
    $('startWave')?.addEventListener('click', () => {
      const wave = $('wave')?.textContent || '';
      if (wave.startsWith('9/') || wave.startsWith('10/')) play('boss'); else play('wave');
    });
    $('upgradeBtn')?.addEventListener('click', () => { if (!$('upgradeBtn')?.disabled) play('upgrade'); });
    $('sellBtn')?.addEventListener('click', () => { if (!$('sellBtn')?.disabled) play('sell'); });

    const log = $('log');
    if (log) {
      let last = log.textContent;
      new MutationObserver(() => {
        const next = log.textContent || '';
        if (next === last) return;
        last = next;
        if (/built/i.test(next)) play('build');
        if (/upgraded/i.test(next)) play('upgrade');
        if (/breached|overrun|failed/i.test(next)) play('damage');
        if (/secured|area clear/i.test(next)) play('clear');
      }).observe(log, { childList: true, characterData: true, subtree: true });
    }
  }

  window.JOSettingsSound = { play, settings };
  window.addEventListener('DOMContentLoaded', attach);
})();
