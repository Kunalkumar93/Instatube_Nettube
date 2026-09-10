// TubeRestyle v3 — Supports both Netflix UI and Instagram Web UI for YouTube

const STATE_KEY = 'netflixTubeEnabled';
const THEME_KEY = 'tubeTheme';
const INITIAL_PATH = location.pathname + location.search;

let enabled = false;
let currentTheme = 'netflix';
let mounted = false;
let currentPath = null;
let scrapeTimer = null;
let scrapeObserver = null;
let painted = false;
let initialDataCache = null;
let activeInstagramTab = 'home'; // 'home' | 'reels'
let cachedVideos = [];

(async function init() {
  const data = await chrome.storage.local.get([STATE_KEY, THEME_KEY]);
  enabled = data[STATE_KEY] !== false;
  currentTheme = data[THEME_KEY] || 'netflix';

  await whenBody();
  boot();

  chrome.storage.onChanged.addListener((changes) => {
    let shouldReboot = false;
    if (changes[STATE_KEY]) {
      enabled = changes[STATE_KEY].newValue;
      shouldReboot = true;
    }
    if (changes[THEME_KEY]) {
      currentTheme = changes[THEME_KEY].newValue || 'netflix';
      shouldReboot = true;
    }
    if (shouldReboot) {
      unmount();
      boot();
    }
  });

  document.addEventListener('yt-navigate-finish', () => { onNav(); });
  window.addEventListener('popstate', onNav);
})();

function whenBody() {
  return new Promise((resolve) => {
    if (document.body) return resolve();
    new MutationObserver((_, obs) => {
      if (document.body) { obs.disconnect(); resolve(); }
    }).observe(document.documentElement, { childList: true });
  });
}

function boot() {
  if (enabled) mount(); else unmount();
}

function onNav() {
  if (!enabled) return;
  const next = location.pathname + location.search;
  if (next !== currentPath) {
    currentPath = next;
    render();
  }
}

// ---------- MOUNT / UNMOUNT ----------
function mount() {
  if (mounted) return;
  document.documentElement.classList.add('nt-active');
  document.documentElement.classList.toggle('nt-theme-netflix', currentTheme === 'netflix');
  document.documentElement.classList.toggle('nt-theme-instagram', currentTheme === 'instagram');

  buildShell();
  currentPath = location.pathname + location.search;
  render();
  mounted = true;
}

function unmount() {
  document.documentElement.classList.remove('nt-active', 'nt-watch', 'nt-theme-netflix', 'nt-theme-instagram');
  document.getElementById('nt-root')?.remove();
  clearInterval(scrapeTimer);
  scrapeObserver?.disconnect();
  mounted = false;
}

// ---------- SHELL BUILDERS ----------
function buildShell() {
  if (document.getElementById('nt-root')) return;

  if (currentTheme === 'instagram') {
    buildInstagramShell();
  } else {
    buildNetflixShell();
  }
}

/* =========================================================================
   NETFLIX SHELL & INTERACTIONS
   ========================================================================= */
function buildNetflixShell() {
  const root = document.createElement('div');
  root.id = 'nt-root';
  root.className = 'nt-netflix';
  root.innerHTML = `
    <header class="nt-header" id="nt-header">
      <div class="nt-header-left">
        <a href="/" class="nt-logo" aria-label="NetflixTube">NETFLIX</a>
        <nav class="nt-nav">
          <a href="/" class="nt-nav-item nt-nav-active" data-tab="home">Home</a>
          <a href="/feed/trending" class="nt-nav-item" data-tab="shows">TV Shows</a>
          <a href="/feed/trending?bp=6gQJRkVleHBsb3Jl" class="nt-nav-item" data-tab="movies">Movies</a>
          <a href="/feed/subscriptions" class="nt-nav-item" data-tab="new">New &amp; Popular</a>
          <a href="/playlist?list=WL" class="nt-nav-item" data-tab="list">My List</a>
          <a href="/feed/trending" class="nt-nav-item" data-tab="languages">Browse by Languages</a>
        </nav>
      </div>
      <div class="nt-header-right">
        <button class="nt-theme-switch-btn" id="nt-switch-to-ig" title="Switch to Instagram Mode">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:white;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          <span>Instagram Mode</span>
        </button>
        <button class="nt-icon-btn nt-search-btn" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="white"><path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/></svg>
        </button>
        <span class="nt-children">Children</span>
        <button class="nt-icon-btn" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="white"><path d="M20 17h-1V10.83a7 7 0 0 0-5-6.7V3a2 2 0 1 0-4 0v1.13a7 7 0 0 0-5 6.7V17H4v2h16v-2zm-8 5a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3z"/></svg>
        </button>
        <div class="nt-profile" title="Profile"></div>
      </div>
    </header>

    <div class="nt-search-bar" id="nt-search-bar">
      <input type="text" placeholder="Search titles, people, genres" id="nt-search-input" autocomplete="off">
    </div>

    <main class="nt-main" id="nt-main"></main>
    <div class="nt-toast" id="nt-toast" hidden></div>
  `;
  document.body.appendChild(root);

  // Header scroll effect
  const header = root.querySelector('#nt-header');
  root.querySelector('.nt-main').addEventListener('scroll', () => {
    header.classList.toggle('nt-scrolled', root.querySelector('.nt-main').scrollTop > 40);
  });

  // Search UI
  const sBtn = root.querySelector('.nt-search-btn');
  const sBar = root.querySelector('#nt-search-bar');
  const sIn = root.querySelector('#nt-search-input');
  sBtn.addEventListener('click', () => {
    sBar.classList.toggle('nt-open');
    if (sBar.classList.contains('nt-open')) sIn.focus();
  });
  sIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && sIn.value.trim()) {
      location.href = '/results?search_query=' + encodeURIComponent(sIn.value.trim());
    }
  });

  // Nav clicks
  root.querySelectorAll('.nt-nav-item').forEach((a) => {
    a.addEventListener('click', () => {
      root.querySelectorAll('.nt-nav-item').forEach((x) => x.classList.remove('nt-nav-active'));
      a.classList.add('nt-nav-active');
    });
  });

  // Direct switch to Instagram
  root.querySelector('#nt-switch-to-ig')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ [THEME_KEY]: 'instagram' });
  });
}

