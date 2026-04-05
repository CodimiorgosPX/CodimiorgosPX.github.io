// Sftw1_AsterismGame.js
// Controller canônico do jogo dos asterismos
// ETAPA 1:
// - cria o motor do jogo sem mexer ainda na UI
// - reaproveita o catálogo de asterismos como fonte de verdade
// - usa compareAsterismSegments(...) como juiz principal
// - mantém API estável e callbacks no estilo dos outros jogos

class Sftw1_AsterismGame {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        this.state = this._createInitialState();
        console.log('✨ Sftw1_AsterismGame inicializado');
    }

    _createInitialState() {
        return {
            active: false,
            finished: false,

            currentAsterismId: null,
            manualTargetId: null,
            randomOrder: false,
            autoAdvance: false,
            showLabelsDuringGame: true,
            keepAsterismsVisible: true,

            orderedIds: [],
            pendingIds: [],
            discovered: new Set(),

            startedAt: 0,
            elapsedMs: 0,
            roundStartedAt: 0,
            roundElapsedMs: 0,

            attemptsById: {},
            bestResultsById: {},
            history: [],

            totalSubmissions: 0,
            perfectCount: 0,
            totalMissingSegments: 0,
            totalExtraSegments: 0,

            currentRoundSubmissionCount: 0,
            currentTargetSolved: false,
            lastPerfectTargetId: null,
            submissionSerial: 0,

            lastResult: null
        };
    }

    _resetRuntimeStatePreservingOptions() {
        const keep = {
            manualTargetId: this.state.manualTargetId,
            randomOrder: this.state.randomOrder,
            autoAdvance: this.state.autoAdvance,
            showLabelsDuringGame: this.state.showLabelsDuringGame,
            keepAsterismsVisible: this.state.keepAsterismsVisible
        };

        this.state = this._createInitialState();

        this.state.manualTargetId = keep.manualTargetId;
        this.state.randomOrder = keep.randomOrder;
        this.state.autoAdvance = keep.autoAdvance;
        this.state.showLabelsDuringGame = keep.showLabelsDuringGame;
        this.state.keepAsterismsVisible = keep.keepAsterismsVisible;
    }

    _getNow() {
        return Date.now();
    }

    _normalizeAsterismId(id) {
        return String(id || '').trim().toLowerCase();
    }

    _getPlayableAsterisms() {
        if (typeof this.sftw?.getPlayableAsterisms === 'function') {
            const arr = this.sftw.getPlayableAsterisms();
            if (Array.isArray(arr)) return arr.slice();
        }
        return [];
    }

    _getAsterismById(id) {
        const key = this._normalizeAsterismId(id);
        if (!key) return null;

        if (typeof this.sftw?.getAsterismById === 'function') {
            const found = this.sftw.getAsterismById(key);
            if (found) return found;
        }

        return this._getPlayableAsterisms().find((a) => this._normalizeAsterismId(a?.id) === key) || null;
    }

    _buildOrderedIds() {
        return this._getPlayableAsterisms()
            .filter((a) => a && a.isPlayable)
            .map((a) => this._normalizeAsterismId(a.id))
            .filter(Boolean);
    }

    _shuffle(list) {
        const arr = list.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    _normalizeOptions(opts = {}) {
        const out = {};

        if (Object.prototype.hasOwnProperty.call(opts, 'randomOrder')) {
            out.randomOrder = !!opts.randomOrder;
        }
        if (Object.prototype.hasOwnProperty.call(opts, 'autoAdvance')) {
            out.autoAdvance = !!opts.autoAdvance;
        }
        if (Object.prototype.hasOwnProperty.call(opts, 'showLabelsDuringGame')) {
            out.showLabelsDuringGame = !!opts.showLabelsDuringGame;
        }
        if (Object.prototype.hasOwnProperty.call(opts, 'keepAsterismsVisible')) {
            out.keepAsterismsVisible = !!opts.keepAsterismsVisible;
        }

        const hasManual =
            Object.prototype.hasOwnProperty.call(opts, 'manualTargetId') ||
            Object.prototype.hasOwnProperty.call(opts, 'targetId') ||
            Object.prototype.hasOwnProperty.call(opts, 'asterismId');

        if (hasManual) {
            const raw = opts.manualTargetId ?? opts.targetId ?? opts.asterismId ?? '';
            const normalized = this._normalizeAsterismId(raw);
            out.manualTargetId = normalized || null;
        }

        return out;
    }

    applyConfiguration(options = {}, cfg = {}) {
        const normalized = this._normalizeOptions(options);

        if (Object.prototype.hasOwnProperty.call(normalized, 'manualTargetId')) {
            this.state.manualTargetId = normalized.manualTargetId;
        }
        if (Object.prototype.hasOwnProperty.call(normalized, 'randomOrder')) {
            this.state.randomOrder = normalized.randomOrder;
        }
        if (Object.prototype.hasOwnProperty.call(normalized, 'autoAdvance')) {
            this.state.autoAdvance = normalized.autoAdvance;
        }
        if (Object.prototype.hasOwnProperty.call(normalized, 'showLabelsDuringGame')) {
            this.state.showLabelsDuringGame = normalized.showLabelsDuringGame;
        }
        if (Object.prototype.hasOwnProperty.call(normalized, 'keepAsterismsVisible')) {
            this.state.keepAsterismsVisible = normalized.keepAsterismsVisible;
        }

        if (!cfg.silent) {
            this._publishState({ type: 'config' });
        }

        return this.getGameState();
    }

    _pickNextTargetId() {
        const pending = this.state.pendingIds || [];
        if (!pending.length) return null;

        if (this.state.manualTargetId) {
            const manual = this._normalizeAsterismId(this.state.manualTargetId);
            if (manual && pending.includes(manual)) return manual;
        }

        return pending[0] || null;
    }

    _startRoundClock() {
        this.state.roundStartedAt = this._getNow();
        this.state.roundElapsedMs = 0;
        this.state.currentRoundSubmissionCount = 0;
        this.state.currentTargetSolved = false;
    }

    _captureRoundElapsedMs() {
        if (!this.state.roundStartedAt) {
            this.state.roundElapsedMs = Number(this.state.roundElapsedMs || 0);
            return this.state.roundElapsedMs;
        }
        this.state.roundElapsedMs = Math.max(0, this._getNow() - this.state.roundStartedAt);
        return this.state.roundElapsedMs;
    }

    _syncVisualizationForGameState() {
        // Etapa segura:
        // o controller não força visibilidade nem rótulos globais.
        // Apenas avisa a camada visual, se ela já existir e expuser um método dedicado.
        try {
            if (this.sftw?.visualization && typeof this.sftw.visualization.syncAsterismGameVisuals === 'function') {
                this.sftw.visualization.syncAsterismGameVisuals(this.getGameState());
            }
        } catch (err) {
            console.warn('⚠️ AsterismGame: falha ao sincronizar visualização dedicada:', err);
        }
    }

    _restoreVisualizationAfterStop() {
        // Etapa segura:
        // não mexe em toggles globais de asterismos; só pede limpeza visual dedicada, se houver.
        try {
            if (this.sftw?.visualization && typeof this.sftw.visualization.clearAsterismGameVisuals === 'function') {
                this.sftw.visualization.clearAsterismGameVisuals();
            }
        } catch (err) {
            console.warn('⚠️ AsterismGame: falha ao limpar visualização dedicada:', err);
        }
    }

    _focusAsterismById(id) {
        const asterism = this._getAsterismById(id);
        const stars = Array.isArray(asterism?.stars) ? asterism.stars : [];
        if (!asterism || !stars.length) return false;
        if (typeof this.sftw?.raDecToVector3 !== 'function') return false;

        const avg = stars.reduce((acc, entry) => {
            const star = entry?.star || entry;
            if (!Number.isFinite(star?.ra) || !Number.isFinite(star?.dec)) return acc;
            const v = this.sftw.raDecToVector3(star.ra, star.dec, 1);
            acc.add(v);
            return acc;
        }, new THREE.Vector3(0, 0, 0));

        if (avg.lengthSq() <= 1e-9) return false;
        avg.normalize();

        if (typeof this.sftw?.focusOnVector === 'function') {
            this.sftw.focusOnVector(avg);
            return true;
        }

        const controls = this.sftw?.sceneManager?.controls;
        const cam = this.sftw?.sceneManager?.camera;
        if (controls && cam) {
            const dist = cam.position.length() || 1;
            cam.position.copy(avg.multiplyScalar(dist));
            cam.lookAt(0, 0, 0);
            controls.update();
            return true;
        }

        return false;
    }

    _trigger(name, payload) {
        if (typeof this.sftw?.triggerCallback === 'function') {
            this.sftw.triggerCallback(name, payload);
        }
    }

    _publishState(extra = null) {
        const state = this.getGameState();
        if (extra && typeof extra === 'object') {
            state._event = { ...extra };
        }

        this._trigger('onAsterismGameStateChange', state);
        this._trigger('onAsterismGameStateChanged', state);
        this._syncVisualizationForGameState();
        return state;
    }

    _emitStart() {
        this._trigger('onAsterismGameStart', this.getGameState());
    }

    _emitRoundStart() {
        this._trigger('onAsterismRoundStart', this.getCurrentTargetPayload());
    }

    _emitRoundSubmitted(payload) {
        this._trigger('onAsterismRoundSubmitted', payload);
        if (payload?.isPerfect) this._trigger('onAsterismGameHit', payload);
        else this._trigger('onAsterismGameMiss', payload);
    }

    _emitEnd(report) {
        this._trigger('onAsterismGameEnd', report);
    }

    startGame(options = {}) {
        const playable = this._getPlayableAsterisms();
        if (!playable.length) {
            console.warn('⚠️ AsterismGame: nenhum asterismo jogável encontrado.');
            return false;
        }

        this._resetRuntimeStatePreservingOptions();
        this.applyConfiguration(options, { silent: true });

        let orderedIds = this._buildOrderedIds();
        if (this.state.randomOrder) orderedIds = this._shuffle(orderedIds);

        if (this.state.manualTargetId) {
            const manual = this._normalizeAsterismId(this.state.manualTargetId);
            if (manual && orderedIds.includes(manual)) {
                orderedIds = [manual, ...orderedIds.filter((id) => id !== manual)];
            }
        }

        this.state.orderedIds = orderedIds.slice();
        this.state.pendingIds = orderedIds.slice();
        this.state.active = true;
        this.state.finished = false;
        this.state.startedAt = this._getNow();
        this.state.elapsedMs = 0;

        this.state.currentAsterismId = this._pickNextTargetId();
        this.state.lastPerfectTargetId = null;

        if (!this.state.currentAsterismId) {
            this.state.active = false;
            this.state.finished = true;
            const report = this.getFinalReport();
            this._publishState({ type: 'start-empty' });
            this._emitStart();
            this._emitEnd(report);
            console.warn('⚠️ AsterismGame: sessão iniciada sem alvo válido.');
            return false;
        }

        this._startRoundClock();
        this._focusAsterismById(this.state.currentAsterismId);

        this._publishState({ type: 'start' });
        this._emitStart();
        this._emitRoundStart();

        console.log(`🚀 AsterismGame iniciado. Alvo: ${this.state.currentAsterismId}`);
        return true;
    }

    stopGame(options = {}) {
        const wasActive = !!this.state.active;

        if (this.state.startedAt > 0) {
            this.state.elapsedMs = Math.max(0, this._getNow() - this.state.startedAt);
        }
        this._captureRoundElapsedMs();

        this.state.active = false;
        this.state.finished = true;
        this.state.currentAsterismId = null;

        if (options.restoreVisible !== false) {
            this._restoreVisualizationAfterStop();
        }

        const report = this.getFinalReport();
        this._publishState({ type: wasActive ? 'stop' : 'noop-stop' });
        this._emitEnd(report);

        return report;
    }

    endGame(options = {}) {
        return this.stopGame(options);
    }

    cancelGame(options = {}) {
        this._restoreVisualizationAfterStop();
        this._resetRuntimeStatePreservingOptions();
        this._publishState({ type: 'cancel' });
        this._trigger('onAsterismGameCancelled', this.getGameState());
        return this.getGameState();
    }

    restartGame(options = {}) {
        const merged = {
            manualTargetId: options.manualTargetId ?? options.targetId ?? this.state.manualTargetId,
            randomOrder: options.randomOrder ?? this.state.randomOrder,
            autoAdvance: options.autoAdvance ?? this.state.autoAdvance,
            showLabelsDuringGame: options.showLabelsDuringGame ?? this.state.showLabelsDuringGame,
            keepAsterismsVisible: options.keepAsterismsVisible ?? this.state.keepAsterismsVisible
        };

        this.cancelGame();
        return this.startGame(merged);
    }

    getCurrentTargetPayload() {
        const id = this._normalizeAsterismId(this.state.currentAsterismId);
        const asterism = this._getAsterismById(id);
        if (!asterism) return null;

        return {
            id,
            name: asterism.name || id,
            namePt: asterism.namePt || asterism.name || id,
            aliases: Array.isArray(asterism.aliases) ? asterism.aliases.slice() : [],
            segmentCount: Array.isArray(asterism.segments) ? asterism.segments.length : 0,
            starCount: Array.isArray(asterism.stars) ? asterism.stars.length : 0,
            attemptCount: Number(this.state.attemptsById[id] || 0),
            solved: this.state.discovered.has(id),
            canAdvance: this.state.discovered.has(id),
            roundElapsedMs: this.state.active ? Math.max(0, this._getNow() - this.state.roundStartedAt) : Number(this.state.roundElapsedMs || 0)
        };
    }

    submitUserSegments(userSegments = [], options = {}) {
        if (!this.state.active) {
            return {
                ok: false,
                reason: 'inactive',
                result: null
            };
        }

        const currentId = this._normalizeAsterismId(options.asterismId || this.state.currentAsterismId);
        if (!currentId) {
            return {
                ok: false,
                reason: 'no-target',
                result: null
            };
        }

        const asterism = this._getAsterismById(currentId);
        if (!asterism || !asterism.isPlayable) {
            return {
                ok: false,
                reason: 'invalid-target',
                result: null
            };
        }

        const compare = (typeof this.sftw?.compareAsterismSegments === 'function')
            ? this.sftw.compareAsterismSegments(currentId, userSegments)
            : null;

        if (!compare) {
            return {
                ok: false,
                reason: 'compare-unavailable',
                result: null
            };
        }

        this.state.totalSubmissions += 1;
        this.state.currentRoundSubmissionCount = Number(this.state.currentRoundSubmissionCount || 0) + 1;
        this.state.submissionSerial = Number(this.state.submissionSerial || 0) + 1;
        this.state.attemptsById[currentId] = Number(this.state.attemptsById[currentId] || 0) + 1;
        this._captureRoundElapsedMs();

        const missingCount = Array.isArray(compare.missing) ? compare.missing.length : 0;
        const extraCount = Array.isArray(compare.extra) ? compare.extra.length : 0;
        const matchedCount = Array.isArray(compare.matched) ? compare.matched.length : Number(compare.matchedSegmentsCount || 0);
        const expectedCount = Array.isArray(compare.expected) ? compare.expected.length : Number(compare.expectedSegmentsCount || 0);

        const payload = {
            ...compare,
            ok: true,
            targetId: currentId,
            targetName: asterism.name || currentId,
            targetNamePt: asterism.namePt || asterism.name || currentId,
            attempts: this.state.attemptsById[currentId],
            roundSubmissionCount: this.state.currentRoundSubmissionCount,
            roundElapsedMs: Number(this.state.roundElapsedMs || 0),
            sessionElapsedMs: Math.max(0, this._getNow() - this.state.startedAt),
            missingSegmentsCount: missingCount,
            extraSegmentsCount: extraCount,
            matchedSegmentsCount: matchedCount,
            expectedSegmentsCount: expectedCount,
            isCorrect: !!compare.isPerfect,
            needsMoreWork: !compare.isPerfect,
            submissionIndex: this.state.submissionSerial
        };

        this.state.totalMissingSegments += missingCount;
        this.state.totalExtraSegments += extraCount;
        this.state.lastResult = payload;

        const prevBest = this.state.bestResultsById[currentId];
        if (!prevBest || this._isBetterResult(payload, prevBest)) {
            this.state.bestResultsById[currentId] = payload;
        }

        this.state.history.push({
            ...payload,
            submittedAt: this._getNow(),
            order: this.state.history.length + 1
        });

        if (compare.isPerfect) {
            const wasAlreadySolved = this.state.discovered.has(currentId);

            this.state.currentTargetSolved = true;
            this.state.lastPerfectTargetId = currentId;

            if (!wasAlreadySolved) {
                this.state.perfectCount += 1;
                this.state.discovered.add(currentId);
                this.state.pendingIds = this.state.pendingIds.filter((id) => id !== currentId);
            }

            if (this.state.autoAdvance) {
                this.state.currentAsterismId = this._pickNextTargetId();
                if (this.state.currentAsterismId) {
                    this._startRoundClock();
                    this._focusAsterismById(this.state.currentAsterismId);
                } else {
                    this.state.active = false;
                    this.state.finished = true;
                    this.state.currentAsterismId = null;
                }
            } else {
                this._captureRoundElapsedMs();
            }
        } else {
            this.state.currentTargetSolved = false;
        }

        if (!this.state.currentAsterismId && this.state.pendingIds.length === 0) {
            this.state.active = false;
            this.state.finished = true;
        }

        const state = this._publishState({ type: 'submit', perfect: !!compare.isPerfect });
        const finalPayload = { ...payload, state };
        this._emitRoundSubmitted(finalPayload);

        if (compare.isPerfect && this.state.active && this.state.currentAsterismId && this.state.currentAsterismId !== currentId) {
            this._emitRoundStart();
        }

        if (this.state.finished && !this.state.active) {
            this._emitEnd(this.getFinalReport());
        }

        return finalPayload;
    }

    advanceToNextTarget() {
        if (!this.state.active) return null;

        const currentId = this._normalizeAsterismId(this.state.currentAsterismId);
        if (currentId && !this.state.discovered.has(currentId)) {
            return {
                ok: false,
                reason: 'current-target-not-solved',
                currentAsterismId: currentId
            };
        }

        this.state.pendingIds = this.state.pendingIds.filter((id) => id !== currentId);
        this.state.currentAsterismId = this._pickNextTargetId();

        if (!this.state.currentAsterismId) {
            this.state.active = false;
            this.state.finished = true;
            const report = this.getFinalReport();
            this._publishState({ type: 'advance-end' });
            this._emitEnd(report);
            return report;
        }

        this._startRoundClock();
        this._focusAsterismById(this.state.currentAsterismId);
        this._publishState({ type: 'advance' });
        this._emitRoundStart();
        return this.getCurrentTargetPayload();
    }

    _isBetterResult(a, b) {
        const aMiss = Array.isArray(a?.missing) ? a.missing.length : 9999;
        const bMiss = Array.isArray(b?.missing) ? b.missing.length : 9999;
        if (aMiss !== bMiss) return aMiss < bMiss;

        const aExtra = Array.isArray(a?.extra) ? a.extra.length : 9999;
        const bExtra = Array.isArray(b?.extra) ? b.extra.length : 9999;
        if (aExtra !== bExtra) return aExtra < bExtra;

        return Number(a?.roundElapsedMs || Infinity) < Number(b?.roundElapsedMs || Infinity);
    }

    focusCurrentTarget() {
        return this._focusAsterismById(this.state.currentAsterismId);
    }

    getGameState() {
        const totalCount = this.state.orderedIds.length;
        const discoveredCount = this.state.discovered.size;
        const remainingCount = Math.max(0, totalCount - discoveredCount);

        const bestResultsById = {};
        for (const [id, result] of Object.entries(this.state.bestResultsById || {})) {
            bestResultsById[id] = {
                isPerfect: !!result?.isPerfect,
                attempts: Number(result?.attempts || 0),
                roundElapsedMs: Number(result?.roundElapsedMs || 0),
                missingCount: Array.isArray(result?.missing) ? result.missing.length : 0,
                extraCount: Array.isArray(result?.extra) ? result.extra.length : 0
            };
        }

        return {
            active: this.state.active,
            finished: this.state.finished,
            currentAsterismId: this.state.currentAsterismId,
            manualTargetId: this.state.manualTargetId,
            randomOrder: this.state.randomOrder,
            autoAdvance: this.state.autoAdvance,
            showLabelsDuringGame: this.state.showLabelsDuringGame,
            keepAsterismsVisible: this.state.keepAsterismsVisible,

            startedAt: this.state.startedAt,
            elapsedMs: this.state.active
                ? Math.max(0, this._getNow() - this.state.startedAt)
                : Number(this.state.elapsedMs || 0),
            roundStartedAt: this.state.roundStartedAt,
            roundElapsedMs: this.state.active
                ? Math.max(0, this._getNow() - this.state.roundStartedAt)
                : Number(this.state.roundElapsedMs || 0),

            orderedIds: this.state.orderedIds.slice(),
            pendingIds: this.state.pendingIds.slice(),
            discovered: Array.from(this.state.discovered),
            discoveredCount,
            totalCount,
            remainingCount,
            progress: totalCount > 0 ? (discoveredCount / totalCount) : 0,

            totalSubmissions: this.state.totalSubmissions,
            perfectCount: this.state.perfectCount,
            totalMissingSegments: this.state.totalMissingSegments,
            totalExtraSegments: this.state.totalExtraSegments,
            currentRoundSubmissionCount: Number(this.state.currentRoundSubmissionCount || 0),
            currentTargetSolved: !!this.state.currentTargetSolved,
            canAdvance: !!(this.state.currentAsterismId && this.state.discovered.has(this.state.currentAsterismId)),
            lastPerfectTargetId: this.state.lastPerfectTargetId || null,
            attemptsById: { ...(this.state.attemptsById || {}) },
            bestResultsById,

            currentTarget: this.getCurrentTargetPayload(),
            lastResult: this.state.lastResult ? { ...this.state.lastResult } : null,
            history: this.state.history.slice()
        };
    }

    getFinalReport() {
        const state = this.getGameState();
        return {
            finished: !!this.state.finished,
            totalCount: state.totalCount,
            discoveredCount: state.discoveredCount,
            remainingCount: state.remainingCount,
            progress: state.progress,
            totalSubmissions: state.totalSubmissions,
            perfectCount: state.perfectCount,
            totalMissingSegments: state.totalMissingSegments,
            totalExtraSegments: state.totalExtraSegments,
            elapsedMs: state.elapsedMs,
            discovered: state.discovered.slice(),
            history: this.state.history.slice(),
            bestResultsById: { ...(state.bestResultsById || {}) },
            currentTargetSolved: !!state.currentTargetSolved,
            lastPerfectTargetId: state.lastPerfectTargetId || null
        };
    }
}

