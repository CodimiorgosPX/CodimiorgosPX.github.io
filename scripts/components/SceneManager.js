// Gerenciador de Cena Three.js - Versão Completa com Suporte a Planetário
class SceneManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.planetariumControls = null; // Novos controles para planetário
        this.objects = [];
        this.animations = [];
        this.textures = [];

        // ==================================================
        // FUNDO "FALSO" (STARFIELD PROCEDURAL)
        // ==================================================
        // No projeto final (catálogo real + limites Stellarium), este fundo NÃO deve existir.
        // Mantemos o método addStars() apenas para debug/preview, mas por padrão ele fica DESLIGADO.
        // Se quiser reativar para algum preview, faça:
        //   sceneManager.setProceduralStarfieldEnabled(true)
        this._proceduralStarfieldEnabled = false;
        this.proceduralStarfield = null;

        // ==================================================
        // DEBUG DE CENA
        // ==================================================
        this.debug = {
            enabled: true,
            logOnInit: true,
        };
        
        // Configurações para planetário
        this.isPlanetariumMode = false;
        this.planetariumSettings = {
            rotation: { x: 0, y: 0 },
            sensitivity: 0.003,
            minFOV: 30,
            maxFOV: 120,
            defaultFOV: 60
        };
    }

    async init() {
        return new Promise((resolve) => {
            try {
                this.setupScene();
                this.setupCamera();
                this.setupRenderer();
                this.setupLights();
                this.setupEventListeners();
                
                // Iniciar loop de animação
                this.animate();

                if (this.debug.enabled && this.debug.logOnInit) {
                    this.logSceneSummary('init');
                }
                
                console.log('SceneManager inicializado com sucesso!');
                resolve();
            } catch (error) {
                console.error('Erro ao inicializar SceneManager:', error);
                resolve();
            }
        });
    }
    
    // Configurar para modo PLANETÁRIO (câmera fixa no centro)
    setupPlanetariumMode() {
        console.log('Configurando modo Planetário...');
        
        this.isPlanetariumMode = true;
        
        // 1. Limpar controles orbitais padrão se existirem
        if (this.controls) {
            this.controls.enabled = false;
            this.controls.dispose();
            this.controls = null;
        }
        
        // 2. Posicionar câmera no CENTRO (0,0,0)
        if (this.camera) {
            this.camera.position.set(0, 0, 0);
            this.camera.near = 0.01; // Pode ver coisas a 1cm
            this.camera.far = 5000;
            this.camera.fov = this.planetariumSettings.defaultFOV;
            this.camera.updateProjectionMatrix();
        }
        
        // 3. Configurar controles especiais de planetário
        this.setupPlanetariumControls();
        
        // 4. Remover estrelas de fundo padrão (serão colocadas na esfera)
        this.removeDefaultStars();
        
        console.log('Modo Planetário configurado! Câmera no centro (0,0,0)');
    }
    
    // Configurar controles ESPECIAIS para planetário
    setupPlanetariumControls() {
        if (!this.renderer || !this.camera) return;
        
        const canvas = this.renderer.domElement;
        
        // Estado dos controles
        this.planetariumControls = {
            isDragging: false,
            lastMouse: { x: 0, y: 0 },
            sensitivity: 0.003
        };
        
        // 1. MOUSE DOWN - Começar arrastar
        canvas.addEventListener('mousedown', (e) => {
            this.planetariumControls.isDragging = true;
            this.planetariumControls.lastMouse.x = e.clientX;
            this.planetariumControls.lastMouse.y = e.clientY;
            canvas.style.cursor = 'grabbing';
        });
        
        // 2. MOUSE UP - Parar arrastar
        canvas.addEventListener('mouseup', () => {
            this.planetariumControls.isDragging = false;
            canvas.style.cursor = 'grab';
        });
        
        // 3. MOUSE MOVE - Rotacionar vista (CÂMERA FIXA NO CENTRO)
        canvas.addEventListener('mousemove', (e) => {
            if (!this.planetariumControls.isDragging || !this.camera) return;
            
            const deltaX = e.clientX - this.planetariumControls.lastMouse.x;
            const deltaY = e.clientY - this.planetariumControls.lastMouse.y;
            
            // Atualizar rotação da câmera (ela está fixa no centro)
            this.planetariumSettings.rotation.y += deltaX * this.planetariumControls.sensitivity;
            this.planetariumSettings.rotation.x += deltaY * this.planetariumControls.sensitivity;
            
            // Limitar rotação vertical (não virar de cabeça para baixo)
            this.planetariumSettings.rotation.x = Math.max(
                -Math.PI / 2.1, 
                Math.min(Math.PI / 2.1, this.planetariumSettings.rotation.x)
            );
            
            this.planetariumControls.lastMouse.x = e.clientX;
            this.planetariumControls.lastMouse.y = e.clientY;
        });
        
        // 4. MOUSE WHEEL - Zoom (muda FOV, não posição)
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (this.camera) {
                const newFOV = this.camera.fov + e.deltaY * 0.05;
                this.camera.fov = Math.max(
                    this.planetariumSettings.minFOV, 
                    Math.min(this.planetariumSettings.maxFOV, newFOV)
                );
                this.camera.updateProjectionMatrix();
            }
        });
        
        // 5. TOUCH para dispositivos móveis
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.planetariumControls.isDragging = true;
                this.planetariumControls.lastMouse.x = e.touches[0].clientX;
                this.planetariumControls.lastMouse.y = e.touches[0].clientY;
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.planetariumControls.isDragging && e.touches.length === 1 && this.camera) {
                const deltaX = e.touches[0].clientX - this.planetariumControls.lastMouse.x;
                const deltaY = e.touches[0].clientY - this.planetariumControls.lastMouse.y;
                
                this.planetariumSettings.rotation.y += deltaX * this.planetariumControls.sensitivity * 2;
                this.planetariumSettings.rotation.x += deltaY * this.planetariumControls.sensitivity * 2;
                
                this.planetariumSettings.rotation.x = Math.max(
                    -Math.PI / 2.1, 
                    Math.min(Math.PI / 2.1, this.planetariumSettings.rotation.x)
                );
                
                this.planetariumControls.lastMouse.x = e.touches[0].clientX;
                this.planetariumControls.lastMouse.y = e.touches[0].clientY;
            }
        });
        
        canvas.addEventListener('touchend', () => {
            this.planetariumControls.isDragging = false;
        });
        
        // 6. Cursor inicial
        canvas.style.cursor = 'grab';
        
        console.log('Controles Planetários configurados: Arraste para girar, Scroll para zoom');
    }
    
    // Atualizar rotação da câmera no planetário (chamar no loop de animação)
    updatePlanetariumCamera() {
        if (!this.isPlanetariumMode || !this.camera) return;
        
        // Aplicar rotação à câmera (que está fixa no centro)
        this.camera.rotation.order = 'YXZ'; // Ordem importante!
        this.camera.rotation.y = this.planetariumSettings.rotation.y;
        this.camera.rotation.x = this.planetariumSettings.rotation.x;
        this.camera.rotation.z = 0;
    }
    
    // Método para remover estrelas padrão (usado no planetário)
    removeDefaultStars() {
        // Remover o starfield procedural criado por addStars().
        // OBS: versões anteriores verificavam count===3000, mas o starCount atual é 1000.
        const candidates = [];

        if (this.proceduralStarfield) {
            candidates.push(this.proceduralStarfield);
        }

        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (!obj) continue;

            const isTaggedProcedural =
                obj.userData && (obj.userData.kind === 'proceduralStarfield' || obj.userData.isProceduralStarfield === true);
            const isNamedProcedural = obj.name === 'proceduralStarfield';

            if (obj.type === 'Points' && (isTaggedProcedural || isNamedProcedural)) {
                candidates.push(obj);
            }
        }

        // Remover candidatos (sem duplicar)
        const unique = Array.from(new Set(candidates));
        unique.forEach((obj) => {
            try {
                if (this.scene) this.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            } catch (e) {
                console.warn('SceneManager.removeDefaultStars: falha ao remover objeto:', e);
            }
        });

        // Remover da lista this.objects
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (unique.includes(obj)) {
                this.objects.splice(i, 1);
            }
        }

        if (unique.includes(this.proceduralStarfield)) {
            this.proceduralStarfield = null;
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // IMPORTANTE:
        // O "fundo falso" (starfield procedural) foi DESATIVADO por padrão.
        // Ele causava confusão e atrapalhava o modo jogo (e o objetivo é usar catálogo real).
        // Se alguém quiser ativar, use setProceduralStarfieldEnabled(true).
        if (!this.isPlanetariumMode && this._proceduralStarfieldEnabled) {
            this.addStars();
        }
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60, // campo de visão
            window.innerWidth / window.innerHeight, // proporção
            0.1, // plano próximo
            1000 // plano distante
        );
        
        // Posição padrão (será sobrescrita no planetário)
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) {
            throw new Error(`Canvas com id "${this.canvasId}" não encontrado!`);
        }

        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
    }

    setupLights() {
        // Luz ambiente
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        // Luz direcional principal
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Luz de preenchimento
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
    }
    
    // Configurar controles orbitais padrão (opcional)
    setupOrbitControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 1000;
            this.controls.enabled = true;
        } else {
            console.warn('OrbitControls não disponível.');
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas || !this.camera || !this.renderer) return;

        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    addStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2000;
            positions[i + 1] = (Math.random() - 0.5) * 2000;
            positions[i + 2] = (Math.random() - 0.5) * 2000;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        stars.name = 'proceduralStarfield';
        stars.userData = {
            kind: 'proceduralStarfield',
            isProceduralStarfield: true,
            createdBy: 'SceneManager.addStars',
            starCount,
        };
        this.scene.add(stars);
        this.objects.push(stars);

        // Guardar referência direta
        this.proceduralStarfield = stars;
    }

    // ==================================================
    // API DE CONTROLE DO STARFIELD PROCEDURAL
    // ==================================================
    setProceduralStarfieldEnabled(enabled) {
        this._proceduralStarfieldEnabled = !!enabled;

        // Se já existe e foi desabilitado, remove imediatamente.
        if (!this._proceduralStarfieldEnabled) {
            this.removeDefaultStars();
        } else {
            // Se habilitou e ainda não existe, cria (apenas se já tiver scene)
            if (this.scene && !this.proceduralStarfield && !this.isPlanetariumMode) {
                this.addStars();
            }
        }
    }

    // ==================================================
    // DEBUG / INSPEÇÃO
    // ==================================================
    logSceneSummary(tag = '') {
        if (!this.scene) {
            console.warn('[SceneManager] logSceneSummary: scene não existe');
            return;
        }

        const counts = {
            total: 0,
            points: 0,
            lines: 0,
            meshes: 0,
            sprites: 0,
            other: 0,
            proceduralStarfield: 0,
        };

        const rows = [];

        this.scene.traverse((obj) => {
            if (!obj) return;
            counts.total++;
            const t = obj.type || 'Unknown';
            if (t === 'Points') counts.points++;
            else if (t.startsWith('Line')) counts.lines++;
            else if (t === 'Mesh') counts.meshes++;
            else if (t === 'Sprite') counts.sprites++;
            else counts.other++;

            const isProcedural = obj.userData && (obj.userData.kind === 'proceduralStarfield' || obj.userData.isProceduralStarfield === true);
            if (isProcedural || obj.name === 'proceduralStarfield') counts.proceduralStarfield++;

            // Só listar objetos relevantes (não lotar com buffers internos)
            if (
                isProcedural ||
                obj.type === 'Points' ||
                obj.type === 'Line' ||
                obj.type === 'LineSegments' ||
                obj.type === 'Mesh' ||
                obj.type === 'Sprite'
            ) {
                rows.push({
                    name: obj.name || '(sem nome)',
                    type: obj.type,
                    kind: (obj.userData && obj.userData.kind) ? obj.userData.kind : '',
                    visible: obj.visible,
                });
            }
        });

        console.groupCollapsed(`[SceneManager] Cena (${tag}) — resumo`);
        console.log('counts:', counts);
        console.table(rows.slice(0, 60));
        if (rows.length > 60) console.log(`... (+${rows.length - 60} objetos não exibidos)`);
        console.groupEnd();
    }

    createSphere(options = {}) {
        const defaults = {
            radius: 1,
            color: 0xffffff,
            position: { x: 0, y: 0, z: 0 },
            emissive: null,
            emissiveIntensity: 1,
            wireframe: false,
            transparent: false,
            opacity: 1,
            side: THREE.FrontSide
        };

        const config = { ...defaults, ...options };

        const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: config.color,
            emissive: config.emissive || 0x000000,
            emissiveIntensity: config.emissiveIntensity,
            wireframe: config.wireframe,
            transparent: config.transparent,
            opacity: config.opacity,
            side: config.side
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(config.position.x, config.position.y, config.position.z);
        
        this.scene.add(sphere);
        this.objects.push(sphere);
        
        return sphere;
    }

    createOrbit(center, radius, color = 0xffffff, opacity = 0.3) {
        const orbitGeometry = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64);
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: opacity
        });

        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        orbit.position.y = center.position.y;
        
        this.scene.add(orbit);
        this.objects.push(orbit);
        
        return orbit;
    }

    // Método para criar linhas
    createLine(points, color = 0xffffff, lineWidth = 1, opacity = 1) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            linewidth: lineWidth,
            transparent: opacity < 1,
            opacity: opacity
        });
        
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.objects.push(line);
        
        return line;
    }

    // Método para criar pontos
    createPoint(position, color = 0xffffff, size = 2, emissive = false) {
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = emissive 
            ? new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.9
            })
            : new THREE.MeshBasicMaterial({ 
                color: color
            });
        
        const point = new THREE.Mesh(geometry, material);
        point.position.copy(position);
        
        this.scene.add(point);
        this.objects.push(point);
        
        return point;
    }

    // Método para criar círculo
    createCircle(radius, color = 0x444444, segments = 64, yPosition = 0) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(theta) * radius,
                yPosition,
                Math.sin(theta) * radius
            ));
        }
        
        return this.createLine(points, color, 0.5);
    }

    // Método para criar texto (sprites)
    createTextSprite(text, position, color = 0xffffff, fontSize = 32, backgroundColor = 'rgba(0, 0, 0, 0.7)') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Medir texto
        context.font = `bold ${fontSize}px Arial`;
        const textWidth = context.measureText(text).width;
        
        // Tamanho do canvas
        canvas.width = textWidth + 20;
        canvas.height = fontSize + 20;
        
        // Fundo
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Borda
        context.strokeStyle = `rgb(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255})`;
        context.lineWidth = 2;
        context.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Texto
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = `rgb(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255})`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Criar textura e sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        
        // Posicionar
        sprite.position.copy(position);
        sprite.scale.set(canvas.width / 10, canvas.height / 10, 1);
        
        this.scene.add(sprite);
        this.objects.push(sprite);
        this.textures.push(texture);
        
        return sprite;
    }

    // Método para criar grade 3D
    createGrid(size = 100, divisions = 10, colorCenterLine = 0x888888, colorGrid = 0x444444) {
        const gridHelper = new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid);
        this.scene.add(gridHelper);
        this.objects.push(gridHelper);
        
        return gridHelper;
    }

    // Método para criar eixos XYZ
    createAxes(size = 10) {
        const axesHelper = new THREE.AxesHelper(size);
        this.scene.add(axesHelper);
        this.objects.push(axesHelper);
        
        return axesHelper;
    }

    addAnimation(animationFunction) {
        this.animations.push(animationFunction);
    }

    removeAnimation(animationFunction) {
        const index = this.animations.indexOf(animationFunction);
        if (index > -1) {
            this.animations.splice(index, 1);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Executar animações registradas
        this.animations.forEach(animation => animation());
        
        // Atualizar controles de planetário se estiver nesse modo
        if (this.isPlanetariumMode) {
            this.updatePlanetariumCamera();
        }
        
        // Atualizar controles orbitais padrão se existirem
        if (this.controls && this.controls.enabled) {
            this.controls.update();
        }
        
        // Renderizar
        if (this.scene && this.camera && this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    cleanup() {
        console.log('SceneManager: Iniciando limpeza...');
        
        // Parar animação
        if (this.renderer) {
            this.renderer.setAnimationLoop(null);
        }
        
        // Limpar event listeners específicos do planetário
        if (this.renderer) {
            const canvas = this.renderer.domElement;
            canvas.style.cursor = 'default';
            
            // Remover todos os event listeners
            const newCanvas = canvas.cloneNode(true);
            canvas.parentNode.replaceChild(newCanvas, canvas);
        }
        
        // Limpar objetos da cena
        this.objects.forEach(obj => {
            if (obj && this.scene) {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => {
                            if (m.dispose) m.dispose();
                            if (m.map) m.map.dispose();
                        });
                    } else {
                        if (obj.material.dispose) obj.material.dispose();
                        if (obj.material.map) obj.material.map.dispose();
                    }
                }
                this.scene.remove(obj);
            }
        });
        
        // Limpar texturas
        this.textures.forEach(texture => {
            if (texture.dispose) texture.dispose();
        });
        
        // Limpar arrays
        this.objects = [];
        this.animations = [];
        this.textures = [];
        
        // Limpar controles
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        
        this.planetariumControls = null;
        this.isPlanetariumMode = false;
        
        // Limpar renderizador
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            this.renderer = null;
        }
        
        // Remover event listeners globais
        window.removeEventListener('resize', () => this.onWindowResize());
        
        // Limpar referências
        this.scene = null;
        this.camera = null;
        
        console.log('SceneManager: Limpeza concluída');
    }

    // Métodos utilitários
    
    // Converter coordenadas esféricas para cartesianas
    sphericalToCartesian(radius, phi, theta) {
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        return new THREE.Vector3(x, y, z);
    }

    // Converter coordenadas celestes (DEC, RA) para cartesianas
    celestialToCartesian(radius, decDeg, raHours) {
        // DEC: Declinação em graus (-90 a +90)
        // RA: Ascensão Reta em horas (0 a 24)
        
        const dec = THREE.MathUtils.degToRad(decDeg);
        const ra = THREE.MathUtils.degToRad(raHours * 15); // 1 hora = 15 graus
        
        const phi = Math.PI/2 - dec; // Colatitude
        const theta = ra;
        
        return this.sphericalToCartesian(radius, phi, theta);
    }

    // Criar linha de grade esférica (paralelo)
    createSphericalParallel(radius, latitude, color = 0x444444, segments = 64) {
        const points = [];
        const phi = THREE.MathUtils.degToRad(90 - latitude); // Colatitude
        
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const point = this.sphericalToCartesian(radius, phi, theta);
            points.push(point);
        }
        
        return this.createLine(points, color, 0.5, 0.7);
    }

    // Criar linha de grade esférica (meridiano)
    createSphericalMeridian(radius, longitude, color = 0x444444, steps = 36) {
        const points = [];
        
        for (let lat = -80; lat <= 80; lat += 160/steps) {
            const phi = THREE.MathUtils.degToRad(90 - lat);
            const theta = THREE.MathUtils.degToRad(longitude);
            const point = this.sphericalToCartesian(radius, phi, theta);
            points.push(point);
        }
        
        return this.createLine(points, color, 0.5, 0.7);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SceneManager = SceneManager;
}