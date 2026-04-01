const tableGrid = document.getElementById("table-grid");
const startBtn = document.getElementById("start-btn");
const statusEl = document.getElementById("status");
const selectedSlotEl = document.getElementById("selected-slot");
const mobileSelectedSlotEl = document.getElementById("mobile-selected-slot");
const answerInput = document.getElementById("answer-input");
const feedbackEl = document.getElementById("feedback");
const progressFillEl = document.getElementById("progress-fill");
const progressCountEl = document.getElementById("progress-count");
const progressPercentEl = document.getElementById("progress-percent");
const revealBtn = document.getElementById("reveal-btn");
const boardWrap = document.getElementById("board-wrap");
const mobileOpenInputBtn = document.getElementById("mobile-open-input-btn");

let elements = [];
let selectedElement = null;
let selectedCellEl = null;
let revealed = new Set();
let started = false;

let errorCount = 0;
let hintCount = 0;
let discoveryOrder = [];
let errorByElement = new Map();

const HINT_UNLOCK_ERRORS = 3;
const MOBILE_BREAKPOINT = 768;

function isMobileLayout() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

async function loadData() {
  const response = await fetch("./data/periodic_table_pt.json");
  if (!response.ok) {
    throw new Error(`Falha ao carregar JSON: ${response.status}`);
  }

  elements = await response.json();
}

function findElementAtPosition(x, y) {
  return elements.find((el) => el.x === x && el.y === y) || null;
}

function normalize(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getErrorsForElement(element) {
  if (!element) return 0;
  return errorByElement.get(element.number) || 0;
}

function canRevealSelectedElement() {
  if (!selectedElement) return false;
  return getErrorsForElement(selectedElement) >= HINT_UNLOCK_ERRORS;
}

function updateRevealButtonState() {
  if (!revealBtn) return;

  if (!started || !selectedElement) {
    revealBtn.disabled = true;
    revealBtn.textContent = "Mostrar elemento do bloco";
    return;
  }

  const localErrors = getErrorsForElement(selectedElement);

  if (localErrors >= HINT_UNLOCK_ERRORS) {
    revealBtn.disabled = false;
    revealBtn.textContent = "Mostrar elemento do bloco";
    return;
  }

  revealBtn.disabled = true;
  revealBtn.textContent = `Gabarito libera com ${HINT_UNLOCK_ERRORS} erros (${localErrors}/${HINT_UNLOCK_ERRORS})`;
}

function ensureDynamicStyles() {
  if (document.getElementById("tpw1-dynamic-styles")) return;

  const style = document.createElement("style");
  style.id = "tpw1-dynamic-styles";
  style.textContent = `
    .series-label {
      border-radius: 18px;
      border: 1px dashed rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.04);
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      line-height: 1.25;
      padding: 8px;
      justify-content: flex-start;
      text-align: left;
    }

    .series-label strong {
      display: block;
      color: var(--text);
      font-size: 13px;
      text-transform: none;
      letter-spacing: 0;
      margin-bottom: 2px;
    }
  `;
  document.head.appendChild(style);
}

function createSeriesLabelCell(kind) {
  const cell = document.createElement("div");
  cell.className = "cell series-label";

  if (kind === "lanthanides") {
    cell.innerHTML = "<strong>Lantanídeos</strong>Série 6f / bloco destacado";
  } else {
    cell.innerHTML = "<strong>Actinídeos</strong>Série 7f / bloco destacado";
  }

  return cell;
}

function clearSelectedCellVisual() {
  if (selectedCellEl) {
    selectedCellEl.classList.remove("selected-mobile");
  }
  selectedCellEl = null;
}

function syncSelectedLabels() {
  const text = selectedElement
    ? getSelectedText(selectedElement)
    : "Nenhum espaço selecionado.";

  if (selectedSlotEl) {
    selectedSlotEl.textContent = text;
  }

  if (mobileSelectedSlotEl) {
    mobileSelectedSlotEl.textContent = text;
  }
}

function setFeedback(message, type = "neutral") {
  if (!feedbackEl) return;

  feedbackEl.textContent = message;
  feedbackEl.className =
    type === "success"
      ? "feedback-success"
      : type === "error"
      ? "feedback-error"
      : "feedback-neutral";
}

function updateKeyboardState() {
  if (!window.visualViewport) return;

  const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.78;
  document.body.classList.toggle("keyboard-open", keyboardOpen);
}

function setupViewportHandling() {
  if (!window.visualViewport) return;

  window.visualViewport.addEventListener("resize", updateKeyboardState);
  window.visualViewport.addEventListener("scroll", updateKeyboardState);
  updateKeyboardState();
}

function scrollCellIntoView(cell) {
  if (!cell) return;

  try {
    cell.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center"
    });
  } catch {
    cell.scrollIntoView();
  }
}

