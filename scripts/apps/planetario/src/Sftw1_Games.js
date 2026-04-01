// Sftw1_Games.js
// Núcleo central de lógica de jogos do planetário
// Versão v3 — reforço de compatibilidade com o fluxo real do jogo principal
//
// Objetivo:
// - centralizar a lógica dos jogos
// - manter compatibilidade com a API antiga
// - reduzir diferenças práticas em relação ao Sftw1_Game.js legado
// - NÃO cuidar de UI
// - NÃO cuidar de rAenderização 3D

class Sftw1_ConstellationGame {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;

        this.state = {
            active: false,
            startTime: null,
            elapsedTime: 0,
            timerInterval: null,
            score: 0,
            startConstellation: null,
            currentConstellation: null,
            discovered: new Set(),
            allowedTargets: new Set(),
            useAdjacency: false,
            attempts: {},
            finished: false,
            visualOptions: {
                showBoundaries: true,
                showLabels: false
            }
        };

        console.log('🎮 Sftw1_ConstellationGame inicializado');
    }

    setupControls() {
        console.log('🎮 Games/Constellation: setupControls chamado');
        return true;
    }

    _resolveConstellationAbbr(input) {
        const raw = String(input || '').trim();
        if (!raw) return '';

        const direct = (this.sftw.constellations || []).find((c) =>
            String(c?.abbreviation || '').toLowerCase() === raw.toLowerCase()
        );
        if (direct) return direct.abbreviation;

        const normalized = this.normalizeInput(raw);
        const byAnyName = (this.sftw.constellations || []).find((c) => {
            const names = new Set();
            if (c?.abbreviation) names.add(this.normalizeInput(c.abbreviation));
            if (c?.name) names.add(this.normalizeInput(c.name));
            if (c?.fullName) names.add(this.normalizeInput(c.fullName));
            if (c?.latinName) names.add(this.normalizeInput(c.latinName));
            if (c?.portugueseName) names.add(this.normalizeInput(c.portugueseName));
            const ptFallback = this._getPortugueseFallback(c?.abbreviation);
            if (ptFallback) names.add(this.normalizeInput(ptFallback));
            if (Array.isArray(c?.aliases)) c.aliases.forEach((a) => names.add(this.normalizeInput(a)));
            return names.has(normalized);
        });

        return byAnyName?.abbreviation || raw;
    }

    _getConstellationData(abbr) {
        const key = this._resolveConstellationAbbr(abbr);
        return (this.sftw.constellations || []).find((c) => c.abbreviation === key) || null;
    }

    _getPortugueseFallback(abbr) {
        if (!abbr) return '';
        if (typeof this.sftw?.getConstellationNamePt === 'function') {
            return this.sftw.getConstellationNamePt(abbr) || '';
        }
        return '';
    }


    showSelection() {
        if (!this.sftw.constellations || this.sftw.constellations.length === 0) {
            console.error('❌ Nenhuma constelação carregada');
            return;
        }

        this.sftw.triggerCallback?.('onGameStateChange', {
            state: 'selecting'
        });

        console.log('🎯 Games/Constellation: aguardando seleção de constelação inicial');
    }

    startGame(constellationAbbr, options = {}) {
        const startAbbr = this._resolveConstellationAbbr(constellationAbbr);
        if (!startAbbr) {
            console.error('❌ startGame: constelação inválida');
            return;
        }

        if (this.state.active) {
            console.warn('⚠️ Jogo já está ativo');
            return this.getGameState();
        }

        this.resetState();

        this.state.active = true;
        this.state.finished = false;
        this.state.startConstellation = startAbbr;
        this.state.currentConstellation = startAbbr;
        this.state.score = 0;
        this.state.visualOptions = {
            showBoundaries: options?.showBoundaries !== undefined ? !!options.showBoundaries : true,
            showLabels: options?.showLabels !== undefined ? !!options.showLabels : false
        };

        this.sftw.callbacks = this.sftw.callbacks || {};
        this.sftw.callbacks.onConstellationClick = (abbr) => this.handleConstellationClick(abbr);

        if (typeof this.sftw.startGameMode === 'function') {
            this.sftw.startGameMode(startAbbr, this.state.visualOptions);
        }

        // Descobrir constelação inicial
        this.discoverConstellation(startAbbr);

        if (this.state.useAdjacency) {
            this.expandAllowedTargets(startAbbr);
        } else {
            this.state.allowedTargets.clear();
        }

        if (typeof this.sftw.focusOnConstellation === 'function') {
            this.sftw.focusOnConstellation(startAbbr);
        }

        this.startTimer();
        this.publishGameState();
        this.sftw.triggerCallback?.('onGameStart', startAbbr);

        console.log(`🚀 Games/Constellation: jogo iniciado em ${startAbbr}`);
        return this.getGameState();
    }

    endGame() {
        if (!this.state.active) {
            return this.buildResult()
        }

        this.stopTimer()
        this.state.active = false
        this.state.finished = true

        if (typeof this.sftw.endGameMode === 'function') {
            this.sftw.endGameMode()
        }

        if (this.sftw.callbacks) {
            this.sftw.callbacks.onConstellationClick = null
        }

        const result = this.buildResult()

        this.publishGameState()
        this.sftw.triggerCallback?.('onGameEnd', result)

        console.log('🏁 Games/Constellation: jogo finalizado', result)
        return result
    }

    cancelGame() {
        this.stopTimer()

        if (typeof this.sftw.endGameMode === 'function') {
            this.sftw.endGameMode()
        }

        if (this.sftw.callbacks) {
            this.sftw.callbacks.onConstellationClick = null
        }

        this.resetState()
        this.publishGameState()

        return this.getGameState()
    }

    restartGame() {
        if (!this.state.startConstellation) return null
        const start = this.state.startConstellation
        this.cancelGame()
        return this.startGame(start)
    }

    returnToMainMenu() {
        return this.endGame()
    }

    discoverConstellation(abbr) {
        const key = this._resolveConstellationAbbr(abbr);
        if (!key) return;
        if (this.state.discovered.has(key)) return;

        this.state.discovered.add(key);
        this.state.allowedTargets.delete(key);

        const attempts = Math.max(1, Number(this.state.attempts?.[key] || 0) + 1);
        const gained = Math.max(5, Math.floor(100 / attempts));
        this.state.score += gained;

        if (typeof this.sftw.setGameRevealedSet === 'function') {
            this.sftw.setGameRevealedSet(this.state.discovered);
        }

        // A lógica do jogo dispara a revelação visual da constelação descoberta.
        if (typeof this.sftw.revealConstellation === 'function') {
            this.sftw.revealConstellation(key, {
                fog: true,
                showBoundaries: !!this.state.visualOptions?.showBoundaries,
                showStars: true,
                showLabel: !!this.state.visualOptions?.showLabels
            });
        } else if (this.sftw.visualization && typeof this.sftw.visualization.revealConstellation === 'function') {
            this.sftw.visualization.revealConstellation(key, {
                fog: true,
                showBoundaries: !!this.state.visualOptions?.showBoundaries,
                showStars: true,
                showLabel: !!this.state.visualOptions?.showLabels
            });
        }

        this.publishGameState();

        this.sftw.triggerCallback?.('onConstellationDiscovered', key, attempts, gained);
        this.sftw.triggerCallback?.('onConstellationDiscovered', { abbr: key, attempts, points: gained });

        console.log(`✅ Games/Constellation: descoberta ${key} (+${gained})`);
    }

    expandAllowedTargets(fromAbbr) {
        const key = this._resolveConstellationAbbr(fromAbbr);
        if (!key || typeof this.sftw.getConstellationNeighbors !== 'function') return;

        const neighbors = this.sftw.getConstellationNeighbors(key) || [];
        neighbors.forEach((n) => {
            const nb = this._resolveConstellationAbbr(n);
            if (nb && !this.state.discovered.has(nb)) {
                this.state.allowedTargets.add(nb);
            }
        });

        console.log('🎯 Games/Constellation: alvos válidos', Array.from(this.state.allowedTargets));
    }

    checkCompletion() {
        if (this.state.useAdjacency && this.state.allowedTargets.size === 0) {
            this.endGame()
        }
    }

    handleConstellationClick(targetAbbr) {
        const key = this._resolveConstellationAbbr(targetAbbr);
        if (!this.state.active) return;
        if (!key) return;

        if (this.state.discovered.has(key)) {
            this.sftw.ui?.showMessage?.('Constelação já revelada.', 'info');
            return;
        }

        if (
            this.state.useAdjacency &&
            this.state.allowedTargets &&
            this.state.allowedTargets.size > 0 &&
            !this.state.allowedTargets.has(key)
        ) {
            this.sftw.ui?.showMessage?.('Ainda não é um alvo disponível.', 'warning');
            return;
        }

        this.state.currentConstellation = key;
        this.publishGameState();

        if (this.sftw.ui && typeof this.sftw.ui.promptConstellationAnswer === 'function') {
            this.sftw.ui.promptConstellationAnswer({
                targetAbbr: key,
                onSubmit: (input) => this.submitTargetAnswer(key, input)
            });
        } else {
            const input = window.prompt('Digite o nome ou sigla da constelação:');
            if (input != null) this.submitTargetAnswer(key, input);
        }
    }

    submitTargetAnswer(targetAbbr, inputText) {
        if (!this.state.active) return { correct: false, reason: 'inactive' };

        const target = this._resolveConstellationAbbr(targetAbbr);
        if (!target) return { correct: false, reason: 'invalid-target' };

        const normalized = this.normalizeInput(inputText);
        const isCorrect = this.matchesConstellation(target, normalized);

        if (isCorrect) {
            this.discoverConstellation(target);

            if (this.state.useAdjacency) {
                this.expandAllowedTargets(target);
            }

            this.state.currentConstellation = target;

            if (typeof this.sftw.focusOnConstellation === 'function') {
                this.sftw.focusOnConstellation(target);
            }

            const payload = {
                correct: true,
                targetAbbr: target,
                input: inputText,
                attempts: Number(this.state.attempts?.[target] || 1),
                elapsedTime: this.state.elapsedTime
            };

            this.publishGameState();
            this.sftw.triggerCallback?.('onCorrectAnswer', target, inputText);
            this.sftw.triggerCallback?.('onCorrectAnswer', payload);
            this.sftw.ui?.showMessage?.('Correto!', 'success');
            this.checkCompletion();

            return payload;
        }

        const wrong = this.registerAttempt(target, inputText);
        const payload = {
            correct: false,
            targetAbbr: target,
            input: inputText,
            attempts: wrong?.attempts || 1,
            elapsedTime: this.state.elapsedTime
        };

        this.sftw.triggerCallback?.('onWrongAnswer', target, inputText);
        this.sftw.triggerCallback?.('onWrongAnswer', payload);
        this.sftw.ui?.showMessage?.('Errou. Tente outra.', 'error');

        return payload;
    }

    submitAnswer(inputText, targetAbbr = null) {
        if (!this.state.active) return { correct: false, reason: 'inactive' };

        if (targetAbbr) {
            return this.submitTargetAnswer(targetAbbr, inputText);
        }

        const normalized = this.normalizeInput(inputText);
        let matched = null;

        const pool = this.state.useAdjacency
            ? Array.from(this.state.allowedTargets)
            : (this.sftw.constellations || []).map((c) => c.abbreviation);

        for (const abbr of pool) {
            if (this.matchesConstellation(abbr, normalized)) {
                matched = this._resolveConstellationAbbr(abbr);
                break;
            }
        }

        if (matched) {
            return this.submitTargetAnswer(matched, inputText);
        }

        const wrong = this.registerAttempt(this.state.currentConstellation || null, inputText);
        const payload = { correct: false, attempts: wrong?.attempts || 1 };
        this.sftw.triggerCallback?.('onWrongAnswer', this.state.currentConstellation || null, inputText);
        this.sftw.triggerCallback?.('onWrongAnswer', {
            targetAbbr: this.state.currentConstellation || null,
            input: inputText,
            attempts: wrong?.attempts || 1
        });
        return payload;
    }

    matchesConstellation(abbr, normalizedInput) {
        const key = this._resolveConstellationAbbr(abbr);
        const c = this._getConstellationData(key);
        if (!c) return false;

        const names = new Set();
        names.add(this.normalizeInput(c.abbreviation));

        if (c.name) names.add(this.normalizeInput(c.name));
        if (c.fullName) names.add(this.normalizeInput(c.fullName));
        if (c.latinName) names.add(this.normalizeInput(c.latinName));
        if (c.portugueseName) names.add(this.normalizeInput(c.portugueseName));
        const ptFallback = this._getPortugueseFallback(c.abbreviation);
        if (ptFallback) names.add(this.normalizeInput(ptFallback));

        if (c.aliases && Array.isArray(c.aliases)) {
            c.aliases.forEach((a) => names.add(this.normalizeInput(a)));
        }

        return names.has(normalizedInput);
    }

    normalizeInput(str) {
        return (str || '')
            .toString()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
    }

    registerAttempt(targetAbbr, input) {
        const key = this._resolveConstellationAbbr(targetAbbr || this.state.currentConstellation || 'unknown');
        if (!this.state.attempts[key]) this.state.attempts[key] = 0;
        this.state.attempts[key]++;

        console.warn(`❌ Games/Constellation: tentativa incorreta em ${key}: "${input}"`);

        this.state.score = Math.max(0, Number(this.state.score || 0) - 2);
        this.publishGameState();

        return {
            targetAbbr: key,
            input,
            attempts: this.state.attempts[key]
        };
    }

    publishGameState() {
        const gs = this.sftw.gameState || {}
        gs.status = this.state.active
            ? (this.state.finished ? 'completed' : 'playing')
            : (this.state.finished ? 'completed' : 'idle')
        gs.isGameActive = !!this.state.active
        gs.selectedConstellation = this.state.currentConstellation || this.state.startConstellation || null
        gs.startTime = this.state.startTime || null
        gs.elapsedTime = this.state.elapsedTime || 0
        gs.score = this.state.score || 0
        gs.totalConstellations = gs.totalConstellations || (this.sftw.constellations ? this.sftw.constellations.length : 88)

        if (!gs.discoveredConstellations || !(gs.discoveredConstellations instanceof Set)) {
            gs.discoveredConstellations = new Set()
        }

        gs.discoveredConstellations.clear()
        for (const a of this.state.discovered) {
            gs.discoveredConstellations.add(a)
        }

        gs.discoveredCount = gs.discoveredConstellations.size
        this.sftw.gameState = gs

        this.sftw.triggerCallback?.('onGameStateChange', gs)
    }

    getGameState() {
        return {
            active: this.state.active,
            finished: this.state.finished,
            elapsedTime: this.state.elapsedTime,
            score: this.state.score,
            startConstellation: this.state.startConstellation,
            currentConstellation: this.state.currentConstellation,
            discoveredCount: this.state.discovered.size,
            discovered: Array.from(this.state.discovered),
            allowedTargets: Array.from(this.state.allowedTargets),
            useAdjacency: this.state.useAdjacency,
            attempts: { ...this.state.attempts }
        }
    }

    buildResult() {
        return {
            startConstellation: this.state.startConstellation,
            discovered: Array.from(this.state.discovered),
            time: this.state.elapsedTime,
            attempts: this.state.attempts,
            score: this.state.score
        }
    }

    startTimer() {
        this.state.startTime = performance.now()
        this.state.elapsedTime = 0

        this.state.timerInterval = setInterval(() => {
            this.state.elapsedTime = Math.floor((performance.now() - this.state.startTime) / 1000)
            this.publishGameState()
        }, 1000)
    }

    stopTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval)
            this.state.timerInterval = null
        }
    }

    resetState() {
        this.stopTimer();
        this.state.active = false;
        this.state.finished = false;
        this.state.startConstellation = null;
        this.state.currentConstellation = null;
        this.state.discovered.clear();
        this.state.allowedTargets.clear();
        this.state.attempts = {};
        this.state.elapsedTime = 0;
        this.state.score = 0;
        // preserva useAdjacency

        if (typeof this.sftw.setGameRevealedSet === 'function') {
            this.sftw.setGameRevealedSet(this.state.discovered);
        }
    }
}

