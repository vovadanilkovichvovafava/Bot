// SPA Router
class Router {
  constructor() {
    this.current = null;
    this.pages = {};
  }

  init() {
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.go(el.dataset.page);
      });
    });
    window.addEventListener('popstate', (e) => {
      if (e.state?.page) this.show(e.state.page);
    });
    const hash = location.hash.replace('#', '') || 'home';
    this.go(hash, false);
  }

  go(page, push = true) {
    this.show(page);
    if (push) history.pushState({ page }, '', `#${page}`);
  }

  show(page) {
    this.current = page;
    document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.id === `page-${page}`));
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === page));
    document.getElementById('page-container').scrollTop = 0;

    // Trigger page load
    if (window.app && window.app.onPageShow) {
      window.app.onPageShow(page);
    }
  }
}

window.router = new Router();