/* =========================================================================
   INSTAGRAM SHELL & INTERACTIONS
   ========================================================================= */
function buildInstagramShell() {
  const root = document.createElement('div');
  root.id = 'nt-root';
  root.className = 'ig-root';
  root.innerHTML = `
    <!-- Left Navigation Bar -->
    <aside class="ig-sidebar" id="ig-sidebar">
      <div>
        <div class="ig-logo-area" id="ig-logo-btn" title="Instagram">
          <span class="ig-logo-text">Instagram</span>
          <svg class="ig-logo-icon" viewBox="0 0 24 24">
            <path fill="white" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </div>

        <ul class="ig-nav-list">
          <li class="ig-nav-item active" id="ig-nav-home">
            <span class="ig-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z"/></svg>
            </span>
            <span>Home</span>
          </li>
          <li class="ig-nav-item" id="ig-nav-search">
            <span class="ig-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/></svg>
            </span>
            <span>Search</span>
          </li>
          <li class="ig-nav-item" id="ig-nav-explore">
            <span class="ig-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/></svg>
            </span>
            <span>Explore</span>
          </li>
          <li class="ig-nav-item" id="ig-nav-reels">
            <span class="ig-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm4.5 3L7 10h3l1.5-3h-3zm5 0L12 10h3l1.5-3h-3zm-9 5v6h15v-6H4.5z"/></svg>
            </span>
            <span>Reels</span>
          </li>
          <li class="ig-nav-item" id="ig-nav-messages">
            <span class="ig-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </span>
            <span>Messages</span>
          </li>
          <li class="ig-nav-item" id="ig-nav-notifications">
            <span class="ig-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </span>
            <span>Notifications</span>
          </li>
          <li class="ig-nav-item" id="ig-nav-create">
            <span class="ig-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </span>
            <span>Create</span>
          </li>
          <li class="ig-nav-item" id="ig-nav-profile">
            <div class="ig-nav-avatar">
              <img src="https://api.dicebear.com/7.x/initials/svg?seed=You&backgroundColor=262626&textColor=ffffff" alt="Profile">
            </div>
            <span>Profile</span>
          </li>
        </ul>
      </div>

      <div class="ig-sidebar-bottom">
        <li class="ig-nav-item" id="ig-switch-to-netflix" title="Switch to Netflix Mode" style="color:#e50914;">
          <span class="ig-nav-icon" style="font-weight:900;font-family:Impact;font-size:18px;">N</span>
          <span>Netflix Mode</span>
        </li>
        <li class="ig-nav-item" id="ig-nav-more">
          <span class="ig-nav-icon">
            <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </span>
          <span>More</span>
        </li>
      </div>
    </aside>

    <!-- Search Slideout Drawer -->
    <div class="ig-search-drawer" id="ig-search-drawer">
      <div class="ig-search-drawer-title">Search</div>
      <div class="ig-search-input-wrap">
        <svg class="ig-search-icon-inside" viewBox="0 0 24 24"><path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/></svg>
        <input type="text" class="ig-search-input" id="ig-search-input" placeholder="Search YouTube" autocomplete="off">
      </div>
      <div class="ig-search-recent-title">
        <span>Recent</span>
        <button class="ig-follow-btn" id="ig-clear-recent" style="font-size:12px;">Clear all</button>
      </div>
      <div class="ig-search-recent-list" id="ig-recent-list">
        <div class="ig-search-recent-item" data-q="Trending Music">
          <span>🎵 Trending Music</span>
        </div>
        <div class="ig-search-recent-item" data-q="New Movie Trailers">
          <span>🎬 New Movie Trailers</span>
        </div>
        <div class="ig-search-recent-item" data-q="Gaming Highlights">
          <span>🎮 Gaming Highlights</span>
        </div>
        <div class="ig-search-recent-item" data-q="Podcasts">
          <span>🎙️ Podcasts</span>
        </div>
      </div>
    </div>

    <!-- Main Viewport -->
    <main class="ig-main-viewport" id="ig-main-viewport">
      <div class="ig-main-content" id="ig-main-content">
        <!-- Feed Column -->
        <div class="ig-feed-column">
          <!-- Stories Tray -->
          <div class="ig-stories-container" id="ig-stories-container">
            <div class="ig-stories-track" id="ig-stories-track"></div>
          </div>

          <!-- Post Cards Stream -->
          <div class="ig-feed-stream" id="ig-feed-stream"></div>
        </div>

        <!-- Right Suggestions Sidebar -->
        <aside class="ig-right-sidebar" id="ig-right-sidebar"></aside>
      </div>

      <!-- Reels Full-Height View -->
      <div class="ig-reels-container" id="ig-reels-container"></div>
    </main>

    <div class="nt-toast" id="nt-toast" hidden></div>
  `;
  document.body.appendChild(root);

  attachInstagramShellEvents(root);
}

