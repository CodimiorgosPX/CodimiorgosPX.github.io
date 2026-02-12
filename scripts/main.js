// Observatório Virtual - Versão Corrigida e Completa
// ATUALIZADO: COM SELETOR DE DENSIDADE ESTELAR
class ObservatorioVirtual {
    constructor() {
        this.sceneManager = null;
        this.currentModule = null;
        this.modules = {
            sftw1: null,
            smld1: null,
            smld2: null
        };
        this.init();
    }

    async init() {
        console.log('Iniciando Observatório Virtual...');
        
        // Esconder tela de carregamento após 2 segundos
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showMainInterface();
        }, 2000);
        
        // Inicializar SceneManager para preview
        await this.initializePreview();
        
        // Configurar eventos
        this.setupEventListeners();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    showMainInterface() {
        const mainContainer = document.getElementById('main-container');
        if (mainContainer) {
            mainContainer.classList.remove('hidden');
            mainContainer.style.opacity = '1';
        }
    }

    async initializePreview() {
        // Sanidade: SceneManager precisa existir (carregado pelo index.html em scripts/components/SceneManager.js)
        if (typeof window.SceneManager === 'undefined') {
            throw new Error(
                "SceneManager não está definido. Verifique se o arquivo existe em 'scripts/components/SceneManager.js' " +
                "e se o index.html contém: <script src=\"scripts/components/SceneManager.js\"></script> antes de scripts/main.js."
            );
        }

        try {
            // Verificar se Three.js está carregado
            if (typeof THREE === 'undefined') {
                console.error('Three.js não está carregado!');
                this.showError('Erro: Biblioteca Three.js não encontrada. Verifique sua conexão.');
                return;
            }
            
            this.sceneManager = new SceneManager('preview-canvas');
            await this.sceneManager.init();
            this.setupPreviewScene();
            
        } catch (error) {
            console.error('Erro ao inicializar preview:', error);
            this.showError('Erro ao carregar visualização 3D. Verifique o console.');
        }
    }

    setupPreviewScene() {
        if (!this.sceneManager) return;
        
        // Criar sistema solar simplificado para preview
        const sun = this.sceneManager.createSphere({
            radius: 1.5,
            color: 0xFDB813,
            emissive: 0xFDB813,
            emissiveIntensity: 0.3,
            position: { x: 0, y: 0, z: 0 }
        });
        
        const earth = this.sceneManager.createSphere({
            radius: 0.5,
            color: 0x2233FF,
            position: { x: 4, y: 0, z: 0 }
        });
        
        // Adicionar órbita da Terra
        this.sceneManager.createOrbit(sun, 4, 0x2233FF, 0.2);
        
        // Animação simples
        this.sceneManager.addAnimation(() => {
            if (sun) sun.rotation.y += 0.005;
            if (earth) {
                earth.rotation.y += 0.01;
                const time = Date.now() * 0.001;
                earth.position.x = Math.cos(time) * 4;
                earth.position.z = Math.sin(time) * 4;
            }
        });
    }

    // ============================================================
