const state = {
  cards: [],
  filteredCards: [],
  quizDeck: [],
  quizIndex: -1,
  current: null,
  zoom: 1,
  imageShown: false,
  toolsOpen: false,
};

const els = {
  promptCard: document.getElementById('promptCard'),
  quizPrompt: document.getElementById('quizPrompt'),
  quizInfo: document.getElementById('quizInfo'),
  zoomLabel: document.getElementById('zoomLabel'),
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
  resetZoomBtn: document.getElementById('resetZoomBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  fitBtn: document.getElementById('fitBtn'),
  hideBtn: document.getElementById('hideBtn'),
  randomBtn: document.getElementById('randomBtn'),
  progressFill: document.getElementById('progressFill'),
  cardCounter: document.getElementById('cardCounter'),
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

function setZoom(value, persist = true){
  state.zoom = clamp(Math.round(value * 100) / 100, 0.5, 5);
  const img = document.getElementById('quizImage');
  if (img) img.style.transform = `scale(${state.zoom})`;
  els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  if (persist) persistState();
}

function setRevealButtonLabels(){
  const label = state.imageShown ? '隱藏圖片' : '顯示圖片';
  els.revealBtn.textContent = label;
  els.hideBtn.disabled = !state.imageShown;
}

function updateProgress(){
  const total = state.quizDeck.length || state.cards.length || 0;
  const currentIndex = state.quizDeck.length && state.quizIndex >= 0 ? state.quizIndex + 1 : (state.current ? 1 : 0);
  els.cardCounter.textContent = `${currentIndex} / ${total}`;
  const pct = total && state.quizDeck.length && state.quizIndex >= 0 ? ((state.quizIndex + 1) / total) * 100 : 0;
  els.progressFill.style.width = `${pct}%`;
}

function updateQuizInfo(){
  if (!state.cards.length) {
    els.quizInfo.textContent = '尚未載入資料';
    updateProgress();
    return;
  }
  if (!state.quizDeck.length || state.quizIndex < 0 || !state.current) {
    els.quizInfo.textContent = `尚未開始 · 共 ${state.cards.length} 張卡片`;
    updateProgress();
    return;
  }
  const revealText = state.imageShown ? ' · 已顯示圖片' : ' · 尚未顯示圖片';
  els.quizInfo.textContent = `進度 ${state.quizIndex + 1} / ${state.quizDeck.length}${revealText}`;
  updateProgress();
}

function showPlaceholder(text){
  els.viewerTitle.textContent = '圖片';
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
  setZoom(1, false);

  if (options.showImage) {
    renderImage();
  } else {
    showPlaceholder('輕點上方題目卡片，或按底部「顯示圖片」查看內容');
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
  let lastTap = 0;
  img.addEventListener('click', () => {});
  img.addEventListener('dblclick', event => {
    event.preventDefault();
    if (state.zoom > 1.1) {
      setZoom(1);
    } else {
      setZoom(2.2);
    }
  });
  img.addEventListener('touchend', () => {
    const now = Date.now();
    if (now - lastTap < 260) {
      if (state.zoom > 1.1) setZoom(1);
      else setZoom(2.2);
    }
    lastTap = now;
  });
  state.imageShown = true;
  setZoom(state.zoom, false);
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
  if (state.quizIndex >= state.quizDeck.length) {
    state.quizIndex = 0;
  }
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
  state.filteredCards = !q
    ? [...state.cards]
    : state.cards.filter(card => (card.title || '').toLowerCase().includes(q) || (card.name || '').toLowerCase().includes(q));
  renderCardList();
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
    item.className = 'card-item' + (state.current && state.current.name === card.name ? ' active' : '');
    item.innerHTML = `
      <div class="card-title">${escapeHtml(card.title || card.name)}</div>
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
    zoom: state.zoom,
    imageShown: state.imageShown,
    query: els.searchInput.value || '',
    toolsOpen: state.toolsOpen,
  };
  localStorage.setItem('flashcards-mobile-state', JSON.stringify(data));
}

function restoreState(){
  const raw = localStorage.getItem('flashcards-mobile-state');
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    els.searchInput.value = saved.query || '';
    const byName = new Map(state.cards.map(card => [card.name, card]));
    state.quizDeck = Array.isArray(saved.quizDeckNames)
      ? saved.quizDeckNames.map(name => byName.get(name)).filter(Boolean)
      : [];
    state.quizIndex = Number.isInteger(saved.quizIndex) ? saved.quizIndex : -1;
    state.zoom = typeof saved.zoom === 'number' ? saved.zoom : 1;
    state.toolsOpen = Boolean(saved.toolsOpen);
    filterCards();
    syncToolsPanel();

    const current = saved.currentName ? byName.get(saved.currentName) : null;
    if (current) {
      selectCard(current, { showImage: Boolean(saved.imageShown) });
      setZoom(state.zoom, false);
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
    state.filteredCards = [...state.cards];
    renderCardList();
    restoreState();
    updateQuizInfo();
    setRevealButtonLabels();
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
els.prevBtn.addEventListener('click', prevQuiz);
els.nextBtn.addEventListener('click', nextQuiz);
els.revealBtn.addEventListener('click', toggleReveal);
els.shuffleBtn.addEventListener('click', reshuffleQuiz);
els.hideBtn.addEventListener('click', hideImage);
els.randomBtn.addEventListener('click', pickRandomCard);
els.resetZoomBtn.addEventListener('click', () => setZoom(1));
els.fitBtn.addEventListener('click', () => setZoom(1));
els.zoomOutBtn.addEventListener('click', () => setZoom(state.zoom - 0.2));
els.zoomInBtn.addEventListener('click', () => setZoom(state.zoom + 0.2));
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
els.imageViewport.addEventListener('touchstart', event => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

els.imageViewport.addEventListener('touchend', event => {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
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