class Sftw1_NeighborGameMode {
    constructor(sftwInstance) {
        this.sftw = sftwInstance
        this.state = this._createInitialState()
        console.log('🧩 Sftw1_NeighborGameMode inicializado')
    }

    _createInitialState() {
        return {
            active: false,
            finished: false,
            startTime: null,
            elapsedTime: 0,
            timerInterval: null,
            score: 0,
            maxScore: 0,
            currentTarget: null,
            currentRoundIndex: -1,
            rounds: [],
            pendingTargets: [],
            usedTargets: new Set()
        }
    }

    startGame(options = {}) {
        if (this.state.active) return this.getGameState()

        const eligible = this._getEligibleConstellations()
        if (!eligible.length) {
            throw new Error('NeighborGame: nenhuma constelação elegível encontrada.')
        }

        this.resetState()

        const shuffled = this._shuffle(eligible.slice())
        let roundLimit = Number.isFinite(options.roundLimit) ? Math.floor(options.roundLimit) : shuffled.length
        if (roundLimit < 1) roundLimit = 1
        if (roundLimit > shuffled.length) roundLimit = shuffled.length

        this.state.pendingTargets = shuffled.slice(0, roundLimit)
        this.state.active = true
        this.state.finished = false
        this.state.startTime = performance.now()

        this.startTimer()
        this.nextRound()

        this.publishGameState()
        this.sftw.triggerCallback?.('onNeighborGameStart', this.getGameState())
        return this.getGameState()
    }

