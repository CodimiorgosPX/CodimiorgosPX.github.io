// Sftw1_Core.js - Módulo principal de inicialização e configuração
// VERSÃO INTEGRADA: injeções robustas + starLimit 3000 (HYG) + mantém funcionalidades
// Responsabilidade: Configuração básica, inicialização do módulo, gerenciamento de estado

class Sftw1 {
    constructor() {
        // ============================================
        // 1. ESTADO DO MÓDULO
        // ============================================
        this.isInitialized = false;
        this.sceneManager = null;

        // ============================================
        // 2. ELEMENTOS DA CENA
        // ============================================
        this.celestialSphere = null;
        this.gridLines = [];
        this.constellationBoundaries = [];
        this.constellationMeshes = new Map(); // Map(abbreviation -> mesh)
        this.constellationLabels = new Map();
        this.starMeshes = [];

        // ============================================
        // 3. DADOS DAS CONSTELAÇÕES
        // ============================================
        this.constellations = [];
        this.constellationNames = new Map();

        // ============================================
        // 4. DADOS DAS ESTRELAS
        // ============================================
        this.starCatalog = null;
        this.stars = [];

        // ✅ NOVO: limite padrão de estrelas (StarCatalog usa isso)
        // Sem StarDensity, isso evita ficar travado em 100/500/1000.
        this.starLimit = 20000;

        // ============================================
        // 5. CONFIGURAÇÃO DE COORDENADAS
        // ============================================
        this.coordinateSettings = {
            invertZ: true,
            currentConfig: 'invertZ'
        };

        // ============================================
        // 6. ESTADO DO JOGO - ATUALIZADO!
        // ============================================
        this.gameState = {
            status: 'idle', // 'idle', 'selecting', 'playing', 'completed'
            selectedConstellation: null,
            discoveredConstellations: new Set(),
            score: 0,
            startTime: null,
            elapsedTime: 0,
            totalConstellations: 88,
            difficulty: 'medium', // 'very-easy', 'easy', 'medium'
            isGameActive: false // só começa quando o usuário quiser
        };

        // ============================================
        // 7. CONFIGURAÇÕES
        // ============================================
        this.settings = {
            sphereRadius: 1000,
            gridColor: 0x4fc3f7,
            equatorColor: 0x00ff00,
            eclipticColor: 0xffa500,
            boundaryColor: 0xff0000,
            labelColor: 0xffffff,
            showGrid: true,
            showBoundaries: true,
            showLabels: true,           // nomes visíveis
            showTestSegments: false,    // linhas debug invisíveis
            showStars: true,

            // JOGO
            showGameControls: true,
            autoStartGame: false,
            darkenNonSelected: true,
            highlightSelected: true,
            nameType: 'bayer'
        };

        // ============================================
        // 8. REFERÊNCIAS DOM
        // ============================================
        this.uiElements = {};

        // ============================================
        // 9. CONTROLES DE JOGO
        // ============================================
        this.inputBuffer = '';

        // ============================================
        // 10. SISTEMA DE CALLBACKS
        // ============================================
        this.callbacks = {
            onConstellationClick: null,
            onGameStart: null,
            onGameEnd: null,

            // Jogo / UI
            onGameStateChange: null,
            onConstellationDiscovered: null,
            onWrongAnswer: null,
            onCorrectAnswer: null
        };

        // ============================================
        // 11. DIFICULDADES
        // ============================================
        this.difficultySettings = {
            'very-easy': {
                name: 'Muito Fácil',
                description: 'Céu normal com limites e estrelas visíveis',
                darkenSky: false,
                showBoundaries: true,
                showStars: true,
                showGrid: true,
                timeMultiplier: 1.5,
                scoreMultiplier: 0.5
            },
            'easy': {
                name: 'Fácil',
                description: 'Céu escuro, apenas limites visíveis',
                darkenSky: true,
                showBoundaries: true,
                showStars: false,
                showGrid: false,
                timeMultiplier: 1.0,
                scoreMultiplier: 0.8
            },
            'medium': {
                name: 'Médio',
                description: 'Céu escuro, sem limites, sem estrelas',
                darkenSky: true,
                showBoundaries: false,
                showStars: false,
                showGrid: false,
                timeMultiplier: 1.0,
                scoreMultiplier: 1.0
            }
        };

        this.debugMode = false;
    }

