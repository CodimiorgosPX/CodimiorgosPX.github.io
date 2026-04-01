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
            optShowDiscoveredFill: null,

            // Estrelas (inspector + filtros)
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

            // Treino de vizinhanças (jogo 2)
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
            neighborStatusPill: null
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
                            <span class="sftw-title-text">Planetário OBA</span>
                        </div>
                        <div class="sftw-subtitle">Explorar · Constelações · Messier · Estrelas</div>
                        <div style="margin-top:10px;">
                            <button id="btn-return-hub" class="sftw-btn" type="button" style="background:#b91c1c;color:#fff;border:1px solid rgba(255,255,255,.18);">
                                <i class="fas fa-house"></i><span>Voltar ao hub</span>
                            </button>
                        </div>
                    </div>

                    <div class="sftw-tabs" role="tablist" aria-label="Contexto principal">
                        <button class="sftw-tab active" data-tab="explore" type="button">
                            <i class="fas fa-globe"></i><span>Explorar</span>
                        </button>
                        <button class="sftw-tab" data-tab="constellations" type="button">
                            <i class="fas fa-shapes"></i><span>Constelações</span>
                        </button>
                        <button class="sftw-tab" data-tab="messier" type="button">
                            <i class="fas fa-bullseye"></i><span>Messier</span>
                        </button>
                        <button class="sftw-tab" data-tab="stars" type="button">
                            <i class="fas fa-star"></i><span>Estrelas</span>
                        </button>
                    </div>

                    <!-- ===================== -->
                    <!-- TAB: EXPLORAR -->
                    <!-- ===================== -->
                    <div class="sftw-tabpanel active" data-panel="explore">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-compass"></i> Modo livre</div>
                                <div class="sftw-pill sftw-pill-soft">Planetário</div>
                            </div>
                            <div class="sftw-help sftw-help-tight">
                                Ajuste a visualização do céu antes de entrar em um jogo. Nesta etapa, o foco é separar melhor o ambiente livre dos modos de gameplay.
                            </div>
                        </div>

                        <div class="sftw-card" data-lock-group="explore-controls">
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

                        <div class="sftw-card" data-lock-group="explore-controls">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-font"></i> Tipo de nome</div>
                            </div>
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
                            </div>

                            <div class="sftw-divider"></div>

                            <div class="sftw-row sftw-row-wrap">
                                <button id="btn-focus-orion" class="sftw-btn" type="button">
                                    <i class="fas fa-crosshairs"></i><span>Focar Ori</span>
                                </button>
                                <button id="btn-reset-view" class="sftw-btn" type="button">
                                    <i class="fas fa-rotate-left"></i><span>Reset</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- ===================== -->
                    <!-- TAB: CONSTELAÇÕES -->
                    <!-- ===================== -->
                    <div class="sftw-tabpanel" data-panel="constellations">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-gamepad"></i> Jogo das Constelações</div>
                                <div class="sftw-pill" id="game-status">Pronto</div>
                            </div>
                            <div class="sftw-help sftw-help-tight">
                                Aqui fica apenas o fluxo do jogo de constelações: iniciar sessão, acompanhar progresso e consultar a checklist de 88 constelações.
                            </div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-row sftw-row-wrap">
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
                                <span class="muted">constelações</span>
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

                            <div class="sftw-divider"></div>
                            <div class="sftw-help">Jogo 1 — aparência durante a sessão</div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle">
                                    <input id="game1-show-boundaries" type="checkbox" checked>
                                    <span>Mostrar limites revelados</span>
                                </label>
                                <label class="sftw-toggle">
                                    <input id="game1-show-labels" type="checkbox">
                                    <span>Mostrar nomes revelados</span>
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

                        <div class="sftw-card sftw-card-note">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-lightbulb"></i> Fluxo</div>
                            </div>
                            <div class="sftw-help">No jogo: clique numa região (boundaries) e digite a constelação vizinha.</div>
                        </div>

                        <div class="sftw-card" id="neighbor-training-section">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-diagram-project"></i> Treino 2 — Limites das Constelações</div>
                                <div class="sftw-pill sftw-pill-soft" id="neighbor-status-pill">Pronto</div>
                            </div>
                            <div class="sftw-help sftw-help-tight">
                                Escolha uma constelação e responda todas as que fazem limite com ela. Nesta primeira versão, o modo fácil mostra quantas vizinhas existem e cria as caixinhas automaticamente.
                            </div>

                            <div class="sftw-divider"></div>

                            <div class="sftw-row sftw-row-wrap">
                                <div style="flex:1 1 220px; min-width: 180px;">
                                    <div class="sftw-help" style="margin-top:0; margin-bottom:6px;">Dificuldade</div>
                                    <select id="neighbor-difficulty" class="sftw-input">
                                        <option value="easy" selected>Fácil — mostra quantas vizinhas existem</option>
                                        <option value="hidden-count">Livre — não mostra quantas existem</option>
                                    </select>
                                </div>
                                <div style="flex:1 1 220px; min-width: 180px;">
                                    <div class="sftw-help" style="margin-top:0; margin-bottom:6px;">Visualização</div>
                                    <select id="neighbor-visual-mode" class="sftw-input">
                                        <option value="normal" selected>Planetário normal</option>
                                        <option value="blackout">Planetário desativado (céu escuro)</option>
                                    </select>
                                </div>
                            </div>

                            <div class="sftw-row sftw-row-wrap" style="margin-top:12px;">
                                <div style="flex:1 1 220px; min-width: 180px;">
                                    <div class="sftw-help" style="margin-top:0; margin-bottom:6px;">Sequência</div>
                                    <select id="neighbor-sequence-mode" class="sftw-input">
                                        <option value="selected" selected>Somente a constelação escolhida</option>
                                        <option value="alphabetical">Sequência alfabética</option>
                                        <option value="random">Ordem aleatória</option>
                                    </select>
                                </div>
                                <div style="flex:1 1 220px; min-width: 180px; display:flex; align-items:flex-end;">
                                    <label class="sftw-toggle" style="margin:0; min-height:46px;">
                                        <input id="neighbor-auto-advance" type="checkbox">
                                        <span>Passar automaticamente para a próxima</span>
                                    </label>
                                </div>
                            </div>

                            <div class="sftw-row sftw-row-wrap" style="margin-top:12px;">
                                <button id="btn-start-neighbor-training" class="sftw-btn sftw-btn-primary sftw-btn-wide" type="button">
                                    <i class="fas fa-play"></i><span>Escolher constelação e iniciar</span>
                                </button>
                                <button id="btn-stop-neighbor-training" class="sftw-btn sftw-btn-danger sftw-btn-wide" type="button" style="display:none;">
                                    <i class="fas fa-stop"></i><span>Encerrar treino</span>
                                </button>
                            </div>

                            <div class="sftw-stats" style="margin-top:12px;">
                                <div class="sftw-stat">
                                    <div class="k">Constelação atual</div>
                                    <div class="v" id="neighbor-current-target">—</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Quantidade esperada</div>
                                    <div class="v" id="neighbor-expected-count">—</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Tempo da rodada</div>
                                    <div class="v" id="neighbor-round-timer">00:00</div>
                                </div>
                            </div>

                            <div class="sftw-divider"></div>

                            <div id="neighbor-answer-area" class="sftw-neighbor-answer-area">
                                <div class="sftw-help">Ao iniciar, as respostas aparecem aqui.</div>
                            </div>

                            <div class="sftw-row sftw-row-wrap" style="margin-top:12px;">
                                <button id="btn-submit-neighbor-answers" class="sftw-btn sftw-btn-primary" type="button" disabled>
                                    <i class="fas fa-check"></i><span>Corrigir respostas</span>
                                </button>
                                <button id="btn-neighbor-choose-another" class="sftw-btn" type="button">
                                    <i class="fas fa-repeat"></i><span>Treinar outra constelação</span>
                                </button>
                            </div>

                            <div class="sftw-divider"></div>

                            <div id="neighbor-result-area" class="sftw-neighbor-result-area">
                                <div class="sftw-help">Depois da correção, aparecem aqui os acertos, erros e faltantes.</div>
                            </div>

                            <div class="sftw-divider"></div>

                            <div class="sftw-card-h sftw-card-h-split" style="margin-bottom:8px;">
                                <div class="sftw-card-title"><i class="fas fa-clock-rotate-left"></i> Histórico da sessão</div>
                                <span class="muted">constelações treinadas nesta sessão</span>
                            </div>
                            <div id="neighbor-session-history" class="sftw-checklist">
                                <div class="sftw-help">Nenhuma constelação treinada ainda.</div>
                            </div>
                        </div>
                    </div>

                    <!-- ===================== -->
                    <!-- TAB: MESSIER -->
                    <!-- ===================== -->
                    <div class="sftw-tabpanel" data-panel="messier">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-bullseye"></i> Jogo do Messier</div>
                                <div class="sftw-pill sftw-pill-soft" id="messier-game-status-pill">Inativo</div>
                            </div>
                            <div class="sftw-help sftw-help-tight">
                                Aqui fica o jogo do Messier de verdade: o céu começa sem os Messiers revelados, o painel escolhe o alvo e o acerto acontece por tolerância angular no clique.
                            </div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-play"></i> Sessão</div>
                                <span class="muted" id="messier-game-target-badge">Sem alvo</span>
                            </div>
                            <div class="sftw-row sftw-row-wrap">
                                <button class="sftw-btn sftw-btn-primary sftw-btn-wide" id="btn-start-messier-game" type="button">
                                    <i class="fas fa-play"></i><span>Iniciar</span>
                                </button>
                                <button class="sftw-btn sftw-btn-danger sftw-btn-wide" id="btn-stop-messier-game" type="button">
                                    <i class="fas fa-stop"></i><span>Encerrar</span>
                                </button>
                            </div>
                            <div class="sftw-stats" style="margin-top:12px;">
                                <div class="sftw-stat">
                                    <div class="k">Alvo atual</div>
                                    <div class="v" id="messier-game-target">—</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Descobertos</div>
                                    <div class="v" id="messier-game-progress">0/110</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Erros</div>
                                    <div class="v" id="messier-game-errors">0</div>
                                </div>
                            </div>
                            <div class="sftw-progress">
                                <div class="sftw-progress-top">
                                    <span>Progresso do jogo</span>
                                    <span id="messier-game-progress-label">0%</span>
                                </div>
                                <div class="sftw-progress-bar">
                                    <div class="sftw-progress-fill" id="messier-game-progress-bar"></div>
                                </div>
                            </div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-sliders"></i> Configuração da rodada</div>
                            </div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle">
                                    <input id="messier-random-order" type="checkbox">
                                    <span>Ordem aleatória</span>
                                </label>
                                <label class="sftw-toggle">
                                    <input id="messier-auto-advance" type="checkbox" checked>
                                    <span>Auto-advance</span>
                                </label>
                                <label class="sftw-toggle">
                                    <input id="messier-show-error-hint" type="checkbox" checked>
                                    <span>Mostrar distância do erro (graus)</span>
                                </label>
                            </div>
                            <div class="sftw-divider"></div>
                            <div class="sftw-help">Tolerância angular (em graus)</div>
                            <div class="sftw-row">
                                <input id="messier-tolerance-deg" class="sftw-input" type="number" min="0.1" max="20" step="0.1" value="1.2">
                            </div>
                            <div class="sftw-help">Você pode definir um alvo específico. Se a ordem aleatória estiver desligada, a ordem padrão segue M1 → M110.</div>
                            <div class="sftw-row sftw-row-wrap">
                                <input id="messier-target-input" class="sftw-input" type="text" placeholder="Ex.: M31" style="flex:1 1 160px;">
                                <button class="sftw-btn" id="btn-apply-messier-target" type="button">
                                    <i class="fas fa-crosshairs"></i><span>Definir alvo</span>
                                </button>
                                <button class="sftw-btn" id="btn-focus-messier-target" type="button">
                                    <i class="fas fa-location-crosshairs"></i><span>Focar</span>
                                </button>
                            </div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-layer-group"></i> Catálogo visível</div>
                                <span class="muted">fora da sessão</span>
                            </div>
                            <div class="sftw-togglelist">
                                <label class="sftw-toggle">
                                    <input id="toggle-messier" type="checkbox" ${currentShowMessier ? 'checked' : ''}>
                                    <span>Mostrar catálogo Messier</span>
                                </label>
                            </div>
                            <div class="sftw-help">Este controle continua existindo, mas agora ele fica separado do jogo. Durante uma sessão, o jogo usa apenas os Messiers já descobertos.</div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-list"></i> Descobertos</div>
                                <span class="muted" id="messier-last-error">Último erro: —</span>
                            </div>
                            <div id="messier-discovered-list" class="sftw-checklist"></div>
                        </div>
                    </div>

                    <!-- ===================== -->
                    <!-- TAB: ESTRELAS -->
                    <!-- ===================== -->
                    <div class="sftw-tabpanel" data-panel="stars">
                        <div class="sftw-card sftw-card-intro">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-star"></i> Explorador de Estrelas</div>
                                <div class="sftw-pill sftw-pill-soft">Base do próximo jogo</div>
                            </div>
                            <div class="sftw-help sftw-help-tight">
                                Primeiro deixamos as estrelas inspecionáveis. Depois, o jogo das estrelas reaproveita essa mesma base com filtros por magnitude, nome e constelação.
                            </div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-crosshairs"></i> Estrela selecionada</div>
                                <span class="muted" id="star-inspector-status">Clique em uma estrela no céu</span>
                            </div>

                            <div class="sftw-stats" style="margin-bottom:12px;">
                                <div class="sftw-stat" style="grid-column:1 / -1;">
                                    <div class="k">Nome</div>
                                    <div class="v" id="star-inspector-name">—</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Constelação</div>
                                    <div class="v" id="star-inspector-constellation">—</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Magnitude</div>
                                    <div class="v" id="star-inspector-magnitude">—</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Ascensão reta</div>
                                    <div class="v" id="star-inspector-ra">—</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Declinação</div>
                                    <div class="v" id="star-inspector-dec">—</div>
                                </div>
                                <div class="sftw-stat" style="grid-column:1 / -1;">
                                    <div class="k">Classe espectral</div>
                                    <div class="v" id="star-inspector-spectral">—</div>
                                </div>
                            </div>

                            <div class="sftw-help">
                                Dica: por enquanto o clique em estrela serve para estudo. Depois vamos transformar isso em modos de jogo por brilho, nome e constelação.
                            </div>
                        </div>

                        <div class="sftw-card">
                            <div class="sftw-card-h sftw-card-h-split">
                                <div class="sftw-card-title"><i class="fas fa-filter"></i> Pool de treino (pré-jogo)</div>
                                <button class="sftw-linkbtn" id="btn-star-refresh-pool" type="button"><span>Atualizar</span></button>
                            </div>

                            <div class="sftw-togglelist">
                                <label class="sftw-toggle">
                                    <input id="star-filter-named-only" type="checkbox" checked>
                                    <span>Somente estrelas com nome</span>
                                </label>
                            </div>

                            <div class="sftw-help">Magnitude máxima considerada para treino</div>
                            <div class="sftw-row">
                                <input id="star-filter-magnitude-max" class="sftw-input" type="number" min="-2" max="8" step="0.1" value="3.5">
                            </div>

                            <div class="sftw-help">Filtrar por constelação (opcional)</div>
                            <div class="sftw-row">
                                <input id="star-filter-constellation" class="sftw-input" type="text" placeholder="Ex.: Ori, Sco, Cyg">
                            </div>

                            <div class="sftw-progress" style="margin-top:12px;">
                                <div class="sftw-progress-top">
                                    <span>Total no catálogo</span>
                                    <span id="star-catalog-total">0</span>
                                </div>
                            </div>

                            <div class="sftw-stats" style="margin-top:12px;">
                                <div class="sftw-stat">
                                    <div class="k">Com nome</div>
                                    <div class="v" id="star-named-count">0</div>
                                </div>
                                <div class="sftw-stat">
                                    <div class="k">Treináveis agora</div>
                                    <div class="v" id="star-training-pool-count">0</div>
                                </div>
                            </div>

                            <div class="sftw-help">
                                Este bloco ainda não liga/desliga estrelas na cena. Ele serve para você enxergar qual subconjunto faz sentido virar jogo depois.
                            </div>
                        </div>
                    </div>

                    <div class="sftw-panel-footer">
                        <div class="sftw-card sftw-messages">
                            <div class="sftw-card-h">
                                <div class="sftw-card-title"><i class="fas fa-message"></i> Mensagens</div>
                            </div>
                            <div id="message-container" class="sftw-message-container"></div>
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
            this.activeMainTab = name;
            for (const t of tabs) t.classList.toggle('active', t.dataset.tab === name);
            for (const p of panels) p.classList.toggle('active', p.dataset.panel === name);
        };

        this.activateMainTab = activate;

        for (const t of tabs) {
            t.addEventListener('click', () => activate(t.dataset.tab));
        }

        activate(this.activeMainTab || 'explore');
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

        // Estrelas
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

        this.elements.game1ShowBoundaries = document.getElementById('game1-show-boundaries');
        this.elements.game1ShowLabels = document.getElementById('game1-show-labels');

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

        // Treino de vizinhanças
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
        this.elements.neighborStatusPill = document.getElementById('neighbor-status-pill');
        
        console.log('✅ Elementos DOM cacheados');
    }
    
    setupAllEvents() {
        console.log('🔧 Configurando eventos da UI...');

        // Tabs (Planetário / Jogo)
        this.setupTabEvents();
        
        // Botões do jogo
        this.setupGameEvents();
        this.setupNeighborGameEvents();
        
        // Controles de visualização
        this.setupVisualizationEvents();
        
        // Busca e navegação
        this.setupSearchEvents();
        
        // Tipo de nome
        this.setupNameTypeEvents();
        
        // (Redesign) dificuldade removida
        
        // Navegação
        this.setupNavigationEvents();

        if (this.elements.game1ShowBoundaries) {
            this.elements.game1ShowBoundaries.addEventListener('change', () => this.applyGameOptionsToVisualization());
        }
        if (this.elements.game1ShowLabels) {
            this.elements.game1ShowLabels.addEventListener('change', () => this.applyGameOptionsToVisualization());
        }
        

        // (Redesign) diagnósticos removidos do layout principal

        // Lista de progresso (88)
        if (typeof this.setupProgressTrackerEvents === 'function') {
            this.setupProgressTrackerEvents();
        }

        this.setupMessierGameEvents();
        this.refreshMessierGameUI();
        this.refreshNeighborTrainingUI();

        this.setupStarInspectorEvents();
        this.refreshStarTrainingPoolSummary();
        this.startStarInspectorSync();

        console.log('✅ Todos os eventos configurados');
    }
    

    // ============================================
    // ESTRELAS - INSPECTOR / POOL
    // ============================================

    setupStarInspectorEvents() {
        const refreshPreview = () => this.refreshStarTrainingPoolSummary();
        const applyVisualFilter = () => this.applyStarStudyFilterFromUI();

        if (this.elements.starFilterNamedOnly) {
            this.elements.starFilterNamedOnly.addEventListener('change', refreshPreview);
        }
        if (this.elements.starFilterMagnitudeMax) {
            this.elements.starFilterMagnitudeMax.addEventListener('input', refreshPreview);
        }
        if (this.elements.starFilterConstellation) {
            this.elements.starFilterConstellation.addEventListener('input', refreshPreview);
        }
        if (this.elements.btnStarRefreshPool) {
            this.elements.btnStarRefreshPool.addEventListener('click', () => {
                refreshPreview();
                applyVisualFilter();
            });
        }
    }

    applyStarStudyFilterFromUI() {
        const vis = this.sftw?.visualization;
        if (!vis || typeof vis.setStarStudyFilter !== 'function') {
            this.showMessage('O filtro visual das estrelas não está disponível nesta versão.', 'warning', 1800, {
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

        this.showMessage('Filtro visual das estrelas aplicado ao céu.', 'success', 1200, {
            replaceKey: 'star-study-filter-applied',
            replaceActive: true,
            skipQueue: true
        });

        return true;
    }

    startStarInspectorSync() {
        if (this._starInspectorSyncTimer) clearInterval(this._starInspectorSyncTimer);
        this._starInspectorSyncTimer = setInterval(() => {
            this.syncSelectedStarFromVisualization();
        }, 220);
    }

    syncSelectedStarFromVisualization() {
        const vis = this.sftw?.visualization;
        if (!vis || vis.currentInfoType !== 'star') return;

        const key = vis.currentInfoStar;
        if (key == null) return;

        const star = this.findStarByVisualizationKey(key);
        if (!star) return;

        const starKey = `${star.id ?? ''}|${star.name ?? ''}|${star.constellation ?? ''}|${star.magnitude ?? ''}`;
        if (starKey === this._lastStarInspectorKey) return;

        this._lastStarInspectorKey = starKey;
        this.renderSelectedStarInspector(star);
    }

    findStarByVisualizationKey(key) {
        const stars = Array.isArray(this.sftw?.stars) ? this.sftw.stars : [];
        if (stars.length === 0) return null;

        const byId = stars.find(s => String(s.id) === String(key));
        if (byId) return byId;

        const byName = stars.find(s => (s.name || '').toString() === String(key));
        return byName || null;
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


    // ============================================
    // MOBILE / TABLET - MELHORIAS DE USABILIDADE
    // ============================================

    setupMobileUIEnhancements() {
        const updateMobileState = () => {
            const isMobile = window.matchMedia('(max-width: 900px)').matches;
            document.body.classList.toggle('sftw-mobile-ui', isMobile);

            if (this.uiContainer) {
                this.uiContainer.classList.toggle('sftw-mobile-controls', isMobile);
            }
        };

        updateMobileState();

        if (this._mobileResizeHandler) {
            window.removeEventListener('resize', this._mobileResizeHandler);
        }
        this._mobileResizeHandler = updateMobileState;
        window.addEventListener('resize', this._mobileResizeHandler);

        if (window.visualViewport) {
            if (this._mobileViewportHandler) {
                window.visualViewport.removeEventListener('resize', this._mobileViewportHandler);
                window.visualViewport.removeEventListener('scroll', this._mobileViewportHandler);
            }
            this._mobileViewportHandler = updateMobileState;
            window.visualViewport.addEventListener('resize', this._mobileViewportHandler);
            window.visualViewport.addEventListener('scroll', this._mobileViewportHandler);
        }

        const focusables = this.uiContainer ? this.uiContainer.querySelectorAll('input, textarea, select, button') : [];
        focusables.forEach((el) => {
            el.addEventListener('focus', () => {
                if (window.matchMedia('(max-width: 900px)').matches) {
                    setTimeout(() => {
                        try {
                            el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                        } catch (_) {}
                    }, 120);
                }
            });
        });
    }

    // ============================================
    // CONEXÃO COM O MÓDULO DE JOGO
    // ============================================
    
    connectWithGameModule() {
    console.log('🔗 Conectando UI com módulo Game...');

    if (this.sftw.registerCallback) {

        // ---------- Jogo principal (constelações) ----------
        this.sftw.registerCallback('onGameStart', (constellationAbbr) => {
            this.gameUIState = 'playing';
            this.updateGameUIState();
            this.onGameStarted(constellationAbbr);
        });

        this.sftw.registerCallback('onConstellationDiscovered', (abbreviation, attempts) => {
            if (abbreviation && typeof abbreviation === 'object') {
                this.onConstellationDiscovered(abbreviation.abbr, abbreviation.attempts);
            } else {
                this.onConstellationDiscovered(abbreviation, attempts);
            }
        });

        this.sftw.registerCallback('onGameEnd', (result) => {
            this.gameUIState = 'completed';
            this.updateGameUIState();
            this.onGameCompleted(result);
        });

        this.sftw.registerCallback('onWrongAnswer', (abbreviation, input) => {
            if (abbreviation && typeof abbreviation === 'object') {
                this.onWrongAnswer(abbreviation.targetAbbr, abbreviation.input);
            } else {
                this.onWrongAnswer(abbreviation, input);
            }
        });

        this.sftw.registerCallback('onCorrectAnswer', (payloadOrAbbr, input) => {
            // Compatível com assinatura antiga e nova
            const abbr = (payloadOrAbbr && typeof payloadOrAbbr === 'object')
                ? (payloadOrAbbr.targetAbbr || payloadOrAbbr.matched || '')
                : payloadOrAbbr;

            if (abbr) {
                const abbrLabel = String(abbr || '').trim();
                const ptName = (typeof this.sftw?.getConstellationNamePt === 'function') ? this.sftw.getConstellationNamePt(abbrLabel) : abbrLabel;
                this.showMessage(`Correto: ${ptName} (${abbrLabel})`, 'success', 1400, {
                    replaceKey: 'constellation-correct',
                    replaceActive: true,
                    skipQueue: true
                });
            }
        });

        // Estado canônico do jogo principal: botão Sair + painel
        this.sftw.registerCallback('onGameStateChange', (gameState) => {
            this.sftw.gameState = gameState || {};

            if (gameState?.active || gameState?.isGameActive || gameState?.status === 'playing') {
                this.gameUIState = 'playing';
            } else if (gameState?.finished || gameState?.status === 'completed') {
                this.gameUIState = 'completed';
            } else if (gameState?.status === 'selecting') {
                this.gameUIState = 'selecting';
            } else {
                this.gameUIState = 'idle';
            }

            this.updateGameUIState();
            this.updateGameStats(gameState || {});
        });

        // ---------- Messier ----------
        const handleMessierState = (state) => {
            this.onMessierGameStateChanged(state || null);
        };

        this.sftw.registerCallback('onMessierGameStateChange', handleMessierState);
        this.sftw.registerCallback('onMessierGameStateChanged', handleMessierState);
        this.sftw.registerCallback('onMessierGameStart', handleMessierState);
        this.sftw.registerCallback('onMessierGameEnd', handleMessierState);

        this.sftw.registerCallback('onMessierGameHit', (payload) => {
            if (payload?.message) {
                this.showMessage(payload.message, 'success', 1800, {
                    replaceKey: 'messier-hit',
                    replaceActive: true,
                    skipQueue: true
                });
            }
            handleMessierState(payload?.state || null);
        });

        this.sftw.registerCallback('onMessierGameMiss', (payload) => {
            if (payload?.message) {
                this.showMessage(payload.message, 'warning', 2200, {
                    replaceKey: 'messier-miss',
                    replaceActive: true,
                    skipQueue: true
                });
            }
            handleMessierState(payload?.state || null);
        });

        // ---------- NeighborGame / treino de limites ----------
        this.sftw.registerCallback('onNeighborGameStateChange', (state) => {
            this.refreshNeighborTrainingUI(state || null);
        });
        this.sftw.registerCallback('onNeighborRoundStart', (round) => {
            this.onNeighborRoundStart(round || null);
        });
        this.sftw.registerCallback('onNeighborRoundSubmitted', (round) => {
            this.onNeighborRoundSubmitted(round || null);
        });
        this.sftw.registerCallback('onNeighborGameEnd', (report) => {
            this.onNeighborGameEnded(report || null);
        });

        console.log('✅ Callbacks registrados no Core');
    }

    if (this.sftw.game || this.sftw?.games?.constellation) {
        console.log('✅ Conectado com controlador do jogo principal');
    }
}

    getPrimaryGameController() {
        return this.sftw?.games?.constellation || this.sftw?.game || null;
    }

    isPrimaryGameActive() {
        const game = this.getPrimaryGameController();
        return !!(game && game.state && game.state.active);
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

        this.clearAllMessages({ clearQueue: true, keepActive: false });
        this.applyGameOptionsToVisualization();
        const startOptions = this.getConstellationGameStartOptions();

        this.openConstellationSelectionModal({
            title: 'Escolha a constelação inicial',
            onSelect: (abbr) => {
                if (typeof this.sftw.startGame === 'function') {
                    this.sftw.startGame(abbr, startOptions);
                    return;
                }

                const game = this.getPrimaryGameController();
                if (game && typeof game.startGame === 'function') {
                    game.startGame(abbr, startOptions);
                    return;
                }

                this.showMessage('Sistema de jogo não disponível (startGame)', 'error', 2200, { replaceKey: 'game1-error', replaceActive: true, skipQueue: true });
            }
        });
    }
    
    getConstellationGameStartOptions() {
        return {
            showBoundaries: this.elements.game1ShowBoundaries ? !!this.elements.game1ShowBoundaries.checked : true,
            showLabels: this.elements.game1ShowLabels ? !!this.elements.game1ShowLabels.checked : false
        };
    }

    selectConstellation() {
        console.log('🎯 UI: Selecionar constelação solicitado');

        // Permite escolher outra constelação (ex.: para focar ou reiniciar)
        this.openConstellationSelectionModal({
            title: 'Escolha uma constelação',
            onSelect: (abbr) => {
                // Se o jogo estiver ativo, reinicia a partir da nova constelação.
                if (this.isPrimaryGameActive()) {
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
        
        if (this.getPrimaryGameController() && typeof this.sftw.showAnswerKey === 'function') {
            this.sftw.showAnswerKey();
        }
    }
    
    restartGame() {
        console.log('🔄 UI: Reiniciar jogo solicitado');
        
        if (this.getPrimaryGameController() && typeof this.sftw.restartGame === 'function') {
            this.sftw.restartGame();
        }
    }
    
    endGame() {
        console.log('🚪 UI: Sair do jogo solicitado');

        this.clearAllMessages({ clearQueue: true, keepActive: false });
        this.resetProgressChecklist?.();
        this.setProgressPanelVisible?.(false);

        this.gameUIState = 'idle';
        this.updateGameUIState();

        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = 'Pronto';
        }

        if (typeof this.activateMainTab === 'function') {
            this.activateMainTab('explore');
        }

        const game = this.getPrimaryGameController();

        if (game && typeof game.endGame === 'function') {
            game.endGame();
            return;
        }

        if (typeof this.sftw.returnToMainMenu === 'function') {
            this.sftw.returnToMainMenu();
        } else if (window.app && typeof window.app.returnToMainMenu === 'function') {
            window.app.returnToMainMenu();
        } else if (typeof this.sftw.endGame === 'function') {
            this.sftw.endGame();
        }
    }


    // ============================================
    // TREINO 2 — LIMITES DAS CONSTELAÇÕES
    // ============================================

    getNeighborGameController() {
        return this.sftw?.games?.neighbor || this.sftw?.neighborGame || null;
    }

    getCurrentNeighborGameState() {
        if (typeof this.sftw?.getNeighborGameState === 'function') {
            const state = this.sftw.getNeighborGameState();
            if (state && typeof state === 'object') return state;
        }
        return {
            active: false,
            finished: false,
            difficulty: this.elements.neighborDifficulty?.value || 'easy',
            sequenceMode: this.elements.neighborSequenceMode?.value || 'selected',
            autoAdvance: !!this.elements.neighborAutoAdvance?.checked,
            visualMode: this.elements.neighborVisualMode?.value || 'normal',
            currentTarget: null,
            elapsedTime: 0,
            roundsCompleted: 0,
            totalRounds: 0,
            score: 0,
            maxScore: 0,
            accuracyPct: null,
            pendingTargetsCount: 0,
            hasSubmittedCurrentRound: false
        };
    }

    setupNeighborGameEvents() {
        if (this.elements.btnStartNeighborTraining) {
            this.elements.btnStartNeighborTraining.addEventListener('click', () => {
                this.startNeighborTrainingFromUI();
            });
        }

        if (this.elements.btnStopNeighborTraining) {
            this.elements.btnStopNeighborTraining.addEventListener('click', () => {
                this.stopNeighborTrainingFromUI();
            });
        }

        if (this.elements.btnSubmitNeighborAnswers) {
            this.elements.btnSubmitNeighborAnswers.addEventListener('click', () => {
                this.submitNeighborTrainingFromUI();
            });
        }

        if (this.elements.btnNeighborChooseAnother) {
            this.elements.btnNeighborChooseAnother.addEventListener('click', () => {
                this.startNeighborTrainingFromUI();
            });
        }
    }

    _readNeighborTrainingOptionsFromUI() {
        return {
            difficulty: (this.elements.neighborDifficulty?.value || 'easy').toString(),
            visualMode: (this.elements.neighborVisualMode?.value || 'normal').toString(),
            sequenceMode: (this.elements.neighborSequenceMode?.value || 'selected').toString(),
            autoAdvance: !!this.elements.neighborAutoAdvance?.checked
        };
    }

    startNeighborTrainingFromUI() {
        this.clearAllMessages({ clearQueue: true, keepActive: false });
        if (typeof this.sftw?.startNeighborGame !== 'function') {
            this.showMessage('Sistema do treino de limites não está disponível.', 'error');
            return;
        }

        const opts = this._readNeighborTrainingOptionsFromUI();
        this.resetNeighborTrainingPanel();

        const launch = (extra = {}) => {
            const startOptions = { ...opts, ...extra };
            const ok = this.sftw.startNeighborGame(startOptions);
            if (!ok && ok !== undefined) {
                this.showMessage('Não foi possível iniciar o treino de limites.', 'error');
                return;
            }

            if (typeof this.activateMainTab === 'function') {
                this.activateMainTab('constellations');
            }

            const msg = startOptions.targetConstellation
                ? `Treino de limites iniciado para ${startOptions.targetConstellation}.`
                : (startOptions.sequenceMode === 'alphabetical'
                    ? 'Treino em sequência alfabética iniciado.'
                    : 'Treino em sequência aleatória iniciado.');

            this.showMessage(msg, 'success', 1600, {
                replaceKey: 'neighbor-start',
                replaceActive: true,
                skipQueue: true
            });
        };

        if (opts.sequenceMode === 'selected') {
            this.openConstellationSelectionModal({
                title: 'Escolha a constelação para o treino de limites',
                onSelect: (abbr) => launch({ targetConstellation: abbr })
            });
            return;
        }

        launch();
    }

    stopNeighborTrainingFromUI() {
        this.clearAllMessages({ clearQueue: true, keepActive: false });
        if (typeof this.sftw?.endNeighborGame === 'function') {
            this.sftw.endNeighborGame();
        }
        this.restoreNeighborVisualMode();
        this.refreshNeighborTrainingUI();
        this.showMessage('Treino de limites encerrado.', 'info', 1500, {
            replaceKey: 'neighbor-stop',
            replaceActive: true,
            skipQueue: true
        });
    }

    submitNeighborTrainingFromUI() {
        if (typeof this.sftw?.submitNeighborAnswer !== 'function') {
            this.showMessage('Função de correção do treino de limites indisponível.', 'error');
            return;
        }

        const state = this.getCurrentNeighborGameState();
        if (!state?.active || !state.currentTarget) {
            this.showMessage('Nenhuma rodada ativa do treino de limites.', 'warning');
            return;
        }

        let payload = '';
        if ((this.elements.neighborDifficulty?.value || 'easy') === 'easy') {
            const inputs = Array.from(this.elements.neighborAnswerArea?.querySelectorAll('.neighbor-answer-input') || []);
            payload = inputs.map(el => (el.value || '').trim()).filter(Boolean).join(', ');
        } else {
            payload = (this.elements.neighborAnswerArea?.querySelector('textarea')?.value || '').trim();
        }

        const result = this.sftw.submitNeighborAnswer(payload);
        if (!result) {
            this.showMessage('Não foi possível corrigir esta rodada.', 'error');
            return;
        }
    }

    refreshNeighborTrainingUI(state = null) {
        state = state || this.getCurrentNeighborGameState();
        const active = !!state?.active;
        const current = state?.currentTarget || null;

        if (this.elements.neighborStatusPill) {
            if (active) this.elements.neighborStatusPill.textContent = 'Em treino';
            else if (state?.finished) this.elements.neighborStatusPill.textContent = 'Concluído';
            else this.elements.neighborStatusPill.textContent = 'Pronto';
        }
        if (this.elements.btnStartNeighborTraining) {
            this.elements.btnStartNeighborTraining.style.display = active ? 'none' : '';
        }
        if (this.elements.btnStopNeighborTraining) {
            this.elements.btnStopNeighborTraining.style.display = active ? '' : 'none';
        }
        if (this.elements.btnSubmitNeighborAnswers) {
            this.elements.btnSubmitNeighborAnswers.disabled = !active || !current || !!state?.hasSubmittedCurrentRound;
        }

        if (this.elements.neighborCurrentTarget) {
            if (current?.abbr) {
                this.elements.neighborCurrentTarget.textContent = `${current.abbr} — ${current.name || current.abbr}`;
            } else {
                this.elements.neighborCurrentTarget.textContent = '—';
            }
        }

        if (this.elements.neighborExpectedCount) {
            const visible = current && (current.expectedCountVisible !== false);
            this.elements.neighborExpectedCount.textContent = visible
                ? String(current.expectedCount ?? '—')
                : 'Oculto';
        }

        if (this.elements.neighborRoundTimer) {
            const seconds = Number(current?.roundElapsedTime ?? 0);
            const mm = Math.floor(seconds / 60);
            const ss = seconds % 60;
            this.elements.neighborRoundTimer.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        }

        if (this.elements.neighborSessionAccuracy) {
            const pct = Number(state?.accuracyPct);
            this.elements.neighborSessionAccuracy.textContent = Number.isFinite(pct) ? `${pct.toFixed(0)}%` : '—';
        }

        if (this.elements.neighborSessionSummary) {
            const roundsCompleted = Number(state?.roundsCompleted || 0);
            const totalRounds = Number(state?.totalRounds || 0);
            const pending = Number(state?.pendingTargetsCount || 0);
            this.elements.neighborSessionSummary.textContent = roundsCompleted > 0
                ? `${roundsCompleted}/${totalRounds} concluídas • faltam ${pending}`
                : 'clique em uma linha para ver o detalhamento';
        }
    }

    onNeighborRoundStart(round) {
        if (!round) return;

        this.renderNeighborAnswerInputs(round);
        this.renderNeighborTrainingResult(null);

        const state = this.getCurrentNeighborGameState();
        this.refreshNeighborTrainingUI({
            ...state,
            currentTarget: {
                abbr: round.targetAbbr,
                name: round.targetName,
                expectedCount: round.expectedCount,
                expectedCountVisible: round.expectedCountVisible !== false,
                roundElapsedTime: 0
            },
            active: true,
            hasSubmittedCurrentRound: false
        });

        const visualMode = state?.visualMode || this.elements.neighborVisualMode?.value || 'normal';
        this.applyNeighborVisualMode(visualMode);

        if (visualMode !== 'blackout' && typeof this.sftw?.focusOnConstellation === 'function') {
            this.sftw.focusOnConstellation(round.targetAbbr);
        }
    }

    onNeighborRoundSubmitted(round) {
        if (!round) return;
        this.renderNeighborTrainingResult(round);
        this.appendNeighborHistoryEntry(round);
        this.refreshNeighborTrainingUI();

        const state = this.getCurrentNeighborGameState();
        if (state?.active && state?.autoAdvance && Number(state?.pendingTargetsCount || 0) > 0) {
            this.showMessage('Próxima constelação em sequência automática…', 'info', 1000, {
                replaceKey: 'neighbor-autoadvance',
                replaceActive: true,
                skipQueue: true
            });
            clearTimeout(this._neighborAutoAdvanceTimer);
            this._neighborAutoAdvanceTimer = setTimeout(() => {
                if (typeof this.sftw?.nextNeighborRound === 'function') {
                    this.sftw.nextNeighborRound();
                }
            }, 900);
        }
    }

    onNeighborGameEnded(report) {
        clearTimeout(this._neighborAutoAdvanceTimer);
        this.restoreNeighborVisualMode();
        this.refreshNeighborTrainingUI();
        if (report?.rounds?.length) {
            const pct = Number(report?.accuracyPct);
            const pctText = Number.isFinite(pct) ? ` • ${pct.toFixed(0)}%` : '';
            this.showMessage(`Treino concluído: ${report.totalScore}/${report.maxScore}${pctText}`, 'success', 2400, {
                replaceKey: 'neighbor-finished',
                replaceActive: true,
                skipQueue: true
            });
        }
    }

    renderNeighborAnswerInputs(round) {
        if (!this.elements.neighborAnswerArea || !round) return;

        const difficulty = (this.elements.neighborDifficulty?.value || 'easy').toString();
        if (difficulty === 'easy') {
            const total = Number(round.expectedCount || 0);
            let html = '<div class="sftw-help" style="margin-top:0; margin-bottom:10px;">Preencha uma constelação por campo.</div>';
            html += '<div class="sftw-neighbor-grid">';
            for (let i = 0; i < total; i++) {
                html += `
                    <div class="sftw-neighbor-cell">
                        <div class="sftw-help" style="margin:0 0 6px 0;">Constelação ${i + 1}</div>
                        <input type="text" class="sftw-input neighbor-answer-input" placeholder="Ex.: Tau, Gem, Lep...">
                    </div>
                `;
            }
            html += '</div>';
            this.elements.neighborAnswerArea.innerHTML = html;
        } else {
            this.elements.neighborAnswerArea.innerHTML = `
                <div class="sftw-help" style="margin-top:0; margin-bottom:10px;">
                    Digite as constelações separadas por vírgula, Enter ou ponto e vírgula. Neste modo, a quantidade não é mostrada.
                </div>
                <textarea class="sftw-input" rows="6" placeholder="Ex.: Tau, Gem, Mon, Lep"></textarea>
            `;
        }

        const first = this.elements.neighborAnswerArea.querySelector('input, textarea');
        if (first) setTimeout(() => first.focus(), 0);
    }

    renderNeighborTrainingResult(round) {
        if (!this.elements.neighborResultArea) return;

        if (!round) {
            this.elements.neighborResultArea.innerHTML = '<div class="sftw-help">Depois da correção, aparecem aqui os acertos, erros e faltantes.</div>';
            return;
        }

        const matched = Array.isArray(round.matched) ? round.matched : [];
        const missing = Array.isArray(round.missing) ? round.missing : [];
        const invalid = Array.isArray(round.invalid) ? round.invalid : [];
        const accuracyPct = Number(round.accuracyPct);

        const renderTagList = (items, kind) => {
            if (!items.length) return `<div class="sftw-help">Nenhum.</div>`;
            return `<div class="sftw-neighbor-tags">${
                items.map(item => {
                    if (typeof item === 'string') return `<span class="sftw-neighbor-tag ${kind}">${item}</span>`;
                    return `<span class="sftw-neighbor-tag ${kind}">${item.abbr} — ${item.name}</span>`;
                }).join('')
            }</div>`;
        };

        this.elements.neighborResultArea.innerHTML = `
            <div class="sftw-stats" style="margin-top:0; margin-bottom:12px;">
                <div class="sftw-stat">
                    <div class="k">Pontuação</div>
                    <div class="v">${round.scoreEarned}/${round.maxScore}</div>
                </div>
                <div class="sftw-stat">
                    <div class="k">Acurácia</div>
                    <div class="v">${Number.isFinite(accuracyPct) ? `${accuracyPct.toFixed(0)}%` : '—'}</div>
                </div>
                <div class="sftw-stat">
                    <div class="k">Tempo</div>
                    <div class="v">${this.formatNeighborRoundTime(round.elapsedAtSubmit ?? round.submittedAt)}</div>
                </div>
            </div>

            <div class="sftw-neighbor-result-block">
                <div class="sftw-card-title"><i class="fas fa-check-circle"></i> Acertou</div>
                ${renderTagList(matched, 'ok')}
            </div>
            <div class="sftw-neighbor-result-block" style="margin-top:12px;">
                <div class="sftw-card-title"><i class="fas fa-xmark-circle"></i> Colocou, mas está errado</div>
                ${renderTagList(invalid, 'bad')}
            </div>
            <div class="sftw-neighbor-result-block" style="margin-top:12px;">
                <div class="sftw-card-title"><i class="fas fa-list-check"></i> Faltou colocar</div>
                ${renderTagList(missing, 'miss')}
            </div>
        `;
    }

    appendNeighborHistoryEntry(round) {
        if (!this.elements.neighborSessionHistory || !round) return;

        const empty = this.elements.neighborSessionHistory.querySelector('.sftw-help');
        if (empty) empty.remove();

        const accuracyPct = Number(round.accuracyPct);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'sftw-progress-item discovered';
        row.style.width = '100%';
        row.style.textAlign = 'left';
        row.innerHTML = `
            <span>🧩</span>
            <span><strong>${round.targetAbbr}</strong> — ${round.targetName}</span>
            <span style="margin-left:auto; opacity:0.85;">${round.scoreEarned}/${round.maxScore} • ${this.formatNeighborRoundTime(round.elapsedAtSubmit ?? round.submittedAt)}</span>
        `;
        row.addEventListener('click', () => this.openNeighborHistoryDetail(round));
        this.elements.neighborSessionHistory.prepend(row);
    }

    openNeighborHistoryDetail(round) {
        if (!round) return;

        let overlay = document.getElementById('sftw-neighbor-history-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sftw-neighbor-history-overlay';
            overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:10040; display:flex; align-items:center; justify-content:center; padding:16px;';
            overlay.innerHTML = `
                <div style="width:min(760px,96vw); max-height:86vh; overflow:auto; background:rgba(12,16,24,0.97); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:16px; box-shadow:0 18px 48px rgba(0,0,0,0.48);">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px;">
                        <div class="sftw-card-title"><i class="fas fa-magnifying-glass-chart"></i> Detalhamento da rodada</div>
                        <button id="btn-close-neighbor-history-detail" class="sftw-btn" type="button">Fechar</button>
                    </div>
                    <div id="neighbor-history-detail-body"></div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (ev) => {
                if (ev.target === overlay) overlay.style.display = 'none';
            });
            overlay.querySelector('#btn-close-neighbor-history-detail')?.addEventListener('click', () => {
                overlay.style.display = 'none';
            });
        }

        const body = overlay.querySelector('#neighbor-history-detail-body');
        if (body) {
            const matched = Array.isArray(round.matched) ? round.matched : [];
            const missing = Array.isArray(round.missing) ? round.missing : [];
            const invalid = Array.isArray(round.invalid) ? round.invalid : [];
            const renderTagList = (items, kind) => {
                if (!items.length) return `<div class="sftw-help">Nenhum.</div>`;
                return `<div class="sftw-neighbor-tags">${items.map(item => {
                    if (typeof item === 'string') return `<span class="sftw-neighbor-tag ${kind}">${item}</span>`;
                    return `<span class="sftw-neighbor-tag ${kind}">${item.abbr} — ${item.name}</span>`;
                }).join('')}</div>`;
            };
            body.innerHTML = `
                <div class="sftw-stats" style="margin-top:0; margin-bottom:12px;">
                    <div class="sftw-stat"><div class="k">Constelação</div><div class="v">${round.targetAbbr}</div></div>
                    <div class="sftw-stat"><div class="k">Pontuação</div><div class="v">${round.scoreEarned}/${round.maxScore}</div></div>
                    <div class="sftw-stat"><div class="k">Acurácia</div><div class="v">${Number(round.accuracyPct || 0).toFixed(0)}%</div></div>
                    <div class="sftw-stat"><div class="k">Tempo</div><div class="v">${this.formatNeighborRoundTime(round.elapsedAtSubmit ?? round.submittedAt)}</div></div>
                </div>
                <div class="sftw-neighbor-result-block">
                    <div class="sftw-card-title"><i class="fas fa-check-circle"></i> Acertou</div>
                    ${renderTagList(matched, 'ok')}
                </div>
                <div class="sftw-neighbor-result-block" style="margin-top:12px;">
                    <div class="sftw-card-title"><i class="fas fa-xmark-circle"></i> Colocou, mas está errado</div>
                    ${renderTagList(invalid, 'bad')}
                </div>
                <div class="sftw-neighbor-result-block" style="margin-top:12px;">
                    <div class="sftw-card-title"><i class="fas fa-list-check"></i> Faltou colocar</div>
                    ${renderTagList(missing, 'miss')}
                </div>
            `;
        }

        overlay.style.display = 'flex';
    }

    resetNeighborTrainingPanel() {
        clearTimeout(this._neighborAutoAdvanceTimer);
        if (this.elements.neighborResultArea) {
            this.elements.neighborResultArea.innerHTML = '<div class="sftw-help">Depois da correção, aparecem aqui os acertos, erros e faltantes.</div>';
        }
        if (this.elements.neighborAnswerArea) {
            this.elements.neighborAnswerArea.innerHTML = '<div class="sftw-help">Ao iniciar, as respostas aparecem aqui.</div>';
        }
    }

    formatNeighborRoundTime(totalSeconds) {
        const value = Number(totalSeconds);
        if (!Number.isFinite(value)) return '00:00';
        const mm = Math.floor(value / 60);
        const ss = value % 60;
        return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }

    applyNeighborVisualMode(mode = 'normal') {
        const desired = String(mode || 'normal');
        if (desired === this._neighborAppliedVisualMode) return;

        if (!this._neighborVisualSnapshot) {
            this._neighborVisualSnapshot = {
                showGrid: !!this.sftw?.settings?.showGrid,
                showBoundaries: !!this.sftw?.settings?.showBoundaries,
                showLabels: !!this.sftw?.settings?.showLabels,
                showStars: !!this.sftw?.settings?.showStars,
                showMessier: !!this.sftw?.settings?.showMessier
            };
        }

        if (desired === 'blackout') {
            this.sftw.settings.showGrid = false;
            this.sftw.settings.showBoundaries = false;
            this.sftw.settings.showLabels = false;
            this.sftw.settings.showStars = false;
            this.sftw.settings.showMessier = false;
        } else if (this._neighborVisualSnapshot) {
            Object.assign(this.sftw.settings, this._neighborVisualSnapshot);
        }

        if (this.elements.toggleGrid) this.elements.toggleGrid.checked = !!this.sftw.settings.showGrid;
        if (this.elements.toggleBoundaries) this.elements.toggleBoundaries.checked = !!this.sftw.settings.showBoundaries;
        if (this.elements.toggleLabels) this.elements.toggleLabels.checked = !!this.sftw.settings.showLabels;
        if (this.elements.toggleStars) this.elements.toggleStars.checked = !!this.sftw.settings.showStars;
        if (this.elements.toggleMessier) this.elements.toggleMessier.checked = !!this.sftw.settings.showMessier;

        if (typeof this.sftw.toggleGrid === 'function') this.sftw.toggleGrid();
        if (typeof this.sftw.toggleBoundaries === 'function') this.sftw.toggleBoundaries();
        if (typeof this.sftw.toggleLabels === 'function') this.sftw.toggleLabels();
        if (typeof this.sftw.toggleStars === 'function') this.sftw.toggleStars();
        if (typeof this.sftw.toggleMessier === 'function') this.sftw.toggleMessier();

        this._neighborAppliedVisualMode = desired;
    }

    restoreNeighborVisualMode() {
        if (!this._neighborVisualSnapshot) return;
        Object.assign(this.sftw.settings, this._neighborVisualSnapshot);

        if (this.elements.toggleGrid) this.elements.toggleGrid.checked = !!this.sftw.settings.showGrid;
        if (this.elements.toggleBoundaries) this.elements.toggleBoundaries.checked = !!this.sftw.settings.showBoundaries;
        if (this.elements.toggleLabels) this.elements.toggleLabels.checked = !!this.sftw.settings.showLabels;
        if (this.elements.toggleStars) this.elements.toggleStars.checked = !!this.sftw.settings.showStars;
        if (this.elements.toggleMessier) this.elements.toggleMessier.checked = !!this.sftw.settings.showMessier;

        if (typeof this.sftw.toggleGrid === 'function') this.sftw.toggleGrid();
        if (typeof this.sftw.toggleBoundaries === 'function') this.sftw.toggleBoundaries();
        if (typeof this.sftw.toggleLabels === 'function') this.sftw.toggleLabels();
        if (typeof this.sftw.toggleStars === 'function') this.sftw.toggleStars();
        if (typeof this.sftw.toggleMessier === 'function') this.sftw.toggleMessier();

        this._neighborAppliedVisualMode = null;
        this._neighborVisualSnapshot = null;
    }

    // ============================================
    // EVENTOS DE VISUALIZAÇÃO
    // ============================================

    setupMessierGameEvents() {
        const applyOptions = () => this.applyMessierGameOptions({ silent: true });

        if (this.elements.messierRandomOrder) this.elements.messierRandomOrder.addEventListener('change', applyOptions);
        if (this.elements.messierAutoAdvance) this.elements.messierAutoAdvance.addEventListener('change', applyOptions);
        if (this.elements.messierShowErrorHint) this.elements.messierShowErrorHint.addEventListener('change', applyOptions);
        if (this.elements.messierToleranceDeg) {
            this.elements.messierToleranceDeg.addEventListener('change', applyOptions);
            this.elements.messierToleranceDeg.addEventListener('blur', applyOptions);
        }

        if (this.elements.btnStartMessierGame) {
            this.elements.btnStartMessierGame.addEventListener('click', () => this.startMessierGameFromUI());
        }
        if (this.elements.btnStopMessierGame) {
            this.elements.btnStopMessierGame.addEventListener('click', () => this.stopMessierGameFromUI());
        }
        if (this.elements.btnApplyMessierTarget) {
            this.elements.btnApplyMessierTarget.addEventListener('click', () => this.applyMessierTargetFromUI());
        }
        if (this.elements.btnFocusMessierTarget) {
            this.elements.btnFocusMessierTarget.addEventListener('click', () => this.focusMessierTargetFromUI());
        }
        if (this.elements.messierTargetInput) {
            this.elements.messierTargetInput.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    this.applyMessierTargetFromUI();
                }
            });
        }
    }

    _normalizeMessierIdInput(value) {
        const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
        if (!raw) return '';
        const m = raw.match(/^M?(\d{1,3})$/);
        if (!m) return raw;
        return `M${Number(m[1])}`;
    }

    _readMessierOptionsFromUI() {
        const toleranceRaw = Number(this.elements.messierToleranceDeg?.value ?? 1.2);
        return {
            randomOrder: !!this.elements.messierRandomOrder?.checked,
            autoAdvance: !!this.elements.messierAutoAdvance?.checked,
            showErrorHint: !!this.elements.messierShowErrorHint?.checked,
            toleranceDeg: (Number.isFinite(toleranceRaw) && toleranceRaw > 0) ? toleranceRaw : 1.2,
            targetId: this._normalizeMessierIdInput(this.elements.messierTargetInput?.value || '') || undefined,
            manualTargetId: this._normalizeMessierIdInput(this.elements.messierTargetInput?.value || '') || undefined
        };
    }

    applyMessierGameOptions({ silent = false } = {}) {
        const opts = this._readMessierOptionsFromUI();
        if (typeof this.sftw.setMessierGameOptions === 'function') {
            this.sftw.setMessierGameOptions(opts);
        }
        if (!silent) {
            this.showMessage('Opções do jogo Messier atualizadas.', 'info', 1800);
        }
        this.refreshMessierGameUI();
    }

    startMessierGameFromUI() {
        this.clearAllMessages({ clearQueue: true, keepActive: false });
        const opts = this._readMessierOptionsFromUI();
        if (typeof this.sftw.startMessierGame !== 'function') {
            this.showMessage('Sistema do jogo Messier não disponível.', 'error');
            return;
        }
        const ok = this.sftw.startMessierGame(opts);
        if (ok) {
            if (typeof this.activateMainTab === 'function') this.activateMainTab('messier');
            this.showMessage('Jogo do Messier iniciado.', 'success');
        } else {
            this.showMessage('Não foi possível iniciar o jogo do Messier.', 'warning');
        }
        this.refreshMessierGameUI();
    }

    stopMessierGameFromUI() {
        this.clearAllMessages({ clearQueue: true, keepActive: false });
        if (typeof this.sftw.stopMessierGame !== 'function') {
            this.showMessage('Sistema do jogo Messier não disponível.', 'error');
            return;
        }
        const ok = this.sftw.stopMessierGame({ restoreVisible: true });
        if (ok) {
            this.showMessage('Jogo do Messier encerrado.', 'info');
        }
        this.refreshMessierGameUI();
    }

    applyMessierTargetFromUI() {
        const id = this._normalizeMessierIdInput(this.elements.messierTargetInput?.value || '');
        if (!id) {
            this.showMessage('Digite um Messier válido, por exemplo M31.', 'warning');
            return;
        }
        let ok = false;
        if (typeof this.sftw.setMessierGameTarget === 'function') {
            ok = !!this.sftw.setMessierGameTarget(id);
        }
        if (!ok && typeof this.sftw.setMessierGameOptions === 'function') {
            this.sftw.setMessierGameOptions({ targetId: id, manualTargetId: id });
            ok = true;
        }
        if (ok) {
            this.elements.messierTargetInput.value = id;
            this.showMessage(`Alvo do Messier definido: ${id}`, 'success', 1800);
        } else {
            this.showMessage(`Messier inválido: ${id}`, 'error');
        }
        this.refreshMessierGameUI();
    }

    focusMessierTargetFromUI() {
        const state = this.getCurrentMessierGameState();
        if (state?.active) {
            this.showMessage('O foco em Messier fica bloqueado durante a sessão do jogo.', 'warning', 1800, {
                replaceKey: 'messier-focus-lock',
                replaceActive: true,
                skipQueue: true
            });
            return;
        }

        const id = this._normalizeMessierIdInput(this.elements.messierTargetInput?.value || '')
            || this._normalizeMessierIdInput(state.targetId || '');
        if (!id) {
            this.showMessage('Nenhum alvo Messier definido para focar.', 'warning');
            return;
        }
        if (typeof this.sftw.focusOnMessier === 'function') {
            const ok = this.sftw.focusOnMessier(id);
            if (ok === false) {
                this.showMessage(`Não foi possível focar ${id}.`, 'error');
                return;
            }
            this.showMessage(`Focado em ${id}.`, 'info', 1800);
            return;
        }
        this.showMessage('Função de foco em Messier indisponível.', 'error');
    }

    getCurrentMessierGameState() {
        if (typeof this.sftw.getMessierGameState === 'function') {
            const state = this.sftw.getMessierGameState();
            if (state && typeof state === 'object') return state;
        }
        return {
            active: false,
            finished: false,
            targetId: null,
            manualTargetId: null,
            randomOrder: !!this.elements.messierRandomOrder?.checked,
            autoAdvance: !!this.elements.messierAutoAdvance?.checked,
            showErrorHint: !!this.elements.messierShowErrorHint?.checked,
            toleranceDeg: Number(this.elements.messierToleranceDeg?.value || 1.2),
            totalErrors: 0,
            errorsById: {},
            discovered: [],
            discoveredCount: 0,
            remainingCount: 0,
            totalCount: 110,
            lastAngleErrorDeg: null,
            startedAt: 0
        };
    }

    onMessierGameStateChanged(state) {
        this.refreshMessierGameUI(state);
    }

    refreshMessierGameUI(state = null) {
        state = state || this.getCurrentMessierGameState();

        if (this.elements.messierRandomOrder) this.elements.messierRandomOrder.checked = !!state.randomOrder;
        if (this.elements.messierAutoAdvance) this.elements.messierAutoAdvance.checked = !!state.autoAdvance;
        if (this.elements.messierShowErrorHint) this.elements.messierShowErrorHint.checked = !!state.showErrorHint;
        if (this.elements.messierToleranceDeg && Number.isFinite(Number(state.toleranceDeg))) {
            this.elements.messierToleranceDeg.value = Number(state.toleranceDeg).toFixed(1).replace(/\.0$/, '.0');
        }
        const preferredTarget = state.manualTargetId || state.targetId || this._normalizeMessierIdInput(this.elements.messierTargetInput?.value || '');
        if (this.elements.messierTargetInput && preferredTarget) {
            this.elements.messierTargetInput.value = preferredTarget;
        }

        if (this.elements.messierGameStatusPill) {
            this.elements.messierGameStatusPill.textContent = state.active ? (state.finished ? 'Concluído' : 'Ativo') : 'Inativo';
        }
        if (this.elements.messierGameTargetBadge) {
            this.elements.messierGameTargetBadge.textContent = state.targetId ? `Alvo ${state.targetId}` : (state.finished ? 'Concluído' : 'Sem alvo');
        }
        if (this.elements.messierGameTarget) this.elements.messierGameTarget.textContent = state.targetId || '—';
        if (this.elements.messierGameProgress) this.elements.messierGameProgress.textContent = `${state.discoveredCount}/${state.totalCount}`;
        if (this.elements.messierGameErrors) this.elements.messierGameErrors.textContent = String(state.totalErrors || 0);

        const pct = state.totalCount > 0 ? (state.discoveredCount / state.totalCount) * 100 : 0;
        if (this.elements.messierGameProgressLabel) this.elements.messierGameProgressLabel.textContent = `${pct.toFixed(0)}%`;
        if (this.elements.messierGameProgressBar) this.elements.messierGameProgressBar.style.width = `${pct}%`;

        if (this.elements.messierLastError) {
            this.elements.messierLastError.textContent = (state.lastAngleErrorDeg == null)
                ? 'Último erro: —'
                : `Último erro: ${Number(state.lastAngleErrorDeg).toFixed(2)}°`;
        }

        if (this.elements.messierDiscoveredList) {
            const discovered = Array.isArray(state.discovered) ? state.discovered.slice() : [];
            if (!discovered.length) {
                this.elements.messierDiscoveredList.innerHTML = '<div class="sftw-help">Nenhum Messier descoberto ainda.</div>';
            } else {
                this.elements.messierDiscoveredList.innerHTML = discovered
                    .map(id => `<div class="sftw-progress-item discovered"><span>✅</span><span>${id}</span><span style="margin-left:auto; opacity:0.7;">erros: ${Number(state.errorsById?.[id] || 0)}</span></div>`)
                    .join('');
            }
        }

        const messierPlaying = !!state.active;
        this.setContextControlLock(this.gameUIState === 'playing', messierPlaying);

        if (this.elements.toggleMessier) {
            this.elements.toggleMessier.disabled = messierPlaying;
        }
        if (this.elements.btnStartMessierGame) this.elements.btnStartMessierGame.disabled = messierPlaying || this.gameUIState === 'playing';
        if (this.elements.btnStopMessierGame) this.elements.btnStopMessierGame.disabled = !messierPlaying;
        if (this.elements.btnFocusMessierTarget) this.elements.btnFocusMessierTarget.disabled = messierPlaying;
        if (this.elements.btnApplyMessierTarget) this.elements.btnApplyMessierTarget.disabled = messierPlaying;

        const shouldShowMessierErrorToast =
            !!state.active &&
            !!state.showErrorHint &&
            state.lastAngleErrorDeg != null &&
            Number(state.totalErrors || 0) > 0;

        if (!shouldShowMessierErrorToast) {
            this._lastMessierErrorSignature = null;
        } else {
            const sig = `${Number(state.totalErrors || 0)}|${state.targetId || ''}|${Number(state.lastAngleErrorDeg).toFixed(4)}`;
            if (sig !== this._lastMessierErrorSignature) {
                const targetText = state.targetId ? ` em ${state.targetId}` : '';
                this.showMessage(`Erro${targetText}: ${Number(state.lastAngleErrorDeg).toFixed(2)}°`, 'error', 1300, {
                    replaceKey: 'messier-error',
                    replaceActive: true,
                    skipQueue: true
                });
                this._lastMessierErrorSignature = sig;
            }
        }
    }

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
        if (typeof this.activateMainTab === 'function') this.activateMainTab('constellations');

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
        const state = this.gameUIState || 'idle';

        const startBtn = this.elements.btnStartGame;
        const endBtn = this.elements.btnEndGame;
        const statusEl = this.elements.gameStatus;

        if (startBtn) {
            startBtn.style.display = (state === 'playing' || state === 'selecting') ? 'none' : '';
        }

        if (endBtn) {
            endBtn.style.display = (state === 'playing' || state === 'selecting') ? '' : 'none';
        }

        if (statusEl) {
            if (state === 'playing') statusEl.textContent = 'Jogando';
            else if (state === 'selecting') statusEl.textContent = 'Selecionando';
            else if (state === 'completed') statusEl.textContent = 'Concluído';
            else statusEl.textContent = 'Pronto';
        }
    }


    setContextControlLock(locked, messierLocked = false) {
        const effectiveLocked = !!locked || !!messierLocked;
        const groups = document.querySelectorAll('[data-lock-group="explore-controls"]');
        groups.forEach(group => {
            group.classList.toggle('is-locked', effectiveLocked);
            group.querySelectorAll('input, button').forEach(el => {
                el.disabled = effectiveLocked;
            });
        });

        const hintId = 'sftw-context-lock-hint';
        let hint = document.getElementById(hintId);

        if (effectiveLocked) {
            if (!hint) {
                hint = document.createElement('div');
                hint.id = hintId;
                hint.className = 'sftw-context-hint';
                const firstPanel = document.querySelector('[data-panel="explore"]');
                if (firstPanel) firstPanel.prepend(hint);
            }
            hint.textContent = locked
                ? 'Controles do modo livre bloqueados durante o jogo das constelações.'
                : 'Controles do modo livre bloqueados durante o jogo do Messier.';
            if (typeof this.activateMainTab === 'function' && this.activeMainTab === 'explore') {
                this.activateMainTab(locked ? 'constellations' : 'messier');
            }
        } else if (hint) {
            hint.remove();
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

    showMessage(message, type = 'info', duration = 3000, options = {}) {
        console.log(`💬 ${type}: ${typeof message === 'string' ? message : 'Message object'}`);

        const opts = options && typeof options === 'object' ? options : {};
        const replaceKey = opts.replaceKey || null;
        const replaceActive = !!opts.replaceActive;
        const skipQueue = !!opts.skipQueue;

        if (replaceKey) {
            this.messageQueue = this.messageQueue.filter(item => item?.replaceKey !== replaceKey);

            if (this.activeMessage && this.activeMessage.dataset?.messageKey === replaceKey) {
                this.removeMessage(this.activeMessage, { immediate: true, suppressQueue: true });
            } else if (replaceActive && this.activeMessage) {
                this.removeMessage(this.activeMessage, { immediate: true, suppressQueue: true });
            }

            this.displayMessage(message, type, duration, { replaceKey });
            return;
        }

        if (this.activeMessage) {
            if (replaceActive) {
                this.removeMessage(this.activeMessage, { immediate: true, suppressQueue: true });
                this.displayMessage(message, type, duration, {});
                return;
            }

            if (!skipQueue) {
                this.messageQueue = [{ message, type, duration, replaceKey: null }];
            }
            return;
        }

        this.displayMessage(message, type, duration, {});
    }

    displayMessage(message, type, duration, options = {}) {
        const messageEl = document.createElement('div');
        messageEl.className = `system-message ${type}`;
        if (options.replaceKey) {
            messageEl.dataset.messageKey = String(options.replaceKey);
        }

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

        messageEl.innerHTML = `${icon} ${messageEl.innerHTML}`;

        document.body.appendChild(messageEl);
        this.activeMessage = messageEl;

        this.activeMessageTimer = setTimeout(() => {
            this.removeMessage(messageEl);
        }, duration);
    }

    removeMessage(messageEl, options = {}) {
        if (!messageEl) return;

        const opts = options && typeof options === 'object' ? options : {};
        const immediate = !!opts.immediate;
        const suppressQueue = !!opts.suppressQueue;

        if (this.activeMessageTimer) {
            clearTimeout(this.activeMessageTimer);
            this.activeMessageTimer = null;
        }

        if (immediate) {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
            if (this.activeMessage === messageEl) {
                this.activeMessage = null;
            }

            if (!suppressQueue && this.messageQueue.length > 0) {
                const next = this.messageQueue.shift();
                this.displayMessage(next.message, next.type, next.duration, { replaceKey: next.replaceKey || null });
            }
            return;
        }

        if (!messageEl.parentNode) return;

        messageEl.style.animation = 'messageSlideOut 0.3s ease';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
            if (this.activeMessage === messageEl) {
                this.activeMessage = null;
            }

            if (!suppressQueue && this.messageQueue.length > 0) {
                const next = this.messageQueue.shift();
                this.displayMessage(next.message, next.type, next.duration, { replaceKey: next.replaceKey || null });
            }
        }, 300);
    }

    clearAllMessages(options = {}) {
        const clearQueue = options.clearQueue !== false;
        const keepActive = !!options.keepActive;
        if (clearQueue) this.messageQueue = [];
        if (!keepActive && this.activeMessage) {
            this.removeMessage(this.activeMessage, { immediate: true, suppressQueue: true });
        }
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
            .sftw-neighbor-answer-area,
            .sftw-neighbor-result-area{
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 12px;
                background: rgba(255,255,255,0.03);
                padding: 12px;
            }
            .sftw-neighbor-grid{
                display:grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }
            .sftw-neighbor-cell{
                min-width: 0;
            }
            .sftw-neighbor-tags{
                display:flex;
                flex-wrap:wrap;
                gap: 8px;
                margin-top: 8px;
            }
            .sftw-neighbor-tag{
                display:inline-flex;
                align-items:center;
                gap: 6px;
                padding: 8px 10px;
                border-radius: 999px;
                border: 1px solid rgba(255,255,255,0.12);
                font-size: 12px;
                font-weight: 700;
                color: rgba(235,248,255,0.95);
            }
            .sftw-neighbor-tag.ok{ background: rgba(76,175,80,0.18); border-color: rgba(76,175,80,0.35); }
            .sftw-neighbor-tag.bad{ background: rgba(244,67,54,0.18); border-color: rgba(244,67,54,0.35); }
            .sftw-neighbor-tag.miss{ background: rgba(255,152,0,0.18); border-color: rgba(255,152,0,0.35); }
            .sftw-neighbor-result-block{
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 12px;
                background: rgba(255,255,255,0.03);
                padding: 10px;
            }

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

            .sftw-panel-footer{
                padding: 0 14px 14px 14px;
            }

            .sftw-tabs{
                padding: 0 14px;
                display:grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
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
                padding: 0 14px 0 14px;
                overflow: auto;
                max-height: calc(100vh - 300px);
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
            .sftw-card-intro{
                background: linear-gradient(180deg, rgba(62,92,150,0.14), rgba(255,255,255,0.03));
            }
            .sftw-card-note{
                border-style: dashed;
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
            .sftw-help-tight{
                margin-top: 0;
            }
            .muted{ color: rgba(205,220,240,0.72); }
            .sftw-bulletlist{
                display:flex;
                flex-direction:column;
                gap: 8px;
                color: rgba(225,238,255,0.88);
                font-size: 13px;
            }
            .sftw-context-hint{
                margin: 0 14px 12px 14px;
                border: 1px solid rgba(255,210,110,0.18);
                background: rgba(255,210,110,0.08);
                color: rgba(255,236,190,0.95);
                border-radius: 12px;
                padding: 10px 12px;
                font-size: 12px;
                line-height: 1.35;
            }

            .sftw-row{
                display:flex;
                gap: 10px;
                align-items: center;
            }
            .sftw-row-wrap{
                flex-wrap: wrap;
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

            @media (max-width: 900px){
                .module-content{
                    flex-direction: column !important;
                    gap: 10px !important;
                    min-height: auto !important;
                }
                .module-controls{
                    width: 100% !important;
                    min-width: 0 !important;
                    max-width: none !important;
                    order: 0 !important;
                    padding: 8px !important;
                }
                .sftw-left-panel{
                    border-radius: 14px;
                    gap: 10px;
                }
                .sftw-brand{
                    padding: 12px 12px 4px 12px;
                }
                .sftw-title{
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .sftw-title-text{
                    font-size: 15px;
                }
                .sftw-subtitle{
                    font-size: 11px;
                }
                .sftw-tabs{
                    padding: 0 12px;
                    gap: 6px;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .sftw-tab{
                    min-height: 46px;
                    padding: 10px 8px;
                    font-size: 12px;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                }
                .sftw-tabpanel{
                    padding: 0 12px 0 12px;
                    max-height: none;
                }
                .sftw-card{
                    padding: 11px;
                    margin-top: 10px;
                }
                .sftw-row{
                    flex-wrap: wrap;
                }
                .sftw-row > *{
                    flex: 1 1 100%;
                    min-width: 0;
                }
                .sftw-btn-wide{
                    flex: 1 1 100%;
                }
                .sftw-stats{
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 8px;
                }
                .sftw-neighbor-grid{
                    grid-template-columns: 1fr;
                }
                .sftw-panel-footer{
                    padding: 0 12px 12px 12px;
                }
                .sftw-input{
                    min-height: 46px;
                    font-size: 16px;
                }
                .sftw-btn,
                .sftw-linkbtn,
                .sftw-chip{
                    min-height: 46px;
                    touch-action: manipulation;
                }
            }

            @media (max-width: 560px){
                .sftw-tabs{
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .sftw-tab{
                    min-height: 48px;
                    font-size: 11px;
                    gap: 6px;
                    padding: 10px 6px;
                }
                .sftw-card-title{
                    font-size: 12px;
                }
                .sftw-help,
                .sftw-toggle,
                .sftw-progress-item{
                    font-size: 12px;
                }
                .sftw-stats{
                    grid-template-columns: 1fr;
                }
                .sftw-pill,
                .muted{
                    font-size: 11px;
                }
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
        
        if (this._mobileResizeHandler) {
            window.removeEventListener('resize', this._mobileResizeHandler);
            this._mobileResizeHandler = null;
        }
        if (window.visualViewport && this._mobileViewportHandler) {
            window.visualViewport.removeEventListener('resize', this._mobileViewportHandler);
            window.visualViewport.removeEventListener('scroll', this._mobileViewportHandler);
            this._mobileViewportHandler = null;
        }

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
            showDiscoveredFill: this.elements.optShowDiscoveredFill ? !!this.elements.optShowDiscoveredFill.checked : true,
            game1ShowBoundaries: this.elements.game1ShowBoundaries ? !!this.elements.game1ShowBoundaries.checked : true,
            game1ShowLabels: this.elements.game1ShowLabels ? !!this.elements.game1ShowLabels.checked : false
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

        const discovered = this.getPrimaryGameController()?.state?.discovered;
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
            sftwInstance.showMessage = function(message, type, duration, options) {
                return ui.showMessage(message, type, duration, options);
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