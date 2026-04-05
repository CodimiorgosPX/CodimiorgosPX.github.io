// Sftw1_UI.js
// FACHADA REBALANCEADA
// Objetivo deste passo:
// - manter o Sftw1_UI.js como ponto oficial de injeção no Core
// - preservar a maior parte das funcionalidades existentes
// - remover APENAS o que já foi extraído para Sftw1_UI_Shell / Sftw1_UI_Games
// - evitar que responsabilidades "sumam" no processo de separação
//
// Estratégia:
// 1) este arquivo continua montando a UI principal (layout, setup central, styles base, mensagens, progresso)
// 2) Shell recebe navegação/estudo/banco/busca/toggles gerais
// 3) Games recebe sessões de jogo / callbacks / Neighbor / Messier / modais
// 4) tudo que NÃO foi claramente extraído continua aqui

class Sftw1_UI {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        this.uiContainer = null;
        this.gameUIState = 'idle';
        this.activeMainTab = 'explore';

        this.elements = {
            gameControls: null,
            gameInput: null,
            currentStatus: null,
            gameStatus: null,
            gameTimer: null,
            gameScore: null,
            gameDiscovered: null,
            gameProgress: null,
            toggleGrid: null,
            toggleBoundaries: null,
            toggleLabels: null,
            toggleStars: null,
            searchInput: null,
            searchButton: null,
            nameTypeButtons: null,
            btnStartGame: null,
            btnSelectConstellation: null,
            btnShowAnswerKey: null,
            btnRestartGame: null,
            btnEndGame: null,
            messageContainer: null,
            progressFab: null,
            progressPanel: null,
            progressList: null,
            progressCount: null,
            optShowProgress: null,
            optShowDiscoveredNames: null,
            optShowDiscoveredFill: null,
            starInspectorStatus: null,
            starInspectorName: null,
            starInspectorConstellation: null,
            starInspectorMagnitude: null,
            starInspectorRa: null,
            starInspectorDec: null,
            starInspectorSpectral: null,
            starCatalogTotal: null,
            starNamedCount: null,
            starTrainingPoolCount: null,
            starFilterNamedOnly: null,
            starFilterMagnitudeMax: null,
            starFilterConstellation: null,
            btnStarRefreshPool: null,
            neighborDifficulty: null,
            neighborVisualMode: null,
            neighborSequenceMode: null,
            neighborAutoAdvance: null,
            btnStartNeighborTraining: null,
            btnStopNeighborTraining: null,
            neighborCurrentTarget: null,
            neighborExpectedCount: null,
            neighborRoundTimer: null,
            neighborAnswerArea: null,
            btnSubmitNeighborAnswers: null,
            btnNeighborChooseAnother: null,
            neighborResultArea: null,
            neighborSessionHistory: null,
            neighborSessionAccuracy: null,
            neighborSessionSummary: null,
            neighborStatusPill: null,
            toggleMessier: null,
            toggleAsterisms: null,
            toggleAsterismLabels: null,
            btnStartMessierGame: null,
            btnStopMessierGame: null,
            messierRandomOrder: null,
            messierAutoAdvance: null,
            messierShowErrorHint: null,
            messierToleranceDeg: null,
            messierTargetInput: null,
            btnApplyMessierTarget: null,
            btnFocusMessierTarget: null,
            messierGameStatusPill: null,
            messierGameTargetBadge: null,
            messierGameTarget: null,
            messierGameProgress: null,
            messierGameErrors: null,
            messierGameProgressLabel: null,
            messierGameProgressBar: null,
            messierDiscoveredList: null,
            messierLastError: null,
            btnStartAsterismGame: null,
            btnStopAsterismGame: null,
            asterismGameRandomOrder: null,
            asterismGameAutoAdvance: null,
            asterismGameTargetInput: null,
            btnApplyAsterismTarget: null,
            btnFocusAsterismTarget: null,
            asterismGameStatusPill: null,
            asterismGameTargetBadge: null,
            asterismGameTarget: null,
            asterismGameProgress: null,
            asterismGameErrors: null,
            asterismGameProgressLabel: null,
            asterismGameProgressBar: null,
            asterismDiscoveredList: null,
            asterismLastResult: null,
            btnUndoAsterismSegment: null,
            btnClearAsterismSegments: null,
            btnSubmitAsterismSegments: null,
            bankWorkspace: null,
            bankWindow: null,
            bankWindowBody: null,
            bankWindowTitle: null,
            btnOpenBankWindow: null,
            btnCloseBankWindow: null,
            btnMinimizeBankWindow: null,
            btnMaximizeBankWindow: null,
            btnDockBankLeft: null,
            btnDockBankRight: null,
            bankResizeHandle: null,
            bankInternalTabs: null,
            bankPanels: null,
            bankStarSearchInput: null,
            bankStarSearchConstellation: null,
            bankStarSearchMagMax: null,
            bankStarSort: null,
            bankStarImportantOnly: null,
            bankStarResults: null,
            bankStarCount: null,
            globalSearchInput: null,
            btnGlobalSearch: null,
            globalSearchResults: null,
            starSearchInput: null,
            starSearchConstellation: null,
            starSearchMagMax: null,
            btnSearchStar: null,
            starSearchResults: null,
            catalogConstellationFilter: null,
            catalogConstellationStarsNamedOnly: null,
            catalogConstellationStarsMagMax: null,
            catalogConstellationList: null,
            catalogConstellationDetail: null,
            catalogAsterismFilter: null,
            catalogAsterismList: null,
            catalogAsterismDetail: null,
            game1ShowBoundaries: null,
            game1ShowLabels: null
        };

        this.isUISetup = false;
        this.messageQueue = [];
        this.activeMessage = null;
        this._messageTimers = new Set();

        this.shell = this._createShellModule();
        this.games = this._createGamesModule();
        this._adoptModuleMethods(this.shell, 'shell');
        this._adoptModuleMethods(this.games, 'games');