function attachInstagramShellEvents(root) {
  // Navigation: Home
  root.querySelector('#ig-nav-home').addEventListener('click', () => {
    setActiveNav('ig-nav-home');
    activeInstagramTab = 'home';
    root.querySelector('#ig-main-content').style.display = 'flex';
    root.querySelector('#ig-reels-container').classList.remove('active');
    closeSearchDrawer();
    root.querySelector('#ig-main-viewport').scrollTop = 0;
  });

  // Navigation: Explore -> loads YouTube trending
  root.querySelector('#ig-nav-explore').addEventListener('click', () => {
    setActiveNav('ig-nav-explore');
    location.href = '/feed/trending';
  });

  // Navigation: Reels -> switches view to Reels container
  root.querySelector('#ig-nav-reels').addEventListener('click', () => {
    setActiveNav('ig-nav-reels');
    activeInstagramTab = 'reels';
    root.querySelector('#ig-main-content').style.display = 'none';
    root.querySelector('#ig-reels-container').classList.add('active');
    closeSearchDrawer();
    renderInstagramReels(cachedVideos);
  });

  // Navigation: Search drawer toggle
  const searchNav = root.querySelector('#ig-nav-search');
  const drawer = root.querySelector('#ig-search-drawer');
  const sInput = root.querySelector('#ig-search-input');

  searchNav.addEventListener('click', () => {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      sInput.focus();
    }
  });

  // Search input enter
  sInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && sInput.value.trim()) {
      location.href = '/results?search_query=' + encodeURIComponent(sInput.value.trim());
    }
  });

  // Quick recent search items click
  root.querySelectorAll('.ig-search-recent-item').forEach((item) => {
    item.addEventListener('click', () => {
      const q = item.dataset.q;
      if (q) location.href = '/results?search_query=' + encodeURIComponent(q);
    });
  });

  root.querySelector('#ig-clear-recent')?.addEventListener('click', () => {
    root.querySelector('#ig-recent-list').innerHTML = '<div style="color:#666;font-size:12px;padding:8px;">No recent searches</div>';
  });

  // Logo click -> go to Home
  root.querySelector('#ig-logo-btn').addEventListener('click', () => {
    location.href = '/';
  });

  // Close search drawer when clicking outside
  root.querySelector('#ig-main-viewport').addEventListener('click', () => {
    closeSearchDrawer();
  });

  // Switch to Netflix
  root.querySelector('#ig-switch-to-netflix')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ [THEME_KEY]: 'netflix' });
  });

  function closeSearchDrawer() {
    drawer.classList.remove('open');
  }

  function setActiveNav(activeId) {
    root.querySelectorAll('.ig-nav-item').forEach((it) => it.classList.remove('active'));
    root.querySelector(`#${activeId}`)?.classList.add('active');
  }
}

// ---------- RENDER DISPATCHER ----------
function render() {
  const watch = location.pathname === '/watch';
  document.documentElement.classList.toggle('nt-active', !watch);
  document.documentElement.classList.toggle('nt-watch', watch);
  if (watch) {
    clearInterval(scrapeTimer);
    scrapeObserver?.disconnect();
    return;
  }

  const container = currentTheme === 'instagram'
    ? document.getElementById('ig-main-viewport')
    : document.getElementById('nt-main');
  if (!container) return;

  container.scrollTop = 0;
  painted = false;

  if (currentTheme === 'instagram') {
    const feed = document.getElementById('ig-feed-stream');
    if (feed) feed.innerHTML = `<div class="nt-loading"><div class="nt-spinner"></div></div>`;
  } else {
    container.innerHTML = `<div class="nt-loading"><div class="nt-spinner"></div></div>`;
  }

  // Nudge YouTube scroll to ensure lazy loaders kick in
  window.scrollTo(0, 200);
  window.scrollTo(0, 0);

  scheduleScrape();
}

function scheduleScrape() {
  clearInterval(scrapeTimer);
  scrapeObserver?.disconnect();
  const path = location.pathname + location.search;

  const finish = (videos) => {
    if (painted || path !== location.pathname + location.search || videos.length < 4) return false;
    painted = true;
    cachedVideos = videos;
    scrapeObserver?.disconnect();
    clearInterval(scrapeTimer);

    if (currentTheme === 'instagram') {
      paintInstagram(videos);
    } else {
      paintNetflix(videos);
    }
    return true;
  };

  const tryPaint = () => {
    const videos = scrape();
    return videos.length >= 24 && finish(videos);
  };

  scrapeObserver = new MutationObserver(() => tryPaint());
  scrapeObserver.observe(document.body, { childList: true, subtree: true });
  scrapeTimer = setInterval(tryPaint, 300);
  tryPaint();

  (async () => {
    const paths = path === '/' ? [path, '/feed/subscriptions', '/feed/history'] : [path];
    const batches = await Promise.all(paths.map(fetchFeed));
    if (painted || path !== location.pathname + location.search) return;
    const seen = new Set();
    const all = [];
    for (const v of [...scrape(), ...batches.flat()]) {
      const key = v.url.match(/v=([^&]+)/)?.[1] || v.url;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(v);
    }
    finish(all);
  })();

  setTimeout(() => {
    if (painted || path !== location.pathname + location.search) return;
    const videos = scrape();
    if (videos.length && finish(videos)) return;

    if (currentTheme === 'instagram') {
      const feed = document.getElementById('ig-feed-stream');
      if (feed) {
        feed.innerHTML = `
          <div style="text-align:center;padding:50px 20px;color:#a8a8a8;">
            <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:8px;">No Posts Available</div>
            <div style="font-size:13px;margin-bottom:16px;">Sign in or refresh YouTube to load your feed.</div>
            <button class="ig-follow-btn" id="ig-refresh-btn" style="font-size:14px;">Refresh Feed</button>
          </div>`;
        feed.querySelector('#ig-refresh-btn')?.addEventListener('click', () => location.reload());
      }
    } else {
      const main = document.getElementById('nt-main');
      if (!main) return;
      main.innerHTML = `
        <div class="nt-empty">
          <div class="nt-empty-title">YouTube didn't return any videos.</div>
          <div class="nt-empty-sub">Refresh the page after YouTube finishes signing you in.</div>
          <div class="nt-empty-actions">
            <button class="nt-btn nt-btn-info" id="nt-refresh">Refresh</button>
          </div>
        </div>`;
      main.querySelector('#nt-refresh')?.addEventListener('click', () => location.reload());
    }
  }, 6500);
}

