// Sftw1_Loader.js
// v2.2 — composição principal consolidada
//
// Objetivo:
// - manter o Loader como ponto central de composição
// - trabalhar bem com Core idempotente
// - preservar constelações e Messier já funcionando
// - evitar sobrescritas desnecessárias
//
// Estratégia:
// 1) injeção inicial dos módulos-base
// 2) initialize() do Core
// 3) rebind pós-init apenas das APIs públicas mais sensíveis
//    (Games, MessierGame e UI), sem remontar o resto à força

class Sftw1_Loader {
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

            if (typeof Sftw1.injectGamesMethods === 'function') {
                Sftw1.injectGamesMethods(sftw);
                console.log('✅ Games injetado pelo Loader');
            } else if (typeof Sftw1.injectGameMethods === 'function') {
                Sftw1.injectGameMethods(sftw);
                console.log('✅ Game antigo injetado pelo Loader (fallback)');
            } else {
                console.warn('⚠️ injectGamesMethods / injectGameMethods não encontrados');
            }

            if (typeof window !== 'undefined' && typeof window.injectMessierGameMethods === 'function') {
                try {
                    window.injectMessierGameMethods(sftw);
                    console.log('✅ MessierGame injetado pelo Loader');
                } catch (err) {
                    console.warn('⚠️ Falha ao injetar MessierGame:', err);
                }
            } else if (typeof Sftw1 !== 'undefined' && typeof Sftw1.injectMessierGameMethods === 'function') {
                try {
                    Sftw1.injectMessierGameMethods(sftw);
                    console.log('✅ MessierGame injetado pelo Loader');
                } catch (err) {
                    console.warn('⚠️ Falha ao injetar MessierGame:', err);
                }
            } else {
                console.log('ℹ️ MessierGame novo ainda não carregado; seguindo com arquitetura atual.');
            }

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

            console.log('✅ Todos os módulos carregados e injetados (pré-init)');

            // ============================================
            // 2) INITIALIZE DO CORE
            // ============================================
            await sftw.initialize(canvasId, options);

            // ============================================
            // 3) REBIND PÓS-INIT DAS APIs PÚBLICAS
            // ============================================
            // O Core agora deve ser idempotente; aqui reforçamos apenas
            // os contratos externos que mais sofriam disputa histórica.
            try {
                if (typeof Sftw1.injectGamesMethods === 'function') {
                    Sftw1.injectGamesMethods(sftw);
                    console.log('🔁 Games rebind pós-init');
                }
            } catch (err) {
                console.warn('⚠️ Falha no rebind pós-init de Games:', err);
            }

            try {
                if (typeof window !== 'undefined' && typeof window.injectMessierGameMethods === 'function') {
                    window.injectMessierGameMethods(sftw);
                    console.log('🔁 MessierGame rebind pós-init');
                } else if (typeof Sftw1 !== 'undefined' && typeof Sftw1.injectMessierGameMethods === 'function') {
                    Sftw1.injectMessierGameMethods(sftw);
                    console.log('🔁 MessierGame rebind pós-init');
                }
            } catch (err) {
                console.warn('⚠️ Falha no rebind pós-init de MessierGame:', err);
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
    console.log('✅ Sftw1_Loader.js carregado (v2.2 composição consolidada)');
}