        console.log('🎨 Sftw1_UI inicializado (fachada rebalanceada)');
    }

    _createShellModule() {
        try {
            if (typeof window !== 'undefined') {
                const ShellCtor = window.Sftw1_UI_Shell || window.Sftw1_UIShell;
                if (typeof ShellCtor === 'function') {
                    const mod = new ShellCtor(this);
                    console.log('✅ UI Shell conectado à fachada');
                    return mod;
                }
            }
        } catch (err) {
            console.warn('⚠️ Falha ao criar Sftw1_UI_Shell:', err);
        }
        console.warn('ℹ️ Sftw1_UI_Shell não encontrado; shell ficará local.');
        return null;
    }

    _createGamesModule() {
        try {
            if (typeof window !== 'undefined') {
                const GamesCtor = window.Sftw1_UIGames || window.Sftw1_UI_Games;
                if (typeof GamesCtor === 'function') {
                    const mod = new GamesCtor(this);
                    console.log('✅ UI Games conectado à fachada');
                    return mod;
                }
            }
        } catch (err) {
            console.warn('⚠️ Falha ao criar Sftw1_UI_Games:', err);
        }
        console.warn('ℹ️ Sftw1_UI_Games não encontrado; jogos ficam locais.');
        return null;
    }

    _adoptModuleMethods(moduleInstance, label) {
        if (!moduleInstance) return;
        const proto = Object.getPrototypeOf(moduleInstance);
        if (!proto) return;

        const names = Object.getOwnPropertyNames(proto);
        const keepInFacade = new Set([
            'constructor',
            'setupGameUI',
            'createCompleteUILayout',
            'cacheElements',
            'setupAllEvents',
            'addUIStyles',
            'showMessage',
            'clearAllMessages',
            'update',
            'updateUI',
            'ensureProgressTrackerUI',
            'resetProgressChecklist',
            'markConstellationChecked',
            'updateProgressCount',
            'updateGameUIState',
            'updateGameStats',
            'showGameCompleteMessage',
            'setContextControlLock',
            'setupProgressTrackerEvents',
            'setProgressPanelVisible',
            'applyGameOptionsToVisualization'
        ]);

        for (const name of names) {
            if (keepInFacade.has(name)) continue;
            if (typeof moduleInstance[name] !== 'function') continue;
            if (Object.prototype.hasOwnProperty.call(Sftw1_UI.prototype, name)) continue;
            if (this[name] && typeof this[name] === 'function') continue;
            this[name] = moduleInstance[name].bind(moduleInstance);
        }

        console.log(`🔗 Métodos do módulo ${label} acoplados à fachada`);
    }

    setupGameUI() {
        console.log('🔄 Configurando interface do jogo (fachada rebalanceada)...');

        const controlsContainer = document.querySelector('.module-controls');
        if (!controlsContainer) {
            console.error('❌ Container de controles não encontrado');
            return false;
        }

        this.uiContainer = controlsContainer;
        const loadingEl = controlsContainer.querySelector('.loading-controls');
        if (loadingEl) loadingEl.remove();

        controlsContainer.innerHTML = this.createCompleteUILayout();

        this.cacheElements();
        if (this.shell && typeof this.shell.cacheElements === 'function') {
            this.shell.cacheElements();
        }

        if (this.shell && typeof this.shell.postLayoutRefactor === 'function') {
            this.shell.postLayoutRefactor();
            this.cacheElements();
            if (typeof this.shell.cacheElements === 'function') this.shell.cacheElements();
        }

        this.ensureProgressTrackerUI();
        this.addUIStyles();

        this.isUISetup = true;
        this.setupAllEvents();
        this.updateGameUIState();
        this.resetProgressChecklist();

        if (this.games && typeof this.games.connectWithGameModule === 'function') {
            this.games.connectWithGameModule();
        }

        this.games?.refreshNeighborTrainingUI?.();
        this.games?.refreshMessierGameUI?.();
        this.shell?.refreshStarTrainingPoolSummary?.();
        this.shell?.renderKnowledgeHubData?.();

        console.log('✅ Interface do jogo configurada com sucesso');
        return true;
    }

    createCompleteUILayout() {
        const currentNameType = this.sftw.settings?.nameType || 'bayer';
        const currentShowMessier = !!(this.sftw.settings?.showMessier);

        return `
            <div class="sftw-ui-root">
                <div class="sftw-left-panel" id="game-control-panel">
                    <div class="sftw-brand">
                        <div class="sftw-title">
                            <span class="sftw-badge">SFTW1</span>
                            <span class="sftw-title-text">Planetário OBA</span>
                        </div>
                        <div class="sftw-subtitle">Explorar · Banco de estudo · Jogos astronômicos</div>
                        <div style="margin-top:10px;">
                            <button id="btn-return-hub" class="sftw-btn" type="button" style="background:#b91c1c;color:#fff;border:1px solid rgba(255,255,255,.18);">
                                <i class="fas fa-house"></i><span>Voltar ao hub</span>
                            </button>
                        </div>
                    </div>

                    <div class="sftw-tabs" role="tablist" aria-label="Contexto principal">
                        <button class="sftw-tab active" data-tab="explore" type="button"><i class="fas fa-globe"></i><span>Explorar</span></button>
                        <button class="sftw-tab" data-tab="catalog" type="button"><i class="fas fa-database"></i><span>Banco</span></button>
                        <button class="sftw-tab" data-tab="games" type="button"><i class="fas fa-gamepad"></i><span>Jogos</span></button>
                        <button class="sftw-tab" data-tab="stars" type="button"><i class="fas fa-star"></i><span>Estrelas</span></button>
                    </div>

                    <div class="sftw-tabpanel active" data-panel="explore">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-compass"></i> Modo livre</div>
                                <div class="sftw-pill sftw-pill-soft">Planetário</div>
                            </div>
                            <div class="sftw-help sftw-help-tight">Ajuste a visualização do céu antes de entrar em um jogo. Nesta etapa, o foco é separar melhor o ambiente livre dos modos de gameplay.</div>
                        </div>

                        <div class="sftw-card" data-lock-group="explore-controls">
                            <div class="sftw-card-h"><div class="sftw-card-title"><i class="fas fa-magnifying-glass"></i> Buscar constelação</div></div>
                            <div class="sftw-row">
                                <input id="constellation-search-input" class="sftw-input" type="text" placeholder="Ex.: Ori, Orion, Órion..." autocomplete="off">
                                <button id="btn-search-constellation" class="sftw-btn sftw-btn-primary" type="button"><i class="fas fa-arrow-right"></i></button>
                            </div>
                            <div class="sftw-help">Dica: você pode digitar <strong>Nome (Abbr)</strong>. O foco usa o mesmo vetor do label.</div>
                        </div>

                        <div class="sftw-card" data-lock-group="explore-controls">
                            <div class="sftw-card-h"><div class="sftw-card-title"><i class="fas fa-font"></i> Tipo de nome</div></div>
                            <div class="sftw-chipgrid" role="group" aria-label="Tipo de nome">
                                <button class="name-type-btn sftw-chip ${currentNameType === 'bayer' ? 'active' : ''}" data-type="bayer" type="button">Bayer</button>
                                <button class="name-type-btn sftw-chip ${currentNameType === 'pt' ? 'active' : ''}" data-type="pt" type="button">PT</button>
                                <button class="name-type-btn sftw-chip ${currentNameType === 'latin' ? 'active' : ''}" data-type="latin" type="button">Latim</button>
                            </div>
                        </div>

                        <div class="sftw-card" data-lock-group="explore-controls">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-sliders"></i> Visualização do céu</div>
                                <span class="muted">pré-jogo</span>
                            </div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle"><input id="toggle-grid" type="checkbox" checked><span>Grade</span></label>
                                <label class="sftw-toggle"><input id="toggle-boundaries" type="checkbox" checked><span>Limites</span></label>
                                <label class="sftw-toggle"><input id="toggle-labels" type="checkbox" checked><span>Nomes</span></label>
                                <label class="sftw-toggle"><input id="toggle-stars" type="checkbox" checked><span>Estrelas</span></label>
                            </div>
                            <div class="sftw-divider"></div>
                            <div class="sftw-row sftw-row-wrap">
                                <button id="btn-focus-orion" class="sftw-btn" type="button"><i class="fas fa-crosshairs"></i><span>Focar Ori</span></button>
                                <button id="btn-reset-view" class="sftw-btn" type="button"><i class="fas fa-rotate-left"></i><span>Reset</span></button>
                            </div>
                        </div>
                    </div>

                    <div class="sftw-tabpanel" data-panel="search">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-magnifying-glass"></i> Pesquisa Astronômica</div>
                                <div class="sftw-pill sftw-pill-soft">IOAA</div>
                            </div>
                            <div class="sftw-help sftw-help-tight">Pesquise constelações, estrelas e asterismos a partir de um único lugar. Os resultados servem tanto para estudo rápido quanto para focar o céu imediatamente.</div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-search"></i> Busca unificada</div><span class="muted">constelações · estrelas · asterismos</span></div>
                            <div class="sftw-row">
                                <input id="global-search-input" class="sftw-input" type="text" placeholder="Ex.: Orion, Sirius, Summer Triangle..." autocomplete="off">
                                <button id="btn-global-search" class="sftw-btn sftw-btn-primary" type="button"><i class="fas fa-arrow-right"></i></button>
                            </div>
                            <div class="sftw-help">A busca tenta nome, sigla, nome em PT e aliases. Resultados com foco rápido sempre que possível.</div>
                            <div id="global-search-results" class="sftw-knowledge-list sftw-knowledge-list-compact"></div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-star"></i> Pesquisa de estrelas</div><span class="muted">nome · constelação · magnitude</span></div>
                            <div class="sftw-row sftw-row-wrap">
                                <input id="star-search-input" class="sftw-input" type="text" placeholder="Ex.: Sirius, Betelgeuse, Vega" style="flex: 1 1 220px;">
                                <input id="star-search-constellation" class="sftw-input" type="text" placeholder="Constelação (opcional)" style="flex: 1 1 160px;">
                            </div>
                            <div class="sftw-row" style="margin-top:10px;">
                                <input id="star-search-mag-max" class="sftw-input" type="number" min="-2" max="8" step="0.1" value="3.5" style="max-width:140px;">
                                <button id="btn-search-star" class="sftw-btn sftw-btn-primary" type="button"><i class="fas fa-filter"></i><span>Buscar estrelas</span></button>
                            </div>
                            <div class="sftw-help">Mostra resultados no painel e ajuda a separar as estrelas relevantes do estudo.</div>
                            <div id="star-search-results" class="sftw-knowledge-list"></div>
                        </div>
                    </div>

                    <div class="sftw-tabpanel" data-panel="catalog">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-database"></i> Banco de Dados do Céu</div><div class="sftw-pill sftw-pill-soft">estudo</div></div>
                            <div class="sftw-help sftw-help-tight">Navegue por constelações e asterismos como um banco de estudo: escolha um item, veja os dados e filtre as estrelas mais importantes.</div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-shapes"></i> Constelações</div><span class="muted">lista + detalhe</span></div>
                            <div class="sftw-row sftw-row-wrap">
                                <input id="catalog-constellation-filter" class="sftw-input" type="text" placeholder="Filtrar constelações por nome ou sigla" style="flex: 1 1 220px;">
                                <label class="sftw-toggle sftw-toggle-inline"><input id="catalog-constellation-stars-named-only" type="checkbox" checked><span>somente estrelas com nome</span></label>
                                <input id="catalog-constellation-stars-mag-max" class="sftw-input" type="number" min="-2" max="8" step="0.1" value="3.5" style="max-width:120px;">
                            </div>
                            <div class="sftw-split-grid" style="margin-top:12px;">
                                <div><div id="catalog-constellation-list" class="sftw-knowledge-list sftw-knowledge-list-scroll"></div></div>
                                <div><div id="catalog-constellation-detail" class="sftw-detail-card"><div class="sftw-empty-state">Selecione uma constelação para ver as estrelas mais relevantes.</div></div></div>
                            </div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-diagram-project"></i> Asterismos</div><span class="muted">lista + preview</span></div>
                            <div class="sftw-row sftw-row-wrap"><input id="catalog-asterism-filter" class="sftw-input" type="text" placeholder="Filtrar asterismos" style="flex: 1 1 220px;"></div>
                            <div class="sftw-split-grid" style="margin-top:12px;">
                                <div><div id="catalog-asterism-list" class="sftw-knowledge-list sftw-knowledge-list-scroll"></div></div>
                                <div><div id="catalog-asterism-detail" class="sftw-detail-card"><div class="sftw-empty-state">Selecione um asterismo para ver as estrelas e o preview leve.</div></div></div>
                            </div>
                        </div>
                    </div>

                    <div class="sftw-tabpanel" data-panel="games">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-gamepad"></i> Centro de Jogos</div><div class="sftw-pill sftw-pill-soft">Treino IOAA</div></div>
                            <div class="sftw-help sftw-help-tight">Os modos de jogo ficam concentrados aqui. O objetivo desta etapa é separar claramente estudo/observação de gameplay.</div>
                        </div>
                        <div id="games-main-shell" class="sftw-games-shell">
                            <section class="sftw-games-mode" id="asterism-game-shell">
                                <div class="sftw-games-mode-header">
                                    <div>
                                        <div class="sftw-games-mode-title"><i class="fas fa-wand-magic-sparkles"></i><span>Jogo dos Asterismos</span></div>
                                        <div class="sftw-games-mode-copy">Nova camada de treino: ligar/desenhar os asterismos clássicos mais observacionais. Nesta etapa, a estrutura visual já fica pronta para o controller recém-integrado.</div>
                                    </div>
                                    <div class="sftw-pill sftw-pill-soft" id="asterism-game-status-pill">Inativo</div>
                                </div>
                                <div class="sftw-games-mode-body">
                                    <div class="sftw-card">
                                        <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-play"></i> Sessão</div><span class="muted" id="asterism-game-target-badge">Sem alvo</span></div>
                                        <div class="sftw-row sftw-row-wrap">
                                            <button class="sftw-btn sftw-btn-primary sftw-btn-wide" id="btn-start-asterism-game" type="button"><i class="fas fa-play"></i><span>Iniciar</span></button>
                                            <button class="sftw-btn sftw-btn-danger sftw-btn-wide" id="btn-stop-asterism-game" type="button" style="display:none;"><i class="fas fa-stop"></i><span>Encerrar</span></button>
                                        </div>
                                        <div class="sftw-stats" style="margin-top:12px;">
                                            <div class="sftw-stat"><div class="k">Asterismo alvo</div><div class="v" id="asterism-game-target">—</div></div>
                                            <div class="sftw-stat"><div class="k">Descobertos</div><div class="v" id="asterism-game-progress">0/0</div></div>
                                            <div class="sftw-stat"><div class="k">Erros</div><div class="v" id="asterism-game-errors">0</div></div>
                                        </div>
                                        <div class="sftw-progress"><div class="sftw-progress-top"><span>Progresso do jogo</span><span id="asterism-game-progress-label">0%</span></div><div class="sftw-progress-bar"><div class="sftw-progress-fill" id="asterism-game-progress-bar"></div></div></div>
                                    </div>
                                    <div class="sftw-card">
                                        <div class="sftw-card-h"><div class="sftw-card-title"><i class="fas fa-sliders"></i> Opções</div></div>
                                        <div class="sftw-togglelist">
                                            <label class="sftw-toggle"><input id="asterism-game-random-order" type="checkbox"><span>Ordem aleatória</span></label>
                                            <label class="sftw-toggle"><input id="asterism-game-auto-advance" type="checkbox" checked><span>Avançar automaticamente</span></label>
                                        </div>
                                        <div class="sftw-row sftw-row-wrap" style="margin-top:12px;">
                                            <input id="asterism-game-target-input" class="sftw-input" type="text" placeholder="Asterismo específico (opcional)" style="flex:1 1 220px;">
                                            <button id="btn-apply-asterism-target" class="sftw-btn" type="button"><i class="fas fa-check"></i><span>Aplicar alvo</span></button>
                                            <button id="btn-focus-asterism-target" class="sftw-btn" type="button"><i class="fas fa-crosshairs"></i><span>Focar</span></button>
                                        </div>
                                        <div class="sftw-divider"></div>
                                        <div class="sftw-row sftw-row-wrap" style="margin-top:4px;">
                                            <button id="btn-undo-asterism-segment" class="sftw-btn" type="button"><i class="fas fa-rotate-left"></i><span>Desfazer último</span></button>
                                            <button id="btn-clear-asterism-segments" class="sftw-btn" type="button"><i class="fas fa-eraser"></i><span>Limpar</span></button>
                                            <button id="btn-submit-asterism-segments" class="sftw-btn sftw-btn-primary" type="button"><i class="fas fa-check-double"></i><span>OK / Corrigir</span></button>
                                        </div>
                                        <div class="sftw-help">Monte o desenho manualmente no céu. A correção só acontece quando você apertar OK / Corrigir.</div>
                                    </div>
                                    <div class="sftw-card">
                                        <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-list"></i> Histórico</div><span class="muted" id="asterism-last-result">Aguardando sessão</span></div>
                                        <div id="asterism-discovered-list" class="sftw-checklist"><div class="sftw-help">Os asterismos concluídos nesta sessão aparecerão aqui.</div></div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div class="sftw-tabpanel" data-panel="constellations">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-gamepad"></i> Jogo das Constelações</div><div class="sftw-pill" id="game-status">Pronto</div></div>
                            <div class="sftw-help sftw-help-tight">Aqui fica apenas o fluxo do jogo de constelações: iniciar sessão, acompanhar progresso e consultar a checklist de 88 constelações.</div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-row sftw-row-wrap">
                                <button id="btn-start-game" class="sftw-btn sftw-btn-primary sftw-btn-wide" type="button"><i class="fas fa-play"></i><span>Iniciar jogo</span></button>
                                <button id="btn-end-game" class="sftw-btn sftw-btn-danger sftw-btn-wide" type="button" style="display:none;"><i class="fas fa-stop"></i><span>Sair</span></button>
                            </div>
                            <div class="sftw-stats">
                                <div class="sftw-stat"><div class="k">Tempo</div><div class="v" id="game-timer">00:00</div></div>
                                <div class="sftw-stat"><div class="k">Pontos</div><div class="v" id="game-score">0</div></div>
                                <div class="sftw-stat"><div class="k">Progresso</div><div class="v" id="game-discovered">0/88</div></div>
                            </div>
                            <div class="sftw-progress">
                                <div class="sftw-progress-top"><span id="sftw-progress-count">0/88</span><span id="game-progress-label" class="muted">0%</span></div>
                                <div class="sftw-progress-bar"><div id="game-progress" class="sftw-progress-fill" style="width:0%"></div></div>
                            </div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-sliders"></i> Opções do jogo</div><span class="muted">constelações</span></div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle"><input id="opt-show-progress" type="checkbox" checked><span>Mostrar checklist 88</span></label>
                                <label class="sftw-toggle"><input id="opt-show-discovered-fill" type="checkbox" checked><span>Fundo azul nas descobertas</span></label>
                                <label class="sftw-toggle"><input id="opt-show-discovered-names" type="checkbox" checked><span>Mostrar nomes descobertos</span></label>
                            </div>
                            <div class="sftw-divider"></div>
                            <div class="sftw-help">Jogo 1 — aparência durante a sessão</div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle"><input id="game1-show-boundaries" type="checkbox" checked><span>Mostrar limites revelados</span></label>
                                <label class="sftw-toggle"><input id="game1-show-labels" type="checkbox"><span>Mostrar nomes revelados</span></label>
                            </div>
                        </div>
                        <div class="sftw-card" id="sftw-progress-section">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-list-check"></i> Checklist (88)</div><button class="sftw-linkbtn" id="sftw-toggle-checklist" type="button"><span>Ocultar</span></button></div>
                            <div id="sftw-progress-list" class="sftw-checklist"></div>
                        </div>
                        <div class="sftw-card sftw-card-note">
                            <div class="sftw-card-h"><div class="sftw-card-title"><i class="fas fa-lightbulb"></i> Fluxo</div></div>
                            <div class="sftw-help">No jogo: clique numa região (boundaries) e digite a constelação vizinha.</div>
                        </div>
                        <div class="sftw-card" id="neighbor-training-section">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-diagram-project"></i> Treino 2 — Limites das Constelações</div><div class="sftw-pill sftw-pill-soft" id="neighbor-status-pill">Pronto</div></div>
                            <div class="sftw-help sftw-help-tight">Escolha uma constelação e responda todas as que fazem limite com ela. Nesta primeira versão, o modo fácil mostra quantas vizinhas existem e cria as caixinhas automaticamente.</div>
                            <div class="sftw-divider"></div>
                            <div class="sftw-row sftw-row-wrap">
                                <div style="flex:1 1 220px; min-width: 180px;"><div class="sftw-help" style="margin-top:0; margin-bottom:6px;">Dificuldade</div><select id="neighbor-difficulty" class="sftw-input"><option value="easy" selected>Fácil — mostra quantas vizinhas existem</option><option value="hidden-count">Livre — não mostra quantas existem</option></select></div>
                                <div style="flex:1 1 220px; min-width: 180px;"><div class="sftw-help" style="margin-top:0; margin-bottom:6px;">Visualização</div><select id="neighbor-visual-mode" class="sftw-input"><option value="normal" selected>Planetário normal</option><option value="blackout">Planetário desativado (céu escuro)</option></select></div>
                            </div>
                            <div class="sftw-row sftw-row-wrap" style="margin-top:12px;">
                                <div style="flex:1 1 220px; min-width: 180px;"><div class="sftw-help" style="margin-top:0; margin-bottom:6px;">Sequência</div><select id="neighbor-sequence-mode" class="sftw-input"><option value="selected" selected>Somente a constelação escolhida</option><option value="alphabetical">Sequência alfabética</option><option value="random">Ordem aleatória</option></select></div>
                                <div style="flex:1 1 220px; min-width: 180px; display:flex; align-items:flex-end;"><label class="sftw-toggle" style="margin:0; min-height:46px;"><input id="neighbor-auto-advance" type="checkbox"><span>Passar automaticamente para a próxima</span></label></div>
                            </div>
                            <div class="sftw-row sftw-row-wrap" style="margin-top:12px;">
                                <button id="btn-start-neighbor-training" class="sftw-btn sftw-btn-primary sftw-btn-wide" type="button"><i class="fas fa-play"></i><span>Escolher constelação e iniciar</span></button>
                                <button id="btn-stop-neighbor-training" class="sftw-btn sftw-btn-danger sftw-btn-wide" type="button" style="display:none;"><i class="fas fa-stop"></i><span>Encerrar treino</span></button>
                            </div>
                            <div class="sftw-stats" style="margin-top:12px;">
                                <div class="sftw-stat"><div class="k">Constelação atual</div><div class="v" id="neighbor-current-target">—</div></div>
                                <div class="sftw-stat"><div class="k">Quantidade esperada</div><div class="v" id="neighbor-expected-count">—</div></div>
                                <div class="sftw-stat"><div class="k">Tempo da rodada</div><div class="v" id="neighbor-round-timer">00:00</div></div>
                            </div>
                            <div class="sftw-divider"></div>
                            <div id="neighbor-answer-area" class="sftw-neighbor-answer-area"><div class="sftw-help">Ao iniciar, as respostas aparecem aqui.</div></div>
                            <div class="sftw-row sftw-row-wrap" style="margin-top:12px;">
                                <button id="btn-submit-neighbor-answers" class="sftw-btn sftw-btn-primary" type="button" disabled><i class="fas fa-check"></i><span>Corrigir respostas</span></button>
                                <button id="btn-neighbor-choose-another" class="sftw-btn" type="button"><i class="fas fa-repeat"></i><span>Treinar outra constelação</span></button>
                            </div>
                            <div class="sftw-divider"></div>
                            <div id="neighbor-result-area" class="sftw-neighbor-result-area"><div class="sftw-help">Depois da correção, aparecem aqui os acertos, erros e faltantes.</div></div>
                            <div class="sftw-divider"></div>
                            <div class="sftw-stats" style="margin-bottom:12px;">
                                <div class="sftw-stat"><div class="k">Acurácia da sessão</div><div class="v" id="neighbor-session-accuracy">—</div></div>
                                <div class="sftw-stat"><div class="k">Resumo</div><div class="v" id="neighbor-session-summary">0/0</div></div>
                            </div>
                            <div class="sftw-card-h sftw-card-h-split" style="margin-bottom:8px;"><div class="sftw-card-title"><i class="fas fa-clock-rotate-left"></i> Histórico da sessão</div><span class="muted">constelações treinadas nesta sessão</span></div>
                            <div id="neighbor-session-history" class="sftw-checklist"><div class="sftw-help">Nenhuma constelação treinada ainda.</div></div>
                        </div>
                    </div>

                    <div class="sftw-tabpanel" data-panel="messier">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-bullseye"></i> Jogo do Messier</div><div class="sftw-pill sftw-pill-soft" id="messier-game-status-pill">Inativo</div></div>
                            <div class="sftw-help sftw-help-tight">Aqui fica o jogo do Messier de verdade: o céu começa sem os Messiers revelados, o painel escolhe o alvo e o acerto acontece por tolerância angular no clique.</div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-play"></i> Sessão</div><span class="muted" id="messier-game-target-badge">Sem alvo</span></div>
                            <div class="sftw-row sftw-row-wrap">
                                <button class="sftw-btn sftw-btn-primary sftw-btn-wide" id="btn-start-messier-game" type="button"><i class="fas fa-play"></i><span>Iniciar</span></button>
                                <button class="sftw-btn sftw-btn-danger sftw-btn-wide" id="btn-stop-messier-game" type="button"><i class="fas fa-stop"></i><span>Encerrar</span></button>
                            </div>
                            <div class="sftw-stats" style="margin-top:12px;">
                                <div class="sftw-stat"><div class="k">Alvo atual</div><div class="v" id="messier-game-target">—</div></div>
                                <div class="sftw-stat"><div class="k">Descobertos</div><div class="v" id="messier-game-progress">0/110</div></div>
                                <div class="sftw-stat"><div class="k">Erros</div><div class="v" id="messier-game-errors">0</div></div>
                            </div>
                            <div class="sftw-progress"><div class="sftw-progress-top"><span>Progresso do jogo</span><span id="messier-game-progress-label">0%</span></div><div class="sftw-progress-bar"><div class="sftw-progress-fill" id="messier-game-progress-bar"></div></div></div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h"><div class="sftw-card-title"><i class="fas fa-sliders"></i> Configuração da rodada</div></div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle"><input id="messier-random-order" type="checkbox"><span>Ordem aleatória</span></label>
                                <label class="sftw-toggle"><input id="messier-auto-advance" type="checkbox" checked><span>Auto-advance</span></label>
                                <label class="sftw-toggle"><input id="messier-show-error-hint" type="checkbox" checked><span>Mostrar distância do erro (graus)</span></label>
                            </div>
                            <div class="sftw-divider"></div>
                            <div class="sftw-help">Tolerância angular (em graus)</div>
                            <div class="sftw-row"><input id="messier-tolerance-deg" class="sftw-input" type="number" min="0.1" max="20" step="0.1" value="1.2"></div>
                            <div class="sftw-help">Você pode definir um alvo específico. Se a ordem aleatória estiver desligada, a ordem padrão segue M1 → M110.</div>
                            <div class="sftw-row sftw-row-wrap">
                                <input id="messier-target-input" class="sftw-input" type="text" placeholder="Ex.: M31" style="flex:1 1 160px;">
                                <button class="sftw-btn" id="btn-apply-messier-target" type="button"><i class="fas fa-crosshairs"></i><span>Definir alvo</span></button>
                                <button class="sftw-btn" id="btn-focus-messier-target" type="button"><i class="fas fa-location-crosshairs"></i><span>Focar</span></button>
                            </div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-layer-group"></i> Catálogo visível</div><span class="muted">fora da sessão</span></div>
                            <div class="sftw-togglelist"><label class="sftw-toggle"><input id="toggle-messier" type="checkbox" ${currentShowMessier ? 'checked' : ''}><span>Mostrar catálogo Messier</span></label></div>
                            <div class="sftw-help">Este controle continua existindo, mas agora ele fica separado do jogo. Durante uma sessão, o jogo usa apenas os Messiers já descobertos.</div>
                        </div>
                        <div class="sftw-card"><div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-list"></i> Descobertos</div><span class="muted" id="messier-last-error">Último erro: —</span></div><div id="messier-discovered-list" class="sftw-checklist"></div></div>
                    </div>

                    <div class="sftw-tabpanel" data-panel="stars">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-star"></i> Explorador de Estrelas</div><div class="sftw-pill sftw-pill-soft">Base do próximo jogo</div></div>
                            <div class="sftw-help sftw-help-tight">Primeiro deixamos as estrelas inspecionáveis. Depois, o jogo das estrelas reaproveita essa mesma base com filtros por magnitude, nome e constelação.</div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-crosshairs"></i> Estrela selecionada</div><span class="muted" id="star-inspector-status">Clique em uma estrela no céu</span></div>
                            <div class="sftw-stats" style="margin-bottom:12px;">
                                <div class="sftw-stat" style="grid-column:1 / -1;"><div class="k">Nome</div><div class="v" id="star-inspector-name">—</div></div>
                                <div class="sftw-stat"><div class="k">Constelação</div><div class="v" id="star-inspector-constellation">—</div></div>
                                <div class="sftw-stat"><div class="k">Magnitude</div><div class="v" id="star-inspector-magnitude">—</div></div>
                                <div class="sftw-stat"><div class="k">Ascensão reta</div><div class="v" id="star-inspector-ra">—</div></div>
                                <div class="sftw-stat"><div class="k">Declinação</div><div class="v" id="star-inspector-dec">—</div></div>
                                <div class="sftw-stat" style="grid-column:1 / -1;"><div class="k">Classe espectral</div><div class="v" id="star-inspector-spectral">—</div></div>
                            </div>
                            <div class="sftw-help">Dica: por enquanto o clique em estrela serve para estudo. Depois vamos transformar isso em modos de jogo por brilho, nome e constelação.</div>
                        </div>
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split"><div class="sftw-card-title"><i class="fas fa-filter"></i> Pool de treino (pré-jogo)</div><button class="sftw-linkbtn" id="btn-star-refresh-pool" type="button"><span>Atualizar</span></button></div>
                            <div class="sftw-togglelist"><label class="sftw-toggle"><input id="star-filter-named-only" type="checkbox" checked><span>Somente estrelas com nome</span></label></div>
                            <div class="sftw-help">Magnitude máxima (≤) considerada para treino</div>
                            <div class="sftw-row"><input id="star-filter-magnitude-max" class="sftw-input" type="number" min="-2" max="8" step="0.1" value="3.5"></div>
                            <div class="sftw-help">Filtrar por constelação (opcional)</div>
                            <div class="sftw-row"><input id="star-filter-constellation" class="sftw-input" type="text" placeholder="Ex.: Ori, Sco, Cyg"></div>
                            <div class="sftw-progress" style="margin-top:12px;"><div class="sftw-progress-top"><span>Total no catálogo</span><span id="star-catalog-total">0</span></div></div>
                            <div class="sftw-stats" style="margin-top:12px;"><div class="sftw-stat"><div class="k">Com nome</div><div class="v" id="star-named-count">0</div></div><div class="sftw-stat"><div class="k">Treináveis agora</div><div class="v" id="star-training-pool-count">0</div></div></div>
                            <div class="sftw-help">Este bloco ainda não liga/desliga estrelas na cena. Ele serve para você enxergar qual subconjunto faz sentido virar jogo depois.</div>
                        </div>
                    </div>

                    <div class="sftw-panel-footer">
                        <div class="sftw-card sftw-messages"><div class="sftw-card-h"><div class="sftw-card-title"><i class="fas fa-message"></i> Mensagens</div></div><div id="message-container" class="sftw-message-container"></div></div>
                    </div>
                </div>
            </div>
        `;
    }

    cacheElements() {
        this.elements.gameControls = document.getElementById('game-control-panel');
        this.elements.gameStatus = document.getElementById('game-status');
        this.elements.gameTimer = document.getElementById('game-timer');
        this.elements.gameScore = document.getElementById('game-score');
        this.elements.gameDiscovered = document.getElementById('game-discovered');
        this.elements.gameProgress = document.getElementById('game-progress');
        this.elements.btnStartGame = document.getElementById('btn-start-game');
        this.elements.btnShowAnswerKey = document.getElementById('btn-show-answer-key');
        this.elements.btnRestartGame = document.getElementById('btn-restart-game');
        this.elements.btnEndGame = document.getElementById('btn-end-game');
        this.elements.toggleGrid = document.getElementById('toggle-grid');
        this.elements.toggleBoundaries = document.getElementById('toggle-boundaries');
        this.elements.toggleLabels = document.getElementById('toggle-labels');
        this.elements.toggleStars = document.getElementById('toggle-stars');
        this.elements.messageContainer = document.getElementById('message-container');
        this.elements.optShowProgress = document.getElementById('opt-show-progress');
        this.elements.optShowDiscoveredNames = document.getElementById('opt-show-discovered-names');
        this.elements.optShowDiscoveredFill = document.getElementById('opt-show-discovered-fill');
        this.elements.game1ShowBoundaries = document.getElementById('game1-show-boundaries');
        this.elements.game1ShowLabels = document.getElementById('game1-show-labels');
        this.elements.neighborDifficulty = document.getElementById('neighbor-difficulty');
        this.elements.neighborVisualMode = document.getElementById('neighbor-visual-mode');
        this.elements.neighborSequenceMode = document.getElementById('neighbor-sequence-mode');
        this.elements.neighborAutoAdvance = document.getElementById('neighbor-auto-advance');
        this.elements.btnStartNeighborTraining = document.getElementById('btn-start-neighbor-training');
        this.elements.btnStopNeighborTraining = document.getElementById('btn-stop-neighbor-training');
        this.elements.neighborCurrentTarget = document.getElementById('neighbor-current-target');
        this.elements.neighborExpectedCount = document.getElementById('neighbor-expected-count');
        this.elements.neighborRoundTimer = document.getElementById('neighbor-round-timer');
        this.elements.neighborAnswerArea = document.getElementById('neighbor-answer-area');
        this.elements.btnSubmitNeighborAnswers = document.getElementById('btn-submit-neighbor-answers');
        this.elements.btnNeighborChooseAnother = document.getElementById('btn-neighbor-choose-another');
        this.elements.neighborResultArea = document.getElementById('neighbor-result-area');
        this.elements.neighborSessionHistory = document.getElementById('neighbor-session-history');
        this.elements.neighborSessionAccuracy = document.getElementById('neighbor-session-accuracy');
        this.elements.neighborSessionSummary = document.getElementById('neighbor-session-summary');
        this.elements.neighborStatusPill = document.getElementById('neighbor-status-pill');
        this.elements.btnStartMessierGame = document.getElementById('btn-start-messier-game');
        this.elements.btnStopMessierGame = document.getElementById('btn-stop-messier-game');
        this.elements.messierRandomOrder = document.getElementById('messier-random-order');
        this.elements.messierAutoAdvance = document.getElementById('messier-auto-advance');
        this.elements.messierShowErrorHint = document.getElementById('messier-show-error-hint');
        this.elements.messierToleranceDeg = document.getElementById('messier-tolerance-deg');
        this.elements.messierTargetInput = document.getElementById('messier-target-input');
        this.elements.btnApplyMessierTarget = document.getElementById('btn-apply-messier-target');
        this.elements.btnFocusMessierTarget = document.getElementById('btn-focus-messier-target');
        this.elements.messierGameStatusPill = document.getElementById('messier-game-status-pill');
        this.elements.messierGameTargetBadge = document.getElementById('messier-game-target-badge');
        this.elements.messierGameTarget = document.getElementById('messier-game-target');
        this.elements.messierGameProgress = document.getElementById('messier-game-progress');
        this.elements.messierGameErrors = document.getElementById('messier-game-errors');
        this.elements.messierGameProgressLabel = document.getElementById('messier-game-progress-label');
        this.elements.messierGameProgressBar = document.getElementById('messier-game-progress-bar');
        this.elements.messierDiscoveredList = document.getElementById('messier-discovered-list');
        this.elements.messierLastError = document.getElementById('messier-last-error');
        this.elements.btnStartAsterismGame = document.getElementById('btn-start-asterism-game');
        this.elements.btnStopAsterismGame = document.getElementById('btn-stop-asterism-game');
        this.elements.asterismGameRandomOrder = document.getElementById('asterism-game-random-order');
        this.elements.asterismGameAutoAdvance = document.getElementById('asterism-game-auto-advance');
        this.elements.asterismGameTargetInput = document.getElementById('asterism-game-target-input');
        this.elements.btnApplyAsterismTarget = document.getElementById('btn-apply-asterism-target');
        this.elements.btnFocusAsterismTarget = document.getElementById('btn-focus-asterism-target');
        this.elements.asterismGameStatusPill = document.getElementById('asterism-game-status-pill');
        this.elements.asterismGameTargetBadge = document.getElementById('asterism-game-target-badge');
        this.elements.asterismGameTarget = document.getElementById('asterism-game-target');
        this.elements.asterismGameProgress = document.getElementById('asterism-game-progress');
        this.elements.asterismGameErrors = document.getElementById('asterism-game-errors');
        this.elements.asterismGameProgressLabel = document.getElementById('asterism-game-progress-label');
        this.elements.asterismGameProgressBar = document.getElementById('asterism-game-progress-bar');
        this.elements.asterismDiscoveredList = document.getElementById('asterism-discovered-list');
        this.elements.asterismLastResult = document.getElementById('asterism-last-result');
        this.elements.btnUndoAsterismSegment = document.getElementById('btn-undo-asterism-segment');
        this.elements.btnClearAsterismSegments = document.getElementById('btn-clear-asterism-segments');
        this.elements.btnSubmitAsterismSegments = document.getElementById('btn-submit-asterism-segments');
        console.log('✅ Elementos DOM principais cacheados');
    }

    setupAllEvents() {
        console.log('🔧 Configurando eventos da UI...');

        if (!this.isUISetup) {
            console.log('ℹ️ setupAllEvents chamado antes da UI estar pronta; seguindo em modo compatível.');
        }

        if (this.shell && typeof this.shell.setupShellEvents === 'function') {
            this.shell.setupShellEvents();
        } else if (typeof this.setupTabEvents === 'function') {
            this.setupTabEvents();
        }

        if (this.games) {
            this.games.setupGameEvents?.();
            this.games.setupNeighborGameEvents?.();
            this.games.setupMessierGameEvents?.();
        }

        if (this.elements.game1ShowBoundaries && !this.elements.game1ShowBoundaries.dataset.bound) {
            this.elements.game1ShowBoundaries.addEventListener('change', () => this.applyGameOptionsToVisualization());
            this.elements.game1ShowBoundaries.dataset.bound = '1';
        }
        if (this.elements.game1ShowLabels && !this.elements.game1ShowLabels.dataset.bound) {
            this.elements.game1ShowLabels.addEventListener('change', () => this.applyGameOptionsToVisualization());
            this.elements.game1ShowLabels.dataset.bound = '1';
        }

        this.setupProgressTrackerEvents();
        console.log('✅ Todos os eventos configurados');
    }

    updateGameUIState() {
        const isPlaying = this.gameUIState === 'playing';
        const isCompleted = this.gameUIState === 'completed';

        if (this.elements.btnStartGame) this.elements.btnStartGame.style.display = isPlaying ? 'none' : '';
        if (this.elements.btnEndGame) this.elements.btnEndGame.style.display = isPlaying ? '' : 'none';
        if (this.elements.gameStatus && !isPlaying && !isCompleted && this.elements.gameStatus.textContent !== 'Pronto') {
            this.elements.gameStatus.textContent = 'Pronto';
        }

        const messierState = this.games?.getCurrentMessierGameState?.() || { active: false };
        this.setContextControlLock(isPlaying, !!messierState.active);
    }

    setContextControlLock(primaryPlaying = false, messierPlaying = false) {
        const lockExplore = !!primaryPlaying || !!messierPlaying;
        document.querySelectorAll('[data-lock-group="explore-controls"]').forEach((el) => {
            el.classList.toggle('sftw-card-disabled', lockExplore);
        });

        if (this.elements.toggleGrid) this.elements.toggleGrid.disabled = lockExplore;
        if (this.elements.toggleBoundaries) this.elements.toggleBoundaries.disabled = lockExplore;
        if (this.elements.toggleLabels) this.elements.toggleLabels.disabled = lockExplore;
        if (this.elements.toggleStars) this.elements.toggleStars.disabled = lockExplore;
        if (this.elements.searchInput) this.elements.searchInput.disabled = lockExplore;
        if (this.elements.searchButton) this.elements.searchButton.disabled = lockExplore;
    }

    updateGameStats(gameState = null) {
        const state = gameState || this.sftw?.gameState || {};
        const discovered = state.discovered && typeof state.discovered.size === 'number' ? state.discovered.size : (state.discoveredCount ?? 0);
        const total = state.totalConstellations || this.sftw?.constellations?.length || 88;
        const score = state.score ?? 0;
        const elapsed = state.elapsedTime ?? state.time ?? 0;

        if (this.elements.gameScore) this.elements.gameScore.textContent = String(score);
        if (this.elements.gameDiscovered) this.elements.gameDiscovered.textContent = `${discovered}/${total}`;

        const mm = Math.floor(Number(elapsed || 0) / 60);
        const ss = Number(elapsed || 0) % 60;
        if (this.elements.gameTimer) this.elements.gameTimer.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

        const pct = total > 0 ? (discovered / total) * 100 : 0;
        if (this.elements.gameProgress) this.elements.gameProgress.style.width = `${pct}%`;
        const label = document.getElementById('game-progress-label');
        if (label) label.textContent = `${pct.toFixed(0)}%`;

        this.updateProgressCount();
    }

    showGameCompleteMessage(result = {}) {
        const time = Number(result.time ?? result.elapsedTime ?? 0);
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        const score = result.score ?? 0;
        const constellations = result.constellations ?? result.discoveredCount ?? 0;
        const totalConstellations = result.totalConstellations ?? this.sftw?.constellations?.length ?? 88;

        this.showMessage(`🏁 Jogo concluído — ${score} pts • ${timeFormatted} • ${constellations}/${totalConstellations}`, 'success', 3200, {
            replaceKey: 'game-complete',
            replaceActive: true
        });
    }

    ensureProgressTrackerUI() {
        const list = document.getElementById('sftw-progress-list');
        if (!list) return false;
        if (list.children.length > 0) {
            this.updateProgressCount();
            return true;
        }

        const constellations = (this.sftw?.constellations || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
        list.innerHTML = constellations.map((c) => `
            <label class="sftw-progress-item" data-abbr="${String(c.abbreviation || '').toUpperCase()}">
                <input type="checkbox" disabled>
                <span>${c.abbreviation}</span>
                <span>${c.name || c.abbreviation}</span>
            </label>
        `).join('');

        this.elements.progressList = list;
        this.updateProgressCount();
        return true;
    }

    setupProgressTrackerEvents() {
        const toggleBtn = document.getElementById('sftw-toggle-checklist');
        const section = document.getElementById('sftw-progress-section');
        if (toggleBtn && !toggleBtn.dataset.bound) {
            toggleBtn.addEventListener('click', () => {
                if (!section) return;
                const hidden = section.classList.toggle('sftw-collapsed');
                const span = toggleBtn.querySelector('span');
                if (span) span.textContent = hidden ? 'Mostrar' : 'Ocultar';
            });
            toggleBtn.dataset.bound = '1';
        }

        const optShowProgress = this.elements.optShowProgress;
        if (optShowProgress && !optShowProgress.dataset.bound) {
            optShowProgress.addEventListener('change', () => this.setProgressPanelVisible(!!optShowProgress.checked));
            optShowProgress.dataset.bound = '1';
        }
    }

    setProgressPanelVisible(visible) {
        const section = document.getElementById('sftw-progress-section');
        if (section) section.style.display = visible ? '' : 'none';
    }

    resetProgressChecklist() {
        const list = document.getElementById('sftw-progress-list');
        if (!list) return;
        list.querySelectorAll('.sftw-progress-item').forEach((row) => {
            row.classList.remove('discovered');
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = false;
        });
        this.updateProgressCount();
    }

    markConstellationChecked(abbr) {
        const list = document.getElementById('sftw-progress-list');
        if (!list) return;
        const norm = (abbr || '').toString().trim().toUpperCase();
        if (!norm) return;
        const row = list.querySelector(`.sftw-progress-item[data-abbr="${norm}"]`);
        if (row) {
            row.classList.add('discovered');
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = true;
        }
        this.updateProgressCount();
    }

    updateProgressCount() {
        const countEl = document.getElementById('sftw-progress-count');
        if (!countEl) return;
        const list = document.getElementById('sftw-progress-list');
        const discoveredCount = list ? list.querySelectorAll('.sftw-progress-item.discovered').length : 0;
        const total = this.sftw?.gameState?.totalConstellations || this.sftw?.constellations?.length || 88;
        countEl.textContent = `${discoveredCount}/${total}`;
    }

    applyGameOptionsToVisualization() {
        const vis = this.sftw?.visualization;
        if (!vis) return false;

        const opts = {
            showDiscoveredFill: !!this.elements.optShowDiscoveredFill?.checked,
            showDiscoveredNames: !!this.elements.optShowDiscoveredNames?.checked,
            showProgress: !!this.elements.optShowProgress?.checked,
            game1ShowBoundaries: !!this.elements.game1ShowBoundaries?.checked,
            game1ShowLabels: !!this.elements.game1ShowLabels?.checked
        };

        if (typeof vis.setGameOptions === 'function') {
            vis.setGameOptions(opts);
        } else if (vis.gameOptions && typeof vis.gameOptions === 'object') {
            Object.assign(vis.gameOptions, opts);
            if (typeof vis.refreshGameVisuals === 'function') vis.refreshGameVisuals();
        }
        return true;
    }

    setupTabEvents() {
        const tabs = Array.from(document.querySelectorAll('.sftw-tab'));
        const panels = Array.from(document.querySelectorAll('.sftw-tabpanel'));
        if (!tabs.length || !panels.length) return;

        const activate = (name) => {
            this.activeMainTab = name;
            tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
            panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
        };

        this.activateMainTab = activate;
        tabs.forEach((t) => t.addEventListener('click', () => activate(t.dataset.tab)));
        activate(this.activeMainTab || 'explore');
    }

    update() { return true; }
    updateUI() { return this.update(); }

    showMessage(message, type = 'info', duration = 2200, options = {}) {
        const container = this.elements?.messageContainer || document.getElementById('message-container');
        if (!container) {
            console.log(`[UI ${type}]`, message);
            return null;
        }

        const replaceKey = options?.replaceKey || null;
        const replaceActive = !!options?.replaceActive;
        if (replaceKey && replaceActive) {
            const current = container.querySelector(`[data-replace-key="${replaceKey}"]`);
            if (current) current.remove();
        }

        const el = document.createElement('div');
        el.className = `sftw-msg sftw-msg-${type}`;
        if (replaceKey) el.dataset.replaceKey = replaceKey;
        el.textContent = String(message ?? '');
        container.prepend(el);

        const timeout = window.setTimeout(() => {
            el.remove();
            this._messageTimers.delete(timeout);
        }, Math.max(400, Number(duration) || 2200));
        this._messageTimers.add(timeout);
        return el;
    }

    clearAllMessages({ clearQueue = true } = {}) {
        const container = this.elements?.messageContainer || document.getElementById('message-container');
        if (container) container.innerHTML = '';
        this._messageTimers.forEach((id) => clearTimeout(id));
        this._messageTimers.clear();
        if (clearQueue) this.messageQueue = [];
    }

    addUIStyles() {
        if (document.getElementById('sftw-ui-base-styles')) return;
        const style = document.createElement('style');
        style.id = 'sftw-ui-base-styles';
        style.textContent = `
            .sftw-ui-root{display:block;color:#fff;}
            .sftw-left-panel{display:grid;gap:12px;min-height:0;}
            .sftw-brand{padding:12px 14px;border-radius:16px;background:linear-gradient(180deg,rgba(18,28,52,.78),rgba(8,14,28,.88));border:1px solid rgba(160,190,255,.16);}
            .sftw-title{display:flex;align-items:center;gap:10px;font-weight:800;}
            .sftw-badge{padding:4px 8px;border-radius:999px;background:rgba(79,195,247,.14);border:1px solid rgba(79,195,247,.22);font-size:12px;}
            .sftw-title-text{font-size:18px;line-height:1.1;}
            .sftw-subtitle{margin-top:6px;font-size:13px;color:rgba(230,240,255,.72);}
            .sftw-tabs{display:flex;flex-wrap:wrap;gap:8px;}
            .sftw-tab{border:none;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.06);color:#dbe7ff;cursor:pointer;font-weight:700;}
            .sftw-tab.active{background:linear-gradient(180deg,#4f78ff,#3558d7);color:#fff;box-shadow:0 10px 24px rgba(53,88,215,.32);}
            .sftw-tabpanel{display:none;gap:12px;}
            .sftw-tabpanel.active{display:grid;}
            .sftw-card{padding:14px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);}
            .sftw-card-disabled{opacity:.55;pointer-events:none;}
            .sftw-card-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
            .sftw-card-h-split{justify-content:space-between;}
            .sftw-card-title{font-weight:800;color:#eef4ff;}
            .sftw-row{display:flex;gap:10px;align-items:center;}
            .sftw-row-wrap{flex-wrap:wrap;}
            .sftw-input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;outline:none;}
            .sftw-btn{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-weight:700;}
            .sftw-btn-primary{background:linear-gradient(180deg,#4f78ff,#3558d7);border-color:rgba(110,140,255,.4);}
            .sftw-btn-danger{background:linear-gradient(180deg,#d44848,#a72626);border-color:rgba(255,110,110,.28);}
            .sftw-btn-wide{min-width:160px;}
            .sftw-chipgrid{display:flex;flex-wrap:wrap;gap:8px;}
            .sftw-chip{padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;}
            .sftw-chip.active{background:rgba(79,195,247,.16);border-color:rgba(79,195,247,.36);}
            .sftw-togglelist{display:grid;gap:8px;}
            .sftw-toggle{display:flex;align-items:center;gap:10px;color:#eef4ff;}
            .sftw-toggle-inline{display:inline-flex;}
            .sftw-divider{height:1px;background:rgba(255,255,255,.08);margin:12px 0;}
            .sftw-help,.muted{font-size:12px;color:rgba(230,240,255,.68);}
            .sftw-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
            .sftw-stat{padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);}
            .sftw-stat .k{font-size:12px;color:rgba(230,240,255,.64);margin-bottom:6px;}
            .sftw-stat .v{font-weight:800;color:#fff;}
            .sftw-progress-top{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:rgba(230,240,255,.72);margin-bottom:6px;}
            .sftw-progress-bar{height:10px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;}
            .sftw-progress-fill{height:100%;background:linear-gradient(90deg,#4fc3f7,#4f78ff);}
            .sftw-checklist{display:grid;gap:6px;max-height:280px;overflow:auto;}
            .sftw-progress-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);}
            .sftw-progress-item.discovered{background:rgba(79,195,247,.10);border-color:rgba(79,195,247,.22);}
            .sftw-progress-item input{pointer-events:none;}
            .sftw-message-container{display:grid;gap:8px;}
            .sftw-msg{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);font-size:13px;}
            .sftw-msg-info{background:rgba(79,195,247,.08);}
            .sftw-msg-success{background:rgba(52,211,153,.10);}
            .sftw-msg-warning{background:rgba(245,158,11,.10);}
            .sftw-msg-error{background:rgba(239,68,68,.10);}
            .sftw-linkbtn{border:none;background:transparent;color:#9ec9ff;cursor:pointer;padding:0;}
            .sftw-collapsed .sftw-checklist{display:none;}
            .sftw-result-row,.sftw-catalog-row,.sftw-detail-item{width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#fff;cursor:pointer;display:grid;gap:4px;}
            .sftw-result-kicker{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#9ec9ff;}
            .sftw-empty-state{padding:12px;border-radius:12px;background:rgba(255,255,255,.04);color:rgba(230,240,255,.66);}
            .sftw-split-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;}
            .sftw-knowledge-list{display:grid;gap:8px;}
            .sftw-knowledge-list-scroll{max-height:420px;overflow:auto;}
            .sftw-detail-card{padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);}
            .sftw-detail-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px;}
            .sftw-detail-sub{font-size:12px;color:rgba(230,240,255,.66);}
            .sftw-detail-metrics{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
            .sftw-detail-metric{padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);display:grid;gap:3px;}
            .sftw-detail-list{display:grid;gap:8px;}
            .sftw-neighbor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;}
            .sftw-neighbor-tags{display:flex;flex-wrap:wrap;gap:8px;}
            .sftw-neighbor-tag{padding:6px 8px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);font-size:12px;}
            .sftw-neighbor-tag.ok{background:rgba(34,197,94,.16);}
            .sftw-neighbor-tag.bad{background:rgba(239,68,68,.16);}
            .sftw-neighbor-tag.miss{background:rgba(245,158,11,.16);}
            @media (max-width:900px){.sftw-stats{grid-template-columns:1fr;}.sftw-split-grid{grid-template-columns:1fr;}}
        `;
        document.head.appendChild(style);
    }
}

if (typeof window !== 'undefined') {
    window.Sftw1_UI = Sftw1_UI;

    if (typeof Sftw1 !== 'undefined') {
        Sftw1.injectUIMethods = function (sftwInstance) {
            const ui = new Sftw1_UI(sftwInstance);
            sftwInstance.setupGameUI = function () { return ui.setupGameUI(); };
            sftwInstance.showMessage = function (message, type, duration, options) { return ui.showMessage(message, type, duration, options); };
            sftwInstance.updateUI = function () { return ui.update(); };
            sftwInstance.selectNameType = function (nameType) { return ui.selectNameType(nameType); };
            sftwInstance.updateAllLabels = function (nameType) {
                if (sftwInstance.visualization && typeof sftwInstance.visualization.updateAllLabels === 'function') {
                    return sftwInstance.visualization.updateAllLabels(nameType);
                }
            };
            sftwInstance.ui = ui;
            window.sftwUI = ui;
            console.log('✅ Sftw1_UI rebalanced injetado no Core');
        };
    }

    console.log('🚀 Sftw1_UI.js carregado (fachada rebalanced)');
}