    endGame() {
        if (!this.state.active && !this.state.finished) {
            return this.getFinalReport()
        }

        this.stopTimer()
        this.state.active = false
        this.state.finished = true

        const report = this.getFinalReport()
        this.publishGameState()
        this.sftw.triggerCallback?.('onNeighborGameEnd', report)
        return report
    }

    cancelGame() {
        this.stopTimer()
        this.resetState()
        this.publishGameState()
        return this.getGameState()
    }

    restartGame(options = {}) {
        this.cancelGame()
        return this.startGame(options)
    }

    returnToMainMenu() {
        return this.endGame()
    }

    nextRound() {
        if (!this.state.active) return null

        if (!this.state.pendingTargets.length) {
            return this.endGame()
        }

        const target = this.state.pendingTargets.shift()
        this.state.currentTarget = target
        this.state.currentRoundIndex += 1
        this.state.usedTargets.add(target)

        const correctNeighbors = this._getNeighbors(target)

        const round = {
            index: this.state.currentRoundIndex,
            targetAbbr: target,
            targetName: this._getConstellationDisplayName(target),
            correctNeighbors,
            submittedRaw: [],
            submittedNormalized: [],
            matched: [],
            missing: [],
            invalid: [],
            scoreEarned: 0,
            maxScore: correctNeighbors.length,
            submittedAt: null
        }

        this.state.rounds.push(round)
        this.state.maxScore += round.maxScore

        this.publishGameState()
        this.sftw.triggerCallback?.('onNeighborRoundStart', this.serializeRound(round))

        return this.serializeRound(round)
    }