    // ============================================
    // MÉTODO PRINCIPAL DE INICIALIZAÇÃO (ROBUSTO)
    // ============================================
    async initialize(canvasId) {
        console.log('🚀 Inicializando módulo Sftw1 - Treinamento de Constelações');
        console.log('🎮 Sistema de dificuldades ativado');
        console.log('🏷️ NOMES DAS CONSTELAÇÕES ATIVADOS POR PADRÃO');
        console.log('🔍 Linhas de debug DESATIVADAS (showTestSegments: false)');
        console.log(`⭐ starLimit padrão: ${this.starLimit}`);

        try {
            // 1) SceneManager
            this.sceneManager = new SceneManager(canvasId);
            await this.sceneManager.init();

            // 2) Modo planetário
            this.sceneManager.setupPlanetariumMode();

            // 3) Coord config
            console.log('🧭 Usando configuração de coordenadas: invertZ=true');

            // =====================================================
            // 4) INJEÇÃO ROBUSTA (antes de chamar métodos delegados)
            // =====================================================
            this._injectAllAvailableModules();

            // 5) Carregar dados das constelações (precisa do DataLoader injetado)
            await this.loadConstellationData();

            // 6) Garantir StarCatalog e carregar estrelas
            //    (StarCatalog pode depender do HYG 3000 já estar no window; isso é ordem do index.html)
            if (typeof Sftw1.injectStarCatalogMethods === 'function') {
                // (re)injeção idempotente
                try { Sftw1.injectStarCatalogMethods(this); } catch (e) { /* ignore */ }
            }

            // loadStars é delegado; só chama se foi injetado
            if (this.starCatalog && typeof this.loadStars === 'function') {
                await this.loadStars();
                console.log(`⭐ ${this.stars.length} estrelas carregadas`);
            } else {
                // não quebra o simulador se StarCatalog não estiver carregado
                console.warn('⚠️ StarCatalog não injetado/carregado. Verifique se o script stars_hyg_3000.js vem antes do Sftw1_StarCatalog.js no index.html.');
            }

            // =====================================================
            // 7) Construção visual (depende do Visualization)
            // =====================================================
            this.createCelestialSphere();
            this.createCoordinateGrid();
            this.createConstellationBoundaries();

            // 8) Estrelas visuais (depende do Visualization)
            if (this.visualization && typeof this.visualization.createStars === 'function') {
                this.visualization.createStars();
            }

            // 9) UI (painéis, botões, lista, etc.)
            this.setupGameUI();

            // 10) Visibilidade inicial
            this.toggleBoundaries();

            this.isInitialized = true;

            console.log('✅ Módulo Sftw1 inicializado com sucesso!');
            console.log(`📊 ${this.constellations.length} constelações carregadas`);
            console.log(`⭐ ${this.stars.length} estrelas carregadas`);
            console.log(`🏷️ Nomes das constelações: ${this.settings.showLabels ? 'VISÍVEIS' : 'INVISÍVEIS'}`);
            console.log(`🎮 Status do jogo: ${this.gameState.status} (aguardando início do usuário)`);
            console.log(`⚙️ Dificuldade atual: ${this.difficultySettings[this.gameState.difficulty].name}`);

            if (this.ui && typeof this.ui.showMessage === 'function') {
                this.ui.showMessage(
                    'Simulador carregado! Use os controles à direita. O céu está com banco grande (HYG 3000) se habilitado.',
                    'info'
                );
            }

        } catch (error) {
            console.error('❌ Erro ao inicializar Sftw1:', error);
            throw error;
        }
    }

