// Sftw1_UI.js - MÓDULO DE INTERFACE ATUALIZADO
// VERSÃO 2.0: INTEGRAÇÃO COMPLETA COM SISTEMA DE JOGO
// Compatível com: Sftw1_Core.js, Sftw1_Game.js, Sftw1_Visualization.js

class Sftw1_UI {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        this.uiContainer = null;
        this.gameUIState = 'idle'; // 'idle', 'selecting', 'playing', 'completed'
        // Referências DOM
        this.elements = {
            // Seções principais
            gameControls: null,
            gameInput: null,
            currentStatus: null,
            
            // Elementos do jogo
            gameStatus: null,
            gameTimer: null,
            gameScore: null,
            gameDiscovered: null,
            gameProgress: null,
            
            // Controles de visualização
            toggleGrid: null,
            toggleBoundaries: null,
            toggleLabels: null,
            toggleStars: null,
            
            // Busca e navegação
            searchInput: null,
            searchButton: null,
            
            // Tipo de nome
            nameTypeButtons: null,
            
            // Controles do jogo
            btnStartGame: null,
            btnSelectConstellation: null,
            btnShowAnswerKey: null,
            btnRestartGame: null,

        // Feedback
            messageContainer: null,

            // Diagnóstico de limites / vizinhanças (novo)
            diagToggleBtn: null,
            diagRefreshBtn: null,
            diagCopyBtn: null,
            diagFilterInput: null,
            diagStats: null,
            diagList: null,

            // Progresso (lista 88) + opções do jogo
            progressFab: null,
            progressPanel: null,
            progressList: null,
            progressCount: null,
            optShowProgress: null,
            optShowDiscoveredNames: null,
            optShowDiscoveredFill: null
        };
        
        // Estado da UI
        this.isUISetup = false;
        this.messageQueue = [];
        this.activeMessage = null;
        
