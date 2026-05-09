(() => {
  const byId = id => document.getElementById(id);

  function relayoutGame() {
    window.dispatchEvent(new Event('resize'));
    if (window.__JO_SCENE?.scale?.refresh) window.__JO_SCENE.scale.refresh();
  }

  function initTitleOverlay() {
    const overlay = byId('titleOverlay');
    const play = byId('playBtn');
    const how = byId('howBtn');
    const howText = byId('howText');

    if (overlay && navigator.webdriver) {
      overlay.classList.add('hidden');
    }

    if (play && overlay) {
      play.addEventListener('click', () => {
        overlay.classList.add('hidden');
        document.body.classList.remove('panel-collapsed');
        setTimeout(relayoutGame, 80);
      });
    }

    if (how && howText) {
      how.addEventListener('click', () => howText.classList.toggle('hidden'));
    }
  }

  function initMobilePanel() {
    const toggle = byId('panelToggle');
    if (!toggle) return;

    const syncLabel = () => {
      toggle.textContent = document.body.classList.contains('panel-collapsed') ? 'Controls' : 'Hide Controls';
    };

    toggle.addEventListener('click', () => {
      document.body.classList.toggle('panel-collapsed');
      syncLabel();
      setTimeout(relayoutGame, 80);
    });

    document.body.classList.remove('panel-collapsed');
    syncLabel();
  }

  function initOrientationHandling() {
    ['resize', 'orientationchange'].forEach(eventName => {
      window.addEventListener(eventName, () => {
        setTimeout(relayoutGame, 120);
        setTimeout(relayoutGame, 420);
      });
    });
  }

  function initSafeMapSwitching() {
    const mapList = byId('mapList');
    if (!mapList) return;

    mapList.addEventListener('click', event => {
      const pill = event.target.closest('.pill');
      if (!pill || pill.textContent.includes('🔒')) return;
      setTimeout(() => window.location.reload(), 80);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    initTitleOverlay();
    initMobilePanel();
    initOrientationHandling();
    initSafeMapSwitching();
    setTimeout(relayoutGame, 120);
  });
})();
