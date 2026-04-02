const LATEST_COUNT = 8;

const state = {
  cards: [],
  filteredCards: [],
  quizDeck: [],
  quizIndex: -1,
  current: null,
  imageShown: false,
  toolsOpen: false,
  maxCardId: 0,
  recentOnly: false,
};

const els = {
  promptCard: document.getElementById('promptCard'),
  quizPrompt: document.getElementById('quizPrompt'),
  quizInfo: document.getElementById('quizInfo'),
  viewerMeta: document.getElementById('viewerMeta'),
  imageStage: document.getElementById('imageStage'),
  imageViewport: document.getElementById('imageViewport'),
  viewerTitle: document.getElementById('viewerTitle'),
  cards: document.getElementById('cards'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  listPanel: document.getElementById('listPanel'),
  closeListBtn: document.getElementById('closeListBtn'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  toggleListBtn: document.getElementById('toggleListBtn'),
  toggleToolsBtn: document.getElementById('toggleToolsBtn'),
  toolsCard: document.getElementById('toolsCard'),
  startBtn: document.getElementById('startBtn'),
  prevBtn: document.getElementById('mobilePrevBtn'),
  nextBtn: document.getElementById('mobileNextBtn'),
  revealBtn: document.getElementById('mobileRevealBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  latestBtn: document.getElementById('latestBtn'),
  recentBtn: document.getElementById('recentBtn'),
  hideBtn: document.getElementById('hideBtn'),
  randomBtn: document.getElementById('randomBtn'),
  progressFill: document.getElementById('progressFill'),
  cardCounter: document.getElementById('cardCounter'),
  promptStartBtn: document.getElementById('promptStartBtn'),
};

function isMobileLayout(){
  return window.innerWidth <= 980;
}

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function clamp(value, min, max){
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(text){
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setViewerMeta(text = '完整顯示'){
  if (els.viewerMeta) els.viewerMeta.textContent = text;
}


function syncStartButton(){
  if (!els.promptStartBtn) return;
  const started = Boolean(state.quizDeck.length && state.quizIndex >= 0 && state.current);
  els.promptStartBtn.textContent = started ? '重新開始' : '開始';
}

function setRevealButtonLabels(){
  const label = state.imageShown ? '隱藏圖片' : '顯示圖片';
  els.revealBtn.textContent = label;
  els.hideBtn.disabled = !state.imageShown;
  syncStartButton();
}

function updateProgress(){
  const total = state.quizDeck.length || state.cards.length || 0;
  const currentIndex = state.quizDeck.length && state.quizIndex >= 0 ? state.quizIndex + 1 : (state.current ? 1 : 0);
  els.cardCounter.textContent = `${currentIndex} / ${total}`;
  const pct = total && state.quizDeck.length && state.quizIndex >= 0 ? ((state.quizIndex + 1) / total) * 100 : 0;
  els.progressFill.style.width = `${pct}%`;
}

function isLatestCard(card){
  if (!card || typeof card.id !== 'number') return false;
  return card.id > Math.max(0, state.maxCardId - LATEST_COUNT);
}

function currentCardBadgeHtml(card){
  if (!card) return '';
  if (card.id === state.maxCardId) return '<span class="badge badge-latest">最新加入</span>';
  if (isLatestCard(card)) return '<span class="badge badge-new">近期新增</span>';
  return '';
}

function renderPromptBadges(){
  const oldBadges = document.getElementById('promptBadges');
  if (oldBadges) oldBadges.remove();
  if (!state.current) return;
  const badgeHtml = currentCardBadgeHtml(state.current);
  if (!badgeHtml) return;
  els.quizPrompt.insertAdjacentHTML('beforebegin', `<div id="promptBadges" class="prompt-badges">${badgeHtml}</div>`);
}

function updateQuizInfo(){
  if (!state.cards.length) {
    els.quizInfo.textContent = '尚未載入資料';
    updateProgress();
    renderPromptBadges();
    setRevealButtonLabels();
    syncRecentButton();
    return;
  }
  if (!state.quizDeck.length || state.quizIndex < 0 || !state.current) {
    els.quizInfo.textContent = `共 ${state.cards.length} 張卡片 · 點開始進入測驗`;
    updateProgress();
    renderPromptBadges();
    setRevealButtonLabels();
    return;
  }
  const revealText = state.imageShown ? ' · 已顯示圖片' : ' · 尚未顯示圖片';
  els.quizInfo.textContent = `進度 ${state.quizIndex + 1} / ${state.quizDeck.length}${revealText}`;
  updateProgress();
  renderPromptBadges();
  setRevealButtonLabels();
}

function showPlaceholder(text){
  els.viewerTitle.textContent = '圖片';
  setViewerMeta('未顯示');
  els.imageStage.innerHTML = `<div class="placeholder">${escapeHtml(text)}</div>`;
  setRevealButtonLabels();
}

function ensureDeckContains(card){
  if (!card) return;
  if (!state.quizDeck.length) state.quizDeck = [...state.cards];
  const idx = state.quizDeck.findIndex(entry => entry.name === card.name);
  if (idx >= 0) state.quizIndex = idx;
}

function selectCard(card, options = {}){
  state.current = card || null;
  if (!card) {
    state.quizIndex = -1;
    state.imageShown = false;
    els.quizPrompt.textContent = '按「開始」進入測驗';
    showPlaceholder('尚未顯示圖片');
    renderCardList();
    updateQuizInfo();
    persistState();
    return;
  }

  ensureDeckContains(card);
  state.imageShown = Boolean(options.showImage);
  els.quizPrompt.textContent = card.title || card.name;
  els.viewerTitle.textContent = card.title || '圖片';
  setViewerMeta('完整顯示');

  if (options.showImage) {
    renderImage();
  } else {
    showPlaceholder('輕點上方卡片或按底部「顯示圖片」查看內容');
  }

  renderCardList();
  updateQuizInfo();
  persistState();
}

function renderImage(){
  if (!state.current) return;
  els.viewerTitle.textContent = state.current.title || '圖片';
  els.imageStage.innerHTML = `<img id="quizImage" src="${state.current.src}" alt="${escapeHtml(state.current.title || state.current.name)}">`;
  const img = document.getElementById('quizImage');
  img.addEventListener('load', () => {
    els.imageViewport.scrollTop = 0;
    const tall = img.naturalHeight > img.naturalWidth * 1.35;
    img.classList.toggle('is-tall', tall);
    setViewerMeta(tall ? '長圖 · 可上下滑動' : '完整顯示');
  });

  state.imageShown = true;
  setRevealButtonLabels();
  updateQuizInfo();
  persistState();
}

function hideImage(){
  if (!state.current) return;
  state.imageShown = false;
  showPlaceholder('圖片已隱藏。輕點上方題目卡片，或按底部中間按鈕重新顯示');
  updateQuizInfo();
  persistState();
}

function startQuiz(){
  if (!state.cards.length) return;
  state.quizDeck = [...state.cards];
  shuffle(state.quizDeck);
  state.quizIndex = 0;
  selectCard(state.quizDeck[0], { showImage: false });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function ensureQuizStarted(){
  if (!state.quizDeck.length || state.quizIndex < 0 || !state.current) {
    startQuiz();
    return false;
  }
  return true;
}

function nextQuiz(){
  if (!ensureQuizStarted()) return;
  state.quizIndex += 1;
  if (state.quizIndex >= state.quizDeck.length) state.quizIndex = 0;
  selectCard(state.quizDeck[state.quizIndex], { showImage: false });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevQuiz(){
  if (!ensureQuizStarted()) return;
  state.quizIndex -= 1;
  if (state.quizIndex < 0) state.quizIndex = state.quizDeck.length - 1;
  selectCard(state.quizDeck[state.quizIndex], { showImage: false });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function reshuffleQuiz(){
  if (!state.cards.length) return;
  if (!state.quizDeck.length) {
    startQuiz();
    return;
  }
  shuffle(state.quizDeck);
  state.quizIndex = 0;
  selectCard(state.quizDeck[0], { showImage: false });
}

function pickRandomCard(){
  if (!state.cards.length) return;
  if (!state.quizDeck.length) state.quizDeck = [...state.cards];
  state.quizIndex = Math.floor(Math.random() * state.quizDeck.length);
  selectCard(state.quizDeck[state.quizIndex], { showImage: false });
}

function filterCards(){
  const q = els.searchInput.value.trim().toLowerCase();
  const source = state.recentOnly ? state.cards.filter(isLatestCard) : state.cards;
  state.filteredCards = !q
    ? [...source]
    : source.filter(card => (card.title || '').toLowerCase().includes(q) || (card.name || '').toLowerCase().includes(q));
  renderCardList();
}


function syncRecentButton(){
  if (!els.recentBtn) return;
  els.recentBtn.textContent = state.recentOnly ? '顯示全部卡片' : '只看近期新增';
  els.recentBtn.classList.toggle('active-filter', state.recentOnly);
}

function toggleRecentOnly(){
  state.recentOnly = !state.recentOnly;
  syncRecentButton();
  filterCards();
  persistState();
}

function jumpToLatest(){
  if (!state.cards.length) return;
  const newest = state.cards.reduce((best, card) => (best && best.id > card.id ? best : card), null);
  if (!newest) return;
  ensureDeckContains(newest);
  selectCard(newest, { showImage: true });
}

function renderCardList(){
  els.cards.innerHTML = '';
  const list = state.filteredCards.length ? state.filteredCards : (!els.searchInput.value.trim() ? state.cards : []);
  if (!list.length) {
    els.cards.innerHTML = '<div class="placeholder">沒有符合的卡片</div>';
    return;
  }

  list.forEach(card => {
    const item = document.createElement('div');
    const isNewest = card.id === state.maxCardId;
    const isNew = isLatestCard(card);
    item.className = 'card-item' + (state.current && state.current.name === card.name ? ' active' : '') + (isNew ? ' is-new' : '');
    const badge = isNewest
      ? '<span class="card-badge latest">最新</span>'
      : (isNew ? '<span class="card-badge new">新增</span>' : '');
    item.innerHTML = `
      <div class="card-topline">
        <div class="card-title">${escapeHtml(card.title || card.name)}</div>
        ${badge}
      </div>
      <div class="card-meta">${escapeHtml(card.name)}</div>
    `;
    item.addEventListener('click', () => {
      ensureDeckContains(card);
      selectCard(card, { showImage: true });
      closeListPanel();
    });
    els.cards.appendChild(item);
  });
}

function persistState(){
  const data = {
    currentName: state.current ? state.current.name : null,
    quizDeckNames: state.quizDeck.map(card => card.name),
    quizIndex: state.quizIndex,
    imageShown: state.imageShown,
    query: els.searchInput.value || '',
    toolsOpen: state.toolsOpen,
    recentOnly: state.recentOnly,
  };
  localStorage.setItem('flashcards-mobile-state', JSON.stringify(data));
}

function restoreState(){
  const raw = localStorage.getItem('flashcards-mobile-state');
  if (!raw) { syncStartButton(); return; }
  try {
    const saved = JSON.parse(raw);
    els.searchInput.value = saved.query || '';
    const byName = new Map(state.cards.map(card => [card.name, card]));
    state.quizDeck = Array.isArray(saved.quizDeckNames)
      ? saved.quizDeckNames.map(name => byName.get(name)).filter(Boolean)
      : [];
    state.quizIndex = Number.isInteger(saved.quizIndex) ? saved.quizIndex : -1;
    state.toolsOpen = Boolean(saved.toolsOpen);
    state.recentOnly = Boolean(saved.recentOnly);
    syncRecentButton();
    filterCards();
    syncToolsPanel();

    const current = saved.currentName ? byName.get(saved.currentName) : null;
    if (current) {
      selectCard(current, { showImage: Boolean(saved.imageShown) });
    } else {
      updateQuizInfo();
      setRevealButtonLabels();
    }
  } catch (err) {
    console.warn('Unable to restore state', err);
  }
}

function openListPanel(){
  if (isMobileLayout()) {
    els.listPanel.classList.add('open');
    els.drawerBackdrop.classList.remove('hidden');
    els.listPanel.setAttribute('aria-hidden', 'false');
    return;
  }
  els.listPanel.classList.toggle('hidden');
}

function closeListPanel(){
  els.listPanel.classList.remove('open');
  els.drawerBackdrop.classList.add('hidden');
  els.listPanel.setAttribute('aria-hidden', 'true');
}

function syncToolsPanel(){
  if (isMobileLayout()) {
    els.toolsCard.classList.toggle('open', state.toolsOpen);
  } else {
    els.toolsCard.classList.remove('open');
  }
}

function toggleReveal(){
  if (!state.current) {
    startQuiz();
    return;
  }
  if (state.imageShown) hideImage();
  else renderImage();
}

async function loadCards(){
  try {
    const res = await fetch('cards.json', { cache: 'no-store' });
    state.cards = await res.json();
    state.maxCardId = state.cards.reduce((max, card) => typeof card.id === 'number' && card.id > max ? card.id : max, 0);
    state.filteredCards = [...state.cards];
    renderCardList();
    restoreState();
    updateQuizInfo();
    setRevealButtonLabels();
    syncStartButton();
  } catch (err) {
    console.error(err);
    els.quizPrompt.textContent = '載入失敗';
    els.quizInfo.textContent = '無法讀取 cards.json';
    showPlaceholder('資料載入失敗');
  }
}

els.promptCard.addEventListener('click', () => {
  if (state.current && !state.imageShown) renderImage();
});
els.toggleListBtn.addEventListener('click', openListPanel);
els.closeListBtn.addEventListener('click', closeListPanel);
els.drawerBackdrop.addEventListener('click', closeListPanel);
els.toggleToolsBtn.addEventListener('click', () => {
  state.toolsOpen = !state.toolsOpen;
  syncToolsPanel();
  persistState();
});
els.startBtn.addEventListener('click', startQuiz);
els.promptStartBtn.addEventListener('click', startQuiz);
els.prevBtn.addEventListener('click', prevQuiz);
els.nextBtn.addEventListener('click', nextQuiz);
els.revealBtn.addEventListener('click', toggleReveal);
els.shuffleBtn.addEventListener('click', reshuffleQuiz);
els.hideBtn.addEventListener('click', hideImage);
els.randomBtn.addEventListener('click', pickRandomCard);
els.latestBtn.addEventListener('click', jumpToLatest);
els.recentBtn.addEventListener('click', toggleRecentOnly);
els.searchInput.addEventListener('input', () => {
  filterCards();
  persistState();
});
els.clearSearchBtn.addEventListener('click', () => {
  els.searchInput.value = '';
  filterCards();
  persistState();
});

let touchStartX = 0;
let touchStartY = 0;
let swipeTracking = false;

els.promptCard.addEventListener('touchstart', event => {
  if (event.touches.length !== 1) {
    swipeTracking = false;
    return;
  }
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  swipeTracking = true;
}, { passive: true });

els.promptCard.addEventListener('touchend', event => {
  if (!swipeTracking) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  swipeTracking = false;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
    if (dx < 0) nextQuiz();
    else prevQuiz();
  } else if (!state.imageShown && Math.abs(dx) < 10 && Math.abs(dy) < 10 && state.current) {
    renderImage();
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (!isMobileLayout()) {
    closeListPanel();
    els.listPanel.classList.remove('hidden');
  }
  syncToolsPanel();
});

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') nextQuiz();
  if (event.key === 'ArrowLeft') prevQuiz();
  if (event.key === ' ') {
    event.preventDefault();
    toggleReveal();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      registration.update().catch(() => {});
    }).catch(err => console.warn('SW register failed', err));
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

loadCards();