        console.log('🎨 Sftw1_UI inicializado (VERSÃO 2.0 - IMPLEMENTAÇÃO 2)');
    }
    
    // ============================================
    // CONFIGURAÇÃO PRINCIPAL DA UI
    // ============================================
    
    setupGameUI() {
        console.log('🔄 Configurando interface do jogo (Implementação 2)...');
        
        // Encontrar container
        const controlsContainer = document.querySelector('.module-controls');
        if (!controlsContainer) {
            console.error('❌ Container de controles não encontrado');
            return false;
        }
        
        this.uiContainer = controlsContainer;
        
        // Remover conteúdo de loading
        const loadingEl = controlsContainer.querySelector('.loading-controls');
        if (loadingEl) loadingEl.remove();
        
        // Criar layout completo
        controlsContainer.innerHTML = this.createCompleteUILayout();
        
        // Cachear elementos
        this.cacheElements();
        
        // (Redesign) UI de diagnósticos removida do layout principal

        // ✅ Progresso do jogo: lista 88 + check
        this.ensureProgressTrackerUI();

        // Adicionar estilos
        this.addUIStyles();
        
        // Configurar eventos
        this.setupAllEvents();
        
        // Atualizar estado inicial
        this.updateGameUIState();

        // ✅ Resetar checklist / progresso
        this.resetProgressChecklist();
        
        // Conectar com o módulo Game
        this.connectWithGameModule();
        
        this.isUISetup = true;
        
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
                            <span class="sftw-title-text">Constelações</span>
                        </div>
                        <div class="sftw-subtitle">Planetário & modo jogo</div>
                    </div>

                    <div class="sftw-tabs" role="tablist" aria-label="Modo">
                        <button class="sftw-tab active" data-tab="planetarium" type="button">
                            <i class="fas fa-globe"></i><span>Planetário</span>
                        </button>
                        <button class="sftw-tab" data-tab="game" type="button">
                            <i class="fas fa-gamepad"></i><span>Jogo</span>
                        </button>
                    </div>

                    <!-- ===================== -->
                    <!-- TAB: PLANETÁRIO -->
                    <!-- ===================== -->
                    <div class="sftw-tabpanel active" data-panel="planetarium">
                        <div class="sftw-card">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-magnifying-glass"></i> Buscar constelação</div>
                            </div>
                            <div class="sftw-row">
                                <input id="constellation-search-input" class="sftw-input" type="text" placeholder="Ex.: Ori, Orion, Órion..." autocomplete="off">
                                <button id="btn-search-constellation" class="sftw-btn sftw-btn-primary" type="button">
                                    <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                            <div class="sftw-help">Dica: você pode digitar <strong>Nome (Abbr)</strong>. O foco usa o mesmo vetor do label.</div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-font"></i> Tipo de nome</div>
                            </div>
                            <div class="sftw-chipgrid" role="group" aria-label="Tipo de nome">
                                <button class="name-type-btn sftw-chip ${currentNameType === 'bayer' ? 'active' : ''}" data-type="bayer" type="button">Bayer</button>
                                <button class="name-type-btn sftw-chip ${currentNameType === 'pt' ? 'active' : ''}" data-type="pt" type="button">PT</button>
                                <button class="name-type-btn sftw-chip ${currentNameType === 'latin' ? 'active' : ''}" data-type="latin" type="button">Latim</button>
                            </div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-sliders"></i> Visualização</div>
                            </div>

                            <div class="sftw-togglelist">
                                <label class="sftw-toggle">
                                    <input id="toggle-grid" type="checkbox" checked>
                                    <span>Grade</span>
                                </label>
                                <label class="sftw-toggle">
                                    <input id="toggle-boundaries" type="checkbox" checked>
                                    <span>Limites</span>
                                </label>
                                <label class="sftw-toggle">
                                    <input id="toggle-labels" type="checkbox" checked>
                                    <span>Nomes</span>
                                </label>
                                <label class="sftw-toggle">
                                    <input id="toggle-stars" type="checkbox" checked>
                                    <span>Estrelas</span>
                                </label>
                            
                                <label class="sftw-toggle">
                                    <input id="toggle-messier" type="checkbox" ${currentShowMessier ? 'checked' : ''}>
                                    <span>Messier</span>
                                </label>
</div>

                            <div class="sftw-divider"></div>
                            <div class="sftw-card" id="messier-game-card">
                                <div class="sftw-card-h">
                                    <div class="sftw-card-title"><i class="fas fa-star"></i> Jogo do Messier</div>
                                </div>

                                <div class="sftw-row" style="gap:8px; flex-wrap:wrap;">
                                    <button id="btn-messier-start" class="sftw-btn sftw-btn-primary" type="button">
                                        <i class="fas fa-play"></i> Iniciar
                                    </button>
                                    <button id="btn-messier-stop" class="sftw-btn" type="button" disabled>
                                        <i class="fas fa-stop"></i> Parar
                                    </button>
                                    <button id="btn-messier-next" class="sftw-btn" type="button" disabled title="Modo manual">
                                        <i class="fas fa-forward"></i> Próximo
                                    </button>
                                </div>

                                <div class="sftw-row" style="align-items:center; gap:10px;">
                                    <div style="min-width:120px; opacity:.9;">Tolerância:</div>
                                    <input id="messier-tol" type="range" min="0.3" max="8" step="0.1" value="2.0" style="flex:1;">
                                    <div id="messier-tol-val" style="min-width:60px; text-align:right;">2.0°</div>
                                </div>

                                <div class="sftw-row" style="flex-direction:column; gap:8px; margin-top:6px;">
                                    <label class="sftw-toggle" style="justify-content:space-between;">
                                        <span>Mostrar dica de quanto errou (°)</span>
                                        <input id="messier-opt-show-hint" type="checkbox" checked>
                                    </label>

                                    <label class="sftw-toggle" style="justify-content:space-between;">
                                        <span>Jogo escolhe o próximo automaticamente</span>
                                        <input id="messier-opt-auto-advance" type="checkbox" checked>
                                    </label>

                                    <label class="sftw-toggle" style="justify-content:space-between;">
                                        <span>Ocultar não descobertos durante o jogo</span>
                                        <input id="messier-opt-hide-undiscovered" type="checkbox" checked>
                                    </label>

                                    <label class="sftw-toggle" style="justify-content:space-between;">
                                        <span>Ordem aleatória</span>
                                        <input id="messier-opt-random" type="checkbox">
                                    </label>
                                </div>

                                <div class="sftw-divider" style="margin:10px 0;"></div>

                                <div class="sftw-row" style="justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                                    <div><strong>Alvo:</strong> <span id="messier-target">—</span></div>
                                    <div><strong>Progresso:</strong> <span id="messier-progress">0/110</span></div>
                                    <div><strong>Erros:</strong> <span id="messier-total-errors">0</span></div>
                                </div>

                                <div style="width:100%; height:8px; background:rgba(255,255,255,.12); border-radius:999px; overflow:hidden; margin-top:6px;">
                                    <div id="messier-progress-bar" style="height:100%; width:0%; background:rgba(255,255,255,.55);"></div>
                                </div>

                                <div class="sftw-help" style="margin-top:8px;">
                                    Clique no céu: se estiver dentro da tolerância (graus), você acerta e o Messier aparece.
                                </div>

                                <div id="messier-list" style="max-height:190px; overflow:auto; margin-top:8px; padding-right:6px;"></div>
                            </div>



                            <div class="sftw-row">
                                <button id="btn-focus-orion" class="sftw-btn" type="button">
                                    <i class="fas fa-crosshairs"></i><span>Focar Ori</span>
                                </button>
                                <button id="btn-reset-view" class="sftw-btn" type="button">
                                    <i class="fas fa-rotate-left"></i><span>Reset</span>
                                </button>
                            </div>
                        </div>

                        <div class="sftw-card sftw-messages">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-message"></i> Mensagens</div>
                            </div>
                            <div id="message-container" class="sftw-message-container"></div>
                        </div>
                    </div>

                    <!-- ===================== -->
                    <!-- TAB: JOGO -->
                    <!-- ===================== -->
                    <div class="sftw-tabpanel" data-panel="game">
                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-gamepad"></i> Sessão</div>
                                <div class="sftw-pill" id="game-status">Pronto</div>
                            </div>

                            <div class="sftw-row">
                                <button id="btn-start-game" class="sftw-btn sftw-btn-primary sftw-btn-wide" type="button">
                                    <i class="fas fa-play"></i><span>Iniciar jogo</span>
                                </button>
                                <button id="btn-end-game" class="sftw-btn sftw-btn-danger sftw-btn-wide" type="button" style="display:none;">
                                    <i class="fas fa-stop"></i><span>Sair</span>
                                </button>
                            </div>

                            <div class="sftw-stats">
                                <div class="sftw-stat">
                                    <div class="k">Tempo</div>
                                    <div class="v" id="game-timer">00:00</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Pontos</div>
                                    <div class="v" id="game-score">0</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Progresso</div>
                                    <div class="v" id="game-discovered">0/88</div>
                                </div>
                            </div>

                            <!-- ✅ Barra de progresso (somente aqui, dentro do jogo) -->
                            <div class="sftw-progress">
                                <div class="sftw-progress-top">
                                    <span id="sftw-progress-count">0/88</span>
                                    <span id="game-progress-label" class="muted">0%</span>
                                </div>
                                <div class="sftw-progress-bar">
                                    <div id="game-progress" class="sftw-progress-fill" style="width:0%"></div>
                                </div>
                            </div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-sliders"></i> Opções do jogo</div>
                                <span class="muted">aplica ao modo jogo</span>
                            </div>

                            <div class="sftw-togglelist">
                                <label class="sftw-toggle">
                                    <input id="opt-show-progress" type="checkbox" checked>
                                    <span>Mostrar checklist 88</span>
                                </label>
                                <label class="sftw-toggle">
                                    <input id="opt-show-discovered-fill" type="checkbox" checked>
                                    <span>Fundo azul nas descobertas</span>
                                </label>
                                <label class="sftw-toggle">
                                    <input id="opt-show-discovered-names" type="checkbox" checked>
                                    <span>Mostrar nomes descobertos</span>
                                </label>
                            </div>
                        </div>

                        <div class="sftw-card" id="sftw-progress-section">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-list-check"></i> Checklist (88)</div>
                                <button class="sftw-linkbtn" id="sftw-toggle-checklist" type="button">
                                    <span>Ocultar</span>
                                </button>
                            </div>
                            <div id="sftw-progress-list" class="sftw-checklist"></div>
                        </div>

                        <div class="sftw-card sftw-messages">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-message"></i> Mensagens</div>
                            </div>
                            <div class="sftw-help">No jogo: clique numa região (boundaries) e digite a constelação vizinha.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // TABS (Planetário / Jogo)
    // ============================================
    setupTabEvents() {
        const tabs = Array.from(document.querySelectorAll('.sftw-tab'));
        const panels = Array.from(document.querySelectorAll('.sftw-tabpanel'));
        if (tabs.length === 0 || panels.length === 0) return;

        const activate = (name) => {
            for (const t of tabs) t.classList.toggle('active', t.dataset.tab === name);
            for (const p of panels) p.classList.toggle('active', p.dataset.panel === name);
        };

        for (const t of tabs) {
            t.addEventListener('click', () => activate(t.dataset.tab));
        }

        activate('planetarium');
    }




    
    cacheElements() {
        // Painel de controle do jogo
        this.elements.gameControls = document.getElementById('game-control-panel');
        this.elements.gameStatus = document.getElementById('game-status');
        this.elements.gameTimer = document.getElementById('game-timer');
        this.elements.gameScore = document.getElementById('game-score');
        this.elements.gameDiscovered = document.getElementById('game-discovered');
        this.elements.gameProgress = document.getElementById('game-progress');
        
        // Botões do jogo
        this.elements.btnStartGame = document.getElementById('btn-start-game');
                this.elements.btnShowAnswerKey = document.getElementById('btn-show-answer-key');
        this.elements.btnRestartGame = document.getElementById('btn-restart-game');
        this.elements.btnEndGame = document.getElementById('btn-end-game');
        
        // Controles de visualização
        this.elements.toggleGrid = document.getElementById('toggle-grid');
        this.elements.toggleBoundaries = document.getElementById('toggle-boundaries');
        this.elements.toggleLabels = document.getElementById('toggle-labels');
        this.elements.toggleStars = document.getElementById('toggle-stars');
        
                this.elements.toggleMessier = document.getElementById('toggle-messier');
// Busca e navegação
        this.elements.searchInput = document.getElementById('constellation-search-input');
        this.elements.searchButton = document.getElementById('btn-search-constellation');
        
        // Tipo de nome
        this.elements.nameTypeButtons = document.querySelectorAll('.name-type-btn');

        // Navegação
        this.elements.btnFocusOrion = document.getElementById('btn-focus-orion');
        this.elements.btnResetView = document.getElementById('btn-reset-view');
        
        // Informações
        this.elements.messageContainer = document.getElementById('message-container');

        // Opções do jogo
        this.elements.optShowProgress = document.getElementById('opt-show-progress');
        this.elements.optShowDiscoveredNames = document.getElementById('opt-show-discovered-names');
        this.elements.optShowDiscoveredFill = document.getElementById('opt-show-discovered-fill');
        

        // Messier Game
        this.elements.messierCard = document.getElementById('messier-game-card');
        this.elements.btnMessierStart = document.getElementById('btn-messier-start');
        this.elements.btnMessierStop = document.getElementById('btn-messier-stop');
        this.elements.btnMessierNext = document.getElementById('btn-messier-next');
        this.elements.messierTol = document.getElementById('messier-tol');
        this.elements.messierTolVal = document.getElementById('messier-tol-val');
        this.elements.messierOptShowHint = document.getElementById('messier-opt-show-hint');
        this.elements.messierOptAutoAdvance = document.getElementById('messier-opt-auto-advance');
        this.elements.messierOptHideUndiscovered = document.getElementById('messier-opt-hide-undiscovered');
        this.elements.messierOptRandom = document.getElementById('messier-opt-random');
        this.elements.messierTarget = document.getElementById('messier-target');
        this.elements.messierProgress = document.getElementById('messier-progress');
        this.elements.messierProgressBar = document.getElementById('messier-progress-bar');
        this.elements.messierList = document.getElementById('messier-list');
        this.elements.messierTotalErrors = document.getElementById('messier-total-errors');

        console.log('✅ Elementos DOM cacheados');
    }
    
    setupAllEvents() {
        console.log('🔧 Configurando eventos da UI...');

        // Tabs (Planetário / Jogo)
        this.setupTabEvents();
        
        // Botões do jogo
        this.setupGameEvents();
        
        // Controles de visualização
        this.setupVisualizationEvents();
        
        // Busca e navegação
        this.setupSearchEvents();
        
        // Tipo de nome
        this.setupNameTypeEvents();
        
        // (Redesign) dificuldade removida
        
        // Navegação
        this.setupNavigationEvents();
        

        // (Redesign) diagnósticos removidos do layout principal

        // Lista de progresso (88)
        if (typeof this.setupProgressTrackerEvents === 'function') {
            this.setupProgressTrackerEvents();
        }

        // Messier Game
        this.setupMessierGameEvents();
        this.buildMessierChecklist();
        this.updateMessierGameUI(true);

        console.log('✅ Todos os eventos configurados');
    }
    

    // ============================================
    // MESSIER GAME (UI)
    // ============================================

    _normalizeMessierId(id) {
        if (!id) return '';
        const s = String(id).trim().toUpperCase().replace(/\s+/g, '');
        // aceita "M42", "M 42"
        const m = s.match(/^M(\d{1,3})$/);
        if (m) return 'M' + String(parseInt(m[1], 10));
        return s;
    }

    _getVisualization() {
        return this.sftw?.visualization || this.sftw?.viz || null;
    }

    _getMessierGameState() {
        const viz = this._getVisualization();
        if (!viz) return null;
        if (typeof viz.getMessierGameState === 'function') {
            try { return viz.getMessierGameState(); } catch(e) {}
        }
        // fallback: objeto direto (como no STEP4)
        if (viz.messierGame) return viz.messierGame;
        return null;
    }

    setupMessierGameEvents() {
        // polling handle
        this._messierPollTimer = null;

        const viz = this._getVisualization();

        if (this.elements.btnMessierStart) {
            this.elements.btnMessierStart.addEventListener('click', () => {
                const toleranceDeg = this.elements.messierTol ? Number(this.elements.messierTol.value) : 2.0;
                const hideUndiscovered = this.elements.messierOptHideUndiscovered ? !!this.elements.messierOptHideUndiscovered.checked : true;
                const randomOrder = this.elements.messierOptRandom ? !!this.elements.messierOptRandom.checked : false;

                const showErrorHint = this.elements.messierOptShowHint ? !!this.elements.messierOptShowHint.checked : true;
                const autoAdvance = this.elements.messierOptAutoAdvance ? !!this.elements.messierOptAutoAdvance.checked : true;

                if (viz && typeof viz.startMessierGame === 'function') {
                    viz.startMessierGame({
                        mode: 'sphere',
                        toleranceDeg,
                        hideUndiscovered,
                        randomOrder,
                        showErrorHint,
                        autoAdvance
                    });
                } else {
                    console.warn('UI: visualization.startMessierGame não encontrado');
                }

                this._startMessierPolling();
                this.updateMessierGameUI(true);
            });
        }

        if (this.elements.btnMessierStop) {
            this.elements.btnMessierStop.addEventListener('click', () => {
                if (viz) {
                    if (typeof viz.stopMessierGame === 'function') viz.stopMessierGame();
                    else if (typeof viz.endMessierGame === 'function') viz.endMessierGame();
                }
                this._stopMessierPolling();
                this.updateMessierGameUI(true);
            });
        }

        if (this.elements.btnMessierNext) {
            this.elements.btnMessierNext.addEventListener('click', () => {
                // modo manual: avançar alvo (se existir método)
                if (viz && typeof viz._advanceMessierTarget === 'function') {
                    viz._advanceMessierTarget();
                } else {
                    console.warn('UI: avanço manual não disponível na visualization');
                }
                this.updateMessierGameUI(true);
            });
        }

        if (this.elements.messierTol) {
            const updateTolLabel = () => {
                const v = Number(this.elements.messierTol.value);
                if (this.elements.messierTolVal) this.elements.messierTolVal.textContent = `${v.toFixed(1)}°`;

                // se jogo ativo, aplicar no runtime (sem reiniciar)
                const st = this._getMessierGameState();
                if (st && st.active) {
                    st.toleranceDeg = v;
                    // também atualizar mensagem do alvo (opcional) — deixamos só state
                }
            };
            this.elements.messierTol.addEventListener('input', updateTolLabel);
            updateTolLabel();
        }

        if (this.elements.messierOptShowHint) {
            this.elements.messierOptShowHint.addEventListener('change', () => {
                const enabled = !!this.elements.messierOptShowHint.checked;
                if (viz && typeof viz.setMessierGameShowErrorHint === 'function') {
                    viz.setMessierGameShowErrorHint(enabled);
                } else {
                    const st = this._getMessierGameState();
                    if (st) st.showErrorHint = enabled;
                }
                this.updateMessierGameUI(true);
            });
        }

        if (this.elements.messierOptAutoAdvance) {
            this.elements.messierOptAutoAdvance.addEventListener('change', () => {
                const enabled = !!this.elements.messierOptAutoAdvance.checked;
                if (viz && typeof viz.setMessierGameAutoAdvance === 'function') {
                    viz.setMessierGameAutoAdvance(enabled);
                } else {
                    const st = this._getMessierGameState();
                    if (st) st.autoAdvance = enabled;
                }
                this.updateMessierGameUI(true);
            });
        }
    }

    _startMessierPolling() {
        if (this._messierPollTimer) return;
        this._messierPollTimer = setInterval(() => {
            this.updateMessierGameUI(false);
        }, 250);
    }

    _stopMessierPolling() {
        if (!this._messierPollTimer) return;
        clearInterval(this._messierPollTimer);
        this._messierPollTimer = null;
    }

    buildMessierChecklist() {
        if (!this.elements.messierList) return;

        // evitar duplicar
        if (this.elements.messierList.dataset.built === '1') return;
        this.elements.messierList.dataset.built = '1';

        const viz = this._getVisualization();
        const ids = [];

        // preferir a ordem do jogo (110) se existir, senão gerar M1..M110
        if (viz && viz.messierCatalog && Array.isArray(viz.messierCatalog.items)) {
            // caso raro: catálogo já estruturado
            for (const it of viz.messierCatalog.items) ids.push(this._normalizeMessierId(it.id || it.m || it.name));
        }

        if (ids.length === 0) {
            for (let i = 1; i <= 110; i++) ids.push('M' + i);
        }

        const frag = document.createDocumentFragment();

        for (const id of ids) {
            const row = document.createElement('div');
            row.className = 'messier-row';
            row.dataset.messierId = id;
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.gap = '10px';
            row.style.padding = '6px 8px';
            row.style.borderRadius = '10px';
            row.style.marginBottom = '4px';
            row.style.background = 'rgba(255,255,255,.06)';

            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '10px';

            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.disabled = true;

            const label = document.createElement('div');
            label.textContent = id;
            label.style.fontWeight = '700';

            left.appendChild(chk);
            left.appendChild(label);

            const right = document.createElement('div');
            right.style.display = 'flex';
            right.style.alignItems = 'center';
            right.style.gap = '8px';

            const err = document.createElement('span');
            err.className = 'messier-err';
            err.textContent = '';
            err.style.opacity = '0.85';
            err.style.fontVariantNumeric = 'tabular-nums';

            right.appendChild(err);

            row.appendChild(left);
            row.appendChild(right);

            frag.appendChild(row);
        }

        this.elements.messierList.appendChild(frag);
    }

    updateMessierGameUI(force) {
        const st = this._getMessierGameState();

        const active = !!(st && st.active);
        const target = st && st.targetId ? this._normalizeMessierId(st.targetId) : '—';

        // buttons
        if (this.elements.btnMessierStart) this.elements.btnMessierStart.disabled = active;
        if (this.elements.btnMessierStop) this.elements.btnMessierStop.disabled = !active;

        const autoAdvance = (st && st.autoAdvance !== undefined) ? !!st.autoAdvance : (this.elements.messierOptAutoAdvance ? !!this.elements.messierOptAutoAdvance.checked : true);
        if (this.elements.btnMessierNext) this.elements.btnMessierNext.disabled = (!active) || autoAdvance;

        // show current state in UI inputs
        if (this.elements.messierOptShowHint && st && st.showErrorHint !== undefined) this.elements.messierOptShowHint.checked = !!st.showErrorHint;
        if (this.elements.messierOptAutoAdvance && st && st.autoAdvance !== undefined) this.elements.messierOptAutoAdvance.checked = !!st.autoAdvance;

        // target/progress
        if (this.elements.messierTarget) this.elements.messierTarget.textContent = target;

        const total = st && st.order && st.order.length ? st.order.length : 110;
        const foundCount = st && st.found ? (st.found.size || 0) : 0;

        if (this.elements.messierProgress) this.elements.messierProgress.textContent = `${foundCount}/${total}`;

        if (this.elements.messierProgressBar) {
            const pct = total > 0 ? (foundCount / total) * 100 : 0;
            this.elements.messierProgressBar.style.width = `${Math.min(100, Math.max(0, pct)).toFixed(2)}%`;
        }

        // total errors
        if (this.elements.messierTotalErrors) {
            const te = (st && typeof st.totalErrors === 'number') ? st.totalErrors : 0;
            this.elements.messierTotalErrors.textContent = String(te);
        }

        // checklist mark
        if (this.elements.messierList && st && st.found) {
            // build set of normalized ids
            const foundNorm = new Set();
            st.found.forEach(x => foundNorm.add(this._normalizeMessierId(x)));

            const rows = this.elements.messierList.querySelectorAll('.messier-row');
            rows.forEach(row => {
                const id = row.dataset.messierId;
                const ok = foundNorm.has(this._normalizeMessierId(id));
                const chk = row.querySelector('input[type="checkbox"]');
                if (chk) chk.checked = ok;
                row.style.background = ok ? 'rgba(80,160,255,.25)' : 'rgba(255,255,255,.06)';
                row.style.opacity = ok ? '1.0' : '0.9';

                // erros por Messier (antes do acerto)
                const errSpan = row.querySelector('.messier-err');
                if (errSpan) {
                    let errVal = '';
                    // st.errorsById pode ser objeto simples ou Map
                    const key = this._normalizeMessierId(id);
                    if (st && st.errorsById) {
                        if (typeof st.errorsById.get === 'function') {
                            const v = st.errorsById.get(key);
                            if (typeof v === 'number' && ok) errVal = `${v}`;
                        } else {
                            const v = st.errorsById[key];
                            if (typeof v === 'number' && ok) errVal = `${v}`;
                        }
                    }
                    // se for o alvo atual e ainda não acertou, pode mostrar erros atuais (opcional)
                    if (!ok && st && st.active && this._normalizeMessierId(st.targetId) === key && typeof st.currentTargetErrors === 'number' && st.currentTargetErrors > 0) {
                        errVal = `${st.currentTargetErrors}`;
                    }
                    errSpan.textContent = errVal ? `erros: ${errVal}` : '';
                }
            });
        }

        // auto polling management if user starts/stops via other means
        if (active) this._startMessierPolling();
        else this._stopMessierPolling();
    }


    // ============================================
    // CONEXÃO COM O MÓDULO DE JOGO
    // ============================================
    
    connectWithGameModule() {
    console.log('🔗 Conectando UI com módulo Game...');

    if (this.sftw.registerCallback) {

        // Quando jogo inicia
        this.sftw.registerCallback('onGameStart', (constellationAbbr) => {
            this.onGameStarted(constellationAbbr);
        });

        // Quando constelação é descoberta (feedback apenas)
        this.sftw.registerCallback('onConstellationDiscovered', (abbreviation, attempts) => {
            this.onConstellationDiscovered(abbreviation, attempts);
        });

        // Quando jogo termina
        this.sftw.registerCallback('onGameEnd', (result) => {
            this.onGameCompleted(result);
        });

        // Quando resposta é errada
        this.sftw.registerCallback('onWrongAnswer', (abbreviation, input) => {
            this.onWrongAnswer(abbreviation, input);
        });

        // 🔴 ÚNICO lugar onde stats são atualizados
        this.sftw.registerCallback('onGameStateChange', (gameState) => {

            // Mantém referência consistente
            this.sftw.gameState = gameState;

            console.log(
                "🧪 UI onGameStateChange |",
                "descobertas:", gameState.discoveredCount,
                "/",
                gameState.totalConstellations,
                "| score:", gameState.score,
                "| elapsed:", gameState.elapsedTime
            );

            this.updateGameStats(gameState);
        });

        console.log('✅ Callbacks registrados no Core');
    }

    if (this.sftw.game) {
        console.log('✅ Conectado com instância Game existente');
    }
}

    
    // ============================================
    // EVENTOS DO JOGO
    // ============================================
    
    setupGameEvents() {
        // Iniciar jogo
        if (this.elements.btnStartGame) {
            this.elements.btnStartGame.addEventListener('click', () => {
                this.startGame();
            });
        }

        // Mostrar gabarito
        if (this.elements.btnShowAnswerKey) {
            this.elements.btnShowAnswerKey.addEventListener('click', () => {
                this.showAnswerKey();
            });
        }
        
        // Reiniciar jogo
        if (this.elements.btnRestartGame) {
            this.elements.btnRestartGame.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        // Sair do jogo
        if (this.elements.btnEndGame) {
            this.elements.btnEndGame.addEventListener('click', () => {
                this.endGame();
            });
        }
    }
    
    startGame() {
        console.log('🎮 UI: Iniciar jogo solicitado');

        // ✅ Captura opções escolhidas antes do jogo
        this.applyGameOptionsToVisualization();

        // Abrir seletor de constelação (UI controla o fluxo de seleção).
        // Quando o usuário escolher, chamamos sftw.startGame(abbr, difficulty).
        this.openConstellationSelectionModal({
            title: 'Escolha a constelação inicial',
            onSelect: (abbr) => {
                if (typeof this.sftw.startGame === 'function') {
                    this.sftw.startGame(abbr);
                } else {
                    this.showMessage('Sistema de jogo não disponível (startGame)', 'error');
                }
            }
        });
    }
    
    selectConstellation() {
        console.log('🎯 UI: Selecionar constelação solicitado');

        // Permite escolher outra constelação (ex.: para focar ou reiniciar)
        this.openConstellationSelectionModal({
            title: 'Escolha uma constelação',
            onSelect: (abbr) => {
                // Se o jogo estiver ativo, reinicia a partir da nova constelação.
                if (this.sftw.game && this.sftw.game.state && this.sftw.game.state.active) {
                    if (typeof this.sftw.restartGame === 'function') {
                        this.sftw.restartGame();
                    }
                }
                if (typeof this.sftw.focusOnConstellation === 'function') {
                    this.sftw.focusOnConstellation(abbr);
                }
                // Se o jogo não estiver ativo, apenas focamos.
            }
        });
    }
    
    showAnswerKey() {
        console.log('🔑 UI: Mostrar gabarito solicitado');
        
        if (this.sftw.game && typeof this.sftw.showAnswerKey === 'function') {
            this.sftw.showAnswerKey();
        }
    }
    
    restartGame() {
        console.log('🔄 UI: Reiniciar jogo solicitado');
        
        if (this.sftw.game && typeof this.sftw.restartGame === 'function') {
            this.sftw.restartGame();
        }
    }
    
    endGame() {
        console.log('🚪 UI: Sair do jogo solicitado');

        // Reset UI de progresso para não "vazar" sessão anterior
        this.resetProgressChecklist?.();
        this.setProgressPanelVisible?.(false);

        if (this.sftw.game && typeof this.sftw.returnToMainMenu === 'function') {
            this.sftw.returnToMainMenu();
        } else if (window.app && typeof window.app.returnToMainMenu === 'function') {
            window.app.returnToMainMenu();
        }
    }

    // ============================================
    // EVENTOS DE VISUALIZAÇÃO
    // ============================================
    
    setupVisualizationEvents() {
        // Grade celeste
        if (this.elements.toggleGrid) {
            this.elements.toggleGrid.addEventListener('change', (e) => {
                this.sftw.settings.showGrid = e.target.checked;
                if (typeof this.sftw.toggleGrid === 'function') {
                    this.sftw.toggleGrid();
                }
            });
        }
        
        // Limites
        if (this.elements.toggleBoundaries) {
            this.elements.toggleBoundaries.addEventListener('change', (e) => {
                this.sftw.settings.showBoundaries = e.target.checked;
                if (typeof this.sftw.toggleBoundaries === 'function') {
                    this.sftw.toggleBoundaries();
                }
            });
        }
        
        // Labels
        if (this.elements.toggleLabels) {
            this.elements.toggleLabels.addEventListener('change', (e) => {
                this.sftw.settings.showLabels = e.target.checked;
                if (typeof this.sftw.toggleLabels === 'function') {
                    this.sftw.toggleLabels();
                }
            });
        }
        
        // Estrelas
        if (this.elements.toggleStars) {
            this.elements.toggleStars.addEventListener('change', (e) => {
                this.sftw.settings.showStars = e.target.checked;
                if (typeof this.sftw.toggleStars === 'function') {
                    this.sftw.toggleStars();
                }
            });
        }
   

        // Messier (objetos M)
        if (this.elements.toggleMessier) {
            this.elements.toggleMessier.addEventListener('change', (e) => {
                this.sftw.settings.showMessier = e.target.checked;

                // Preferir API dedicada (se existir)
                if (typeof this.sftw.toggleMessier === 'function') {
                    this.sftw.toggleMessier();
                } else if (this.sftw.visualization) {
                    if (typeof this.sftw.visualization.setMessierVisible === 'function') {
                        this.sftw.visualization.setMessierVisible(!!this.sftw.settings.showMessier);
                    } else if (typeof this.sftw.visualization.toggleMessierMarkers === 'function') {
                        this.sftw.visualization.toggleMessierMarkers(!!this.sftw.settings.showMessier);
                    } else if (typeof this.sftw.visualization.showMessierMarkers === 'function') {
                        this.sftw.visualization.showMessierMarkers(!!this.sftw.settings.showMessier);
                    }
                }
            });
        }

    }
    // ============================================
    // SELETOR DE CONSTELAÇÃO (MODAL)
    // ============================================
    openConstellationSelectionModal({ title = 'Escolha uma constelação', onSelect } = {}) {
        try {
            if (!this.sftw || !Array.isArray(this.sftw.constellations) || this.sftw.constellations.length === 0) {
                this.showMessage('Constelações ainda não carregadas.', 'error');
                return;
            }

            // Reutiliza se já existir
            let overlay = document.getElementById('sftw1-constellation-modal-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sftw1-constellation-modal-overlay';
                overlay.style.position = 'fixed';
                overlay.style.inset = '0';
                overlay.style.background = 'rgba(0,0,0,0.65)';
                overlay.style.zIndex = '99999';
                overlay.style.display = 'flex';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.style.padding = '16px';

                overlay.innerHTML = `
                    <div id="sftw1-constellation-modal" style="
                        width: min(720px, 96vw);
                        max-height: min(720px, 86vh);
                        background: rgba(14, 18, 28, 0.95);
                        border: 1px solid rgba(255,255,255,0.12);
                        border-radius: 14px;
                        box-shadow: 0 12px 30px rgba(0,0,0,0.45);
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    ">
                        <div style="
                            padding: 14px 16px;
                            border-bottom: 1px solid rgba(255,255,255,0.10);
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            gap:12px;
                        ">
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <div id="sftw1-modal-title" style="font-weight:700; color:#fff; font-family: Orbitron, sans-serif;">Escolha</div>
                                <div style="font-size:12px; opacity:0.8; color:#cfd8dc; font-family: Roboto, sans-serif;">
                                    Digite para filtrar. Clique em uma constelação para selecionar.
                                </div>
                            </div>
                            <button id="sftw1-modal-close" style="
                                border: 0;
                                background: rgba(255,255,255,0.08);
                                color: #fff;
                                padding: 8px 10px;
                                border-radius: 10px;
                                cursor: pointer;
                            " title="Fechar">✕</button>
                        </div>

                        <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                            <input id="sftw1-modal-filter" type="text" placeholder="Ex: Ori, Órion, Orion..."
                                   style="
                                        width: 100%;
                                        padding: 10px 12px;
                                        border-radius: 10px;
                                        border: 1px solid rgba(255,255,255,0.14);
                                        outline: none;
                                        background: rgba(0,0,0,0.25);
                                        color: #fff;
                                   ">
                        </div>

                        <div id="sftw1-modal-list" style="
                            padding: 10px 10px 14px 10px;
                            overflow: auto;
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                            gap: 10px;
                        "></div>
                    </div>
                `;
                document.body.appendChild(overlay);

                // Fechar no overlay click (fora do modal)
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) this.closeConstellationSelectionModal();
                });

                // Botão fechar
                overlay.querySelector('#sftw1-modal-close').addEventListener('click', () => {
                    this.closeConstellationSelectionModal();
                });
            }

            // Atualiza título e callback
            const titleEl = overlay.querySelector('#sftw1-modal-title');
            if (titleEl) titleEl.textContent = title || 'Escolha uma constelação';

            // Prepara lista
            const listEl = overlay.querySelector('#sftw1-modal-list');
            const filterEl = overlay.querySelector('#sftw1-modal-filter');
            if (!listEl || !filterEl) return;

            const normalize = (s) => (s || '')
                .toString()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();

            const getName = (abbr) => {
                if (typeof this.sftw.getConstellationFullName === 'function') return this.sftw.getConstellationFullName(abbr);
                return abbr;
            };

            const build = (query) => {
                const q = normalize(query);
                listEl.innerHTML = '';

                const items = this.sftw.constellations
                    .map(c => c && c.abbreviation ? c.abbreviation : null)
                    .filter(Boolean)
                    .sort((a,b) => a.localeCompare(b));

                const filtered = items.filter(abbr => {
                    const name = getName(abbr);
                    return normalize(abbr).includes(q) || normalize(name).includes(q);
                });

                for (const abbr of filtered) {
                    const name = getName(abbr);
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.style.border = '1px solid rgba(255,255,255,0.12)';
                    btn.style.background = 'rgba(255,255,255,0.06)';
                    btn.style.borderRadius = '12px';
                    btn.style.padding = '10px 12px';
                    btn.style.cursor = 'pointer';
                    btn.style.color = '#fff';
                    btn.style.textAlign = 'left';
                    btn.style.display = 'flex';
                    btn.style.flexDirection = 'column';
                    btn.style.gap = '4px';

                    btn.innerHTML = `
                        <div style="font-family: Orbitron, sans-serif; font-weight:700; letter-spacing:0.5px;">${abbr}</div>
                        <div style="font-family: Roboto, sans-serif; font-size: 13px; opacity:0.85;">${name}</div>
                    `;

                    btn.addEventListener('click', () => {
                        this.closeConstellationSelectionModal();
                        if (typeof onSelect === 'function') onSelect(abbr);
                    });

                    listEl.appendChild(btn);
                }

                if (filtered.length === 0) {
                    const empty = document.createElement('div');
                    empty.style.color = '#cfd8dc';
                    empty.style.opacity = '0.85';
                    empty.style.padding = '10px 6px';
                    empty.textContent = 'Nenhuma constelação encontrada.';
                    listEl.appendChild(empty);
                }
            };

            // listeners
            filterEl.oninput = () => build(filterEl.value);

            // abrir
            overlay.style.display = 'flex';
            filterEl.value = '';
            build('');
            setTimeout(() => filterEl.focus(), 0);
        } catch (err) {
            console.error('❌ Falha ao abrir modal de seleção:', err);
            this.showMessage('Falha ao abrir seletor de constelação. Veja o console.', 'error');
        }
    }

    closeConstellationSelectionModal() {
        const overlay = document.getElementById('sftw1-constellation-modal-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // ============================================
    // EVENTOS DE BUSCA E NAVEGAÇÃO
    // ============================================
    
    setupSearchEvents() {
        // Buscar constelação
        if (this.elements.searchInput && this.elements.searchButton) {
            this.elements.searchButton.addEventListener('click', () => {
                this.searchConstellation();
            });
            
            this.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchConstellation();
                }
            });
        }
        
        // Constelações rápidas
        setTimeout(() => {
            document.querySelectorAll('.quick-const-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const abbr = e.currentTarget.dataset.abbr;
                    this.focusOnConstellation(abbr);
                });
            });
        }, 100);
    }
    
    searchConstellation() {
        if (!this.elements.searchInput || !this.elements.searchInput.value.trim()) {
            this.showMessage('Digite o nome de uma constelação', 'warning');
            return;
        }

        const raw = this.elements.searchInput.value.trim();

        // ✅ O painel escreve "Nome (Abbr)" no input após um foco.
        // Então, quando o usuário clica novamente, precisamos extrair a abreviação
        // entre parênteses para não quebrar a busca.
        let searchTerm = raw.toLowerCase();
        const parenMatch = raw.match(/\(([^)]+)\)\s*$/);
        if (parenMatch && parenMatch[1]) {
            searchTerm = parenMatch[1].trim().toLowerCase();
        }

        // Aceita "ori", "ORI", "ori." etc.
        searchTerm = searchTerm.replace(/[^a-z]/g, '');
        let foundConstellation = null;
        
        if (!this.sftw.constellations) {
            this.showMessage('Dados não carregados', 'error');
            return;
        }
        
        // Buscar por abreviação
        foundConstellation = this.sftw.constellations.find(c => 
            c.abbreviation.toLowerCase() === searchTerm
        );
        
        // Buscar por nome (usar o texto original, não o termo sanitizado)
        if (!foundConstellation) {
            const nameTerm = raw.toLowerCase();
            foundConstellation = this.sftw.constellations.find(c => 
                (c.name || '').toLowerCase().includes(nameTerm)
            );
        }
        
        if (foundConstellation) {
            this.focusOnConstellation(foundConstellation.abbreviation);

            // Mantém display bonito, mas agora a busca entende o formato.
            this.elements.searchInput.value = `${foundConstellation.name} (${foundConstellation.abbreviation})`;
        } else {
            this.showMessage(`Constelação não encontrada: "${raw}"`, 'error');
        }
    }
    
    focusOnConstellation(abbreviation) {
        if (!abbreviation) return;
        
        const constellation = this.sftw.constellations?.find(c => c.abbreviation === abbreviation);
        if (!constellation) {
            this.showMessage(`Constelação ${abbreviation} não encontrada`, 'error');
            return;
        }
        
        if (typeof this.sftw.focusOnConstellation === 'function') {
            this.sftw.focusOnConstellation(abbreviation);
        }
        
        this.updateCurrentConstellation(abbreviation);
        this.showMessage(`Focado em ${constellation.name}`, 'success');
    }
    
    // ============================================
    // EVENTOS DE TIPO DE NOME
    // ============================================
    
    setupNameTypeEvents() {
        if (this.elements.nameTypeButtons) {
            this.elements.nameTypeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const nameType = e.currentTarget.dataset.type;
                    this.selectNameType(nameType);
                });
            });
        }
    }
    
    selectNameType(nameType) {
        console.log(`🏷️ Selecionando tipo de nome: ${nameType}`);
        
        // Atualizar botões
        this.elements.nameTypeButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === nameType);
        });
        
        // Atualizar configuração
        this.sftw.settings.nameType = nameType;
        
        // Atualizar labels na visualização
        if (this.sftw.visualization && typeof this.sftw.visualization.updateAllLabels === 'function') {
            this.sftw.visualization.updateAllLabels(nameType);
        }
        
        this.showMessage(`Nomes mostrados como: ${this.getNameTypeLabel(nameType)}`, 'info');
    }
    
    getNameTypeLabel(nameType) {
        switch(nameType) {
            case 'bayer': return 'Bayer (abreviação)';
            case 'full': return 'Nome completo';
            case 'both': return 'Ambos';
            default: return 'Bayer';
        }
    }
    
    // ============================================
    // EVENTOS DE DIFICULDADE
    // ============================================
    
    setupDifficultyEvents() {
        if (this.elements.difficultySelector) {
            const buttons = this.elements.difficultySelector.querySelectorAll('.difficulty-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const difficulty = e.currentTarget.dataset.difficulty;
                    this.selectDifficulty(difficulty);
                });
            });
        }
    }
    
    selectDifficulty(difficulty) {
        console.log(`🎯 Selecionando dificuldade: ${difficulty}`);
        
        if (!this.sftw.difficultySettings || !this.sftw.difficultySettings[difficulty]) {
            return;
        }
        
        // Atualizar botões
        const buttons = this.elements.difficultySelector?.querySelectorAll('.difficulty-btn');
        buttons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });
        
        // Aplicar dificuldade
        const settings = this.sftw.setDifficulty(difficulty);
        this.currentDifficulty = difficulty;
        
        // Aplicar imediatamente se jogo estiver ativo
        if (this.gameUIState === 'playing') {
            this.applyGameModeSettings();
        }
        
        this.showMessage(` ${settings.name}`, 'info');
    }
    
    applyGameModeSettings() {
        const difficulty = this.sftw.difficultySettings[this.currentDifficulty];
        if (!difficulty) return;
        
        // Aplicar configurações visuais
        if (difficulty.gameMode) {
            this.sftw.settings.showGrid = !difficulty.gameMode.hideGrid;
            this.sftw.settings.showStars = !difficulty.gameMode.hideStars;
            this.sftw.settings.showBoundaries = !difficulty.gameMode.hideBoundaries;
            
            // Atualizar controles
            if (this.elements.toggleGrid) this.elements.toggleGrid.checked = this.sftw.settings.showGrid;
            if (this.elements.toggleStars) this.elements.toggleStars.checked = this.sftw.settings.showStars;
            if (this.elements.toggleBoundaries) this.elements.toggleBoundaries.checked = this.sftw.settings.showBoundaries;
            
            // Aplicar mudanças
            if (typeof this.sftw.toggleGrid === 'function') this.sftw.toggleGrid();
            if (typeof this.sftw.toggleStars === 'function') this.sftw.toggleStars();
            if (typeof this.sftw.toggleBoundaries === 'function') this.sftw.toggleBoundaries();
        }
    }
    

    // ============================================
    // DIAGNÓSTICO DE LIMITES / VIZINHANÇAS (NOVO)
    // ============================================

    // ============================================
    // LISTA FLUTUANTE DE LIMITES (OPÇÃO À DIREITA)
    // Objetivo: validar rapidamente o banco de vizinhanças (88 constelações)
    // ============================================

    ensureLimitsListUI() {
        // Botão lateral (direita) + overlay/modal
        // Não depende do jogo: serve apenas para diagnóstico do DataLoader.

        // 1) Estilos específicos (não misturar com o CSS gigante)
        if (!document.getElementById('sftw-limits-overlay-styles')) {
            const st = document.createElement('style');
            st.id = 'sftw-limits-overlay-styles';
            st.textContent = `
                .sftw-limits-fab{
                    position: fixed;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 9999;
                    padding: 10px 12px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.18);
                    background: rgba(20,20,24,0.92);
                    color: #fff;
                    cursor: pointer;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.35);
                    user-select: none;
                }
                .sftw-limits-fab:hover{ filter: brightness(1.08); }
                .sftw-limits-fab .mini{ font-weight: 700; opacity: .9; }

                .sftw-limits-overlay{
                    position: fixed;
                    inset: 0;
                    z-index: 10000;
                    background: rgba(0,0,0,0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                }
                .sftw-limits-overlay.hidden{ display:none; }

                .sftw-limits-panel{
                    width: min(980px, 96vw);
                    height: min(78vh, 760px);
                    background: rgba(18,18,22,0.96);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 14px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .sftw-limits-header{
                    display:flex;
                    align-items:center;
                    justify-content: space-between;
                    padding: 12px 14px;
                    border-bottom: 1px solid rgba(255,255,255,0.12);
                    gap: 10px;
                }
                .sftw-limits-title{
                    display:flex;
                    align-items:center;
                    gap: 10px;
                    font-weight: 800;
                    color: #fff;
                    letter-spacing: .2px;
                }
                .sftw-limits-actions{
                    display:flex;
                    align-items:center;
                    gap: 8px;
                }
                .sftw-limits-btn{
                    padding: 8px 10px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.14);
                    background: rgba(255,255,255,0.06);
                    color: #fff;
                    cursor: pointer;
                    font-weight: 700;
                }
                .sftw-limits-btn:hover{ filter: brightness(1.08); }
                .sftw-limits-btn.danger{ background: rgba(255,80,80,0.12); border-color: rgba(255,80,80,0.25); }

                .sftw-limits-body{
                    display:flex;
                    gap: 12px;
                    padding: 12px;
                    height: 100%;
                    min-height: 0;
                }

                .sftw-limits-left{
                    flex: 0 0 320px;
                    display:flex;
                    flex-direction: column;
                    gap: 10px;
                    min-height: 0;
                }

                .sftw-limits-stats{
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 12px;
                    padding: 10px;
                    background: rgba(255,255,255,0.04);
                    color: rgba(255,255,255,0.92);
                    font-size: 13px;
                    line-height: 1.4;
                }
                .sftw-limits-stats b{ color:#fff; }

                .sftw-limits-filter{
                    width: 100%;
                    padding: 10px 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.14);
                    background: rgba(255,255,255,0.06);
                    color: #fff;
                    outline: none;
                }
                .sftw-limits-filter::placeholder{ color: rgba(255,255,255,0.45); }

                .sftw-limits-help{
                    font-size: 12px;
                    color: rgba(255,255,255,0.7);
                    padding: 0 2px;
                }

                .sftw-limits-list{
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 12px;
                    overflow: auto;
                    background: rgba(255,255,255,0.03);
                    min-height: 0;
                }
                .sftw-limits-row{
                    padding: 10px 10px;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    cursor: pointer;
                }
                .sftw-limits-row:hover{ background: rgba(255,255,255,0.06); }
                .sftw-limits-row.active{ outline: 2px solid rgba(79,195,247,0.55); background: rgba(79,195,247,0.10); }
                .sftw-limits-row.bad{ background: rgba(255,90,90,0.10); }
                .sftw-limits-row-top{
                    display:flex;
                    align-items:center;
                    justify-content: space-between;
                    gap: 10px;
                }
                .sftw-limits-row-title{
                    display:flex;
                    align-items: baseline;
                    gap: 8px;
                    color:#fff;
                    font-weight: 750;
                }
                .sftw-limits-row-title .abbr{
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                    padding: 2px 6px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.10);
                }
                .sftw-limits-row-title .name{
                    color: rgba(255,255,255,0.88);
                    font-weight: 650;
                }
                .sftw-limits-row-count{
                    font-weight: 900;
                    color: #fff;
                    min-width: 24px;
                    text-align: right;
                    padding: 2px 6px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.06);
                }
                .sftw-limits-row-neigh{
                    margin-top: 6px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.75);
                    line-height: 1.35;
                }

                .sftw-limits-right{
                    flex: 1 1 auto;
                    display:flex;
                    flex-direction: column;
                    min-height: 0;
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 12px;
                    background: rgba(255,255,255,0.03);
                    overflow: hidden;
                }

                .sftw-limits-details{
                    padding: 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.9);
                }
                .sftw-limits-details h4{
                    margin: 0 0 6px 0;
                    font-size: 14px;
                    color: #fff;
                }
                .sftw-limits-details .sub{
                    font-size: 12px;
                    color: rgba(255,255,255,0.72);
                }
                .sftw-limits-details .chips{
                    display:flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 10px;
                }
                .sftw-limits-chip{
                    padding: 6px 8px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.14);
                    background: rgba(255,255,255,0.06);
                    cursor: pointer;
                    color: rgba(255,255,255,0.92);
                    font-size: 12px;
                    font-weight: 750;
                }
                .sftw-limits-chip:hover{ filter: brightness(1.08); }
            `;
            document.head.appendChild(st);
        }

        // 2) Botão lateral
        if (!document.getElementById('sftw-limits-open')) {
            const btn = document.createElement('button');
            btn.id = 'sftw-limits-open';
            btn.className = 'sftw-limits-fab';
            btn.type = 'button';
            btn.innerHTML = `<span class="mini">🧭</span> Limites`;
            document.body.appendChild(btn);
        }

        // 3) Overlay
        if (!document.getElementById('sftw-limits-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'sftw-limits-overlay';
            overlay.className = 'sftw-limits-overlay hidden';
            overlay.innerHTML = `
                <div class="sftw-limits-panel" role="dialog" aria-modal="true">
                    <div class="sftw-limits-header">
                        <div class="sftw-limits-title">
                            <span>🔗 Lista de Limites (Vizinhanças)</span>
                        </div>
                        <div class="sftw-limits-actions">
                            <button id="sftw-limits-refresh" class="sftw-limits-btn" type="button" title="Atualizar lista e estatísticas">Atualizar</button>
                            <button id="sftw-limits-copy" class="sftw-limits-btn" type="button" title="Copiar relatório em texto">Copiar</button>
                            <button id="sftw-limits-close" class="sftw-limits-btn danger" type="button" title="Fechar">Fechar</button>
                        </div>
                    </div>

                    <div class="sftw-limits-body">
                        <div class="sftw-limits-left">
                            <div id="sftw-limits-stats" class="sftw-limits-stats">Carregando...</div>
                            <input id="sftw-limits-filter" class="sftw-limits-filter" type="text"
                                placeholder="Filtrar (Ori, Hya, Centaurus, etc)...">
                            <div class="sftw-limits-help">Clique em uma constelação para ver detalhes e focar no céu.</div>
                            <div id="sftw-limits-list" class="sftw-limits-list"></div>
                        </div>

                        <div class="sftw-limits-right">
                            <div id="sftw-limits-details" class="sftw-limits-details">
                                <h4>Nenhuma selecionada</h4>
                                <div class="sub">Abra a lista à esquerda e clique em uma constelação.</div>
                            </div>
                            <div style="flex:1; padding:12px; overflow:auto; color:rgba(255,255,255,0.75); font-size:12px;">
                                <div><b>Dica:</b> se uma constelação grande (ex.: Centaurus) estiver com poucos vizinhos, quase sempre é parsing do arquivo ou edge rounding.</div>
                                <div style="margin-top:8px;">Aqui você pode clicar nos “chips” de vizinhos para navegar rapidamente e checar se o banco faz sentido.</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        // 4) Cache rápido das referências
        this.elements.limitsOpenBtn = document.getElementById('sftw-limits-open');
        this.elements.limitsOverlay = document.getElementById('sftw-limits-overlay');
        this.elements.limitsCloseBtn = document.getElementById('sftw-limits-close');
        this.elements.limitsRefreshBtn = document.getElementById('sftw-limits-refresh');
        this.elements.limitsCopyBtn = document.getElementById('sftw-limits-copy');
        this.elements.limitsFilterInput = document.getElementById('sftw-limits-filter');
        this.elements.limitsStats = document.getElementById('sftw-limits-stats');
        this.elements.limitsList = document.getElementById('sftw-limits-list');
        this.elements.limitsDetails = document.getElementById('sftw-limits-details');
    }

    setupLimitsListEvents() {
        // Se a UI ainda não existe, não faz nada.
        if (!this.elements.limitsOpenBtn || !this.elements.limitsOverlay) return;

        // Evitar múltiplos listeners
        if (this._limitsEventsBound) return;
        this._limitsEventsBound = true;

        const open = () => {
            this.elements.limitsOverlay.classList.remove('hidden');
            this.refreshLimitsListOverlay();
        };
        const close = () => {
            this.elements.limitsOverlay.classList.add('hidden');
            // limpar seleção visual
            if (this._limitsActiveRow) this._limitsActiveRow.classList.remove('active');
            this._limitsActiveRow = null;
        };

        this.elements.limitsOpenBtn.addEventListener('click', open);
        this.elements.limitsCloseBtn?.addEventListener('click', close);
        this.elements.limitsRefreshBtn?.addEventListener('click', () => this.refreshLimitsListOverlay());
        this.elements.limitsFilterInput?.addEventListener('input', () => this.refreshLimitsListOverlay());

        this.elements.limitsCopyBtn?.addEventListener('click', async () => {
            try {
                const txt = this.buildLimitsReportText();
                await navigator.clipboard.writeText(txt);
                this.showMessage('Relatório de limites copiado ✅', 'success', 1800);
            } catch (e) {
                console.warn('⚠️ copiar relatório falhou:', e);
                this.showMessage('Não foi possível copiar (permissão do navegador).', 'warning', 2200);
            }
        });

        // clicar fora do painel fecha
        this.elements.limitsOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.limitsOverlay) close();
        });

        // ESC fecha
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.limitsOverlay.classList.contains('hidden')) {
                close();
            }
        });
    }

    refreshLimitsListOverlay() {
        if (!this.elements.limitsList || !this.elements.limitsStats) return;

        const constellations = this.sftw.constellations || [];
        if (!constellations.length) {
            this.elements.limitsStats.innerHTML = '<b>Erro:</b> nenhuma constelação carregada.';
            this.elements.limitsList.innerHTML = '';
            return;
        }

        const stats = (typeof this.sftw.getDataStatistics === 'function') ? this.sftw.getDataStatistics() : null;
        const source = stats?.dataSource || this.sftw.dataLoader?.dataSource || '—';
        const avg = stats ? Number(stats.averageNeighbors || 0).toFixed(1) : '—';
        const min = stats ? stats.minNeighbors : '—';
        const max = stats ? stats.maxNeighbors : '—';
        const links = stats ? stats.totalNeighborLinks : '—';

        const low1 = constellations.filter(c => (c.neighborCount ?? c.neighbors?.length ?? 0) <= 1).length;
        const low2 = constellations.filter(c => (c.neighborCount ?? c.neighbors?.length ?? 0) <= 2).length;

        this.elements.limitsStats.innerHTML = `
            <div><b>Fonte:</b> ${source}</div>
            <div><b>Total:</b> ${constellations.length}</div>
            <div><b>Média vizinhos:</b> ${avg} <span style="opacity:.75">(min/max: ${min}/${max})</span></div>
            <div><b>Links (aprox):</b> ${links}</div>
            <div style="margin-top:6px; opacity:.9;">
                <b>Alerta:</b> ≤1 vizinho: ${low1} | ≤2 vizinhos: ${low2}
            </div>
        `;

        const filterRaw = (this.elements.limitsFilterInput?.value || '').trim();
        const norm = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const f = norm(filterRaw);

        const rows = constellations
            .map(c => {
                const abbr = c.abbreviation;
                const name = c.name || abbr;
                const neigh = (c.neighbors && c.neighbors.length)
                    ? c.neighbors.slice()
                    : (typeof this.sftw.getConstellationNeighbors === 'function'
                        ? this.sftw.getConstellationNeighbors(abbr)
                        : []);
                neigh.sort();
                const count = c.neighborCount ?? neigh.length;
                return { abbr, name, count, neigh };
            })
            .filter(r => !f || norm(r.abbr).includes(f) || norm(r.name).includes(f))
            .sort((a, b) => a.name.localeCompare(b.name));

        this.elements.limitsList.innerHTML = rows.map(r => this._renderLimitsRow(r)).join('');

        // listeners de clique
        Array.from(this.elements.limitsList.querySelectorAll('.sftw-limits-row')).forEach(el => {
            el.addEventListener('click', () => {
                const abbr = el.getAttribute('data-abbr');
                this._selectLimitsRow(el, abbr);
            });
        });
    }

    _renderLimitsRow(row) {
        const bad = row.count <= 1 ? ' bad' : '';
        const neighPretty = row.neigh.map(ab => {
            const nm = (typeof this.sftw.getConstellationName === 'function') ? this.sftw.getConstellationName(ab) : ab;
            return `${ab} (${nm})`;
        });

        return `
            <div class="sftw-limits-row${bad}" data-abbr="${row.abbr}">
                <div class="sftw-limits-row-top">
                    <div class="sftw-limits-row-title">
                        <span class="abbr">${row.abbr}</span>
                        <span class="name">${row.name}</span>
                    </div>
                    <div class="sftw-limits-row-count" title="Número de constelações limites">${row.count}</div>
                </div>
                <div class="sftw-limits-row-neigh">
                    ${neighPretty.length ? neighPretty.join(', ') : '<i>Sem vizinhos</i>'}
                </div>
            </div>
        `;
    }

    _selectLimitsRow(rowEl, abbr) {
        if (!abbr) return;

        // marcar ativo
        if (this._limitsActiveRow) this._limitsActiveRow.classList.remove('active');
        this._limitsActiveRow = rowEl;
        rowEl.classList.add('active');

        // focar no céu
        const c = this.sftw.constellations?.find(x => x.abbreviation === abbr);
        const name = c?.name || abbr;

        if (typeof this.sftw.focusOnConstellation === 'function') {
            this.sftw.focusOnConstellation(abbr);
        } else if (typeof this.focusOnConstellation === 'function') {
            // fallback: método da própria UI
            this.focusOnConstellation(abbr);
        }

        // detalhes + chips
        const neigh = (c?.neighbors && c.neighbors.length)
            ? c.neighbors.slice().sort()
            : (typeof this.sftw.getConstellationNeighbors === 'function'
                ? this.sftw.getConstellationNeighbors(abbr).slice().sort()
                : []);

        const chips = neigh.map(nab => {
            const nm = (typeof this.sftw.getConstellationName === 'function') ? this.sftw.getConstellationName(nab) : nab;
            return `<button class="sftw-limits-chip" type="button" data-abbr="${nab}" title="Focar em ${nm}">${nab} • ${nm}</button>`;
        }).join('');

        if (this.elements.limitsDetails) {
            this.elements.limitsDetails.innerHTML = `
                <h4>${abbr} — ${name}</h4>
                <div class="sub"><b>Vizinhos (limites):</b> ${neigh.length}</div>
                <div class="chips">${chips || '<span class="sub"><i>Sem vizinhos</i></span>'}</div>
            `;

            // bind chips
            Array.from(this.elements.limitsDetails.querySelectorAll('.sftw-limits-chip')).forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.getAttribute('data-abbr');
                    if (target) {
                        // também seleciona na lista, se estiver visível
                        const row = this.elements.limitsList?.querySelector(`.sftw-limits-row[data-abbr="${target}"]`);
                        if (row) this._selectLimitsRow(row, target);
                        else this._selectLimitsRow(btn, target);
                    }
                });
            });
        }

        this.showMessage(`🔍 Verificando limites: ${name} (${abbr})`, 'info', 1600);
    }

    buildLimitsReportText() {
        const constellations = this.sftw.constellations || [];
        const stats = (typeof this.sftw.getDataStatistics === 'function') ? this.sftw.getDataStatistics() : null;

        const header = [
            'LISTA DE LIMITES (VIZINHANÇAS) — Sftw1',
            `Fonte: ${stats?.dataSource || this.sftw.dataLoader?.dataSource || '—'}`,
            `Total: ${constellations.length}`,
            `Média vizinhos: ${stats ? Number(stats.averageNeighbors || 0).toFixed(1) : '—'} | Min/Max: ${stats ? `${stats.minNeighbors}/${stats.maxNeighbors}` : '—'}`,
            `Links (aprox): ${stats?.totalNeighborLinks ?? '—'}`,
            '',
            'FORMATO: ABBR | Nome | N: vizinhos...',
            ''
        ].join('\n');

        const lines = constellations
            .map(c => {
                const abbr = c.abbreviation;
                const name = c.name || abbr;
                const neigh = (c.neighbors && c.neighbors.length)
                    ? c.neighbors.slice().sort()
                    : (typeof this.sftw.getConstellationNeighbors === 'function'
                        ? this.sftw.getConstellationNeighbors(abbr).slice().sort()
                        : []);
                const count = c.neighborCount ?? neigh.length;
                return `${abbr} | ${name} | ${count}: ${neigh.join(', ')}`;
            })
            .sort((a, b) => a.localeCompare(b));

        return header + lines.join('\n');
    }



    setupDiagnosticsEvents() {
        // Botão atualizar
        if (this.elements.diagRefreshBtn) {
            this.elements.diagRefreshBtn.addEventListener('click', () => {
                this.refreshDiagnostics();
            });
        }

        // Filtro
        if (this.elements.diagFilterInput) {
            this.elements.diagFilterInput.addEventListener('input', () => {
                this.refreshDiagnostics();
            });
        }

        // Toggle expandir/recolher
        if (this.elements.diagToggleBtn) {
            this.elements.diagToggleBtn.addEventListener('click', () => {
                const list = this.elements.diagList;
                const stats = this.elements.diagStats;
                if (!list || !stats) return;

                const isHidden = list.classList.toggle('hidden');
                stats.classList.toggle('hidden', isHidden);
                this.elements.diagToggleBtn.textContent = isHidden ? 'Expandir' : 'Recolher';
            });
        }

        // Copiar relatório
        if (this.elements.diagCopyBtn) {
            this.elements.diagCopyBtn.addEventListener('click', async () => {
                try {
                    const report = this.buildDiagnosticsReportText();
                    await navigator.clipboard.writeText(report);
                    this.showMessage('Relatório copiado ✅', 'success', 1800);
                } catch (e) {
                    console.warn('⚠️ Falha ao copiar relatório:', e);
                    this.showMessage('Não foi possível copiar (permissão do navegador).', 'warning', 2200);
                }
            });
        }

        // Render inicial
        this.refreshDiagnostics();
    }

    refreshDiagnostics() {
        if (!this.elements.diagList || !this.elements.diagStats) return;

        const constellations = this.sftw.constellations || [];
        if (!constellations.length) {
            this.elements.diagStats.innerHTML = '<span class="diag-warn">Nenhuma constelação carregada.</span>';
            this.elements.diagList.innerHTML = '';
            return;
        }

        const stats = (typeof this.sftw.getDataStatistics === 'function')
            ? this.sftw.getDataStatistics()
            : null;

        const avg = stats ? Number(stats.averageNeighbors || 0).toFixed(1) : '—';
        const min = stats ? (stats.minNeighbors ?? '—') : '—';
        const max = stats ? (stats.maxNeighbors ?? '—') : '—';
        const links = stats ? (stats.totalNeighborLinks ?? '—') : '—';
        const source = stats
            ? (stats.dataSource || '—')
            : (this.sftw.dataLoader?.dataSource || '—');

        // quantas sem vizinhos
        const zeroNeighbors = constellations.filter(c => {
            const n = (c.neighborCount ?? (c.neighbors?.length || 0));
            return n === 0;
        }).length;

        this.elements.diagStats.innerHTML = `
            <div class="diag-stats-grid">
                <div><b>Fonte:</b> ${source}</div>
                <div><b>Total:</b> ${constellations.length}</div>
                <div><b>Média vizinhos:</b> ${avg}</div>
                <div><b>Min/Max:</b> ${min}/${max}</div>
                <div><b>Links:</b> ${links}</div>
                <div><b>Sem vizinhos:</b> ${zeroNeighbors}</div>
            </div>
        `;

        const filter = (this.elements.diagFilterInput?.value || '').trim();
        const norm = (s) => (s || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const f = norm(filter);

        const rows = constellations
            .map(c => {
                const neighbors = (c.neighbors && c.neighbors.length)
                    ? c.neighbors.slice()
                    : (typeof this.sftw.getConstellationNeighbors === 'function'
                        ? this.sftw.getConstellationNeighbors(c.abbreviation)
                        : []);

                return {
                    abbr: c.abbreviation,
                    name: c.name || c.abbreviation,
                    neighborCount: c.neighborCount ?? neighbors.length,
                    neighbors: neighbors.slice().sort()
                };
            })
            .filter(r => !f || norm(r.abbr).includes(f) || norm(r.name).includes(f))
            .sort((a, b) => a.name.localeCompare(b.name));

        this.elements.diagList.innerHTML = rows.map(r => this._renderDiagRow(r)).join('');
    }

    _renderDiagRow(row) {
        const neighbors = (row.neighbors || []).map(ab => {
            const nm = (typeof this.sftw.getConstellationName === 'function')
                ? this.sftw.getConstellationName(ab)
                : ab;
            return `${ab} (${nm})`;
        });

        const warnClass = row.neighborCount === 0 ? ' diag-row-warn' : '';

        return `
            <div class="diag-row${warnClass}">
                <div class="diag-row-top">
                    <div class="diag-row-title">
                        <span class="diag-abbr">${row.abbr}</span>
                        <span class="diag-name">${row.name}</span>
                    </div>
                    <div class="diag-count" title="Número de vizinhos">${row.neighborCount}</div>
                </div>
                <div class="diag-neighbors">
                    ${neighbors.length ? neighbors.join(', ') : '<i>Sem vizinhos</i>'}
                </div>
            </div>
        `;
    }

    buildDiagnosticsReportText() {
        const constellations = this.sftw.constellations || [];
        const stats = (typeof this.sftw.getDataStatistics === 'function')
            ? this.sftw.getDataStatistics()
            : null;

        const header = [
            'DIAGNÓSTICO DE LIMITES / VIZINHANÇAS (Sftw1)',
            `Fonte: ${(stats?.dataSource || this.sftw.dataLoader?.dataSource || '—')}`,
            `Total constelações: ${constellations.length}`,
            `Média vizinhos: ${stats ? Number(stats.averageNeighbors || 0).toFixed(1) : '—'}`,
            `Min/Max vizinhos: ${stats ? `${stats.minNeighbors}/${stats.maxNeighbors}` : '—'}`,
            `Links (aprox): ${stats?.totalNeighborLinks ?? '—'}`,
            ''
        ].join('\n');

        const lines = constellations
            .map(c => {
                const neigh = (c.neighbors && c.neighbors.length)
                    ? c.neighbors.slice()
                    : (typeof this.sftw.getConstellationNeighbors === 'function'
                        ? this.sftw.getConstellationNeighbors(c.abbreviation)
                        : []);
                neigh.sort();
                const count = c.neighborCount ?? neigh.length;
                return `${c.abbreviation} | ${c.name} | ${count}: ${neigh.join(', ')}`;
            })
            .sort((a, b) => a.localeCompare(b));

        return header + lines.join('\n');
    }

    // ============================================
    // EVENTOS DE NAVEGAÇÃO
    // ============================================
    
    setupNavigationEvents() {
        // Focar em Órion
        if (this.elements.btnFocusOrion) {
            this.elements.btnFocusOrion.addEventListener('click', () => {
                this.focusOnConstellation('Ori');
            });
        }
        
        // Resetar vista
        if (this.elements.btnResetView) {
            this.elements.btnResetView.addEventListener('click', () => {
                this.resetView();
            });
        }
    }
    
    resetView() {
        if (this.sftw.sceneManager && this.sftw.sceneManager.isPlanetariumMode) {
            this.sftw.sceneManager.planetariumSettings.rotation.x = 0;
            this.sftw.sceneManager.planetariumSettings.rotation.y = 0;
            this.sftw.sceneManager.camera.fov = 60;
            this.sftw.sceneManager.camera.updateProjectionMatrix();
            this.showMessage('Vista resetada', 'info');
        }
    }
    
    // ============================================
    // CALLBACKS DO JOGO (do Core/Game)
    // ============================================
    
    onGameStarted(constellationAbbr) {
        console.log(`🎮 UI: Jogo iniciado com ${constellationAbbr}`);
        
        // Atualizar estado da UI
        this.gameUIState = 'playing';
        this.updateGameUIState();

        // ✅ Resetar checklist / progresso
        this.resetProgressChecklist();
        
        // Atualizar status
        const constellation = this.sftw.constellations?.find(c => c.abbreviation === constellationAbbr);
        if (constellation) {
            this.elements.gameStatus.textContent = `Jogando (${constellation.name})`;
            this.updateCurrentConstellation(constellationAbbr);
        }
        
        // Mostrar ações do jogo ativo
        const activeActions = document.getElementById('game-actions-active');
        if (activeActions) activeActions.style.display = 'flex';
        
        // Aplicar configurações da dificuldade
        this.applyGameModeSettings();
        
        // Mostrar mensagem
        this.showMessage(`Jogo iniciado! Descubra as constelações ao redor de ${constellation?.name || constellationAbbr}`, 'success');
    }
    
    onConstellationDiscovered(abbreviation, attempts, points) {
        // compat: caso venha um objeto
        if (abbreviation && typeof abbreviation === 'object') {
            points = abbreviation.points ?? abbreviation.gained ?? abbreviation.scoreGained ?? points;
            attempts = abbreviation.attempts ?? attempts;
            abbreviation = abbreviation.abbreviation || abbreviation.abbr || abbreviation.target;
        }
        attempts = attempts || 1;
        if (points == null) {
            // fallback compatível com versões antigas
            points = Math.floor(100 / attempts);
        }

        console.log(`✅ UI: Constelação descoberta: ${abbreviation} (${attempts} tentativas, +${points} pts)`);

        // Atualizar stats/progresso imediatamente
        this.updateGameStats();

        // ✅ Atualizar checklist
        this.markConstellationChecked(abbreviation);

        // Feedback visual
        const constellation = this.sftw.constellations?.find(c => c.abbreviation === abbreviation);
        if (constellation) {
            this.showMessage(`✅ ${constellation.name} descoberta! (+${points} pontos)`, 'success');
        }
    }
    
    onGameCompleted(result) {
        console.log('🏁 UI: Jogo completo!', result);
        
        this.gameUIState = 'completed';
        this.updateGameUIState();

        // ✅ Resetar checklist / progresso
        this.resetProgressChecklist();
        
        // Atualizar status
        this.elements.gameStatus.textContent = 'Jogo Concluído!';
        
        // Mostrar estatísticas finais
        this.showGameCompleteMessage(result);
    }
    
    onWrongAnswer(abbreviation, input) {
        // compat: caso venha um objeto
        if (abbreviation && typeof abbreviation === 'object') {
            input = abbreviation.input;
            abbreviation = abbreviation.abbreviation || abbreviation.abbr || abbreviation.target;
        }
        console.log(`❌ UI: Resposta errada para ${abbreviation}: "${input}"`);
        
        this.showMessage(`"${input}" não está correto. Tente novamente!`, 'error', 2000);
    }
    
    showGameCompleteMessage(result) {
        const minutes = Math.floor(result.time / 60);
        const seconds = result.time % 60;
        const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const message = `
            <div class="game-complete-message">
                <h4><i class="fas fa-trophy"></i> Jogo Concluído!</h4>
                <div class="complete-stats">
                    <div class="stat">
                        <span class="stat-label">Pontuação:</span>
                        <span class="stat-value">${result.score.toLocaleString()}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Tempo:</span>
                        <span class="stat-value">${timeFormatted}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Descobertas:</span>
                        <span class="stat-value">${result.constellations}/${result.totalConstellations}</span>
                    </div>
                    <div class="stat">
                        
                </div>
                <div class="complete-actions">
                    <button onclick="window.sftwUI?.restartGame()" class="action-btn">
                        <i class="fas fa-redo"></i> Jogar Novamente
                    </button>
                    <button onclick="window.sftwUI?.showAnswerKey()" class="action-btn">
                        <i class="fas fa-eye"></i> Ver Gabarito
                    </button>
                </div>
            </div>
        `;
        
        this.showMessage(message, 'success', 10000);
    }
    
    // ============================================
    // ATUALIZAÇÃO DA UI
    // ============================================
    
    updateGameUIState() {
        // Atualizar botões baseado no estado
        const startBtn = this.elements.btnStartGame;
        const selectBtn = this.elements.btnSelectConstellation;
        const activeActions = document.getElementById('game-actions-active');
        
        switch(this.gameUIState) {
            case 'idle':
                if (startBtn) startBtn.disabled = false;
                if (selectBtn) selectBtn.disabled = false;
                if (activeActions) activeActions.style.display = 'none';
                break;
                
            case 'playing':
                if (startBtn) startBtn.disabled = true;
                if (selectBtn) selectBtn.disabled = true;
                if (activeActions) activeActions.style.display = 'flex';
                break;
                
            case 'completed':
                if (startBtn) startBtn.disabled = false;
                if (selectBtn) selectBtn.disabled = true;
                if (activeActions) activeActions.style.display = 'flex';
                break;
        }
    }
    updateGameStats(gameState) {
        gameState = gameState || this.sftw.gameState;
        if (!gameState) return;
        
        // Tempo
        if (this.elements.gameTimer) {
            const minutes = Math.floor(gameState.elapsedTime / 60);
            const seconds = gameState.elapsedTime % 60;
            this.elements.gameTimer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Pontuação
        if (this.elements.gameScore) {
            this.elements.gameScore.textContent = gameState.score;
        }
        
        // Descobertas
        if (this.elements.gameDiscovered) {
            this.elements.gameDiscovered.textContent = 
                `${gameState.discoveredCount}/${gameState.totalConstellations}`;
        }
        
        // Progresso
        if (this.elements.gameProgress) {
            const progress = (gameState.discoveredCount / gameState.totalConstellations) * 100;
            this.elements.gameProgress.style.width = `${progress}%`;
            
            

            // ✅ Sincronizar checklist automaticamente com o estado publicado
            this.syncProgressChecklistFromGameState(gameState);
const progressLabel = document.getElementById('game-progress-label');
            if (progressLabel) {
                progressLabel.textContent = `${Math.round(progress)}% completo`;
            }
        }
    }
    
    updateCurrentConstellation(abbreviation = null) {
        const targetAbbr = abbreviation || this.sftw.gameState?.selectedConstellation;
        const infoElement = document.getElementById('current-constellation-info');
        const hintElement = document.getElementById('constellation-hint');
        
        if (!infoElement || !hintElement) return;
        
        if (targetAbbr) {
            const constellation = this.sftw.constellations?.find(c => c.abbreviation === targetAbbr);
            if (constellation) {
                const display = infoElement.querySelector('.constellation-display');
                if (display) {
                    display.innerHTML = `
                        <span class="const-abbr">${constellation.abbreviation}</span>
                        <span class="const-name">${constellation.name}</span>
                    `;
                }
                
                if (this.gameUIState === 'playing') {
                    hintElement.textContent = `Clique nas áreas escuras ao redor para adivinhar as constelações vizinhas`;
                } else {
                    hintElement.textContent = `Constelação selecionada para foco`;
                }
            }
        } else {
            const display = infoElement.querySelector('.constellation-display');
            if (display) {
                display.innerHTML = `
                    <span class="const-abbr">---</span>
                    <span class="const-name">Nenhuma constelação selecionada</span>
                `;
            }
            hintElement.textContent = `Use a busca ou clique em "Iniciar Jogo"`;
        }
    }
    
    updateAllStats() {
        // Estatísticas do módulo
        const constCount = this.sftw.constellations?.length || 0;
        const starCount = this.sftw.stars?.length || this.sftw.starCatalog?.stars?.length || 0;
        const segmentCount = this.calculateTotalSegments();
        
        // Atualizar elementos
        const constElement = document.getElementById('stat-constellations');
        const starElement = document.getElementById('stat-stars');
        const segmentElement = document.getElementById('stat-segments');
        const perfElement = document.getElementById('stat-performance');
        
        if (constElement) constElement.textContent = constCount;
        if (starElement) starElement.textContent = starCount;
        if (segmentElement) segmentElement.textContent = segmentCount;
        
        if (perfElement) {
            const totalObjects = constCount + starCount + segmentCount;
            if (totalObjects > 1000) {
                perfElement.textContent = 'PESADO';
                perfElement.style.color = '#f44336';
            } else if (totalObjects > 500) {
                perfElement.textContent = 'MÉDIO';
                perfElement.style.color = '#ff9800';
            } else {
                perfElement.textContent = 'OK';
                perfElement.style.color = '#4caf50';
            }
        }
        
        // Atualizar estatísticas do jogo
        this.updateGameStats();
    }
    
    // ============================================
    // SISTEMA DE MENSAGENS
    // ============================================
    
    showMessage(message, type = 'info', duration = 3000) {
        console.log(`💬 ${type}: ${typeof message === 'string' ? message : 'Message object'}`);
        
        // Se já tem uma mensagem ativa, adicionar à fila
        if (this.activeMessage) {
            this.messageQueue.push({ message, type, duration });
            return;
        }
        
        this.displayMessage(message, type, duration);
    }
    
    displayMessage(message, type, duration) {
        const messageEl = document.createElement('div');
        messageEl.className = `system-message ${type}`;
        
        // Se message é HTML, usar innerHTML, senão textContent
        if (typeof message === 'string' && message.includes('<')) {
            messageEl.innerHTML = message;
        } else {
            messageEl.textContent = message;
        }
        
        // Adicionar ícone baseado no tipo
        const icon = this.getMessageIcon(type);
        messageEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${this.getMessageColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Roboto', sans-serif;
            z-index: 10000;
            animation: messageSlideIn 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        // Adicionar ícone
        messageEl.innerHTML = `${icon} ${messageEl.innerHTML}`;
        
        document.body.appendChild(messageEl);
        this.activeMessage = messageEl;
        
        // Auto-remover
        setTimeout(() => {
            this.removeMessage(messageEl);
        }, duration);
    }
    
    removeMessage(messageEl) {
        if (!messageEl || !messageEl.parentNode) return;
        
        messageEl.style.animation = 'messageSlideOut 0.3s ease';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
            this.activeMessage = null;
            
            // Mostrar próxima mensagem na fila
            if (this.messageQueue.length > 0) {
                const next = this.messageQueue.shift();
                this.displayMessage(next.message, next.type, next.duration);
            }
        }, 300);
    }
    
    getMessageIcon(type) {
        switch(type) {
            case 'success': return '<i class="fas fa-check-circle"></i>';
            case 'error': return '<i class="fas fa-exclamation-circle"></i>';
            case 'warning': return '<i class="fas fa-exclamation-triangle"></i>';
            case 'info': return '<i class="fas fa-info-circle"></i>';
            default: return '<i class="fas fa-info-circle"></i>';
        }
    }
    
    getMessageColor(type) {
        switch(type) {
            case 'success': return '#4caf50';
            case 'error': return '#f44336';
            case 'warning': return '#ff9800';
            default: return '#2196f3';
        }
    }
    
    // ============================================
    // ESTILOS DA UI
    // ============================================
    
    addUIStyles() {
        if (document.getElementById('sftw-ui-styles-v2')) return;
        
        const styles = document.createElement('style');
        styles.id = 'sftw-ui-styles-v2';
        styles.textContent = this.getUIStylesCSS();
        document.head.appendChild(styles);
        
        // Adicionar animações de mensagem
        this.addMessageStyles();
    }
    
        getUIStylesCSS() {
        return `
            /* ============================================
               SFTW1 UI — Redesign (Painel esquerdo fixo)
               ============================================ */

            /* Força o layout do módulo: controles à esquerda
               (PATCH: evita canvas com altura 0 -> tela preta)
            */
            .module-content{
                display:flex !important;
                flex-direction: row !important;
                gap: 12px !important;
                align-items: stretch !important;
                /* NÃO fixe height:100% (pode virar 0 dependendo do container pai) */
                min-height: 80vh !important;
            }
            .module-controls{
                order: -1 !important;
                width: clamp(320px, 30vw, 460px) !important;
                min-width: 300px !important;
                max-width: 520px !important;
                padding: 12px !important;
            }
            .canvas-container{
                flex: 1 1 auto !important;
                min-width: 0 !important;
                min-height: 80vh !important;
            }

            /* Em telas pequenas, vira coluna */
            @media (max-width: 900px){
                .module-content{
                    flex-direction: column !important;
                }
                .module-controls{
                    width: 100% !important;
                    max-width: none !important;
                    order: 0 !important;
                }
            }

            .sftw-ui-root{
                width: 100%;
                height: 100%;
            }

            .sftw-left-panel{
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.10);
                background: rgba(10, 14, 22, 0.78);
                backdrop-filter: blur(10px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.35);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .sftw-brand{
                padding: 14px 14px 6px 14px;
            }
            .sftw-title{
                display:flex;
                align-items:center;
                gap: 10px;
            }
            .sftw-badge{
                font-family: Orbitron, sans-serif;
                font-weight: 800;
                letter-spacing: 0.6px;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 10px;
                border: 1px solid rgba(120,180,255,0.35);
                background: rgba(40,90,160,0.20);
                color: rgba(220,240,255,0.95);
            }
            .sftw-title-text{
                font-family: Orbitron, sans-serif;
                font-weight: 800;
                letter-spacing: 0.4px;
                font-size: 16px;
                color: rgba(230,245,255,0.95);
            }
            .sftw-subtitle{
                margin-top: 4px;
                font-size: 12px;
                color: rgba(210,225,245,0.75);
            }

            .sftw-tabs{
                padding: 0 14px;
                display:flex;
                gap: 8px;
            }
            .sftw-tab{
                flex: 1 1 0;
                display:flex;
                align-items:center;
                justify-content:center;
                gap: 8px;
                padding: 10px 10px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.10);
                background: rgba(255,255,255,0.04);
                color: rgba(225,240,255,0.9);
                cursor: pointer;
                user-select: none;
                font-weight: 700;
                font-size: 13px;
            }
            .sftw-tab.active{
                background: rgba(70,130,230,0.18);
                border-color: rgba(110,170,255,0.25);
            }

            .sftw-tabpanel{
                display:none;
                padding: 0 14px 14px 14px;
                overflow: auto;
                max-height: calc(100vh - 220px);
            }
            .sftw-tabpanel.active{
                display:block;
            }

            .sftw-card{
                border-radius: 14px;
                border: 1px solid rgba(255,255,255,0.10);
                background: rgba(255,255,255,0.03);
                padding: 12px;
                margin-top: 12px;
            }
            .sftw-card-h{
                display:flex;
                align-items:center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 10px;
            }
            .sftw-card-h-split{
                justify-content: space-between;
            }
            .sftw-card-title{
                display:flex;
                align-items:center;
                gap: 10px;
                font-weight: 800;
                color: rgba(230,245,255,0.92);
                font-size: 13px;
            }
            .sftw-help{
                margin-top: 10px;
                font-size: 12px;
                color: rgba(205,220,240,0.72);
                line-height: 1.35;
            }
            .muted{ color: rgba(205,220,240,0.72); }

            .sftw-row{
                display:flex;
                gap: 10px;
                align-items: center;
            }

            .sftw-input{
                width: 100%;
                padding: 10px 12px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(0,0,0,0.25);
                color: rgba(240,250,255,0.92);
                outline: none;
            }
            .sftw-input:focus{
                border-color: rgba(120,180,255,0.45);
                box-shadow: 0 0 0 3px rgba(80,150,255,0.15);
            }

            .sftw-btn{
                display:flex;
                align-items:center;
                justify-content:center;
                gap: 10px;
                padding: 10px 12px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(255,255,255,0.05);
                color: rgba(235,248,255,0.92);
                cursor: pointer;
                user-select: none;
                font-weight: 800;
                font-size: 13px;
                white-space: nowrap;
            }
            .sftw-btn:hover{
                background: rgba(255,255,255,0.08);
            }
            .sftw-btn-primary{
                background: rgba(70,130,230,0.20);
                border-color: rgba(110,170,255,0.28);
            }
            .sftw-btn-primary:hover{
                background: rgba(70,130,230,0.26);
            }
            .sftw-btn-danger{
                background: rgba(220,60,70,0.16);
                border-color: rgba(255,120,130,0.22);
            }
            .sftw-btn-danger:hover{
                background: rgba(220,60,70,0.22);
            }
            .sftw-btn-wide{ flex: 1 1 0; }

            .sftw-chipgrid{
                display:flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            .sftw-chip{
                padding: 8px 10px;
                border-radius: 999px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(255,255,255,0.04);
                font-weight: 800;
                font-size: 12px;
                color: rgba(235,248,255,0.9);
                cursor:pointer;
            }
            .sftw-chip.active{
                background: rgba(70,130,230,0.18);
                border-color: rgba(110,170,255,0.25);
            }

            .sftw-togglelist{
                display:flex;
                flex-direction: column;
                gap: 10px;
            }
            .sftw-toggle{
                display:flex;
                align-items:center;
                gap: 10px;
                user-select: none;
                font-size: 13px;
                color: rgba(235,248,255,0.9);
            }
            .sftw-toggle input{
                width: 16px;
                height: 16px;
            }

            .sftw-divider{
                height: 1px;
                background: rgba(255,255,255,0.10);
                margin: 12px 0;
            }

            .sftw-pill{
                padding: 6px 10px;
                border-radius: 999px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(0,0,0,0.22);
                font-weight: 800;
                font-size: 12px;
                color: rgba(220,235,255,0.9);
                white-space: nowrap;
            }

            .sftw-stats{
                display:grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin-top: 12px;
            }
            .sftw-stat{
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.10);
                background: rgba(255,255,255,0.03);
                padding: 10px;
            }
            .sftw-stat .k{
                font-size: 12px;
                color: rgba(205,220,240,0.72);
                margin-bottom: 6px;
            }
            .sftw-stat .v{
                font-family: Orbitron, sans-serif;
                font-weight: 900;
                letter-spacing: 0.2px;
                color: rgba(235,248,255,0.95);
                font-size: 14px;
            }

            .sftw-progress{
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid rgba(255,255,255,0.10);
            }
            .sftw-progress-top{
                display:flex;
                align-items:center;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 12px;
                color: rgba(220,235,255,0.9);
                font-weight: 800;
            }
            .sftw-progress-bar{
                height: 10px;
                border-radius: 999px;
                overflow: hidden;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.10);
            }
            .sftw-progress-fill{
                height: 100%;
                width: 0%;
                background: rgba(90,160,255,0.55);
                border-radius: 999px;
                transition: width 250ms ease;
            }

            .sftw-checklist{
                max-height: 320px;
                overflow: auto;
                padding-right: 4px;
            }
            .sftw-progress-item{
                display:flex;
                align-items:center;
                gap: 10px;
                padding: 8px 10px;
                border-radius: 12px;
                border: 1px solid transparent;
                color: rgba(235,248,255,0.92);
                font-size: 12px;
            }
            .sftw-progress-item:hover{
                background: rgba(255,255,255,0.06);
            }
            .sftw-progress-item.discovered{
                background: rgba(40,90,160,0.20);
                border-color: rgba(110,170,255,0.22);
            }

            .sftw-linkbtn{
                border: none;
                background: transparent;
                color: rgba(190,220,255,0.9);
                cursor: pointer;
                font-weight: 800;
                font-size: 12px;
                padding: 6px 8px;
                border-radius: 10px;
            }
            .sftw-linkbtn:hover{
                background: rgba(255,255,255,0.06);
            }

            .sftw-message-container{
                display:flex;
                flex-direction: column;
                gap: 8px;
                max-height: 220px;
                overflow:auto;
            }
        `;
    }

addMessageStyles() {
        if (document.getElementById('message-animations')) return;
        
        const styles = document.createElement('style');
        styles.id = 'message-animations';
        styles.textContent = `
            @keyframes messageSlideIn {
                from { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
            }
            
            @keyframes messageSlideOut {
                from { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
                to { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // ============================================
    // UTILITÁRIOS E LIMPEZA
    // ============================================
    
    update() {
        if (!this.isUISetup) return;
        
        this.updateAllStats();
        this.updateCurrentConstellation();
        
        // Atualizar estado do jogo se estiver ativo
        if (this.gameUIState === 'playing' && this.sftw.gameState) {
            this.updateGameStats();
        }
    }
    
    cleanup() {
        // Remover estilos
        const styleIds = ['sftw-ui-styles-v2', 'message-animations'];
        styleIds.forEach(id => {
            const style = document.getElementById(id);
            if (style) style.remove();
        });
        
        // Limpar estado
        this.isUISetup = false;
        this.gameUIState = 'idle';
        this.messageQueue = [];
        this.activeMessage = null;
        
        // Remover referências
        this.elements = {};
        
        console.log('🧹 UI limpa');
    }

    // ============================================
    // PROGRESSO (LISTA DAS 88) - PAINEL À DIREITA
    // ============================================

    getGameOptions() {
        return {
            showProgress: this.elements.optShowProgress ? !!this.elements.optShowProgress.checked : true,
            showDiscoveredNames: this.elements.optShowDiscoveredNames ? !!this.elements.optShowDiscoveredNames.checked : true,
            showDiscoveredFill: this.elements.optShowDiscoveredFill ? !!this.elements.optShowDiscoveredFill.checked : true
        };
    }

    applyGameOptionsToVisualization() {
        const opts = this.getGameOptions();
        this.sftw.gameOptions = opts;

        // Se houver API dedicada no core/visualization, use.
        if (typeof this.sftw.setGameOptions === 'function') {
            this.sftw.setGameOptions(opts);
        } else if (this.sftw.visualization && typeof this.sftw.visualization.setGameOptions === 'function') {
            this.sftw.visualization.setGameOptions(opts);
        }

        // Mostrar/ocultar painel de progresso agora
        this.setProgressPanelVisible(opts.showProgress);
    }
    ensureProgressTrackerUI() {
        // ✅ Agora a lista 88 vive dentro do painel do jogo (aba "Jogo"),
        // sem FAB/flutuante no body.
        const listEl = document.getElementById('sftw-progress-list');
        const countEl = document.getElementById('sftw-progress-count');

        if (listEl) this.elements.progressList = listEl;
        if (countEl) this.elements.progressCount = countEl;

        // Construir lista (mesmo fora do jogo)
        this.buildProgressChecklist();

        // Aplicar visibilidade conforme opção
        const opts = this.getGameOptions();
        this.setProgressPanelVisible(!!opts.showProgress);
    }
    setupProgressTrackerEvents() {
        // Toggle checklist (colapsar)
        const toggleBtn = document.getElementById('sftw-toggle-checklist');
        const list = document.getElementById('sftw-progress-list');
        if (toggleBtn && list) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = list.style.display === 'none';
                list.style.display = isHidden ? '' : 'none';
                const sp = toggleBtn.querySelector('span');
                if (sp) sp.textContent = isHidden ? 'Ocultar' : 'Mostrar';
            });
        }

        // Opções do jogo -> aplicar no visualization + mostrar/ocultar checklist
        const opts = [
            this.elements.optShowProgress,
            this.elements.optShowDiscoveredNames,
            this.elements.optShowDiscoveredFill
        ].filter(Boolean);

        for (const el of opts) {
            el.addEventListener('change', () => {
                this.applyGameOptionsToVisualization();
            });
        }
    }
    setProgressPanelVisible(isVisible) {
        const section = document.getElementById('sftw-progress-section');
        if (section) section.style.display = isVisible ? '' : 'none';
    }


    buildProgressChecklist() {
        const list = document.getElementById('sftw-progress-list');
        if (!list) return;

        const consts = (this.sftw.constellations || []).slice()
            .sort((a,b) => (a.abbreviation || '').localeCompare(b.abbreviation || ''));

        list.innerHTML = '';
        for (const c of consts) {
            const abbr = c.abbreviation;
            const name = c.name || abbr;
            const row = document.createElement('label');
            row.className = 'sftw-progress-item';
            row.dataset.abbr = abbr;
            row.innerHTML = `
                <input type="checkbox" disabled>
                <span><strong>${abbr}</strong> — ${name}</span>
            `;
            list.appendChild(row);
        }

        // estado inicial
        this.resetProgressChecklist();
    }

    resetProgressChecklist() {
        const list = document.getElementById('sftw-progress-list');
        if (!list) return;

        list.querySelectorAll('.sftw-progress-item').forEach(row => {
            row.classList.remove('discovered');
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = false;
        });

        this.updateProgressCount();
    }

    /**
     * ✅ Mantém o checklist sempre sincronizado com o estado do jogo.
     * Isso torna o checklist "auto-corrigível": mesmo que algum evento pontual falhe,
     * ao receber onGameStateChange o checklist é re-renderizado/marcado conforme o Set atual.
     */
    syncProgressChecklistFromGameState(gameState) {
        const list = document.getElementById('sftw-progress-list');
        if (!list) return;

        const discoveredSet = gameState?.discoveredConstellations;
        if (!discoveredSet || typeof discoveredSet.forEach !== 'function') {
            // Se ainda não existe Set no gameState, não faz nada.
            return;
        }

        // Marca todos os itens descobertos
        discoveredSet.forEach((abbr) => {
            this.markConstellationChecked(abbr);
        });
    }


    markConstellationChecked(abbr) {
        const list = document.getElementById('sftw-progress-list');
        if (!list) return;

        // ✅ Robustez: normalizar abreviações (o DataLoader pode fornecer data-abbr em maiúsculo,
        // enquanto o jogo/callbacks podem fornecer em minúsculo, etc.)
        const norm = (abbr || '').toString().trim().toUpperCase();
        if (!norm) return;

        // 1) Tentativa direta (rápida)
        let row = list.querySelector(`.sftw-progress-item[data-abbr="${norm}"]`);

        // 2) Fallback case-insensitive: varre os itens e compara normalizado
        if (!row) {
            const items = list.querySelectorAll('.sftw-progress-item[data-abbr]');
            for (const it of items) {
                const dabbr = (it.getAttribute('data-abbr') || '').toString().trim().toUpperCase();
                if (dabbr === norm) { row = it; break; }
            }
        }

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

        const discovered = this.sftw.game?.state?.discovered;
        let discoveredCount = 0;
        if (discovered && typeof discovered.size === 'number') {
            discoveredCount = discovered.size;
        } else {
            const list = document.getElementById('sftw-progress-list');
            if (list) discoveredCount = list.querySelectorAll('.sftw-progress-item.discovered').length;
        }

        const total = this.sftw?.gameState?.totalConstellations || (this.sftw?.constellations?.length || 88);
        countEl.textContent = `${discoveredCount}/${total}`;
    }

}

// ============================================
// INJEÇÃO NO CORE E EXPORTAÇÃO
// ============================================

if (typeof window !== 'undefined') {
    window.Sftw1_UI = Sftw1_UI;
    
    // Substituir a função de injeção original
    if (typeof Sftw1 !== 'undefined') {
        const originalInject = Sftw1.injectUIMethods;
        
        Sftw1.injectUIMethods = function(sftwInstance) {
            // Criar instância da nova UI
            const ui = new Sftw1_UI(sftwInstance);
            
            // Substituir métodos delegados do Core
            sftwInstance.setupGameUI = function() {
                return ui.setupGameUI();
            };
            
            // Adicionar métodos auxiliares
            sftwInstance.showMessage = function(message, type) {
                return ui.showMessage(message, type);
            };
            
            sftwInstance.updateUI = function() {
                return ui.update();
            };
            
            // Métodos de configuração
            sftwInstance.selectNameType = function(nameType) {
                return ui.selectNameType(nameType);
            };
            
            sftwInstance.updateAllLabels = function(nameType) {
                if (sftwInstance.visualization && typeof sftwInstance.visualization.updateAllLabels === 'function') {
                    return sftwInstance.visualization.updateAllLabels(nameType);
                }
            };
            
            // Referência para acesso direto
            sftwInstance.ui = ui;
            
            // Expor para acesso global
            window.sftwUI = ui;
            
            console.log('✅ Sftw1_UI (VERSÃO 2.0 - IMPLEMENTAÇÃO 2 COMPLETA) injetado');
        };
    }
    
    console.log('🚀 Sftw1_UI.js carregado (VERSÃO 2.0 - IMPLEMENTAÇÃO 2 COMPLETA)');
}