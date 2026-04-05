// Sftw1_UI_Games.js
// Módulo 1 da divisão da UI
// Responsabilidade: tudo que é sessão de jogo / HUD / callbacks / modais de seleção
//
// Estratégia desta etapa:
// - NÃO substituir o Sftw1_UI.js atual ainda
// - NÃO alterar Loader/Core ainda
// - entregar um módulo novo, isolado, que concentra a lógica dos jogos
// - no próximo passo, Sftw1_UI.js passa a delegar para este módulo
//
// Assim, o risco de regressão nesta etapa é mínimo: este arquivo apenas adiciona
// uma camada reutilizável e não desmonta a UI atual antes da hora.

(function () {
    'use strict';

    class Sftw1_UIGames {
        constructor(ui) {
            this.ui = ui;
            this.sftw = ui?.sftw || null;
            this._callbacksConnected = false;
        }

        // ============================================
        // HELPERS / CONTROLLERS
        // ============================================

        getPrimaryGameController() {
            return this.sftw?.games?.constellation || this.sftw?.game || null;
        }

        isPrimaryGameActive() {
            const game = this.getPrimaryGameController();
            return !!(game && game.state && game.state.active);
        }

        getNeighborGameController() {
            return this.sftw?.games?.neighbor || this.sftw?.neighborGame || null;
        }

        _safeActivateGamesTab() {
            if (typeof this.ui?.activateMainTab === 'function') {
                this.ui.activateMainTab('games');
            }
        }

        _formatClock(totalSeconds) {
            const n = Number(totalSeconds || 0);
            if (!Number.isFinite(n) || n < 0) return '00:00';
            const whole = Math.floor(n);
            const mm = Math.floor(whole / 60);
            const ss = whole % 60;
            return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        }

        _bindElementEventOnce(element, eventName, bindKey, handler) {
            if (!element || typeof element.addEventListener !== 'function' || typeof handler !== 'function') return false;
            const key = bindKey || `${eventName}Bound`;
            if (element.dataset?.[key]) return false;
            element.addEventListener(eventName, handler);
            if (element.dataset) element.dataset[key] = '1';
            return true;
        }


        _escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        _buildAsterismSolvedEntries(state = null) {
            const s = state || {};
            const discoveredIds = Array.isArray(s?.discovered) ? s.discovered.map((id) => String(id || '').trim()).filter(Boolean) : [];
            const discoveredSet = new Set(discoveredIds);
            const bestResults = (s && typeof s.bestResultsById === 'object' && s.bestResultsById) ? s.bestResultsById : {};
            const history = Array.isArray(s?.history) ? s.history : [];
            const ordered = [];
            const byId = new Map();

            for (const item of history) {
                if (!item?.isPerfect) continue;
                const targetId = String(item?.targetId || item?.asterismId || '').trim();
                if (!targetId || byId.has(targetId)) continue;

                const entry = {
                    targetId,
                    name: item?.targetNamePt || item?.targetName || item?.asterismName || targetId,
                    order: Number(item?.order || ordered.length + 1),
                    attempts: Number(item?.attempts || item?.roundSubmissionCount || bestResults?.[targetId]?.attempts || 1),
                    roundElapsedMs: Number(item?.roundElapsedMs || bestResults?.[targetId]?.roundElapsedMs || 0),
                    source: 'history'
                };

                byId.set(targetId, entry);
                ordered.push(entry);
            }

            for (const targetId of discoveredIds) {
                if (byId.has(targetId)) continue;
                const best = bestResults?.[targetId] || {};
                const fallback = {
                    targetId,
                    name: targetId,
                    order: ordered.length + 1,
                    attempts: Number(best?.attempts || 1),
                    roundElapsedMs: Number(best?.roundElapsedMs || 0),
                    source: 'discovered'
                };
                byId.set(targetId, fallback);
                ordered.push(fallback);
            }

            return ordered
                .filter((entry) => discoveredSet.has(entry.targetId))
                .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        }

        _getConstellationGameplayOptionsFromUI() {
            const namesMain = this.ui.elements.optShowDiscoveredNames;
            const namesSecondary = this.ui.elements.game1ShowLabels;
            const fillToggle = this.ui.elements.optShowDiscoveredFill;
            const boundsToggle = this.ui.elements.game1ShowBoundaries;
            const progressToggle = this.ui.elements.optShowProgress;

            const showDiscoveredNames = namesMain
                ? !!namesMain.checked
                : !!namesSecondary?.checked;

            return {
                showDiscoveredNames,
                showDiscoveredFill: fillToggle ? !!fillToggle.checked : true,
                showProgress: progressToggle ? !!progressToggle.checked : true,
                game1ShowBoundaries: boundsToggle ? !!boundsToggle.checked : true,
                game1ShowLabels: namesSecondary ? !!namesSecondary.checked : showDiscoveredNames
            };
        }

        _refreshVisualizationGameOptions(force = false) {
            const vis = this.sftw?.visualization;
            if (!vis) return;

            const opts = this._getConstellationGameplayOptionsFromUI();

            try {
                if (typeof vis.setGameOptions === 'function') {
                    vis.setGameOptions(opts);
                } else {
                    vis.gameOptions = {
                        ...(vis.gameOptions || {}),
                        ...opts
                    };
                }
            } catch (err) {
                console.warn('⚠️ UIGames: falha ao sincronizar opções visuais do jogo 1:', err);
            }

            if (!force) return;

            try { vis._syncFillVisibilityForGame?.(); } catch {}
            try { vis._syncLabelsVisibilityForGame?.(); } catch {}
            try { vis._syncBoundaryVisibilityForGame?.(); } catch {}
        }

        _setupConstellationGameplayOptionBindings() {
            const namesMain = this.ui.elements.optShowDiscoveredNames;
            const namesDuplicate = this.ui.elements.game1ShowLabels;
            const fillToggle = this.ui.elements.optShowDiscoveredFill;
            const boundsToggle = this.ui.elements.game1ShowBoundaries;

            if (namesMain && namesDuplicate) {
                const syncBoth = (source = null) => {
                    const checked = source === namesDuplicate
                        ? !!namesDuplicate.checked
                        : !!namesMain.checked;
                    namesMain.checked = checked;
                    namesDuplicate.checked = checked;
                    this._refreshVisualizationGameOptions(true);
                };

                if (!namesMain.dataset.gameplayBound) {
                    namesMain.addEventListener('change', () => syncBoth(namesMain));
                    namesMain.dataset.gameplayBound = '1';
                }
                if (!namesDuplicate.dataset.gameplayBound) {
                    namesDuplicate.addEventListener('change', () => syncBoth(namesDuplicate));
                    namesDuplicate.dataset.gameplayBound = '1';
                }

                syncBoth(namesMain);

                const duplicateRow = namesDuplicate.closest('.sftw-toggle') || namesDuplicate.closest('label') || namesDuplicate.parentElement;
                if (duplicateRow && !duplicateRow.dataset.uiGamesMerged) {
                    duplicateRow.style.display = 'none';
                    duplicateRow.dataset.uiGamesMerged = '1';
                }
            }

            if (fillToggle && !fillToggle.dataset.gameplayBound) {
                fillToggle.addEventListener('change', () => this._refreshVisualizationGameOptions(true));
                fillToggle.dataset.gameplayBound = '1';
            }
            if (boundsToggle && !boundsToggle.dataset.gameplayBound) {
                boundsToggle.addEventListener('change', () => this._refreshVisualizationGameOptions(true));
                boundsToggle.dataset.gameplayBound = '1';
            }
        }

        _resetNeighborSessionVisualState() {
            clearTimeout(this.ui._neighborAutoAdvanceTimer);
            if (this.ui.elements.neighborAnswerArea) {
                this.ui.elements.neighborAnswerArea.innerHTML = '<div class="sftw-help">Ao iniciar, as respostas aparecem aqui.</div>';
            }
            if (this.ui.elements.neighborResultArea) {
                this.ui.elements.neighborResultArea.innerHTML = '<div class="sftw-help">Depois da correção, aparecem aqui os acertos, erros e faltantes.</div>';
            }
            if (this.ui.elements.neighborCurrentTarget) this.ui.elements.neighborCurrentTarget.textContent = '—';
            if (this.ui.elements.neighborExpectedCount) this.ui.elements.neighborExpectedCount.textContent = '—';
            if (this.ui.elements.neighborRoundTimer) this.ui.elements.neighborRoundTimer.textContent = '00:00';
            if (this.ui.elements.neighborStatusPill) this.ui.elements.neighborStatusPill.textContent = 'Inativo';
        }

        _ensureMessierSessionUI() {
            const host = this.ui.elements.messierGameTarget?.closest('.sftw-stats');
            if (!host) return;
            if (!document.getElementById('messier-game-session-time')) {
                const block = document.createElement('div');
                block.className = 'sftw-stat';
                block.innerHTML = '<div class="k">Tempo da sessão</div><div class="v" id="messier-game-session-time">00:00</div>';
                host.appendChild(block);
            }
            if (!document.getElementById('messier-game-target-time')) {
                const block = document.createElement('div');
                block.className = 'sftw-stat';
                block.innerHTML = '<div class="k">Tempo do alvo</div><div class="v" id="messier-game-target-time">00:00</div>';
                host.appendChild(block);
            }
            this.ui.elements.messierGameSessionTime = document.getElementById('messier-game-session-time');
            this.ui.elements.messierGameTargetTime = document.getElementById('messier-game-target-time');
        }

        _startMessierHudTimer() {
            this._stopMessierHudTimer();
            this.ui._messierHudTimer = setInterval(() => this.refreshMessierGameUI(), 250);
        }

        _stopMessierHudTimer() {
            if (this.ui._messierHudTimer) {
                clearInterval(this.ui._messierHudTimer);
                this.ui._messierHudTimer = null;
            }
        }

        _resetMessierSessionTracking() {
            this.ui._messierDiscoveredMeta = [];
            this.ui._messierTargetStartedAt = 0;
            this.ui._messierCurrentTrackedTarget = null;
        }

        _ensureAsterismSessionUI() {
            const host = this.ui.elements.asterismGameTarget?.closest('.sftw-stats');
            if (!host) return;

            if (!document.getElementById('asterism-game-session-time')) {
                const block = document.createElement('div');
                block.className = 'sftw-stat';
                block.innerHTML = '<div class="k">Tempo da sessão</div><div class="v" id="asterism-game-session-time">00:00</div>';
                host.appendChild(block);
            }
            if (!document.getElementById('asterism-game-target-time')) {
                const block = document.createElement('div');
                block.className = 'sftw-stat';
                block.innerHTML = '<div class="k">Tempo do alvo</div><div class="v" id="asterism-game-target-time">00:00</div>';
                host.appendChild(block);
            }
            if (!document.getElementById('asterism-game-attempts')) {
                const block = document.createElement('div');
                block.className = 'sftw-stat';
                block.innerHTML = '<div class="k">Tentativas</div><div class="v" id="asterism-game-attempts">0</div>';
                host.appendChild(block);
            }

            this.ui.elements.asterismGameSessionTime = document.getElementById('asterism-game-session-time');
            this.ui.elements.asterismGameTargetTime = document.getElementById('asterism-game-target-time');
            this.ui.elements.asterismGameAttempts = document.getElementById('asterism-game-attempts');
        }

        _startAsterismHudTimer() {
            this._stopAsterismHudTimer();
            this.ui._asterismHudTimer = setInterval(() => this.refreshAsterismGameUI(), 250);
        }

        _stopAsterismHudTimer() {
            if (this.ui._asterismHudTimer) {
                clearInterval(this.ui._asterismHudTimer);
                this.ui._asterismHudTimer = null;
            }
        }

        _resetAsterismSessionTracking() {
            this.ui._asterismSolvedOrder = [];
        }

        _trackMessierState(state) {
            if (!state || typeof state !== 'object') return;
            const targetId = state.targetId || null;
            if (state.active && targetId && targetId !== this.ui._messierCurrentTrackedTarget) {
                this.ui._messierCurrentTrackedTarget = targetId;
                this.ui._messierTargetStartedAt = Date.now();
            }
            if (!state.active) {
                this.ui._messierCurrentTrackedTarget = null;
                this.ui._messierTargetStartedAt = 0;
            }
        }

        _recordMessierHit(payload) {
            const targetId = payload?.targetId || payload?.hitId || null;
            if (!targetId) return;
            const elapsedMs = Math.max(0, Date.now() - Number(this.ui._messierTargetStartedAt || Date.now()));
            const errors = Number(payload?.state?.errorsById?.[targetId] || payload?.errorsById?.[targetId] || 0);
            const idx = (this.ui._messierDiscoveredMeta || []).findIndex((item) => item.id === targetId);
            const entry = { id: targetId, elapsedMs, errors, order: (this.ui._messierDiscoveredMeta?.length || 0) + 1 };
            if (idx >= 0) {
                this.ui._messierDiscoveredMeta[idx] = { ...this.ui._messierDiscoveredMeta[idx], ...entry };
            } else {
                this.ui._messierDiscoveredMeta = this.ui._messierDiscoveredMeta || [];
                this.ui._messierDiscoveredMeta.push(entry);
            }
        }

        getCurrentNeighborGameState() {
            if (typeof this.sftw?.getNeighborGameState === 'function') {
                const state = this.sftw.getNeighborGameState();
                if (state && typeof state === 'object') return state;
            }

            return {
                active: false,
                finished: false,
                difficulty: this.ui.elements.neighborDifficulty?.value || 'easy',
                sequenceMode: this.ui.elements.neighborSequenceMode?.value || 'selected',
                autoAdvance: !!this.ui.elements.neighborAutoAdvance?.checked,
                visualMode: this.ui.elements.neighborVisualMode?.value || 'normal',
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

        getCurrentMessierGameState() {
            if (typeof this.sftw?.getMessierGameState === 'function') {
                const state = this.sftw.getMessierGameState();
                if (state && typeof state === 'object') return state;
            }

            return {
                active: false,
                finished: false,
                targetId: null,
                manualTargetId: null,
                randomOrder: !!this.ui.elements.messierRandomOrder?.checked,
                autoAdvance: !!this.ui.elements.messierAutoAdvance?.checked,
                showErrorHint: !!this.ui.elements.messierShowErrorHint?.checked,
                toleranceDeg: Number(this.ui.elements.messierToleranceDeg?.value || 1.2),
                totalErrors: 0,
                errorsById: {},
                discovered: [],
                discoveredCount: 0,
                remainingCount: 0,
                totalCount: 110,
                progress: 0,
                lastAngleErrorDeg: null,
                startedAt: 0,
                elapsedMs: 0
            };
        }

        getCurrentAsterismGameState() {
            if (typeof this.sftw?.getAsterismGameState === 'function') {
                const state = this.sftw.getAsterismGameState();
                if (state && typeof state === 'object') return state;
            }

            return {
                active: false,
                finished: false,
                currentAsterismId: null,
                manualTargetId: null,
                randomOrder: !!this.ui.elements.asterismGameRandomOrder?.checked,
                autoAdvance: !!this.ui.elements.asterismGameAutoAdvance?.checked,
                totalSubmissions: 0,
                perfectCount: 0,
                totalMissingSegments: 0,
                totalExtraSegments: 0,
                discoveredCount: 0,
                totalCount: 0,
                progress: 0,
                startedAt: 0,
                elapsedMs: 0,
                roundStartedAt: 0,
                roundElapsedMs: 0,
                currentTarget: null,
                lastResult: null,
                history: []
            };
        }

        // ============================================
        // CALLBACKS / INTEGRAÇÃO COM CORE
        // ============================================

        connectWithGameModule() {
            console.log('🔗 UIGames: conectando UI com módulos de jogo...');

            if (this._callbacksConnected) {
                console.log('ℹ️ UIGames: callbacks já estavam conectados; pulando novo bind');
                return;
            }

            if (this.sftw?.registerCallback) {
                // ---------- Jogo principal (constelações) ----------
                this.sftw.registerCallback('onGameStart', (constellationAbbr) => {
                    this.ui.gameUIState = 'playing';
                    this.ui.updateGameUIState?.();
                    this.onGameStarted(constellationAbbr);
                });

                this.sftw.registerCallback('onConstellationDiscovered', (abbreviation, attempts) => {
                    if (abbreviation && typeof abbreviation === 'object') {
                        this.onConstellationDiscovered(abbreviation.abbr, abbreviation.attempts, abbreviation.points);
                    } else {
                        this.onConstellationDiscovered(abbreviation, attempts);
                    }
                });

                this.sftw.registerCallback('onGameEnd', (result) => {
                    this.ui.gameUIState = 'completed';
                    this.ui.updateGameUIState?.();
                    this.onGameCompleted(result);
                });

                this.sftw.registerCallback('onWrongAnswer', (abbreviation, input) => {
                    if (abbreviation && typeof abbreviation === 'object') {
                        this.onWrongAnswer(abbreviation.targetAbbr, abbreviation.input);
                    } else {
                        this.onWrongAnswer(abbreviation, input);
                    }
                });

                this.sftw.registerCallback('onCorrectAnswer', (payloadOrAbbr) => {
                    const abbr = (payloadOrAbbr && typeof payloadOrAbbr === 'object')
                        ? (payloadOrAbbr.targetAbbr || payloadOrAbbr.matched || '')
                        : payloadOrAbbr;

                    if (abbr) {
                        const abbrLabel = String(abbr || '').trim();
                        const ptName = (typeof this.sftw?.getConstellationNamePt === 'function')
                            ? this.sftw.getConstellationNamePt(abbrLabel)
                            : abbrLabel;

                        this.ui.showMessage?.(`Correto: ${ptName} (${abbrLabel})`, 'success', 1400, {
                            replaceKey: 'constellation-correct',
                            replaceActive: true,
                            skipQueue: true
                        });
                    }
                });

                this.sftw.registerCallback('onGameStateChange', (gameState) => {
                    this.sftw.gameState = gameState || {};

                    if (gameState?.active || gameState?.isGameActive || gameState?.status === 'playing') {
                        this.ui.gameUIState = 'playing';
                    } else if (gameState?.finished || gameState?.status === 'completed') {
                        this.ui.gameUIState = 'completed';
                    } else if (gameState?.status === 'selecting') {
                        this.ui.gameUIState = 'selecting';
                    } else {
                        this.ui.gameUIState = 'idle';
                    }

                    this.ui.updateGameUIState?.();
                    this.ui.updateGameStats?.(gameState || {});

                    if (this.ui.gameUIState === 'playing' || this.ui.gameUIState === 'completed') {
                        this._syncChecklistFromGameState(gameState || {}, { reset: false });
                        this.ui.setProgressPanelVisible?.(!!this.ui.elements.optShowProgress?.checked);
                    }
                });

                // ---------- Messier ----------
                const handleMessierState = (state) => {
                    this._trackMessierState(state || null);
                    this.onMessierGameStateChanged(state || null);
                };

                this.sftw.registerCallback('onMessierGameStateChange', handleMessierState);
                this.sftw.registerCallback('onMessierGameStateChanged', handleMessierState);
                this.sftw.registerCallback('onMessierGameStart', handleMessierState);
                this.sftw.registerCallback('onMessierGameEnd', handleMessierState);

                this.sftw.registerCallback('onMessierGameHit', (payload) => {
                    this._recordMessierHit(payload || null);
                    if (payload?.message) {
                        this.ui.showMessage?.(payload.message, 'success', 1800, {
                            replaceKey: 'messier-hit',
                            replaceActive: true,
                            skipQueue: true
                        });
                    }
                    handleMessierState(payload?.state || null);
                });

                this.sftw.registerCallback('onMessierGameMiss', (payload) => {
                    if (payload?.message) {
                        this.ui.showMessage?.(payload.message, 'warning', 2200, {
                            replaceKey: 'messier-miss',
                            replaceActive: true,
                            skipQueue: true
                        });
                    }
                    handleMessierState(payload?.state || null);
                });

                // ---------- NeighborGame ----------
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

                this.sftw.registerCallback('onNeighborGameCancelled', () => {
                    this.restoreNeighborVisualMode?.();
                    this._resetNeighborSessionVisualState();
                    this.refreshNeighborTrainingUI();
                });

                // ---------- AsterismGame ----------
                const handleAsterismState = (state) => {
                    this.refreshAsterismGameUI(state || null);
                };

                this.sftw.registerCallback('onAsterismGameStateChange', handleAsterismState);
                this.sftw.registerCallback('onAsterismGameStateChanged', handleAsterismState);

                this.sftw.registerCallback('onAsterismGameStart', (state) => {
                    this._resetAsterismSessionTracking();
                    this._startAsterismHudTimer();
                    handleAsterismState(state || null);
                });

                this.sftw.registerCallback('onAsterismRoundStart', (payload) => {
                    handleAsterismState(this.sftw?.getAsterismGameState?.() || payload || null);
                    if (payload?.namePt || payload?.name || payload?.id) {
                        const targetName = payload?.namePt || payload?.name || payload?.id;
                        this.ui.showMessage?.(`Novo alvo: ${targetName}`, 'info', 1200, {
                            replaceKey: 'asterism-target',
                            replaceActive: true,
                            skipQueue: true
                        });
                    }
                });

                this.sftw.registerCallback('onAsterismRoundSubmitted', (payload) => {
                    handleAsterismState(this.sftw?.getAsterismGameState?.() || payload?.state || null);
                });

                this.sftw.registerCallback('onAsterismGameHit', (payload) => {
                    handleAsterismState(this.sftw?.getAsterismGameState?.() || payload?.state || null);
                    const targetName = payload?.targetNamePt || payload?.targetName || payload?.targetId || 'Asterismo';
                    this.ui._asterismSolvedOrder = this.ui._asterismSolvedOrder || [];
                    if (!this.ui._asterismSolvedOrder.includes(targetName)) {
                        this.ui._asterismSolvedOrder.push(targetName);
                    }
                    this.ui.showMessage?.(`Correto: ${targetName} — salvo no céu.`, 'success', 1800, {
                        replaceKey: 'asterism-submit',
                        replaceActive: true,
                        skipQueue: true
                    });
                });

                this.sftw.registerCallback('onAsterismGameMiss', (payload) => {
                    handleAsterismState(this.sftw?.getAsterismGameState?.() || payload?.state || null);
                    const missing = Number(payload?.missingSegmentsCount ?? 0);
                    const extra = Number(payload?.extraSegmentsCount ?? 0);
                    const bits = [];
                    if (missing > 0) bits.push(`${missing} faltando`);
                    if (extra > 0) bits.push(`${extra} extras`);
                    this.ui.showMessage?.(`Ainda não foi.${bits.length ? ' ' + bits.join(' • ') : ''}`, 'warning', 1800, {
                        replaceKey: 'asterism-submit',
                        replaceActive: true,
                        skipQueue: true
                    });
                });

                this.sftw.registerCallback('onAsterismGameCancelled', () => {
                    this._stopAsterismHudTimer();
                    handleAsterismState(null);
                });

                this.sftw.registerCallback('onAsterismGameEnd', (report) => {
                    this._stopAsterismHudTimer();
                    handleAsterismState(report || null);
                    if (report) {
                        const total = Number(report.totalCount || report.availableCount || 0);
                        const done = Number(report.discoveredCount || 0);
                        const suffix = total > 0 ? ` (${done}/${total})` : '';
                        this.ui.showMessage?.(`Jogo dos asterismos encerrado${suffix}.`, 'info', 1800, {
                            replaceKey: 'asterism-finished',
                            replaceActive: true,
                            skipQueue: true
                        });
                    }
                });

                console.log('✅ UIGames: callbacks registrados no Core');
                this._callbacksConnected = true;
            }

            if (this.sftw?.game || this.sftw?.games?.constellation) {
                console.log('✅ UIGames: conectado com controlador do jogo principal');
            }
        }

        // ============================================
        // JOGO 1 — CONSTELAÇÕES
        // ============================================

        setupGameEvents() {
            this._setupConstellationGameplayOptionBindings();
            this._ensureMessierSessionUI();
            this._ensureAsterismSessionUI();
            this._bindElementEventOnce(this.ui.elements.btnStartGame, 'click', 'uiGamesClickBound', () => this.startGame());
            this._bindElementEventOnce(this.ui.elements.btnSelectConstellation, 'click', 'uiGamesClickBound', () => this.selectConstellation());
            this._bindElementEventOnce(this.ui.elements.btnShowAnswerKey, 'click', 'uiGamesClickBound', () => this.showAnswerKey());
            this._bindElementEventOnce(this.ui.elements.btnRestartGame, 'click', 'uiGamesClickBound', () => this.restartGame());
            this._bindElementEventOnce(this.ui.elements.btnEndGame, 'click', 'uiGamesClickBound', () => this.endGame());

            this._bindElementEventOnce(this.ui.elements.btnStartAsterismGame, 'click', 'uiGamesClickBound', () => this.startAsterismGame());
            this._bindElementEventOnce(this.ui.elements.btnStopAsterismGame, 'click', 'uiGamesClickBound', () => this.stopAsterismGame());
            this._bindElementEventOnce(this.ui.elements.btnApplyAsterismTarget, 'click', 'uiGamesClickBound', () => this.applyAsterismTarget());
            this._bindElementEventOnce(this.ui.elements.btnFocusAsterismTarget, 'click', 'uiGamesClickBound', () => this.focusAsterismTarget());
            this._bindElementEventOnce(this.ui.elements.btnUndoAsterismSegment, 'click', 'uiGamesClickBound', () => this.undoLastAsterismSegment());
            this._bindElementEventOnce(this.ui.elements.btnClearAsterismSegments, 'click', 'uiGamesClickBound', () => this.clearAsterismSegments());
            this._bindElementEventOnce(this.ui.elements.btnSubmitAsterismSegments, 'click', 'uiGamesClickBound', () => this.submitAsterismSegmentsForCorrection());

            this.refreshAsterismGameUI();
        }

        startGame() {
            console.log('🎮 UIGames: iniciar jogo solicitado');

            this.ui.clearAllMessages?.({ clearQueue: true, keepActive: false });
            this._refreshVisualizationGameOptions(true);
            const startOptions = this.getConstellationGameStartOptions();

            this.openConstellationSelectionModal({
                title: 'Escolha a constelação inicial',
                onSelect: (abbr) => {
                    if (typeof this.sftw?.startGame === 'function') {
                        this.sftw.startGame(abbr, startOptions);
                        return;
                    }

                    const game = this.getPrimaryGameController();
                    if (game && typeof game.startGame === 'function') {
                        game.startGame(abbr, startOptions);
                        return;
                    }

                    this.ui.showMessage?.('Sistema de jogo não disponível (startGame)', 'error', 2200, {
                        replaceKey: 'game1-error',
                        replaceActive: true,
                        skipQueue: true
                    });
                }
            });
        }

        getConstellationGameStartOptions() {
            const opts = this._getConstellationGameplayOptionsFromUI();
            return {
                showBoundaries: !!opts.game1ShowBoundaries,
                showLabels: !!opts.showDiscoveredNames
            };
        }

        selectConstellation() {
            console.log('🎯 UIGames: selecionar constelação solicitado');

            this.openConstellationSelectionModal({
                title: 'Escolha uma constelação',
                onSelect: (abbr) => {
                    if (this.isPrimaryGameActive()) {
                        if (typeof this.sftw?.restartGame === 'function') {
                            this.sftw.restartGame();
                        }
                    }
                    if (typeof this.sftw?.focusOnConstellation === 'function') {
                        this.sftw.focusOnConstellation(abbr);
                    }
                }
            });
        }

        showAnswerKey() {
            console.log('🔑 UIGames: mostrar gabarito solicitado');

            if (this.getPrimaryGameController() && typeof this.sftw?.showAnswerKey === 'function') {
                this.sftw.showAnswerKey();
                return;
            }

            const constellations = Array.isArray(this.sftw?.constellations) ? this.sftw.constellations.slice() : [];
            if (!constellations.length) {
                this.ui.showMessage?.('Constelações ainda não carregadas.', 'warning');
                return;
            }

            const state = this.sftw?.gameState || {};
            const discoveredSet = state.discoveredConstellations instanceof Set
                ? state.discoveredConstellations
                : new Set(Array.isArray(state.discovered) ? state.discovered : []);

            const ordered = constellations.sort((a, b) => String(a.name || a.abbreviation || '').localeCompare(String(b.name || b.abbreviation || ''), 'pt-BR'));
            const missing = ordered.filter((c) => !discoveredSet.has(c.abbreviation));
            const discovered = ordered.filter((c) => discoveredSet.has(c.abbreviation));

            let overlay = document.getElementById('sftw1-answer-key-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sftw1-answer-key-overlay';
                overlay.style.position = 'fixed';
                overlay.style.inset = '0';
                overlay.style.background = 'rgba(0,0,0,0.7)';
                overlay.style.zIndex = '100000';
                overlay.style.display = 'flex';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.style.padding = '16px';
                document.body.appendChild(overlay);
            }

            const renderItems = (items, cssClass) => items.map((c) => `
                <button type="button" class="${cssClass}" data-abbr="${c.abbreviation}" style="
                    display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;
                    background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                    border-radius:10px;color:#fff;cursor:pointer;text-align:left;">
                    <span style="font-family:monospace;min-width:44px;opacity:.9;">${c.abbreviation}</span>
                    <span>${c.name || c.abbreviation}</span>
                </button>
            `).join('');

            overlay.innerHTML = `
                <div style="width:min(860px,96vw);max-height:min(760px,88vh);background:rgba(11,16,28,.96);border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 18px 44px rgba(0,0,0,.45);">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.10);">
                        <div>
                            <div style="font-size:1rem;font-weight:800;color:#fff;">Gabarito do jogo 1</div>
                            <div style="font-size:.88rem;color:rgba(255,255,255,.68);">Descobertas: ${discovered.length} • Faltantes: ${missing.length}</div>
                        </div>
                        <button type="button" id="sftw1-answer-key-close" style="background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;">✕</button>
                    </div>
                    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;padding:0;min-height:0;overflow:hidden;">
                        <div style="padding:14px 16px;border-right:1px solid rgba(255,255,255,.08);overflow:auto;max-height:min(640px,72vh);">
                            <div style="font-size:.86rem;font-weight:700;color:#86efac;margin-bottom:10px;">Já descobertas</div>
                            <div style="display:grid;gap:8px;">${discovered.length ? renderItems(discovered, 'sftw1-answer-key-item') : '<div style="opacity:.68;">Nenhuma ainda.</div>'}</div>
                        </div>
                        <div style="padding:14px 16px;overflow:auto;max-height:min(640px,72vh);">
                            <div style="font-size:.86rem;font-weight:700;color:#fca5a5;margin-bottom:10px;">Ainda faltam</div>
                            <div style="display:grid;gap:8px;">${missing.length ? renderItems(missing, 'sftw1-answer-key-item') : '<div style="opacity:.68;">Todas descobertas.</div>'}</div>
                        </div>
                    </div>
                </div>
            `;

            const close = () => {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            };

            overlay.addEventListener('click', (ev) => {
                if (ev.target === overlay) close();
            }, { once: true });

            const closeBtn = overlay.querySelector('#sftw1-answer-key-close');
            if (closeBtn) closeBtn.addEventListener('click', close, { once: true });

            overlay.querySelectorAll('.sftw1-answer-key-item').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const abbr = btn.getAttribute('data-abbr') || '';
                    if (abbr && typeof this.sftw?.focusOnConstellation === 'function') {
                        this.sftw.focusOnConstellation(abbr);
                    }
                    close();
                });
            });
        }

        restartGame() {
            console.log('🔄 UIGames: reiniciar jogo solicitado');
            if (this.getPrimaryGameController() && typeof this.sftw?.restartGame === 'function') {
                this.sftw.restartGame();
            }
        }

        endGame() {
            console.log('🚪 UIGames: sair do jogo solicitado');

            this.ui.clearAllMessages?.({ clearQueue: true, keepActive: false });

            let stopped = false;
            const game = this.getPrimaryGameController();

            if (game && typeof game.cancelGame === 'function') {
                game.cancelGame();
                stopped = true;
            } else if (typeof this.sftw?.cancelGame === 'function') {
                this.sftw.cancelGame();
                stopped = true;
            } else if (game && typeof game.endGame === 'function') {
                game.endGame();
                stopped = true;
            } else if (typeof this.sftw?.endGame === 'function') {
                this.sftw.endGame();
                stopped = true;
            }

            this.ui.resetProgressChecklist?.();
            this.ui.setProgressPanelVisible?.(false);
            this.ui.gameUIState = 'idle';
            this.ui.updateGameUIState?.();

            if (this.ui.elements.gameStatus) {
                this.ui.elements.gameStatus.textContent = 'Pronto';
            }

            if (typeof this.ui.activateMainTab === 'function') {
                this.ui.activateMainTab('explore');
            }

            if (!stopped) {
                if (typeof this.sftw?.returnToMainMenu === 'function') {
                    this.sftw.returnToMainMenu();
                } else if (window.app && typeof window.app.returnToMainMenu === 'function') {
                    window.app.returnToMainMenu();
                }
            }
        }

        _syncChecklistFromDiscovered(discoveredList, { reset = false } = {}) {
            if (reset) {
                this.ui.resetProgressChecklist?.();
            }

            const list = Array.isArray(discoveredList)
                ? discoveredList.map((abbr) => String(abbr || '').trim().toUpperCase()).filter(Boolean)
                : [];

            list.forEach((abbr) => this.ui.markConstellationChecked?.(abbr));

            if (typeof this.ui.updateProgressCount === 'function') {
                this.ui.updateProgressCount();
            }
        }

        _syncChecklistFromGameState(gameState, { reset = false } = {}) {
            const discovered = gameState?.discoveredConstellations instanceof Set
                ? Array.from(gameState.discoveredConstellations)
                : (Array.isArray(gameState?.discovered) ? gameState.discovered : []);

            this._syncChecklistFromDiscovered(discovered, { reset });
        }

        onGameStarted(constellationAbbr) {
            console.log(`🎮 UIGames: jogo iniciado com ${constellationAbbr}`);

            this.ui.gameUIState = 'playing';
            this.ui.updateGameUIState?.();
            this._safeActivateGamesTab();

            this._syncChecklistFromGameState(this.sftw?.gameState || {}, { reset: true });
            this.ui.setProgressPanelVisible?.(!!this.ui.elements.optShowProgress?.checked);

            const constellation = this.sftw?.constellations?.find(c => c.abbreviation === constellationAbbr);
            if (constellation && this.ui.elements.gameStatus) {
                this.ui.elements.gameStatus.textContent = `Jogando (${constellation.name})`;
                this.ui.updateCurrentConstellation?.(constellationAbbr);
            }

            const activeActions = document.getElementById('game-actions-active');
            if (activeActions) activeActions.style.display = 'flex';

            if (typeof this.ui.applyGameModeSettings === 'function') {
                this.ui.applyGameModeSettings();
            }

            this.ui.showMessage?.(
                `Jogo iniciado! Descubra as constelações ao redor de ${constellation?.name || constellationAbbr}`,
                'success'
            );
        }

        onConstellationDiscovered(abbreviation, attempts, points) {
            if (abbreviation && typeof abbreviation === 'object') {
                points = abbreviation.points ?? abbreviation.gained ?? abbreviation.scoreGained ?? points;
                attempts = abbreviation.attempts ?? attempts;
                abbreviation = abbreviation.abbreviation || abbreviation.abbr || abbreviation.target;
            }

            attempts = attempts || 1;
            if (points == null) points = Math.floor(100 / attempts);

            console.log(`✅ UIGames: constelação descoberta: ${abbreviation} (${attempts} tentativas, +${points} pts)`);

            this.ui.updateGameStats?.();
            this.ui.markConstellationChecked?.(abbreviation);
            this._syncChecklistFromGameState(this.sftw?.gameState || {}, { reset: false });
            this.ui.setProgressPanelVisible?.(!!this.ui.elements.optShowProgress?.checked);

            const constellation = this.sftw?.constellations?.find(c => c.abbreviation === abbreviation);
            if (constellation) {
                this.ui.showMessage?.(`✅ ${constellation.name} descoberta! (+${points} pontos)`, 'success');
            }
        }

        onGameCompleted(result) {
            console.log('🏁 UIGames: jogo completo!', result);

            this.ui.gameUIState = 'completed';
            this.ui.updateGameUIState?.();
            this._syncChecklistFromDiscovered(result?.discovered || [], { reset: true });
            this.ui.setProgressPanelVisible?.(!!this.ui.elements.optShowProgress?.checked);

            if (this.ui.elements.gameStatus) {
                this.ui.elements.gameStatus.textContent = 'Jogo Concluído!';
            }

            this.ui.showGameCompleteMessage?.(result);
        }

        onWrongAnswer(abbreviation, input) {
            if (abbreviation && typeof abbreviation === 'object') {
                input = abbreviation.input;
                abbreviation = abbreviation.abbreviation || abbreviation.abbr || abbreviation.target;
            }

            console.log(`❌ UIGames: resposta errada para ${abbreviation}: "${input}"`);
            this.ui.showMessage?.(`"${input}" não está correto. Tente novamente!`, 'error', 2000);
        }

        // ============================================
        // TREINO 2 — LIMITES DAS CONSTELAÇÕES
        // ============================================

        setupNeighborGameEvents() {
            this._bindElementEventOnce(this.ui.elements.btnStartNeighborTraining, 'click', 'uiGamesClickBound', () => {
                this.startNeighborTrainingFromUI();
            });
            this._bindElementEventOnce(this.ui.elements.btnStopNeighborTraining, 'click', 'uiGamesClickBound', () => {
                this.stopNeighborTrainingFromUI();
            });
            this._bindElementEventOnce(this.ui.elements.btnSubmitNeighborAnswers, 'click', 'uiGamesClickBound', () => {
                this.submitNeighborTrainingFromUI();
            });
            this._bindElementEventOnce(this.ui.elements.btnNeighborChooseAnother, 'click', 'uiGamesClickBound', () => {
                this.startNeighborTrainingFromUI();
            });
        }

        _readNeighborTrainingOptionsFromUI() {
            return {
                difficulty: (this.ui.elements.neighborDifficulty?.value || 'easy').toString(),
                visualMode: (this.ui.elements.neighborVisualMode?.value || 'normal').toString(),
                sequenceMode: (this.ui.elements.neighborSequenceMode?.value || 'selected').toString(),
                autoAdvance: !!this.ui.elements.neighborAutoAdvance?.checked
            };
        }

        startNeighborTrainingFromUI() {
            this.ui.clearAllMessages?.({ clearQueue: true, keepActive: false });

            if (typeof this.sftw?.startNeighborGame !== 'function') {
                this.ui.showMessage?.('Sistema do treino de limites não está disponível.', 'error');
                return;
            }

            const opts = this._readNeighborTrainingOptionsFromUI();
            this.resetNeighborTrainingPanel();

            const launch = (extra = {}) => {
                const startOptions = { ...opts, ...extra };
                const ok = this.sftw.startNeighborGame(startOptions);
                if (!ok && ok !== undefined) {
                    this.ui.showMessage?.('Não foi possível iniciar o treino de limites.', 'error');
                    return;
                }

                this._safeActivateGamesTab();

                const msg = startOptions.targetConstellation
                    ? `Treino de limites iniciado para ${startOptions.targetConstellation}.`
                    : (startOptions.sequenceMode === 'alphabetical'
                        ? 'Treino em sequência alfabética iniciado.'
                        : 'Treino em sequência aleatória iniciado.');

                this.ui.showMessage?.(msg, 'success', 1600, {
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
            this.ui.clearAllMessages?.({ clearQueue: true, keepActive: false });

            let stopped = false;
            if (typeof this.sftw?.cancelNeighborGame === 'function') {
                this.sftw.cancelNeighborGame();
                stopped = true;
            } else if (typeof this.sftw?.endNeighborGame === 'function') {
                this.sftw.endNeighborGame();
                stopped = true;
            }

            clearTimeout(this.ui._neighborAutoAdvanceTimer);
            this._resetNeighborSessionVisualState();
            this.refreshNeighborTrainingUI({
                active: false,
                finished: false,
                currentTarget: null,
                elapsedTime: 0,
                roundsCompleted: 0,
                totalRounds: 0,
                score: 0,
                maxScore: 0,
                accuracyPct: null,
                pendingTargetsCount: 0,
                hasSubmittedCurrentRound: false
            });

            const kind = stopped ? 'info' : 'warning';
            const msg = stopped
                ? 'Treino de limites encerrado.'
                : 'Nenhuma sessão ativa do treino de limites para encerrar.';

            this.ui.showMessage?.(msg, kind, 1500, {
                replaceKey: 'neighbor-stop',
                replaceActive: true,
                skipQueue: true
            });
        }

        submitNeighborTrainingFromUI() {
            if (typeof this.sftw?.submitNeighborAnswer !== 'function') {
                this.ui.showMessage?.('Função de correção do treino de limites indisponível.', 'error');
                return;
            }

            const state = this.getCurrentNeighborGameState();
            if (!state?.active || !state.currentTarget) {
                this.ui.showMessage?.('Nenhuma rodada ativa do treino de limites.', 'warning');
                return;
            }

            let payload = '';
            if ((this.ui.elements.neighborDifficulty?.value || 'easy') === 'easy') {
                const inputs = Array.from(this.ui.elements.neighborAnswerArea?.querySelectorAll('.neighbor-answer-input') || []);
                payload = inputs.map(el => (el.value || '').trim()).filter(Boolean).join(', ');
            } else {
                payload = (this.ui.elements.neighborAnswerArea?.querySelector('textarea')?.value || '').trim();
            }

            const result = this.sftw.submitNeighborAnswer(payload);
            if (!result) {
                this.ui.showMessage?.('Não foi possível corrigir esta rodada.', 'error');
            }
        }

        refreshNeighborTrainingUI(state = null) {
            state = state || this.getCurrentNeighborGameState();
            const active = !!state?.active;
            const current = state?.currentTarget || null;

            if (this.ui.elements.neighborStatusPill) {
                if (active) this.ui.elements.neighborStatusPill.textContent = 'Em treino';
                else if (state?.finished) this.ui.elements.neighborStatusPill.textContent = 'Concluído';
                else this.ui.elements.neighborStatusPill.textContent = 'Pronto';
            }
            if (this.ui.elements.btnStartNeighborTraining) {
                this.ui.elements.btnStartNeighborTraining.style.display = active ? 'none' : '';
            }
            if (this.ui.elements.btnStopNeighborTraining) {
                this.ui.elements.btnStopNeighborTraining.style.display = active ? '' : 'none';
            }
            if (this.ui.elements.btnSubmitNeighborAnswers) {
                this.ui.elements.btnSubmitNeighborAnswers.disabled = !active || !current || !!state?.hasSubmittedCurrentRound;
            }

            if (this.ui.elements.neighborCurrentTarget) {
                if (current?.abbr) {
                    this.ui.elements.neighborCurrentTarget.textContent = `${current.abbr} — ${current.name || current.abbr}`;
                } else {
                    this.ui.elements.neighborCurrentTarget.textContent = '—';
                }
            }

            if (this.ui.elements.neighborExpectedCount) {
                const visible = current && (current.expectedCountVisible !== false);
                this.ui.elements.neighborExpectedCount.textContent = visible
                    ? String(current.expectedCount ?? '—')
                    : 'Oculto';
            }

            if (this.ui.elements.neighborRoundTimer) {
                const seconds = Number(current?.roundElapsedTime ?? 0);
                const mm = Math.floor(seconds / 60);
                const ss = seconds % 60;
                this.ui.elements.neighborRoundTimer.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
            }

            if (this.ui.elements.neighborSessionAccuracy) {
                const pct = Number(state?.accuracyPct);
                this.ui.elements.neighborSessionAccuracy.textContent = Number.isFinite(pct) ? `${pct.toFixed(0)}%` : '—';
            }

            if (this.ui.elements.neighborSessionSummary) {
                const roundsCompleted = Number(state?.roundsCompleted || 0);
                const totalRounds = Number(state?.totalRounds || 0);
                const pending = Number(state?.pendingTargetsCount || 0);
                this.ui.elements.neighborSessionSummary.textContent = roundsCompleted > 0
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

            const visualMode = state?.visualMode || this.ui.elements.neighborVisualMode?.value || 'normal';
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
                this.ui.showMessage?.('Próxima constelação em sequência automática…', 'info', 1000, {
                    replaceKey: 'neighbor-autoadvance',
                    replaceActive: true,
                    skipQueue: true
                });
                clearTimeout(this.ui._neighborAutoAdvanceTimer);
                this.ui._neighborAutoAdvanceTimer = setTimeout(() => {
                    if (typeof this.sftw?.nextNeighborRound === 'function') {
                        this.sftw.nextNeighborRound();
                    }
                }, 900);
            }
        }

        onNeighborGameEnded(report) {
            clearTimeout(this.ui._neighborAutoAdvanceTimer);
            this.restoreNeighborVisualMode();
            this.refreshNeighborTrainingUI();
            if (report?.rounds?.length) {
                const pct = Number(report?.accuracyPct ?? ((Number.isFinite(Number(report?.accuracy)) ? Number(report.accuracy) * 100 : NaN)));
                const pctText = Number.isFinite(pct) ? ` • ${pct.toFixed(0)}%` : '';
                this.ui.showMessage?.(`Treino concluído: ${report.totalScore}/${report.maxScore}${pctText}`, 'success', 2400, {
                    replaceKey: 'neighbor-finished',
                    replaceActive: true,
                    skipQueue: true
                });
            }
        }

        refreshAsterismGameUI(state = null) {
            const s = state || this.getCurrentAsterismGameState();

            const active = !!s?.active;
            const finished = !!s?.finished;
            const target = s?.currentTarget || null;
            const currentId = target?.id || target?.targetId || s?.currentAsterismId || s?.targetId || s?.manualTargetId || '—';
            const currentName = target?.namePt || target?.name || currentId;
            const done = Number(s?.discoveredCount || 0);
            const total = Number(s?.totalCount || s?.availableCount || 0);
            const pct = total > 0 ? Math.max(0, Math.min(100, (done / total) * 100)) : 0;
            const totalErrors = Number(s?.totalMissingSegments || 0) + Number(s?.totalExtraSegments || 0);
            const elapsedSession = Number(s?.elapsedMs || 0);
            const elapsedTarget = Number(s?.roundElapsedMs || 0);
            const attempts = Number(s?.currentRoundSubmissionCount || s?.totalSubmissions || 0);
            const solvedEntries = this._buildAsterismSolvedEntries(s);
            const solvedCurrentTarget = !!(s?.currentTargetSolved || (currentId && currentId !== '—' && Array.isArray(s?.discovered) && s.discovered.includes(currentId)));

            if (this.ui.elements.asterismGameStatusPill) {
                if (active) {
                    this.ui.elements.asterismGameStatusPill.textContent = done > 0 ? `Em sessão • ${done} salvos` : 'Em sessão';
                } else if (finished) {
                    this.ui.elements.asterismGameStatusPill.textContent = done > 0 ? `Concluído • ${done} salvos` : 'Concluído';
                } else {
                    this.ui.elements.asterismGameStatusPill.textContent = 'Inativo';
                }
            }
            if (this.ui.elements.asterismGameTargetBadge) {
                if (currentName && currentName !== '—') {
                    this.ui.elements.asterismGameTargetBadge.textContent = solvedCurrentTarget
                        ? `Alvo resolvido: ${currentName}`
                        : `Alvo: ${currentName}`;
                } else {
                    this.ui.elements.asterismGameTargetBadge.textContent = 'Sem alvo';
                }
            }
            if (this.ui.elements.asterismGameTarget) {
                this.ui.elements.asterismGameTarget.textContent = currentName || '—';
            }
            if (this.ui.elements.asterismGameProgress) {
                this.ui.elements.asterismGameProgress.textContent = total > 0 ? `${done}/${total}` : '0/0';
            }
            if (this.ui.elements.asterismGameErrors) {
                this.ui.elements.asterismGameErrors.textContent = String(totalErrors);
            }
            if (this.ui.elements.asterismGameAttempts) {
                this.ui.elements.asterismGameAttempts.textContent = String(attempts);
            }
            if (this.ui.elements.asterismGameSessionTime) {
                this.ui.elements.asterismGameSessionTime.textContent = this._formatClock(Math.floor(elapsedSession / 1000));
            }
            if (this.ui.elements.asterismGameTargetTime) {
                this.ui.elements.asterismGameTargetTime.textContent = this._formatClock(Math.floor(elapsedTarget / 1000));
            }
            if (this.ui.elements.asterismGameProgressLabel) {
                this.ui.elements.asterismGameProgressLabel.textContent = `${pct.toFixed(0)}%`;
            }
            if (this.ui.elements.asterismGameProgressBar) {
                this.ui.elements.asterismGameProgressBar.style.width = `${pct.toFixed(0)}%`;
            }
            if (this.ui.elements.btnStartAsterismGame) {
                this.ui.elements.btnStartAsterismGame.style.display = active ? 'none' : '';
            }
            if (this.ui.elements.btnStopAsterismGame) {
                this.ui.elements.btnStopAsterismGame.style.display = active ? '' : 'none';
            }
            if (this.ui.elements.asterismLastResult) {
                const lr = s?.lastResult || null;
                if (lr?.targetNamePt || lr?.targetName || lr?.targetId) {
                    const name = lr?.targetNamePt || lr?.targetName || lr?.targetId;
                    const details = [];
                    if (Number.isFinite(Number(lr?.roundSubmissionCount))) details.push(`tentativa ${Number(lr.roundSubmissionCount)}`);
                    if (Number.isFinite(Number(lr?.roundElapsedMs))) details.push(this._formatClock(Math.floor(Number(lr.roundElapsedMs) / 1000)));
                    if (lr?.isPerfect) details.push('salvo no céu');
                    this.ui.elements.asterismLastResult.textContent = `Último: ${name}${details.length ? ' • ' + details.join(' • ') : ''}`;
                } else if (finished) {
                    this.ui.elements.asterismLastResult.textContent = done > 0 ? `Sessão encerrada • ${done} salvos no céu` : 'Sessão encerrada';
                } else {
                    this.ui.elements.asterismLastResult.textContent = 'Aguardando sessão';
                }
            }
            if (this.ui.elements.asterismDiscoveredList) {
                if (!solvedEntries.length) {
                    this.ui.elements.asterismDiscoveredList.innerHTML = '<div class="sftw-help">Quando você acertar, o asterismo ficará salvo no céu e aparecerá aqui.</div>';
                } else {
                    this.ui.elements.asterismDiscoveredList.innerHTML = solvedEntries.map((item, idx) => {
                        const name = this._escapeHtml(item?.name || item?.targetId || `Asterismo ${idx + 1}`);
                        const order = Number(item?.order || idx + 1);
                        const details = ['salvo no céu'];
                        if (Number.isFinite(Number(item?.attempts)) && Number(item.attempts) > 0) {
                            details.push(`${Number(item.attempts)} tentativa${Number(item.attempts) > 1 ? 's' : ''}`);
                        }
                        if (Number.isFinite(Number(item?.roundElapsedMs)) && Number(item.roundElapsedMs) > 0) {
                            details.push(this._formatClock(Math.floor(Number(item.roundElapsedMs) / 1000)));
                        }
                        return `<div class="sftw-checkitem checked"><span class="label">${order}. ${name} — ${details.join(' • ')}</span></div>`;
                    }).join('');
                }
            }
        }

        _getAsterismStartOptions() {
            const opts = {
                randomOrder: !!this.ui.elements.asterismGameRandomOrder?.checked,
                autoAdvance: !!this.ui.elements.asterismGameAutoAdvance?.checked
            };
            const raw = (this.ui.elements.asterismGameTargetInput?.value || '').trim();
            if (raw) {
                opts.targetId = raw;
                opts.manualTargetId = raw;
            }
            return opts;
        }

        startAsterismGame() {
            if (typeof this.sftw?.startAsterismGame !== 'function') {
                this.ui.showMessage?.('Sistema do jogo dos asterismos não disponível.', 'error', 2000, {
                    replaceKey: 'asterism-error',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }

            this._resetAsterismSessionTracking();
            const ok = this.sftw.startAsterismGame(this._getAsterismStartOptions());
            if (ok === false) {
                this.ui.showMessage?.('Não foi possível iniciar o jogo dos asterismos.', 'error', 2000, {
                    replaceKey: 'asterism-error',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }

            this._safeActivateGamesTab();
            this._startAsterismHudTimer();
            this.refreshAsterismGameUI();
        }

        stopAsterismGame() {
            this._stopAsterismHudTimer();
            if (typeof this.sftw?.cancelAsterismGame === 'function') {
                this.sftw.cancelAsterismGame();
            } else if (typeof this.sftw?.stopAsterismGame === 'function') {
                this.sftw.stopAsterismGame();
            } else if (typeof this.sftw?.endAsterismGame === 'function') {
                this.sftw.endAsterismGame();
            }
            this.refreshAsterismGameUI();
        }

        applyAsterismTarget() {
            if (typeof this.sftw?.configureAsterismGame !== 'function') {
                this.ui.showMessage?.('Configuração do alvo indisponível.', 'warning', 1600, {
                    replaceKey: 'asterism-target',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }
            const raw = (this.ui.elements.asterismGameTargetInput?.value || '').trim();
            if (!raw) {
                this.ui.showMessage?.('Digite um asterismo alvo.', 'warning', 1400, {
                    replaceKey: 'asterism-target',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }
            this.sftw.configureAsterismGame({ targetId: raw, manualTargetId: raw });
            this.ui.showMessage?.(`Alvo manual definido: ${raw}`, 'info', 1200, {
                replaceKey: 'asterism-target',
                replaceActive: true,
                skipQueue: true
            });
            this.refreshAsterismGameUI();
        }

        focusAsterismTarget() {
            if (typeof this.sftw?.focusCurrentAsterismGameTarget === 'function') {
                const ok = this.sftw.focusCurrentAsterismGameTarget();
                if (!ok) {
                    this.ui.showMessage?.('Não foi possível focar o alvo agora.', 'warning', 1400, {
                        replaceKey: 'asterism-focus',
                        replaceActive: true,
                        skipQueue: true
                    });
                }
            }
        }

        undoLastAsterismSegment() {
            const vis = this.sftw?.visualization;
            if (!vis || typeof vis.undoLastAsterismGameSegment !== 'function') {
                this.ui.showMessage?.('Desfazer ainda não está disponível.', 'warning', 1400, {
                    replaceKey: 'asterism-edit',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }
            const ok = vis.undoLastAsterismGameSegment();
            this.ui.showMessage?.(ok ? 'Último segmento desfeito.' : 'Não há segmento para desfazer.', ok ? 'info' : 'warning', 1200, {
                replaceKey: 'asterism-edit',
                replaceActive: true,
                skipQueue: true
            });
        }

        clearAsterismSegments() {
            const vis = this.sftw?.visualization;
            if (!vis || typeof vis.clearCurrentAsterismGameSegments !== 'function') {
                this.ui.showMessage?.('Limpar segmentos indisponível.', 'warning', 1400, {
                    replaceKey: 'asterism-edit',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }
            vis.clearCurrentAsterismGameSegments();
            this.ui.showMessage?.('Segmentos apagados.', 'info', 1200, {
                replaceKey: 'asterism-edit',
                replaceActive: true,
                skipQueue: true
            });
        }

        submitAsterismSegmentsForCorrection() {
            const vis = this.sftw?.visualization;
            if (!vis || typeof vis.submitCurrentAsterismGameSegments !== 'function') {
                this.ui.showMessage?.('Correção manual indisponível.', 'warning', 1400, {
                    replaceKey: 'asterism-submit',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }

            const segments = Array.isArray(vis.getAsterismGameUserSegments?.()) ? vis.getAsterismGameUserSegments() : [];
            if (!segments.length) {
                this.ui.showMessage?.('Monte pelo menos um segmento antes de corrigir.', 'warning', 1400, {
                    replaceKey: 'asterism-submit',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }

            const result = vis.submitCurrentAsterismGameSegments();
            if (!result) {
                this.ui.showMessage?.('Não foi possível corrigir a resposta agora.', 'error', 1600, {
                    replaceKey: 'asterism-submit',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }

            this.refreshAsterismGameUI(this.sftw?.getAsterismGameState?.() || null);
        }

        renderNeighborAnswerInputs(round) {
            if (!this.ui.elements.neighborAnswerArea || !round) return;

            const difficulty = (this.ui.elements.neighborDifficulty?.value || 'easy').toString();
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
                this.ui.elements.neighborAnswerArea.innerHTML = html;
            } else {
                this.ui.elements.neighborAnswerArea.innerHTML = `
                    <div class="sftw-help" style="margin-top:0; margin-bottom:10px;">
                        Digite as constelações separadas por vírgula, Enter ou ponto e vírgula. Neste modo, a quantidade não é mostrada.
                    </div>
                    <textarea class="sftw-input" rows="6" placeholder="Ex.: Tau, Gem, Mon, Lep"></textarea>
                `;
            }

            const first = this.ui.elements.neighborAnswerArea.querySelector('input, textarea');
            if (first) setTimeout(() => first.focus(), 0);
        }

        renderNeighborTrainingResult(round) {
            if (!this.ui.elements.neighborResultArea) return;

            if (!round) {
                this.ui.elements.neighborResultArea.innerHTML = '<div class="sftw-help">Depois da correção, aparecem aqui os acertos, erros e faltantes.</div>';
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

            this.ui.elements.neighborResultArea.innerHTML = `
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
            if (!this.ui.elements.neighborSessionHistory || !round) return;

            const empty = this.ui.elements.neighborSessionHistory.querySelector('.sftw-help');
            if (empty) empty.remove();

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
            this.ui.elements.neighborSessionHistory.prepend(row);
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
            clearTimeout(this.ui._neighborAutoAdvanceTimer);
            this._resetNeighborSessionVisualState();
            if (this.ui.elements.neighborStatusPill) this.ui.elements.neighborStatusPill.textContent = 'Pronto';
        }

        formatNeighborRoundTime(totalSeconds) {
            const value = Number(totalSeconds);
            if (!Number.isFinite(value)) return '00:00';
            const mm = Math.floor(value / 60);
            const ss = value % 60;
            return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        }

        applyNeighborVisualMode(mode = 'normal') {
            if (this.getNeighborGameController()) return;
            const desired = String(mode || 'normal');
            if (desired === this.ui._neighborAppliedVisualMode) return;

            if (!this.ui._neighborVisualSnapshot) {
                this.ui._neighborVisualSnapshot = {
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
            } else if (this.ui._neighborVisualSnapshot) {
                Object.assign(this.sftw.settings, this.ui._neighborVisualSnapshot);
            }

            if (this.ui.elements.toggleGrid) this.ui.elements.toggleGrid.checked = !!this.sftw.settings.showGrid;
            if (this.ui.elements.toggleBoundaries) this.ui.elements.toggleBoundaries.checked = !!this.sftw.settings.showBoundaries;
            if (this.ui.elements.toggleLabels) this.ui.elements.toggleLabels.checked = !!this.sftw.settings.showLabels;
            if (this.ui.elements.toggleStars) this.ui.elements.toggleStars.checked = !!this.sftw.settings.showStars;
            if (this.ui.elements.toggleMessier) this.ui.elements.toggleMessier.checked = !!this.sftw.settings.showMessier;

            if (typeof this.sftw.toggleGrid === 'function') this.sftw.toggleGrid();
            if (typeof this.sftw.toggleBoundaries === 'function') this.sftw.toggleBoundaries();
            if (typeof this.sftw.toggleLabels === 'function') this.sftw.toggleLabels();
            if (typeof this.sftw.toggleStars === 'function') this.sftw.toggleStars();
            if (typeof this.sftw.toggleMessier === 'function') this.sftw.toggleMessier();

            this.ui._neighborAppliedVisualMode = desired;
        }

        restoreNeighborVisualMode() {
            if (this.getNeighborGameController()) return;
            if (!this.ui._neighborVisualSnapshot) return;
            Object.assign(this.sftw.settings, this.ui._neighborVisualSnapshot);

            if (this.ui.elements.toggleGrid) this.ui.elements.toggleGrid.checked = !!this.sftw.settings.showGrid;
            if (this.ui.elements.toggleBoundaries) this.ui.elements.toggleBoundaries.checked = !!this.sftw.settings.showBoundaries;
            if (this.ui.elements.toggleLabels) this.ui.elements.toggleLabels.checked = !!this.sftw.settings.showLabels;
            if (this.ui.elements.toggleStars) this.ui.elements.toggleStars.checked = !!this.sftw.settings.showStars;
            if (this.ui.elements.toggleMessier) this.ui.elements.toggleMessier.checked = !!this.sftw.settings.showMessier;

            if (typeof this.sftw.toggleGrid === 'function') this.sftw.toggleGrid();
            if (typeof this.sftw.toggleBoundaries === 'function') this.sftw.toggleBoundaries();
            if (typeof this.sftw.toggleLabels === 'function') this.sftw.toggleLabels();
            if (typeof this.sftw.toggleStars === 'function') this.sftw.toggleStars();
            if (typeof this.sftw.toggleMessier === 'function') this.sftw.toggleMessier();

            this.ui._neighborAppliedVisualMode = null;
            this.ui._neighborVisualSnapshot = null;
        }

        // ============================================
        // JOGO 3 — MESSIER
        // ============================================

        setupMessierGameEvents() {
            const applyOptions = () => this.applyMessierGameOptions({ silent: true });

            this._bindElementEventOnce(this.ui.elements.messierRandomOrder, 'change', 'uiGamesChangeBound', applyOptions);
            this._bindElementEventOnce(this.ui.elements.messierAutoAdvance, 'change', 'uiGamesChangeBound', applyOptions);
            this._bindElementEventOnce(this.ui.elements.messierShowErrorHint, 'change', 'uiGamesChangeBound', applyOptions);
            this._bindElementEventOnce(this.ui.elements.messierToleranceDeg, 'change', 'uiGamesChangeBound', applyOptions);
            this._bindElementEventOnce(this.ui.elements.messierToleranceDeg, 'blur', 'uiGamesBlurBound', applyOptions);

            this._bindElementEventOnce(this.ui.elements.btnStartMessierGame, 'click', 'uiGamesClickBound', () => this.startMessierGameFromUI());
            this._bindElementEventOnce(this.ui.elements.btnStopMessierGame, 'click', 'uiGamesClickBound', () => this.stopMessierGameFromUI());
            this._bindElementEventOnce(this.ui.elements.btnApplyMessierTarget, 'click', 'uiGamesClickBound', () => this.applyMessierTargetFromUI());
            this._bindElementEventOnce(this.ui.elements.btnFocusMessierTarget, 'click', 'uiGamesClickBound', () => this.focusMessierTargetFromUI());
            this._bindElementEventOnce(this.ui.elements.messierTargetInput, 'keydown', 'uiGamesKeydownBound', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    this.applyMessierTargetFromUI();
                }
            });
        }

        _normalizeMessierIdInput(value) {
            const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
            if (!raw) return '';
            const m = raw.match(/^M?(\d{1,3})$/);
            if (!m) return raw;
            return `M${Number(m[1])}`;
        }

        _readMessierOptionsFromUI() {
            const toleranceRaw = Number(this.ui.elements.messierToleranceDeg?.value ?? 1.2);
            return {
                randomOrder: !!this.ui.elements.messierRandomOrder?.checked,
                autoAdvance: !!this.ui.elements.messierAutoAdvance?.checked,
                showErrorHint: !!this.ui.elements.messierShowErrorHint?.checked,
                toleranceDeg: (Number.isFinite(toleranceRaw) && toleranceRaw > 0) ? toleranceRaw : 1.2,
                targetId: this._normalizeMessierIdInput(this.ui.elements.messierTargetInput?.value || '') || undefined,
                manualTargetId: this._normalizeMessierIdInput(this.ui.elements.messierTargetInput?.value || '') || undefined
            };
        }

        applyMessierGameOptions({ silent = false } = {}) {
            const opts = this._readMessierOptionsFromUI();
            if (typeof this.sftw?.setMessierGameOptions === 'function') {
                this.sftw.setMessierGameOptions(opts);
            }
            if (!silent) {
                this.ui.showMessage?.('Opções do jogo Messier atualizadas.', 'info', 1800);
            }
            this.refreshMessierGameUI();
        }

        startMessierGameFromUI() {
            this.ui.clearAllMessages?.({ clearQueue: true, keepActive: false });
            this._resetMessierSessionTracking();
            const opts = this._readMessierOptionsFromUI();
            if (typeof this.sftw?.startMessierGame !== 'function') {
                this.ui.showMessage?.('Sistema do jogo Messier não disponível.', 'error');
                return;
            }
            const ok = this.sftw.startMessierGame(opts);
            if (ok) {
                this._safeActivateGamesTab();
                this._startMessierHudTimer();
                this.ui.showMessage?.('Jogo do Messier iniciado.', 'success');
            } else {
                this.ui.showMessage?.('Não foi possível iniciar o jogo do Messier.', 'warning');
            }
            this.refreshMessierGameUI();
        }

        stopMessierGameFromUI() {
            this.ui.clearAllMessages?.({ clearQueue: true, keepActive: false });
            if (typeof this.sftw?.stopMessierGame !== 'function') {
                this.ui.showMessage?.('Sistema do jogo Messier não disponível.', 'error');
                return;
            }
            const ok = this.sftw.stopMessierGame({ restoreVisible: true });
            this._stopMessierHudTimer();
            if (ok) {
                this.ui.showMessage?.('Jogo do Messier encerrado.', 'info');
            }
            this.refreshMessierGameUI();
        }

        applyMessierTargetFromUI() {
            const id = this._normalizeMessierIdInput(this.ui.elements.messierTargetInput?.value || '');
            if (!id) {
                this.ui.showMessage?.('Digite um Messier válido, por exemplo M31.', 'warning');
                return;
            }
            let ok = false;
            if (typeof this.sftw?.setMessierGameTarget === 'function') {
                ok = !!this.sftw.setMessierGameTarget(id);
            }
            if (!ok && typeof this.sftw?.setMessierGameOptions === 'function') {
                this.sftw.setMessierGameOptions({ targetId: id, manualTargetId: id });
                ok = true;
            }
            if (ok) {
                this.ui.elements.messierTargetInput.value = id;
                this.ui.showMessage?.(`Alvo do Messier definido: ${id}`, 'success', 1800);
            } else {
                this.ui.showMessage?.(`Messier inválido: ${id}`, 'error');
            }
            this.refreshMessierGameUI();
        }

        focusMessierTargetFromUI() {
            const state = this.getCurrentMessierGameState();
            if (state?.active) {
                this.ui.showMessage?.('O foco em Messier fica bloqueado durante a sessão do jogo.', 'warning', 1800, {
                    replaceKey: 'messier-focus-lock',
                    replaceActive: true,
                    skipQueue: true
                });
                return;
            }

            const id = this._normalizeMessierIdInput(this.ui.elements.messierTargetInput?.value || '')
                || this._normalizeMessierIdInput(state.targetId || '');
            if (!id) {
                this.ui.showMessage?.('Nenhum alvo Messier definido para focar.', 'warning');
                return;
            }
            if (typeof this.sftw?.focusOnMessier === 'function') {
                const ok = this.sftw.focusOnMessier(id);
                if (ok === false) {
                    this.ui.showMessage?.(`Não foi possível focar ${id}.`, 'error');
                    return;
                }
                this.ui.showMessage?.(`Focado em ${id}.`, 'info', 1800);
                return;
            }
            this.ui.showMessage?.('Função de foco em Messier indisponível.', 'error');
        }

        onMessierGameStateChanged(state) {
            this.refreshMessierGameUI(state);
        }

        refreshMessierGameUI(state = null) {
            state = state || this.getCurrentMessierGameState();
            this._ensureMessierSessionUI();
            this._trackMessierState(state);

            if (this.ui.elements.messierRandomOrder) this.ui.elements.messierRandomOrder.checked = !!state.randomOrder;
            if (this.ui.elements.messierAutoAdvance) this.ui.elements.messierAutoAdvance.checked = !!state.autoAdvance;
            if (this.ui.elements.messierShowErrorHint) this.ui.elements.messierShowErrorHint.checked = !!state.showErrorHint;
            if (this.ui.elements.messierToleranceDeg && Number.isFinite(Number(state.toleranceDeg))) {
                this.ui.elements.messierToleranceDeg.value = Number(state.toleranceDeg).toFixed(1).replace(/\.0$/, '.0');
            }
            const preferredTarget = state.manualTargetId || state.targetId || this._normalizeMessierIdInput(this.ui.elements.messierTargetInput?.value || '');
            if (this.ui.elements.messierTargetInput && preferredTarget) {
                this.ui.elements.messierTargetInput.value = preferredTarget;
            }

            if (this.ui.elements.messierGameStatusPill) {
                this.ui.elements.messierGameStatusPill.textContent = state.active ? (state.finished ? 'Concluído' : 'Ativo') : 'Inativo';
            }
            if (this.ui.elements.messierGameTargetBadge) {
                this.ui.elements.messierGameTargetBadge.textContent = state.targetId ? `Alvo ${state.targetId}` : (state.finished ? 'Concluído' : 'Sem alvo');
            }
            if (this.ui.elements.messierGameTarget) this.ui.elements.messierGameTarget.textContent = state.targetId || '—';
            if (this.ui.elements.messierGameProgress) this.ui.elements.messierGameProgress.textContent = `${state.discoveredCount}/${state.totalCount}`;
            if (this.ui.elements.messierGameErrors) this.ui.elements.messierGameErrors.textContent = String(state.totalErrors || 0);

            const pct = state.totalCount > 0 ? (state.discoveredCount / state.totalCount) * 100 : 0;
            if (this.ui.elements.messierGameProgressLabel) this.ui.elements.messierGameProgressLabel.textContent = `${pct.toFixed(0)}%`;
            if (this.ui.elements.messierGameProgressBar) this.ui.elements.messierGameProgressBar.style.width = `${pct}%`;

            if (this.ui.elements.messierLastError) {
                this.ui.elements.messierLastError.textContent = (state.lastAngleErrorDeg == null)
                    ? 'Último erro: —'
                    : `Último erro: ${Number(state.lastAngleErrorDeg).toFixed(2)}°`;
            }

            const sessionSeconds = Number(state.elapsedMs || 0) / 1000;
            const targetSeconds = (state.active && this.ui._messierTargetStartedAt)
                ? Math.max(0, (Date.now() - this.ui._messierTargetStartedAt) / 1000)
                : 0;
            if (this.ui.elements.messierGameSessionTime) this.ui.elements.messierGameSessionTime.textContent = this._formatClock(sessionSeconds);
            if (this.ui.elements.messierGameTargetTime) this.ui.elements.messierGameTargetTime.textContent = this._formatClock(targetSeconds);

            if (this.ui.elements.messierDiscoveredList) {
                const discovered = Array.isArray(state.discovered) ? state.discovered.slice() : [];
                const metaMap = new Map((this.ui._messierDiscoveredMeta || []).map((item) => [item.id, item]));
                if (!discovered.length) {
                    this.ui.elements.messierDiscoveredList.innerHTML = '<div class="sftw-help">Nenhum Messier descoberto ainda.</div>';
                } else {
                    this.ui.elements.messierDiscoveredList.innerHTML = discovered
                        .map((id, idx) => {
                            const meta = metaMap.get(id);
                            const order = Number(meta?.order || idx + 1);
                            const timeText = meta ? this._formatClock(Number(meta.elapsedMs || 0) / 1000) : '—';
                            const errors = Number(meta?.errors ?? state.errorsById?.[id] ?? 0);
                            return `<div class="sftw-progress-item discovered"><span>#${order}</span><span><strong>${id}</strong></span><span style="margin-left:auto; opacity:0.78;">${timeText} • erros: ${errors}</span></div>`;
                        })
                        .join('');
                }
            }

            const messierPlaying = !!state.active;
            this.ui.setContextControlLock?.(this.ui.gameUIState === 'playing', messierPlaying);

            if (this.ui.elements.toggleMessier) {
                this.ui.elements.toggleMessier.disabled = messierPlaying;
            }
            if (this.ui.elements.btnStartMessierGame) this.ui.elements.btnStartMessierGame.disabled = messierPlaying || this.ui.gameUIState === 'playing';
            if (this.ui.elements.btnStopMessierGame) this.ui.elements.btnStopMessierGame.disabled = !messierPlaying;
            if (this.ui.elements.btnFocusMessierTarget) this.ui.elements.btnFocusMessierTarget.disabled = messierPlaying;
            if (this.ui.elements.btnApplyMessierTarget) this.ui.elements.btnApplyMessierTarget.disabled = messierPlaying;

            if (messierPlaying) this._startMessierHudTimer();
            else this._stopMessierHudTimer();

            const shouldShowMessierErrorToast =
                !!state.active &&
                !!state.showErrorHint &&
                state.lastAngleErrorDeg != null &&
                Number(state.totalErrors || 0) > 0;

            if (!shouldShowMessierErrorToast) {
                this.ui._lastMessierErrorSignature = null;
            } else {
                const sig = `${Number(state.totalErrors || 0)}|${state.targetId || ''}|${Number(state.lastAngleErrorDeg).toFixed(4)}`;
                if (sig !== this.ui._lastMessierErrorSignature) {
                    const targetText = state.targetId ? ` em ${state.targetId}` : '';
                    this.ui.showMessage?.(`Erro${targetText}: ${Number(state.lastAngleErrorDeg).toFixed(2)}°`, 'error', 1300, {
                        replaceKey: 'messier-error',
                        replaceActive: true,
                        skipQueue: true
                    });
                    this.ui._lastMessierErrorSignature = sig;
                }
            }
        }

        // ============================================
        // MODAL DE SELEÇÃO DE CONSTELAÇÃO
        // ============================================

        openConstellationSelectionModal({ title = 'Escolha uma constelação', onSelect } = {}) {
            try {
                if (!this.sftw || !Array.isArray(this.sftw.constellations) || this.sftw.constellations.length === 0) {
                    this.ui.showMessage?.('Constelações ainda não carregadas.', 'error');
                    return;
                }

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

                    overlay.addEventListener('click', (e) => {
                        if (e.target === overlay) this.closeConstellationSelectionModal();
                    });

                    overlay.querySelector('#sftw1-modal-close')?.addEventListener('click', () => {
                        this.closeConstellationSelectionModal();
                    });
                }

                const titleEl = overlay.querySelector('#sftw1-modal-title');
                if (titleEl) titleEl.textContent = title || 'Escolha uma constelação';

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
                        .sort((a, b) => a.localeCompare(b));

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

                filterEl.oninput = () => build(filterEl.value);

                overlay.style.display = 'flex';
                filterEl.value = '';
                build('');
                setTimeout(() => filterEl.focus(), 0);
            } catch (err) {
                console.error('❌ UIGames: falha ao abrir modal de seleção:', err);
                this.ui.showMessage?.('Falha ao abrir seletor de constelação. Veja o console.', 'error');
            }
        }

        closeConstellationSelectionModal() {
            const overlay = document.getElementById('sftw1-constellation-modal-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    }

    if (typeof window !== 'undefined') {
        window.Sftw1_UIGames = Sftw1_UIGames;
        console.log('✅ Sftw1_UI_Games.js carregado');
    }
})();
