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
        
        // 3. Carregar e injetar todos os módulos
        try {
            // DataLoader
            Sftw1.injectDataLoaderMethods(sftw);
            
            // Visualization
            Sftw1.injectVisualizationMethods(sftw);
            
            // Game
            Sftw1.injectGameMethods(sftw);
            
            // UI
            Sftw1.injectUIMethods(sftw);
            
            console.log('✅ Todos os módulos carregados e injetados');
            
            // 4. Inicializar
            await sftw.initialize(canvasId);
            
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