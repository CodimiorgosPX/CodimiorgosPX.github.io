// Sftw1_Loader.js
// v2.5 — composição principal consolidada + NeighborGame explícito + MessierGame canônico + AsterismGame explícito
//
// Objetivo desta etapa:
// - manter o Loader como ponto central de composição
// - reforçar a injeção explícita do NeighborGame
// - garantir que a API canônica do MessierGame vença a API legada da Visualization
// - integrar explicitamente o novo AsterismGame sem desmontar a arquitetura atual
// - preservar o jogo 1 e o restante da arquitetura
// - reduzir estados em que a UI encontra métodos faltando ou sobrescritos na ordem errada

class Sftw1_Loader {
    static _injectMessierGameCanonical(sftw) {
        try {
            if (typeof window !== 'undefined' && typeof window.injectMessierGameMethods === 'function') {
                window.injectMessierGameMethods(sftw);
                console.log('✅ MessierGame canônico injetado pelo Loader');
                return true;
            }

            if (typeof Sftw1 !== 'undefined' && typeof Sftw1.injectMessierGameMethods === 'function') {
                Sftw1.injectMessierGameMethods(sftw);
                console.log('✅ MessierGame canônico injetado pelo Loader');
                return true;
            }
        } catch (err) {
            console.warn('⚠️ Falha ao injetar MessierGame canônico:', err);
            return false;
        }

        console.log('ℹ️ MessierGame novo ainda não carregado; seguindo com arquitetura atual.');
        return false;
    }

    static _injectNeighborGameExplicit(sftw) {
        try {
            if (typeof Sftw1 !== 'undefined' && typeof Sftw1.injectNeighborGameMethods === 'function') {
                Sftw1.injectNeighborGameMethods(sftw);
                console.log('✅ NeighborGame explícito injetado pelo Loader');
                return true;
            }
        } catch (err) {
            console.warn('⚠️ Falha ao injetar NeighborGame explícito:', err);
            return false;
        }

        console.log('ℹ️ injectNeighborGameMethods não encontrado; Games seguirá como fallback do Neighbor.');
        return false;
    }

    static _ensureGamesNeighborAliases(sftw) {
        try {
            const neighbor = sftw?.neighborGame || sftw?.games?.neighbor || null;
            if (!neighbor) return false;

            if (typeof sftw.startNeighborGame !== 'function') {
                sftw.startNeighborGame = (options = {}) => neighbor.startGame(options);
            }
            if (typeof sftw.nextNeighborRound !== 'function') {
                sftw.nextNeighborRound = () => neighbor.nextRound();
            }
            if (typeof sftw.submitNeighborAnswer !== 'function') {
                sftw.submitNeighborAnswer = (inputText) => neighbor.submitAnswer(inputText);
            }
            if (typeof sftw.endNeighborGame !== 'function') {
                sftw.endNeighborGame = () => neighbor.endGame();
            }
            if (typeof sftw.cancelNeighborGame !== 'function') {
                sftw.cancelNeighborGame = () => neighbor.cancelGame();
            }
            if (typeof sftw.restartNeighborGame !== 'function') {
                sftw.restartNeighborGame = (options = {}) => neighbor.restartGame(options);
            }
            if (typeof sftw.getNeighborGameState !== 'function') {
                sftw.getNeighborGameState = () => neighbor.getGameState();
            }
            if (typeof sftw.getNeighborGameReport !== 'function') {
                sftw.getNeighborGameReport = () => neighbor.getFinalReport();
            }
            if (typeof sftw.getNeighborLastRoundResult !== 'function') {
                sftw.getNeighborLastRoundResult = () => neighbor.getLastRoundResult();
            }

            if (!sftw.neighborGame) {
                sftw.neighborGame = neighbor;
            }

            console.log('🔗 Aliases do NeighborGame garantidos pelo Loader');
            return true;
        } catch (err) {
            console.warn('⚠️ Falha ao garantir aliases do NeighborGame:', err);
            return false;
        }
    }


    static _injectAsterismGameExplicit(sftw) {
        try {
            if (typeof Sftw1 !== 'undefined' && typeof Sftw1.injectAsterismGameMethods === 'function') {
                Sftw1.injectAsterismGameMethods(sftw);
                console.log('✅ AsterismGame explícito injetado pelo Loader');
                return true;
            }
        } catch (err) {
            console.warn('⚠️ Falha ao injetar AsterismGame explícito:', err);
            return false;
        }

        console.log('ℹ️ injectAsterismGameMethods não encontrado; seguindo sem controller de asterismos.');
        return false;
    }