    submitAnswer(inputText) {
        if (!this.state.active) return null

        const round = this.getCurrentRound()
        if (!round) return null

        const parsed = this._parseAnswerList(inputText)
        const result = this._evaluateRound(round, parsed)

        round.submittedRaw = parsed.original
        round.submittedNormalized = parsed.normalized
        round.matched = result.matched
        round.missing = result.missing
        round.invalid = result.invalid
        round.scoreEarned = result.score
        round.submittedAt = this.state.elapsedTime

        this.state.score += round.scoreEarned

        const payload = this.serializeRound(round)

        this.publishGameState()
        this.sftw.triggerCallback?.('onNeighborRoundSubmitted', payload)

        return payload
    }

    getCurrentRound() {
        if (this.state.currentRoundIndex < 0) return null
        return this.state.rounds[this.state.currentRoundIndex] || null
    }

    getGameState() {
        const currentRound = this.getCurrentRound()

        return {
            active: this.state.active,
            finished: this.state.finished,
            elapsedTime: this.state.elapsedTime,
            score: this.state.score,
            maxScore: this.state.maxScore,
            currentTarget: currentRound ? {
                abbr: currentRound.targetAbbr,
                name: currentRound.targetName,
                expectedCount: currentRound.correctNeighbors.length
            } : null,
            currentRoundIndex: this.state.currentRoundIndex,
            roundsCompleted: this.state.rounds.filter((r) => r.submittedAt !== null).length,
            totalRounds: this.state.rounds.length + this.state.pendingTargets.length,
            pendingTargetsCount: this.state.pendingTargets.length
        }
    }

