// Sftw1_MessierGame.js
// v1.4 — centralização da semântica de configuração do Messier
//
// Objetivo deste passo:
// - mover mais responsabilidade semântica do Messier para o controller
// - deixar a UI menos responsável por interpretar target/manualTarget
// - manter compatibilidade com o fluxo atual já estável
//
// O que este arquivo reforça:
// - normalização canônica de opções
// - semântica explícita de alvo manual
// - helpers públicos para a UI futura ficar mais simples
// - callbacks e estado continuam compatíveis com a UI atual

class Sftw1_MessierGame {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        this.state = this._createInitialState();

        console.log('🎯 Sftw1_MessierGame inicializado');
    }

    // ============================================
    // ESTADO
    // ============================================

    _createInitialState() {
        return {
            active: false,
            finished: false,

            targetId: null,
            manualTargetId: null,

            randomOrder: false,
            autoAdvance: true,
            showErrorHint: true,
            toleranceDeg: 1.2,

            totalErrors: 0,
            errorsById: {},

            discovered: new Set(),
            orderedIds: [],
            lastAngleErrorDeg: null,

            startedAt: 0,
            elapsedMs: 0,

            targetStartedAt: 0,
            targetElapsedMs: 0,
            targetTimesMs: {},
            discoveredOrder: [],
            hits: []
        };
    }

    _resetRuntimeStatePreservingOptions() {
        const keep = {
            manualTargetId: this.state.manualTargetId,
            randomOrder: this.state.randomOrder,
            autoAdvance: this.state.autoAdvance,
            showErrorHint: this.state.showErrorHint,
            toleranceDeg: this.state.toleranceDeg
        };

        this.state = this._createInitialState();

        this.state.manualTargetId = keep.manualTargetId;
        this.state.randomOrder = keep.randomOrder;
        this.state.autoAdvance = keep.autoAdvance;
        this.state.showErrorHint = keep.showErrorHint;
        this.state.toleranceDeg = keep.toleranceDeg;
    }

    // ============================================
    // CATÁLOGO / NORMALIZAÇÃO
    // ============================================

    _getCatalog() {
        if (typeof this.sftw?.getMessierAll === 'function') {
            const arr = this.sftw.getMessierAll();
            if (Array.isArray(arr)) return arr.slice();
        }
        return [];
    }

    _normalizeMessierId(id) {
        const raw = String(id || '').trim().toUpperCase().replace(/\s+/g, '');
        if (!raw) return '';

        const m = raw.match(/^M?(\d{1,3})$/);
        if (!m) return raw;

        return `M${Number(m[1])}`;
    }

    _getCatalogItemById(id) {
        const key = this._normalizeMessierId(id);
        if (!key) return null;

        if (typeof this.sftw?.getMessierById === 'function') {
            return this.sftw.getMessierById(key) || null;
        }

        const items = this._getCatalog();
        return items.find(x => this._normalizeMessierId(x?.id) === key) || null;
    }

    _buildOrderedIds() {
        const ids = this._getCatalog()
            .map(item => this._normalizeMessierId(item?.id))
            .filter(Boolean);

        ids.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
        return ids;
    }

    _getNow() {
        return Date.now();
    }

    _startTargetClock(targetId = null) {
        const key = this._normalizeMessierId(targetId || this.state.targetId);
        this.state.targetId = key || this.state.targetId || null;
        this.state.targetStartedAt = this._getNow();
        this.state.targetElapsedMs = 0;
        return this.state.targetStartedAt;
    }

    _captureCurrentTargetElapsedMs() {
        if (!this.state.targetStartedAt || !this.state.targetId) {
            this.state.targetElapsedMs = Number(this.state.targetElapsedMs || 0);
            return this.state.targetElapsedMs;
        }

        this.state.targetElapsedMs = Math.max(0, this._getNow() - this.state.targetStartedAt);
        return this.state.targetElapsedMs;
    }

    _finalizeCurrentTargetTime(targetId = null) {
        const key = this._normalizeMessierId(targetId || this.state.targetId);
        if (!key) return Number(this.state.targetElapsedMs || 0);

        const elapsed = this._captureCurrentTargetElapsedMs();
        this.state.targetTimesMs[key] = elapsed;
        return elapsed;
    }

    _buildHitEntry(targetId, meta = {}) {
        const key = this._normalizeMessierId(targetId);
        if (!key) return null;

        const sessionElapsedMs = this.state.startedAt > 0
            ? Math.max(0, this._getNow() - this.state.startedAt)
            : Number(this.state.elapsedMs || 0);

        return {
            order: this.state.discoveredOrder.length + 1,
            id: key,
            targetElapsedMs: Number(meta.targetElapsedMs || 0),
            sessionElapsedMs,
            errors: Number(this.state.errorsById[key] || 0),
            discoveredAt: this._getNow(),
            targetStartedAt: Number(this.state.targetStartedAt || 0)
        };
    }

    _pickNextTargetId() {
        const ordered = this.state.orderedIds || [];
        if (!ordered.length) return null;

        const remaining = ordered.filter(id => !this.state.discovered.has(id));
        if (!remaining.length) return null;

        if (this.state.manualTargetId) {
            const manual = this._normalizeMessierId(this.state.manualTargetId);
            if (manual && remaining.includes(manual)) return manual;
        }

        if (this.state.randomOrder) {
            const idx = Math.floor(Math.random() * remaining.length);
            return remaining[idx] || null;
        }

        return remaining[0] || null;
    }

    _normalizeOptions(opts = {}) {
        const out = {};

        if (Object.prototype.hasOwnProperty.call(opts, 'randomOrder')) {
            out.randomOrder = !!opts.randomOrder;
        }
        if (Object.prototype.hasOwnProperty.call(opts, 'autoAdvance')) {
            out.autoAdvance = !!opts.autoAdvance;
        }
        if (Object.prototype.hasOwnProperty.call(opts, 'showErrorHint')) {
            out.showErrorHint = !!opts.showErrorHint;
        }

        if (Object.prototype.hasOwnProperty.call(opts, 'toleranceDeg')) {
            const t = Number(opts.toleranceDeg);
            if (Number.isFinite(t) && t > 0) {
                out.toleranceDeg = t;
            }
        }

        const hasManual =
            Object.prototype.hasOwnProperty.call(opts, 'manualTargetId') ||
            Object.prototype.hasOwnProperty.call(opts, 'targetId');

        if (hasManual) {
            const raw = opts.manualTargetId ?? opts.targetId ?? '';
            const normalized = this._normalizeMessierId(raw);
            out.manualTargetId = normalized || null;
        }

        return out;
    }

    // ============================================
    // CALLBACKS / SINC
    // ============================================

    _trigger(name, payload) {
        if (typeof this.sftw?.triggerCallback === 'function') {
            this.sftw.triggerCallback(name, payload);
        }
    }

    _syncVisualization() {
        if (this.sftw?.visualization && typeof this.sftw.visualization.syncMessierGameVisuals === 'function') {
            try {
                this.sftw.visualization.syncMessierGameVisuals(this.getGameState());
            } catch (err) {
                console.warn('⚠️ syncMessierGameVisuals falhou:', err);
            }
        }
    }

    _publishState(extra = null) {
        const state = this.getGameState();

        if (extra && typeof extra === 'object') {
            state._event = { ...extra };
        }

        if (typeof this.sftw?.setMessierVisible === 'function') {
            this.sftw.setMessierVisible(!state.active);
        }

        // Evento canônico
        this._trigger('onMessierGameStateChange', state);
        // Compatibilidade durante a transição
        this._trigger('onMessierGameStateChanged', state);

        this._syncVisualization();
        return state;
    }

    _emitStart() {
        const state = this.getGameState();
        this._trigger('onMessierGameStart', state);
    }

    _emitEnd(result) {
        this._trigger('onMessierGameEnd', result);
    }

    _emitHit(payload) {
        this._trigger('onMessierGameHit', payload);
        this._trigger('onMessierHit', payload);
    }

    _emitMiss(payload) {
        this._trigger('onMessierGameMiss', payload);
        this._trigger('onMessierMiss', payload);
    }

    // ============================================
    // API PRINCIPAL
    // ============================================

    startGame(options = {}) {
        const catalog = this._getCatalog();
        if (!catalog.length) {
            console.warn('⚠️ MessierGame: catálogo vazio.');
            return false;
        }

        this._resetRuntimeStatePreservingOptions();
        this.applyConfiguration(options, { silent: true });

        this.state.active = true;
        this.state.finished = false;
        this.state.startedAt = Date.now();
        this.state.elapsedMs = 0;
        this.state.orderedIds = this._buildOrderedIds();

        if (!this.state.orderedIds.length) {
            console.warn('⚠️ MessierGame: não foi possível montar orderedIds.');
            this.state.active = false;
            return false;
        }

        this.state.targetId = this._pickNextTargetId();

        if (!this.state.targetId) {
            console.warn('⚠️ MessierGame: não foi possível escolher alvo inicial.');
            this.state.active = false;
            return false;
        }

        this.state.lastAngleErrorDeg = null;
        this._startTargetClock(this.state.targetId);
        this._publishState({ type: 'start' });
        this._emitStart();

        console.log(`🚀 MessierGame iniciado. Alvo: ${this.state.targetId}`);
        return true;
    }

    stopGame(options = {}) {
        const wasActive = !!this.state.active;

        if (this.state.startedAt > 0) {
            this.state.elapsedMs = Math.max(0, Date.now() - this.state.startedAt);
        }
        this._captureCurrentTargetElapsedMs();

        this.state.active = false;
        this.state.finished = true;
        this.state.targetId = null;

        if (options && options.restoreVisible !== false) {
            if (typeof this.sftw?.setMessierVisible === 'function') {
                this.sftw.setMessierVisible(true);
            }
        }

        const result = this.getGameState();
        this._publishState({ type: 'end' });

        if (wasActive) {
            this._emitEnd(result);
        }

        console.log('🛑 MessierGame encerrado');
        return true;
    }

    endGame(options = {}) {
        return this.stopGame(options);
    }

    cancelGame() {
        return this.stopGame({ restoreVisible: true });
    }

    restartGame(options = {}) {
        this.stopGame({ restoreVisible: false });
        return this.startGame(options);
    }

    // ============================================
    // CONFIGURAÇÃO / ALVO
    // ============================================

    applyConfiguration(opts = {}, meta = {}) {
        if (!opts || typeof opts !== 'object') return this.getGameState();

        const normalized = this._normalizeOptions(opts);

        if (Object.prototype.hasOwnProperty.call(normalized, 'randomOrder')) {
            this.state.randomOrder = normalized.randomOrder;
        }
        if (Object.prototype.hasOwnProperty.call(normalized, 'autoAdvance')) {
            this.state.autoAdvance = normalized.autoAdvance;
        }
        if (Object.prototype.hasOwnProperty.call(normalized, 'showErrorHint')) {
            this.state.showErrorHint = normalized.showErrorHint;
        }
        if (Object.prototype.hasOwnProperty.call(normalized, 'toleranceDeg')) {
            this.state.toleranceDeg = normalized.toleranceDeg;
        }

        if (Object.prototype.hasOwnProperty.call(normalized, 'manualTargetId')) {
            this.state.manualTargetId = normalized.manualTargetId || null;

            if (this.state.active && this.state.manualTargetId) {
                this.state.targetId = this.state.manualTargetId;
            }
        }

        if (!meta.silent) {
            this._publishState({ type: 'options' });
        }

        return this.getGameState();
    }

    // Alias canônico para a UI futura
    configureGame(opts = {}, meta = {}) {
        return this.applyConfiguration(opts, meta);
    }

    // Compatibilidade com o contrato atual
    setOptions(opts = {}, meta = {}) {
        return this.applyConfiguration(opts, meta);
    }

    setManualTarget(id) {
        const normalized = this._normalizeMessierId(id);
        if (!normalized) return false;

        const item = this._getCatalogItemById(normalized);
        if (!item) return false;

        this.state.manualTargetId = normalized;

        if (this.state.active) {
            this.state.targetId = normalized;
            this._startTargetClock(normalized);
            this._publishState({ type: 'target' });
        } else {
            this._publishState({ type: 'manual-target' });
        }

        return true;
    }

    setTarget(id) {
        return this.setManualTarget(id);
    }

    setTargetId(id) {
        return this.setManualTarget(id);
    }

    clearManualTarget() {
        this.state.manualTargetId = null;
        if (!this.state.active) {
            this.state.targetId = null;
        }
        this._publishState({ type: 'clear-manual-target' });
        return true;
    }

    hasManualTarget() {
        return !!this.state.manualTargetId;
    }

    getConfigState() {
        return {
            randomOrder: !!this.state.randomOrder,
            autoAdvance: !!this.state.autoAdvance,
            showErrorHint: !!this.state.showErrorHint,
            toleranceDeg: Number(this.state.toleranceDeg || 1.2),
            manualTargetId: this.state.manualTargetId || null,
            hasManualTarget: !!this.state.manualTargetId
        };
    }

    isActive() {
        return !!this.state.active;
    }

    // ============================================
    // MECÂNICA DE ACERTO / ERRO
    // ============================================

    _advanceTargetIfNeeded() {
        const next = this._pickNextTargetId();

        if (!next) {
            this.stopGame({ restoreVisible: true });
            return null;
        }

        this.state.targetId = next;
        this._startTargetClock(next);
        this._publishState({ type: 'advance' });
        return next;
    }

    _markDiscovered(id, meta = {}) {
        const key = this._normalizeMessierId(id);
        if (!key) return false;

        if (this.state.discovered.has(key)) return false;

        this.state.discovered.add(key);
        this.state.lastAngleErrorDeg = null;

        const entry = this._buildHitEntry(key, meta);
        if (entry) {
            this.state.discoveredOrder.push(key);
            this.state.hits.push(entry);
        }

        return true;
    }

    _registerMiss(targetId, angleErrorDeg) {
        const key = this._normalizeMessierId(targetId);
        this.state.totalErrors += 1;
        this.state.lastAngleErrorDeg = Number.isFinite(Number(angleErrorDeg)) ? Number(angleErrorDeg) : null;

        if (key) {
            this.state.errorsById[key] = (this.state.errorsById[key] || 0) + 1;
        }

        const state = this.getGameState();
        const payload = {
            correct: false,
            targetId: key,
            angleErrorDeg: this.state.lastAngleErrorDeg,
            totalErrors: this.state.totalErrors,
            errorsById: { ...this.state.errorsById },
            message: this.state.lastAngleErrorDeg == null
                ? `❌ Erro em ${key || 'alvo atual'}.`
                : `❌ Erro em ${key || 'alvo atual'}: ${this.state.lastAngleErrorDeg.toFixed(2)}°`,
            state
        };

        this._publishState({
            type: 'miss',
            targetId: key,
            angleErrorDeg: this.state.lastAngleErrorDeg
        });

        this._emitMiss(payload);
        return payload;
    }

    _registerHit(hitId) {
        const key = this._normalizeMessierId(hitId);
        const currentTarget = this._normalizeMessierId(this.state.targetId);
        const targetElapsedMs = this._finalizeCurrentTargetTime(currentTarget);
        const wasNew = this._markDiscovered(key, { targetElapsedMs });
        const hitEntry = this.state.hits[this.state.hits.length - 1] || null;

        const currentState = this.getGameState();
        const payload = {
            correct: true,
            hitId: key,
            targetId: currentTarget,
            discoveredCount: this.state.discovered.size,
            wasNew,
            targetElapsedMs,
            hitEntry,
            message: `✅ Acertou ${key}.`,
            state: currentState
        };

        this._publishState({
            type: 'hit',
            hitId: key,
            targetId: currentTarget,
            targetElapsedMs
        });

        this._emitHit(payload);

        if (this.state.autoAdvance) {
            this._advanceTargetIfNeeded();
        } else {
            this._captureCurrentTargetElapsedMs();
            this._publishState({ type: 'post-hit' });
        }

        return payload;
    }

    submitPickedMessierId(hitId) {
        if (!this.state.active) {
            return { correct: false, reason: 'inactive' };
        }

        const picked = this._normalizeMessierId(hitId);
        const target = this._normalizeMessierId(this.state.targetId);

        if (!picked || !target) {
            return { correct: false, reason: 'invalid-id' };
        }

        if (picked === target) {
            return this._registerHit(picked);
        }

        return this._registerMiss(target, null);
    }

    submitAngleError(angleErrorDeg) {
        if (!this.state.active) {
            return { correct: false, reason: 'inactive' };
        }

        const angle = Number(angleErrorDeg);
        if (!Number.isFinite(angle)) {
            return { correct: false, reason: 'invalid-angle' };
        }

        if (angle <= Number(this.state.toleranceDeg || 0)) {
            return this._registerHit(this.state.targetId);
        }

        return this._registerMiss(this.state.targetId, angle);
    }

    evaluatePickResult(result) {
        if (!this.state.active) {
            return { correct: false, reason: 'inactive' };
        }

        if (typeof result === 'string') {
            return this.submitPickedMessierId(result);
        }

        if (result && typeof result === 'object') {
            if (result.id) return this.submitPickedMessierId(result.id);
            if (result.hitId) return this.submitPickedMessierId(result.hitId);
            if (result.angleErrorDeg != null) return this.submitAngleError(result.angleErrorDeg);
        }

        return { correct: false, reason: 'invalid-result' };
    }

    // ============================================
    // ESTADO PÚBLICO
    // ============================================

    getGameState() {
        const total = this.state.orderedIds.length || this._buildOrderedIds().length || 0;
        const discoveredCount = this.state.discovered.size || 0;
        const elapsedMs = this.state.startedAt > 0 && this.state.active
            ? Math.max(0, Date.now() - this.state.startedAt)
            : Number(this.state.elapsedMs || 0);
        const targetElapsedMs = this.state.targetStartedAt > 0 && this.state.active
            ? Math.max(0, Date.now() - this.state.targetStartedAt)
            : Number(this.state.targetElapsedMs || 0);

        return {
            active: !!this.state.active,
            finished: !!this.state.finished,

            targetId: this.state.targetId,
            manualTargetId: this.state.manualTargetId,
            hasManualTarget: !!this.state.manualTargetId,

            randomOrder: !!this.state.randomOrder,
            autoAdvance: !!this.state.autoAdvance,
            showErrorHint: !!this.state.showErrorHint,
            toleranceDeg: Number(this.state.toleranceDeg || 0),

            totalErrors: Number(this.state.totalErrors || 0),
            errorsById: { ...this.state.errorsById },

            discovered: Array.from(this.state.discovered),
            discoveredCount,
            totalCount: total,
            progress: total > 0 ? discoveredCount / total : 0,

            orderedIds: this.state.orderedIds.slice(),
            discoveredOrder: this.state.discoveredOrder.slice(),
            hits: this.state.hits.map(hit => ({ ...hit })),
            targetTimesMs: { ...this.state.targetTimesMs },
            targetElapsedMs,
            lastAngleErrorDeg: this.state.lastAngleErrorDeg,

            startedAt: this.state.startedAt,
            elapsedMs
        };
    }


    getTargetStats(id) {
        const key = this._normalizeMessierId(id);
        if (!key) return null;

        const hit = this.state.hits.find(item => item.id === key) || null;
        return {
            id: key,
            discovered: this.state.discovered.has(key),
            errors: Number(this.state.errorsById[key] || 0),
            targetElapsedMs: Number(this.state.targetTimesMs[key] || 0),
            order: hit?.order || null,
            hit: hit ? { ...hit } : null
        };
    }

    getFinalReport() {
        return this.getGameState();
    }
}