if (typeof window !== 'undefined') {
    window.Sftw1_AsterismGame = Sftw1_AsterismGame;

    if (typeof Sftw1 !== 'undefined') {
        Sftw1.injectAsterismGameMethods = function (sftwInstance) {
            const controller = new Sftw1_AsterismGame(sftwInstance);
            sftwInstance.asterismGameController = controller;

            sftwInstance.startAsterismGame = (options = {}) => controller.startGame(options);
            sftwInstance.stopAsterismGame = (options = {}) => controller.stopGame(options);
            sftwInstance.endAsterismGame = (options = {}) => controller.endGame(options);
            sftwInstance.cancelAsterismGame = (options = {}) => controller.cancelGame(options);
            sftwInstance.restartAsterismGame = (options = {}) => controller.restartGame(options);
            sftwInstance.submitAsterismSegments = (userSegments = [], options = {}) => controller.submitUserSegments(userSegments, options);
            sftwInstance.advanceAsterismGameTarget = () => controller.advanceToNextTarget();
            sftwInstance.getAsterismGameState = () => controller.getGameState();
            sftwInstance.getAsterismGameReport = () => controller.getFinalReport();
            sftwInstance.getCurrentAsterismGameTarget = () => controller.getCurrentTargetPayload();
            sftwInstance.focusCurrentAsterismGameTarget = () => controller.focusCurrentTarget();
            sftwInstance.configureAsterismGame = (options = {}) => controller.applyConfiguration(options);

            console.log('✅ Sftw1_AsterismGame injetado');
        };
    }

    console.log('🚀 Sftw1_AsterismGame.js carregado');
}