    getFinalReport() {
        return {
            finished: this.state.finished,
            elapsedTime: this.state.elapsedTime,
            totalScore: this.state.score,
            maxScore: this.state.maxScore,
            accuracy: this.state.maxScore > 0 ? (this.state.score / this.state.maxScore) : 0,
            totalRounds: this.state.rounds.length,
            rounds: this.state.rounds.map((r) => this.serializeRound(r))
        }
    }

    publishGameState() {
        this.sftw.triggerCallback?.('onNeighborGameStateChange', this.getGameState())
    }

    startTimer() {
        this.stopTimer()
        this.state.elapsedTime = 0

        this.state.timerInterval = setInterval(() => {
            if (!this.state.startTime) return
            this.state.elapsedTime = Math.floor((performance.now() - this.state.startTime) / 1000)
            this.publishGameState()
        }, 1000)
    }

    stopTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval)
            this.state.timerInterval = null
        }
    }

    resetState() {
        this.stopTimer()
        this.state = this._createInitialState()
    }

    _evaluateRound(round, parsedAnswers) {
        const correctSet = new Set(round.correctNeighbors)
        const matchedSet = new Set()
        const invalidSet = new Set()

        for (const item of parsedAnswers.normalized) {
            const abbr = this._resolveToAbbr(item)
            if (abbr && correctSet.has(abbr)) {
                matchedSet.add(abbr)
            } else {
                invalidSet.add(item)
            }
        }

        const matched = Array.from(matchedSet).sort((a, b) =>
            this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR')
        )

        const missing = round.correctNeighbors
            .filter((a) => !matchedSet.has(a))
            .sort((a, b) =>
                this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR')
            )

        const invalid = Array.from(invalidSet).sort((a, b) => a.localeCompare(b, 'pt-BR'))

        return { score: matched.length, matched, missing, invalid }
    }

    _parseAnswerList(inputText) {
        const raw = String(inputText || '')
        const original = raw
            .split(/[,\n;|]+/g)
            .map((s) => s.trim())
            .filter(Boolean)

        const normalized = []
        const seen = new Set()

        for (const token of original) {
            const norm = this._normalize(token)
            if (!norm || seen.has(norm)) continue
            seen.add(norm)
            normalized.push(norm)
        }

        return { original, normalized }
    }

    _resolveToAbbr(normalizedText) {
        if (!normalizedText) return null

        const all = this.sftw.constellations || []

        for (const c of all) {
            const names = new Set()

            if (c.abbreviation) names.add(this._normalize(c.abbreviation))
            if (c.name) names.add(this._normalize(c.name))
            if (Array.isArray(c.aliases)) {
                for (const a of c.aliases) names.add(this._normalize(a))
            }
            if (c.fullName) names.add(this._normalize(c.fullName))
            if (c.latinName) names.add(this._normalize(c.latinName))
            if (c.portugueseName) names.add(this._normalize(c.portugueseName))

            if (names.has(normalizedText)) {
                return c.abbreviation
            }
        }

        return null
    }

    _getEligibleConstellations() {
        const list = this.sftw.constellations || []
        return list
            .filter((c) => c && c.abbreviation)
            .filter((c) => this._getNeighbors(c.abbreviation).length > 0)
            .map((c) => c.abbreviation)
    }

    _getNeighbors(abbr) {
        if (typeof this.sftw.getConstellationNeighbors === 'function') {
            const arr = this.sftw.getConstellationNeighbors(abbr) || []
            return arr.slice().sort((a, b) =>
                this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR')
            )
        }

        const c = (this.sftw.constellations || []).find((x) => x.abbreviation === abbr)
        const arr = c?.neighbors || []
        return arr.slice().sort((a, b) =>
            this._getConstellationDisplayName(a).localeCompare(this._getConstellationDisplayName(b), 'pt-BR')
        )
    }

    _getConstellationDisplayName(abbr) {
        const c = (this.sftw.constellations || []).find((x) => x.abbreviation === abbr)
        return c?.name || abbr
    }

    serializeRound(round) {
        return {
            index: round.index,
            targetAbbr: round.targetAbbr,
            targetName: round.targetName,
            expectedCount: round.correctNeighbors.length,
            scoreEarned: round.scoreEarned,
            maxScore: round.maxScore,
            matched: round.matched.map((a) => ({ abbr: a, name: this._getConstellationDisplayName(a) })),
            missing: round.missing.map((a) => ({ abbr: a, name: this._getConstellationDisplayName(a) })),
            invalid: round.invalid.slice(),
            submittedRaw: round.submittedRaw.slice(),
            submittedNormalized: round.submittedNormalized.slice(),
            submittedAt: round.submittedAt
        }
    }

    _normalize(str) {
        return String(str || '')
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr
    }
}

