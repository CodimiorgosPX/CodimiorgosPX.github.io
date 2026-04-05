
// Sftw1_UI_Shell.js
// Extração progressiva da UI de shell/estudo/navegação.
// Objetivo deste passo:
// - separar da UI principal tudo que NÃO é sessão de jogo
// - manter o corte por responsabilidade (explorar / banco / busca / estudo)
// - preparar delegação futura sem quebrar o contrato atual do Core
//
// Este módulo NÃO injeta nada sozinho no Core.
// Ele foi feito para ser usado pelo Sftw1_UI.js como helper/coordenador.
//
// Responsabilidades aqui:
// - tabs e navegação geral
// - refatoração visual Explore/Jogos (parte estrutural)
// - banco flutuante
// - busca de constelações
// - knowledge hub (constelações / estrelas / asterismos)
// - toggles gerais de visualização
// - tipo de nome / foco / reset de vista
//
// Ficam FORA daqui (e devem viver em Sftw1_UI_Games.js):
// - jogo principal de constelações
// - checklist / progresso / HUD de sessão
// - Neighbor Game
// - Messier Game
// - callbacks de sessão
// - modal de seleção de constelação

class Sftw1_UI_Shell {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.sftw = uiInstance?.sftw || null;
        this.elements = uiInstance?.elements || {};
    }

    // ============================================================
    // HOOKS PRINCIPAIS
    // ============================================================

    cacheElements() {
        // Controles gerais de visualização
        this.elements.toggleGrid = document.getElementById('toggle-grid');
        this.elements.toggleBoundaries = document.getElementById('toggle-boundaries');
        this.elements.toggleLabels = document.getElementById('toggle-labels');
        this.elements.toggleStars = document.getElementById('toggle-stars');
        this.elements.toggleMessier = document.getElementById('toggle-messier');
        this.elements.toggleAsterisms = document.getElementById('toggle-asterisms');
        this.elements.toggleAsterismLabels = document.getElementById('toggle-asterism-labels');

        // Busca / foco / navegação
        this.elements.searchInput = document.getElementById('constellation-search-input');
        this.elements.searchButton = document.getElementById('btn-search-constellation');
        this.elements.btnFocusOrion = document.getElementById('btn-focus-orion');
        this.elements.btnResetView = document.getElementById('btn-reset-view');

        // Nome das constelações
        this.elements.nameTypeButtons = document.querySelectorAll('.name-type-btn');

        // Knowledge hub
        this.elements.globalSearchInput = document.getElementById('global-search-input');
        this.elements.btnGlobalSearch = document.getElementById('btn-global-search');
        this.elements.globalSearchResults = document.getElementById('global-search-results');
        this.elements.starSearchInput = document.getElementById('star-search-input');
        this.elements.starSearchConstellation = document.getElementById('star-search-constellation');
        this.elements.starSearchMagMax = document.getElementById('star-search-mag-max');
        this.elements.btnSearchStar = document.getElementById('btn-search-star');
        this.elements.starSearchResults = document.getElementById('star-search-results');

        this.elements.catalogConstellationFilter = document.getElementById('catalog-constellation-filter');
        this.elements.catalogConstellationStarsNamedOnly = document.getElementById('catalog-constellation-stars-named-only');
        this.elements.catalogConstellationStarsMagMax = document.getElementById('catalog-constellation-stars-mag-max');
        this.elements.catalogConstellationList = document.getElementById('catalog-constellation-list');
        this.elements.catalogConstellationDetail = document.getElementById('catalog-constellation-detail');
        this.elements.catalogAsterismFilter = document.getElementById('catalog-asterism-filter');
        this.elements.catalogAsterismList = document.getElementById('catalog-asterism-list');
        this.elements.catalogAsterismDetail = document.getElementById('catalog-asterism-detail');

        // Banco flutuante
        this.elements.bankWorkspace = document.getElementById('sftw-bank-workspace');
        this.elements.bankWindow = document.getElementById('sftw-bank-window');
        this.elements.bankWindowBody = document.getElementById('sftw-bank-window-body');
        this.elements.bankWindowTitle = document.getElementById('sftw-bank-window-title');
        this.elements.btnOpenBankWindow = document.getElementById('btn-open-bank-window');
        this.elements.btnCloseBankWindow = document.getElementById('btn-close-bank-window');
        this.elements.btnMinimizeBankWindow = document.getElementById('btn-minimize-bank-window');
        this.elements.btnMaximizeBankWindow = document.getElementById('btn-maximize-bank-window');
        this.elements.btnDockBankLeft = document.getElementById('btn-dock-bank-left');
        this.elements.btnDockBankRight = document.getElementById('btn-dock-bank-right');
        this.elements.bankResizeHandle = document.getElementById('sftw-bank-resize-handle');
        this.elements.bankInternalTabs = document.querySelectorAll('.sftw-bank-tab');
        this.elements.bankPanels = document.querySelectorAll('.sftw-bank-panel');
        this.elements.bankStarSearchInput = document.getElementById('bank-star-search-input');
        this.elements.bankStarSearchConstellation = document.getElementById('bank-star-search-constellation');
        this.elements.bankStarSearchMagMax = document.getElementById('bank-star-search-mag-max');
        this.elements.bankStarSort = document.getElementById('bank-star-sort');
        this.elements.bankStarImportantOnly = document.getElementById('bank-star-important-only');
        this.elements.bankStarResults = document.getElementById('bank-star-results');
        this.elements.bankStarCount = document.getElementById('bank-star-count');

        // Estrelas / estudo
        this.elements.starInspectorStatus = document.getElementById('star-inspector-status');
        this.elements.starInspectorName = document.getElementById('star-inspector-name');
        this.elements.starInspectorConstellation = document.getElementById('star-inspector-constellation');
        this.elements.starInspectorMagnitude = document.getElementById('star-inspector-magnitude');
        this.elements.starInspectorRa = document.getElementById('star-inspector-ra');
        this.elements.starInspectorDec = document.getElementById('star-inspector-dec');
        this.elements.starInspectorSpectral = document.getElementById('star-inspector-spectral');
        this.elements.starCatalogTotal = document.getElementById('star-catalog-total');
        this.elements.starNamedCount = document.getElementById('star-named-count');
        this.elements.starTrainingPoolCount = document.getElementById('star-training-pool-count');
        this.elements.starFilterNamedOnly = document.getElementById('star-filter-named-only');
        this.elements.starFilterMagnitudeMax = document.getElementById('star-filter-magnitude-max');
        this.elements.starFilterConstellation = document.getElementById('star-filter-constellation');
        this.elements.btnStarRefreshPool = document.getElementById('btn-star-refresh-pool');
    }

    setupShellEvents() {
        this.setupTabEvents();
        this.setupVisualizationEvents();
        this.setupSearchEvents();
        this.setupNameTypeEvents();
        this.setupNavigationEvents();
        this.setupBankWindowEvents();
        this.setupKnowledgeHubEvents();
        this.setupStarInspectorEvents();
    }

    postLayoutRefactor() {
        this.ensureStageOneRefactorStyles();
        this.applyStageOneLayoutRefactor();
        this.setupBankWorkspace();
        this.addBankWindowStyles();
        this.setupMobileUIEnhancements();
    }

    // ============================================================
    // UTILITÁRIOS DE TEXTO / CATÁLOGO
    // ============================================================

    normalizeStudyText(value) {
        return (value || '')
            .toString()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    hasUsefulStarName(star) {
        const name = (star?.name || '').toString().trim();
        if (!name) return false;
        if (/^Star\s+\d+$/i.test(name)) return false;
        if (name.length <= 2) return false;
        return true;
    }

    getDisplayStarName(star) {
        if (!star) return '—';
        return this.hasUsefulStarName(star) ? star.name : `Star ${star.id ?? '—'}`;
    }

    formatRAHours(raHours) {
        const h0 = Number(raHours);
        if (!Number.isFinite(h0)) return '—';
        let totalSeconds = Math.round((((h0 % 24) + 24) % 24) * 3600);
        const h = Math.floor(totalSeconds / 3600);
        totalSeconds -= h * 3600;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds - m * 60;
        return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }

    formatDecDegrees(decDeg) {
        const d0 = Number(decDeg);
        if (!Number.isFinite(d0)) return '—';
        const sign = d0 >= 0 ? '+' : '−';
        let totalArcSec = Math.round(Math.abs(d0) * 3600);
        const d = Math.floor(totalArcSec / 3600);
        totalArcSec -= d * 3600;
        const m = Math.floor(totalArcSec / 60);
        const s = totalArcSec - m * 60;
        return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′ ${String(s).padStart(2, '0')}″`;
    }

    // ============================================================
    // REFACTOR VISUAL DA ETAPA 1
    // ============================================================

    ensureStageOneRefactorStyles() {
        if (document.getElementById('sftw-stage1-refactor-style')) return;
        const style = document.createElement('style');
        style.id = 'sftw-stage1-refactor-style';
        style.textContent = `
            .sftw-search-hub,.sftw-games-shell{display:grid;gap:14px;}
            .sftw-search-hub{margin-top:14px;}
            .sftw-section-kicker{font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc;margin-bottom:8px;}
            .sftw-observation-groups{display:grid;gap:12px;}
            .sftw-observation-group{padding:12px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);}
            .sftw-observation-group-title{display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:8px;color:#e6f4ff;}
            .sftw-observation-group .sftw-togglelist{margin-top:0;}
            .sftw-games-mode{display:grid;gap:12px;padding:14px;border-radius:18px;background:linear-gradient(180deg, rgba(8,15,35,0.72), rgba(7,10,22,0.82));border:1px solid rgba(125,211,252,0.14);box-shadow:0 12px 34px rgba(0,0,0,.22);}
            .sftw-games-mode-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
            .sftw-games-mode-title{font-size:1rem;font-weight:800;color:#f8fbff;display:flex;align-items:center;gap:10px;}
            .sftw-games-mode-copy{font-size:.9rem;color:rgba(222,235,255,.78);max-width:68ch;}
            .sftw-games-mode-body{display:grid;gap:12px;}
        `;
        document.head.appendChild(style);
    }

    applyStageOneLayoutRefactor() {
        const root = this.ui?.uiContainer || document;
        const explorePanel = root.querySelector('[data-panel="explore"]');
        const searchPanel = root.querySelector('[data-panel="search"]');
        const gamesPanel = root.querySelector('[data-panel="games"]');
        const constellationPanel = root.querySelector('[data-panel="constellations"]');
        const messierPanel = root.querySelector('[data-panel="messier"]');

        if (explorePanel) {
            const introCard = explorePanel.querySelector('.sftw-card-intro');
            const searchCard = explorePanel.querySelector('#constellation-search-input')?.closest('.sftw-card');
            const nameTypeCard = Array.from(explorePanel.querySelectorAll('.sftw-card')).find(card => card.textContent.includes('Tipo de nome'));
            const visualCard = explorePanel.querySelector('#toggle-grid')?.closest('.sftw-card');
            const messierToggleCard = messierPanel?.querySelector('#toggle-messier')?.closest('.sftw-card') || null;

            const current = {
                grid: !!explorePanel.querySelector('#toggle-grid')?.checked,
                boundaries: !!explorePanel.querySelector('#toggle-boundaries')?.checked,
                labels: !!explorePanel.querySelector('#toggle-labels')?.checked,
                stars: !!explorePanel.querySelector('#toggle-stars')?.checked,
                messier: !!messierPanel?.querySelector('#toggle-messier')?.checked,
                asterisms: typeof this.sftw?.isAsterismsVisible === 'function'
                    ? !!this.sftw.isAsterismsVisible()
                    : !!this.sftw?.visualization?.asterismsVisible,
                asterismLabels: typeof this.sftw?.isAsterismLabelsVisible === 'function'
                    ? !!this.sftw.isAsterismLabelsVisible()
                    : !!this.sftw?.visualization?.asterismLabelsVisible
            };

            if (searchCard) {
                const head = searchCard.querySelector('.sftw-card-title');
                const help = searchCard.querySelector('.sftw-help');
                if (head) head.innerHTML = '<i class="fas fa-location-crosshairs"></i> Foco rápido';
                if (help) help.innerHTML = 'Use nome, sigla ou português. O foco continua reaproveitando o sistema atual de constelações.';
            }

            const searchHub = document.createElement('div');
            searchHub.id = 'explore-search-hub';
            searchHub.className = 'sftw-search-hub';
            searchHub.innerHTML = '<div class="sftw-section-kicker">Pesquisa integrada</div>';
            if (searchCard) searchHub.appendChild(searchCard);

            if (searchPanel) {
                Array.from(searchPanel.children).forEach((child, idx) => {
                    if (idx === 0 && child.classList?.contains('sftw-card-intro')) return;
                    searchHub.appendChild(child);
                });
                searchPanel.remove();
            }

            if (introCard) introCard.insertAdjacentElement('afterend', searchHub);
            else explorePanel.prepend(searchHub);

            if (visualCard) {
                visualCard.innerHTML = `
                    <div class="sftw-card-h sftw-card-h-split">
                        <div class="sftw-card-title"><i class="fas fa-sliders"></i> Camadas de observação</div>
                        <span class="muted">organizado por tipo</span>
                    </div>
                    <div class="sftw-observation-groups">
                        <div class="sftw-observation-group">
                            <div class="sftw-observation-group-title"><i class="fas fa-shapes"></i><span>Constelações</span></div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle"><input id="toggle-boundaries" type="checkbox" ${current.boundaries ? 'checked' : ''}><span>Mostrar limites</span></label>
                                <label class="sftw-toggle"><input id="toggle-labels" type="checkbox" ${current.labels ? 'checked' : ''}><span>Mostrar nomes</span></label>
                            </div>
                        </div>
                        <div class="sftw-observation-group">
                            <div class="sftw-observation-group-title"><i class="fas fa-star"></i><span>Objetos do céu</span></div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle"><input id="toggle-stars" type="checkbox" ${current.stars ? 'checked' : ''}><span>Estrelas</span></label>
                                <label class="sftw-toggle"><input id="toggle-messier" type="checkbox" ${current.messier ? 'checked' : ''}><span>Objetos Messier</span></label>
                                <label class="sftw-toggle"><input id="toggle-asterisms" type="checkbox" ${current.asterisms ? 'checked' : ''}><span>Asterismos</span></label>
                                <label class="sftw-toggle"><input id="toggle-asterism-labels" type="checkbox" ${current.asterismLabels ? 'checked' : ''}><span>Nomes dos asterismos</span></label>
                            </div>
                        </div>
                        <div class="sftw-observation-group">
                            <div class="sftw-observation-group-title"><i class="fas fa-ruler-combined"></i><span>Referências do céu</span></div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle"><input id="toggle-grid" type="checkbox" ${current.grid ? 'checked' : ''}><span>Grade celeste</span></label>
                            </div>
                            <div class="sftw-divider"></div>
                            <div class="sftw-row sftw-row-wrap">
                                <button id="btn-focus-orion" class="sftw-btn" type="button"><i class="fas fa-crosshairs"></i><span>Focar Ori</span></button>
                                <button id="btn-reset-view" class="sftw-btn" type="button"><i class="fas fa-rotate-left"></i><span>Reset</span></button>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (nameTypeCard) {
                const head = nameTypeCard.querySelector('.sftw-card-title');
                if (head) head.innerHTML = '<i class="fas fa-font"></i> Rótulos das constelações';
            }

            if (messierToggleCard) messierToggleCard.remove();
        }

        if (gamesPanel) {
            const shell = gamesPanel.querySelector('#games-main-shell');
            if (shell) {
                const makeModeSection = (icon, title, copy) => {
                    const section = document.createElement('section');
                    section.className = 'sftw-games-mode';
                    section.innerHTML = `
                        <div class="sftw-games-mode-header">
                            <div>
                                <div class="sftw-games-mode-title"><i class="${icon}"></i><span>${title}</span></div>
                                <div class="sftw-games-mode-copy">${copy}</div>
                            </div>
                        </div>
                        <div class="sftw-games-mode-body"></div>
                    `;
                    return section;
                };

                if (!shell.dataset.shellBuilt) {
                    const game1 = makeModeSection(
                        'fas fa-shapes',
                        'Jogo das Constelações',
                        'Reconhecimento, checklist de progresso e treino de vizinhanças ficam agrupados como um mesmo ambiente de treino.'
                    );
                    const messier = makeModeSection(
                        'fas fa-bullseye',
                        'Jogo do Messier',
                        'Sessão de identificação Messier separada visualmente do modo de exploração.'
                    );

                    shell.appendChild(game1);
                    shell.appendChild(messier);

                    const body1 = game1.querySelector('.sftw-games-mode-body');
                    const bodyM = messier.querySelector('.sftw-games-mode-body');

                    if (constellationPanel) {
                        Array.from(constellationPanel.children).forEach((child, idx) => {
                            if (idx === 0 && child.classList?.contains('sftw-card-intro')) return;
                            body1.appendChild(child);
                        });
                        constellationPanel.remove();
                    }

                    if (messierPanel) {
                        Array.from(messierPanel.children).forEach((child, idx) => {
                            if (idx === 0 && child.classList?.contains('sftw-card-intro')) return;
                            if (child.querySelector?.('#toggle-messier')) return;
                            bodyM.appendChild(child);
                        });
                        messierPanel.remove();
                    }

                    shell.dataset.shellBuilt = '1';
                }
            }
        }
    }

    // ============================================================
    // TABS / NAVEGAÇÃO GERAL
    // ============================================================

    setupTabEvents() {
        const tabs = Array.from(document.querySelectorAll('.sftw-tab'));
        const panels = Array.from(document.querySelectorAll('.sftw-tabpanel'));
        if (tabs.length === 0 || panels.length === 0) return;

        const normalizeTabName = (raw) => {
            const name = String(raw || '').trim().toLowerCase();
            if (!name) return 'explore';

            const aliasMap = {
                constellations: 'games',
                constellation: 'games',
                game: 'games',
                jogos: 'games',
                messier: 'games',
                neighbor: 'games',
                neighborgame: 'games',
                starscatalog: 'stars',
                star: 'stars',
                search: 'explore',
                banco: 'catalog'
            };

            return aliasMap[name] || name;
        };

        const activate = (rawName) => {
            const name = normalizeTabName(rawName);

            if (name === 'catalog') {
                const fallback = normalizeTabName(
                    this.ui.activeMainTab && this.ui.activeMainTab !== 'catalog'
                        ? this.ui.activeMainTab
                        : 'explore'
                );
                this.ui.activeMainTab = fallback;

                for (const t of tabs) t.classList.toggle('active', t.dataset.tab === fallback);
                for (const p of panels) p.classList.toggle('active', p.dataset.panel === fallback);

                this.openBankWindow?.();
                return fallback;
            }

            this.ui.activeMainTab = name;
            for (const t of tabs) t.classList.toggle('active', t.dataset.tab === name);
            for (const p of panels) p.classList.toggle('active', p.dataset.panel === name);
            return name;
        };

        this.ui.activateMainTab = activate;

        for (const t of tabs) {
            if (t.dataset.bound === '1') continue;
            t.addEventListener('click', () => activate(t.dataset.tab));
            t.dataset.bound = '1';
        }

        activate(this.ui.activeMainTab || 'explore');
    }

    setupNavigationEvents() {
        if (this.elements.btnFocusOrion && !this.elements.btnFocusOrion.dataset.bound) {
            this.elements.btnFocusOrion.addEventListener('click', () => this.focusOnConstellation('Ori'));
            this.elements.btnFocusOrion.dataset.bound = '1';
        }

        if (this.elements.btnResetView && !this.elements.btnResetView.dataset.bound) {
            this.elements.btnResetView.addEventListener('click', () => this.resetView());
            this.elements.btnResetView.dataset.bound = '1';
        }
    }

    resetView() {
        if (this.sftw.sceneManager && this.sftw.sceneManager.isPlanetariumMode) {
            this.sftw.sceneManager.planetariumSettings.rotation.x = 0;
            this.sftw.sceneManager.planetariumSettings.rotation.y = 0;
            this.sftw.sceneManager.camera.fov = 60;
            this.sftw.sceneManager.camera.updateProjectionMatrix();
            this.ui.showMessage?.('Vista resetada', 'info');
        }
    }

    // ============================================================
    // TOGGLES GERAIS DE VISUALIZAÇÃO
    // ============================================================

    setupVisualizationEvents() {
        const bindToggle = (el, settingKey, fnName) => {
            if (!el || el.dataset.bound === '1') return;
            el.addEventListener('change', (e) => {
                this.sftw.settings[settingKey] = e.target.checked;
                if (typeof this.sftw[fnName] === 'function') this.sftw[fnName]();
            });
            el.dataset.bound = '1';
        };

        bindToggle(this.elements.toggleGrid, 'showGrid', 'toggleGrid');
        bindToggle(this.elements.toggleBoundaries, 'showBoundaries', 'toggleBoundaries');
        bindToggle(this.elements.toggleLabels, 'showLabels', 'toggleLabels');
        bindToggle(this.elements.toggleStars, 'showStars', 'toggleStars');

        if (this.elements.toggleMessier && this.elements.toggleMessier.dataset.bound !== '1') {
            this.elements.toggleMessier.addEventListener('change', (e) => {
                this.sftw.settings.showMessier = e.target.checked;
                if (typeof this.sftw.toggleMessier === 'function') {
                    this.sftw.toggleMessier();
                } else if (this.sftw.visualization) {
                    if (typeof this.sftw.visualization.setMessierVisible === 'function') {
                        this.sftw.visualization.setMessierVisible(!!this.sftw.settings.showMessier);
                    } else if (typeof this.sftw.visualization.toggleMessierMarkers === 'function') {
                        this.sftw.visualization.toggleMessierMarkers(!!this.sftw.settings.showMessier);
                    }
                }
            });
            this.elements.toggleMessier.dataset.bound = '1';
        }

        if (this.elements.toggleAsterisms && this.elements.toggleAsterisms.dataset.bound !== '1') {
            this.elements.toggleAsterisms.addEventListener('change', (e) => {
                if (typeof this.sftw?.setAsterismsVisible === 'function') {
                    this.sftw.setAsterismsVisible(!!e.target.checked);
                }
            });
            this.elements.toggleAsterisms.dataset.bound = '1';
        }

        if (this.elements.toggleAsterismLabels && this.elements.toggleAsterismLabels.dataset.bound !== '1') {
            this.elements.toggleAsterismLabels.addEventListener('change', (e) => {
                if (typeof this.sftw?.setAsterismLabelsVisible === 'function') {
                    this.sftw.setAsterismLabelsVisible(!!e.target.checked);
                }
                if (!e.target.checked && this.elements.toggleAsterisms && !this.elements.toggleAsterisms.checked) {
                    this.elements.toggleAsterismLabels.checked = false;
                }
            });
            this.elements.toggleAsterismLabels.dataset.bound = '1';
        }
    }

    // ============================================================
    // TIPO DE NOME DAS CONSTELAÇÕES
    // ============================================================

    setupNameTypeEvents() {
        if (!this.elements.nameTypeButtons) return;
        this.elements.nameTypeButtons.forEach((btn) => {
            if (btn.dataset.bound === '1') return;
            btn.addEventListener('click', (e) => {
                const nameType = e.currentTarget.dataset.type;
                this.selectNameType(nameType);
            });
            btn.dataset.bound = '1';
        });
    }

    selectNameType(nameType) {
        this.elements.nameTypeButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === nameType);
        });

        this.sftw.settings.nameType = nameType;

        if (this.sftw.visualization && typeof this.sftw.visualization.updateAllLabels === 'function') {
            this.sftw.visualization.updateAllLabels(nameType);
        }

        this.ui.showMessage?.(`Nomes mostrados como: ${this.getNameTypeLabel(nameType)}`, 'info');
    }

    getNameTypeLabel(nameType) {
        switch (nameType) {
            case 'bayer': return 'Bayer (abreviação)';
            case 'pt': return 'Português';
            case 'latin': return 'Latim';
            case 'full': return 'Nome completo';
            case 'both': return 'Ambos';
            default: return 'Bayer';
        }
    }

    // ============================================================
    // BUSCA / FOCO DE CONSTELAÇÕES
    // ============================================================

    setupSearchEvents() {
        if (this.elements.searchInput && this.elements.searchButton && this.elements.searchButton.dataset.bound !== '1') {
            this.elements.searchButton.addEventListener('click', () => this.searchConstellation());
            this.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchConstellation();
            });
            this.elements.searchButton.dataset.bound = '1';
        }
    }

    searchConstellation() {
        if (!this.elements.searchInput || !this.elements.searchInput.value.trim()) {
            this.ui.showMessage?.('Digite o nome de uma constelação', 'warning');
            return;
        }

        const raw = this.elements.searchInput.value.trim();
        let searchTerm = raw.toLowerCase();
        const parenMatch = raw.match(/\(([^)]+)\)\s*$/);
        if (parenMatch && parenMatch[1]) {
            searchTerm = parenMatch[1].trim().toLowerCase();
        }

        searchTerm = searchTerm.replace(/[^a-z]/g, '');
        let foundConstellation = null;

        if (!this.sftw.constellations) {
            this.ui.showMessage?.('Dados não carregados', 'error');
            return;
        }

        foundConstellation = this.sftw.constellations.find(c =>
            c.abbreviation.toLowerCase() === searchTerm
        );

        if (!foundConstellation) {
            const nameTerm = raw.toLowerCase();
            foundConstellation = this.sftw.constellations.find(c =>
                (c.name || '').toLowerCase().includes(nameTerm)
            );
        }

        if (foundConstellation) {
            this.focusOnConstellation(foundConstellation.abbreviation);
            this.elements.searchInput.value = `${foundConstellation.name} (${foundConstellation.abbreviation})`;
        } else {
            this.ui.showMessage?.(`Constelação não encontrada: "${raw}"`, 'error');
        }
    }

    focusOnConstellation(abbreviation) {
        if (!abbreviation) return;

        const constellation = this.sftw.constellations?.find(c => c.abbreviation === abbreviation);
        if (!constellation) {
            this.ui.showMessage?.(`Constelação ${abbreviation} não encontrada`, 'error');
            return;
        }

        if (typeof this.sftw.focusOnConstellation === 'function') {
            this.sftw.focusOnConstellation(abbreviation);
        }

        if (typeof this.ui.updateCurrentConstellation === 'function') {
            this.ui.updateCurrentConstellation(abbreviation);
        }

        this.ui.showMessage?.(`Focado em ${constellation.name}`, 'success');
    }

    // ============================================================
    // ESTRELAS - INSPECTOR / POOL DE ESTUDO
    // ============================================================

    setupStarInspectorEvents() {
        const refreshPreview = () => this.refreshStarTrainingPoolSummary();
        const applyVisualFilter = () => this.applyStarStudyFilterFromUI();

        if (this.elements.starFilterNamedOnly && !this.elements.starFilterNamedOnly.dataset.bound) {
            this.elements.starFilterNamedOnly.addEventListener('change', refreshPreview);
            this.elements.starFilterNamedOnly.dataset.bound = '1';
        }
        if (this.elements.starFilterMagnitudeMax && !this.elements.starFilterMagnitudeMax.dataset.bound) {
            this.elements.starFilterMagnitudeMax.addEventListener('input', refreshPreview);
            this.elements.starFilterMagnitudeMax.dataset.bound = '1';
        }
        if (this.elements.starFilterConstellation && !this.elements.starFilterConstellation.dataset.bound) {
            this.elements.starFilterConstellation.addEventListener('input', refreshPreview);
            this.elements.starFilterConstellation.dataset.bound = '1';
        }
        if (this.elements.btnStarRefreshPool && !this.elements.btnStarRefreshPool.dataset.bound) {
            this.elements.btnStarRefreshPool.addEventListener('click', () => {
                refreshPreview();
                applyVisualFilter();
            });
            this.elements.btnStarRefreshPool.dataset.bound = '1';
        }
    }

    applyStarStudyFilterFromUI() {
        const vis = this.sftw?.visualization;
        if (!vis || typeof vis.setStarStudyFilter !== 'function') {
            this.ui.showMessage?.('O filtro visual das estrelas não está disponível nesta versão.', 'warning', 1800, {
                replaceKey: 'star-study-filter-unavailable',
                replaceActive: true,
                skipQueue: true
            });
            return false;
        }

        const magnitudeMax = Number(this.elements.starFilterMagnitudeMax?.value);
        const filter = {
            enabled: true,
            namedOnly: !!this.elements.starFilterNamedOnly?.checked,
            magnitudeMax: Number.isFinite(magnitudeMax) ? magnitudeMax : 3.5,
            constellation: (this.elements.starFilterConstellation?.value || '').toString().trim()
        };

        vis.setStarStudyFilter(filter);

        this.ui.showMessage?.('Filtro visual das estrelas aplicado ao céu.', 'success', 1200, {
            replaceKey: 'star-study-filter-applied',
            replaceActive: true,
            skipQueue: true
        });

        return true;
    }

    refreshStarTrainingPoolSummary() {
        const stars = Array.isArray(this.sftw?.stars) ? this.sftw.stars : [];
        const total = stars.length;
        const named = stars.filter(s => this.hasUsefulStarName(s)).length;

        const namedOnly = !!this.elements.starFilterNamedOnly?.checked;
        const magMax = Number(this.elements.starFilterMagnitudeMax?.value);
        const constFilter = (this.elements.starFilterConstellation?.value || '').trim().toLowerCase();

        const filtered = stars.filter((s) => {
            if (namedOnly && !this.hasUsefulStarName(s)) return false;
            if (Number.isFinite(magMax) && Number(s.magnitude) > magMax) return false;
            if (constFilter) {
                const abbr = (s.constellation || '').toString().trim().toLowerCase();
                const namePt = (this.sftw?.getConstellationNamePt?.(s.constellation || '') || '').toString().trim().toLowerCase();
                if (abbr !== constFilter && namePt !== constFilter) return false;
            }
            return true;
        });

        if (this.elements.starCatalogTotal) this.elements.starCatalogTotal.textContent = String(total);
        if (this.elements.starNamedCount) this.elements.starNamedCount.textContent = String(named);
        if (this.elements.starTrainingPoolCount) this.elements.starTrainingPoolCount.textContent = String(filtered.length);
    }

    renderSelectedStarInspector(star) {
        const name = this.getDisplayStarName(star);
        const abbr = (star.constellation || '—').toString().trim() || '—';
        const pt = this.sftw?.getConstellationNamePt?.(abbr) || abbr;
        const magnitude = Number.isFinite(Number(star.magnitude)) ? Number(star.magnitude).toFixed(2) : '—';
        const raText = this.formatRAHours(star.ra);
        const decText = this.formatDecDegrees(star.dec);
        const spectral = (star.spectralClass || '—').toString();

        if (this.elements.starInspectorStatus) this.elements.starInspectorStatus.textContent = 'Selecionada no céu';
        if (this.elements.starInspectorName) this.elements.starInspectorName.textContent = name;
        if (this.elements.starInspectorConstellation) this.elements.starInspectorConstellation.textContent = `${abbr} — ${pt}`;
        if (this.elements.starInspectorMagnitude) this.elements.starInspectorMagnitude.textContent = magnitude;
        if (this.elements.starInspectorRa) this.elements.starInspectorRa.textContent = raText;
        if (this.elements.starInspectorDec) this.elements.starInspectorDec.textContent = decText;
        if (this.elements.starInspectorSpectral) this.elements.starInspectorSpectral.textContent = spectral;
    }

    // ============================================================
    // KNOWLEDGE HUB / BANCO / PESQUISA
    // ============================================================

    setupKnowledgeHubEvents() {
        if (this.elements.btnGlobalSearch && !this.elements.btnGlobalSearch.dataset.bound) {
            this.elements.btnGlobalSearch.addEventListener('click', () => this.searchKnowledgeHub());
            this.elements.btnGlobalSearch.dataset.bound = '1';
        }

        if (this.elements.globalSearchInput && !this.elements.globalSearchInput.dataset.bound) {
            this.elements.globalSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchKnowledgeHub();
            });
            this.elements.globalSearchInput.dataset.bound = '1';
        }

        if (this.elements.btnSearchStar && !this.elements.btnSearchStar.dataset.bound) {
            this.elements.btnSearchStar.addEventListener('click', () => this.searchStarsInHub());
            this.elements.btnSearchStar.dataset.bound = '1';
        }

        if (this.elements.starSearchInput && !this.elements.starSearchInput.dataset.bound) {
            this.elements.starSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchStarsInHub();
            });
            this.elements.starSearchInput.dataset.bound = '1';
        }

        const liveRender = () => this.renderKnowledgeHubData();
        [
            this.elements.catalogConstellationFilter,
            this.elements.catalogConstellationStarsNamedOnly,
            this.elements.catalogConstellationStarsMagMax,
            this.elements.catalogAsterismFilter
        ].forEach((el) => {
            if (!el || el.dataset.bound === '1') return;
            el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', liveRender);
            el.dataset.bound = '1';
        });
    }

    renderKnowledgeHubData() {
        this.renderConstellationCatalog();
        this.renderAsterismCatalog();

        const detailConst = this.ui._selectedCatalogConstellation || (this.sftw?.constellations || [])[0]?.abbreviation || null;
        const detailAst = this.ui._selectedCatalogAsterism || ((typeof this.sftw?.getAllAsterisms === 'function') ? (this.sftw.getAllAsterisms()[0]?.id || null) : null);
        if (detailConst) this.showConstellationCatalogDetail(detailConst);
        if (detailAst) this.showAsterismCatalogDetail(detailAst);
        this.renderBankStarsCatalog();
        this.ui._knowledgeHubBootstrapped = true;
    }

    searchKnowledgeHub() {
        const term = this.normalizeStudyText(this.elements.globalSearchInput?.value || '');
        const box = this.elements.globalSearchResults;
        if (!box) return;

        if (!term) {
            box.innerHTML = '<div class="sftw-empty-state">Digite um termo para pesquisar no banco do céu.</div>';
            return;
        }

        const results = [];
        const consts = Array.isArray(this.sftw?.constellations) ? this.sftw.constellations : [];
        const stars = Array.isArray(this.sftw?.stars) ? this.sftw.stars : [];
        const asterisms = (typeof this.sftw?.getAllAsterisms === 'function') ? (this.sftw.getAllAsterisms() || []) : [];

        for (const c of consts) {
            const pt = this.sftw?.getConstellationNamePt?.(c.abbreviation) || '';
            const hay = [c.abbreviation, c.name, c.fullName, c.latinName, pt].map((v) => this.normalizeStudyText(v)).join(' | ');
            if (hay.includes(term)) {
                results.push({ type: 'constellation', id: c.abbreviation, title: `${c.name} (${c.abbreviation})`, subtitle: pt || 'Constelação' });
            }
        }

        for (const s of stars) {
            if (!this.hasUsefulStarName(s)) continue;
            const pt = this.sftw?.getConstellationNamePt?.(s.constellation || '') || '';
            const hay = [s.name, s.constellation, pt, s.spectralClass].map((v) => this.normalizeStudyText(v)).join(' | ');
            if (hay.includes(term)) {
                results.push({ type: 'star', id: s.id, title: this.getDisplayStarName(s), subtitle: `${s.constellation || '---'} · mag ${Number.isFinite(+s.magnitude) ? (+s.magnitude).toFixed(1) : '—'}` });
            }
        }

        for (const a of asterisms) {
            const hay = [a.id, a.name, a.namePt, a.culture].map((v) => this.normalizeStudyText(v)).join(' | ');
            if (hay.includes(term)) {
                results.push({ type: 'asterism', id: a.id, title: a.namePt || a.name || a.id, subtitle: a.name || a.id });
            }
        }

        if (!results.length) {
            box.innerHTML = '<div class="sftw-empty-state">Nenhum resultado encontrado.</div>';
            return;
        }

        box.innerHTML = results.slice(0, 18).map((r) => `
            <button type="button" class="sftw-result-row" data-result-type="${r.type}" data-result-id="${r.id}">
                <span class="sftw-result-kicker">${r.type === 'constellation' ? 'Constelação' : r.type === 'star' ? 'Estrela' : 'Asterismo'}</span>
                <strong>${r.title}</strong>
                <span>${r.subtitle}</span>
            </button>
        `).join('');

        box.querySelectorAll('.sftw-result-row').forEach((btn) => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.resultType;
                const id = btn.dataset.resultId;
                if (type === 'constellation') {
                    this.focusOnConstellation(id);
                    this.openBankWindow('constellations');
                    this.showConstellationCatalogDetail(id);
                } else if (type === 'asterism') {
                    this.openBankWindow('asterisms');
                    this.showAsterismCatalogDetail(id);
                    if (typeof this.sftw?.setAsterismsVisible === 'function') this.sftw.setAsterismsVisible(true);
                    if (typeof this.sftw?.setAsterismLabelsVisible === 'function') this.sftw.setAsterismLabelsVisible(true);
                } else if (type === 'star') {
                    const star = (this.sftw?.stars || []).find((s) => String(s.id) === String(id));
                    if (star) {
                        this.renderSelectedStarInspector(star);
                        if (star.constellation) this.focusOnConstellation(star.constellation);
                        this.ui.activateMainTab?.('stars');
                        this.ui.showMessage?.(`Estrela encontrada: ${this.getDisplayStarName(star)}`, 'success', 1600, {
                            replaceKey: 'search-star',
                            replaceActive: true,
                            skipQueue: true
                        });
                    }
                }
            });
        });
    }

    searchStarsInHub() {
        const term = this.normalizeStudyText(this.elements.starSearchInput?.value || '');
        const conTerm = this.normalizeStudyText(this.elements.starSearchConstellation?.value || '');
        const magMax = Number(this.elements.starSearchMagMax?.value);
        const box = this.elements.starSearchResults;
        if (!box) return;

        let stars = Array.isArray(this.sftw?.stars) ? this.sftw.stars.slice() : [];
        stars = stars.filter((s) => {
            if (!this.hasUsefulStarName(s)) return false;
            if (term) {
                const hay = [s.name, s.constellation, s.spectralClass].map((v) => this.normalizeStudyText(v)).join(' | ');
                if (!hay.includes(term)) return false;
            }
            if (conTerm) {
                const pt = this.normalizeStudyText(this.sftw?.getConstellationNamePt?.(s.constellation || '') || '');
                const ab = this.normalizeStudyText(s.constellation || '');
                if (ab !== conTerm && pt !== conTerm) return false;
            }
            if (Number.isFinite(magMax) && Number(s.magnitude) > magMax) return false;
            return true;
        }).sort((a, b) => Number(a.magnitude) - Number(b.magnitude));

        if (!stars.length) {
            box.innerHTML = '<div class="sftw-empty-state">Nenhuma estrela encontrada com esses filtros.</div>';
            return;
        }

        box.innerHTML = stars.slice(0, 40).map((s) => `
            <button type="button" class="sftw-result-row" data-star-id="${s.id}">
                <span class="sftw-result-kicker">${s.constellation || '---'}</span>
                <strong>${this.getDisplayStarName(s)}</strong>
                <span>mag ${Number.isFinite(+s.magnitude) ? (+s.magnitude).toFixed(2) : '—'} · ${(s.spectralClass || 'sem classe')}</span>
            </button>
        `).join('');

        box.querySelectorAll('[data-star-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const star = stars.find((s) => String(s.id) === String(btn.dataset.starId));
                if (!star) return;
                this.renderSelectedStarInspector(star);
                if (star.constellation) this.focusOnConstellation(star.constellation);
                this.ui.activateMainTab?.('stars');
            });
        });
    }

    renderConstellationCatalog() {
        const box = this.elements.catalogConstellationList;
        if (!box) return;

        const term = this.normalizeStudyText(this.elements.catalogConstellationFilter?.value || '');
        const consts = (this.sftw?.constellations || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        const rows = consts.filter((c) => {
            if (!term) return true;
            const pt = this.sftw?.getConstellationNamePt?.(c.abbreviation) || '';
            const hay = [c.abbreviation, c.name, pt].map((v) => this.normalizeStudyText(v)).join(' | ');
            return hay.includes(term);
        });

        if (!rows.length) {
            box.innerHTML = '<div class="sftw-empty-state">Nenhuma constelação encontrada.</div>';
            return;
        }

        box.innerHTML = rows.map((c) => `
            <button type="button" class="sftw-catalog-row" data-constellation-id="${c.abbreviation}">
                <strong>${c.name}</strong>
                <span>${c.abbreviation} · ${this.sftw?.getConstellationNamePt?.(c.abbreviation) || 'Constelação'}</span>
            </button>
        `).join('');

        box.querySelectorAll('[data-constellation-id]').forEach((btn) => {
            btn.addEventListener('click', () => this.showConstellationCatalogDetail(btn.dataset.constellationId));
        });
    }

    showConstellationCatalogDetail(abbr) {
        this.ui._selectedCatalogConstellation = abbr;
        const target = (this.sftw?.constellations || []).find((c) => c.abbreviation === abbr);
        const box = this.elements.catalogConstellationDetail;
        if (!target || !box) return;

        const namedOnly = !!this.elements.catalogConstellationStarsNamedOnly?.checked;
        const magMax = Number(this.elements.catalogConstellationStarsMagMax?.value);
        let stars = (this.sftw?.stars || []).filter((s) => String(s.constellation || '').toLowerCase() === String(abbr).toLowerCase());
        stars = stars.filter((s) => {
            if (namedOnly && !this.hasUsefulStarName(s)) return false;
            if (Number.isFinite(magMax) && Number(s.magnitude) > magMax) return false;
            return true;
        }).sort((a, b) => Number(a.magnitude) - Number(b.magnitude));

        const pt = this.sftw?.getConstellationNamePt?.(abbr) || target.name || abbr;
        box.innerHTML = `
            <div class="sftw-detail-head">
                <div>
                    <div class="sftw-result-kicker">Constelação</div>
                    <h4>${target.name} (${abbr})</h4>
                    <div class="sftw-detail-sub">${pt}</div>
                </div>
                <div class="sftw-row sftw-row-wrap">
                    <button type="button" class="sftw-btn" id="btn-catalog-focus-constellation"><i class="fas fa-crosshairs"></i><span>Focar</span></button>
                </div>
            </div>
            <div class="sftw-detail-metrics">
                <div class="sftw-detail-metric"><span>Estrelas filtradas</span><strong>${stars.length}</strong></div>
                <div class="sftw-detail-metric"><span>Filtro</span><strong>${namedOnly ? 'nomeadas' : 'todas'}</strong></div>
            </div>
            <div class="sftw-detail-list">
                ${stars.length ? stars.slice(0, 32).map((s) => `<button type="button" class="sftw-detail-item" data-detail-star-id="${s.id}"><strong>${this.getDisplayStarName(s)}</strong><span>mag ${Number.isFinite(+s.magnitude) ? (+s.magnitude).toFixed(2) : '—'} · ${(s.spectralClass || 'sem classe')}</span></button>`).join('') : '<div class="sftw-empty-state">Nenhuma estrela atende aos filtros atuais.</div>'}
            </div>
        `;

        const focusBtn = box.querySelector('#btn-catalog-focus-constellation');
        if (focusBtn) focusBtn.addEventListener('click', () => this.focusOnConstellation(abbr));

        box.querySelectorAll('[data-detail-star-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const star = stars.find((s) => String(s.id) === String(btn.dataset.detailStarId));
                if (!star) return;
                this.renderSelectedStarInspector(star);
                this.ui.activateMainTab?.('stars');
            });
        });
    }

    renderAsterismCatalog() {
        const box = this.elements.catalogAsterismList;
        if (!box) return;

        const term = this.normalizeStudyText(this.elements.catalogAsterismFilter?.value || '');
        const items = (typeof this.sftw?.getAllAsterisms === 'function') ? (this.sftw.getAllAsterisms() || []) : [];
        const rows = items.filter((a) => {
            if (!term) return true;
            const hay = [a.id, a.name, a.namePt].map((v) => this.normalizeStudyText(v)).join(' | ');
            return hay.includes(term);
        });

        if (!rows.length) {
            box.innerHTML = '<div class="sftw-empty-state">Nenhum asterismo encontrado.</div>';
            return;
        }

        box.innerHTML = rows.map((a) => `
            <button type="button" class="sftw-catalog-row sftw-catalog-row-preview" data-asterism-id="${a.id}">
                <span class="sftw-asterism-preview">${this.buildAsterismMiniPreviewSVG(a)}</span>
                <span class="sftw-catalog-row-main"><strong>${a.namePt || a.name || a.id}</strong><span>${a.name || a.id}</span></span>
            </button>
        `).join('');

        box.querySelectorAll('[data-asterism-id]').forEach((btn) => {
            btn.addEventListener('click', () => this.showAsterismCatalogDetail(btn.dataset.asterismId));
        });
    }

    showAsterismCatalogDetail(id) {
        this.ui._selectedCatalogAsterism = id;
        const a = (typeof this.sftw?.getAsterismById === 'function') ? this.sftw.getAsterismById(id) : null;
        const box = this.elements.catalogAsterismDetail;
        if (!a || !box) return;

        const stars = Array.isArray(a.stars) ? a.stars : [];
        box.innerHTML = `
            <div class="sftw-detail-head">
                <div>
                    <div class="sftw-result-kicker">Asterismo</div>
                    <h4>${a.namePt || a.name || a.id}</h4>
                    <div class="sftw-detail-sub">${a.name || a.id} · ${a.culture || 'cultura não informada'}</div>
                </div>
                <div class="sftw-asterism-preview-large">${this.buildAsterismMiniPreviewSVG(a, true)}</div>
            </div>
            <div class="sftw-detail-metrics">
                <div class="sftw-detail-metric"><span>Estrelas</span><strong>${stars.length}</strong></div>
                <div class="sftw-detail-metric"><span>Segmentos</span><strong>${a.resolvedSegmentCount ?? a.segments?.length ?? 0}</strong></div>
            </div>
            <div class="sftw-detail-list">
                ${stars.length ? stars.map((entry) => {
                    const s = entry.star || entry;
                    return `<button type="button" class="sftw-detail-item" data-asterism-star-id="${s.id}"><strong>${this.getDisplayStarName(s)}</strong><span>${s.constellation || entry.refCon || '---'} · mag ${Number.isFinite(+s.magnitude) ? (+s.magnitude).toFixed(2) : '—'}</span></button>`;
                }).join('') : '<div class="sftw-empty-state">Este asterismo não possui estrelas resolvidas no catálogo atual.</div>'}
            </div>
        `;

        box.querySelectorAll('[data-asterism-star-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const entry = stars.find((item) => String((item.star || item).id) === String(btn.dataset.asterismStarId));
                const star = entry ? (entry.star || entry) : null;
                if (!star) return;
                this.renderSelectedStarInspector(star);
                if (star.constellation) this.focusOnConstellation(star.constellation);
                this.ui.activateMainTab?.('stars');
            });
        });
    }

    buildAsterismMiniPreviewSVG(asterism, large = false) {
        const width = large ? 150 : 68;
        const height = large ? 90 : 44;
        const stars = Array.isArray(asterism?.stars) ? asterism.stars : [];
        if (!stars.length) {
            return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="10" fill="rgba(255,255,255,0.04)" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#a9c4ff" font-size="10">sem preview</text></svg>`;
        }

        const ras = stars.map((entry) => Number((entry.star || entry).ra)).filter(Number.isFinite);
        const decs = stars.map((entry) => Number((entry.star || entry).dec)).filter(Number.isFinite);
        const minRa = Math.min(...ras), maxRa = Math.max(...ras), minDec = Math.min(...decs), maxDec = Math.max(...decs);
        const spanRa = Math.max(0.1, maxRa - minRa);
        const spanDec = Math.max(0.1, maxDec - minDec);
        const pad = large ? 12 : 7;

        const positions = stars.map((entry) => {
            const s = entry.star || entry;
            const x = pad + ((Number(s.ra) - minRa) / spanRa) * (width - pad * 2);
            const y = height - pad - ((Number(s.dec) - minDec) / spanDec) * (height - pad * 2);
            return { id: entry.localId || s.id || s.name, x, y };
        });

        const posMap = new Map(positions.map((p) => [String(p.id), p]));
        const lines = (asterism.segments || []).map((seg) => {
            const a = posMap.get(String(seg.aLocalId || seg.aKey || seg.a || ''));
            const b = posMap.get(String(seg.bLocalId || seg.bKey || seg.b || ''));
            if (!a || !b) return '';
            return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#f6d365" stroke-width="${large ? 2.4 : 1.6}" stroke-linecap="round"/>`;
        }).join('');

        const dots = positions.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${large ? 3.2 : 2.1}" fill="#ffffff"/>`).join('');
        return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><rect width="${width}" height="${height}" rx="10" fill="rgba(255,255,255,0.04)"/>${lines}${dots}</svg>`;
    }

    // ============================================================
    // BANCO FLUTUANTE
    // ============================================================

    setupBankWorkspace() {
        const root = this.ui?.uiContainer || document.querySelector('.module-controls');
        const catalogPanel = root?.querySelector('[data-panel="catalog"]');
        if (!root || !catalogPanel || document.getElementById('sftw-bank-workspace')) return;

        const intro = catalogPanel.querySelector('.sftw-card-intro');
        const cards = Array.from(catalogPanel.querySelectorAll('.sftw-card')).filter((card) => !card.classList.contains('sftw-card-intro'));
        const constellationCard = cards[0] || null;
        const asterismCard = cards[1] || null;

        const workspace = document.createElement('div');
        workspace.id = 'sftw-bank-workspace';
        workspace.className = 'sftw-bank-workspace hidden';
        workspace.innerHTML = `
            <div id="sftw-bank-window" class="sftw-bank-window sftw-bank-window-right" style="left:auto;top:76px;width:min(980px,72vw);height:min(78vh,860px);right:24px;">
                <div class="sftw-bank-window-header" id="sftw-bank-window-header">
                    <div>
                        <div class="sftw-bank-window-kicker">Consulta Astronômica</div>
                        <div class="sftw-bank-window-title" id="sftw-bank-window-title">Banco do Céu</div>
                    </div>
                    <div class="sftw-bank-window-actions">
                        <button type="button" class="sftw-window-btn" id="btn-dock-bank-left" title="Ancorar à esquerda"><i class="fas fa-left-right"></i></button>
                        <button type="button" class="sftw-window-btn" id="btn-dock-bank-right" title="Ancorar à direita"><i class="fas fa-right-to-bracket"></i></button>
                        <button type="button" class="sftw-window-btn" id="btn-minimize-bank-window" title="Minimizar"><i class="fas fa-window-minimize"></i></button>
                        <button type="button" class="sftw-window-btn" id="btn-maximize-bank-window" title="Maximizar/restaurar"><i class="fas fa-expand"></i></button>
                        <button type="button" class="sftw-window-btn sftw-window-btn-danger" id="btn-close-bank-window" title="Fechar"><i class="fas fa-xmark"></i></button>
                    </div>
                </div>
                <div class="sftw-bank-window-body" id="sftw-bank-window-body">
                    <div class="sftw-bank-window-intro"></div>
                    <div class="sftw-bank-tabs" role="tablist" aria-label="Banco do céu">
                        <button type="button" class="sftw-bank-tab active" data-bank-tab="constellations">Constelações</button>
                        <button type="button" class="sftw-bank-tab" data-bank-tab="stars">Estrelas</button>
                        <button type="button" class="sftw-bank-tab" data-bank-tab="asterisms">Asterismos</button>
                    </div>
                    <div class="sftw-bank-panels">
                        <section class="sftw-bank-panel active" data-bank-panel="constellations"></section>
                        <section class="sftw-bank-panel" data-bank-panel="stars">
                            <div class="sftw-card">
                                <div class="sftw-card-h sftw-card-h-split">
                                    <div class="sftw-card-title"><i class="fas fa-star"></i> Banco de estrelas</div>
                                    <span class="muted" id="bank-star-count">0 resultados</span>
                                </div>
                                <div class="sftw-row sftw-row-wrap">
                                    <input id="bank-star-search-input" class="sftw-input" type="text" placeholder="Nome da estrela (opcional)" style="flex:1 1 220px;">
                                    <input id="bank-star-search-constellation" class="sftw-input" type="text" placeholder="Constelação (opcional)" style="flex:1 1 160px;">
                                </div>
                                <div class="sftw-row sftw-row-wrap" style="margin-top:10px;">
                                    <input id="bank-star-search-mag-max" class="sftw-input" type="number" min="-2" max="8" step="0.1" value="3.5" style="max-width:160px;">
                                    <select id="bank-star-sort" class="sftw-input" style="max-width:220px;">
                                        <option value="brightness">Ordenar por brilho</option>
                                        <option value="name">Ordenar por nome</option>
                                    </select>
                                    <label class="sftw-toggle sftw-toggle-inline">
                                        <input id="bank-star-important-only" type="checkbox" checked>
                                        <span>Somente estrelas importantes</span>
                                    </label>
                                </div>
                                <div class="sftw-help">Magnitude máxima: mostra estrelas com magnitude menor ou igual ao valor escolhido.</div>
                                <div id="bank-star-results" class="sftw-knowledge-list sftw-knowledge-list-scroll" style="margin-top:12px;"></div>
                            </div>
                        </section>
                        <section class="sftw-bank-panel" data-bank-panel="asterisms"></section>
                    </div>
                </div>
                <div id="sftw-bank-resize-handle" class="sftw-bank-resize-handle"></div>
            </div>
        `;

        document.body.appendChild(workspace);

        const introHost = workspace.querySelector('.sftw-bank-window-intro');
        if (introHost && intro) introHost.appendChild(intro);
        const constPanel = workspace.querySelector('[data-bank-panel="constellations"]');
        if (constPanel && constellationCard) constPanel.appendChild(constellationCard);
        const astPanel = workspace.querySelector('[data-bank-panel="asterisms"]');
        if (astPanel && asterismCard) astPanel.appendChild(asterismCard);

        catalogPanel.innerHTML = `
            <div class="sftw-card sftw-card-intro">
                <div class="sftw-card-h sftw-card-h-split">
                    <div class="sftw-card-title"><i class="fas fa-database"></i> Banco do Céu</div>
                    <div class="sftw-pill sftw-pill-soft">janela flutuante</div>
                </div>
                <div class="sftw-help sftw-help-tight">Clique abaixo para abrir a consulta astronômica em uma janela grande sobre o planetário.</div>
                <div class="sftw-row" style="margin-top:12px;">
                    <button id="btn-open-bank-window" class="sftw-btn sftw-btn-primary" type="button"><i class="fas fa-up-right-and-down-left-from-center"></i><span>Abrir Banco</span></button>
                </div>
            </div>
        `;
    }

    addBankWindowStyles() {
        if (document.getElementById('sftw-bank-window-styles')) return;
        const style = document.createElement('style');
        style.id = 'sftw-bank-window-styles';
        style.textContent = `
            .sftw-bank-workspace{position:fixed;inset:0;z-index:950;pointer-events:none;}
            .sftw-bank-workspace.hidden{display:none;}
            .sftw-bank-window{position:fixed;display:flex;flex-direction:column;pointer-events:auto;border:1px solid rgba(160,190,255,.24);background:linear-gradient(180deg,rgba(9,15,28,.96),rgba(5,10,20,.93));backdrop-filter:blur(10px);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.45),0 0 0 1px rgba(120,160,255,.06) inset;overflow:hidden;min-width:560px;min-height:420px;max-width:min(1200px,92vw);max-height:88vh;}
            .sftw-bank-window.is-minimized{height:auto !important;min-height:0;}
            .sftw-bank-window.is-minimized .sftw-bank-window-body,.sftw-bank-window.is-minimized .sftw-bank-resize-handle{display:none;}
            .sftw-bank-window.is-maximized{left:16px !important;right:16px !important;top:16px !important;width:auto !important;height:calc(100vh - 32px) !important;max-width:none;max-height:none;}
            .sftw-bank-window-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));cursor:move;user-select:none;}
            .sftw-bank-window-kicker{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9fb6ff;opacity:.92;}
            .sftw-bank-window-title{font-size:22px;font-weight:800;color:#eef4ff;}
            .sftw-bank-window-actions{display:flex;align-items:center;gap:8px;}
            .sftw-window-btn{width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#dfe8ff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}
            .sftw-window-btn:hover{background:rgba(255,255,255,.09);}
            .sftw-window-btn-danger:hover{background:rgba(185,28,28,.22);color:#fff;}
            .sftw-bank-window-body{display:flex;flex-direction:column;gap:14px;padding:16px;overflow:auto;min-height:0;}
            .sftw-bank-tabs{display:flex;gap:10px;flex-wrap:wrap;}
            .sftw-bank-tab{border:none;border-radius:999px;padding:10px 16px;background:rgba(255,255,255,.05);color:#d6e4ff;cursor:pointer;font-weight:700;}
            .sftw-bank-tab.active{background:linear-gradient(180deg,#4f78ff,#3558d7);color:#fff;box-shadow:0 12px 28px rgba(53,88,215,.34);}
            .sftw-bank-panel{display:none;min-height:0;}
            .sftw-bank-panel.active{display:block;}
            .sftw-bank-resize-handle{position:absolute;right:8px;bottom:8px;width:18px;height:18px;border-right:2px solid rgba(255,255,255,.3);border-bottom:2px solid rgba(255,255,255,.3);cursor:nwse-resize;opacity:.8;}
            .sftw-bank-window .sftw-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);box-shadow:none;}
            .sftw-bank-window .sftw-card-intro{background:linear-gradient(180deg,rgba(91,125,255,.16),rgba(91,125,255,.06));}
            @media (max-width: 900px){.sftw-bank-window{left:8px !important;right:8px !important;top:8px !important;width:auto !important;height:calc(100vh - 16px) !important;min-width:0;border-radius:16px;}.sftw-bank-window-header{cursor:default;}.sftw-bank-resize-handle{display:none;}}
        `;
        document.head.appendChild(style);
    }

    setupBankWindowEvents() {
        const openBtn = this.elements.btnOpenBankWindow;
        if (openBtn && !openBtn.dataset.bound) {
            openBtn.addEventListener('click', () => this.openBankWindow());
            openBtn.dataset.bound = '1';
        }
        if (this.elements.btnCloseBankWindow && !this.elements.btnCloseBankWindow.dataset.bound) {
            this.elements.btnCloseBankWindow.addEventListener('click', () => this.closeBankWindow());
            this.elements.btnCloseBankWindow.dataset.bound = '1';
        }
        if (this.elements.btnMinimizeBankWindow && !this.elements.btnMinimizeBankWindow.dataset.bound) {
            this.elements.btnMinimizeBankWindow.addEventListener('click', () => this.toggleMinimizeBankWindow());
            this.elements.btnMinimizeBankWindow.dataset.bound = '1';
        }
        if (this.elements.btnMaximizeBankWindow && !this.elements.btnMaximizeBankWindow.dataset.bound) {
            this.elements.btnMaximizeBankWindow.addEventListener('click', () => this.toggleMaximizeBankWindow());
            this.elements.btnMaximizeBankWindow.dataset.bound = '1';
        }
        if (this.elements.btnDockBankLeft && !this.elements.btnDockBankLeft.dataset.bound) {
            this.elements.btnDockBankLeft.addEventListener('click', () => this.dockBankWindow('left'));
            this.elements.btnDockBankLeft.dataset.bound = '1';
        }
        if (this.elements.btnDockBankRight && !this.elements.btnDockBankRight.dataset.bound) {
            this.elements.btnDockBankRight.addEventListener('click', () => this.dockBankWindow('right'));
            this.elements.btnDockBankRight.dataset.bound = '1';
        }

        (this.elements.bankInternalTabs || []).forEach((btn) => {
            if (btn.dataset.bound) return;
            btn.addEventListener('click', () => this.activateBankTab(btn.dataset.bankTab || 'constellations'));
            btn.dataset.bound = '1';
        });

        this.setupBankWindowDrag();
        this.setupBankWindowResize();
        this.setupBankStarsEvents();
        this.renderBankStarsCatalog();
    }

    openBankWindow(tab = 'constellations') {
        const ws = this.elements.bankWorkspace;
        const w = this.elements.bankWindow;
        if (!ws || !w) return;
        ws.classList.remove('hidden');
        w.classList.remove('is-minimized');
        this.activateBankTab(tab);
        this.renderKnowledgeHubData();
        this.renderBankStarsCatalog();
    }

    closeBankWindow() {
        this.elements.bankWorkspace?.classList.add('hidden');
    }

    toggleMinimizeBankWindow() {
        this.elements.bankWindow?.classList.toggle('is-minimized');
    }

    toggleMaximizeBankWindow() {
        this.elements.bankWindow?.classList.toggle('is-maximized');
    }

    dockBankWindow(side = 'right') {
        const w = this.elements.bankWindow;
        if (!w) return;
        w.classList.remove('is-maximized');
        w.style.top = '76px';
        w.style.width = 'min(980px,72vw)';
        w.style.height = 'min(78vh,860px)';
        if (side === 'left') {
            w.style.left = '24px';
            w.style.right = 'auto';
        } else {
            w.style.right = '24px';
            w.style.left = 'auto';
        }
    }

    activateBankTab(name = 'constellations') {
        (this.elements.bankInternalTabs || []).forEach((btn) => btn.classList.toggle('active', btn.dataset.bankTab === name));
        (this.elements.bankPanels || []).forEach((panel) => panel.classList.toggle('active', panel.dataset.bankPanel === name));

        const title = this.elements.bankWindowTitle;
        if (title) {
            title.textContent = name === 'stars'
                ? 'Banco de Estrelas'
                : name === 'asterisms'
                    ? 'Banco de Asterismos'
                    : 'Banco de Constelações';
        }
    }

    setupBankWindowDrag() {
        const win = this.elements.bankWindow;
        const header = document.getElementById('sftw-bank-window-header');
        if (!win || !header || header.dataset.bound) return;

        let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

        header.addEventListener('pointerdown', (ev) => {
            if (window.matchMedia('(max-width: 900px)').matches) return;
            if (ev.target.closest('button')) return;
            dragging = true;
            win.classList.remove('is-maximized');
            const rect = win.getBoundingClientRect();
            startX = ev.clientX;
            startY = ev.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            win.style.right = 'auto';
            win.style.left = `${rect.left}px`;
            win.style.top = `${rect.top}px`;
            header.setPointerCapture(ev.pointerId);
        });

        header.addEventListener('pointermove', (ev) => {
            if (!dragging) return;
            const nextLeft = Math.max(8, Math.min(window.innerWidth - 320, startLeft + (ev.clientX - startX)));
            const nextTop = Math.max(8, Math.min(window.innerHeight - 120, startTop + (ev.clientY - startY)));
            win.style.left = `${nextLeft}px`;
            win.style.top = `${nextTop}px`;
        });

        const stop = () => dragging = false;
        header.addEventListener('pointerup', stop);
        header.addEventListener('pointercancel', stop);
        header.dataset.bound = '1';
    }

    setupBankWindowResize() {
        const win = this.elements.bankWindow;
        const handle = this.elements.bankResizeHandle;
        if (!win || !handle || handle.dataset.bound) return;

        let resizing = false, startX = 0, startY = 0, startW = 0, startH = 0;

        handle.addEventListener('pointerdown', (ev) => {
            if (window.matchMedia('(max-width: 900px)').matches) return;
            resizing = true;
            const rect = win.getBoundingClientRect();
            startX = ev.clientX;
            startY = ev.clientY;
            startW = rect.width;
            startH = rect.height;
            handle.setPointerCapture(ev.pointerId);
            ev.preventDefault();
            ev.stopPropagation();
        });

        handle.addEventListener('pointermove', (ev) => {
            if (!resizing) return;
            const width = Math.max(560, Math.min(window.innerWidth - 32, startW + (ev.clientX - startX)));
            const height = Math.max(420, Math.min(window.innerHeight - 32, startH + (ev.clientY - startY)));
            win.style.width = `${width}px`;
            win.style.height = `${height}px`;
        });

        const stop = () => resizing = false;
        handle.addEventListener('pointerup', stop);
        handle.addEventListener('pointercancel', stop);
        handle.dataset.bound = '1';
    }

    setupBankStarsEvents() {
        const rerender = () => this.renderBankStarsCatalog();
        [
            this.elements.bankStarSearchInput,
            this.elements.bankStarSearchConstellation,
            this.elements.bankStarSearchMagMax,
            this.elements.bankStarSort,
            this.elements.bankStarImportantOnly
        ].forEach((el) => {
            if (!el || el.dataset.bound) return;
            el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', rerender);
            if (el.tagName === 'INPUT') {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') rerender();
                });
            }
            el.dataset.bound = '1';
        });
    }

    renderBankStarsCatalog() {
        const box = this.elements.bankStarResults;
        if (!box) return;

        const term = this.normalizeStudyText(this.elements.bankStarSearchInput?.value || '');
        const conTerm = this.normalizeStudyText(this.elements.bankStarSearchConstellation?.value || '');
        const magMax = Number(this.elements.bankStarSearchMagMax?.value);
        const sortBy = this.elements.bankStarSort?.value || 'brightness';
        const importantOnly = !!this.elements.bankStarImportantOnly?.checked;

        let stars = Array.isArray(this.sftw?.stars) ? this.sftw.stars.slice() : [];
        stars = stars.filter((s) => {
            if (importantOnly && !this.hasUsefulStarName(s)) return false;
            if (term) {
                const hay = [s.name, s.constellation, s.spectralClass].map((v) => this.normalizeStudyText(v)).join(' | ');
                if (!hay.includes(term)) return false;
            }
            if (conTerm) {
                const pt = this.normalizeStudyText(this.sftw?.getConstellationNamePt?.(s.constellation || '') || '');
                const ab = this.normalizeStudyText(s.constellation || '');
                if (ab !== conTerm && pt !== conTerm) return false;
            }
            if (Number.isFinite(magMax) && Number(s.magnitude) > magMax) return false;
            return true;
        });

        stars.sort((a, b) => {
            if (sortBy === 'name') {
                return this.getDisplayStarName(a).localeCompare(this.getDisplayStarName(b), 'pt-BR');
            }
            return Number(a.magnitude) - Number(b.magnitude);
        });

        if (this.elements.bankStarCount) {
            this.elements.bankStarCount.textContent = `${stars.length} ${stars.length === 1 ? 'resultado' : 'resultados'}`;
        }

        if (!stars.length) {
            box.innerHTML = '<div class="sftw-empty-state">Nenhuma estrela encontrada com os filtros atuais.</div>';
            return;
        }

        box.innerHTML = stars.slice(0, 80).map((s) => `
            <button type="button" class="sftw-result-row" data-bank-star-id="${s.id}">
                <span class="sftw-result-kicker">${s.constellation || '---'}</span>
                <strong>${this.getDisplayStarName(s)}</strong>
                <span>mag ${Number.isFinite(+s.magnitude) ? (+s.magnitude).toFixed(2) : '—'} · ${(s.spectralClass || 'sem classe')}</span>
            </button>
        `).join('');

        box.querySelectorAll('[data-bank-star-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const star = stars.find((s) => String(s.id) === String(btn.dataset.bankStarId));
                if (!star) return;
                this.renderSelectedStarInspector(star);
                if (star.constellation) this.focusOnConstellation(star.constellation);
                this.ui.activateMainTab?.('stars');
            });
        });
    }

    // ============================================================
    // MOBILE / TABLET
    // ============================================================

    setupMobileUIEnhancements() {
        const updateMobileState = () => {
            const isMobile = window.matchMedia('(max-width: 900px)').matches;
            document.body.classList.toggle('sftw-mobile-ui', isMobile);

            if (this.ui?.uiContainer) {
                this.ui.uiContainer.classList.toggle('sftw-mobile-controls', isMobile);
            }
        };

        updateMobileState();

        if (this.ui?._mobileResizeHandler) {
            window.removeEventListener('resize', this.ui._mobileResizeHandler);
        }
        this.ui._mobileResizeHandler = updateMobileState;
        window.addEventListener('resize', this.ui._mobileResizeHandler);

        if (window.visualViewport) {
            if (this.ui?._mobileViewportHandler) {
                window.visualViewport.removeEventListener('resize', this.ui._mobileViewportHandler);
                window.visualViewport.removeEventListener('scroll', this.ui._mobileViewportHandler);
            }
            this.ui._mobileViewportHandler = updateMobileState;
            window.visualViewport.addEventListener('resize', this.ui._mobileViewportHandler);
            window.visualViewport.addEventListener('scroll', this.ui._mobileViewportHandler);
        }

        const focusables = this.ui?.uiContainer ? this.ui.uiContainer.querySelectorAll('input, textarea, select, button') : [];
        focusables.forEach((el) => {
            if (el.dataset.mobileBound === '1') return;
            el.addEventListener('focus', () => {
                if (window.matchMedia('(max-width: 900px)').matches) {
                    setTimeout(() => {
                        try {
                            el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                        } catch (_) {}
                    }, 120);
                }
            });
            el.dataset.mobileBound = '1';
        });
    }
}

if (typeof window !== 'undefined') {
    window.Sftw1_UI_Shell = Sftw1_UI_Shell;
    console.log('✅ Sftw1_UI_Shell.js carregado');
}