// ============================================
// AGREGAÇÃO NO CORE
// ============================================

function injectMessierGameMethods(sftwInstance) {
    if (!sftwInstance.messierGameController) {
        sftwInstance.messierGameController = new Sftw1_MessierGame(sftwInstance);
    }

    const game = sftwInstance.messierGameController;

    sftwInstance.startMessierGame = (opts = {}) => game.startGame(opts);
    sftwInstance.stopMessierGame = (opts = {}) => game.stopGame(opts);
    sftwInstance.endMessierGame = (opts = {}) => game.endGame(opts);
    sftwInstance.cancelMessierGame = () => game.cancelGame();
    sftwInstance.restartMessierGame = (opts = {}) => game.restartGame(opts);

    sftwInstance.getMessierGameState = () => game.getGameState();
    sftwInstance.getMessierGameReport = () => game.getFinalReport();
    sftwInstance.getMessierGameConfig = () => game.getConfigState();
    sftwInstance.getMessierTargetStats = (id) => game.getTargetStats(id);

    sftwInstance.setMessierGameOptions = (opts = {}) => game.applyConfiguration(opts);
    sftwInstance.configureMessierGame = (opts = {}) => game.configureGame(opts);

    sftwInstance.setMessierGameTarget = (id) => game.setManualTarget(id);
    sftwInstance.setMessierManualTarget = (id) => game.setManualTarget(id);
    sftwInstance.clearMessierManualTarget = () => game.clearManualTarget();
    sftwInstance.hasMessierManualTarget = () => game.hasManualTarget();

    sftwInstance.isMessierGameActive = () => game.isActive();

    sftwInstance.evaluateMessierPick = (result) => game.evaluatePickResult(result);
    sftwInstance.submitMessierPickedId = (id) => game.submitPickedMessierId(id);
    sftwInstance.submitMessierAngleError = (deg) => game.submitAngleError(deg);

    console.log('🎯 Métodos do MessierGame injetados');
}

if (typeof window !== 'undefined') {
    window.Sftw1_MessierGame = Sftw1_MessierGame;
    window.injectMessierGameMethods = injectMessierGameMethods;

    if (typeof window.Sftw1 !== 'undefined') {
        window.Sftw1.injectMessierGameMethods = injectMessierGameMethods;
    }
}