class Sftw1_Games {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        const NeighborCtor =
            (typeof window !== 'undefined' && window.Sftw1_NeighborGame)
                ? window.Sftw1_NeighborGame
                : null;

        this.constellation = new Sftw1_ConstellationGame(sftwInstance);
        this.neighbor = NeighborCtor ? new NeighborCtor(sftwInstance) : null;
        console.log('🎯 Sftw1_Games inicializado');
    }
}

if (typeof window !== 'undefined') {
    window.Sftw1_Games = Sftw1_Games;

    if (typeof Sftw1 !== 'undefined') {
        Sftw1.injectGamesMethods = function (sftwInstance) {
            const games = new Sftw1_Games(sftwInstance);
            sftwInstance.games = games;

            // Compatibilidade com o jogo principal atual
            sftwInstance.game = games.constellation;
            sftwInstance.setupGameControls = () => games.constellation.setupControls();
            sftwInstance.showConstellationSelection = () => games.constellation.showSelection();
            sftwInstance.startGame = (abbr, options = {}) => games.constellation.startGame(abbr, options);
            sftwInstance.restartGame = () => games.constellation.restartGame();
            sftwInstance.returnToMainMenu = () => games.constellation.returnToMainMenu();
            sftwInstance.endGame = () => games.constellation.endGame();
            sftwInstance.cancelGame = () => games.constellation.cancelGame();
            sftwInstance.getGameState = () => games.constellation.getGameState();
            sftwInstance.submitAnswer = (...args) => games.constellation.submitAnswer(...args);
            sftwInstance.submitTargetAnswer = (...args) => games.constellation.submitTargetAnswer(...args);
            sftwInstance.handleConstellationClick = (...args) => games.constellation.handleConstellationClick(...args);
            sftwInstance.registerConstellationAttempt = (...args) => games.constellation.registerAttempt(...args);

            // Alias mais explícitos
            sftwInstance.startConstellationGame = (abbr, options = {}) => games.constellation.startGame(abbr, options);
            sftwInstance.endConstellationGame = () => games.constellation.endGame();
            sftwInstance.cancelConstellationGame = () => games.constellation.cancelGame();
            sftwInstance.getConstellationGameState = () => games.constellation.getGameState();

            // Compatibilidade com o jogo de vizinhanças
            if (games.neighbor) {
                sftwInstance.neighborGame = games.neighbor;
                sftwInstance.startNeighborGame = (options = {}) => games.neighbor.startGame(options);
                sftwInstance.nextNeighborRound = () => games.neighbor.nextRound();
                sftwInstance.submitNeighborAnswer = (inputText) => games.neighbor.submitAnswer(inputText);
                sftwInstance.endNeighborGame = () => games.neighbor.endGame();
                sftwInstance.cancelNeighborGame = () => games.neighbor.cancelGame();
                sftwInstance.restartNeighborGame = (options = {}) => games.neighbor.restartGame(options);
                sftwInstance.getNeighborGameState = () => games.neighbor.getGameState();
                sftwInstance.getNeighborGameReport = () => games.neighbor.getFinalReport();
            }

            console.log('✅ Sftw1_Games injetado no Core');
        };
    }

    console.log('✅ Sftw1_Games.js carregado (v4.2)');
}