// Fetch a YouTube feed URL, extract ytInitialData JSON, parse into videos.
async function fetchFeed(path) {
  try {
    const res = await fetch(path, { credentials: 'include', signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const m = html.match(/var ytInitialData\s*=\s*({[\s\S]+?});<\/script>/) ||
              html.match(/ytInitialData"?\s*[=:]\s*({[\s\S]+?})\s*;\s*<\/script>/);
    if (!m) return [];
    const data = JSON.parse(m[1]);
    return scrapeInitialData(data);
  } catch (e) {
    return [];
  }
}

// ---------- SCRAPE YOUTUBE ----------
function scrape() {
  const merged = [];
  const seen = new Set();
  const push = (v) => {
    if (!v || !v.url) return;
    const key = v.url.match(/v=([^&]+)/)?.[1] || v.url;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(v);
  };
  scrapeDom().forEach(push);
  scrapeInitialData().forEach(push);
  return merged;
}

function scrapeInitialData(src = window.ytInitialData || readInitialData()) {
  const out = [];
  if (!src) return out;
  const visited = new WeakSet();

  const add = (obj) => {
    if (typeof obj?.videoId !== 'string' || obj.videoId.length < 8) return;
    const id = obj.videoId;
    const t = obj.title || obj.headline;
    const title = t?.runs?.[0]?.text || t?.simpleText || t?.accessibility?.accessibilityData?.label;
    if (!title) return;

    const thumb = obj.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
                  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const channel = obj.ownerText?.runs?.[0]?.text ||
                    obj.longBylineText?.runs?.[0]?.text ||
                    obj.shortBylineText?.runs?.[0]?.text || 'YouTube Creator';

    let duration = obj.lengthText?.simpleText || '';
    for (const overlay of obj.thumbnailOverlays || []) {
      const text = overlay?.thumbnailOverlayTimeStatusRenderer?.text;
      if (text) duration = text.simpleText || text.runs?.[0]?.text || duration;
    }

    const avatar = obj.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
                   getInitialsAvatar(channel);

    out.push({
      title: String(title).trim(),
      url: `https://www.youtube.com/watch?v=${id}`,
      thumb,
      channel: String(channel).trim(),
      avatar,
      duration: String(duration).trim(),
      views: obj.shortViewCountText?.simpleText || obj.viewCountText?.simpleText || '',
    });
  };

  const addLockup = (obj) => {
    if (obj?.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO' || obj.contentId?.length !== 11) return;
    const metadata = obj.metadata?.lockupMetadataViewModel;
    if (!metadata?.title?.content) return;
    const parts = (metadata?.metadata?.contentMetadataViewModel?.metadataRows || [])
      .flatMap((row) => row.metadataParts || [])
      .map((part) => part.text?.content)
      .filter(Boolean);
    const thumbnail = obj.contentImage?.thumbnailViewModel;
    const duration = (thumbnail?.overlays || [])
      .flatMap((overlay) => overlay.thumbnailBottomOverlayViewModel?.badges || [])
      .map((badge) => badge.thumbnailBadgeViewModel?.text)
      .find((text) => /\d+:\d+/.test(text || '')) || '';
    const channel = parts[0] || 'YouTube Creator';

    out.push({
      title: metadata.title.content,
      url: `https://www.youtube.com/watch?v=${obj.contentId}`,
      thumb: thumbnail?.image?.sources?.slice(-1)?.[0]?.url ||
             `https://i.ytimg.com/vi/${obj.contentId}/hqdefault.jpg`,
      channel,
      avatar: getInitialsAvatar(channel),
      duration,
      views: parts.slice(1).join(' • '),
    });
  };

  const walk = (obj) => {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
    visited.add(obj);
    if (Array.isArray(obj)) obj.forEach(walk);
    else for (const [key, value] of Object.entries(obj)) {
      if (['videoRenderer', 'gridVideoRenderer', 'compactVideoRenderer', 'playlistVideoRenderer'].includes(key)) add(value);
      else if (key === 'lockupViewModel') addLockup(value);
      else walk(value);
    }
  };
  try { walk(src); } catch {}
  return out;
}

function readInitialData() {
  if (location.pathname + location.search !== INITIAL_PATH) return null;
  if (initialDataCache) return initialDataCache;
  const script = [...document.scripts].find((s) => s.textContent.includes('ytInitialData'));
  const match = script?.textContent.match(/\bytInitialData\s*=\s*({[\s\S]+})\s*;?\s*$/);
  try { return (initialDataCache = match ? JSON.parse(match[1]) : null); } catch { return null; }
}

function scrapeDom() {
  const nodes = document.querySelectorAll(
    'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-reel-item-renderer'
  );
  const out = [];
  const seen = new Set();
  nodes.forEach((n) => {
    const watchLinks = [...n.querySelectorAll('a[href*="/watch"], a[href*="/shorts/"]')];
    const linkEl = watchLinks.reduce((best, link) => {
      const length = (link.getAttribute('title') || link.textContent || '').trim().length;
      const bestLength = (best?.getAttribute('title') || best?.textContent || '').trim().length;
      return length > bestLength ? link : best;
    }, watchLinks[0]);

    const imgEl = n.querySelector('ytd-thumbnail img, img.yt-core-image, img');
    const chEl = n.querySelector('ytd-channel-name #text a, ytd-channel-name yt-formatted-string a, .ytd-channel-name a, a[href^="/@"]');
    const avatarEl = n.querySelector('#avatar img, ytd-channel-name img, #channel-thumbnail img, yt-avatar-shape img, .yt-spec-avatar-shape__image');
    const durEl = n.querySelector('ytd-thumbnail-overlay-time-status-renderer, #time-status, .ytd-thumbnail-overlay-time-status-renderer');
    const metaEl = n.querySelector('#metadata-line');

    const url = linkEl?.href;
    if (!url) return;
    const title = (linkEl.getAttribute('title') || linkEl.textContent || '').trim();
    if (!title) return;
    const key = url.split('&')[0];
    if (seen.has(key)) return;

    const vid = url.match(/[?&]v=([^&]+)/)?.[1] || url.match(/\/shorts\/([^/?]+)/)?.[1];
    let img = imgEl?.src || imgEl?.getAttribute('src') || '';
    if (!img || img.startsWith('data:')) {
      if (!vid) return;
      img = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    }
    seen.add(key);

    const channel = (chEl?.textContent || '').trim() || 'YouTube Creator';
    let avatar = avatarEl?.src || avatarEl?.getAttribute('src') || '';
    if (!avatar || avatar.startsWith('data:')) {
      avatar = getInitialsAvatar(channel);
    }

    out.push({
      title,
      url,
      thumb: img,
      channel,
      avatar,
      duration: (durEl?.textContent || n.innerText.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0] || '').trim().replace(/\s+/g, ' '),
      views: (metaEl?.textContent || n.innerText.split('\n').filter((line) => /views|ago/i.test(line)).join(' • ')).trim(),
    });
  });
  return out;
}

/* =========================================================================
   PAINT INSTAGRAM WEB UI
   ========================================================================= */
function paintInstagram(videos) {
  const track = document.getElementById('ig-stories-track');
  const feedStream = document.getElementById('ig-feed-stream');
  const rightSidebar = document.getElementById('ig-right-sidebar');
  if (!feedStream) return;

  // 1. Stories Carousel
  if (track) {
    const channelMap = new Map();
    videos.forEach((v) => {
      if (!channelMap.has(v.channel) && channelMap.size < 16) {
        channelMap.set(v.channel, v);
      }
    });

    track.innerHTML = Array.from(channelMap.values()).map((v) => `
      <div class="ig-story-item" data-url="${escapeAttr(v.url)}" title="${escapeAttr(v.channel)}">
        <div class="ig-story-ring">
          <div class="ig-story-inner">
            <img class="ig-story-avatar" src="${escapeAttr(v.avatar)}" alt="${escapeAttr(v.channel)}">
          </div>
        </div>
        <span class="ig-story-name">${escapeHtml(v.channel)}</span>
      </div>
    `).join('');

    track.querySelectorAll('.ig-story-item').forEach((item) => {
      item.addEventListener('click', () => {
        location.href = item.dataset.url;
      });
    });
  }

  // 2. Feed Posts Stream
  feedStream.innerHTML = videos.map((v, idx) => renderInstagramPost(v, idx)).join('');
  attachInstagramPostEvents(feedStream);

  // 3. Right Sidebar ("Suggested for you")
  if (rightSidebar) {
    const suggestedChannels = [];
    const seenCh = new Set();
    for (const v of videos.slice(5)) {
      if (!seenCh.has(v.channel)) {
        seenCh.add(v.channel);
        suggestedChannels.push(v);
        if (suggestedChannels.length >= 5) break;
      }
    }

    rightSidebar.innerHTML = `
      <div class="ig-profile-switch">
        <div class="ig-profile-left">
          <img class="ig-profile-avatar" src="https://api.dicebear.com/7.x/initials/svg?seed=You&backgroundColor=262626&textColor=ffffff" alt="You">
          <div class="ig-profile-user-text">
            <span class="ig-profile-handle">you.tube</span>
            <span class="ig-profile-sub">YouTube Explorer</span>
          </div>
        </div>
        <span class="ig-profile-action" id="ig-switch-acc">Switch</span>
      </div>

      <div class="ig-suggestions-header">
        <span class="ig-suggestions-title">Suggested for you</span>
        <span class="ig-see-all-btn">See All</span>
      </div>

      <div class="ig-suggestions-list">
        ${suggestedChannels.map((s) => `
          <div class="ig-suggestion-row">
            <div class="ig-suggest-left">
              <img class="ig-suggest-avatar" src="${escapeAttr(s.avatar)}" alt="${escapeAttr(s.channel)}">
              <div class="ig-suggest-info">
                <span class="ig-suggest-name">${escapeHtml(s.channel)}</span>
                <span class="ig-suggest-sub">Suggested channel</span>
              </div>
            </div>
            <button class="ig-suggest-follow" data-following="false">Follow</button>
          </div>
        `).join('')}
      </div>

      <footer class="ig-sidebar-footer">
        <div class="ig-footer-nav">
          <a href="#">About</a> &bull; <a href="#">Help</a> &bull; <a href="#">Press</a> &bull;
          <a href="#">API</a> &bull; <a href="#">Jobs</a> &bull; <a href="#">Privacy</a> &bull;
          <a href="#">Terms</a> &bull; <a href="#">Locations</a> &bull; <a href="#">Language</a>
        </div>
        <div class="ig-copyright">&copy; 2026 INSTAGRAM FROM TUBE</div>
      </footer>
    `;

    rightSidebar.querySelectorAll('.ig-suggest-follow').forEach((btn) => {
      btn.addEventListener('click', () => {
        const isFollowing = btn.dataset.following === 'true';
        btn.dataset.following = (!isFollowing).toString();
        btn.textContent = isFollowing ? 'Follow' : 'Following';
        btn.classList.toggle('following', !isFollowing);
      });
    });

    rightSidebar.querySelector('#ig-switch-acc')?.addEventListener('click', () => {
      location.href = '/feed/library';
    });
  }

  // Pre-render Reels if tab is active
  if (activeInstagramTab === 'reels') {
    renderInstagramReels(videos);
  }
}

function renderInstagramPost(v, idx) {
  const cleanT = cleanTitle(v.title);
  const randomLikes = Math.floor(Math.random() * 850) + 120;
  const displayLikes = v.views ? v.views : `${randomLikes}K views`;
  const timeAgo = formatTimeAgo(v.views);

  return `
    <article class="ig-post-card" data-idx="${idx}" data-url="${escapeAttr(v.url)}">
      <!-- Header -->
      <div class="ig-post-header">
        <div class="ig-post-user">
          <div class="ig-user-avatar-wrap">
            <img class="ig-user-avatar" src="${escapeAttr(v.avatar)}" alt="${escapeAttr(v.channel)}">
          </div>
          <div class="ig-user-details">
            <div class="ig-user-name-row">
              <span class="ig-user-name" data-url="${escapeAttr(v.url)}">${escapeHtml(v.channel)}</span>
              <svg class="ig-verified-badge" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span class="ig-post-bullet">&bull;</span>
              <span class="ig-follow-btn ig-card-follow" data-following="false">Follow</span>
            </div>
          </div>
        </div>
        <button class="ig-header-more" title="More options">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>
        </button>
      </div>

      <!-- Media -->
      <div class="ig-post-media" data-url="${escapeAttr(v.url)}">
        <img class="ig-post-thumb" src="${escapeAttr(upgradeThumb(v.thumb))}" loading="lazy" alt="${escapeAttr(cleanT)}">
        ${v.duration ? `<div class="ig-post-duration">${escapeHtml(v.duration)}</div>` : ''}
        <div class="ig-play-overlay">
          <div class="ig-play-circle">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div class="ig-heart-pop">
          <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="ig-post-actions">
        <div class="ig-actions-left">
          <button class="ig-action-btn ig-like-btn" title="Like">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          <button class="ig-action-btn ig-comment-btn" title="Comment">
            <svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
          </button>
          <button class="ig-action-btn ig-share-btn" title="Share" data-url="${escapeAttr(v.url)}">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <button class="ig-action-btn ig-save-btn" title="Save">
          <svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        </button>
      </div>

      <!-- Likes, Caption & Comments -->
      <div class="ig-post-info">
        <div class="ig-post-likes">
          Liked by <b>${escapeHtml(v.channel)}</b> and <b>${escapeHtml(displayLikes)}</b>
        </div>
        <div class="ig-post-caption">
          <span class="ig-caption-user">${escapeHtml(v.channel)}</span>
          <span>${escapeHtml(cleanT)}</span>
        </div>
        <div class="ig-comments-count">View all comments</div>
        <div class="ig-comments-list"></div>
        <div class="ig-post-time">${escapeHtml(timeAgo)}</div>
      </div>

      <!-- Add Comment Row -->
      <div class="ig-comment-box">
        <div class="ig-comment-input-wrap">
          <span class="ig-comment-emoji" title="Emoji">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
          </span>
          <input type="text" class="ig-comment-input" placeholder="Add a comment..." autocomplete="off">
        </div>
        <button class="ig-comment-post-btn">Post</button>
      </div>
    </article>
  `;
}

function attachInstagramPostEvents(container) {
  container.querySelectorAll('.ig-post-card').forEach((card) => {
    const media = card.querySelector('.ig-post-media');
    const heartPop = card.querySelector('.ig-heart-pop');
    const likeBtn = card.querySelector('.ig-like-btn');
    const saveBtn = card.querySelector('.ig-save-btn');
    const shareBtn = card.querySelector('.ig-share-btn');
    const commentBtn = card.querySelector('.ig-comment-btn');
    const commentInput = card.querySelector('.ig-comment-input');
    const postCommentBtn = card.querySelector('.ig-comment-post-btn');
    const commentsList = card.querySelector('.ig-comments-list');
    const followBtn = card.querySelector('.ig-card-follow');

    // Follow toggle
    followBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const following = followBtn.dataset.following === 'true';
      followBtn.dataset.following = (!following).toString();
      followBtn.textContent = following ? 'Follow' : 'Following';
      followBtn.classList.toggle('following', !following);
    });

    // Double-tap on media -> like + burst animation
    let lastTap = 0;
    media.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        // Double tap
        e.preventDefault();
        triggerHeartBurst(heartPop, likeBtn);
      } else {
        // Single tap after timeout
        setTimeout(() => {
          if (Date.now() - lastTap >= 300) {
            location.href = media.dataset.url;
          }
        }, 320);
      }
      lastTap = now;
    });

    // Like button toggle
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      likeBtn.classList.toggle('liked');
    });

    // Save button toggle
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveBtn.classList.toggle('saved');
    });

    // Share button -> copy link
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard?.writeText(shareBtn.dataset.url);
      showToast('Link copied to clipboard');
    });

    // Comment button -> focus input
    commentBtn.addEventListener('click', () => {
      commentInput.focus();
    });

    // Input state & post
    commentInput.addEventListener('input', () => {
      postCommentBtn.classList.toggle('active', commentInput.value.trim().length > 0);
    });

    const submitComment = () => {
      const text = commentInput.value.trim();
      if (!text) return;
      const item = document.createElement('div');
      item.className = 'ig-comment-item';
      item.innerHTML = `<span class="ig-comment-user">you</span><span>${escapeHtml(text)}</span>`;
      commentsList.appendChild(item);
      commentInput.value = '';
      postCommentBtn.classList.remove('active');
    };

    postCommentBtn.addEventListener('click', submitComment);
    commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitComment();
    });
  });
}

