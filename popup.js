const STATE_KEY = 'netflixTubeEnabled';
const THEME_KEY = 'tubeTheme';

const toggle = document.getElementById('toggle');
const statusPill = document.getElementById('status-pill');
const cardNetflix = document.getElementById('card-netflix');
const cardInstagram = document.getElementById('card-instagram');

let currentEnabled = true;
let currentTheme = 'netflix';

(async () => {
  const data = await chrome.storage.local.get([STATE_KEY, THEME_KEY]);
  currentEnabled = data[STATE_KEY] !== false;
  currentTheme = data[THEME_KEY] || 'netflix';

  toggle.checked = currentEnabled;
  updateStatusPill(currentEnabled);
  updateThemeSelection(currentTheme);
})();

toggle.addEventListener('change', async () => {
  currentEnabled = toggle.checked;
  await chrome.storage.local.set({ [STATE_KEY]: currentEnabled });
  updateStatusPill(currentEnabled);
});

cardNetflix.addEventListener('click', () => setTheme('netflix'));
cardInstagram.addEventListener('click', () => setTheme('instagram'));

async function setTheme(theme) {
  currentTheme = theme;
  await chrome.storage.local.set({ [THEME_KEY]: theme });
  updateThemeSelection(theme);
}

function updateStatusPill(enabled) {
  statusPill.textContent = enabled ? 'ACTIVE' : 'DISABLED';
  statusPill.classList.toggle('off', !enabled);
}

function updateThemeSelection(theme) {
  cardNetflix.classList.toggle('active', theme === 'netflix');
  cardInstagram.classList.toggle('active', theme === 'instagram');
}
