// Simple SPA router for PWA
class Router {
  constructor() {
    this.currentPage = 'home';
    this.navItems = document.querySelectorAll('.nav-item');
    this.pages = document.querySelectorAll('.page');

    this.navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigate(page);
      });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.showPage(e.state.page);
      }
    });

    // Initial route
    const hash = window.location.hash.replace('#', '') || 'home';
    this.navigate(hash, false);
  }

  navigate(page, pushState = true) {
    this.showPage(page);
    if (pushState) {
      history.pushState({ page }, '', `#${page}`);
    }
  }

  showPage(page) {
    this.currentPage = page;

    // Update pages
    this.pages.forEach((p) => {
      p.classList.toggle('active', p.id === `page-${page}`);
    });

    // Update nav
    this.navItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Scroll to top
    document.getElementById('page-container').scrollTop = 0;
  }
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.router = new Router();
});