    // ============================================================
    // NOVO: INJEÇÃO ROBUSTA (não quebra se módulo faltar)
    // ============================================================
    _injectAllAvailableModules() {
        console.log('🔗 Injetando módulos disponíveis (modo robusto)...');

        // DataLoader (precisa vir antes de loadConstellationData)
        if (typeof Sftw1.injectDataLoaderMethods === 'function') {
            try {
                Sftw1.injectDataLoaderMethods(this);
                console.log('✅ DataLoader injetado');
            } catch (e) {
                console.warn('⚠️ Falha ao injetar DataLoader:', e);
            }
        } else {
            console.warn('⚠️ injectDataLoaderMethods não encontrado (DataLoader pode não estar carregado).');
        }

        // Visualization
        if (typeof Sftw1.injectVisualizationMethods === 'function') {
            try {
                Sftw1.injectVisualizationMethods(this);
                console.log('✅ Visualization injetado');
            } catch (e) {
                console.warn('⚠️ Falha ao injetar Visualization:', e);
            }
        } else {
            console.warn('⚠️ injectVisualizationMethods não encontrado (Visualization pode não estar carregado).');
        }

        // UI
        if (typeof Sftw1.injectUIMethods === 'function') {
            try {
                Sftw1.injectUIMethods(this);
                console.log('✅ UI injetado');
            } catch (e) {
                console.warn('⚠️ Falha ao injetar UI:', e);
            }
        } else {
            console.warn('⚠️ injectUIMethods não encontrado (UI pode não estar carregado).');
        }

        // Game
        if (typeof Sftw1.injectGameMethods === 'function') {
            try {
                Sftw1.injectGameMethods(this);
                console.log('✅ Game injetado');
            } catch (e) {
                console.warn('⚠️ Falha ao injetar Game:', e);
            }
        } else {
            console.warn('⚠️ injectGameMethods não encontrado (Game pode não estar carregado).');
        }

        // StarCatalog (pode ser injetado aqui ou depois; aqui é ok)
        if (typeof Sftw1.injectStarCatalogMethods === 'function') {
            try {
                Sftw1.injectStarCatalogMethods(this);
                console.log('✅ StarCatalog injetado');
            } catch (e) {
                console.warn('⚠️ Falha ao injetar StarCatalog:', e);
            }
        }
    }

    // ============================================
    // MÉTODOS DE DIFICULDADE
    // ============================================
    setDifficulty(difficulty) {
        if (!this.difficultySettings[difficulty]) {
            console.warn(`⚠️ Dificuldade "${difficulty}" não encontrada, usando "medium"`);
            difficulty = 'medium';
        }

        const oldDifficulty = this.gameState.difficulty;
        this.gameState.difficulty = difficulty;
        const settings = this.difficultySettings[difficulty];

        console.log(`🎯 Dificuldade alterada: ${oldDifficulty} → ${difficulty}`);
        console.log(`   ${settings.name}: ${settings.description}`);

        if (this.visualization) {
            this.settings.showBoundaries = settings.showBoundaries;
            this.settings.showStars = settings.showStars;
            this.settings.showGrid = settings.showGrid;

            if (typeof this.toggleBoundaries === 'function') this.toggleBoundaries();
            if (typeof this.toggleStars === 'function') this.toggleStars();
            if (typeof this.toggleGrid === 'function') this.toggleGrid();
        }

        return settings;
    }

    getCurrentDifficulty() {
        return this.difficultySettings[this.gameState.difficulty];
    }

    getAllDifficulties() {
        return Object.keys(this.difficultySettings).map(key => ({
            id: key,
            ...this.difficultySettings[key]
        }));
    }

    // ============================================
    // SISTEMA DE CALLBACKS
    // ============================================
    registerCallback(event, callback) {
        if (!event || typeof callback !== 'function') return;

        // Permite eventos novos sem quebrar: cria slot se não existir
        if (!this.callbacks) this.callbacks = {};
        if (!(event in this.callbacks)) this.callbacks[event] = null;

        this.callbacks[event] = callback;
    }

