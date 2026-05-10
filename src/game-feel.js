(() => {
  const $ = id => document.getElementById(id);
  const pulse = (el, cls = 'feel-pulse') => {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  function watchNumber(id, cls) {
    const el = $(id);
    if (!el) return;
    let last = el.textContent;
    new MutationObserver(() => {
      if (el.textContent !== last) {
        last = el.textContent;
        pulse(el.closest('.stat') || el, cls);
      }
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }

  function toast(text, tone = 'good') {
    const box = document.createElement('div');
    box.className = `feel-toast ${tone}`;
    box.textContent = text;
    document.body.appendChild(box);
    setTimeout(() => box.classList.add('show'), 20);
    setTimeout(() => box.classList.remove('show'), 1400);
    setTimeout(() => box.remove(), 1900);
  }

  function attachButtonFeel() {
    document.querySelectorAll('button,.towerCard,.pill').forEach(el => {
      el.addEventListener('pointerdown', () => pulse(el, 'feel-tap'));
    });
  }

  function attachWaveFeel() {
    const start = $('startWave');
    if (!start) return;
    start.addEventListener('click', () => {
      pulse(document.body, 'feel-wave');
      toast(start.textContent.includes('EARLY') ? 'Next wave launched early' : 'Wave launched', 'wave');
    });
  }

  function attachUpgradeFeel() {
    const upgrade = $('upgradeBtn');
    const sell = $('sellBtn');
    if (upgrade) upgrade.addEventListener('click', () => {
      if (!upgrade.disabled) toast('Tower upgraded', 'good');
    });
    if (sell) sell.addEventListener('click', () => {
      if (!sell.disabled) toast('Tower sold', 'warn');
    });
  }

  function attachStatusFeel() {
    const status = $('status');
    if (!status) return;
    let last = status.textContent;
    new MutationObserver(() => {
      const next = status.textContent;
      if (next === last) return;
      last = next;
      if (/breach/i.test(next)) toast('Dinosaurs incoming', 'danger');
      if (/secured/i.test(next)) toast('Sector secured', 'good');
    }).observe(status, { childList: true, characterData: true, subtree: true });
  }

  function injectFeelStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .feel-pulse{animation:feelPulse .38s ease both}.feel-tap{animation:feelTap .18s ease both}.feel-wave #game{animation:feelWave .32s ease both}
      .towerCard.active{filter:saturate(1.25)}.towerCard:not(.active):hover,.pill:hover{transform:translateY(-1px)}
      .feel-toast{position:fixed;left:50%;top:14px;z-index:40;transform:translate(-50%,-16px) scale(.96);opacity:0;padding:9px 14px;border-radius:999px;background:#0d1a16ee;border:1px solid #5f806d;color:#eef7f0;font-size:13px;font-weight:800;box-shadow:0 12px 34px #0009;pointer-events:none;transition:.2s ease}.feel-toast.show{opacity:1;transform:translate(-50%,0) scale(1)}.feel-toast.good{border-color:#97f27a}.feel-toast.wave{border-color:#ffd86d}.feel-toast.warn{border-color:#ffd86d}.feel-toast.danger{border-color:#ff886e;color:#ffd1c4}
      @keyframes feelPulse{0%{transform:scale(1)}35%{transform:scale(1.07);box-shadow:0 0 0 2px #97f27a55}100%{transform:scale(1)}}
      @keyframes feelTap{0%{transform:scale(1)}55%{transform:scale(.96)}100%{transform:scale(1)}}
      @keyframes feelWave{0%{filter:brightness(1)}35%{filter:brightness(1.25) saturate(1.2)}100%{filter:brightness(1)}}
      @media(max-width:900px){.feel-toast{top:8px;font-size:11px;padding:7px 11px}.towerCard:not(.active):hover,.pill:hover{transform:none}}
    `;
    document.head.appendChild(style);
  }

  window.addEventListener('DOMContentLoaded', () => {
    injectFeelStyles();
    watchNumber('credits', 'feel-pulse');
    watchNumber('lives', 'feel-pulse');
    watchNumber('wave', 'feel-pulse');
    attachButtonFeel();
    attachWaveFeel();
    attachUpgradeFeel();
    attachStatusFeel();
  });
})();