function triggerHeartBurst(heartPop, likeBtn) {
  heartPop.classList.remove('animate');
  void heartPop.offsetWidth; // reflow
  heartPop.classList.add('animate');
  likeBtn.classList.add('liked');
}

// ---------- INSTAGRAM REELS VIEW ----------
function renderInstagramReels(videos) {
  const container = document.getElementById('ig-reels-container');
  if (!container || !videos.length) return;

  container.innerHTML = videos.map((v) => `
    <div class="ig-reel-card" data-url="${escapeAttr(v.url)}">
      <img class="ig-reel-thumb" src="${escapeAttr(upgradeThumb(v.thumb))}" alt="">
      <div class="ig-reel-gradient"></div>

      <!-- Right Column Actions -->
      <div class="ig-reel-actions-column">
        <div class="ig-reel-action-btn reel-like">
          <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span class="ig-reel-action-label">Like</span>
        </div>
        <div class="ig-reel-action-btn">
          <svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
          <span class="ig-reel-action-label">Comment</span>
        </div>
        <div class="ig-reel-action-btn reel-share" data-url="${escapeAttr(v.url)}">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          <span class="ig-reel-action-label">Share</span>
        </div>
        <div class="ig-reel-action-btn">
          <svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        </div>
        <img class="ig-reel-audio-disc" src="${escapeAttr(v.avatar)}" alt="Sound">
      </div>

      <!-- Bottom Details -->
      <div class="ig-reel-details">
        <div class="ig-reel-creator-row">
          <img class="ig-reel-avatar" src="${escapeAttr(v.avatar)}" alt="">
          <span class="ig-reel-creator-name">${escapeHtml(v.channel)}</span>
          <span class="ig-reel-follow-pill">Follow</span>
        </div>
        <div class="ig-reel-caption">${escapeHtml(cleanTitle(v.title))}</div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.ig-reel-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.ig-reel-actions-column')) return;
      location.href = card.dataset.url;
    });
  });

  container.querySelectorAll('.reel-share').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard?.writeText(btn.dataset.url);
      showToast('Link copied to clipboard');
    });
  });

  container.querySelectorAll('.reel-like').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.querySelector('svg').style.fill = btn.querySelector('svg').style.fill === 'rgb(255, 48, 64)' ? '#fff' : '#ff3040';
    });
  });
}

/* =========================================================================
   PAINT NETFLIX UI
   ========================================================================= */
function paintNetflix(videos) {
  const main = document.getElementById('nt-main');
  if (!main || !videos.length) return;

  const standardVideos = videos.filter((v) => v.duration.toUpperCase() !== 'SHORTS');
  const catalog = standardVideos.length >= 6 ? standardVideos : videos;
  const hero = catalog[0];
  const pool = catalog.slice(1);
  const rowNames = [
    'Trending Now',
    'From Your Subscriptions',
    'Watch It Again',
    'Popular on YouTube',
    'Recommended for You',
    'New Releases',
    'More to Explore',
  ];
  const rows = [{ title: 'Top 10 in India Today', cls: 'nt-row-top10', items: pool.slice(0, 10) }];
  for (let i = 10; i < pool.length && rows.length <= rowNames.length; i += 12) {
    rows.push({ title: rowNames[rows.length - 1], items: pool.slice(i, i + 12) });
  }

  const bigThumb = upgradeThumb(hero.thumb);

  main.innerHTML = `
    <section class="nt-hero" id="nt-hero">
      <div class="nt-hero-bg" style="background-image:url('${bigThumb}')"></div>
      <div class="nt-hero-fade-left"></div>
      <div class="nt-hero-fade-bottom"></div>
      <div class="nt-hero-content">
        <h1 class="nt-hero-title">${escapeHtml(cleanTitle(hero.title))}</h1>
        <p class="nt-hero-desc">${escapeHtml(heroDesc(hero))}</p>
        <div class="nt-hero-buttons">
          <a class="nt-btn nt-btn-play" href="${hero.url}">
            <svg viewBox="0 0 24 24" fill="black"><path d="M6 4l15 8-15 8z"/></svg>
            <span>Play</span>
          </a>
          <button class="nt-btn nt-btn-info" data-url="${hero.url}">
            <svg viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            <span>More Info</span>
          </button>
        </div>
      </div>
      <div class="nt-hero-age">18+</div>
    </section>

    <div class="nt-rows">
      ${rows.map((r, i) => renderNetflixRow(r, i)).join('')}
    </div>

    <footer class="nt-footer">
      <div class="nt-footer-socials">
        <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="white"><path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7c4.7-.8 8.4-4.9 8.4-9.9 0-5.5-4.5-10-10-10z"/></svg></a>
        <a href="#" aria-label="X"><svg viewBox="0 0 24 24" fill="white"><path d="M18.2 3H21l-6.6 7.5L22 21h-5.3l-4.7-6.1L6.6 21H3.8l7-8L2 3h5.4l4.3 5.6L18.2 3z"/></svg></a>
      </div>
      <div class="nt-footer-links">
        <a>Audio Description</a><a>Help Centre</a><a>Gift Cards</a><a>Media Centre</a><a>Investor Relations</a>
        <a>Jobs</a><a>Terms of Use</a><a>Privacy</a><a>Legal Notices</a><a>Cookie Preferences</a>
        <a>Corporate Information</a><a>Contact Us</a>
      </div>
      <div class="nt-footer-code">NetflixTube • Restyle only • Content from YouTube</div>
    </footer>
  `;

  main.querySelector('.nt-btn-info')?.addEventListener('click', () => { location.href = hero.url; });
  attachRowInteractions();
  attachHoverPreviews();
}

function renderNetflixRow(row, rowIdx) {
  const isTop10 = row.cls === 'nt-row-top10';
  return `
    <section class="nt-row ${row.cls || ''}" data-row="${rowIdx}">
      <h2 class="nt-row-title">${escapeHtml(row.title)}</h2>
      <div class="nt-row-viewport">
        <button class="nt-row-arrow nt-row-arrow-left" data-dir="-1" aria-label="Scroll left">
          <svg viewBox="0 0 24 24" fill="white"><path d="M15 6l-6 6 6 6z"/></svg>
        </button>
        <div class="nt-row-scroll">
          ${row.items.map((v, i) => renderNetflixCard(v, isTop10 ? i + 1 : null, rowIdx * 100 + i)).join('')}
        </div>
        <button class="nt-row-arrow nt-row-arrow-right" data-dir="1" aria-label="Scroll right">
          <svg viewBox="0 0 24 24" fill="white"><path d="M9 6l6 6-6 6z"/></svg>
        </button>
      </div>
    </section>
  `;
}

function renderNetflixCard(v, rank, idx) {
  return `
    <a class="nt-card ${rank ? 'nt-card-top10' : ''}" href="${v.url}" data-idx="${idx}" data-title="${escapeAttr(cleanTitle(v.title))}" data-channel="${escapeAttr(v.channel)}" data-duration="${escapeAttr(v.duration)}" data-views="${escapeAttr(v.views)}" data-thumb="${escapeAttr(upgradeThumb(v.thumb))}">
      ${rank ? `<div class="nt-rank-number" aria-hidden="true">${rank}</div>` : ''}
      <div class="nt-card-thumb">
        <img src="${v.thumb}" loading="lazy" alt="">
        ${v.duration ? `<span class="nt-card-dur">${escapeHtml(v.duration)}</span>` : ''}
      </div>
    </a>
  `;
}

function attachRowInteractions() {
  document.querySelectorAll('.nt-row-viewport').forEach((vp) => {
    const scroll = vp.querySelector('.nt-row-scroll');
    vp.querySelectorAll('.nt-row-arrow').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const dir = Number(btn.dataset.dir);
        scroll.scrollBy({ left: dir * (scroll.clientWidth * 0.9), behavior: 'smooth' });
      });
    });
  });
}

function attachHoverPreviews() {
  document.querySelectorAll('.nt-card').forEach((card) => {
    let t;
    card.addEventListener('mouseenter', () => {
      t = setTimeout(() => showHoverCard(card), 380);
    });
    card.addEventListener('mouseleave', () => {
      clearTimeout(t);
      card.classList.remove('nt-hover');
      const panel = card.querySelector('.nt-hover-panel');
      if (panel) panel.remove();
    });
  });
}

function showHoverCard(card) {
  card.classList.add('nt-hover');
  if (card.querySelector('.nt-hover-panel')) return;
  const panel = document.createElement('div');
  panel.className = 'nt-hover-panel';
  panel.innerHTML = `
    <div class="nt-hover-actions">
      <button class="nt-hover-btn nt-hover-play" title="Play"><svg viewBox="0 0 24 24" fill="black"><path d="M6 4l15 8-15 8z"/></svg></button>
      <button class="nt-hover-btn" title="My List"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></button>
      <button class="nt-hover-btn" title="Rate"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M7 22V11M2 13v7a2 2 0 0 0 2 2h13.3a2 2 0 0 0 2-1.7l1.4-9A2 2 0 0 0 18.7 9H14V5a3 3 0 0 0-3-3l-4 9"/></svg></button>
      <button class="nt-hover-btn nt-hover-more" title="More"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
    </div>
    <div class="nt-hover-meta">
      <span class="nt-match">Recommended</span>
      <span>${escapeHtml(card.dataset.duration || 'HD')}</span>
      <span class="nt-hd">HD</span>
    </div>
    <div class="nt-hover-title">${escapeHtml(card.dataset.title)}</div>
    <div class="nt-hover-tags">${escapeHtml([card.dataset.channel, card.dataset.views].filter(Boolean).join(' • '))}</div>
  `;
  card.appendChild(panel);
}

// ---------- TOAST HELPER ----------
function showToast(msg) {
  const toast = document.getElementById('nt-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(38,38,38,0.95);color:#fff;padding:10px 20px;border-radius:24px;font-size:13px;font-weight:600;z-index:9999999;box-shadow:0 4px 12px rgba(0,0,0,0.4);letter-spacing:0.2px;';
  setTimeout(() => { toast.hidden = true; }, 2600);
}

// ---------- GENERAL HELPERS ----------
function upgradeThumb(url) {
  if (!url) return url;
  return url
    .replace(/hqdefault\.jpg/, 'maxresdefault.jpg')
    .replace(/mqdefault\.jpg/, 'maxresdefault.jpg')
    .replace(/sddefault\.jpg/, 'maxresdefault.jpg')
    .replace(/=w\d+-h\d+/, '=w1920-h1080');
}

function cleanTitle(t) {
  return (t || '')
    .replace(/\s*[\(\[].*?(official|feat|ft|hd|4k|video)[^\)\]]*[\)\]]/gi, '')
    .split(/\s+[|•]\s+/)[0]
    .trim();
}

function heroDesc(v) {
  return [v.channel, v.views].filter(Boolean).join(' • ') || 'Featured on YouTube';
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function escapeAttr(s) { return escapeHtml(s); }

function getInitialsAvatar(name) {
  const initial = (name || 'Y').trim().charAt(0).toUpperCase();
  const colors = ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888', '#0095f6', '#5851db', '#3897f0'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="64" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function formatTimeAgo(meta) {
  if (!meta) return 'JUST NOW';
  const m = meta.match(/(\d+\s*(?:second|minute|hour|day|week|month|year)s?\s*ago)/i);
  if (m) return m[1].toUpperCase();
  return 'POPULAR ON YOUTUBE';
}