    triggerCallback(event, ...args) {
        if (!this.callbacks) return;
        const cb = this.callbacks[event];
        if (typeof cb === 'function') {
            try {
                cb(...args);
            } catch (err) {
                console.error(`❌ Erro em callback ${event}:`, err);
            }
        }
    }

    // ============================================
    // CONVERSÃO RA/DEC -> Vector3
    // ============================================
    raDecToVector3(raHours, decDegrees, radius) {
        const raDeg = raHours * 15;
        let raRad = THREE.MathUtils.degToRad(raDeg);
        let decRad = THREE.MathUtils.degToRad(decDegrees);

        if (this.coordinateSettings.invertZ) {
            raRad = -raRad;
        }

        const cosDec = Math.cos(decRad);
        const sinDec = Math.sin(decRad);
        const cosRA = Math.cos(raRad);
        const sinRA = Math.sin(raRad);

        const x = radius * cosDec * cosRA;
        const y = radius * sinDec;
        const z = radius * cosDec * sinRA;

        return new THREE.Vector3(x, y, z);
    }

    // ============================================
    // NOME DAS CONSTELAÇÕES (PT)
    // ============================================
    getConstellationName(abbreviation) {
        const nameMap = {
            'UMi': 'Ursa Menor', 'Cep': 'Cefeu', 'Cam': 'Girafa',
            'Dra': 'Dragão', 'Cas': 'Cassiopeia', 'UMa': 'Ursa Maior',
            'Lyn': 'Lince', 'Her': 'Hércules', 'Boo': 'Boieiro',
            'CrB': 'Coroa Boreal', 'Ser': 'Serpente', 'Oph': 'Ofiúco',
            'Aql': 'Águia', 'Lyr': 'Lira', 'Cyg': 'Cisne',
            'Vul': 'Raposa', 'Del': 'Delfim', 'Equ': 'Cavalinho',
            'Peg': 'Pégaso', 'And': 'Andrômeda', 'Tri': 'Triângulo',
            'Per': 'Perseu', 'Ari': 'Áries', 'Tau': 'Touro',
            'Gem': 'Gêmeos', 'Cnc': 'Caranguejo', 'Leo': 'Leão',
            'Vir': 'Virgem', 'Lib': 'Libra', 'Sco': 'Escorpião',
            'Sgr': 'Sagitário', 'Cap': 'Capricórnio', 'Aqr': 'Aquário',
            'Psc': 'Peixes', 'Cet': 'Baleia', 'Eri': 'Eridano',
            'Ori': 'Órion', 'CMa': 'Cão Maior', 'CMi': 'Cão Menor',
            'Mon': 'Unicórnio', 'Hya': 'Hidra', 'Crt': 'Taça',
            'Crv': 'Corvo', 'Cen': 'Centauro', 'Lup': 'Lobo',
            'Ara': 'Altar', 'Tel': 'Telescópio', 'Pav': 'Pavão',
            'Gru': 'Grou', 'Phe': 'Fênix', 'Tuc': 'Tucano',
            'Hyi': 'Hidra Macho', 'Men': 'Mesa', 'Vol': 'Peixe Voador',
            'Car': 'Quilha', 'Vel': 'Velas', 'Pup': 'Popa',
            'Pic': 'Pintor', 'Dor': 'Dourado', 'Ret': 'Reticulum',
            'Hor': 'Relógio', 'Cae': 'Cinzel', 'Col': 'Pomba',
            'Lep': 'Lebre', 'For': 'Forno', 'Ant': 'Máquina Pneumática',
            'Pyx': 'Bússola', 'Sex': 'Sextante', 'LMi': 'Leão Menor',
            'CVn': 'Cães de Caça', 'Com': 'Cabeleira de Berenice',
            'Sge': 'Flecha', 'Sct': 'Escudo', 'CrA': 'Coroa Austral',
            'Mic': 'Microscópio', 'Ind': 'Índio', 'Oct': 'Oitante',
            'Mus': 'Mosca', 'Aps': 'Ave do Paraíso', 'TrA': 'Triângulo Austral',
            'Cir': 'Compasso', 'Nor': 'Esquadro', 'Cha': 'Camaleão'
        };

        return nameMap[abbreviation] || abbreviation;
    }