// CARREGAMENTO ROBUSTO DE SCRIPTS (AUTO-DISCOVERY)
// Objetivo: funcionar mesmo se você mover arquivos entre pastas
// (ex.: scripts/components, scripts, components, raiz).
// ============================================================
_getScriptBaseDir() {
    // tenta achar o src do main.js carregado no documento
    const candidates = Array.from(document.scripts)
        .map(s => s.src || '')
        .filter(Boolean);

    const mainSrc = candidates.find(src => /\/main\.js(\?|#|$)/.test(src)) || (document.currentScript?.src || '');
    try {
        const url = new URL(mainSrc, document.baseURI);
        // remove o arquivo (main.js) e mantém a pasta
        url.pathname = url.pathname.replace(/\/[^\/]*$/, '/');
        return url.toString();
    } catch {
        return document.baseURI;
    }
}

_buildCandidateUrls(filename) {
    const urls = new Set();

    // Se o filename já vier com caminho (ex.: 'scripts/components/Foo.js'),
    // não aplicar heurísticas que duplicam pastas. Tente o caminho direto e uma variante absoluta.
    const looksLikePath = typeof filename === 'string' && filename.includes('/');
    if (looksLikePath) {
        try { urls.add(new URL(filename, document.baseURI).toString()); } catch {}
        try { urls.add(new URL(filename, window.location.origin + '/').toString()); } catch {}
        // também tenta como raiz absoluta
        try { urls.add(new URL('/' + filename.replace(/^\/+/, ''), window.location.origin).toString()); } catch {}
        return Array.from(urls);
    }


    // 1) Se já existe um <script src=".../filename"> no HTML, priorize isso
    for (const s of Array.from(document.scripts)) {
        const src = s.src || '';
        if (!src) continue;
        if (src.endsWith('/' + filename) || src.includes('/' + filename + '?') || src.includes('/' + filename + '#')) {
            urls.add(src);
        }
    }

    // 2) Tenta locais comuns (relativos à página)
    const common = [
        `scripts/components/${filename}`,
        `scripts/${filename}`,
        `components/${filename}`,
        filename
    ];
    for (const rel of common) {
        try { urls.add(new URL(rel, document.baseURI).toString()); } catch {}
    }

    // 3) Tenta relativo à pasta onde o main.js está (quando main.js está em /scripts/)
    const base = this._getScriptBaseDir();
    const baseCommon = [
        `components/${filename}`,
        filename
    ];
    for (const rel of baseCommon) {
        try { urls.add(new URL(rel, base).toString()); } catch {}
    }

    return Array.from(urls);
}

_loadScriptOnce(absUrl) {
    return new Promise((resolve, reject) => {
        // Já carregado?
        const already = Array.from(document.scripts).some(s => (s.src || '') === absUrl || (s.src || '').startsWith(absUrl + '?') || (s.src || '').startsWith(absUrl + '#'));
        if (already) return resolve();

        const script = document.createElement('script');
        // Cache-busting leve (ajuda quando o navegador mantém versão antiga)
        const u = new URL(absUrl, document.baseURI);
        u.searchParams.set('v', String(Date.now()));
        script.src = u.toString();
        script.async = false; // mantém ordem
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Falha ao carregar script: ${absUrl}`));
        document.head.appendChild(script);
    });
}

async _ensureGlobal(globalName, filename) {
    // Já existe?
    if (typeof window[globalName] !== 'undefined') return;

    const candidateUrls = this._buildCandidateUrls(filename);
    let lastErr = null;

    for (const url of candidateUrls) {
        try {
            await this._loadScriptOnce(url);
            if (typeof window[globalName] !== 'undefined') return;
        } catch (err) {
            lastErr = err;
        }
    }

    // Diagnóstico útil
    const diag = [
        `Dependência não encontrada: ${globalName}`,
        `Arquivo esperado: ${filename}`,
        `Caminhos tentados:`,
        ...candidateUrls.map(u => ` - ${u}`)
    ].join('\n');

    throw lastErr || new Error(diag);
}

async ensureSftw1Scripts() {
    // IMPORTANTE: SceneManager deve ser carregado via <script> no index.html (scripts/components/SceneManager.js)
    // para evitar 404 por heurísticas de caminhos. Aqui só garantimos os módulos do Sftw1.
    await this._ensureGlobal('Sftw1', 'scripts/components/Sftw1_Core.js');
    await this._ensureGlobal('Sftw1_DataLoader', 'scripts/components/Sftw1_DataLoader.js');
    await this._ensureGlobal('Sftw1_Visualization', 'scripts/components/Sftw1_Visualization.js');
    await this._ensureGlobal('Sftw1_Game', 'scripts/components/Sftw1_Game.js');
    await this._ensureGlobal('Sftw1_UI', 'scripts/components/Sftw1_UI.js');
    await this._ensureGlobal('Sftw1_StarCatalog', 'scripts/components/Sftw1_StarCatalog.js');
}


    setupEventListeners() {
        // Botões de módulos
        document.querySelectorAll('.btn-module-start').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = e.target.closest('.btn-module-start').dataset.module;
                this.startModule(module);
            });
        });
        
        // Controles de preview
        const rotateBtn = document.getElementById('rotate-preview');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', () => {
                if (this.sceneManager && this.sceneManager.controls) {
                    this.sceneManager.controls.autoRotate = !this.sceneManager.controls.autoRotate;
                    
                    // Feedback visual
                    rotateBtn.style.backgroundColor = this.sceneManager.controls.autoRotate 
                        ? 'var(--secondary-color)' 
                        : '';
                }
            });
        }
        
        // Zoom
        document.getElementById('zoom-in-preview')?.addEventListener('click', () => {
            if (this.sceneManager && this.sceneManager.camera) {
                this.sceneManager.camera.position.multiplyScalar(0.9);
            }
        });
        
        document.getElementById('zoom-out-preview')?.addEventListener('click', () => {
            if (this.sceneManager && this.sceneManager.camera) {
                this.sceneManager.camera.position.multiplyScalar(1.1);
            }
        });
        
        // Navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.nav-btn').id;
                this.handleNavigation(target);
            });
        });
        
        // Ajustar canvas no resize
        window.addEventListener('resize', () => {
            if (this.sceneManager) {
                this.sceneManager.onWindowResize();
            }
        });
    }

    async startModule(moduleId) {
        console.log(`Iniciando módulo: ${moduleId}`);
        
        const button = document.querySelector(`[data-module="${moduleId}"]`);
        if (!button) return;
        
        // Feedback visual
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        button.disabled = true;
        
        try {
            // Carregar módulo específico
            await this.loadModule(moduleId);
            
        } catch (error) {
            console.error(`Erro no módulo ${moduleId}:`, error);
            this.showError(`Módulo ${moduleId} em desenvolvimento.`);
        } finally {
            // Restaurar botão
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 500);
        }
    }

    async loadModule(moduleId) {
        return new Promise((resolve, reject) => {
            try {
                switch(moduleId) {
                    case 'sftw1':
                        this.loadSftw1Module();
                        break;
                    case 'smld1':
                    case 'smld2':
                        // Para outros módulos, mostrar mensagem
                        this.showModuleMessage(moduleId);
                        break;
                    default:
                        throw new Error(`Módulo ${moduleId} não encontrado`);
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    async loadSftw1Module() {
        console.log('🎮 Carregando módulo Sftw1 (Treinamento de Céu)...');

        // Garantir scripts do Sftw1 antes de qualquer checagem
        // (isso corrige o erro: "Sftw1_Core.js não está carregado")
        try {
            await this.ensureSftw1Scripts();
        } catch (e) {
            console.error('❌ Falha ao garantir scripts do Sftw1:', e);
            this.showError(`Erro ao carregar módulo Sftw1:\n${e.message}`);
            this.returnToMainMenu();
            return;
        }
        
        // 1. Ocultar interface principal
        document.getElementById('main-container').classList.add('hidden');
        
        // 2. Criar container do módulo
        this.createModuleContainer('sftw1');
        
        // 3. MOSTRAR SELETOR DE DENSIDADE ESTELAR (NOVO!)
        let starLimit = 3000; // valor padrão (fallback quando não há seletor)
        
        if (typeof Sftw1_StarDensity !== 'undefined') {
            try {
                console.log('⭐ Mostrando seletor de densidade estelar...');
                starLimit = await Sftw1_StarDensity.showSelector();
                console.log(`✅ Densidade escolhida: ${starLimit} estrelas`);
            } catch (error) {
                console.warn('⚠️ Erro no seletor de densidade, usando padrão (3000):', error);
                starLimit = 3000;
            }
        }
        else {
          console.warn('⚠️ Sftw1_StarDensity não encontrado, usando padrão (3000)');
          starLimit = 3000;
        }
        
        // 4. Carregar e inicializar o módulo COM LIMITE DE ESTRELAS
        try {
            // VERIFICAÇÃO CRÍTICA: Garantir que todas as dependências estão carregadas
            console.log('🔍 Verificando dependências...');
            
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js não está carregado. Verifique as bibliotecas.');
            }
            
            if (typeof SceneManager === 'undefined') {
                throw new Error('SceneManager não está carregado. Verifique a ordem dos scripts.');
            }
            
            if (typeof Sftw1 === 'undefined') {
                throw new Error('Sftw1_Core.js não está carregado.');
            }
            
            console.log('✅ Dependências básicas verificadas');
            
            // Criar instância do Sftw1
            console.log('🔄 Criando instância do Sftw1...');
            this.modules.sftw1 = new Sftw1();
            
            // PASSAR LIMITE DE ESTRELAS PARA A INSTÂNCIA (NOVO!)
            // Normaliza/valida starLimit para evitar valores inválidos vindos do seletor
const DEFAULT_STAR_LIMIT = 3000;
const MAX_STAR_LIMIT = 20000;
let normalizedStarLimit = Number.parseInt(starLimit, 10);
if (!Number.isFinite(normalizedStarLimit) || normalizedStarLimit <= 0) {
  console.warn(`⚠️ starLimit inválido ("${starLimit}"). Usando padrão (${DEFAULT_STAR_LIMIT}).`);
  normalizedStarLimit = DEFAULT_STAR_LIMIT;
}
normalizedStarLimit = Math.min(normalizedStarLimit, MAX_STAR_LIMIT);

this.modules.sftw1.starLimit = normalizedStarLimit;
            // A partir daqui, use o valor normalizado (evita inconsistências em logs/opções)
            starLimit = normalizedStarLimit;
            console.log(`⭐ Configuração: ${starLimit} estrelas`);
            
            // INJEÇÃO DOS MÓDULOS
            console.log('🔧 Injetando módulos no Sftw1...');
            
            // DataLoader
            if (typeof Sftw1_DataLoader !== 'undefined') {
                Sftw1.injectDataLoaderMethods(this.modules.sftw1);
                console.log('✅ Sftw1_DataLoader injetado');
            } else {
                console.warn('⚠️ Sftw1_DataLoader não encontrado');
            }
            
            // Visualization
            if (typeof Sftw1_Visualization !== 'undefined') {
                Sftw1.injectVisualizationMethods(this.modules.sftw1);
                console.log('✅ Sftw1_Visualization injetado');
            } else {
                console.warn('⚠️ Sftw1_Visualization não encontrado');
            }
            
            // Game
            if (typeof Sftw1_Game !== 'undefined') {
                Sftw1.injectGameMethods(this.modules.sftw1);
                console.log('✅ Sftw1_Game injetado');
            } else {
                console.warn('⚠️ Sftw1_Game não encontrado');
            }
            
            // UI
            if (typeof Sftw1_UI !== 'undefined') {
                Sftw1.injectUIMethods(this.modules.sftw1);
                console.log('✅ Sftw1_UI injetado');
            } else {
                console.warn('⚠️ Sftw1_UI não encontrado');
            }
            
            // StarCatalog (IMPORTANTE: injetar depois de definir starLimit)
            if (typeof Sftw1_StarCatalog !== 'undefined') {
                Sftw1.injectStarCatalogMethods(this.modules.sftw1);
                console.log('✅ Sftw1_StarCatalog injetado');
            } else {
                console.warn('⚠️ Sftw1_StarCatalog não encontrado');
            }
            
            // Inicializar o módulo PASSANDO O LIMITE (NOVO!)
            console.log('🚀 Inicializando módulo Sftw1...');
            await this.modules.sftw1.initialize('module-canvas', { starLimit: starLimit });
            
            this.currentModule = 'sftw1';
            
            console.log('🎉 Módulo Sftw1 carregado com sucesso!');
            console.log(`⭐ Configuração final: ${starLimit} estrelas`);
            
        } catch (error) {
            console.error('❌ ERRO CRÍTICO ao carregar o módulo Sftw1:', error);
            console.error('Stack trace:', error.stack);
            
            // Mensagem de erro detalhada
            let errorMessage = `Erro ao carregar módulo Sftw1:\n${error.message}`;
            
            // Diagnóstico específico
            if (error.message.includes('SceneManager')) {
                errorMessage += '\n\n🔄 SOLUÇÃO: Verifique se SceneManager.js está sendo carregado ANTES dos módulos Sftw1.';
                errorMessage += '\nOrdem correta: 1. Three.js → 2. SceneManager.js → 3. Módulos Sftw1';
            }
            
            if (error.message.includes('THREE') || error.message.includes('three')) {
                errorMessage += '\n\n🔄 SOLUÇÃO: Three.js não carregado. Verifique o CDN.';
            }
            
            if (error.message.includes('fetch') || error.message.includes('boundaries')) {
                errorMessage += '\n\n🔄 SOLUÇÃO: Arquivo boundaries.txt não encontrado em /data/.';
                errorMessage += '\nCrie a pasta "data" e coloque o arquivo boundaries.txt lá.';
            }
            
            if (error.message.includes('stars') || error.message.includes('catalog')) {
                errorMessage += '\n\n🔄 SOLUÇÃO: Arquivos de estrelas não encontrados em /data/stars/.';
                errorMessage += '\nVerifique se os arquivos stars_100.js, stars_500.js, stars_1000.js existem.';
            }
            
            this.showError(errorMessage);
            this.returnToMainMenu();
        }
    }

    createModuleContainer(moduleId) {
        console.log(`🏗️ Criando container para módulo ${moduleId}...`);
        
        // Remover container existente se houver
        const existingContainer = document.querySelector('.module-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Criar novo container
        const moduleContainer = document.createElement('div');
        moduleContainer.id = `module-${moduleId}-container`;
        moduleContainer.className = 'module-container';
        
        // Conteúdo do container
        moduleContainer.innerHTML = `
            <div class="module-header">
                <button class="btn-back">
                    <i class="fas fa-arrow-left"></i> Voltar ao Menu Principal
                </button>
                <h1>${this.getModuleName(moduleId)}</h1>
                <div class="module-status">
                    <span id="module-timer">00:00</span>
                    <span id="module-score">Pontos: 0</span>
                    <span id="module-constellations">Constelações: 0/88</span>
                </div>
            </div>
            
            <div class="module-content">
                <div class="canvas-container">
                    <canvas id="module-canvas"></canvas>
                </div>
                
                <div class="module-controls">
                    <!-- Os controles serão inseridos aqui pelo módulo Sftw1_UI.js -->
                    <div class="loading-controls">
                        <h3><i class="fas fa-spinner fa-spin"></i> Carregando módulo...</h3>
                        <p>Por favor, aguarde enquanto o módulo é inicializado.</p>
                        <div class="loading-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(moduleContainer);
        
        // Adicionar estilos do módulo
        this.addModuleStyles();
        
        // Adicionar evento ao botão de voltar
        moduleContainer.querySelector('.btn-back').addEventListener('click', () => {
            this.returnToMainMenu();
        });
        
        console.log(`✅ Container do módulo ${moduleId} criado`);
    }

    addModuleStyles() {
        if (document.getElementById('module-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'module-styles';
        style.textContent = `
            .module-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #0a0a2a;
                z-index: 1000;
                display: flex;
                flex-direction: column;
            }
            
            .module-header {
                background: rgba(13, 17, 23, 0.95);
                padding: 1rem 2rem;
                border-bottom: 2px solid var(--secondary-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
                backdrop-filter: blur(10px);
            }
            
            .btn-back {
                background: rgba(79, 195, 247, 0.1);
                border: 1px solid var(--secondary-color);
                color: var(--secondary-color);
                padding: 0.75rem 1.5rem;
                border-radius: var(--border-radius);
                cursor: pointer;
                font-family: 'Orbitron', sans-serif;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.3s;
            }
            
            .btn-back:hover {
                background: rgba(79, 195, 247, 0.2);
                transform: translateX(-3px);
            }
            
            .module-header h1 {
                font-family: 'Orbitron', sans-serif;
                color: var(--secondary-color);
                margin: 0;
                font-size: 1.8rem;
            }
            
            .module-status {
                display: flex;
                gap: 2rem;
                color: var(--text-secondary);
                font-family: 'Orbitron', sans-serif;
            }
            
            .module-content {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .canvas-container {
                flex: 1;
                position: relative;
                background: #000;
            }
            
            #module-canvas {
                width: 100%;
                height: 100%;
                display: block;
            }
            
            .module-controls {
                width: 350px;
                background: rgba(0, 0, 30, 0.9);
                padding: 2rem;
                overflow-y: auto;
                border-left: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .loading-controls {
                color: white;
                text-align: center;
                padding: 2rem 0;
            }
            
            .loading-controls h3 {
                color: #4fc3f7;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .loading-dots {
                display: flex;
                justify-content: center;
                gap: 0.5rem;
                margin-top: 2rem;
            }
            
            .dot {
                width: 12px;
                height: 12px;
                background: #4fc3f7;
                border-radius: 50%;
                animation: dotPulse 1.5s infinite ease-in-out;
            }
            
            .dot:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .dot:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes dotPulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.3); opacity: 1; }
            }
            
            /* Estilos do jogo serão adicionados pelo Sftw1_UI.js */
        `;
        
        document.head.appendChild(style);
    }

    returnToMainMenu() {
        console.log('🔙 Voltando ao menu principal...');
        
        // Parar módulo atual
        if (this.currentModule && this.modules[this.currentModule]) {
            try {
                this.modules[this.currentModule].cleanup();
            } catch (e) {
                console.warn('Erro ao limpar módulo:', e);
            }
        }
        
        // Remover container do módulo
        const moduleContainer = document.querySelector('.module-container');
        if (moduleContainer) {
            moduleContainer.remove();
        }
        
        // Remover estilos do módulo
        const moduleStyles = document.getElementById('module-styles');
        if (moduleStyles) {
            moduleStyles.remove();
        }
        
        // Mostrar interface principal
        const mainContainer = document.getElementById('main-container');
        if (mainContainer) {
            mainContainer.classList.remove('hidden');
        }
        
        // Resetar módulo atual
        this.currentModule = null;
        
        // Reativar o preview
        if (this.sceneManager) {
            try {
                this.sceneManager.onWindowResize();
            } catch (e) {
                console.warn('Erro ao redimensionar preview:', e);
            }
        }
        
        console.log('✅ Menu principal restaurado');
    }

    getModuleName(moduleId) {
        const moduleNames = {
            'sftw1': 'Treinamento de Céu',
            'smld1': 'Movimentos Planetários', 
            'smld2': 'Análise de Analema'
        };
        
        return moduleNames[moduleId] || 'Módulo';
    }

    showModuleMessage(moduleId) {
        const name = this.getModuleName(moduleId);
        
        alert(`${name}\n\nEste módulo está em desenvolvimento.\n\nFuncionalidades previstas:\n${this.getModuleDescription(moduleId)}`);
    }

    getModuleDescription(moduleId) {
        const descriptions = {
            'sftw1': '• Reconhecimento de constelações\n• Sistema de pontuação\n• Timer educativo\n• 88 constelações',
            'smld1': '• Precessão terrestre\n• Nutação\n• Rotação e translação\n• Comparação temporal',
            'smld2': '• Trajetória solar (analema)\n• Controles individuais\n• Visualização 3D\n• Análise de movimentos'
        };
        return descriptions[moduleId] || 'Em desenvolvimento';
    }

    handleNavigation(target) {
        switch(target) {
            case 'btn-help':
                this.showHelp();
                break;
            case 'btn-settings':
                this.showSettings();
                break;
            default:
                // Home já está ativa
                break;
        }
    }

    showHelp() {
        const helpText = `
            <h3>Como usar o Observatório Virtual</h3>
            <p><strong>1. Selecione um módulo:</strong></p>
            <ul>
                <li>Treinamento de Céu - Reconheça constelações</li>
                <li>Movimentos Planetários - Estude precessão e nutação</li>
                <li>Análise de Analema - Visualize a trajetória solar</li>
            </ul>
            
            <p><strong>2. Controles 3D:</strong></p>
            <ul>
                <li><strong>Rotacionar:</strong> Arraste com botão esquerdo</li>
                <li><strong>Zoom:</strong> Use a roda do mouse</li>
                <li><strong>Panorâmica:</strong> Arraste com botão direito</li>
            </ul>
            
            <p><strong>3. Recursos:</strong></p>
            <p>• Configurações visíveis no canto superior direito</p>
            <p>• Visualização ao vivo no painel direito</p>
            
            <p><strong>4. Treinamento de Céu:</strong></p>
            <p>• Clique em "Iniciar Treinamento"</p>
            <p>• Escolha a densidade de estrelas</p>
            <p>• Selecione uma constelação para começar</p>
            <p>• Adivinhe as constelações vizinhas</p>
            <p>• Complete o céu inteiro para ganhar</p>
        `;
        
        this.showModal('Ajuda', helpText);
    }

    showSettings() {
        const settingsHtml = `
            <h3>Configurações</h3>
            <div class="settings-group">
                <label>
                    <input type="checkbox" id="setting-fullscreen">
                    Tela cheia automática
                </label>
                <br>
                <label>
                    <input type="checkbox" id="setting-sounds" checked>
                    Efeitos sonoros
                </label>
                <br>
                <label>
                    Qualidade gráfica:
                    <select id="setting-quality">
                        <option value="low">Baixa</option>
                        <option value="medium" selected>Média</option>
                        <option value="high">Alta</option>
                    </select>
                </label>
            </div>
            <button id="save-settings" class="btn-save">Salvar Configurações</button>
        `;
        
        this.showModal('Configurações', settingsHtml);
        
        // Configurar evento do botão salvar
        setTimeout(() => {
            document.getElementById('save-settings')?.addEventListener('click', () => {
                alert('Configurações salvas!');
                this.closeModal();
            });
        }, 100);
    }

    showModal(title, content) {
        // Fechar modal existente
        this.closeModal();
        
        // Criar novo modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Adicionar estilos básicos se não existirem
        this.addModalStyles();
        
        // Fechar modal ao clicar no X ou fora
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    }

    addModalStyles() {
        if (document.getElementById('modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            
            .modal {
                background: var(--card-bg);
                border-radius: var(--border-radius);
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                border: 1px solid var(--secondary-color);
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                padding-bottom: 1rem;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: var(--text-primary);
                font-size: 2rem;
                cursor: pointer;
                line-height: 1;
            }
            
            .modal-content {
                color: var(--text-secondary);
                line-height: 1.6;
            }
            
            .modal-content ul {
                padding-left: 1.5rem;
                margin: 1rem 0;
            }
            
            .modal-content li {
                margin-bottom: 0.5rem;
            }
            
            .settings-group {
                margin: 1.5rem 0;
            }
            
            .settings-group label {
                display: block;
                margin-bottom: 1rem;
                cursor: pointer;
            }
            
            .btn-save {
                background: var(--secondary-color);
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: var(--border-radius);
                cursor: pointer;
                font-family: 'Orbitron', sans-serif;
                width: 100%;
                margin-top: 1rem;
            }
            
            .btn-save:hover {
                opacity: 0.9;
            }
        `;
        
        document.head.appendChild(style);
    }

    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    showError(message) {
        console.error('ERRO:', message);
        
        // Remover erros anteriores
        const oldErrors = document.querySelectorAll('.error-message');
        oldErrors.forEach(error => error.remove());
        
        // Criar nova mensagem de erro
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        
        // Formatar mensagem (substituir \n por <br>)
        const formattedMessage = message.replace(/\n/g, '<br>');
        
        errorDiv.innerHTML = `
            <div class="error-header">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Erro</span>
                <button class="error-close">&times;</button>
            </div>
            <div class="error-body">${formattedMessage}</div>
        `;
        
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #f85149, #d73a49);
            color: white;
            padding: 1.5rem;
            border-radius: 12px;
            z-index: 10001;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            animation: errorSlideIn 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-family: 'Roboto', sans-serif;
        `;
        
        document.body.appendChild(errorDiv);
        
        // Adicionar estilos de erro se não existirem
        this.addErrorStyles();
        
        // Botão de fechar
        errorDiv.querySelector('.error-close').addEventListener('click', () => {
            errorDiv.remove();
        });
        
        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.style.animation = 'errorSlideOut 0.3s ease';
                setTimeout(() => errorDiv.remove(), 300);
            }
        }, 10000);
    }

    addErrorStyles() {
        if (document.getElementById('error-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'error-styles';
        style.textContent = `
            @keyframes errorSlideIn {
                from { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
            }
            
            @keyframes errorSlideOut {
                from { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
                to { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
            }
            
            .error-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                font-family: 'Orbitron', sans-serif;
                font-size: 1.2rem;
            }
            
            .error-header i {
                margin-right: 0.5rem;
                font-size: 1.5rem;
            }
            
            .error-close {
                background: none;
                border: none;
                color: white;
                font-size: 2rem;
                cursor: pointer;
                line-height: 1;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .error-close:hover {
                color: #ffcccc;
            }
            
            .error-body {
                line-height: 1.5;
                font-size: 0.95rem;
            }
            
            .error-body br {
                margin-bottom: 0.5rem;
                display: block;
                content: "";
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado - Iniciando Observatório Virtual...');
    
    // Adicionar estilos para mensagens de erro
    const errorStyles = document.createElement('style');
    errorStyles.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(errorStyles);
    
    // Verificar se Three.js está disponível
    if (typeof THREE === 'undefined') {
        console.error('❌ Three.js não está carregado!');
        alert('ERRO: Three.js não carregado. Verifique sua conexão ou CDN.');
        return;
    }
    
    // Iniciar aplicação
    try {
        window.app = new ObservatorioVirtual();
        console.log('✅ Observatório Virtual inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro fatal ao inicializar aplicação:', error);
        alert(`Erro ao iniciar aplicação: ${error.message}\n\nVerifique o console para mais detalhes.`);
    }
});

// Exportar para debugging
if (typeof window !== 'undefined') {
    window.debugApp = () => {
        console.log('=== DEBUG APP ===');
        console.log('app:', window.app);
        console.log('THREE:', typeof THREE);
        console.log('SceneManager:', typeof SceneManager);
        console.log('Sftw1:', typeof Sftw1);
        console.log('Sftw1_DataLoader:', typeof Sftw1_DataLoader);
        console.log('Sftw1_Visualization:', typeof Sftw1_Visualization);
        console.log('Sftw1_Game:', typeof Sftw1_Game);
        console.log('Sftw1_UI:', typeof Sftw1_UI);
        console.log('Sftw1_StarCatalog:', typeof Sftw1_StarCatalog);
        console.log('Sftw1_StarDensity:', typeof Sftw1_StarDensity);
    };
}