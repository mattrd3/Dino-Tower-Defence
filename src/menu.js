(() => {
  const byId = id => document.getElementById(id);

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
        document.body.classList.add('panel-collapsed');
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
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    });

    if (window.matchMedia('(max-width: 900px)').matches) {
      document.body.classList.add('panel-collapsed');
    }
    syncLabel();
  }

  window.addEventListener('DOMContentLoaded', () => {
    initTitleOverlay();
    initMobilePanel();
  });
})();