    // ============================================
    // MÉTODOS DELEGADOS (implementados pelos módulos injetados)
    // ============================================
    async loadConstellationData() { throw new Error('Método delegado para Sftw1_DataLoader.js'); }
    async loadStars() { throw new Error('Método delegado para Sftw1_StarCatalog.js'); }
    createCelestialSphere() { throw new Error('Método delegado para Sftw1_Visualization.js'); }
    createCoordinateGrid() { throw new Error('Método delegado para Sftw1_Visualization.js'); }
    createTestSegmentVisualization() { throw new Error('Método delegado para Sftw1_Visualization.js'); }
    createConstellationBoundaries() { throw new Error('Método delegado para Sftw1_Visualization.js'); }
    setupGameUI() { throw new Error('Método delegado para Sftw1_Game.js ou Sftw1_UI.js'); }
    setupGameControls() { throw new Error('Método delegado para Sftw1_Game.js'); }
    showConstellationSelection() { throw new Error('Método delegado para Sftw1_Game.js'); }
    findStarByName(name) { throw new Error('Método delegado para Sftw1_StarCatalog.js'); }
    findStarsInConstellation(constellationAbbr) { throw new Error('Método delegado para Sftw1_StarCatalog.js'); }
    toggleStars() { throw new Error('Método delegado para Sftw1_Visualization.js'); }
    toggleBoundaries() { throw new Error('Método delegado para Sftw1_Visualization.js'); }
    toggleGrid() { throw new Error('Método delegado para Sftw1_Visualization.js'); }

    // ============================================
    // LIMPEZA
    // ============================================
    cleanup() {
        console.log('🧹 Limpando módulo Sftw1...');

        this.gameState.status = 'idle';
        this.gameState.isGameActive = false;

        // Limpar estrelas
        if (this.starMeshes && this.starMeshes.length > 0) {
            console.log(`   Limpando ${this.starMeshes.length} estrelas...`);
            this.starMeshes.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                if (this.sceneManager && this.sceneManager.scene) {
                    this.sceneManager.scene.remove(mesh);
                }
            });
            this.starMeshes = [];
        }

        // Limpar star catalog
        if (this.starCatalog && typeof this.starCatalog.cleanup === 'function') {
            this.starCatalog.cleanup();
        }

        // Limpar scene manager
        if (this.sceneManager) {
            this.sceneManager.cleanup();
        }

        // Limpar arrays
        this.gridLines = [];
        this.constellationBoundaries = [];
        this.constellationMeshes.clear();
        this.constellationLabels.clear();
        this.constellations = [];
        this.stars = [];

        // Limpar callbacks
        this.callbacks = {
            onConstellationClick: null,
            onGameStart: null,
            onGameEnd: null,

            // Jogo / UI
            onGameStateChange: null,
            onConstellationDiscovered: null,
            onWrongAnswer: null,
            onCorrectAnswer: null
        };

        this.isInitialized = false;

        console.log('✅ Módulo Sftw1 limpo');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Sftw1 = Sftw1;
    console.log('✅ Sftw1_Core.js carregado (VERSÃO INTEGRADA: starLimit 3000 + injeção robusta)');
}

// ============================================
// INICIALIZADOR MODULAR
// ============================================
Sftw1.loadModules = async function () {
    console.log('📦 Carregando módulos do Sftw1...');
    return {
        Core: Sftw1,
        DataLoader: null,
        Visualization: null,
        Game: null,
        UI: null,
        StarCatalog: null
    };
};
