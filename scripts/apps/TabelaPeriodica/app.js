const tableGrid = document.getElementById("table-grid");
const startBtn = document.getElementById("start-btn");
const statusEl = document.getElementById("status");
const selectedSlotEl = document.getElementById("selected-slot");
const answerInput = document.getElementById("answer-input");
const feedbackEl = document.getElementById("feedback");
const progressFillEl = document.getElementById("progress-fill");
const progressCountEl = document.getElementById("progress-count");
const progressPercentEl = document.getElementById("progress-percent");
const revealBtn = document.getElementById("reveal-btn");

let elements = [];
let selectedElement = null;
let revealed = new Set();
let started = false;

let errorCount = 0;
let hintCount = 0;
let discoveryOrder = [];
let errorByElement = new Map();

const HINT_UNLOCK_ERRORS = 3;

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

    .hidden-slot.is-selected {
      border-color: rgba(127, 208, 255, 0.95);
      box-shadow: 0 0 0 3px rgba(127, 208, 255, 0.18), 0 8px 22px rgba(0, 0, 0, 0.18);
      background: rgba(255, 255, 255, 0.16);
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);
}

function createSeriesLabelCell(kind) {
  const cell = document.createElement("div");
  cell.className = "cell series-label";

  if (kind === "lanthanides") {
    cell.innerHTML = "<strong>Lantanídeos</strong>Série destacada";
  } else {
    cell.innerHTML = "<strong>Actinídeos</strong>Série destacada";
  }

  return cell;
}

function renderTable() {
  tableGrid.innerHTML = "";

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
        if (selectedElement && selectedElement.number === element.number) {
          cell.classList.add("is-selected");
        }

        cell.textContent = "?";
        cell.title = getSlotTitle(element);

        cell.addEventListener("click", () => {
          if (!started) return;
          selectElement(element, { focusInput: true, preserveFeedback: false });
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
    return `Espaço selecionado: série dos lantanídeos • número atômico ${element.number} • erros neste bloco: ${localErrors}`;
  }

  if (element.y === 9) {
    return `Espaço selecionado: série dos actinídeos • número atômico ${element.number} • erros neste bloco: ${localErrors}`;
  }

  return `Espaço selecionado: período ${element.period}, grupo ${element.group} • número atômico ${element.number} • erros neste bloco: ${localErrors}`;
}

function selectElement(element, options = {}) {
  const { focusInput = true, preserveFeedback = false } = options;

  selectedElement = element;
  selectedSlotEl.textContent = getSelectedText(element);

  if (!preserveFeedback) {
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback-neutral";
  }

  renderTable();
  updateRevealButtonState();

  if (focusInput) {
    focusAnswerInput();
  }
}

function focusAnswerInput() {
  if (!answerInput) return;

  answerInput.focus({ preventScroll: true });

  const value = answerInput.value;
  answerInput.setSelectionRange(value.length, value.length);
}

function getNeighborCandidates(element) {
  const positions = [
    { x: element.x - 1, y: element.y },
    { x: element.x + 1, y: element.y },
    { x: element.x, y: element.y - 1 },
    { x: element.x, y: element.y + 1 },
    { x: element.x - 1, y: element.y - 1 },
    { x: element.x + 1, y: element.y - 1 },
    { x: element.x - 1, y: element.y + 1 },
    { x: element.x + 1, y: element.y + 1 }
  ];

  const neighbors = [];

  for (const pos of positions) {
    const found = findElementAtPosition(pos.x, pos.y);
    if (!found) continue;
    if (revealed.has(found.number)) continue;
    neighbors.push(found);
  }

  return neighbors;
}

function findNextAutoElement(fromElement) {
  const neighbors = getNeighborCandidates(fromElement);
  if (neighbors.length > 0) {
    return neighbors[0];
  }

  for (const el of elements) {
    if (!revealed.has(el.number)) {
      return el;
    }
  }

  return null;
}

function startGame() {
  if (!elements.length) return;

  started = true;
  revealed.clear();
  selectedElement = null;
  answerInput.value = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback-neutral";

  errorCount = 0;
  hintCount = 0;
  discoveryOrder = [];
  errorByElement = new Map();

  const first = elements[Math.floor(Math.random() * elements.length)];
  revealElement(first, "inicial");

  const nextElement = findNextAutoElement(first);

  if (nextElement) {
    selectElement(nextElement, { focusInput: true, preserveFeedback: true });
  } else {
    selectedSlotEl.textContent = "Nenhum espaço selecionado.";
    renderTable();
    updateRevealButtonState();
  }

  feedbackEl.textContent = `Jogo iniciado. Elemento inicial: ${first.name} (${first.symbol}).`;
  feedbackEl.className = "feedback-success";
  statusEl.textContent = `Jogo iniciado. Elemento inicial: ${first.name} (${first.symbol})`;

  updateProgressStatus();
  updateStats();
  renderDiscoveryOrder();
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
    feedbackEl.textContent = "Digite algo antes de confirmar.";
    feedbackEl.className = "feedback-neutral";
    return;
  }

  if (typed === acceptedName || typed === acceptedSymbol) {
    const justSolved = selectedElement;

    revealElement(justSolved, "acerto");

    const nextElement = findNextAutoElement(justSolved);

    answerInput.value = "";

    if (nextElement) {
      feedbackEl.textContent = `Correto: ${justSolved.name} (${justSolved.symbol}). Próximo bloco selecionado automaticamente.`;
      feedbackEl.className = "feedback-success";
      selectElement(nextElement, { focusInput: true, preserveFeedback: true });
    } else {
      selectedElement = null;
      selectedSlotEl.textContent = "Nenhum espaço selecionado.";
      renderTable();
      updateRevealButtonState();
      feedbackEl.textContent = `Correto: ${justSolved.name} (${justSolved.symbol}).`;
      feedbackEl.className = "feedback-success";
    }

    updateProgressStatus();
    updateStats();
    renderDiscoveryOrder();
    return;
  }

  errorCount += 1;
  errorByElement.set(selectedElement.number, getErrorsForElement(selectedElement) + 1);

  const localErrors = getErrorsForElement(selectedElement);

  if (localErrors >= HINT_UNLOCK_ERRORS) {
    feedbackEl.textContent = `Resposta incorreta. O gabarito deste bloco foi liberado (${localErrors}/${HINT_UNLOCK_ERRORS}).`;
  } else {
    feedbackEl.textContent = `Resposta incorreta. Erros neste bloco: ${localErrors}/${HINT_UNLOCK_ERRORS}.`;
  }

  feedbackEl.className = "feedback-error";
  selectedSlotEl.textContent = getSelectedText(selectedElement);

  updateStats();
  updateRevealButtonState();
  focusAnswerInput();
}

