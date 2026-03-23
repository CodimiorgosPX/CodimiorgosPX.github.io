// Sftw1_Game.js
// Módulo de lógica do jogo de treinamento de constelações
// Versão 1.0 – fluxo básico sólido, sem mexer em renderização
// Compatível com: Sftw1_Core.js, Sftw1_UI.js, Sftw1_Visualization.js, Sftw1_DataLoader.js

class Sftw1_Game {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;

        // Estado interno do jogo
        this.state = {
            active: false,

            startTime: null,
            elapsedTime: 0,
            timerInterval: null,
            score: 0,

            startConstellation: null,
            currentConstellation: null,

            // conjunto de constelações descobertas
            discovered: new Set(),

            // conjunto de constelações-alvo válidas no momento
            allowedTargets: new Set(),

            // ✅ Por enquanto, NÃO restringir por adjacência.
            // No futuro, quando você implementar topologia (constelações que tocam a borda),
            // basta setar isso para true.
            useAdjacency: false,

            attempts: {},
            finished: false
        };

        console.log('🎮 Sftw1_Game inicializado');
    }

    // ============================================================
    // SETUP / INJEÇÃO
    // ============================================================

    setupGameControls() {
        console.log('🎮 Game: setupGameControls chamado');
        // A UI já chama os métodos públicos diretamente
        return true;
    }

    // ============================================================
    // FLUXO PRINCIPAL
    // ============================================================

    showConstellationSelection() {
        if (!this.sftw.constellations || this.sftw.constellations.length === 0) {
            console.error('❌ Nenhuma constelação carregada');
            return;
        }

        // UI normalmente abre um modal; aqui só disparamos callback
        this.sftw.triggerCallback?.('onGameStateChange', {
            state: 'selecting'
        });

        console.log('🎯 Game: aguardando seleção de constelação inicial');
    }

    startGame(constellationAbbr) {
        if (!constellationAbbr) {
            console.error('❌ startGame: constelação inválida');
            return;
        }

        if (this.state.active) {
            console.warn('⚠️ Jogo já está ativo');
            return;
        }

        this.resetState();

        this.state.active = true;
        this.state.finished = false;
        this.state.startConstellation = constellationAbbr;
        this.state.currentConstellation = constellationAbbr;

        this.state.score = 0;
        this.publishGameState();

        // Descobrir constelação inicial
        this.discoverConstellation(constellationAbbr);

        // ✅ Por enquanto: NÃO limitar por adjacência
        // (deixe allowedTargets vazio para liberar tudo; o check usa size > 0).
        if (this.state.useAdjacency) {
            this.expandAllowedTargets(constellationAbbr);
        } else {
            this.state.allowedTargets.clear();
        }

        // Iniciar tempo
        this.startTimer();

        // Registrar clique nas áreas (passo 3)
        this.sftw.callbacks = this.sftw.callbacks || {};
        this.sftw.callbacks.onConstellationClick = (abbr) => this.handleConstellationClick(abbr);

        // Ativar modo jogo na visualização
        if (typeof this.sftw.startGameMode === 'function') {
            this.sftw.startGameMode(constellationAbbr);
        }

        // Focar na constelação inicial
        if (typeof this.sftw.focusOnConstellation === 'function') {
            this.sftw.focusOnConstellation(constellationAbbr);
        }

        // Callback
        this.sftw.triggerCallback?.('onGameStart', constellationAbbr);

        console.log(`🚀 Jogo iniciado em ${constellationAbbr}`);
    }

    endGame() {
        if (!this.state.active) return;

        this.stopTimer();
        this.state.active = false;
        this.state.finished = true;

        if (typeof this.sftw.endGameMode === 'function') {
            this.sftw.endGameMode();
        }

        // Limpar callback de clique
        if (this.sftw.callbacks) {
            this.sftw.callbacks.onConstellationClick = null;
        }

        const result = {
            startConstellation: this.state.startConstellation,
            discovered: Array.from(this.state.discovered),
            time: this.state.elapsedTime,
            attempts: this.state.attempts
        };

        this.sftw.triggerCallback?.('onGameEnd', result);

        console.log('🏁 Jogo finalizado', result);
    }

    restartGame() {
        if (!this.state.startConstellation) return;
        this.endGame();
        this.startGame(this.state.startConstellation);
    }

    returnToMainMenu() {
        this.endGame();
        if (window.app && typeof window.app.returnToMainMenu === 'function') {
            window.app.returnToMainMenu();
        }
    }

    // ============================================================
    // DESCOBERTA / PROGRESSÃO
    // ============================================================

    discoverConstellation(abbr) {
        if (this.state.discovered.has(abbr)) return;

        this.state.discovered.add(abbr);
        this.state.allowedTargets.delete(abbr);

        const attempts = Math.max(1, (this.state.attempts?.[abbr] || 0) + 1);
        // Pontuação simples: base 100/attempts (mín. 5)
        const gained = Math.max(5, Math.floor(100 / attempts));
        this.state.score += gained;

        // Atualiza gameState + UI
        this.publishGameState();

        // Callback para checklist / feedback
        this.sftw.triggerCallback?.('onConstellationDiscovered', abbr, attempts, gained);
        this.sftw.triggerCallback?.('onConstellationDiscovered', { abbr, attempts, points: gained });

        console.log(`✅ Descoberta: ${abbr} (+${gained} pts, ${attempts} tentativas)`);
    }

    expandAllowedTargets(fromAbbr) {
        if (typeof this.sftw.getConstellationNeighbors !== 'function') return;

        const neighbors = this.sftw.getConstellationNeighbors(fromAbbr) || [];
        neighbors.forEach(n => {
            if (!this.state.discovered.has(n)) {
                this.state.allowedTargets.add(n);
            }
        });

        console.log('🎯 Alvos válidos:', Array.from(this.state.allowedTargets));
    }

    checkCompletion() {
        if (this.state.useAdjacency && this.state.allowedTargets.size === 0) {
            this.endGame();
        }
    }

    // ============================================================
    // PASSO 3: CLIQUE EM ÁREA -> INPUT -> REVELAR
    // ============================================================

    handleConstellationClick(targetAbbr) {
        if (!this.state.active) return;
        if (!targetAbbr) return;

        // já descoberta?
        if (this.state.discovered.has(targetAbbr)) {
            this.sftw.ui?.showMessage?.('Constelação já revelada.', 'info');
            return;
        }

        // ✅ Só restringir se useAdjacency estiver ligado
        if (this.state.useAdjacency &&
            this.state.allowedTargets &&
            this.state.allowedTargets.size > 0 &&
            !this.state.allowedTargets.has(targetAbbr)
        ) {
            this.sftw.ui?.showMessage?.('Ainda não é um alvo disponível.', 'warning');
            return;
        }

        // Abrir prompt de resposta (IAU 3 letras, ex: ori)
        if (this.sftw.ui && typeof this.sftw.ui.promptConstellationAnswer === 'function') {
            this.sftw.ui.promptConstellationAnswer({
                targetAbbr,
                onSubmit: (input) => this.submitTargetAnswer(targetAbbr, input)
            });
        } else {
            // fallback: prompt simples
            const input = window.prompt(`Digite a sigla IAU (minúscula) da constelação:`);
            if (input != null) this.submitTargetAnswer(targetAbbr, input);
        }
    }

    submitTargetAnswer(targetAbbr, inputText) {
        if (!this.state.active) return;

        const expected = this.normalizeInput(targetAbbr);
        const got = this.normalizeInput(inputText);

        if (got === expected) {
            // sucesso
            this.discoverConstellation(targetAbbr);

            // ✅ Só expandir alvos se useAdjacency estiver ligado
            if (this.state.useAdjacency) {
                this.expandAllowedTargets(targetAbbr);
            }

            // Atualizar visualização do modo jogo
            if (typeof this.sftw.setGameRevealedSet === 'function') {
                this.sftw.setGameRevealedSet(this.state.discovered);
            }

            this.sftw.triggerCallback?.('onCorrectAnswer', {
                target: (targetAbbr || matched),
                input: inputText,
                time: this.state.elapsedTime
            });

            this.sftw.ui?.showMessage?.('Correto!', 'success');
            this.checkCompletion();
        } else {
            // erro: por enquanto só mensagem e continua
            this.registerAttempt(targetAbbr || null, inputText);

            this.sftw.triggerCallback?.('onWrongAnswer', (targetAbbr || null), inputText);
            this.sftw.triggerCallback?.('onWrongAnswer', { abbr: (targetAbbr || null), input: inputText });

            this.sftw.ui?.showMessage?.('Errou. Tente outra.', 'error');
        }
    }

    submitAnswer(inputText, targetAbbr = null) {
        if (!this.state.active) return;

        const normalized = this.normalizeInput(inputText);

        // Se a UI informar a constelação alvo (clique em área específica),
// validamos diretamente contra ela. Isso evita a divergência "UI diz correto, Game não registra".
        let matched = null;

        if (targetAbbr) {
            if (this.matchesConstellation(targetAbbr, normalized)) {
                matched = targetAbbr;
            }
        } else {
            // Fallback: sem alvo explícito, tenta inferir pela entrada.
            // ✅ Se não usa adjacência, permite match contra TODAS as constelações
            const pool = this.state.useAdjacency ? Array.from(this.state.allowedTargets)
                                                : (this.sftw.constellations || []).map(c => c.abbreviation);

            for (const abbr of pool) {
                if (this.matchesConstellation(abbr, normalized)) {
                    matched = abbr;
                    break;
                }
            }
        }

if (matched) {
            // sucesso
            this.discoverConstellation(matched);

            if (this.state.useAdjacency) {
                this.expandAllowedTargets(matched);
            }

            if (typeof this.sftw.focusOnConstellation === 'function') {
                this.sftw.focusOnConstellation(matched);
            }

            this.checkCompletion();
        } else {
            // erro
            this.registerAttempt(targetAbbr || null, inputText);
            this.sftw.triggerCallback?.('onWrongAnswer', (targetAbbr || null), inputText);
            this.sftw.triggerCallback?.('onWrongAnswer', { abbr: (targetAbbr || null), input: inputText });
        }
    }

    matchesConstellation(abbr, normalizedInput) {
        const c = this.sftw.constellations?.find(x => x.abbreviation === abbr);
        if (!c) return false;

        const names = [];

        // abreviação
        names.push(abbr.toLowerCase());

        // nome principal
        if (c.name) names.push(this.normalizeInput(c.name));

        // aliases extras (se existirem no futuro)
        if (c.aliases && Array.isArray(c.aliases)) {
            c.aliases.forEach(a => names.push(this.normalizeInput(a)));
        }

        return names.includes(normalizedInput);
    }

    normalizeInput(str) {
        return (str || '')
            .toString()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    registerAttempt(targetAbbr, input) {
        const key = targetAbbr || this.state.currentConstellation || 'unknown';
        if (!this.state.attempts[key]) this.state.attempts[key] = 0;
        this.state.attempts[key]++;
        console.warn(`❌ Tentativa incorreta em ${key}: "${input}"`);
        // Penalidade leve
        this.state.score = Math.max(0, (this.state.score || 0) - 2);
        this.publishGameState();
    }

    // ============================================================
    // GAME STATE (UI)
    // ============================================================

    publishGameState() {
        // Mantém this.sftw.gameState no formato que a UI já espera
        const gs = this.sftw.gameState || {};
        gs.status = this.state.active ? (this.state.finished ? 'completed' : 'playing') : (gs.status || 'idle');
        gs.isGameActive = !!this.state.active;
        gs.selectedConstellation = this.state.currentConstellation || this.state.startConstellation || null;
        gs.startTime = this.state.startTime || gs.startTime || null;
        gs.elapsedTime = this.state.elapsedTime || 0;
        gs.score = this.state.score || 0;
        gs.totalConstellations = gs.totalConstellations || (this.sftw.constellations ? this.sftw.constellations.length : 88);

        // Descobertas
        if (!gs.discoveredConstellations || !(gs.discoveredConstellations instanceof Set)) {
            gs.discoveredConstellations = new Set();
        }
        // sincroniza set interno -> gameState
        if (this.state.discovered && this.state.discovered.size) {
            for (const a of this.state.discovered) gs.discoveredConstellations.add(a);
        }
        gs.discoveredCount = gs.discoveredConstellations.size;

        this.sftw.gameState = gs;

        // Notifica UI
        this.sftw.triggerCallback?.('onGameStateChange', gs);
    }

    // ============================================================
    // TIMER
    // ============================================================

    startTimer() {
        this.state.startTime = performance.now();
        this.state.elapsedTime = 0;

        this.state.timerInterval = setInterval(() => {
            this.state.elapsedTime = Math.floor((performance.now() - this.state.startTime) / 1000);
            this.publishGameState();
        }, 1000);
    }

    stopTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
        }
    }

    // ============================================================
    // UTIL
    // ============================================================

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
        // mantém useAdjacency como está (default false)
    }
}

// ============================================================
// INJEÇÃO NO CORE
// ============================================================

if (typeof window !== 'undefined') {
    window.Sftw1_Game = Sftw1_Game;

    if (typeof Sftw1 !== 'undefined') {
        Sftw1.injectGameMethods = function (sftwInstance) {
            const game = new Sftw1_Game(sftwInstance);
            sftwInstance.game = game;

            // Métodos públicos usados pela UI/Core
            sftwInstance.setupGameControls = () => game.setupGameControls();
            sftwInstance.showConstellationSelection = () => game.showConstellationSelection();
            sftwInstance.startGame = (abbr) => game.startGame(abbr);
            sftwInstance.restartGame = () => game.restartGame();
            sftwInstance.returnToMainMenu = () => game.returnToMainMenu();
            // ✅ Correção crítica: não descartar parâmetros.
            // Mantém compatibilidade com chamadas antigas (1 argumento)
            // e permite chamadas com alvo explícito (ex.: submitAnswer(input, targetAbbr)).
            sftwInstance.submitAnswer = (...args) => game.submitAnswer(...args);

            console.log('✅ Sftw1_Game injetado no Core');
        };
    }

    console.log('✅ Sftw1_Game.js carregado');
}