    static _ensureAsterismGameAliases(sftw) {
        try {
            const controller = sftw?.asterismGameController || null;
            if (!controller) return false;

            if (typeof sftw.startAsterismGame !== 'function') {
                sftw.startAsterismGame = (options = {}) => controller.startGame(options);
            }
            if (typeof sftw.stopAsterismGame !== 'function') {
                sftw.stopAsterismGame = (options = {}) => controller.stopGame(options);
            }
            if (typeof sftw.endAsterismGame !== 'function') {
                sftw.endAsterismGame = (options = {}) => controller.endGame(options);
            }
            if (typeof sftw.cancelAsterismGame !== 'function') {
                sftw.cancelAsterismGame = (options = {}) => controller.cancelGame(options);
            }
            if (typeof sftw.restartAsterismGame !== 'function') {
                sftw.restartAsterismGame = (options = {}) => controller.restartGame(options);
            }
            if (typeof sftw.submitAsterismSegments !== 'function') {
                sftw.submitAsterismSegments = (userSegments = [], options = {}) => controller.submitUserSegments(userSegments, options);
            }
            if (typeof sftw.advanceAsterismGameTarget !== 'function') {
                sftw.advanceAsterismGameTarget = () => controller.advanceToNextTarget();
            }
            if (typeof sftw.getAsterismGameState !== 'function') {
                sftw.getAsterismGameState = () => controller.getGameState();
            }
            if (typeof sftw.getAsterismGameReport !== 'function') {
                sftw.getAsterismGameReport = () => controller.getFinalReport();
            }
            if (typeof sftw.getCurrentAsterismGameTarget !== 'function') {
                sftw.getCurrentAsterismGameTarget = () => controller.getCurrentTargetPayload();
            }
            if (typeof sftw.focusCurrentAsterismGameTarget !== 'function') {
                sftw.focusCurrentAsterismGameTarget = () => controller.focusCurrentTarget();
            }
            if (typeof sftw.configureAsterismGame !== 'function') {
                sftw.configureAsterismGame = (options = {}) => controller.applyConfiguration(options);
            }

            console.log('🔗 Aliases do AsterismGame garantidos pelo Loader');
            return true;
        } catch (err) {
            console.warn('⚠️ Falha ao garantir aliases do AsterismGame:', err);
            return false;
        }
    }

