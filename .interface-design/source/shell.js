/* app-shell — single source of truth for FoodVibe chrome:
   ambient wash · 4-tab top nav (desktop) / bottom tab bar (mobile) · contextual chip row ·
   hero FAB (flame, page actions, chef-hat shortcut) · toast host · Lucide icons · reduced motion.
   Usage: <app-shell page="inventory" fab='[{"id":"add","label":"הוספת מוצר","icon":"plus"}]'>…content…</app-shell>
   Screens listen: document.addEventListener('hero-fab-action', e => e.detail.id) */
(() => {
  const TABS = [
    { id: 'dashboard', label: 'דשבורד', icon: 'layout-dashboard', href: 'Dashboard.dc.html' },
    { id: 'inventory', label: 'מלאי', icon: 'package', href: 'Inventory.dc.html' },
    { id: 'recipes', label: 'ספר מתכונים', icon: 'book-open', href: 'RecipeBook.dc.html' },
    { id: 'menus', label: 'תפריטים', icon: 'library', href: 'MenuLibrary.dc.html' }
  ];
  const CHIPS = {
    dashboard: [
      { id: 'venues', label: 'אתרים', icon: 'map-pin', href: 'Venues.dc.html' },
      { id: 'metadata', label: 'מטא-דאטה', icon: 'tags', href: 'MetadataManager.dc.html' },
      { id: 'suppliers', label: 'ספקים', icon: 'truck', href: 'Suppliers.dc.html' },
      { id: 'trash', label: 'אשפה', icon: 'trash-2', href: 'Trash.dc.html' }
    ],
    inventory: [{ id: 'equipment', label: 'ציוד', icon: 'wrench', href: 'Equipment.dc.html' }],
    recipes: [
      { id: 'recipe-builder', label: 'בניית מתכון', icon: 'chef-hat', href: 'RecipeBuilder.dc.html' },
      { id: 'cook-view', label: 'מצב בישול', icon: 'flame', href: 'CookView.dc.html' }
    ],
    menus: [
      { id: 'menu-library', label: 'ספריית תפריטים', icon: 'library', href: 'MenuLibrary.dc.html' },
      { id: 'menu-intelligence', label: 'בניית תפריטים', icon: 'sparkles', href: 'MenuIntelligence.dc.html' }
    ]
  };
  const PARENT = {
    dashboard: 'dashboard', venues: 'dashboard', 'venue-detail': 'dashboard', metadata: 'dashboard', suppliers: 'dashboard', trash: 'dashboard',
    inventory: 'inventory', equipment: 'inventory',
    recipes: 'recipes', 'recipe-book': 'recipes', 'recipe-builder': 'recipes', 'cook-view': 'recipes',
    menus: 'menus', 'menu-library': 'menus', 'menu-intelligence': 'menus'
  };

  let lucideReady = null;
  function loadLucide() {
    if (lucideReady) return lucideReady;
    lucideReady = new Promise(res => {
      if (window.lucide) return res(window.lucide);
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.js';
      s.onload = () => res(window.lucide);
      s.onerror = () => res(null);
      document.head.appendChild(s);
    });
    return lucideReady;
  }
  async function paintIcons(root) {
    const l = await loadLucide();
    if (!l) return;
    try { l.createIcons({ attrs: { 'stroke-width': 1.5, 'aria-hidden': 'true' }, root }); } catch (e) { /* older umd */ try { l.createIcons({ attrs: { 'stroke-width': 1.5 } }); } catch (_) {} }
  }
  // keep light-DOM <i data-lucide> painted as screens re-render
  let observing = false;
  function observeDocument() {
    if (observing) return; observing = true;
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return; queued = true;
      requestAnimationFrame(() => { queued = false; paintIcons(document.body); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    paintIcons(document.body);
  }

  class AppShell extends HTMLElement {
    static get observedAttributes() { return ['page', 'fab', 'theme', 'width']; }
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._open = false; }
    connectedCallback() { this.render(); observeDocument(); }
    attributeChangedCallback() { if (this.shadowRoot.childNodes.length) this.render(); }

    get page() { return this.getAttribute('page') || 'dashboard'; }
    get tab() { return PARENT[this.page] || 'dashboard'; }
    get kitchen() { return this.getAttribute('theme') === 'kitchen'; }
    get actions() {
      let a = [];
      try { a = JSON.parse(this.getAttribute('fab') || '[]'); } catch (e) { a = []; }
      if (this.page !== 'recipe-builder') a = a.concat([{ id: 'recipe-builder', label: 'בניית מתכון', icon: 'chef-hat', href: 'RecipeBuilder.dc.html' }]);
      return a;
    }

    css() {
      const k = this.kitchen;
      return `
      :host { display: block; position: relative; min-height: 100vh;
        --shell-ink: ${k ? '#e8faf7' : 'var(--color-text-main, #0f172a)'};
        --shell-muted: ${k ? 'rgba(232,250,247,.62)' : 'var(--color-text-muted, #64748b)'};
        --shell-nav-bg: ${k ? 'rgba(10,22,20,.72)' : 'var(--bg-frosted-nav, rgba(255,255,255,.72))'};
        --shell-edge: ${k ? 'rgba(94,234,212,.18)' : 'var(--border-glass, rgba(255,255,255,.45))'};
        --shell-glass: ${k ? 'rgba(255,255,255,.06)' : 'var(--bg-glass, rgba(255,255,255,.35))'};
        --shell-teal: var(--color-primary, #14b8a6);
        --shell-teal-soft: ${k ? 'rgba(20,184,166,.22)' : 'var(--color-primary-soft, rgba(20,184,166,.12))'};
        --shell-body: ${k ? '#0a1614' : 'var(--bg-body, #f0f4f8)'};
        --tap: 44px;
        background: var(--shell-body);
        font-family: 'Heebo', system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      .wash { position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background: ${k
          ? 'radial-gradient(ellipse 700px 480px at 85% 12%, rgba(20,184,166,.18), transparent), radial-gradient(ellipse 560px 560px at 12% 78%, rgba(245,158,11,.10), transparent)'
          : 'radial-gradient(ellipse 700px 480px at 85% 15%, rgba(20,184,166,.12), transparent), radial-gradient(ellipse 550px 550px at 15% 75%, rgba(251,191,36,.08), transparent), radial-gradient(ellipse 450px 350px at 50% 50%, rgba(14,165,233,.06), transparent)'}; }
      .top { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 10px;
        padding: 8px 16px; background: var(--shell-nav-bg); border-bottom: 1px solid var(--shell-edge);
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
      .brand { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: var(--shell-ink); margin-inline-end: 6px; white-space: nowrap; letter-spacing: -.01em; }
      .brand img { width: 30px; height: 30px; object-fit: contain; }
      .tabs { display: flex; align-items: center; gap: 6px; }
      .tab { display: inline-flex; align-items: center; gap: 7px; height: var(--tap); padding: 0 16px;
        border-radius: 999px; border: 1px solid transparent; background: transparent; color: var(--shell-muted);
        font: inherit; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap;
        transition: background .2s var(--ease-smooth, cubic-bezier(.4,0,.2,1)), color .2s, transform .25s var(--ease-spring, cubic-bezier(.22,1,.36,1)); }
      .tab:hover { background: var(--shell-glass); color: var(--shell-ink); transform: translateY(-1px); }
      .tab[aria-current="page"] { background: var(--shell-teal); color: #fff; border-color: transparent; box-shadow: 0 4px 14px -4px rgba(20,184,166,.55); }
      .tab:focus-visible, .chip:focus-visible, .fab:focus-visible, .trayitem:focus-visible, .bt:focus-visible, .avatar:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(20,184,166,.35); }
      .spacer { flex: 1; }
      .avatar { display: inline-flex; align-items: center; gap: 8px; height: var(--tap); padding: 0 6px 0 14px; border-radius: 999px;
        border: 1px solid var(--shell-edge); background: var(--shell-glass); color: var(--shell-ink); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
      .avatar i, .avatar svg { color: var(--shell-teal); }
      .av { display: grid; place-content: center; width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--shell-teal), #0d9488); color: #fff; font-size: 13px; font-weight: 700; }
      .chips { position: relative; z-index: 30; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        padding: 10px 16px 0; }
      .chip { display: inline-flex; align-items: center; gap: 6px; height: var(--tap); padding: 0 14px; border-radius: 999px;
        border: 1px solid var(--shell-edge); background: var(--shell-glass); color: var(--shell-muted);
        font: inherit; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap;
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        transition: background .2s, color .2s, transform .25s var(--ease-spring, cubic-bezier(.22,1,.36,1)); }
      .chip:hover { color: var(--shell-ink); transform: translateY(-1px); }
      .chip[aria-current="page"] { background: var(--shell-teal-soft); color: var(--shell-teal); border-color: var(--shell-teal); }
      .content { position: relative; z-index: 1; }
      /* hero FAB */
      .fabwrap { position: fixed; inset-inline-end: 16px; inset-block-end: 16px; z-index: 90; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
      .fab { display: grid; place-content: center; width: 56px; height: 56px; border-radius: 50%;
        border: 1px solid rgba(255,255,255,.5); color: #fff; cursor: pointer;
        background: linear-gradient(180deg, rgba(20,184,166,.94), rgba(13,148,136,.94));
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.55), 0 0 0 3px rgba(20,184,166,.16), 0 8px 24px rgba(0,0,0,.2);
        transition: transform .3s var(--ease-spring, cubic-bezier(.22,1,.36,1)), box-shadow .2s; -webkit-tap-highlight-color: transparent; }
      .fab:hover { box-shadow: inset 0 1px 0 rgba(255,255,255,.55), 0 0 0 4px rgba(20,184,166,.22), 0 12px 30px rgba(0,0,0,.24); }
      .fab[aria-expanded="true"] { transform: rotate(45deg); }
      .tray { display: flex; flex-direction: column; gap: 2px; padding: 6px; border-radius: 16px;
        border: 1px solid var(--shell-edge); background: ${k ? 'rgba(12,28,26,.86)' : 'rgba(255,255,255,.82)'};
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: 0 18px 40px -18px rgba(15,23,42,.45);
        transform-origin: bottom right; opacity: 0; transform: scale(.85) translateY(8px); pointer-events: none;
        height: 0; min-height: 0; padding: 0; border-width: 0; overflow: hidden;
        transition: opacity .2s var(--ease-smooth, cubic-bezier(.4,0,.2,1)), transform .25s var(--ease-spring, cubic-bezier(.22,1,.36,1)); }
      .tray.open { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; height: auto; padding: 6px; border-width: 1px; overflow: visible; }
      .trayitem { display: flex; align-items: center; gap: 10px; min-height: var(--tap); min-width: var(--tap); padding: 0 12px;
        border: 0; border-radius: 12px; background: transparent; color: var(--shell-ink);
        font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; text-decoration: none; flex: 0 0 auto; box-sizing: border-box; }
      .trayitem:hover { background: var(--shell-teal-soft); }
      .trayitem i, .trayitem svg { color: var(--shell-teal); flex: none; }
      .trayitem .lbl { display: inline; }
      /* bottom tab bar — mobile only */
      .bottom { display: none; }
      @media (max-width: 767px) {
        .top { padding: 6px 12px; }
        .top .tabs { display: none; }
        .brand { font-size: 13px; }
        .chips { padding: 10px 12px 0; overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none;
          -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;
          scroll-snap-type: x proximity; gap: 8px;
          mask-image: linear-gradient(to left, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
          -webkit-mask-image: linear-gradient(to left, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%); }
        .chips::-webkit-scrollbar { display: none; }
        .chips .chip { flex: 0 0 auto; scroll-snap-align: center; height: 38px; padding: 0 12px; }
        .chips::after { content: ""; flex: 0 0 4px; }
        .trayitem .lbl { display: none; }
        .trayitem { justify-content: center; padding: 0; width: var(--tap); height: var(--tap); }
        .tray { flex-direction: column; }
        .fabwrap { inset-inline-end: 12px; inset-block-end: calc(56px + env(safe-area-inset-bottom, 0px) + 12px); }
        .bottom { display: flex; position: fixed; inset-inline: 0; bottom: 0; z-index: 95;
          height: calc(56px + env(safe-area-inset-bottom, 0px)); padding-bottom: env(safe-area-inset-bottom, 0px);
          background: var(--shell-nav-bg); border-top: 1px solid var(--shell-edge);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .bt { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          min-height: 56px; border: 0; background: transparent; color: var(--shell-muted); font: inherit; font-size: 12px; font-weight: 600;
          text-decoration: none; cursor: pointer; }
        .bt[aria-current="page"] { color: var(--shell-teal); }
        .bt[aria-current="page"] .dot { opacity: 1; }
        .dot { width: 18px; height: 3px; border-radius: 999px; background: var(--shell-teal); opacity: 0; }
        .content { padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 12px); }
      }
      @media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
      `;
    }

    render() {
      const tab = this.tab, page = this.page, chips = CHIPS[tab] || [], k = this.kitchen;
      if (!document.querySelector('link[rel="icon"]')) {
        const fav = document.createElement('link');
        fav.rel = 'icon'; fav.type = 'image/svg+xml'; fav.href = 'assets/fc-favicon.svg';
        document.head.appendChild(fav);
      }
      const ic = (n, s) => `<i data-lucide="${n}" style="width:${s}px;height:${s}px;display:inline-flex"></i>`;
      const isCur = id => id === page || (id === tab && (page === tab || page === 'recipe-book' || page === 'menu-library' ? id === tab : false));
      this.shadowRoot.innerHTML = `
        <style>${this.css()}</style>
        <div class="wash"></div>
        <header class="top">
          <span class="brand"><img src="${k ? 'assets/fc-mark-kitchen.svg' : 'assets/fc-mark.svg'}" alt="Food Composer">foodCo</span>
          <nav class="tabs" aria-label="ניווט ראשי">
            ${TABS.map(t => `<a class="tab" href="${t.href}"${t.id === tab ? ' aria-current="page"' : ''}>${ic(t.icon, 18)}${t.label}</a>`).join('')}
          </nav>
          <span class="spacer"></span>
          <button class="avatar" type="button">מיכל כהן<span class="av">מכ</span></button>
        </header>
        ${chips.length ? `<nav class="chips" aria-label="מסכי משנה">${chips.map(c => `<a class="chip" href="${c.href}"${c.id === page ? ' aria-current="page"' : ''}>${ic(c.icon, 15)}${c.label}</a>`).join('')}</nav>` : ''}
        <div class="content"><slot></slot></div>
        <div class="fabwrap">
          <div class="tray" part="tray">
            ${this.actions.map(a => `<${a.href ? 'a' : 'button'} class="trayitem" data-id="${a.id}"${a.href ? ` href="${a.href}"` : ' type="button"'} aria-label="${a.label}">${ic(a.icon, 18)}<span class="lbl">${a.label}</span></${a.href ? 'a' : 'button'}>`).join('')}
          </div>
          <button class="fab" type="button" aria-expanded="false" aria-label="פעולות מהירות">${ic('flame', 26)}</button>
        </div>
        <nav class="bottom" aria-label="ניווט תחתון">
          ${TABS.map(t => `<a class="bt" href="${t.href}"${t.id === tab ? ' aria-current="page"' : ''}>${ic(t.icon, 22)}<span>${t.label}</span><span class="dot"></span></a>`).join('')}
        </nav>`;

      const fab = this.shadowRoot.querySelector('.fab'), tray = this.shadowRoot.querySelector('.tray');
      const setOpen = v => { this._open = v; fab.setAttribute('aria-expanded', String(v)); tray.classList.toggle('open', v); };
      fab.addEventListener('click', e => { e.stopPropagation(); setOpen(!this._open); });
      tray.querySelectorAll('.trayitem').forEach(el => el.addEventListener('click', () => {
        setOpen(false);
        document.dispatchEvent(new CustomEvent('hero-fab-action', { detail: { id: el.dataset.id } }));
      }));
      document.addEventListener('click', e => { if (!this._open) return; if (e.composedPath && e.composedPath().includes(this)) return; setOpen(false); });
      window.addEventListener('keydown', e => { if (e.key === 'Escape' && this._open) setOpen(false); });
      paintIcons(this.shadowRoot);
    }
  }
  if (!customElements.get('app-shell')) customElements.define('app-shell', AppShell);
})();
