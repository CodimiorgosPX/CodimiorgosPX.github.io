// Sftw1_Loader.js - Carregador e integrador de todos os módulos

class Sftw1_Loader {
    static async createInstance(canvasId, options = {}) {
        console.log('🚀 Criando instância completa do Sftw1...');

        // 1. Criar instância core
        const sftw = new Sftw1();

        // 2. Aplicar opções personalizadas
        if (options.debugMode !== undefined) {
            sftw.debugMode = options.debugMode;
        }

        if (options.settings) {
            Object.assign(sftw.settings, options.settings);
        }

        // ✅ Se quiser controlar limite de estrelas pelo Loader
        if (Number.isFinite(options.starLimit)) {
            sftw.starLimit = options.starLimit;
        }

        // 3. Carregar e injetar todos os módulos
        try {
            // DataLoader
            if (typeof Sftw1.injectDataLoaderMethods === 'function') {
                Sftw1.injectDataLoaderMethods(sftw);
            } else {
                console.warn('⚠️ injectDataLoaderMethods não encontrado');
            }

            // Visualization
            if (typeof Sftw1.injectVisualizationMethods === 'function') {
                Sftw1.injectVisualizationMethods(sftw);
            } else {
                console.warn('⚠️ injectVisualizationMethods não encontrado');
            }

            // Game
            if (typeof Sftw1.injectGameMethods === 'function') {
                Sftw1.injectGameMethods(sftw);
            } else {
                console.warn('⚠️ injectGameMethods não encontrado');
            }

            // UI
            if (typeof Sftw1.injectUIMethods === 'function') {
                Sftw1.injectUIMethods(sftw);
            } else {
                console.warn('⚠️ injectUIMethods não encontrado');
            }

            // ✅ StarCatalog (faltava!)
            if (typeof Sftw1.injectStarCatalogMethods === 'function') {
                Sftw1.injectStarCatalogMethods(sftw);
            } else {
                console.warn('⚠️ injectStarCatalogMethods não encontrado');
            }

            console.log('✅ Todos os módulos carregados e injetados');

            // 4. Inicializar (repassa options)
            await sftw.initialize(canvasId, options);

            return sftw;

        } catch (error) {
            console.error('❌ Erro ao criar instância do Sftw1:', error);
            throw error;
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Sftw1_Loader = Sftw1_Loader;
    console.log('✅ Sftw1_Loader.js carregado');
}