function openMobileInput() {
  if (!isMobileLayout()) {
    answerInput?.focus();
    return;
  }

  if (!selectedElement) {
    setFeedback("Selecione um bloco antes de digitar.", "neutral");
    return;
  }

  if (!answerInput) return;

  window.requestAnimationFrame(() => {
    answerInput.focus({ preventScroll: true });
    setTimeout(() => {
      answerInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  });
}

function handleCellSelection(element, cell) {
  if (!started) return;

  selectedElement = element;
  clearSelectedCellVisual();
  selectedCellEl = cell;

  if (isMobileLayout() && selectedCellEl) {
    selectedCellEl.classList.add("selected-mobile");
  }

  syncSelectedLabels();
  setFeedback("Bloco selecionado. Digite o símbolo ou nome do elemento.", "neutral");
  updateRevealButtonState();
  scrollCellIntoView(cell);

  if (!isMobileLayout()) {
    answerInput?.focus({ preventScroll: true });
  } else {
    answerInput?.blur();
  }
}

function renderTable() {
  tableGrid.innerHTML = "";
  clearSelectedCellVisual();

  for (let y = 1; y <= 9; y++) {
    for (let x = 1; x <= 18; x++) {
      if ((y === 8 || y === 9) && x <= 3) {
        if (x === 1) {
          const labelCell = createSeriesLabelCell(y === 8 ? "lanthanides" : "actinides");
          labelCell.style.gridColumn = "span 3";
          tableGrid.appendChild(labelCell);
        }
        continue;
      }

      const cell = document.createElement("div");
      cell.classList.add("cell");

      const element = findElementAtPosition(x, y);

      if (!element) {
        cell.classList.add("empty");
        tableGrid.appendChild(cell);
        continue;
      }

      if (revealed.has(element.number)) {
        cell.classList.add("element");
        cell.textContent = element.symbol;
        cell.title = `${element.name} (${element.symbol}) • Z=${element.number}`;
      } else {
        cell.classList.add("hidden-slot");
        cell.textContent = "?";
        cell.title = getSlotTitle(element);

        if (selectedElement && selectedElement.number === element.number && isMobileLayout()) {
          cell.classList.add("selected-mobile");
          selectedCellEl = cell;
        }

        cell.addEventListener("click", () => {
          handleCellSelection(element, cell);
        });
      }

      tableGrid.appendChild(cell);
    }
  }
}

function getSlotTitle(element) {
  if (element.y === 8) {
    return `Lantanídeo • Z=${element.number}`;
  }

  if (element.y === 9) {
    return `Actinídeo • Z=${element.number}`;
  }

  return `Período ${element.period}, grupo ${element.group} • Z=${element.number}`;
}

function getSelectedText(element) {
  const localErrors = getErrorsForElement(element);

  if (element.y === 8) {
    return `Lantanídeos • Z=${element.number} • erros neste bloco: ${localErrors}`;
  }

  if (element.y === 9) {
    return `Actinídeos • Z=${element.number} • erros neste bloco: ${localErrors}`;
  }

  return `Período ${element.period}, grupo ${element.group} • Z=${element.number} • erros neste bloco: ${localErrors}`;
}

function resetSelection() {
  selectedElement = null;
  clearSelectedCellVisual();
  syncSelectedLabels();
  updateRevealButtonState();
}

function startGame() {
  if (!elements.length) return;

  started = true;
  revealed.clear();
  resetSelection();
  answerInput.value = "";

  errorCount = 0;
  hintCount = 0;
  discoveryOrder = [];
  errorByElement = new Map();

  const first = elements[Math.floor(Math.random() * elements.length)];
  revealElement(first, "inicial");

  setFeedback(`Jogo iniciado. Elemento inicial: ${first.name} (${first.symbol}).`, "success");
  statusEl.textContent = `Jogo iniciado. Elemento inicial: ${first.name} (${first.symbol})`;

  renderTable();
  updateProgressStatus();
  updateStats();
  renderDiscoveryOrder();
  updateRevealButtonState();

  if (boardWrap) {
    boardWrap.scrollTop = 0;
    boardWrap.scrollLeft = 0;
  }
}

function revealElement(element, source = "acerto") {
  if (revealed.has(element.number)) return;

  revealed.add(element.number);
  discoveryOrder.push({
    order: discoveryOrder.length + 1,
    symbol: element.symbol,
    name: element.name,
    number: element.number,
    source
  });
}

function submitAnswer() {
  if (!started) return;
  if (!selectedElement) return;

  const typed = normalize(answerInput.value);
  const acceptedName = normalize(selectedElement.name);
  const acceptedSymbol = normalize(selectedElement.symbol);

  if (!typed) {
    setFeedback("Digite algo antes de confirmar.", "neutral");
    return;
  }

  if (typed === acceptedName || typed === acceptedSymbol) {
    const justSolved = selectedElement;

    revealElement(justSolved, "acerto");

    setFeedback(`Correto: ${justSolved.name} (${justSolved.symbol})`, "success");
    answerInput.value = "";
    resetSelection();

    renderTable();
    updateProgressStatus();
    updateStats();
    renderDiscoveryOrder();
    return;
  }

  errorCount += 1;
  errorByElement.set(selectedElement.number, getErrorsForElement(selectedElement) + 1);

  const localErrors = getErrorsForElement(selectedElement);

  if (localErrors >= HINT_UNLOCK_ERRORS) {
    setFeedback(
      `Resposta incorreta. O gabarito deste bloco foi liberado (${localErrors}/${HINT_UNLOCK_ERRORS}).`,
      "error"
    );
  } else {
    setFeedback(
      `Resposta incorreta. Erros neste bloco: ${localErrors}/${HINT_UNLOCK_ERRORS}.`,
      "error"
    );
  }

  syncSelectedLabels();
  updateStats();
  updateRevealButtonState();
}

function revealSelectedElement() {
  if (!started) return;

  if (!selectedElement) {
    setFeedback("Selecione um bloco antes de usar o gabarito.", "neutral");
    return;
  }

  if (!canRevealSelectedElement()) {
    const localErrors = getErrorsForElement(selectedElement);
    setFeedback(
      `O gabarito ainda não está liberado para este bloco (${localErrors}/${HINT_UNLOCK_ERRORS}).`,
      "neutral"
    );
    updateRevealButtonState();
    return;
  }

  hintCount += 1;

  const hinted = selectedElement;
  revealElement(hinted, "dica");

  setFeedback(`Dica usada: este bloco é ${hinted.name} (${hinted.symbol}).`, "success");
  answerInput.value = "";
  resetSelection();

  renderTable();
  updateProgressStatus();
  updateStats();
  renderDiscoveryOrder();
}

function updateProgressStatus() {
  const total = elements.length;
  const done = revealed.size;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  if (done === total) {
    statusEl.textContent = `Parabéns! Tabela concluída: ${done}/${total} elementos revelados.`;
  } else {
    statusEl.textContent = `Progresso: ${done}/${total} elementos revelados.`;
  }

  if (progressFillEl) {
    progressFillEl.style.width = `${percent}%`;
  }

  if (progressCountEl) {
    progressCountEl.textContent = `${done} / ${total}`;
  }

  if (progressPercentEl) {
    progressPercentEl.textContent = `${percent}%`;
  }
}

function updateStats() {
  const errorsEl = document.getElementById("stats-errors");
  const hintsEl = document.getElementById("stats-hints");
  const revealedEl = document.getElementById("stats-revealed");

  if (errorsEl) errorsEl.textContent = String(errorCount);
  if (hintsEl) hintsEl.textContent = String(hintCount);
  if (revealedEl) revealedEl.textContent = String(revealed.size);
}

function renderDiscoveryOrder() {
  const listEl = document.getElementById("discovery-list");
  const emptyEl = document.getElementById("discovery-empty");

  if (!listEl || !emptyEl) return;

  listEl.innerHTML = "";

  if (discoveryOrder.length === 0) {
    emptyEl.style.display = "block";
    listEl.style.display = "none";
    return;
  }

  emptyEl.style.display = "none";
  listEl.style.display = "block";

  discoveryOrder.forEach((item) => {
    const li = document.createElement("li");
    const suffix = item.source === "dica"
      ? " — por dica"
      : item.source === "inicial"
      ? " — inicial"
      : "";
    li.textContent = `${item.order}. ${item.name} (${item.symbol}) • Z=${item.number}${suffix}`;
    listEl.appendChild(li);
  });
}

function handleResize() {
  updateKeyboardState();

  if (!isMobileLayout()) {
    clearSelectedCellVisual();
    if (selectedElement && answerInput) {
      answerInput.blur();
    }
  } else if (selectedElement && selectedCellEl) {
    selectedCellEl.classList.add("selected-mobile");
  }

  syncSelectedLabels();
}

answerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitAnswer();
  }
});

answerInput.addEventListener("focus", () => {
  document.body.classList.add("keyboard-open");
});

answerInput.addEventListener("blur", () => {
  setTimeout(() => updateKeyboardState(), 120);
});

startBtn.addEventListener("click", startGame);

if (revealBtn) {
  revealBtn.addEventListener("click", revealSelectedElement);
}

if (mobileOpenInputBtn) {
  mobileOpenInputBtn.addEventListener("click", openMobileInput);
}

window.addEventListener("resize", handleResize);

async function init() {
  try {
    ensureDynamicStyles();
    setupViewportHandling();
    await loadData();
    renderTable();
    updateProgressStatus();
    updateStats();
    renderDiscoveryOrder();
    syncSelectedLabels();
    updateRevealButtonState();
    statusEl.textContent = `Dados carregados: ${elements.length} elementos`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar os dados.";
    setFeedback(error.message, "error");
  }
}

init();
