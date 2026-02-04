// FC26 PWA App
document.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Tab switching
  document.querySelectorAll('.tab-bar').forEach((tabBar) => {
    tabBar.querySelectorAll('.tab-item').forEach((tab) => {
      tab.addEventListener('click', () => {
        const group = tab.closest('.tab-bar').dataset.group;
        const target = tab.dataset.tab;

        // Update tabs
        tabBar.querySelectorAll('.tab-item').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        // Update tab content
        document.querySelectorAll(`.tab-content[data-group="${group}"]`).forEach((content) => {
          content.style.display = content.dataset.tab === target ? 'block' : 'none';
        });
      });
    });
  });

  // Toggle switches
  document.querySelectorAll('.toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('on');
    });
  });

  // Quick action clicks -> navigate to page
  document.querySelectorAll('.quick-action').forEach((action) => {
    action.addEventListener('click', () => {
      const target = action.dataset.navigate;
      if (target && window.router) {
        window.router.navigate(target);
      }
    });
  });

  // Section "See all" links
  document.querySelectorAll('.section-link').forEach((link) => {
    link.addEventListener('click', () => {
      const target = link.dataset.navigate;
      if (target && window.router) {
        window.router.navigate(target);
      }
    });
  });
});

// Helper to get confidence class
function getConfClass(value) {
  if (value >= 75) return 'high';
  if (value >= 60) return 'medium';
  return 'low';
}

// Helper to get confidence color
function getConfColor(value) {
  if (value >= 75) return 'var(--conf-high)';
  if (value >= 60) return 'var(--conf-med)';
  return 'var(--conf-low)';
}