function revealSelectedElement() {
  if (!started) return;

  if (!selectedElement) {
    feedbackEl.textContent = "Selecione um bloco antes de usar o gabarito.";
    feedbackEl.className = "feedback-neutral";
    return;
  }

  if (!canRevealSelectedElement()) {
    const localErrors = getErrorsForElement(selectedElement);
    feedbackEl.textContent = `O gabarito ainda não está liberado para este bloco (${localErrors}/${HINT_UNLOCK_ERRORS}).`;
    feedbackEl.className = "feedback-neutral";
    updateRevealButtonState();
    return;
  }

  hintCount += 1;

  const hinted = selectedElement;
  revealElement(hinted, "dica");

  const nextElement = findNextAutoElement(hinted);

  answerInput.value = "";

  if (nextElement) {
    feedbackEl.textContent = `Dica usada: este bloco é ${hinted.name} (${hinted.symbol}). Próximo bloco selecionado automaticamente.`;
    feedbackEl.className = "feedback-success";
    selectElement(nextElement, { focusInput: true, preserveFeedback: true });
  } else {
    selectedElement = null;
    selectedSlotEl.textContent = "Nenhum espaço selecionado.";
    renderTable();
    updateRevealButtonState();
    feedbackEl.textContent = `Dica usada: este bloco é ${hinted.name} (${hinted.symbol}).`;
    feedbackEl.className = "feedback-success";
  }

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

answerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    submitAnswer();
  }
});

startBtn.addEventListener("click", startGame);

if (revealBtn) {
  revealBtn.addEventListener("click", revealSelectedElement);
}

async function init() {
  try {
    ensureDynamicStyles();
    await loadData();
    renderTable();
    updateProgressStatus();
    updateStats();
    renderDiscoveryOrder();
    updateRevealButtonState();
    statusEl.textContent = `Dados carregados: ${elements.length} elementos`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar os dados.";
    feedbackEl.textContent = error.message;
    feedbackEl.className = "feedback-error";
  }
}

init();
