// Sftw1_NeighborGame.js
// ETAPA 2D — versão estável/refeita
// Objetivo:
// - corrigir erros do módulo anterior
// - manter compatibilidade com UI/Core/Games
// - suportar treino por constelação específica ou sessão automática
// - expor estado rico para checklist, histórico, tempo e acurácia
// - NÃO cuidar de UI nem de renderização 3D

class Sftw1_NeighborGame {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        this.state = this._createInitialState();
        console.log('🧩 Sftw1_NeighborGame inicializado (ETAPA 2D)');
    }

    _createInitialState() {
        return {
            active: false,
            finished: false,

            // cronômetro da sessão
            startedAtMs: 0,
            elapsedTime: 0,
            timerInterval: null,

            // configuração da sessão
            difficulty: 'easy',              // easy | hidden-count
            mode: 'single-target',           // single-target | sequence
            orderMode: 'selected',           // selected | alphabetical | random
            autoAdvance: false,
            revealExpectedCount: true,
            allowFinishWhenUserWants: false,
            blackoutView: false,

            // sessão / alvos
            selectedTarget: null,
            currentTarget: null,
            currentRoundIndex: -1,
            rounds: [],
            pendingTargets: [],
            usedTargets: new Set(),

            // pontuação
            score: 0,
            maxScore: 0
        };
    }

    // ============================================================
    // API PÚBLICA
    // ============================================================
    startGame(options = {}) {
        if (this.state.active) {
            console.warn('⚠️ NeighborGame: jogo já ativo');
            return this.getGameState();
        }

        const eligible = this._getEligibleConstellations();
        if (!eligible.length) {
            throw new Error('NeighborGame: nenhuma constelação elegível encontrada.');
        }

        const cfg = this._normalizeStartOptions(options, eligible);
        this.resetState();

        this.state.difficulty = cfg.difficulty;
        this.state.mode = cfg.mode;
        this.state.orderMode = cfg.orderMode;
        this.state.autoAdvance = cfg.autoAdvance;
        this.state.revealExpectedCount = cfg.revealExpectedCount;
        this.state.allowFinishWhenUserWants = cfg.allowFinishWhenUserWants;
        this.state.blackoutView = cfg.blackoutView;

        this.state.selectedTarget = cfg.selectedTarget;
        this.state.pendingTargets = cfg.targets.slice();
        this.state.active = true;
        this.state.finished = false;
        this.state.startedAtMs = performance.now();

        this._applyVisualizationMode(true);
        this.startTimer();

        const firstRound = this.nextRound();
        this.publishGameState();
        this._trigger('onNeighborGameStart', this.getGameState());

        console.log(
            `🚀 NeighborGame iniciado | mode=${this.state.mode} | order=${this.state.orderMode} | difficulty=${this.state.difficulty}`
        );

        return firstRound || this.getGameState();
    }

    endGame() {
        if (!this.state.active && !this.state.finished) {
            return this.getFinalReport();
        }

        this.stopTimer();
        this.state.active = false;
        this.state.finished = true;
        this._applyVisualizationMode(false);

        const report = this.getFinalReport();
        this.publishGameState();
        this._trigger('onNeighborGameEnd', report);

        console.log('🏁 NeighborGame finalizado', report);
        return report;
    }

    cancelGame() {
        this.stopTimer();
        this._applyVisualizationMode(false);
        this.resetState();
        this.publishGameState();
        this._trigger('onNeighborGameCancelled', this.getGameState());
        return this.getGameState();
    }

    restartGame(options = {}) {
        const merged = {
            difficulty: options.difficulty ?? this.state.difficulty,
            mode: options.mode ?? this.state.mode,
            orderMode: options.orderMode ?? this.state.orderMode,
            autoAdvance: options.autoAdvance ?? this.state.autoAdvance,
            blackoutView: options.blackoutView ?? this.state.blackoutView,
            targetConstellation:
                options.targetConstellation ??
                options.selectedTarget ??
                options.targetAbbr ??
                this.state.selectedTarget
        };

        this.cancelGame();
        return this.startGame(merged);
    }

    returnToMainMenu() {
        return this.endGame();
    }

    nextRound() {
        if (!this.state.active) return null;

        if (!this.state.pendingTargets.length) {
            return this.endGame();
        }

        const target = this.state.pendingTargets.shift();
        this.state.currentTarget = target;
        this.state.currentRoundIndex += 1;
        this.state.usedTargets.add(target);

        const correctNeighbors = this._getNeighbors(target);
        const round = {
            index: this.state.currentRoundIndex,
            targetAbbr: target,
            targetName: this._getConstellationDisplayName(target),

            difficulty: this.state.difficulty,
            mode: this.state.mode,
            orderMode: this.state.orderMode,
            blackoutView: this.state.blackoutView,

            correctNeighbors,
            correctNeighborNames: correctNeighbors.map((a) => this._getConstellationDisplayName(a)),

            submittedRaw: [],
            submittedNormalized: [],
            matched: [],
            missing: [],
            invalid: [],

            scoreEarned: 0,
            maxScore: correctNeighbors.length,

            startedAtMs: performance.now(),
            elapsedAtSubmit: null,
            submittedAt: null,
            finished: false
        };

        this.state.rounds.push(round);
        this.state.maxScore += round.maxScore;

        const payload = this.serializeRound(round);
        this.publishGameState();
        this._trigger('onNeighborRoundStart', payload);

        console.log(`🎯 NeighborGame: rodada ${round.index + 1} -> ${round.targetAbbr}`);
        return payload;
    }

    submitAnswer(inputText) {
        if (!this.state.active) return null;

        const round = this.getCurrentRound();
        if (!round) return null;
        if (round.finished) return this.serializeRound(round);

        const parsed = this._parseAnswerList(inputText);
        const result = this._evaluateRound(round, parsed);
        const elapsedSeconds = Math.max(0, Math.floor((performance.now() - round.startedAtMs) / 1000));

        round.submittedRaw = parsed.original;
        round.submittedNormalized = parsed.normalized;
        round.matched = result.matched;
        round.missing = result.missing;
        round.invalid = result.invalid;
        round.scoreEarned = result.score;
        round.submittedAt = this.state.elapsedTime;
        round.elapsedAtSubmit = elapsedSeconds;
        round.finished = true;

        this.state.score += round.scoreEarned;

        const payload = this.serializeRound(round);
        this.publishGameState();
        this._trigger('onNeighborRoundSubmitted', payload);

        if (this.state.autoAdvance && this.state.pendingTargets.length > 0) {
            this._trigger('onNeighborRoundAutoAdvanceReady', {
                fromRound: payload,
                nextTargetAbbr: this.state.pendingTargets[0] || null
            });
        }

        console.log(
            `📝 NeighborGame: rodada ${round.index + 1}, pontos ${round.scoreEarned}/${round.maxScore}, tempo=${elapsedSeconds}s`
        );
        return payload;
    }

    getGameState() {
        const currentRound = this.getCurrentRound();
        const totalRounds = this.state.rounds.length + this.state.pendingTargets.length;
        const roundsCompleted = this.state.rounds.filter((r) => r.finished).length;

        return {
            active: this.state.active,
            finished: this.state.finished,

            difficulty: this.state.difficulty,
            mode: this.state.mode,
            orderMode: this.state.orderMode,
            autoAdvance: this.state.autoAdvance,
            revealExpectedCount: this.state.revealExpectedCount,
            allowFinishWhenUserWants: this.state.allowFinishWhenUserWants,
            blackoutView: this.state.blackoutView,

            elapsedTime: this.state.elapsedTime,
            score: this.state.score,
            maxScore: this.state.maxScore,
            accuracy: this.state.maxScore > 0 ? (this.state.score / this.state.maxScore) : 0,

            selectedTarget: this.state.selectedTarget,
            currentTarget: currentRound ? {
                abbr: currentRound.targetAbbr,
                name: currentRound.targetName,
                expectedCount: currentRound.correctNeighbors.length,
                expectedCountVisible: !!this.state.revealExpectedCount,
                roundElapsedTime: currentRound.finished
                    ? (currentRound.elapsedAtSubmit ?? 0)
                    : Math.max(0, Math.floor((performance.now() - currentRound.startedAtMs) / 1000))
            } : null,

            currentRoundIndex: this.state.currentRoundIndex,
            roundsCompleted,
            totalRounds,
            pendingTargetsCount: this.state.pendingTargets.length,
            usedTargets: Array.from(this.state.usedTargets),
            hasSubmittedCurrentRound: !!(currentRound && currentRound.finished),

            lastRoundResult: this.getLastRoundResult()
        };
    }

    getFinalReport() {
        return {
            finished: this.state.finished,
            difficulty: this.state.difficulty,
            mode: this.state.mode,
            orderMode: this.state.orderMode,
            autoAdvance: this.state.autoAdvance,
            blackoutView: this.state.blackoutView,
            elapsedTime: this.state.elapsedTime,
            totalScore: this.state.score,
            maxScore: this.state.maxScore,
            accuracy: this.state.maxScore > 0 ? (this.state.score / this.state.maxScore) : 0,
            totalRounds: this.state.rounds.length,
            selectedTarget: this.state.selectedTarget,
            rounds: this.state.rounds.map((r) => this.serializeRound(r))
        };
    }

    getCurrentRound() {
        if (this.state.currentRoundIndex < 0) return null;
        return this.state.rounds[this.state.currentRoundIndex] || null;
    }

    getLastRoundResult() {
        const rounds = this.state.rounds || [];
        if (!rounds.length) return null;
        return this.serializeRound(rounds[rounds.length - 1]);
    }

    // ============================================================
    // CONFIGURAÇÃO / NORMALIZAÇÃO
    // ============================================================
    _normalizeStartOptions(options = {}, eligible = []) {
        const selectedTarget = this._resolveTargetAbbr(
            options.targetConstellation ??
            options.selectedTarget ??
            options.targetAbbr ??
            options.abbr ??
            null
        );

        let difficulty = String(options.difficulty || 'easy').trim().toLowerCase();
        if (!difficulty) difficulty = 'easy';
        if (!['easy', 'hidden-count'].includes(difficulty)) difficulty = 'easy';

        let orderMode = String(options.orderMode || '').trim().toLowerCase();
        if (!orderMode) {
            orderMode = selectedTarget ? 'selected' : 'alphabetical';
        }
        if (!['selected', 'alphabetical', 'random'].includes(orderMode)) {
            orderMode = selectedTarget ? 'selected' : 'alphabetical';
        }

        let mode = String(options.mode || '').trim().toLowerCase();
        if (!mode) {
            mode = selectedTarget || orderMode === 'selected' ? 'single-target' : 'sequence';
        }
        if (!['single-target', 'sequence'].includes(mode)) {
            mode = selectedTarget || orderMode === 'selected' ? 'single-target' : 'sequence';
        }

        const autoAdvance = !!options.autoAdvance;
        const blackoutView = !!(options.blackoutView ?? options.disablePlanetarium ?? false);

        const revealExpectedCount = difficulty === 'easy';
        const allowFinishWhenUserWants = difficulty !== 'easy';

        let targets = [];
        if (selectedTarget) {
            targets = [selectedTarget];
            mode = 'single-target';
            orderMode = 'selected';
        } else {
            const base = eligible.slice();
            if (orderMode === 'random') {
                targets = this._shuffle(base);
            } else {
                targets = base.sort((a, b) => this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR'));
            }
        }

        return {
            difficulty,
            mode,
            orderMode,
            autoAdvance,
            revealExpectedCount,
            allowFinishWhenUserWants,
            blackoutView,
            selectedTarget,
            targets
        };
    }

    _resolveTargetAbbr(input) {
        if (!input) return null;

        const raw = String(input).trim();
        if (!raw) return null;

        const list = this.sftw.constellations || [];
        const direct = list.find((c) => String(c?.abbreviation || '').toLowerCase() === raw.toLowerCase());
        if (direct) return direct.abbreviation;

        const normalized = this._normalize(raw);
        for (const c of list) {
            const names = new Set();
            if (c.abbreviation) names.add(this._normalize(c.abbreviation));
            if (c.name) names.add(this._normalize(c.name));
            if (Array.isArray(c.aliases)) {
                for (const a of c.aliases) names.add(this._normalize(a));
            }
            if (c.fullName) names.add(this._normalize(c.fullName));
            if (c.latinName) names.add(this._normalize(c.latinName));
            if (c.portugueseName) names.add(this._normalize(c.portugueseName));

            if (names.has(normalized)) return c.abbreviation;
        }

        return null;
    }

    // ============================================================
    // ESTADO / CALLBACKS
    // ============================================================
    publishGameState() {
        const state = this.getGameState();
        this._trigger('onNeighborGameStateChange', state);
        this._trigger('onNeighborGameStateChanged', state);
    }

    startTimer() {
        this.stopTimer();
        this.state.elapsedTime = 0;

        this.state.timerInterval = setInterval(() => {
            if (!this.state.startedAtMs) return;
            this.state.elapsedTime = Math.floor((performance.now() - this.state.startedAtMs) / 1000);
            this.publishGameState();
        }, 1000);
    }

    stopTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
        }
        if (this.state.startedAtMs) {
            this.state.elapsedTime = Math.floor((performance.now() - this.state.startedAtMs) / 1000);
        }
    }

    resetState() {
        this.stopTimer();
        this.state = this._createInitialState();
    }

    _trigger(name, payload) {
        try {
            if (typeof this.sftw.triggerCallback === 'function') {
                this.sftw.triggerCallback(name, payload);
            } else if (this.sftw.callbacks && typeof this.sftw.callbacks[name] === 'function') {
                this.sftw.callbacks[name](payload);
            }
        } catch (err) {
            console.warn(`⚠️ NeighborGame callback "${name}" falhou:`, err);
        }
    }

    _applyVisualizationMode(isActive) {
        if (!this.sftw || !this.sftw.visualization) return;

        const vis = this.sftw.visualization;
        if (typeof vis.setNeighborTrainingVisualMode === 'function') {
            vis.setNeighborTrainingVisualMode({
                active: !!isActive,
                blackout: !!this.state.blackoutView,
                targetAbbr: this.state.currentTarget || this.state.selectedTarget || null
            });
            return;
        }

        // fallback simples: esconder grade/estrelas/limites quando blackout estiver ativo
        if (this.state.blackoutView) {
            if (isActive) {
                this._savedVisualState = {
                    showGrid: !!this.sftw.settings?.showGrid,
                    showStars: !!this.sftw.settings?.showStars,
                    showBoundaries: !!this.sftw.settings?.showBoundaries,
                    showLabels: !!this.sftw.settings?.showLabels
                };

                this.sftw.settings.showGrid = false;
                this.sftw.settings.showStars = false;
                this.sftw.settings.showBoundaries = false;
                this.sftw.settings.showLabels = false;
            } else if (this._savedVisualState) {
                Object.assign(this.sftw.settings, this._savedVisualState);
            }

            if (typeof this.sftw.toggleGrid === 'function') this.sftw.toggleGrid();
            if (typeof this.sftw.toggleStars === 'function') this.sftw.toggleStars();
            if (typeof this.sftw.toggleBoundaries === 'function') this.sftw.toggleBoundaries();
            if (typeof this.sftw.toggleLabels === 'function') this.sftw.toggleLabels();
        }
    }

    // ============================================================
    // AVALIAÇÃO
    // ============================================================
    _evaluateRound(round, parsedAnswers) {
        const correctSet = new Set(round.correctNeighbors);
        const matchedSet = new Set();
        const invalidSet = new Set();

        for (const item of parsedAnswers.normalized) {
            const abbr = this._resolveToAbbr(item);
            if (abbr && correctSet.has(abbr)) matchedSet.add(abbr);
            else invalidSet.add(item);
        }

        const matched = Array.from(matchedSet).sort((a, b) =>
            this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR')
        );

        const missing = round.correctNeighbors
            .filter((a) => !matchedSet.has(a))
            .sort((a, b) =>
                this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR')
            );

        const invalid = Array.from(invalidSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

        return {
            score: matched.length,
            matched,
            missing,
            invalid
        };
    }

    _parseAnswerList(inputText) {
        if (Array.isArray(inputText)) {
            const original = inputText.map((s) => String(s || '').trim()).filter(Boolean);
            const normalized = [];
            const seen = new Set();
            for (const token of original) {
                const norm = this._normalize(token);
                if (!norm || seen.has(norm)) continue;
                seen.add(norm);
                normalized.push(norm);
            }
            return { original, normalized };
        }

        const raw = String(inputText || '');
        const original = raw
            .split(/[\n,;|]+/g)
            .map((s) => s.trim())
            .filter(Boolean);

        const normalized = [];
        const seen = new Set();
        for (const token of original) {
            const norm = this._normalize(token);
            if (!norm || seen.has(norm)) continue;
            seen.add(norm);
            normalized.push(norm);
        }

        return { original, normalized };
    }

    _resolveToAbbr(normalizedText) {
        if (!normalizedText) return null;

        const all = this.sftw.constellations || [];
        for (const c of all) {
            const names = new Set();
            if (c.abbreviation) names.add(this._normalize(c.abbreviation));
            if (c.name) names.add(this._normalize(c.name));
            if (Array.isArray(c.aliases)) {
                for (const a of c.aliases) names.add(this._normalize(a));
            }
            if (c.fullName) names.add(this._normalize(c.fullName));
            if (c.latinName) names.add(this._normalize(c.latinName));
            if (c.portugueseName) names.add(this._normalize(c.portugueseName));

            if (names.has(normalizedText)) return c.abbreviation;
        }

        return null;
    }

    // ============================================================
    // DADOS
    // ============================================================
    _getEligibleConstellations() {
        const list = this.sftw.constellations || [];
        return list
            .filter((c) => c && c.abbreviation)
            .filter((c) => this._getNeighbors(c.abbreviation).length > 0)
            .map((c) => c.abbreviation);
    }

    _getNeighbors(abbr) {
        if (typeof this.sftw.getConstellationNeighbors === 'function') {
            const arr = this.sftw.getConstellationNeighbors(abbr) || [];
            return arr.slice().sort((a, b) =>
                this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR')
            );
        }

        const c = (this.sftw.constellations || []).find((x) => x.abbreviation === abbr);
        const arr = c?.neighbors || [];
        return arr.slice().sort((a, b) =>
            this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR')
        );
    }

    _getConstellationDisplayName(abbr) {
        const c = (this.sftw.constellations || []).find((x) => x.abbreviation === abbr);
        return c?.name || abbr;
    }

    serializeRound(round) {
        return {
            index: round.index,
            targetAbbr: round.targetAbbr,
            targetName: round.targetName,
            expectedCount: round.correctNeighbors.length,
            expectedCountVisible: !!this.state.revealExpectedCount,
            scoreEarned: round.scoreEarned,
            maxScore: round.maxScore,
            accuracy: round.maxScore > 0 ? (round.scoreEarned / round.maxScore) : 0,
            elapsedAtSubmit: round.elapsedAtSubmit,
            matched: round.matched.map((a) => ({ abbr: a, name: this._getConstellationDisplayName(a) })),
            missing: round.missing.map((a) => ({ abbr: a, name: this._getConstellationDisplayName(a) })),
            invalid: round.invalid.slice(),
            submittedRaw: round.submittedRaw.slice(),
            submittedNormalized: round.submittedNormalized.slice(),
            submittedAt: round.submittedAt,
            finished: !!round.finished
        };
    }

    _normalize(str) {
        return String(str || '')
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

// ============================================================
// INJEÇÃO NO CORE
// ============================================================
if (typeof window !== 'undefined') {
    window.Sftw1_NeighborGame = Sftw1_NeighborGame;

    if (typeof Sftw1 !== 'undefined') {
        Sftw1.injectNeighborGameMethods = function (sftwInstance) {
            const neighborGame = new Sftw1_NeighborGame(sftwInstance);
            sftwInstance.neighborGame = neighborGame;

            // API principal padronizada
            sftwInstance.startNeighborGame = (options = {}) => neighborGame.startGame(options);
            sftwInstance.nextNeighborRound = () => neighborGame.nextRound();
            sftwInstance.submitNeighborAnswer = (inputText) => neighborGame.submitAnswer(inputText);
            sftwInstance.endNeighborGame = () => neighborGame.endGame();
            sftwInstance.cancelNeighborGame = () => neighborGame.cancelGame();
            sftwInstance.restartNeighborGame = (options = {}) => neighborGame.restartGame(options);
            sftwInstance.getNeighborGameState = () => neighborGame.getGameState();
            sftwInstance.getNeighborGameReport = () => neighborGame.getFinalReport();
            sftwInstance.getNeighborLastRoundResult = () => neighborGame.getLastRoundResult();

            // aliases explícitos usados por UI/refactors
            sftwInstance.startConstellationNeighborTraining = (options = {}) => neighborGame.startGame(options);
            sftwInstance.submitConstellationNeighborTraining = (inputText) => neighborGame.submitAnswer(inputText);
            sftwInstance.endConstellationNeighborTraining = () => neighborGame.endGame();
            sftwInstance.cancelConstellationNeighborTraining = () => neighborGame.cancelGame();
            sftwInstance.restartConstellationNeighborTraining = (options = {}) => neighborGame.restartGame(options);
            sftwInstance.getConstellationNeighborTrainingState = () => neighborGame.getGameState();
            sftwInstance.getConstellationNeighborTrainingReport = () => neighborGame.getFinalReport();
            sftwInstance.getConstellationNeighborLastRoundResult = () => neighborGame.getLastRoundResult();

            console.log('✅ Sftw1_NeighborGame injetado no Core');
        };
    }

    console.log('✅ Sftw1_NeighborGame.js carregado (ETAPA 2D)');
}