    static async createInstance(canvasId, options = {}) {
        console.log('🚀 Criando instância completa do Sftw1...');

        const sftw = new Sftw1();

        if (options.debugMode !== undefined) {
            sftw.debugMode = options.debugMode;
        }

        if (options.settings) {
            Object.assign(sftw.settings, options.settings);
        }

        if (Number.isFinite(options.starLimit)) {
            sftw.starLimit = options.starLimit;
        }

        try {
            // ============================================
            // 1) INJEÇÃO INICIAL
            // ============================================
            if (typeof Sftw1.injectDataLoaderMethods === 'function') {
                Sftw1.injectDataLoaderMethods(sftw);
                console.log('✅ DataLoader injetado pelo Loader');
            } else {
                console.warn('⚠️ injectDataLoaderMethods não encontrado');
            }

            if (typeof Sftw1.injectVisualizationMethods === 'function') {
                Sftw1.injectVisualizationMethods(sftw);
                console.log('✅ Visualization injetado pelo Loader');
            } else {
                console.warn('⚠️ injectVisualizationMethods não encontrado');
            }

            // Neighbor explícito primeiro: deixa o contrato pronto cedo.
            Sftw1_Loader._injectNeighborGameExplicit(sftw);

            if (typeof Sftw1.injectGamesMethods === 'function') {
                Sftw1.injectGamesMethods(sftw);
                console.log('✅ Games injetado pelo Loader');
            } else if (typeof Sftw1.injectGameMethods === 'function') {
                Sftw1.injectGameMethods(sftw);
                console.log('✅ Game antigo injetado pelo Loader (fallback)');
            } else {
                console.warn('⚠️ injectGamesMethods / injectGameMethods não encontrados');
            }

            // Garante que os aliases do Neighbor sobrevivam independentemente da origem.
            Sftw1_Loader._ensureGamesNeighborAliases(sftw);

            // MessierGame canônico vem depois da Visualization para sobrepor os métodos legados.
            Sftw1_Loader._injectMessierGameCanonical(sftw);

            if (typeof Sftw1.injectUIMethods === 'function') {
                Sftw1.injectUIMethods(sftw);
                console.log('✅ UI injetado pelo Loader');
            } else {
                console.warn('⚠️ injectUIMethods não encontrado');
            }

            if (typeof Sftw1.injectStarCatalogMethods === 'function') {
                Sftw1.injectStarCatalogMethods(sftw);
                console.log('✅ StarCatalog injetado pelo Loader');
            } else {
                console.warn('⚠️ injectStarCatalogMethods não encontrado');
            }

            if (typeof Sftw1.injectMessierCatalogMethods === 'function') {
                Sftw1.injectMessierCatalogMethods(sftw);
                console.log('✅ MessierCatalog injetado pelo Loader');
            } else {
                console.warn('⚠️ injectMessierCatalogMethods não encontrado');
            }

            if (typeof Sftw1.injectAsterismCatalogMethods === 'function') {
                try {
                    Sftw1.injectAsterismCatalogMethods(sftw);
                    console.log('✅ AsterismCatalog injetado pelo Loader');
                } catch (err) {
                    console.warn('⚠️ Falha ao injetar AsterismCatalog:', err);
                }
            } else {
                console.warn('⚠️ injectAsterismCatalogMethods não encontrado');
            }

            // AsterismGame explícito: entra depois do catálogo para aproveitar a API já pronta.
            Sftw1_Loader._injectAsterismGameExplicit(sftw);
            Sftw1_Loader._ensureAsterismGameAliases(sftw);

            console.log('✅ Todos os módulos carregados e injetados (pré-init)');

            // ============================================
            // 2) INITIALIZE DO CORE
            // ============================================
            await sftw.initialize(canvasId, options);

            // ============================================
            // 3) INICIALIZAÇÃO PÓS-INIT DO ASTERISM CATALOG
            // ============================================
            try {
                if (typeof sftw.initializeAsterismCatalog === 'function') {
                    const asterisms = sftw.initializeAsterismCatalog() || [];
                    console.log(`✨ Asterismos inicializados: ${asterisms.length}`);
                } else {
                    console.warn('⚠️ initializeAsterismCatalog não encontrado no pós-init');
                }
            } catch (err) {
                console.warn('⚠️ Falha ao inicializar AsterismCatalog no pós-init:', err);
            }

            // ============================================
            // 4) REBIND PÓS-INIT DAS APIs PÚBLICAS
            // ============================================
            try {
                // Neighbor explícito de novo, para sobreviver ao initialize e a qualquer reordenação interna.
                Sftw1_Loader._injectNeighborGameExplicit(sftw);
            } catch (err) {
                console.warn('⚠️ Falha no rebind pós-init de NeighborGame:', err);
            }

            try {
                if (typeof Sftw1.injectGamesMethods === 'function') {
                    Sftw1.injectGamesMethods(sftw);
                    console.log('🔁 Games rebind pós-init');
                }
            } catch (err) {
                console.warn('⚠️ Falha no rebind pós-init de Games:', err);
            }

            try {
                Sftw1_Loader._ensureGamesNeighborAliases(sftw);
            } catch (err) {
                console.warn('⚠️ Falha ao reforçar aliases do Neighbor pós-init:', err);
            }

            try {
                Sftw1_Loader._injectMessierGameCanonical(sftw);
                console.log('🔁 MessierGame rebind pós-init');
            } catch (err) {
                console.warn('⚠️ Falha no rebind pós-init de MessierGame:', err);
            }

            try {
                Sftw1_Loader._injectAsterismGameExplicit(sftw);
                Sftw1_Loader._ensureAsterismGameAliases(sftw);
                console.log('🔁 AsterismGame rebind pós-init');
            } catch (err) {
                console.warn('⚠️ Falha no rebind pós-init de AsterismGame:', err);
            }

            try {
                if (typeof Sftw1.injectUIMethods === 'function') {
                    Sftw1.injectUIMethods(sftw);
                    console.log('🔁 UI rebind pós-init');
                }
            } catch (err) {
                console.warn('⚠️ Falha no rebind pós-init de UI:', err);
            }

            console.log('✅ Instância Sftw1 pronta');
            return sftw;

        } catch (error) {
            console.error('❌ Erro ao criar instância do Sftw1:', error);
            throw error;
        }
    }
}

if (typeof window !== 'undefined') {
    window.Sftw1_Loader = Sftw1_Loader;
    console.log('✅ Sftw1_Loader.js carregado (v2.5 composição consolidada + Neighbor explícito + prioridade MessierGame + AsterismGame)');
}
