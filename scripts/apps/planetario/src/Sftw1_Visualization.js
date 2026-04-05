// Sftw1_Visualization.js - VERSÃO 100% CORRIGIDA
// CORREÇÕES APLICADAS:
// 1. ✅ NOMES VISÍVEIS (labels funcionando)
// 2. ✅ SEGMENTOS INVISÍVEIS (showTestSegments: false)
// 3. ✅ BUG CLIQUE DUPLO CORRIGIDO
// 4. ✅ CONTAINER DE INFORMAÇÕES FUNCIONAL

class Sftw1_Visualization {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        this.geodesicLines = new Map();
        this.constellationAreas = new Map();
        this.constellationLabels = new Map();
        this.starMeshes = [];
        this.originalLines = [];
        this.gridLines = [];
        this.eclipticLine = null;
        this.galacticEquatorLine = null;
        this.clickFeedback = [];
        
        // Sistema de interação - CORRIGIDO
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.highlightedConstellation = null;
        this.lastClickTime = 0;
        this.clickDebounceTime = 300; // Prevenção de clique duplo
        
        // Sistema de jogo
        this.selectedConstellation = null;

        // =========================
        // MESSIER (marcadores)
        // =========================
        this.messierGroup = null;            // THREE.Group com sprites
        this.messierSprites = new Map();     // id -> THREE.Sprite
        this.messierVisible = false;         // estado atual
        // (game isolation) salva/restaura visibilidade do Messier ao entrar/sair do modo jogo
        this._messierVisibleBeforeGame = null;
        this._messierWantedDuringGame = null;

        // Jogo do Messier (sessão separada do catálogo visual)
        this.messierGame = this._createDefaultMessierGameState();

        this.gameMode = false;
        this.darkenedObjects = [];

        // Opções do modo jogo (configuráveis pela UI)
        this.gameOptions = {
            showDiscoveredFill: true,   // fundo azul escuro nas descobertas
            showDiscoveredNames: true,  // mostrar nomes das descobertas no modo jogo
            showProgress: true,         // UI (guardado aqui para consistência)
            game1ShowBoundaries: true,
            game1ShowLabels: false
        };

        // Preenchimento (fundo azul) por constelação, gerado a partir dos polígonos dos boundaries
        // Map<abbr, THREE.Mesh[]>
        this.constellationFillMeshes = new Map();
        
        // Container de informações - CORRIGIDO
        this.infoContainer = null;
        this.currentInfoConstellation = null;
        this.currentInfoStar = null;
        this.currentInfoType = null;

        // Estudo de estrelas (filtros aplicados pela aba "Estrelas")
        this.starStudyFilter = {
            enabled: false,
            namedOnly: true,
            magnitudeMax: 3.5,
            constellation: ''
        };
        this._starStudyFilterUIBound = false;
        this._starStudyFilterPollTimer = null;
        
        // Garantir configurações padrão
        if (!this.sftw.settings.nameType) {
            this.sftw.settings.nameType = 'bayer';
        }
        
        console.log('🔧 Visualization inicializado com todas as correções');


        // Cache para centros geométricos das constelações (para posicionar labels e foco do painel)
        this.constellationGeoCenterDirs = new Map();

        // Cache de polígonos clicáveis derivados de boundaries.dat
        // Map<abbr, { ok: boolean, loops: Array<{ n,u,v, poly2, bbox }>, failReason?: string }>
        this.constellationClickPolygons = new Map();
        this.constellationClickPolygonsBuilt = false;

        // =========================
        // ASTERISMOS (modo explorar)
        // =========================
        this.asterismGroup = null;
        this.asterismLines = new Map();      // id -> THREE.Line[]
        this.asterismLabels = new Map();     // id -> THREE.Sprite
        this.asterismsVisible = false;
        this.asterismLabelsVisible = false;

        // =========================
        // ASTERISM GAME (modo conectar pontos)
        // =========================
        this.asterismGameOverlay = null;
        this.asterismGameTargetGroup = null;
        this.asterismGameUserGroup = null;
        this.asterismGamePendingGroup = null;
        this.asterismGameState = {
            targetId: null,
            selectedStarKey: null,
            userSegments: [],
            allowedStarKeys: new Set(),
            starMap: new Map(),
            isSolvedVisual: false,
            lastSubmissionResult: null
        };
    }

    _createDefaultMessierGameState() {
        return {
            active: false,
            finished: false,
            targetId: null,
            manualTargetId: null,
            randomOrder: false,
            autoAdvance: true,
            showErrorHint: true,
            toleranceDeg: 1.2,
            totalErrors: 0,
            errorsById: {},
            discovered: new Set(),
            orderedIds: [],
            lastAngleErrorDeg: null,
            startedAt: 0
        };
    }

    _getCanvasElement() {
        return this.sftw?.sceneManager?.renderer?.domElement || this.sceneManager?.renderer?.domElement || document.getElementById('module-canvas') || null;
    }

    _removePrimaryInteractionBindings(canvas = null) {
        const target = canvas || this._getCanvasElement();
        if (!target) return;
        if (this.boundMouseMove) target.removeEventListener('mousemove', this.boundMouseMove);
        if (this.boundMouseClick) target.removeEventListener('click', this.boundMouseClick);
    }

    _removeMessierInteractionBindings(canvas = null) {
        const target = canvas || this._getCanvasElement();
        if (!target) return;
        if (this._boundMessierClick) target.removeEventListener('click', this._boundMessierClick);
        this._messierClickBound = false;
    }

    // ----------------------------
    // Utilitários de foco (painel)
    // ----------------------------
    // Normaliza siglas e aceita entrada no formato "Nome (Abbr)".
    getPrimaryGameController() {
        return this.sftw?.games?.constellation || this.sftw?.game || null;
    }

    _normalizeConstellationAbbr(abbr) {
        if (!abbr) return '';
        const s = String(abbr).trim();
        if (!s) return '';

        const m = s.match(/\(([^)]+)\)\s*$/);
        const candidate = (m && m[1]) ? m[1].trim() : s;
        const letters = candidate.replace(/[^A-Za-z]/g, '');
        if (!letters) return '';
        if (letters.length <= 3) return letters.charAt(0).toUpperCase() + letters.slice(1);
        return letters;
    }

    _findConstellationByAbbr(abbr) {
        const norm = this._normalizeConstellationAbbr(abbr);
        if (!norm) return null;
        return this.sftw.constellations.find(c => c.abbreviation === norm)
            || this.sftw.constellations.find(c => (c.abbreviation || '').toLowerCase() === norm.toLowerCase())
            || null;
    }

    // Direção unitária para onde mirar.
    // Preferimos um vetor "aimDir" salvo no label (não sofre influência de escala/offset/grupos).
    _getConstellationAimDirection(constellation) {
        if (!constellation) return null;
        const abbr = constellation.abbreviation;

        const label = this.constellationLabels?.get(abbr);
        if (label && label.userData && label.userData.aimDir && label.userData.aimDir.lengthSq && label.userData.aimDir.lengthSq() > 1e-9) {
            return label.userData.aimDir.clone().normalize();
        }
        // Fallback: posição do label (pode estar em espaço de grupo, então é menos confiável)
        if (label && label.position && label.position.lengthSq() > 1e-9) {
            return label.position.clone().normalize();
        }

        // Fallback: centro geométrico já calculado para labels (quando existir)
        const cached = this.constellationGeoCenterDirs?.get(abbr);
        if (cached && cached.lengthSq && cached.lengthSq() > 1e-9) {
            return cached.clone().normalize();
        }

        if (constellation.center && typeof constellation.center.ra === 'number' && typeof constellation.center.dec === 'number') {
            return this.sftw.raDecToVector3(constellation.center.ra, constellation.center.dec, 1).normalize();
        }

        return null;
    }

    // --------------------------------------------
    // Seleção robusta de constelação em casos de overlap
    // --------------------------------------------
    _pickBestConstellationIntersection(intersects) {
        if (!intersects || intersects.length === 0) return null;

        let best = null;
        let bestScore = Infinity;

        for (const hit of intersects) {
            const ud = hit?.object?.userData || {};
            const raw = ud.parent || ud.constellation || ud.constellationRaw || '';
            const c = this._findConstellationByAbbr(raw);
            if (!c) continue;

            // Direção do clique/hover na esfera
            const clickDir = hit.point?.clone?.().normalize?.();
            if (!clickDir) continue;

            const aimDir = this._getConstellationAimDirection(c);
            if (!aimDir) continue;

            const dot = Math.max(-1, Math.min(1, clickDir.dot(aimDir)));
            const angle = Math.acos(dot); // 0..pi

            // Empate: preferir interseção mais próxima do ray (menor distance)
            const dist = (typeof hit.distance === 'number') ? hit.distance : 0;

            // Peso alto no ângulo (melhor constelação), peso baixo na distância (apenas desempate)
            const score = angle * 1000 + dist * 0.001;

            if (score < bestScore) {
                bestScore = score;
                best = { constellation: c, abbr: c.abbreviation, point: hit.point, hit };
            }
        }

        return best;
    }

    // ----------------------------
    // MESSIER: formatação de label
    // ----------------------------
    _formatMessierLabel(mh) {
        if (!mh) return '';
        const id = mh.id || mh.messierId || mh.name || 'Messier';
        const name = mh.name && mh.name !== id ? mh.name : (mh.commonName || mh.object || '');
        const type = mh.type || mh.objectType || '';
        const mag = (mh.mag !== undefined && mh.mag !== null && mh.mag !== '') ? mh.mag : (mh.vmag ?? '');
        const con = mh.constellation || mh.con || mh.abbr || '';

        let s = String(id);
        if (name) s += ` — ${name}`;
        if (type) s += ` (${type})`;
        if (mag !== '' && Number.isFinite(+mag)) s += ` | mag ${(+mag).toFixed(1)}`;
        if (con) s += ` | ${con}`;
        return s;
    }

    // ----------------------------
    // STARS: picking / formatação
    // ----------------------------
    _pickStarUnderPointer(ev) {
        try {
            const sm = this.sftw?.sceneManager;
            const renderer = sm?.renderer;
            const camera = sm?.camera;
            if (!renderer || !camera || !this.raycaster || !this.mouse) return null;
            if (!this.starMeshes || this.starMeshes.length === 0) return null;
            if (!ev || ev.clientX == null || ev.clientY == null) return null;

            const rect = renderer.domElement.getBoundingClientRect();
            const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

            this.mouse.set(x, y);
            this.raycaster.setFromCamera(this.mouse, camera);

            const intersects = this.raycaster.intersectObjects(this.starMeshes, false);
            if (!intersects || intersects.length === 0) return null;

            const best = intersects
                .filter(hit => hit?.object?.userData?.type === 'star')
                .sort((a, b) => {
                    const amag = Number(a?.object?.userData?.magnitude ?? 99);
                    const bmag = Number(b?.object?.userData?.magnitude ?? 99);
                    if (amag !== bmag) return amag - bmag; // mais brilhante primeiro
                    return (a.distance ?? 9999) - (b.distance ?? 9999);
                })[0];

            if (!best) return null;
            return { ...best.object.userData, mesh: best.object, point: best.point || null };
        } catch (err) {
            console.warn('⚠️ _pickStarUnderPointer falhou:', err);
            return null;
        }
    }

    _getDisplayStarName(star) {
        const raw = (star?.name || '').toString().trim();
        if (!raw || /^Star\s+\d+$/i.test(raw)) return 'Sem nome tradicional';
        return raw;
    }

    _formatRAHours(raHours) {
        const h0 = Number(raHours);
        if (!Number.isFinite(h0)) return '—';
        let totalSeconds = Math.round((((h0 % 24) + 24) % 24) * 3600);
        const h = Math.floor(totalSeconds / 3600) % 24;
        totalSeconds -= h * 3600;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds - m * 60;
        return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }

    _formatDecDegrees(decDeg) {
        const d0 = Number(decDeg);
        if (!Number.isFinite(d0)) return '—';
        const sign = d0 >= 0 ? '+' : '−';
        let totalArcSec = Math.round(Math.abs(d0) * 3600);
        const d = Math.floor(totalArcSec / 3600);
        totalArcSec -= d * 3600;
        const m = Math.floor(totalArcSec / 60);
        const s = totalArcSec - m * 60;
        return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′ ${String(s).padStart(2, '0')}″`;
    }

    showStarInfo(star, clickPosition = null) {
        if (!star) return;

        if (this.infoContainer) {
            this.hideConstellationInfo();
        }

        this.currentInfoStar = star.id ?? star.name ?? null;
        this.currentInfoType = 'star';

        const displayName = this._getDisplayStarName(star);
        const constellationAbbr = (star.constellation || '—').toString().trim() || '—';
        const constellationPt = this.sftw?.getConstellationNamePt?.(constellationAbbr) || constellationAbbr;
        const magnitude = Number.isFinite(Number(star.magnitude)) ? Number(star.magnitude).toFixed(2) : '—';
        const raText = this._formatRAHours(star.ra);
        const decText = this._formatDecDegrees(star.dec);
        const spectral = (star.spectralClass || '—').toString();

        this.infoContainer = document.createElement('div');
        this.infoContainer.id = 'constellation-info-container';
        this.infoContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 30, 0.95);
            border: 2px solid #ffd166;
            border-radius: 12px;
            padding: 1.5rem;
            color: white;
            max-width: 340px;
            z-index: 1000;
            font-family: 'Roboto', sans-serif;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            animation: infoSlideIn 0.3s ease;
        `;

        this.infoContainer.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
                <div>
                    <div style="font-family:'Orbitron',sans-serif;font-size:1.1rem;color:#ffd166;margin-bottom:0.25rem;">
                        <i class="fas fa-star"></i> ${displayName}
                    </div>
                    <div style="font-size:0.85rem;color:#c9d1d9;">
                        ${constellationAbbr} — ${constellationPt}
                    </div>
                </div>
                <button id="close-info-btn" style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer;padding:0;line-height:1;">✕</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
                <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:0.75rem;">
                    <div style="font-size:0.75rem;color:#8b949e;margin-bottom:0.25rem;">Magnitude</div>
                    <div style="font-family:'Orbitron',sans-serif;color:#ffd166;">${magnitude}</div>
                </div>
                <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:0.75rem;">
                    <div style="font-size:0.75rem;color:#8b949e;margin-bottom:0.25rem;">Classe espectral</div>
                    <div style="font-family:'Orbitron',sans-serif;color:#ffd166;">${spectral}</div>
                </div>
            </div>

            <div style="background:rgba(79,195,247,0.1);border-radius:8px;padding:1rem;margin-bottom:1rem;">
                <div style="margin-bottom:0.5rem;">
                    <span style="color:#8b949e;">Ascensão reta:</span>
                    <div style="font-family:'Orbitron',sans-serif;color:#4fc3f7;margin-top:0.2rem;">${raText}</div>
                </div>
                <div>
                    <span style="color:#8b949e;">Declinação:</span>
                    <div style="font-family:'Orbitron',sans-serif;color:#4fc3f7;margin-top:0.2rem;">${decText}</div>
                </div>
            </div>

            <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:0.75rem;font-size:0.85rem;color:#8b949e;">
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>Clique em outra estrela para trocar rapidamente.</span>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <i class="fas fa-circle-info"></i>
                    <span>Baseado no catálogo carregado no módulo atual.</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.infoContainer);

        const closeBtn = this.infoContainer.querySelector('#close-info-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideConstellationInfo();
            });
            closeBtn.addEventListener('mouseover', () => { closeBtn.style.color = '#fff'; });
            closeBtn.addEventListener('mouseout', () => { closeBtn.style.color = '#8b949e'; });
        }
    }


    
    // ============================================
    // MÉTODOS BÁSICOS DE VISUALIZAÇÃO
    // ============================================


    // ============================================
    // UTIL: NORMALIZAÇÃO / CENTRO GEOMÉTRICO
    // ============================================
    _normalizeAbbr(abbr) {
        // Normaliza siglas e aceita entrada no formato "Nome (Abbr)".
        if (typeof this._normalizeConstellationAbbr === 'function') {
            const norm = this._normalizeConstellationAbbr(abbr);
            if (norm) return norm.length === 3 ? (norm.charAt(0).toUpperCase() + norm.slice(1).toLowerCase()) : norm;
        }
        if (!abbr) return '';
        const s = String(abbr).trim();
        if (!s) return '';
        // Se vier algo como "Ori" já retorna normalizado
        if (s.length === 3) return s[0].toUpperCase() + s.slice(1).toLowerCase();
        return s;
    }

    _getGeometricCenterDirectionForConstellation(constellation) {
        if (!constellation) return null;
        const abbr = this._normalizeAbbr(constellation.abbreviation);
        if (this.constellationGeoCenterDirs.has(abbr)) return this.constellationGeoCenterDirs.get(abbr);

        const segs = constellation.geodesicSegments || [];
        let sum = new THREE.Vector3(0, 0, 0);
        let count = 0;

        for (const seg of segs) {
            const pts = seg?.points;
            if (!pts || pts.length < 2) continue;
            for (const p of pts) {
                if (!p || !Number.isFinite(p.ra) || !Number.isFinite(p.dec)) continue;
                sum.add(this.sftw.raDecToVector3(p.ra, p.dec, 1));
                count++;
            }
        }

        let dir = null;
        if (count > 0 && sum.lengthSq() > 1e-9) {
            dir = sum.normalize();
        } else if (constellation.center && Number.isFinite(constellation.center.ra) && Number.isFinite(constellation.center.dec)) {
            dir = this.sftw.raDecToVector3(constellation.center.ra, constellation.center.dec, 1).normalize();
        } else {
            dir = new THREE.Vector3(0, 0, 1);
        }

        this.constellationGeoCenterDirs.set(abbr, dir);
        return dir;
    }

    createCelestialSphere() {
        console.log('🌌 Criando esfera celeste...');
        
        const geometry = new THREE.SphereGeometry(
            this.sftw.settings.sphereRadius, 
            64, 64
        );
        
        const material = new THREE.MeshBasicMaterial({
            color: 0x000011,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.1
        });
        
        this.sftw.celestialSphere = new THREE.Mesh(geometry, material);
        this.sftw.sceneManager.scene.add(this.sftw.celestialSphere);
        
        
        // (Messier) cria os marcadores uma única vez (se houver dados globais)
        // A visibilidade final é controlada por toggle/setting.
        this.createMessierMarkers();

        // (Asterismos) cria a camada visual uma única vez.
        this.createAsterismLayer();

console.log('✅ Esfera celeste criada');
        return this.sftw.celestialSphere;
    }
    
    createCoordinateGrid() {
        console.log('📐 Criando grade de coordenadas...');
        this.clearGrid();
        
        if (!this.sftw.settings.showGrid) return;
        
        // Meridianos (a cada 3 horas)
        for (let ra = 0; ra < 24; ra += 3) {
            this.createSimpleMeridian(ra);
        }
        
        // Paralelos (a cada 30 graus)
        for (let dec = -60; dec <= 60; dec += 30) {
            this.createSimpleParallel(dec);
        }
        
        // Equador
        this.createEquator();
        
        console.log('✅ Grade criada');
    
        // Linhas extras (só no planetário)
        this.createEclipticLine();
        this.createGalacticEquatorLine();
    }
    
    createSimpleMeridian(raHours) {
        const points = [];
        const steps = 12;
        
        for (let i = 0; i <= steps; i++) {
            const dec = -85 + (i * 170 / steps);
            const point = this.sftw.raDecToVector3(
                raHours, 
                dec, 
                this.sftw.settings.sphereRadius
            );
            points.push(point);
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: this.sftw.settings.gridColor, 
            linewidth: 0.5,
            transparent: true,
            opacity: 0.3
        });
        
        const line = new THREE.Line(geometry, material);
        this.sftw.sceneManager.scene.add(line);
        this.gridLines.push(line);
        return line;
    }
    
    createSimpleParallel(decDegrees) {
        const points = [];
        const steps = 36;
        
        for (let i = 0; i <= steps; i++) {
            const ra = (i * 24 / steps);
            const point = this.sftw.raDecToVector3(
                ra, 
                decDegrees, 
                this.sftw.settings.sphereRadius
            );
            points.push(point);
        }
        
        points.push(points[0].clone());
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: this.sftw.settings.gridColor, 
            linewidth: 0.5,
            transparent: true,
            opacity: 0.3
        });
        
        const line = new THREE.Line(geometry, material);
        this.sftw.sceneManager.scene.add(line);
        this.gridLines.push(line);
        return line;
    }
    
    createEquator() {
        const points = [];
        const steps = 48;
        
        for (let i = 0; i <= steps; i++) {
            const ra = (i * 24 / steps);
            const point = this.sftw.raDecToVector3(
                ra, 
                0, 
                this.sftw.settings.sphereRadius
            );
            points.push(point);
        }
        
        points.push(points[0].clone());
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: this.sftw.settings.equatorColor, 
            linewidth: 1,
            transparent: true,
            opacity: 0.5
        });
        
        const line = new THREE.Line(geometry, material);
        this.sftw.sceneManager.scene.add(line);
        this.gridLines.push(line);
        return line;
    }
    
    // ============================================
    // LIMITES DAS CONSTELAÇÕES - COM CORREÇÕES
    // ============================================
    
    createConstellationBoundaries() {
        console.log('🔺 Criando limites das constelações...');
        
        this.clearGeodesicBoundaries();
        this.clearConstellationAreas();
        this.clearLabels();
        
        // Criar para cada constelação
        this.sftw.constellations.forEach(constellation => {
            this.createCompletePolylinesForConstellation(constellation);
            this.createPreciseConstellationArea(constellation);
            this.createOptimizedConstellationLabel(constellation);
        });
        
        // ✅ Novo: construir polígonos clicáveis a partir dos segmentos (boundaries.dat)
// Isso vira a fonte de verdade para hover/clique, com fallback por constelação.
this.buildConstellationClickPolygons();

        // ✅ Novo: gerar meshes de preenchimento (fundo azul) a partir dos mesmos polígonos
        // (só será exibido no modo jogo para constelações descobertas, se opção estiver ativa)
        this.buildConstellationFillMeshesFromClickPolygons();

// Configurar interação
        this.setupInteraction();
        
        // VERIFICAÇÃO FINAL
        this.checkVisualizationStatus();
        
        console.log(`✅ ${this.sftw.constellations.length} constelações processadas`);
    }
    
    createCompletePolylinesForConstellation(constellation) {
        const lines = [];
        const abbrNorm = this._normalizeAbbr(constellation?.abbreviation);
        
        if (!constellation.geodesicSegments) return;
        
        constellation.geodesicSegments.forEach((segment, segmentIndex) => {
            if (!segment.points || segment.points.length < 2) return;
            
            const points = [];
            segment.points.forEach(point => {
                const vector = this.sftw.raDecToVector3(
                    point.ra,
                    point.dec,
                    this.sftw.settings.sphereRadius
                );
                points.push(vector);
            });
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0xff0000,
                linewidth: 1,
                transparent: true,
                opacity: 0.6
            });
            
            const line = new THREE.Line(geometry, material);
            line.userData = {
                type: 'boundary-line',
                constellation: abbrNorm,
                constellationRaw: constellation.abbreviation,
                segmentIndex: segmentIndex
            };
            
            line.visible = this.sftw.settings.showBoundaries;
            this.sftw.sceneManager.scene.add(line);
            lines.push(line);
        });
        
        this.geodesicLines.set(abbrNorm, lines);
    }
    
    createPreciseConstellationArea(constellation) {
        // Área clicável invisível robusta.
        // - Constelações "normais": 1 esfera no centro (como antes)
        // - Constelações longas/irregulares (ex: Hydra): várias esferas pequenas ao longo do traçado

        if (!constellation?.geodesicSegments || constellation.geodesicSegments.length === 0) {
            return null;
        }

        // Coletar todos os pontos (RA/Dec)
        const allPoints = [];
        constellation.geodesicSegments.forEach(segment => {
            if (segment?.points?.length) allPoints.push(...segment.points);
        });

        if (allPoints.length < 3) return null;

        // Converter para vetores 3D na superfície
        const vertices = [];
        for (const p of allPoints) {
            const v = this.sftw.raDecToVector3(p.ra, p.dec, this.sftw.settings.sphereRadius);
            vertices.push(v);
        }

        // Centro (média vetorial simples em 3D)
        const center = new THREE.Vector3();
        vertices.forEach(v => center.add(v));
        center.divideScalar(vertices.length);

        // Extensão (maior distância ao centro)
        let maxDistance = 0;
        for (const v of vertices) {
            const d = v.distanceTo(center);
            if (d > maxDistance) maxDistance = d;
        }

        // Heurística de "constelação longa":
        // Hydra e afins tendem a ter maxDistance muito grande comparado ao raio da esfera.
        const sphereR = this.sftw.settings.sphereRadius;
        const isLong = (maxDistance > sphereR * 0.55) || (allPoints.length > 350);

        // Material invisível para raycast
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.0,
            visible: false,
            depthWrite: false
        });

        const baseUserData = {
            type: 'constellation-area',
            constellation: constellation.abbreviation,
            name: constellation.name,
            clickable: true,
            selectable: true,
            neighbors: constellation.neighbors || [],
            center: constellation.center,
            boundingBox: constellation.boundingBox,
            isVisible: false,
            darkened: false
        };

        // Caso normal: 1 esfera
        if (!isLong) {
            const radius = Math.max(10, maxDistance * 0.85);
            const geometry = new THREE.SphereGeometry(radius, 16, 16);

            const area = new THREE.Mesh(geometry, material);
            area.position.copy(center);
            area.userData = { ...baseUserData, mode: 'single', radius };

            this.sftw.sceneManager.scene.add(area);
            this.constellationAreas.set(constellation.abbreviation, area);
            return area;
        }

        // Caso longo: múltiplas esferas ao longo do traçado
        // Estratégia: amostrar pontos a cada "step" e criar esferas pequenas com raio fixo adaptado.
        const group = new THREE.Group();
        group.name = `area_${constellation.abbreviation}`;
        group.userData = { ...baseUserData, mode: 'multi', childCount: 0 };

        // Determinar raio das esferas pequenas:
        // - pequeno o suficiente para não cobrir o céu todo
        // - grande o suficiente para ser clicável
        const childRadius = Math.max(18, Math.min(55, sphereR * 0.035));
        const childGeometry = new THREE.SphereGeometry(childRadius, 12, 12);

        // Amostragem: espalhar ~80 a 160 esferas dependendo do tamanho
        const targetCount = Math.max(80, Math.min(160, Math.floor(allPoints.length / 6)));
        const step = Math.max(1, Math.floor(allPoints.length / targetCount));

        // Para reduzir overlap extremo, só adiciona esfera se estiver "distante" da última
        const minSpacing = childRadius * 0.85;
        let lastPos = null;

        for (let i = 0; i < vertices.length; i += step) {
            const pos = vertices[i];

            if (lastPos && pos.distanceTo(lastPos) < minSpacing) continue;

            const child = new THREE.Mesh(childGeometry, material);
            child.position.copy(pos);
            // Importante: o raycast retorna o mesh filho; precisamos subir pro group
            child.userData = { ...baseUserData, mode: 'multi-child', parent: constellation.abbreviation };

            group.add(child);
            lastPos = pos;
        }

        group.userData.childCount = group.children.length;

        // Posicionar o group no mundo (children já estão em coords absolutas; então deixamos group em (0,0,0))
        this.sftw.sceneManager.scene.add(group);
        this.constellationAreas.set(constellation.abbreviation, group);

        return group;
    }
    
    // ============================================
    // SISTEMA DE NOMES - CORREÇÃO PRINCIPAL AQUI!
    // ============================================
    
    createOptimizedConstellationLabel(constellation) {
        console.log(`🏷️ Criando label para ${constellation.abbreviation}...`);
        
        // GARANTIR que o tipo de nome existe
        const nameType = this.sftw.settings.nameType || 'bayer';
        
        // Criar o label
        const sprite = this.createLabelWithType(constellation, nameType);
        
        if (sprite) {
            // CRÍTICO: Garantir que o label seja visível
            sprite.visible = this.sftw.settings.showLabels;
            
            // Debug info
            console.log(`   ✅ ${constellation.abbreviation}: Label criado`);
            console.log(`      Posição: (${sprite.position.x.toFixed(0)}, ${sprite.position.y.toFixed(0)}, ${sprite.position.z.toFixed(0)})`);
            console.log(`      Visível: ${sprite.visible}, Tipo: ${nameType}`);
        } else {
            console.error(`❌ Falha ao criar label para ${constellation.abbreviation}`);
        }
        
        return sprite;
    }
    
    createLabelWithType(constellation, nameType = 'bayer') {
        // Calcular posição do label.
        // Preferimos o centro geométrico (média vetorial dos pontos dos segmentos), que é mais estável
        // do que usar RA/Dec médios (especialmente perto de RA=0h e em constelações alongadas).
        const geoDir = this._getGeometricCenterDirectionForConstellation(constellation);
        const centerPoint = geoDir.clone().multiplyScalar(this.sftw.settings.sphereRadius - 5);
        
        // Criar canvas para o texto
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Obter texto baseado no tipo
        const textInfo = this.getLabelText(constellation, nameType);
        const text = textInfo.text;
        const fontSize = textInfo.fontSize;
        const lineHeight = textInfo.lineHeight;
        
        // Medir texto
        const lines = text.split('\n');
        let maxWidth = 0;
        let totalHeight = 0;
        
        ctx.font = `bold ${fontSize}px Arial`;
        
        lines.forEach(line => {
            const metrics = ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
            totalHeight += fontSize * lineHeight;
        });
        
        // Tamanho do canvas com padding
        const padding = 10;
        canvas.width = maxWidth + padding * 2;
        canvas.height = totalHeight + padding * 2;
        
        // Estilo Stellarium-like: sem caixa, só texto com contorno escuro.
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Texto

        ctx.font = `bold ${fontSize}px Arial`;
        const gridHex = (this.sftw?.settings?.gridColor ?? 0x66ccff);
        const gridCss = `#${Number(gridHex).toString(16).padStart(6,'0')}`;
        ctx.lineWidth = Math.max(3, Math.floor(fontSize * 0.22));
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.fillStyle = gridCss;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Desenhar linhas
        lines.forEach((line, index) => {
            const y = padding + (index * fontSize * lineHeight);
                        ctx.strokeText(line, canvas.width / 2, y);
            ctx.fillText(line, canvas.width / 2, y);
        });
        
        // Criar textura e sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            opacity: 0.9
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(centerPoint);
        
        // Escala proporcional ao tamanho do canvas
        const scaleFactor = 0.32; // maior para ficar legível (mobile e desktop)
        sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1);
        
        // VISIBILIDADE: Usar a configuração do sistema
        sprite.visible = this.sftw.settings.showLabels;
        
        // Armazenar dados
        sprite.userData = {
            type: 'constellation-label',
            constellation: constellation.abbreviation,
            name: constellation.name,
            nameType: nameType,
            canvas: canvas,
            texture: texture,
            originalScale: sprite.scale.clone(),
            // Direção unitária "real" usada para posicionar este label.
            // Usada pelo foco do painel para mirar exatamente no ponto do label.
            aimDir: geoDir.clone().normalize()
        };
        
        // Adicionar à cena
        this.sftw.sceneManager.scene.add(sprite);
        this.constellationLabels.set(constellation.abbreviation, sprite);
        
        return sprite;
    }
    
    getLabelText(constellation, nameType) {
        switch(nameType) {
            case 'bayer':
                return {
                    text: constellation.abbreviation,
                    fontSize: 34,
                    lineHeight: 1.0
                };
                
            case 'full':
                const shortName = this.getShortenedName(constellation.name);
                return {
                    text: shortName,
                    fontSize: 26,
                    lineHeight: 1.0
                };
                
            case 'both':
                const shortened = this.getShortenedName(constellation.name);
                return {
                    text: `${constellation.abbreviation}\n${shortened}`,
                    fontSize: 22,
                    lineHeight: 1.2
                };
                

            case 'pt': {
                const shortName = this.getShortenedName(constellation.name);
                return { text: shortName, fontSize: 26, lineHeight: 1.0 };
            }

            case 'latin': {
                const latin = (typeof this.sftw.getConstellationLatinName === 'function')
                    ? this.sftw.getConstellationLatinName(constellation.abbreviation)
                    : constellation.name;
                const shortLatin = this.getShortenedName(latin);
                return { text: shortLatin, fontSize: 26, lineHeight: 1.0 };
            }

            default:
                return {
                    text: constellation.abbreviation,
                    fontSize: 34,
                    lineHeight: 1.0
                };
        }
    }
    
    getShortenedName(fullName) {
        const maxLength = 12;
        if (fullName.length <= maxLength) return fullName;
        
        let cutIndex = maxLength - 3;
        for (let i = cutIndex; i > 0; i--) {
            if (fullName[i] === ' ') {
                cutIndex = i;
                break;
            }
        }
        
        return fullName.substring(0, cutIndex) + '...';
    }
    
    // ============================================
    // NOVO: VERIFICAÇÃO DE STATUS
    // ============================================
    
    checkVisualizationStatus() {
        console.log('🔍 VERIFICAÇÃO DE VISUALIZAÇÃO:');
        console.log(`   • Labels criados: ${this.constellationLabels.size}`);
        console.log(`   • Config showLabels: ${this.sftw.settings.showLabels}`);
        console.log(`   • Config nameType: ${this.sftw.settings.nameType}`);
        console.log(`   • Segmentos originais: ${this.originalLines.length}`);
        
        // Verificar algumas constelações específicas
        const testConstellations = ['Ori', 'UMa', 'CMa', 'Vir'];
        testConstellations.forEach(abbr => {
            const label = this.constellationLabels.get(abbr);
            if (label) {
                console.log(`   • ${abbr}: ${label.visible ? 'VISÍVEL' : 'INVISÍVEL'}`);
            } else {
                console.log(`   • ${abbr}: NÃO ENCONTRADO`);
            }
        });
        
        // Verificar visibilidade dos segmentos
        const visibleSegments = this.originalLines.filter(l => l.visible).length;
        console.log(`   • Segmentos visíveis: ${visibleSegments}/${this.originalLines.length}`);
    }
    
    // ============================================
    // ESTRELAS
    // ============================================
    
    createStars() {
        console.log('✨ Criando estrelas...');
        this.clearStars();
        
        if (!this.sftw.starCatalog?.stars?.length) {
            console.warn('Nenhuma estrela disponível');
            return;
        }
        
        this.sftw.starCatalog.stars.forEach(star => {
            const position = this.sftw.raDecToVector3(
                star.ra,
                star.dec,
                this.sftw.settings.sphereRadius - 1
            );
            
            const geometry = new THREE.SphereGeometry(star.size, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: star.color,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const starMesh = new THREE.Mesh(geometry, material);
            starMesh.position.copy(position);
            starMesh.userData = { type: 'star', ...star };
            
            this.sftw.sceneManager.scene.add(starMesh);
            this.starMeshes.push(starMesh);
        });
        
        console.log(`✅ ${this.starMeshes.length} estrelas criadas`);
    }
    

    // ============================================
    // ESTUDO DE ESTRELAS - FILTRO VISUAL
    // ============================================

    getDefaultStarStudyFilter() {
        return {
            enabled: false,
            namedOnly: true,
            magnitudeMax: 3.5,
            constellation: ''
        };
    }

    setStarStudyFilter(filter = {}) {
        const base = this.getDefaultStarStudyFilter();
        const next = { ...base, ...(this.starStudyFilter || {}), ...(filter || {}) };

        next.enabled = !!next.enabled;
        next.namedOnly = !!next.namedOnly;

        const mag = Number(next.magnitudeMax);
        next.magnitudeMax = Number.isFinite(mag) ? mag : base.magnitudeMax;

        next.constellation = (next.constellation || '').toString().trim();
        this.starStudyFilter = next;

        this.applyStarStudyFilter();
        return { ...this.starStudyFilter };
    }

    clearStarStudyFilter() {
        this.starStudyFilter = this.getDefaultStarStudyFilter();
        this.applyStarStudyFilter();
    }

    getStarStudyFilter() {
        return { ...(this.starStudyFilter || this.getDefaultStarStudyFilter()) };
    }

    applyStarStudyFilter() {
        const filter = this.starStudyFilter || this.getDefaultStarStudyFilter();
        const showStars = !!this.sftw?.settings?.showStars;

        this.starMeshes.forEach((star) => {
            if (!star) return;
            const matches = this._starMatchesStudyFilter(star.userData || {});
            star.visible = showStars && matches;
        });

        return true;
    }

    _starMatchesStudyFilter(starData) {
        if (!starData) return false;

        const filter = this.starStudyFilter || this.getDefaultStarStudyFilter();
        if (!filter.enabled) return true;

        if (filter.namedOnly && !this._starHasUsefulName(starData)) return false;

        const mag = Number(starData.magnitude);
        if (Number.isFinite(filter.magnitudeMax) && Number.isFinite(mag) && mag > filter.magnitudeMax) return false;

        const constFilter = (filter.constellation || '').trim().toLowerCase();
        if (constFilter) {
            const abbr = (starData.constellation || '').toString().trim().toLowerCase();
            const pt = (this.sftw?.getConstellationNamePt?.(starData.constellation || '') || '').toString().trim().toLowerCase();
            if (abbr !== constFilter && pt !== constFilter) return false;
        }

        return true;
    }

    _starHasUsefulName(starData) {
        const name = (starData?.name || '').toString().trim();
        if (!name) return false;
        if (/^Star\s+\d+$/i.test(name)) return false;
        if (name.length <= 2) return false;
        return true;
    }

    _readStarStudyFilterFromDOM() {
        const namedOnlyEl = document.getElementById('star-filter-named-only');
        const magEl = document.getElementById('star-filter-magnitude-max');
        const constEl = document.getElementById('star-filter-constellation');

        const magnitudeMax = Number(magEl?.value);
        return {
            enabled: true,
            namedOnly: !!namedOnlyEl?.checked,
            magnitudeMax: Number.isFinite(magnitudeMax) ? magnitudeMax : 3.5,
            constellation: (constEl?.value || '').toString().trim()
        };
    }

    bindStarStudyFilterUI() {
        if (this._starStudyFilterUIBound) return true;

        const btn = document.getElementById('btn-star-refresh-pool');
        const namedOnlyEl = document.getElementById('star-filter-named-only');
        const magEl = document.getElementById('star-filter-magnitude-max');
        const constEl = document.getElementById('star-filter-constellation');

        if (!btn || !namedOnlyEl || !magEl || !constEl) return false;

        const applyFromUI = () => {
            const filter = this._readStarStudyFilterFromDOM();
            this.setStarStudyFilter(filter);
        };

        btn.addEventListener('click', applyFromUI);
        namedOnlyEl.addEventListener('change', applyFromUI);
        magEl.addEventListener('change', applyFromUI);
        constEl.addEventListener('change', applyFromUI);

        this._starStudyFilterUIBound = true;
        applyFromUI();

        console.log('⭐ Filtro visual de estrelas conectado à aba Estrelas.');
        return true;
    }

    startStarStudyFilterBridge() {
        if (this._starStudyFilterPollTimer) return;

        const tryBind = () => {
            if (this.bindStarStudyFilterUI()) {
                clearInterval(this._starStudyFilterPollTimer);
                this._starStudyFilterPollTimer = null;
            }
        };

        tryBind();
        if (!this._starStudyFilterUIBound) {
            this._starStudyFilterPollTimer = setInterval(tryBind, 500);
        }
    }

    // ============================================
    // SISTEMA DE INTERAÇÃO - CORRIGIDO
    // ============================================

    // ============================================
    // ÁREA CLICÁVEL PRECISA (boundaries → loops → polígonos)
    // ============================================

    // Interseção do raio da câmera com a esfera celeste (centro na origem)
    _rayToSphereIntersection(ray, radius) {
        // Retorna ponto de interseção mais próximo (na frente da câmera) ou null.
        // ray: THREE.Ray (direção unitária)
        const o = ray.origin;
        const d = ray.direction;

        // Resolver |o + t d|^2 = r^2  =>  t^2 + 2(o·d)t + (o·o - r^2)=0
        const b = 2 * o.dot(d);
        const c = o.dot(o) - radius * radius;
        const disc = b * b - 4 * c; // a=1

        if (disc < 0) return null;

        const s = Math.sqrt(disc);
        const t1 = (-b - s) / 2;
        const t2 = (-b + s) / 2;

        // menor t positivo
        let t = null;
        if (t1 > 1e-6) t = t1;
        else if (t2 > 1e-6) t = t2;
        if (t == null) return null;

        return o.clone().addScaledVector(d, t);
    }

    _getClickDirFromCurrentRay() {
        const ray = this.raycaster.ray;
        const p = this._rayToSphereIntersection(ray, this.sftw.settings.sphereRadius);
        if (!p) return null;
        return p.clone().normalize();
    }

    _buildOrthonormalBasisFromNormal(n) {
        const nn = n.clone().normalize();
        const z = new THREE.Vector3(0, 0, 1);
        const x = new THREE.Vector3(1, 0, 0);

        let u = new THREE.Vector3().crossVectors(z, nn);
        if (u.lengthSq() < 1e-10) u.crossVectors(x, nn);
        u.normalize();

        const v = new THREE.Vector3().crossVectors(nn, u).normalize();
        return { n: nn, u, v };
    }

    // Projeção gnomônica no plano tangente (robusta pra polígonos na esfera)
    _gnomonicProject(p, basis) {
        const denom = p.dot(basis.n);
        if (denom <= 1e-6) return null; // hemisfério errado pro plano
        const x = p.dot(basis.u) / denom;
        const y = p.dot(basis.v) / denom;
        return { x, y };
    }

    _computeBBox2(poly2) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of poly2) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return { minX, minY, maxX, maxY };
    }

    _pointInPolygon2(point, polygon) {
        // Regra even-odd (ray casting)
        const x = point.x, y = point.y;
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);

            if (intersect) inside = !inside;
        }
        return inside;
    }

    _vec3AngleClose(a, b, cosTol) {
        return a.dot(b) >= cosTol;
    }

    _segmentsToUnitPolylines(constellation) {
        const segs = constellation?.geodesicSegments || [];
        const polylines = [];

        for (const seg of segs) {
            const pts = seg?.points;
            if (!pts || pts.length < 2) continue;

            const line = [];
            for (const p of pts) {
                if (!p || !Number.isFinite(p.ra) || !Number.isFinite(p.dec)) continue;
                const v = this.sftw.raDecToVector3(p.ra, p.dec, 1).normalize();
                line.push(v);
            }

            if (line.length >= 2) polylines.push(line);
        }

        return polylines;
    }

    // Costura endpoints por tolerância angular e tenta fechar loops
    _stitchPolylinesIntoLoops(polylines, tolRad) {
        const cosTol = Math.cos(tolRad);

        const unused = polylines.map((pts) => ({ pts }));
        const loops = [];
        const openChains = [];

        const take = (k) => unused.splice(k, 1)[0];

        while (unused.length) {
            const seed = take(0);
            let chain = seed.pts.slice();

            let changed = true;
            while (changed && unused.length) {
                changed = false;

                const chainStart = chain[0];
                const chainEnd = chain[chain.length - 1];

                for (let i = 0; i < unused.length; i++) {
                    const cand = unused[i].pts;
                    const candStart = cand[0];
                    const candEnd = cand[cand.length - 1];

                    // anexar no final
                    if (this._vec3AngleClose(chainEnd, candStart, cosTol)) {
                        chain = chain.concat(cand.slice(1));
                        take(i);
                        changed = true;
                        break;
                    }
                    if (this._vec3AngleClose(chainEnd, candEnd, cosTol)) {
                        const rev = cand.slice().reverse();
                        chain = chain.concat(rev.slice(1));
                        take(i);
                        changed = true;
                        break;
                    }

                    // anexar no começo
                    if (this._vec3AngleClose(chainStart, candEnd, cosTol)) {
                        chain = cand.slice(0, cand.length - 1).concat(chain);
                        take(i);
                        changed = true;
                        break;
                    }
                    if (this._vec3AngleClose(chainStart, candStart, cosTol)) {
                        const rev = cand.slice().reverse();
                        chain = rev.slice(0, rev.length - 1).concat(chain);
                        take(i);
                        changed = true;
                        break;
                    }
                }
            }

            // fechou?
            if (chain.length >= 4 && this._vec3AngleClose(chain[0], chain[chain.length - 1], cosTol)) {
                chain[chain.length - 1] = chain[0].clone(); // garante fechamento
                loops.push(chain);
            } else {
                openChains.push(chain);
            }
        }

        return { loops, openChains };
    }

    _dedupeLoop(loopVec3, tolRad) {
        const cosTol = Math.cos(tolRad);
        const out = [];
        for (const p of loopVec3) {
            if (out.length === 0) {
                out.push(p);
                continue;
            }
            const last = out[out.length - 1];
            if (last.dot(p) >= cosTol) continue; // muito perto
            out.push(p);
        }
        // garante fechamento
        if (out.length >= 3) {
            const first = out[0];
            const last = out[out.length - 1];
            if (first.dot(last) < cosTol) out.push(first.clone());
            else out[out.length - 1] = first.clone();
        }
        return out;
    }

    _chooseBestNormalForLoop(loopVec3, preferredNormal) {
        // tenta preferredNormal, depois média dos pontos, depois invertidos
        const candidates = [];
        if (preferredNormal && preferredNormal.lengthSq && preferredNormal.lengthSq() > 1e-9) {
            candidates.push(preferredNormal.clone().normalize());
        }

        // média vetorial dos pontos
        let sum = new THREE.Vector3(0, 0, 0);
        for (const p of loopVec3) sum.add(p);
        if (sum.lengthSq() > 1e-9) candidates.push(sum.normalize());

        // versões invertidas
        const baseCount = candidates.length;
        for (let i = 0; i < baseCount; i++) candidates.push(candidates[i].clone().multiplyScalar(-1));

        // escolhe a que maximiza quantidade de pontos com denom>0
        let best = null;
        let bestScore = -1;

        for (const n of candidates) {
            let score = 0;
            for (const p of loopVec3) {
                if (p.dot(n) > 1e-6) score++;
            }
            if (score > bestScore) {
                bestScore = score;
                best = n;
            }
        }

        return best;
    }

    _projectLoopTo2D(loopVec3, preferredNormal) {
        const n = this._chooseBestNormalForLoop(loopVec3, preferredNormal);
        if (!n) return null;

        const basis = this._buildOrthonormalBasisFromNormal(n);

        const poly2 = [];
        for (const p of loopVec3) {
            const q = this._gnomonicProject(p, basis);
            if (!q) return null;
            poly2.push(q);
        }

        // precisa de ao menos 4 pontos (fechado)
        if (poly2.length < 4) return null;

        const bbox = this._computeBBox2(poly2);
        return { ...basis, poly2, bbox };
    }

    buildConstellationClickPolygons() {
        console.log('🧩 Construindo polígonos clicáveis (boundaries → loops) ...');

        this.constellationClickPolygons.clear();

        // tolerâncias (ajuste fino se precisar)
        const stitchTolRad = 4e-4; // ~0.023° (~1.4 arcmin) — bom pra endpoints do boundaries.dat
        const dedupeTolRad = 1e-5;

        let okCount = 0;
        let failCount = 0;

        for (const c of this.sftw.constellations) {
            const abbr = this._normalizeAbbr(c?.abbreviation);
            if (!abbr) continue;

            try {
                const polylines = this._segmentsToUnitPolylines(c);
                if (!polylines.length) {
                    this.constellationClickPolygons.set(abbr, { ok: false, loops: [], failReason: 'no-segments' });
                    failCount++;
                    continue;
                }

                const { loops } = this._stitchPolylinesIntoLoops(polylines, stitchTolRad);

                if (!loops.length) {
                    this.constellationClickPolygons.set(abbr, { ok: false, loops: [], failReason: 'no-closed-loops' });
                    failCount++;
                    continue;
                }

                const preferredNormal = this._getConstellationAimDirection(c) || this._getGeometricCenterDirectionForConstellation(c);
                const projectedLoops = [];

                for (const loop of loops) {
                    const cleanLoop = this._dedupeLoop(loop, dedupeTolRad);
                    const proj = this._projectLoopTo2D(cleanLoop, preferredNormal);
                    if (!proj) continue;
                    projectedLoops.push(proj);
                }

                if (!projectedLoops.length) {
                    this.constellationClickPolygons.set(abbr, { ok: false, loops: [], failReason: 'projection-failed' });
                    failCount++;
                    continue;
                }

                this.constellationClickPolygons.set(abbr, { ok: true, loops: projectedLoops });
                okCount++;
            } catch (err) {
                console.warn(`⚠️ Falha ao construir polígonos para ${abbr}:`, err);
                this.constellationClickPolygons.set(abbr, { ok: false, loops: [], failReason: 'exception' });
                failCount++;
            }
        }

        this.constellationClickPolygonsBuilt = true;

        console.log(`✅ Polígonos clicáveis prontos: ok=${okCount}, fallback=${failCount}`);
    }

    pickConstellationByDirection(clickDir) {
        if (!clickDir) return null;
        if (!this.constellationClickPolygonsBuilt) return null;

        const candidates = [];

        for (const [abbr, data] of this.constellationClickPolygons.entries()) {
            if (!data || !data.ok || !data.loops || data.loops.length === 0) continue;

            // se estiver dentro de qualquer loop, é candidato
            let inside = false;

            for (const loop of data.loops) {
                const p2 = this._gnomonicProject(clickDir, loop);
                if (!p2) continue;

                const b = loop.bbox;
                if (p2.x < b.minX || p2.x > b.maxX || p2.y < b.minY || p2.y > b.maxY) continue;

                if (this._pointInPolygon2(p2, loop.poly2)) {
                    inside = true;
                    break;
                }
            }

            if (inside) {
                // tie-break: menor ângulo até aimDir
                const c = this._findConstellationByAbbr(abbr);
                const aim = this._getConstellationAimDirection(c) || clickDir;
                const dot = Math.max(-1, Math.min(1, clickDir.dot(aim)));
                const angle = Math.acos(dot);
                candidates.push({ abbr, angle });
            }
        }

        if (!candidates.length) return null;

        candidates.sort((a, b) => a.angle - b.angle);
        return candidates[0].abbr;
    }

    setupInteraction() {
        console.log('🖱️ Configurando interação...');

        const canvas = this._getCanvasElement();
        if (!canvas) {
            console.warn('⚠️ setupInteraction: canvas não encontrado');
            return;
        }

        // Limpar apenas os handlers principais deste fluxo.
        // O handler específico do Messier é gerenciado separadamente
        // por initMessierMarkers / cleanup.
        this._removePrimaryInteractionBindings(canvas);

        // Criar métodos bound
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseClick = this.onMouseClick.bind(this);

        canvas.addEventListener('mousemove', this.boundMouseMove);
        canvas.addEventListener('click', this.boundMouseClick);

        canvas.style.cursor = 'default';

        console.log('✅ Interação configurada');
    }
    
    
    onMouseMove(event) {
        const canvas = this.sftw.sceneManager.renderer.domElement;
        const rect = canvas.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sftw.sceneManager.camera);

        // ✅ Prioridade de hover fora do jogo:
        // 1) asterismos
        // 2) Messier
        // 3) estrelas
        // 4) constelações
        const messierActive = (typeof this.sftw?.isMessierGameActive === 'function')
            ? !!this.sftw.isMessierGameActive()
            : !!this.messierGame?.active;
        const asterismGameActive = (typeof this.sftw?.getAsterismGameState === 'function')
            ? !!this.sftw.getAsterismGameState()?.active
            : false;

        if (!this.gameMode && asterismGameActive) {
            this.syncAsterismGameVisuals();
            const starHit = this._pickStarUnderPointer?.(event);
            if (starHit) {
                canvas.style.cursor = 'pointer';
                return;
            }
        }

        if (!this.gameMode && !messierActive && !asterismGameActive) {
            const asterismHit = this._pickAsterismUnderPointer?.(event);
            if (asterismHit) {
                canvas.style.cursor = 'pointer';
                return;
            }

            const mh = this._pickMessierUnderPointer?.(event);
            if (mh && mh.id) {
                this._lastHoverMessierId = mh.id;
                canvas.style.cursor = 'pointer';
                return;
            } else {
                this._lastHoverMessierId = null;
            }

            const starHit = this._pickStarUnderPointer?.(event);
            if (starHit) {
                canvas.style.cursor = 'pointer';
                return;
            }
        } else {
            this._lastHoverMessierId = null;
        }

// Remover highlight anterior
        if (this.highlightedConstellation) {
            this.unhighlightConstellation(this.highlightedConstellation);
            this.highlightedConstellation = null;
        }

        // ✅ Novo: pick por polígonos derivados dos boundaries
        const clickDir = this._getClickDirFromCurrentRay();
        let pickedAbbr = this.pickConstellationByDirection(clickDir);

        // Fallback (somente se não encontrou via polígonos)
        if (!pickedAbbr) {
            const intersects = this.raycaster.intersectObjects(
                Array.from(this.constellationAreas.values()),
                true
            );
            const best = this._pickBestConstellationIntersection(intersects);
            if (best) pickedAbbr = best.abbr;
        }

        if (pickedAbbr) {
            this.highlightConstellation(pickedAbbr);
            this.highlightedConstellation = pickedAbbr;
            canvas.style.cursor = 'crosshair';
        } else {
            canvas.style.cursor = 'default';
        }
    }

    onMouseClick(event) {
        const now = Date.now();
        const timeSinceLastClick = now - this.lastClickTime;

        // Prevenir clique duplo rápido
        if (timeSinceLastClick < this.clickDebounceTime) {
            return;
        }

        this.lastClickTime = now;

        const canvas = this.sftw.sceneManager.renderer.domElement;
        const rect = canvas.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sftw.sceneManager.camera);

        const asterismGameActive = (typeof this.sftw?.getAsterismGameState === 'function')
            ? !!this.sftw.getAsterismGameState()?.active
            : false;

        if (!this.gameMode && asterismGameActive) {
            this.syncAsterismGameVisuals();
            if (this._processAsterismGameClick(event)) return;
        }

        // ✅ Sessão do jogo Messier tem prioridade fora do jogo das constelações
        const messierActive = (typeof this.sftw?.isMessierGameActive === 'function')
            ? !!this.sftw.isMessierGameActive()
            : !!this.messierGame?.active;
        if (!this.gameMode && messierActive) {
            if (this._processMessierGameClick(event)) return;
        }

                // ✅ Clique em Asterismo: mostra info e consome o clique
        if (!this.gameMode) {
            const clickedAsterism = this._pickAsterismUnderPointer?.(event);
            if (clickedAsterism) {
                const asterismKey = String(clickedAsterism.id || '');
                if (this.currentInfoType === 'asterism' && this.currentInfoStar === asterismKey && this.infoContainer) {
                    this.hideConstellationInfo();
                    return;
                }
                this.currentInfoStar = asterismKey;
                this.showAsterismInfo(clickedAsterism, clickedAsterism.point || null);
                console.log('✨ Asterism click:', clickedAsterism);
                return;
            }

            // ✅ Clique em Messier: mostra info e consome o clique (não spamma)
            // (no modo jogo, Messier não deve interferir no treino de constelações)
            const clickedMh = this._pickMessierUnderPointer?.(event);
            if (clickedMh && clickedMh.id) {
                this.selectedMessier = clickedMh.id;

                const label = this._formatMessierLabel(clickedMh);
                const showMsg =
                    (this.sftw && this.sftw.ui && typeof this.sftw.ui.showMessage === 'function')
                        ? this.sftw.ui.showMessage.bind(this.sftw.ui)
                        : (this.sftw && typeof this.sftw.showMessage === 'function')
                            ? this.sftw.showMessage.bind(this.sftw)
                            : null;

                if (showMsg) showMsg(label, 'info');
                console.log('🟠 Messier click:', clickedMh);
                return;
            }

            const clickedStar = this._pickStarUnderPointer?.(event);
            if (clickedStar) {
                const starKey = String(clickedStar.id ?? clickedStar.name ?? '');
                if (this.currentInfoType === 'star' && this.currentInfoStar === starKey && this.infoContainer) {
                    this.hideConstellationInfo();
                    return;
                }

                this.showStarInfo(clickedStar, clickedStar.point || null);
                console.log('⭐ Star click:', clickedStar);
                return;
            }
        }

// ✅ Novo: descobrir constelação por polígonos (boundaries)
        const clickDir = this._getClickDirFromCurrentRay();
        let constellationAbbr = this.pickConstellationByDirection(clickDir);

        // Posição 3D do clique na esfera (para feedback / info)
        const clickPoint = this._rayToSphereIntersection(this.raycaster.ray, this.sftw.settings.sphereRadius);
        const clickPosition = clickPoint || null;

        // Fallback (somente se não encontrou via polígonos)
        if (!constellationAbbr) {
            const intersectObjects = Array.from(this.constellationAreas.values());
            const intersects = this.raycaster.intersectObjects(intersectObjects, true);

            if (intersects.length > 0) {
                const best = this._pickBestConstellationIntersection(intersects);
                if (best) {
                    constellationAbbr = best.abbr;
                }
            }
        }

        if (constellationAbbr) {
            // Se já está mostrando info para esta constelação, fecha
            if (this.currentInfoConstellation === constellationAbbr && this.infoContainer) {
                this.hideConstellationInfo();
                return;
            }

            // Remover highlight anterior
            if (this.highlightedConstellation && this.highlightedConstellation !== constellationAbbr) {
                this.unhighlightConstellation(this.highlightedConstellation);
            }

            // Verificar modo
            if (this.gameMode) {
                this.processGameSelection(constellationAbbr, clickPosition);
            } else {
                this.showConstellationInfo(constellationAbbr, clickPosition);
            }
        } else {
            this.hideConstellationInfo();
        }
    }

    // ============================================
    // CONTAINER DE INFORMAÇÕES - CORRIGIDO - CORRIGIDO
    // ============================================
    
    showConstellationInfo(constellationAbbr, clickPosition) {
        // Remover container anterior
        if (this.infoContainer) {
            this.hideConstellationInfo();
        }
        
        const constellation = this.sftw.constellations.find(c => c.abbreviation === constellationAbbr);
        if (!constellation) return;
        
        this.currentInfoConstellation = constellationAbbr;
        
        // Obter vizinhanças
        const neighbors = constellation.neighbors || [];
        const neighborNames = neighbors.map(abbr => {
            const neighbor = this.sftw.constellations.find(c => c.abbreviation === abbr);
            return neighbor ? `${neighbor.abbreviation} (${this.getShortenedName(neighbor.name)})` : abbr;
        });
        
        // Criar container
        this.infoContainer = document.createElement('div');
        this.infoContainer.id = 'constellation-info-container';
        this.infoContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 30, 0.95);
            border: 2px solid #4fc3f7;
            border-radius: 12px;
            padding: 1.5rem;
            color: white;
            max-width: 300px;
            z-index: 1000;
            font-family: 'Roboto', sans-serif;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            animation: infoSlideIn 0.3s ease;
        `;
        
        // Adicionar estilos
        this.addInfoStyles();
        
        // Conteúdo
        this.infoContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="color: #4fc3f7; font-family: 'Orbitron', sans-serif; margin: 0;">
                    ${constellation.abbreviation}
                </h3>
                <button id="close-info-btn" style="
                    background: none;
                    border: none;
                    color: #8b949e;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    transition: color 0.2s;
                " title="Fechar">&times;</button>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem; color: white;">
                    ${constellation.name}
                </div>
                <div style="font-size: 0.9rem; color: #8b949e;">
                    Centro: RA ${constellation.center.ra.toFixed(2)}h, Dec ${constellation.center.dec.toFixed(2)}°
                </div>
            </div>
            
            <div style="
                background: rgba(79, 195, 247, 0.1);
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: #8b949e;">Limites com:</span>
                    <span style="color: #4fc3f7; font-family: 'Orbitron', sans-serif;">
                        ${neighbors.length} constelações
                    </span>
                </div>
                
                <div style="
                    max-height: 150px;
                    overflow-y: auto;
                    padding-right: 0.5rem;
                ">
                    ${neighborNames.map(name => `
                        <div style="
                            background: rgba(255, 255, 255, 0.05);
                            padding: 0.5rem;
                            border-radius: 4px;
                            margin-bottom: 0.25rem;
                            font-size: 0.9rem;
                        ">${name}</div>
                    `).join('')}
                </div>
            </div>
            
            <div style="
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 0.75rem;
                font-size: 0.85rem;
                color: #8b949e;
            ">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <i class="fas fa-info-circle"></i>
                    <span>Clique em outra constelação para ver detalhes</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-mouse-pointer"></i>
                    <span>Clique fora ou no X para fechar</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.infoContainer);
        
        // Configurar botão de fechar
        const closeBtn = this.infoContainer.querySelector('#close-info-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideConstellationInfo();
            });
            
            closeBtn.addEventListener('mouseover', () => {
                closeBtn.style.color = '#fff';
            });
            closeBtn.addEventListener('mouseout', () => {
                closeBtn.style.color = '#8b949e';
            });
        }
        
        // Highlight
        this.highlightConstellation(constellationAbbr);
    }
    
    hideConstellationInfo() {
        if (this.highlightedConstellation) {
            this.unhighlightConstellation(this.highlightedConstellation);
            this.highlightedConstellation = null;
        }
        
        this.currentInfoConstellation = null;
        
        if (this.infoContainer) {
            if (this.infoContainer.parentNode) {
                this.infoContainer.parentNode.removeChild(this.infoContainer);
            }
            this.infoContainer = null;
        }
    }
    
    addInfoStyles() {
        if (document.getElementById('info-container-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'info-container-styles';
        style.textContent = `
            @keyframes infoSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes infoSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            #constellation-info-container div::-webkit-scrollbar {
                width: 6px;
            }
            
            #constellation-info-container div::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }
            
            #constellation-info-container div::-webkit-scrollbar-thumb {
                background: #4fc3f7;
                border-radius: 3px;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // ============================================
    // MÉTODOS DE HIGHLIGHT
    // ============================================
    
    highlightConstellation(constellationAbbr) {
        const lines = this.geodesicLines.get(constellationAbbr);
        if (lines) {
            lines.forEach(line => {
                if (line) {
                    if (!line.userData.originalColor) {
                        line.userData.originalColor = line.material.color.getHex();
                        line.userData.originalOpacity = line.material.opacity;
                        line.userData.originalLinewidth = line.material.linewidth;
                    }
                    line.material.color.setHex(0xffff00);
                    line.material.opacity = 1.0;
                    line.material.linewidth = 2;
                }
            });
        }
        
        const label = this.constellationLabels.get(constellationAbbr);
        if (label) {
            label.material.opacity = 1.0;
            const base = label.userData?.originalScale;
            if (base) {
                label.scale.copy(base).multiplyScalar(1.25);
            } else {
                label.scale.multiplyScalar(1.25);
            }
        }
    }
    
    unhighlightConstellation(constellationAbbr) {
        const lines = this.geodesicLines.get(constellationAbbr);
        if (lines) {
            lines.forEach(line => {
                if (line && line.userData.originalColor) {
                    line.material.color.setHex(line.userData.originalColor);
                    line.material.opacity = line.userData.originalOpacity || 0.6;
                    line.material.linewidth = line.userData.originalLinewidth || 1;
                }
            });
        }
        
        const label = this.constellationLabels.get(constellationAbbr);
        if (label) {
            label.material.opacity = 0.9;
            const base = label.userData?.originalScale;
            if (base) {
                label.scale.copy(base);
            }
        }
    }
    
    isConstellationDarkened(constellationAbbr) {
        const area = this.constellationAreas.get(constellationAbbr);
        return area && area.userData.darkened;
    }
    
    // ============================================
    // SEGMENTOS ORIGINAIS - INVISÍVEIS!
    // ============================================
    
    createTestSegmentVisualization() {
        console.log('📏 Criando segmentos originais (INVISÍVEIS)...');
        this.clearOriginalSegments();
        
        if (!this.sftw.constellations || this.sftw.constellations.length === 0) {
            return;
        }
        
        this.sftw.constellations.forEach(constellation => {
            if (constellation.geodesicSegments) {
                constellation.geodesicSegments.forEach((segment, index) => {
                    const line = this.createOriginalSegmentLine(segment, constellation.abbreviation, index);
                    if (line) {
                        // FORÇAR INVISIBILIDADE
                        line.visible = false;
                        line.material.opacity = 0;
                        line.material.transparent = true;
                    }
                });
            }
        });
        
        console.log(`✅ ${this.originalLines.length} segmentos criados (INVISÍVEIS)`);
    }
    
    createOriginalSegmentLine(segment, abbreviation, segmentIndex) {
        if (!segment.points || segment.points.length < 2) {
            return null;
        }
        
        const points = [];
        segment.points.forEach(point => {
            const vector = this.sftw.raDecToVector3(
                point.ra,
                point.dec,
                this.sftw.settings.sphereRadius
            );
            points.push(vector);
        });
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const color = this.getColorFromAbbreviation(abbreviation);
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 1,
            transparent: true,
            opacity: 0.4
        });
        
        const line = new THREE.Line(geometry, material);
        line.userData = {
            type: 'original-segment-debug',
            constellation: abbreviation,
            segmentIndex: segmentIndex
        };
        
        // INVISÍVEL POR PADRÃO
        line.visible = false;
        this.sftw.sceneManager.scene.add(line);
        this.originalLines.push(line);
        
        return line;
    }
    
    getColorFromAbbreviation(abbr) {
        let hash = 0;
        for (let i = 0; i < abbr.length; i++) {
            hash = abbr.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const colors = [
            0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff,
            0x00ffff, 0xff8800, 0x8800ff, 0x008888, 0x888800
        ];
        
        return colors[Math.abs(hash) % colors.length];
    }
    

    // ============================================
    // ASTERISMOS - CAMADA VISUAL DO MODO EXPLORAR
    // ============================================

    createAsterismLayer() {
        if (!this.sftw?.sceneManager?.scene) return null;

        this.clearAsterismLayer();

        this.asterismGroup = new THREE.Group();
        this.asterismGroup.name = 'sftw-asterisms';
        this.sftw.sceneManager.scene.add(this.asterismGroup);

        const asterisms = (typeof this.sftw?.getPlayableAsterisms === 'function')
            ? (this.sftw.getPlayableAsterisms() || [])
            : [];

        if (!asterisms.length) {
            this._syncAsterismVisibility();
            console.warn('⚠️ Nenhum asterismo jogável disponível para renderização.');
            return this.asterismGroup;
        }

        for (const asterism of asterisms) {
            this._createSingleAsterismVisual(asterism);
        }

        this._syncAsterismVisibility();
        console.log(`✨ ${this.asterismLines.size} asterismos visuais criados`);
        return this.asterismGroup;
    }

    _createSingleAsterismVisual(asterism) {
        if (!asterism || !asterism.isPlayable) return;

        const starMap = new Map((asterism.stars || []).map(s => [s.localId, s]));
        const lines = [];

        for (const seg of (asterism.segments || [])) {
            const sa = starMap.get(seg.aLocalId);
            const sb = starMap.get(seg.bLocalId);
            const aStar = sa?.star || null;
            const bStar = sb?.star || null;
            if (!aStar || !bStar) continue;

            const p1 = this.sftw.raDecToVector3(aStar.ra, aStar.dec, this.sftw.settings.sphereRadius - 2.0);
            const p2 = this.sftw.raDecToVector3(bStar.ra, bStar.dec, this.sftw.settings.sphereRadius - 2.0);

            const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            const material = new THREE.LineBasicMaterial({
                color: 0xffd166,
                transparent: true,
                opacity: 0.95,
                depthWrite: false
            });

            const line = new THREE.Line(geometry, material);
            line.userData = {
                type: 'asterism-line',
                asterismId: asterism.id,
                asterismName: asterism.name,
                asterismNamePt: asterism.namePt || asterism.name,
                culture: asterism.culture || 'unknown',
                clickable: true,
                selectable: true,
                canonical: seg.canonical || null
            };

            this.asterismGroup.add(line);
            lines.push(line);
        }

        if (!lines.length) return;
        this.asterismLines.set(asterism.id, lines);

        const label = this._createAsterismLabel(asterism);
        if (label) this.asterismLabels.set(asterism.id, label);
    }

    _createAsterismLabel(asterism) {
        const dir = this._getAsterismCenterDirection(asterism);
        if (!dir) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const text = String(asterism.namePt || asterism.name || asterism.id || '').trim();
        if (!text) return null;

        const fontSize = 26;
        ctx.font = `bold ${fontSize}px Arial`;
        const width = Math.ceil(ctx.measureText(text).width) + 24;
        const height = fontSize + 16;
        canvas.width = Math.max(64, width);
        canvas.height = Math.max(40, height);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0,0,0,0.82)';
        ctx.fillStyle = '#ffd166';
        ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.copy(dir.clone().multiplyScalar(this.sftw.settings.sphereRadius - 8));
        sprite.scale.set(canvas.width * 0.24, canvas.height * 0.24, 1);
        sprite.visible = false;
        sprite.userData = {
            type: 'asterism-label',
            asterismId: asterism.id,
            asterismName: asterism.name,
            asterismNamePt: asterism.namePt || asterism.name,
            aimDir: dir.clone().normalize()
        };

        this.asterismGroup.add(sprite);
        return sprite;
    }

    _getAsterismCenterDirection(asterism) {
        if (!asterism || !Array.isArray(asterism.stars) || !asterism.stars.length) return null;
        const sum = new THREE.Vector3(0, 0, 0);
        let count = 0;
        for (const item of asterism.stars) {
            const star = item?.star;
            if (!star || !Number.isFinite(star.ra) || !Number.isFinite(star.dec)) continue;
            sum.add(this.sftw.raDecToVector3(star.ra, star.dec, 1));
            count += 1;
        }
        if (!count || sum.lengthSq() <= 1e-9) return null;
        return sum.normalize();
    }

    clearAsterismLayer() {
        if (this.asterismGroup) {
            this.asterismGroup.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (obj.material.map) obj.material.map.dispose();
                    obj.material.dispose();
                }
            });
            this.sftw?.sceneManager?.scene?.remove(this.asterismGroup);
        }
        this.asterismGroup = null;
        this.asterismLines.clear();
        this.asterismLabels.clear();
    }

    _syncAsterismVisibility() {
        const showLines = !!this.asterismsVisible;
        const showLabels = !!this.asterismsVisible && !!this.asterismLabelsVisible;

        this.asterismLines.forEach((lines) => {
            (lines || []).forEach((line) => { if (line) line.visible = showLines; });
        });
        this.asterismLabels.forEach((label) => {
            if (label) label.visible = showLabels;
        });
    }

    setAsterismsVisible(value) {
        this.asterismsVisible = !!value;
        if (!this.asterismGroup) this.createAsterismLayer();
        this._syncAsterismVisibility();
        return this.asterismsVisible;
    }

    setAsterismLabelsVisible(value) {
        this.asterismLabelsVisible = !!value;
        if (!this.asterismGroup) this.createAsterismLayer();
        this._syncAsterismVisibility();
        return this.asterismLabelsVisible;
    }

    _pickAsterismUnderPointer(ev) {
        try {
            if (!this.asterismsVisible || !this.asterismGroup) return null;
            const renderer = this.sftw?.sceneManager?.renderer;
            const camera = this.sftw?.sceneManager?.camera;
            if (!renderer || !camera || !ev || ev.clientX == null || ev.clientY == null) return null;

            const rect = renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
            this.raycaster.setFromCamera(this.mouse, camera);
            this.raycaster.params.Line = this.raycaster.params.Line || {};
            this.raycaster.params.Line.threshold = 12;

            const targets = [];
            this.asterismLines.forEach((lines) => { if (lines?.length) targets.push(...lines); });
            if (!targets.length) return null;

            const hits = this.raycaster.intersectObjects(targets, false);
            const best = (hits || []).find(h => h?.object?.userData?.type === 'asterism-line');
            if (!best) return null;

            const id = best.object.userData.asterismId;
            const asterism = typeof this.sftw?.getAsterismById === 'function'
                ? this.sftw.getAsterismById(id)
                : null;
            if (!asterism) return null;
            return { ...asterism, point: best.point || null };
        } catch (err) {
            console.warn('⚠️ _pickAsterismUnderPointer falhou:', err);
            return null;
        }
    }

    showAsterismInfo(asterism, clickPosition = null) {
        if (!asterism) return;
        if (this.infoContainer) this.hideConstellationInfo();

        this.currentInfoType = 'asterism';
        this.currentInfoConstellation = null;
        this.currentInfoStar = null;

        const asterismId = String(asterism.id || '').trim();
        const title = String(asterism.namePt || asterism.name || asterismId).trim();
        const subtitle = asterism.name && asterism.name !== title ? asterism.name : '';
        const stars = Array.isArray(asterism.stars) ? asterism.stars : [];
        const starItems = stars.map((item) => {
            const s = item?.star || {};
            const name = (s.name || item?.refName || item?.localId || 'estrela').toString();
            const con = (s.con || s.constellation || item?.refCon || '').toString();
            return `<li style="margin-bottom:4px;"><strong>${name}</strong>${con ? ` <span style="color:#8b949e;">(${con})</span>` : ''}</li>`;
        }).join('');

        this.infoContainer = document.createElement('div');
        this.infoContainer.id = 'constellation-info-container';
        this.infoContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(20, 14, 2, 0.96);
            border: 2px solid #ffd166;
            border-radius: 12px;
            padding: 1.25rem;
            color: white;
            max-width: 360px;
            z-index: 1000;
            font-family: 'Roboto', sans-serif;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            animation: infoSlideIn 0.3s ease;
        `;

        this.infoContainer.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;gap:12px;">
                <div>
                    <div style="font-family:'Orbitron',sans-serif;font-size:1.05rem;color:#ffd166;margin-bottom:0.25rem;">
                        <i class="fas fa-wand-magic-sparkles"></i> ${title}
                    </div>
                    <div style="font-size:0.82rem;color:#c9d1d9;">${subtitle || 'Asterismo do modo explorar'}</div>
                </div>
                <button id="close-info-btn" style="background:none;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer;padding:0;line-height:1;">✕</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
                <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:0.75rem;">
                    <div style="font-size:0.75rem;color:#8b949e;margin-bottom:0.25rem;">Estrelas</div>
                    <div style="font-family:'Orbitron',sans-serif;color:#ffd166;">${stars.length}</div>
                </div>
                <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:0.75rem;">
                    <div style="font-size:0.75rem;color:#8b949e;margin-bottom:0.25rem;">Segmentos</div>
                    <div style="font-family:'Orbitron',sans-serif;color:#ffd166;">${(asterism.segments || []).length}</div>
                </div>
            </div>

            <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:0.85rem;">
                <div style="font-size:0.78rem;color:#8b949e;margin-bottom:0.5rem;">Estrelas que compõem o asterismo</div>
                <ul style="margin:0;padding-left:1rem;max-height:180px;overflow:auto;">${starItems || '<li>Sem estrelas resolvidas.</li>'}</ul>
            </div>
        `;

        document.body.appendChild(this.infoContainer);
        const closeBtn = this.infoContainer.querySelector('#close-info-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideConstellationInfo();
            });
        }
    }

    // ============================================
    // CONTROLES DE VISIBILIDADE
    // ============================================
    

    _syncBoundaryVisibilityForGame() {
        if (!this.gameMode) return;
        if (!this.revealedConstellations) this.revealedConstellations = new Set();

        this.geodesicLines.forEach((lines, abbr) => {
            const key = this._normalizeAbbr(abbr);
            const shouldShow = !!this.gameOptions?.game1ShowBoundaries && this.revealedConstellations.has(key);
            if (!lines) return;
            lines.forEach(line => { if (line) line.visible = shouldShow; });
        });
    }

    toggleGrid() {
        this.gridLines.forEach(line => {
            if (line) line.visible = this.sftw.settings.showGrid;
        });
    }
    
    toggleBoundaries() {
        if (this.gameMode) {
            this._syncBoundaryVisibilityForGame();
            return;
        }
        this.geodesicLines.forEach((lines) => {
            if (!lines) return;
            lines.forEach(line => {
                if (line) line.visible = this.sftw.settings.showBoundaries;
            });
        });
    }
    
    toggleLabels() {
        const shouldShow = this.sftw.settings.showLabels;
        this.constellationLabels.forEach(label => {
            if (label) label.visible = shouldShow;
        });
        console.log(`🏷️ Labels ${shouldShow ? 'ON' : 'OFF'}`);
    }
    toggleStars() {
        this.applyStarStudyFilter();
    }
    
    toggleSegments() {
        this.originalLines.forEach(line => {
            if (line) line.visible = this.sftw.settings.showTestSegments;
        });
    }


    // ============================================
    // OPÇÕES / PROGRESSO DO JOGO (UI → Visualization)
    // ============================================
    // ============================================

    setGameOptions(opts = {}) {
        this.gameOptions = this.gameOptions || {};
        if (typeof opts.showDiscoveredFill === 'boolean') this.gameOptions.showDiscoveredFill = opts.showDiscoveredFill;
        if (typeof opts.showDiscoveredNames === 'boolean') this.gameOptions.showDiscoveredNames = opts.showDiscoveredNames;
        if (typeof opts.showProgress === 'boolean') this.gameOptions.showProgress = opts.showProgress;
        if (typeof opts.game1ShowBoundaries === 'boolean') this.gameOptions.game1ShowBoundaries = opts.game1ShowBoundaries;
        if (typeof opts.game1ShowLabels === 'boolean') this.gameOptions.game1ShowLabels = opts.game1ShowLabels;

        if (this.gameMode) {
            this._syncBoundaryVisibilityForGame();
            this._syncLabelsVisibilityForGame();
            this._syncFillVisibilityForGame();
        }
    }

    // UI pode chamar pra refletir estado do jogo
    setGameRevealedSet(revealedSet) {
        if (!this.revealedConstellations) this.revealedConstellations = new Set();
        this.revealedConstellations.clear();
        if (revealedSet && typeof revealedSet.forEach === 'function') {
            revealedSet.forEach((x) => {
                const k = this._normalizeAbbr(x);
                if (k) this.revealedConstellations.add(k);
            });
        }

        if (this.gameMode) {
            this._syncBoundaryVisibilityForGame();
            this._syncLabelsVisibilityForGame();
            this._syncFillVisibilityForGame();

            if (Array.isArray(this.starMeshes)) {
                this.starMeshes.forEach((star) => {
                    if (!star || !star.userData) return;
                    const conRaw = star.userData.constellation || star.userData.con || '';
                    const con = this._normalizeAbbr(conRaw);
                    star.visible = this.revealedConstellations.has(con);
                });
            }
        }
    }

    _syncLabelsVisibilityForGame() {
        if (!this.gameMode) return;
        const show = !!(this.gameOptions && this.gameOptions.showDiscoveredNames);
        if (!this.constellationLabels) return;
        this.constellationLabels.forEach((label, abbr) => {
            if (!label) return;
            const key = this._normalizeAbbr(abbr);
            const should = show && !!this.gameOptions?.game1ShowLabels && this.revealedConstellations && this.revealedConstellations.has(key);
            label.visible = !!should;
            if (label.material) {
                label.material.transparent = true;
                label.material.opacity = should ? 1.0 : 0.0;
            }
        });
    }

    _syncFillVisibilityForGame() {
        if (!this.gameMode) return;
        const show = !!(this.gameOptions && this.gameOptions.showDiscoveredFill);
        (this.constellationFillMeshes || new Map()).forEach((meshes, abbr) => {
            const key = this._normalizeAbbr(abbr);
            const should = show && this.revealedConstellations && this.revealedConstellations.has(key);
            (meshes || []).forEach(m => { if (m) m.visible = !!should; });
        });
    }

    // Constrói meshes de preenchimento (fundo azul) usando os polígonos clicáveis
    // (derivados de boundaries.dat).
    buildConstellationFillMeshesFromClickPolygons() {
        const polyMap = this.constellationClickPolygons;
        if (!polyMap || typeof polyMap.forEach !== 'function') return;

        // limpar antigos
        if (this.constellationFillMeshes && typeof this.constellationFillMeshes.forEach === 'function') {
            this.constellationFillMeshes.forEach((meshes) => {
                (meshes || []).forEach(m => {
                    try { this.sftw.sceneManager?.scene?.remove(m); } catch (e) {}
                    try { m.geometry?.dispose?.(); } catch (e) {}
                    try { m.material?.dispose?.(); } catch (e) {}
                });
            });
        }
        this.constellationFillMeshes = new Map();

        const scene = this.sftw.sceneManager?.scene;
        const R = this.sftw.settings?.sphereRadius || 100;
        const rScale = 1.0004; // leve offset para evitar z-fighting

        polyMap.forEach((info, abbr) => {
            if (!info || info.ok === false) return;
            const loops = info.loops || [];
            if (!loops.length) return;

            const meshes = [];
            for (const loop of loops) {
                if (!loop || !loop.poly2 || loop.poly2.length < 3 || !loop.n || !loop.u || !loop.v) continue;

                // triangulação do polígono 2D
                const pts2 = loop.poly2.map(p => new THREE.Vector2(p.x, p.y));
                const triangles = THREE.ShapeUtils.triangulateShape(pts2, []);

                const positions = [];
                for (const tri of triangles) {
                    for (const idx of tri) {
                        const x = pts2[idx].x;
                        const y = pts2[idx].y;
                        // inversa gnomônica: dir ∝ n + x u + y v
                        const dir = new THREE.Vector3()
                            .copy(loop.n)
                            .addScaledVector(loop.u, x)
                            .addScaledVector(loop.v, y)
                            .normalize();
                        positions.push(dir.x * R * rScale, dir.y * R * rScale, dir.z * R * rScale);
                    }
                }

                if (positions.length < 9) continue;

                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geom.computeVertexNormals();

                const mat = new THREE.MeshBasicMaterial({
                    color: 0x0b2a4a,
                    transparent: true,
                    opacity: 0.25,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geom, mat);
                mesh.visible = false;
                mesh.userData = mesh.userData || {};
                mesh.userData.constellationAbbr = abbr;
                mesh.renderOrder = 0;

                if (scene) scene.add(mesh);
                meshes.push(mesh);
            }

            if (meshes.length) this.constellationFillMeshes.set(abbr, meshes);
        });

        if (this.gameMode) this._syncFillVisibilityForGame();
    }


    // ============================================
    // MÉTODOS DO JOGO
    // ============================================

    // ============================================
    // REVELAR CONSTELAÇÃO (MODO JOGO)
    // - Mostra limites + estrelas + label (+ névoa opcional)
    // - Mantém o restante escuro
    // ============================================
    revealConstellation(constellationAbbr, opts = {}) {
        if (!constellationAbbr) return;

        const key = this._normalizeAbbr(constellationAbbr);

        const options = {
            fog: !!opts.fog,
            showBoundaries: (opts.showBoundaries !== undefined) ? !!opts.showBoundaries : true,
            showStars: (opts.showStars !== undefined) ? !!opts.showStars : true,
            showLabel: (opts.showLabel !== undefined) ? !!opts.showLabel : true,
        };

        if (!this.revealedConstellations) this.revealedConstellations = new Set();
        this.revealedConstellations.add(key);

        // 1) Boundaries
        if (options.showBoundaries) {
            const lines = this.geodesicLines?.get?.(key);
            if (lines && Array.isArray(lines)) {
                lines.forEach(line => {
                    if (!line) return;
                    line.visible = true;
                    // Garante cor/opacity padrão de boundary
                    if (line.material) {
                        line.material.transparent = true;
                        line.material.opacity = 0.9;
                    }
                });
            }
        }

        // 2) Stars (filtra por IAU)
        if (options.showStars && Array.isArray(this.starMeshes)) {
            this.starMeshes.forEach(star => {
                if (!star || !star.userData) return;
                const con = this._normalizeAbbr(star.userData.constellation || star.userData.con || '');
                if (con === key) star.visible = true;
            });
        }

        // 3) Label
        if (options.showLabel) {
            const label = this.constellationLabels?.get?.(key);
            if (label) {
                label.visible = true;
                if (label.material) {
                    label.material.transparent = true;
                    label.material.opacity = 1.0;
                }
            }
        }

        // 4) Fog (área)
        if (options.fog) {
            const area = this.constellationAreas?.get?.(key);
            const applyFogMat = (obj) => {
                if (!obj) return;
                obj.visible = true;
                if (obj.material) {
                    obj.material.transparent = true;
                    obj.material.opacity = 0.12;
                    obj.material.depthWrite = false;
                    if (obj.material.color) obj.material.color.setHex(0x3a7bd5);
                }
            };
            if (area) {
                applyFogMat(area);
                if (area.children && area.children.length) area.children.forEach(ch => applyFogMat(ch));
            }
        }

        // ✅ Sincroniza opções do modo jogo (nomes + fundo)
        if (this.gameMode) {
            this._syncBoundaryVisibilityForGame?.();
            this._syncLabelsVisibilityForGame?.();
            this._syncFillVisibilityForGame?.();
        }
    }
    processGameSelection(constellationAbbr, clickPosition) {
        // Visualization não decide mais acerto/erro do jogo das constelações.
        // Ela apenas identifica a constelação clicada e delega para o controlador de jogo.
        if (!constellationAbbr) return;

        // Se já foi revelada visualmente, não reabre o fluxo.
        if (this.revealedConstellations && this.revealedConstellations.has(constellationAbbr)) return;

        const game = this.getPrimaryGameController();
        if (game && typeof game.handleConstellationClick === 'function') {
            game.handleConstellationClick(constellationAbbr);
            return;
        }

        if (typeof this.sftw?.handleConstellationClick === 'function') {
            this.sftw.handleConstellationClick(constellationAbbr);
            return;
        }

        const legacyCallback = this.sftw?.callbacks?.onConstellationClick;
        if (typeof legacyCallback === 'function') {
            legacyCallback(constellationAbbr);
            return;
        }

        this.sftw?.ui?.showMessage?.(
            'Controlador do jogo de constelações indisponível.',
            'warning'
        );
    }


    startGameMode(selectedConstellationAbbr, opts = {}) {
        // ✅ Isolar o treino de constelações: Messier NÃO pode aparecer nem capturar clique no modo jogo.
        // Salva o estado atual (ou o "desejado" pela UI) para restaurar depois.
        this._messierVisibleBeforeGame = this.messierVisible;
        this._messierWantedDuringGame = this.messierVisible;

        // Força ocultar (sem depender de toggle)
        this.messierVisible = false;
        if (this.messierGroup) this.messierGroup.visible = false;

        this.gameMode = true;
        this.selectedConstellation = selectedConstellationAbbr;
        this.hideConstellationInfo();

        if (opts && typeof opts === 'object') {
            this.setGameOptions({
                game1ShowBoundaries: opts.showBoundaries !== undefined ? !!opts.showBoundaries : this.gameOptions.game1ShowBoundaries,
                game1ShowLabels: opts.showLabels !== undefined ? !!opts.showLabels : this.gameOptions.game1ShowLabels
            });
        }

        // Estado de revelação
        if (!this.revealedConstellations) this.revealedConstellations = new Set();

        // Tudo preto: esconde linhas, labels e estrelas; mantém áreas para clique
        this._applyBlackoutView();

        // Revela a inicial
        this.revealConstellation(selectedConstellationAbbr, { fog: true });
    }
    
    
endGameMode() {
        // Sai do modo jogo e garante que NADA do "tema azul"/revelações vaze para o planetário.
        this.gameMode = false;
        this.selectedConstellation = null;

        // 1) Limpar estado de revelação do jogo
        if (this.revealedConstellations) this.revealedConstellations.clear();

        // 2) Esconder qualquer preenchimento (fill azul) construído via polígonos
        if (this.constellationFillMeshes && typeof this.constellationFillMeshes.forEach === 'function') {
            this.constellationFillMeshes.forEach((meshes) => {
                (meshes || []).forEach(m => { if (m) m.visible = false; });
            });
        }

        // 3) Esconder qualquer "fog" (áreas clicáveis) que tenha sido ativado no jogo
        if (this.constellationAreas && typeof this.constellationAreas.forEach === 'function') {
            this.constellationAreas.forEach((area) => {
                if (!area) return;
                const resetMat = (obj) => {
                    if (!obj) return;
                    obj.visible = false; // fora do debug, áreas ficam invisíveis no planetário
                    if (obj.material) {
                        obj.material.transparent = true;
                        obj.material.opacity = 0.0;
                        obj.material.depthWrite = false;
                    }
                };
                resetMat(area);
                if (area.children && area.children.length) area.children.forEach(ch => resetMat(ch));
            });
        }

        // 4) Restaurar visibilidade padrão (grid/estrelas/boundaries/labels) conforme settings do planetário
        this.restoreAllVisibility();

        // ✅ Restaurar Messier conforme toggle (ou estado anterior) ao sair do jogo
        const restoreMessier =
            (this._messierWantedDuringGame != null) ? this._messierWantedDuringGame :
            (this._messierVisibleBeforeGame != null) ? this._messierVisibleBeforeGame :
            !!(this.sftw?.settings && (this.sftw.settings.showMessier === true || this.sftw.settings.messierVisible === true));

        this._messierVisibleBeforeGame = null;
        this._messierWantedDuringGame = null;

        this.setMessierVisible(restoreMessier);

    }

    // ============================================

    // MÉTODOS AUXILIARES
    // ============================================


/**
 * Aplica o "blackout" do modo jogo: esconde tudo (estrelas/limites/labels/grade),
 * mantendo as áreas de constelação para clique.
 * A constelação revelada (ex.: Ori) será reativada por revealConstellation().
 */
_applyBlackoutView() {
    // Esconde limites (geodésicas)
    if (this.geodesicLines && typeof this.geodesicLines.forEach === 'function') {
        // Map<abbr, Line[]>
        this.geodesicLines.forEach((lines) => {
            if (!lines) return;
            lines.forEach(line => { if (line) line.visible = false; });
        });
    }

    // Reaplica as boundaries das já reveladas (se houver)
    this._syncBoundaryVisibilityForGame();

    // Esconde estrelas
    if (Array.isArray(this.starMeshes)) {
        this.starMeshes.forEach(star => {
            if (star) star.visible = false;
        });
    }

    // Esconde grade
    if (Array.isArray(this.gridLines)) {
        this.gridLines.forEach(line => {
            if (line) line.visible = false;
        });
    }

    // Esconde labels
    if (typeof this.hideAllLabels === 'function') {
        this.hideAllLabels();
    } else if (this.sftw && this.sftw.settings && typeof this.toggleLabels === 'function') {
        const prev = this.sftw.settings.showLabels;
        this.sftw.settings.showLabels = false;
        try { this.toggleLabels(); } finally { this.sftw.settings.showLabels = prev; }
    }

    // Áreas: mantêm clicáveis, mas invisíveis.
    const makeInvisible = (obj) => {
        if (!obj) return;
        obj.visible = true; // precisa existir na cena para raycast
        if (obj.material) {
            obj.material.transparent = true;
            obj.material.opacity = 0.0;
            obj.material.depthWrite = false;
        }
    };

    if (this.constellationAreas && typeof this.constellationAreas.forEach === 'function') {
        this.constellationAreas.forEach(area => {
            makeInvisible(area);
            if (area && area.children && area.children.length) {
                area.children.forEach(ch => makeInvisible(ch));
            }
            if (area) {
                area.userData = area.userData || {};
                area.userData.darkened = true;
            }
        });
    }
}

    
    clearDarkenedObjects() {
        this.darkenedObjects.forEach(obj => {
            if (obj && obj.userData && obj.userData.originalState) {
                obj.material.color.setHex(obj.userData.originalState.color);
                obj.material.opacity = obj.userData.originalState.opacity;
                obj.visible = obj.userData.originalState.visible;
            }
        });
        this.darkenedObjects = [];
        
        this.constellationAreas.forEach(area => {
            if (area) area.userData.darkened = false;
        });
    }
    
    restoreAllVisibility() {
        this.geodesicLines.forEach((lines) => {
            lines.forEach(line => {
                if (line) {
                    line.visible = this.sftw.settings.showBoundaries;
                    if (line.userData && line.userData.originalState) {
                        line.material.color.setHex(line.userData.originalState.color);
                        line.material.opacity = line.userData.originalState.opacity;
                    }
                }
            });
        });
        
        this.starMeshes.forEach(star => {
            if (star) star.visible = this.sftw.settings.showStars;
        });
        this.applyStarStudyFilter?.();
        
        this.gridLines.forEach(line => {
            if (line) line.visible = this.sftw.settings.showGrid;
        });
        
        this.toggleLabels();
    }
    
    // ============================================
    // FOCUS ON CONSTELLATION
    // ============================================
    
    focusOnConstellation(constellationAbbr) {
        const constellation = this._findConstellationByAbbr(constellationAbbr);
        if (!constellation) {
            this.sftw.ui?.showMessage?.(`Constelação não encontrada: ${constellationAbbr}`, 'error');
            return;
        }

        // Painel pode chamar foco antes de entrar em modo planetário
        if (!this.sftw.sceneManager?.isPlanetariumMode && typeof this.sftw.sceneManager?.setupPlanetariumMode === 'function') {
            this.sftw.sceneManager.setupPlanetariumMode();
        }

        const direction = this._getConstellationAimDirection(constellation);
        if (!direction) {
            this.sftw.ui?.showMessage?.(`Sem direção válida para: ${constellation.abbreviation}`, 'warning');
            return;
        }

        // Converter a direção para rotação da câmera em modo planetário.
        // IMPORTANTE: a câmera olha para -Z por padrão.
        // Usar quaternion->Euler (YXZ) é mais confiável do que fórmulas com theta/phi.
        const forward = new THREE.Vector3(0, 0, -1);
        const q = new THREE.Quaternion().setFromUnitVectors(forward, direction.clone().normalize());
        const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        const targetRotY = e.y;
        const targetRotX = e.x;
        const sm = this.sftw.sceneManager;
        if (!sm?.planetariumSettings) return;

        // Animação suave e curta (melhor UX no painel)
        if (this._focusAnim) cancelAnimationFrame(this._focusAnim);
        const startX = sm.planetariumSettings.rotation.x;
        const startY = sm.planetariumSettings.rotation.y;
        const start = performance.now();
        const duration = 320;
        const easeInOut = (t) => (t < 0.5) ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const e = easeInOut(t);
            sm.planetariumSettings.rotation.x = startX + (targetRotX - startX) * e;
            sm.planetariumSettings.rotation.y = startY + (targetRotY - startY) * e;
            if (sm.camera) {
                sm.camera.fov = 40;
                sm.camera.updateProjectionMatrix();
            }
            if (t < 1) this._focusAnim = requestAnimationFrame(step);
        };

        this._focusAnim = requestAnimationFrame(step);

        this.sftw.ui?.showMessage?.(`Focado em: ${constellation.name}`, 'success');
    }
    
    // ============================================
    // LIMPEZA
    // ============================================
    
    clearGrid() {
        this.gridLines.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
            this.sftw.sceneManager.scene.remove(line);
        });
        this.gridLines = [];
    
        // Linhas extras (planetário)
        if (this.eclipticLine) {
            if (this.eclipticLine.geometry) this.eclipticLine.geometry.dispose();
            if (this.eclipticLine.material) this.eclipticLine.material.dispose();
            this.sftw.sceneManager.scene.remove(this.eclipticLine);
            this.eclipticLine = null;
        }
        if (this.galacticEquatorLine) {
            if (this.galacticEquatorLine.geometry) this.galacticEquatorLine.geometry.dispose();
            if (this.galacticEquatorLine.material) this.galacticEquatorLine.material.dispose();
            this.sftw.sceneManager.scene.remove(this.galacticEquatorLine);
            this.galacticEquatorLine = null;
        }
    }
    
    

    // ============================================
    // LINHAS EXTRAS (PLANETÁRIO): ECLÍPTICA E EQUADOR GALÁCTICO
    // ============================================

    createEclipticLine() {
        // Só no planetário (não no modo jogo)
        if (this.gameMode) return;

        const r = this.sftw.settings.sphereRadius || 1000;
        const eps = 23.43928 * Math.PI / 180; // obliquidade
        const segments = 256;
        const points = [];

        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            // círculo no plano eclíptico, rotacionado para coordenadas equatoriais
            const x = Math.cos(t);
            const y = Math.sin(t) * Math.cos(eps);
            const z = Math.sin(t) * Math.sin(eps);
            points.push(new THREE.Vector3(x, z, -y).multiplyScalar(r)); 
            // Observação: seu sistema usa Y como "up"? Ajuste leve: mantive convenção existente (Z invertido no céu)
        }

        this.eclipticLine = this.createLineFromPoints(points, this.sftw.settings.eclipticColor || 0xffa500, 0.9);
        this.sftw.sceneManager.scene.add(this.eclipticLine);
    }

    createGalacticEquatorLine() {
        // Só no planetário (não no modo jogo)
        if (this.gameMode) return;

        const r = this.sftw.settings.sphereRadius || 1000;
        const segments = 256;
        const points = [];

        // Matriz IAU (J2000): equatorial -> galáctico.
        // Para galáctico -> equatorial usamos a transposta (matriz ortonormal).
        const M = [
            [-0.0548755604, -0.8734370902, -0.4838350155],
            [ 0.4941094279, -0.4448296300,  0.7469822445],
            [-0.8676661490, -0.1980763734,  0.4559837762]
        ];

        function galToEq(vg) {
            // transpose(M) * vg
            const x = M[0][0]*vg[0] + M[1][0]*vg[1] + M[2][0]*vg[2];
            const y = M[0][1]*vg[0] + M[1][1]*vg[1] + M[2][1]*vg[2];
            const z = M[0][2]*vg[0] + M[1][2]*vg[1] + M[2][2]*vg[2];
            return [x,y,z];
        }

        for (let i = 0; i <= segments; i++) {
            const l = (i / segments) * Math.PI * 2;
            const vg = [Math.cos(l), Math.sin(l), 0]; // b=0
            const ve = galToEq(vg);
            // Converter para seu espaço: (x, z, -y) como usado em outras rotinas
            points.push(new THREE.Vector3(ve[0], ve[2], -ve[1]).multiplyScalar(r));
        }

        this.galacticEquatorLine = this.createLineFromPoints(points, 0xff66ff, 0.85);
        this.sftw.sceneManager.scene.add(this.galacticEquatorLine);
    }

    createLineFromPoints(points, color, opacity = 1.0) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: opacity < 1.0,
            opacity
        });
        const line = new THREE.Line(geometry, material);
        this.gridLines.push(line);
        return line;
    }

clearGeodesicBoundaries() {
        this.geodesicLines.forEach((lines) => {
            lines.forEach(line => {
                if (line.geometry) line.geometry.dispose();
                if (line.material) line.material.dispose();
                this.sftw.sceneManager.scene.remove(line);
            });
        });
        this.geodesicLines.clear();
    }
    
    clearConstellationAreas() {
        // Remove meshes e grupos (com dispose recursivo)
        const disposeObject = (obj) => {
            if (!obj) return;

            // Recursão em grupos
            if (obj.children && obj.children.length) {
                // clonar lista para evitar problemas ao remover
                const kids = obj.children.slice();
                for (const child of kids) disposeObject(child);
            }

            if (obj.geometry) obj.geometry.dispose();

            // material pode ser array
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m && m.dispose && m.dispose());
                } else if (obj.material.dispose) {
                    obj.material.dispose();
                }
            }

            try { this.sftw.sceneManager.scene.remove(obj); } catch {}
        };

        this.constellationAreas.forEach(area => disposeObject(area));
        this.constellationAreas.clear();
    }
    
    clearLabels() {
        this.constellationLabels.forEach(label => {
            if (label.material.map) label.material.map.dispose();
            if (label.material) label.material.dispose();
            this.sftw.sceneManager.scene.remove(label);
        });
        this.constellationLabels.clear();
    }
    
    clearStars() {
        this.starMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            this.sftw.sceneManager.scene.remove(mesh);
        });
        this.starMeshes = [];
    }
    
    clearOriginalSegments() {
        this.originalLines.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
            this.sftw.sceneManager.scene.remove(line);
        });
        this.originalLines = [];
    }
    // ============================================================
    // MESSIER: marcadores simples (bolinha vermelha)
    // ============================================================

    _getMessierData() {
        const w = (typeof window !== "undefined") ? window : null;
        const arr = (w && (w.MESSIER_ALL || w.messier_all)) || [];
        return Array.isArray(arr) ? arr : [];
    }

    _getMessierDotTexture() {
        if (this._messierDotTexture) return this._messierDotTexture;

        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, size, size);

        const grd = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
        grd.addColorStop(0.0, "rgba(255, 60, 60, 1.00)");
        grd.addColorStop(0.35, "rgba(255, 60, 60, 0.85)");
        grd.addColorStop(0.70, "rgba(255, 60, 60, 0.20)");
        grd.addColorStop(1.0, "rgba(255, 60, 60, 0.00)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        this._messierDotTexture = tex;
        return tex;
    }

    createMessierMarkers() {
        if (this.messierGroup) return;

        const data = this._getMessierData();
        if (!data.length) return;

        const scene = this.sftw?.sceneManager?.scene;
        if (!scene) return;

        const group = new THREE.Group();
        group.name = "MessierMarkers";
        group.visible = false;
        group.renderOrder = 9999;

        const texture = this._getMessierDotTexture();

        const baseScale = Math.max(12, (this.sftw?.sphereRadius || 1000) * 0.018);


        const R = (this.sftw?.sphereRadius || 1000) * 1.001;
        this._messierRadius = R;
        // Threshold angular padrão (em graus) para detecção de clique.
        // Pode ser ajustado no futuro via UI/slider.
        this._messierPickThresholdDeg = this._messierPickThresholdDeg ?? 1.2;

        data.forEach((obj) => {
            if (!obj || !obj.id) return;

            const ra = Number(obj.ra);
            const dec = Number(obj.dec);
            if (!Number.isFinite(ra) || !Number.isFinite(dec)) return;
            const pos = this.sftw.raDecToVector3(ra, dec, R);

            const mat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false,
            });

            const spr = new THREE.Sprite(mat);
            spr.position.copy(pos);
            spr.scale.set(baseScale, baseScale, 1);

            spr.userData = {
                kind: "messier",
                isMessier: true, // compat com picker legado
                id: String(obj.id),
                name: obj.name || "",
                type: obj.type || "",
                ra, dec,
            };
            // compat adicional (picker antigo espera userData.messier)
            spr.userData.messier = {
                id: spr.userData.id,
                name: spr.userData.name,
                type: spr.userData.type,
                ra: spr.userData.ra,
                dec: spr.userData.dec,
            };

            group.add(spr);
            this.messierSprites.set(String(obj.id).toUpperCase(), spr);
        });

        scene.add(group);

        this.messierGroup = group;

        const initial = !!(this.sftw?.settings && (this.sftw.settings.showMessier === true || this.sftw.settings.messierVisible === true));
        this.setMessierVisible(initial);
    }

    /**
     * Inicializa a camada Messier (cria marcadores + liga interação) de forma segura.
     * Pode ser chamado várias vezes sem duplicar listeners.
     */
    initMessierMarkers() {
        // cria (ou recria) marcadores se ainda não existem
        if (!this.messierGroup) {
            this.messierGroup = new THREE.Group();
            this.messierGroup.name = 'MESSIER_GROUP';
            this.messierGroup.renderOrder = 9999;
            if (this.sceneManager && this.sceneManager.scene) {
                this.sceneManager.scene.add(this.messierGroup);
            }
        }

        // se o grupo está vazio, cria
        if (!this.messierGroup.children || this.messierGroup.children.length === 0) {
            this.createMessierMarkers();
        }

        // aplica visibilidade atual
        this.messierGroup.visible = !!this.messierVisible;

        // liga interação uma única vez
        if (!this._messierClickBound) {
            this._messierClickBound = true;

            // parâmetros do raycaster (sprites/pontos)
            if (this.raycaster && this.raycaster.params) {
                if (!this.raycaster.params.Sprite) this.raycaster.params.Sprite = {};
                // threshold em unidades do mundo (ajuda clique em sprites pequenos)
                this.raycaster.params.Sprite.threshold = this.raycaster.params.Sprite.threshold ?? 0.08;
                if (!this.raycaster.params.Points) this.raycaster.params.Points = {};
                this.raycaster.params.Points.threshold = this.raycaster.params.Points.threshold ?? 0.08;
            }

            const canvas = this._getCanvasElement();
            if (canvas) {
                this._boundMessierClick = (ev) => {
                    const messierActive = (typeof this.sftw?.isMessierGameActive === 'function') ? !!this.sftw.isMessierGameActive() : !!this.messierGame?.active;
                    if (messierActive) return;
                    if (!this.messierVisible) return;

                    // evita spam por "click" duplicado (alguns browsers disparam após drag)
                    const now = performance.now();
                    if (this._lastMessierClickAt && (now - this._lastMessierClickAt) < 120) return;
                    this._lastMessierClickAt = now;

                    const hit = this._pickMessierUnderPointer(ev);
                    if (!hit) return;

                    // debounce por id (não repetir mesma mensagem em sequência)
                    if (hit.id && this._lastMessierToastId === hit.id && this._lastMessierToastAt && (now - this._lastMessierToastAt) < 700) {
                        return;
                    }
                    this._lastMessierToastId = hit.id;
                    this._lastMessierToastAt = now;

                    const label = `${hit.id}${hit.name ? ' — ' + hit.name : ''}${(hit.type ? ' (' + hit.type + ')' : '')}`;
                    if (typeof this.sftw?.showMessage === 'function') {
                        this.sftw.showMessage(label, 'info');
                    }
                };

                canvas.addEventListener('click', this._boundMessierClick);
            }
        }
    }

    /**
     * Alias usado por versões anteriores do código (evita "is not a function").
     */
    ensureMessierLayer() {
        this.initMessierMarkers();
    }


    // ============================================
    // MESSIER GAME (motor da sessão)
    // ============================================

    _getMessierGameCatalog() {
        if (typeof this.sftw?.getMessierAll === 'function') {
            const arr = this.sftw.getMessierAll();
            if (Array.isArray(arr)) return arr.slice();
        }
        return [];
    }

    _normalizeMessierId(id) {
        const raw = String(id || '').trim().toUpperCase().replace(/\s+/g, '');
        if (!raw) return '';
        const m = raw.match(/^M?(\d{1,3})$/);
        if (!m) return raw;
        return `M${Number(m[1])}`;
    }


    syncMessierGameVisuals(state) {
        this.initMessierMarkers();

        const g = state || ((this.sftw?.messierGameController && typeof this.sftw.messierGameController.getGameState === 'function')
            ? this.sftw.messierGameController.getGameState()
            : null);

        if (!this.messierGroup) return;
        if (!g || !g.active) {
            this.messierGroup.visible = !!this.messierVisible;
            this.messierSprites.forEach((spr) => { if (spr) spr.visible = true; });
            return;
        }

        this.messierGroup.visible = true;
        const discovered = new Set(Array.isArray(g.discovered) ? g.discovered.map((x) => this._normalizeMessierId(x)) : []);
        this.messierSprites.forEach((spr, id) => {
            if (!spr) return;
            spr.visible = discovered.has(this._normalizeMessierId(id));
        });
    }

    _buildMessierOrderedIds() {
        const items = this._getMessierGameCatalog();
        return items
            .map(m => this._normalizeMessierId(m.id))
            .filter(Boolean)
            .sort((a, b) => {
                const ai = Number(a.slice(1));
                const bi = Number(b.slice(1));
                return ai - bi;
            });
    }

    _getMessierDirectionById(id) {
        const key = this._normalizeMessierId(id);
        if (!key) return null;

        const item = (typeof this.sftw?.getMessierById === 'function') ? this.sftw.getMessierById(key) : null;
        if (!item || !Number.isFinite(Number(item.ra)) || !Number.isFinite(Number(item.dec))) return null;

        return this.sftw.raDecToVector3(Number(item.ra), Number(item.dec), 1).normalize();
    }

    _emitMessierGameState() {
        // Quando existe um controller canônico do Messier, ele próprio publica callbacks.
        // Evitamos duplicar sinais a partir da Visualization.
        if (this.sftw?.messierGameController) return;

        if (typeof this.sftw?.ui?.onMessierGameStateChanged === 'function') {
            this.sftw.ui.onMessierGameStateChanged(this.getMessierGameState());
        }
    }

    _syncMessierGameVisibility() {
        this.initMessierMarkers();

        // Se já existe controller canônico, a fonte de verdade é o estado dele.
        if (this.sftw?.messierGameController && typeof this.sftw.messierGameController.getGameState === 'function') {
            this.syncMessierGameVisuals(this.sftw.messierGameController.getGameState());
            return;
        }

        if (!this.messierGroup) return;
        if (!this.messierGame.active) {
            this.messierGroup.visible = !!this.messierVisible;
            this.messierSprites.forEach((spr) => {
                if (spr) spr.visible = true;
            });
            return;
        }

        this.messierGroup.visible = true;
        this.messierSprites.forEach((spr, id) => {
            if (!spr) return;
            spr.visible = this.messierGame.discovered.has(id);
        });
    }

    _chooseNextMessierTarget() {
        const g = this.messierGame;
        const ordered = Array.isArray(g.orderedIds) ? g.orderedIds : [];
        const remaining = ordered.filter(id => !g.discovered.has(id));
        if (!remaining.length) {
            g.targetId = null;
            g.active = false;
            g.finished = true;
            return null;
        }

        if (g.manualTargetId) {
            const manual = this._normalizeMessierId(g.manualTargetId);
            if (manual && !g.discovered.has(manual) && ordered.includes(manual)) {
                g.targetId = manual;
                return manual;
            }
        }

        const next = g.randomOrder
            ? remaining[Math.floor(Math.random() * remaining.length)]
            : remaining[0];

        g.targetId = next;
        return next;
    }

    startMessierGame(opts = {}) {
        if (this.sftw?.messierGameController && typeof this.sftw.messierGameController.startGame === 'function') {
            return this.sftw.messierGameController.startGame(opts);
        }

        if (this.gameMode) return false; // fallback antigo
        const catalog = this._buildMessierOrderedIds();
        if (!catalog.length) return false;

        const g = this.messierGame;
        g.active = true;
        g.finished = false;
        g.randomOrder = !!opts.randomOrder;
        g.autoAdvance = (opts.autoAdvance !== undefined) ? !!opts.autoAdvance : true;
        g.showErrorHint = (opts.showErrorHint !== undefined) ? !!opts.showErrorHint : true;
        const tol = Number(opts.toleranceDeg);
        g.toleranceDeg = (Number.isFinite(tol) && tol > 0) ? tol : 1.2;
        g.manualTargetId = this._normalizeMessierId(opts.manualTargetId || opts.targetId || '');
        g.totalErrors = 0;
        g.errorsById = {};
        g.discovered = new Set();
        g.orderedIds = catalog;
        g.lastAngleErrorDeg = null;
        g.startedAt = Date.now();

        this._chooseNextMessierTarget();
        this._syncMessierGameVisibility();
        this._emitMessierGameState();
        return true;
    }

    stopMessierGame(opts = {}) {
        if (this.sftw?.messierGameController && typeof this.sftw.messierGameController.stopGame === 'function') {
            return this.sftw.messierGameController.stopGame(opts);
        }

        const g = this.messierGame;
        if (!g.active && !g.finished) return false;

        g.active = false;
        g.finished = false;
        g.targetId = null;
        g.manualTargetId = null;
        g.lastAngleErrorDeg = null;

        const restoreVisible = (opts && typeof opts === 'object' && 'restoreVisible' in opts)
            ? !!opts.restoreVisible
            : !!this.messierVisible;

        this.messierVisible = restoreVisible;
        this._syncMessierGameVisibility();
        this._emitMessierGameState();
        return true;
    }

    setMessierGameOptions(opts = {}) {
        if (this.sftw?.messierGameController && typeof this.sftw.messierGameController.applyConfiguration === 'function') {
            this.sftw.messierGameController.applyConfiguration(opts);
            return true;
        }

        const g = this.messierGame;
        if ('randomOrder' in opts) g.randomOrder = !!opts.randomOrder;
        if ('autoAdvance' in opts) g.autoAdvance = !!opts.autoAdvance;
        if ('showErrorHint' in opts) g.showErrorHint = !!opts.showErrorHint;

        const tol = Number(opts.toleranceDeg);
        if (Number.isFinite(tol) && tol > 0) g.toleranceDeg = tol;

        if ('manualTargetId' in opts || 'targetId' in opts) {
            g.manualTargetId = this._normalizeMessierId(opts.manualTargetId || opts.targetId || '');
            if (g.active) this._chooseNextMessierTarget();
        }

        this._emitMessierGameState();
        return true;
    }

    setMessierGameTarget(id) {
        if (this.sftw?.messierGameController && typeof this.sftw.messierGameController.setManualTarget === 'function') {
            return this.sftw.messierGameController.setManualTarget(id);
        }

        const key = this._normalizeMessierId(id);
        if (!key) return false;

        const exists = !!this._getMessierDirectionById(key);
        if (!exists) return false;

        this.messierGame.manualTargetId = key;
        if (this.messierGame.active) this.messierGame.targetId = key;
        this._emitMessierGameState();
        return true;
    }

    isMessierGameActive() {
        if (this.sftw?.messierGameController && typeof this.sftw.messierGameController.isActive === 'function') {
            return !!this.sftw.messierGameController.isActive();
        }
        return !!this.messierGame.active;
    }

    getMessierGameState() {
        if (this.sftw?.messierGameController && typeof this.sftw.messierGameController.getGameState === 'function') {
            return this.sftw.messierGameController.getGameState();
        }

        const g = this.messierGame;
        const totalCount = Array.isArray(g.orderedIds) && g.orderedIds.length ? g.orderedIds.length : this._buildMessierOrderedIds().length;
        const discovered = Array.from(g.discovered || []);
        return {
            active: !!g.active,
            finished: !!g.finished,
            targetId: g.targetId || null,
            manualTargetId: g.manualTargetId || null,
            randomOrder: !!g.randomOrder,
            autoAdvance: !!g.autoAdvance,
            showErrorHint: !!g.showErrorHint,
            toleranceDeg: Number(g.toleranceDeg || 1.2),
            totalErrors: Number(g.totalErrors || 0),
            errorsById: { ...(g.errorsById || {}) },
            discovered,
            discoveredCount: discovered.length,
            remainingCount: Math.max(0, totalCount - discovered.length),
            totalCount,
            lastAngleErrorDeg: g.lastAngleErrorDeg,
            startedAt: g.startedAt || 0
        };
    }

    _processMessierGameClick(event) {
        const state = this.getMessierGameState();
        if (!state?.active || !state?.targetId) return false;

        const targetDir = this._getMessierDirectionById(state.targetId);
        if (!targetDir) return false;

        const canvas = this.sftw.sceneManager.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.sftw.sceneManager.camera);

        const clickDir = this._getClickDirFromCurrentRay();
        if (!clickDir) return false;

        const dot = Math.max(-1, Math.min(1, clickDir.dot(targetDir)));
        const angDeg = Math.acos(dot) * 180 / Math.PI;

        if (typeof this.sftw?.submitMessierAngleError === 'function') {
            this.sftw.submitMessierAngleError(angDeg);
            return true;
        }

        // Fallback local antigo
        const g = this.messierGame;
        if (angDeg <= g.toleranceDeg) {
            const id = g.targetId;
            g.discovered.add(id);
            g.lastAngleErrorDeg = null;

            if (g.autoAdvance) {
                this._chooseNextMessierTarget();
            }

            this._syncMessierGameVisibility();
            this._emitMessierGameState();
            return true;
        }

        g.totalErrors += 1;
        g.errorsById[g.targetId] = Number(g.errorsById[g.targetId] || 0) + 1;
        g.lastAngleErrorDeg = angDeg;
        this._emitMessierGameState();
        return true;
    }


    setMessierVisible(isVisible) {
        const want = !!isVisible;
        this.messierVisible = want;

        // ✅ Isolamento do modo jogo: durante o jogo, Messier deve ficar oculto
        // (mas a UI pode continuar alterando o "desejado", que será restaurado ao sair do jogo).
        if (this.gameMode) {
            this._messierWantedDuringGame = want;
            if (this.messierGroup) this.messierGroup.visible = false;
            return;
        }
        this._messierWantedDuringGame = null;

        // garante criação (e listeners) antes de aplicar visibilidade
        this.initMessierMarkers();
        if (this.messierGame?.active) {
            this._syncMessierGameVisibility();
        } else if (this.messierGroup) {
            this.messierGroup.visible = want;
        }
    }

    toggleMessier() {
        this.setMessierVisible(!this.messierVisible);
    }
    _pickMessierUnderPointer(ev) {
        try {
            const sm = this.sftw?.sceneManager;
            const renderer = sm?.renderer;
            const camera = sm?.camera;
            if (!renderer || !camera || !this.raycaster || !this.mouse) return null;

            // Atualiza NDC do mouse (usa o clique)
            if (!ev || ev.clientX == null || ev.clientY == null) return null;
            const rect = renderer.domElement.getBoundingClientRect();
            const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
            this.mouse.set(x, y);

            // Gera raio a partir da câmera
            this.raycaster.setFromCamera(this.mouse, camera);

            const group = this.messierGroup;
            if (!group || !group.visible) return null;

            // ===== Interseção com a esfera celeste =====
            // Em vez de confiar no Raycaster com Sprite (pode falhar dependendo de camera/controls),
            // projetamos o clique para o ponto mais próximo na esfera e escolhemos o Messier mais perto.
            const R = this._messierRadius || 99.5; // deve bater com o raio usado na criação
            const o = this.raycaster.ray.origin.clone();
            const d = this.raycaster.ray.direction.clone().normalize();

            // Resolver |o + t d|^2 = R^2
            const a = d.dot(d); // =1
            const b = 2 * o.dot(d);
            const c = o.dot(o) - R * R;
            const disc = b*b - 4*a*c;
            if (disc < 0) return null;

            const sqrtDisc = Math.sqrt(disc);
            const t1 = (-b - sqrtDisc) / (2*a);
            const t2 = (-b + sqrtDisc) / (2*a);
            const t = (t1 > 0) ? t1 : (t2 > 0 ? t2 : null);
            if (t == null) return null;

            const p = o.add(d.multiplyScalar(t)).normalize(); // direção na esfera

            // Threshold angular (rad). Ajuste: ~1.2° funciona bem com bolinha pequena.
            const thr = (this._messierPickThresholdDeg ?? 1.2) * Math.PI / 180;

            let best = null;
            let bestAng = Infinity;

            group.traverse(obj => {
                if (!obj || !obj.userData) return;
                const ud = obj.userData;
                const isMh = (ud.kind === 'messier') || (ud.isMessier === true) || !!ud.messier;
                if (!isMh) return;
                const m = obj.userData.messier;
                if (!m) return;

                const q = obj.position.clone().normalize();
                const dot = Math.max(-1, Math.min(1, p.dot(q)));
                const ang = Math.acos(dot);

                if (ang < bestAng) {
                    bestAng = ang;
                    best = m;
                }
            });

            if (!best) return null;
            if (bestAng > thr) return null;

            return best;
        } catch (err) {
            console.warn('⚠️ _pickMessierUnderPointer falhou:', err);
            return null;
        }
    }

    focusOnMessier(id) {
        const key = String(id || "").toUpperCase();
        const spr = this.messierSprites.get(key);
        if (!spr) return false;

        this.setMessierVisible(true);

        const target = spr.position.clone().normalize();

        if (typeof this.sftw?.focusOnVector === "function") {
            this.sftw.focusOnVector(target);
            return true;
        }

        const controls = this.sftw?.sceneManager?.controls;
        const cam = this.sftw?.sceneManager?.camera;
        if (controls && cam) {
            const dist = cam.position.length();
            cam.position.copy(target.multiplyScalar(dist));
            cam.lookAt(0, 0, 0);
            controls.update();
            return true;
        }

        return false;
    }



    // ============================================
    // ASTERISM GAME - LIGAR PONTOS
    // ============================================

    _ensureAsterismGameOverlay() {
        const scene = this.sftw?.sceneManager?.scene;
        if (!scene) return false;

        if (!this.asterismGameOverlay) {
            this.asterismGameOverlay = new THREE.Group();
            this.asterismGameOverlay.name = 'AsterismGameOverlay';
            scene.add(this.asterismGameOverlay);
        }
        if (!this.asterismGameTargetGroup) {
            this.asterismGameTargetGroup = new THREE.Group();
            this.asterismGameTargetGroup.name = 'AsterismGameTargetGroup';
            this.asterismGameOverlay.add(this.asterismGameTargetGroup);
        }
        if (!this.asterismGameSolvedGroup) {
            this.asterismGameSolvedGroup = new THREE.Group();
            this.asterismGameSolvedGroup.name = 'AsterismGameSolvedGroup';
            this.asterismGameOverlay.add(this.asterismGameSolvedGroup);
        }
        if (!this.asterismGameUserGroup) {
            this.asterismGameUserGroup = new THREE.Group();
            this.asterismGameUserGroup.name = 'AsterismGameUserGroup';
            this.asterismGameOverlay.add(this.asterismGameUserGroup);
        }
        if (!this.asterismGamePendingGroup) {
            this.asterismGamePendingGroup = new THREE.Group();
            this.asterismGamePendingGroup.name = 'AsterismGamePendingGroup';
            this.asterismGameOverlay.add(this.asterismGamePendingGroup);
        }
        return true;
    }

    _clearThreeGroup(group) {
        if (!group) return;
        const children = group.children ? group.children.slice() : [];
        for (const child of children) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat?.map) mat.map.dispose();
                        mat?.dispose?.();
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
            group.remove(child);
        }
    }

    _makeAsterismResolvedStarKey(star) {
        const con = star?.con || star?.constellation || "";
        const name = star?.name || "star";
        const ra = Number(star?.ra || 0).toFixed(6);
        const dec = Number(star?.dec || 0).toFixed(6);
        return `${con}|${name}|${ra}|${dec}`;
    }

    _getCurrentAsterismGameTargetData() {
        const state = (typeof this.sftw?.getAsterismGameState === 'function')
            ? this.sftw.getAsterismGameState()
            : null;
        const targetId = state?.currentAsterismId || state?.targetId || null;
        if (!targetId) return null;

        const asterism = (typeof this.sftw?.getAsterismById === 'function')
            ? this.sftw.getAsterismById(targetId)
            : null;
        if (!asterism || !asterism.isPlayable) return null;

        return { state, targetId: String(targetId), asterism };
    }

    _findAsterismGameStarHit(event) {
        const hit = this._pickStarUnderPointer?.(event);
        if (!hit) return null;

        const key = this._makeAsterismResolvedStarKey(hit);
        if (!this.asterismGameState.allowedStarKeys.has(key)) return null;

        const targetItem = this.asterismGameState.starMap.get(key) || null;
        return {
            ...hit,
            asterismKey: key,
            targetItem
        };
    }

    _drawAsterismGameLine(p1, p2, color = 0x00e5ff, opacity = 0.98, group = null) {
        const host = group || this.asterismGameUserGroup;
        if (!host) return null;
        const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false
        });
        const line = new THREE.Line(geometry, material);
        host.add(line);
        return line;
    }

    _drawAsterismGameMarker(position, color = 0x7dd3fc, radius = 1.8, group = null) {
        const host = group || this.asterismGameTargetGroup;
        if (!host) return null;
        const geometry = new THREE.SphereGeometry(radius, 12, 12);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.92,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        host.add(mesh);
        return mesh;
    }

    _setPendingAsterismGameStar(starHit = null) {
        this._ensureAsterismGameOverlay();
        this._clearThreeGroup(this.asterismGamePendingGroup);
        this.asterismGameState.selectedStarKey = starHit?.asterismKey || null;

        if (!starHit) return;
        const pos = this.sftw.raDecToVector3(starHit.ra, starHit.dec, this.sftw.settings.sphereRadius - 0.7);
        this._drawAsterismGameMarker(pos, 0x22c55e, 2.25, this.asterismGamePendingGroup);
    }

    _cloneAsterismSegments(segments = []) {
        return Array.isArray(segments)
            ? segments
                .filter(seg => seg && seg.aKey && seg.bKey)
                .map(seg => ({ aKey: seg.aKey, bKey: seg.bKey }))
            : [];
    }

    _isAsterismTargetSolved(targetId = null) {
        const key = String(targetId || this.asterismGameState?.targetId || '').trim();
        if (!key) return false;
        return !!this.asterismGameState?.solvedTargetIds?.has?.(key);
    }

    _commitCurrentAsterismAsSolved(targetId = null) {
        const key = String(targetId || this.asterismGameState?.targetId || '').trim();
        if (!key) return false;

        const solvedSegments = this._cloneAsterismSegments(this.asterismGameState?.userSegments || []);
        if (!solvedSegments.length) return false;

        this.asterismGameState.solvedSegmentsByTarget.set(key, solvedSegments);
        this.asterismGameState.solvedTargetIds.add(key);
        return true;
    }

    _drawSolvedAsterismGameLine(p1, p2, group = null) {
        const host = group || this.asterismGameSolvedGroup;
        if (!host) return;

        // Camada externa: halo suave, levemente mais afastado da esfera.
        this._drawAsterismGameLine(p1.clone().multiplyScalar(1.00055), p2.clone().multiplyScalar(1.00055), 0x86efac, 0.34, host);
        // Camada intermediária: verde vivo para dar presença visual no céu.
        this._drawAsterismGameLine(p1.clone().multiplyScalar(1.0003), p2.clone().multiplyScalar(1.0003), 0x22c55e, 0.92, host);
        // Núcleo: linha principal mais escura para leitura do traçado.
        this._drawAsterismGameLine(p1, p2, 0x15803d, 1.0, host);
    }

    _rebuildSolvedAsterismGameLines() {
        this._ensureAsterismGameOverlay();
        this._clearThreeGroup(this.asterismGameSolvedGroup);

        const entries = this.asterismGameState?.solvedSegmentsByTarget?.entries?.();
        if (!entries) return;

        const solvedVertexKeys = new Set();

        for (const [, segments] of entries) {
            for (const seg of segments || []) {
                const a = this.asterismGameState.starMap.get(seg.aKey);
                const b = this.asterismGameState.starMap.get(seg.bKey);
                const sa = a?.star || a || null;
                const sb = b?.star || b || null;
                if (!sa || !sb) continue;

                const p1 = this.sftw.raDecToVector3(sa.ra, sa.dec, this.sftw.settings.sphereRadius - 0.72);
                const p2 = this.sftw.raDecToVector3(sb.ra, sb.dec, this.sftw.settings.sphereRadius - 0.72);
                this._drawSolvedAsterismGameLine(p1, p2, this.asterismGameSolvedGroup);

                solvedVertexKeys.add(seg.aKey);
                solvedVertexKeys.add(seg.bKey);
            }
        }

        for (const key of solvedVertexKeys) {
            const item = this.asterismGameState.starMap.get(key);
            const star = item?.star || item || null;
            if (!star) continue;

            const pos = this.sftw.raDecToVector3(star.ra, star.dec, this.sftw.settings.sphereRadius - 0.68);
            this._drawAsterismGameMarker(pos, 0x14532d, 1.25, this.asterismGameSolvedGroup);
            this._drawAsterismGameMarker(pos, 0x4ade80, 1.95, this.asterismGameSolvedGroup);
        }
    }

    _rebuildAsterismGameUserLines() {
        this._ensureAsterismGameOverlay();
        this._clearThreeGroup(this.asterismGameUserGroup);

        const isSolved = !!this.asterismGameState.isSolvedVisual;
        const lineColor = isSolved ? 0x22c55e : 0x00e5ff;
        const lineOpacity = isSolved ? 1.0 : 0.98;
        const haloColor = isSolved ? 0x86efac : 0x67e8f9;
        const haloOpacity = isSolved ? 0.28 : 0.18;

        for (const seg of this.asterismGameState.userSegments) {
            const a = this.asterismGameState.starMap.get(seg.aKey);
            const b = this.asterismGameState.starMap.get(seg.bKey);
            const sa = a?.star || a || null;
            const sb = b?.star || b || null;
            if (!sa || !sb) continue;

            const p1 = this.sftw.raDecToVector3(sa.ra, sa.dec, this.sftw.settings.sphereRadius - 0.7);
            const p2 = this.sftw.raDecToVector3(sb.ra, sb.dec, this.sftw.settings.sphereRadius - 0.7);
            this._drawAsterismGameLine(p1.clone().multiplyScalar(1.00025), p2.clone().multiplyScalar(1.00025), haloColor, haloOpacity, this.asterismGameUserGroup);
            this._drawAsterismGameLine(p1, p2, lineColor, lineOpacity, this.asterismGameUserGroup);
        }
    }

    clearAsterismGameVisuals() {
        this.asterismGameState = {
            targetId: null,
            selectedStarKey: null,
            userSegments: [],
            solvedSegmentsByTarget: new Map(),
            solvedTargetIds: new Set(),
            allowedStarKeys: new Set(),
            starMap: new Map(),
            isSolvedVisual: false,
            lastSubmissionResult: null
        };
        this._clearThreeGroup(this.asterismGameTargetGroup);
        this._clearThreeGroup(this.asterismGameSolvedGroup);
        this._clearThreeGroup(this.asterismGameUserGroup);
        this._clearThreeGroup(this.asterismGamePendingGroup);
        return true;
    }

    syncAsterismGameVisuals(state = null) {
        const payload = this._getCurrentAsterismGameTargetData();
        if (!payload) {
            this.clearAsterismGameVisuals();
            return false;
        }

        const { targetId, asterism } = payload;
        this._ensureAsterismGameOverlay();

        if (this.asterismGameState.targetId !== targetId) {
            const previousSegments = Array.isArray(this.asterismGameState.userSegments)
                ? this.asterismGameState.userSegments.slice()
                : [];
            const previousSolvedSegmentsByTarget = new Map(this.asterismGameState?.solvedSegmentsByTarget || []);
            const previousSolvedTargetIds = new Set(this.asterismGameState?.solvedTargetIds || []);

            this.clearAsterismGameVisuals();
            this.asterismGameState.targetId = targetId;
            this.asterismGameState.solvedSegmentsByTarget = previousSolvedSegmentsByTarget;
            this.asterismGameState.solvedTargetIds = previousSolvedTargetIds;

            const starMap = new Map();

            // Todas as estrelas ficam clicáveis no jogo.
            // O starMap serve apenas para reconstrução visual dos segmentos já montados.
            for (const star of (this.sftw?.stars || [])) {
                if (!star) continue;
                const key = this._makeAsterismResolvedStarKey(star);
                starMap.set(key, { star, localId: key, key });
            }

            this.asterismGameState.starMap = starMap;
            this.asterismGameState.allowedStarKeys = new Set(starMap.keys());
            this.asterismGameState.userSegments = previousSegments.filter(
                (seg) => starMap.has(seg?.aKey) && starMap.has(seg?.bKey)
            );

            for (const [solvedId, solvedSegments] of Array.from(this.asterismGameState.solvedSegmentsByTarget.entries())) {
                const filtered = this._cloneAsterismSegments(solvedSegments).filter(
                    (seg) => starMap.has(seg?.aKey) && starMap.has(seg?.bKey)
                );
                if (filtered.length) {
                    this.asterismGameState.solvedSegmentsByTarget.set(solvedId, filtered);
                } else {
                    this.asterismGameState.solvedSegmentsByTarget.delete(solvedId);
                    this.asterismGameState.solvedTargetIds.delete(solvedId);
                }
            }

            if (this._isAsterismTargetSolved(targetId)) {
                this.asterismGameState.userSegments = [];
                this.asterismGameState.isSolvedVisual = false;
            }

            this._rebuildSolvedAsterismGameLines();
            this._rebuildAsterismGameUserLines();
            this._setPendingAsterismGameStar(null);
        }

        return true;
    }

    _processAsterismGameClick(event) {
        const payload = this._getCurrentAsterismGameTargetData();
        if (!payload) return false;

        this.syncAsterismGameVisuals();

        if (this._isAsterismTargetSolved(payload.targetId)) {
            this.sftw?.ui?.showMessage?.('Esse asterismo já foi concluído e ficou salvo no céu.', 'info', 1300, {
                replaceKey: 'asterism-play',
                replaceActive: true,
                skipQueue: true
            });
            return true;
        }

        const hit = this._pickStarUnderPointer?.(event);
        if (!hit) {
            this.sftw?.ui?.showMessage?.('Clique em uma estrela para montar um par.', 'warning', 1200, {
                replaceKey: 'asterism-play',
                replaceActive: true,
                skipQueue: true
            });
            return true;
        }

        const hitKey = this._makeAsterismResolvedStarKey(hit);
        const prevKey = this.asterismGameState.selectedStarKey;

        if (!prevKey) {
            this._setPendingAsterismGameStar({
                ...hit,
                asterismKey: hitKey
            });
            this.sftw?.ui?.showMessage?.('Primeiro ponto marcado. Escolha o segundo ponto do segmento.', 'info', 1100, {
                replaceKey: 'asterism-play',
                replaceActive: true,
                skipQueue: true
            });
            return true;
        }

        if (prevKey === hitKey) {
            this._setPendingAsterismGameStar(null);
            this.sftw?.ui?.showMessage?.('Par cancelado.', 'info', 900, {
                replaceKey: 'asterism-play',
                replaceActive: true,
                skipQueue: true
            });
            return true;
        }

        const canonical = [prevKey, hitKey].sort().join('::');
        const exists = this.asterismGameState.userSegments.some(
            seg => [seg.aKey, seg.bKey].sort().join('::') === canonical
        );

        if (exists) {
            this._setPendingAsterismGameStar(null);
            this.sftw?.ui?.showMessage?.('Esse segmento já foi marcado.', 'warning', 1000, {
                replaceKey: 'asterism-play',
                replaceActive: true,
                skipQueue: true
            });
            return true;
        }

        this.asterismGameState.userSegments.push({
            aKey: prevKey,
            bKey: hitKey
        });
        this.asterismGameState.isSolvedVisual = false;
        this.asterismGameState.lastSubmissionResult = null;

        this._rebuildAsterismGameUserLines();
        this._setPendingAsterismGameStar(null);

        const count = this.asterismGameState.userSegments.length;
        this.sftw?.ui?.showMessage?.(`Segmento ${count} criado.`, 'success', 900, {
            replaceKey: 'asterism-play',
            replaceActive: true,
            skipQueue: true
        });

        return true;
    }

    focusCurrentAsterismGameTarget() {
        const payload = this._getCurrentAsterismGameTargetData();
        if (!payload) return false;
        return this.focusOnAsterism(payload.targetId);
    }

    getAsterismGameUserSegments() {
        return Array.isArray(this.asterismGameState?.userSegments)
            ? this.asterismGameState.userSegments.map((seg) => ({ aKey: seg?.aKey, bKey: seg?.bKey }))
            : [];
    }

    _resetAsterismSolvedVisualState() {
        this.asterismGameState.isSolvedVisual = false;
        this.asterismGameState.lastSubmissionResult = null;
    }

    undoLastAsterismGameSegment() {
        this.syncAsterismGameVisuals();

        const hasPending = !!this.asterismGameState?.selectedStarKey;
        const segments = this.asterismGameState?.userSegments;

        if (hasPending) {
            this._setPendingAsterismGameStar(null);
            this._resetAsterismSolvedVisualState();
            this._rebuildAsterismGameUserLines();
            return true;
        }

        if (!Array.isArray(segments) || !segments.length) {
            return false;
        }

        segments.pop();
        this._setPendingAsterismGameStar(null);
        this._resetAsterismSolvedVisualState();
        this._rebuildAsterismGameUserLines();
        return true;
    }

    clearCurrentAsterismGameSegments() {
        this.syncAsterismGameVisuals();

        const hadPending = !!this.asterismGameState?.selectedStarKey;
        const hadSegments = Array.isArray(this.asterismGameState?.userSegments) && this.asterismGameState.userSegments.length > 0;

        if (!hadPending && !hadSegments) {
            return false;
        }

        this.asterismGameState.userSegments = [];
        this._setPendingAsterismGameStar(null);
        this._resetAsterismSolvedVisualState();
        this._rebuildAsterismGameUserLines();
        return true;
    }

    submitCurrentAsterismGameSegments() {
        this.syncAsterismGameVisuals();

        const segments = this.getAsterismGameUserSegments();
        if (!segments.length) {
            return null;
        }

        if (typeof this.sftw?.submitAsterismSegments !== 'function') {
            return null;
        }

        const result = this.sftw.submitAsterismSegments(segments);
        if (!result || result.ok === false) {
            return result || null;
        }

        this.asterismGameState.lastSubmissionResult = result;
        this.asterismGameState.isSolvedVisual = !!(result?.isCorrect || result?.result?.isCorrect || result?.result?.isPerfect || result?.isPerfect);

        if (this.asterismGameState.isSolvedVisual) {
            this._commitCurrentAsterismAsSolved(this.asterismGameState.targetId);
            this.asterismGameState.userSegments = [];
            this.asterismGameState.isSolvedVisual = false;
            this._rebuildSolvedAsterismGameLines();
        }

        this._setPendingAsterismGameStar(null);
        this._rebuildAsterismGameUserLines();

        return result;
    }


    cleanup() {
        this.clearGeodesicBoundaries();
        this.clearConstellationAreas();
        this.clearLabels();
        this.clearStars();
        this.clearGrid();
        this.clearOriginalSegments();
        this.clearAsterismLayer();
        
        this.hideConstellationInfo();
        
        const infoStyles = document.getElementById('info-container-styles');
        if (infoStyles) infoStyles.remove();
        
        const canvas = this._getCanvasElement();
        if (canvas) {
            this._removePrimaryInteractionBindings(canvas);
            this._removeMessierInteractionBindings(canvas);
            canvas.style.cursor = 'default';
        }

        if (this._starStudyFilterPollTimer) {
            clearInterval(this._starStudyFilterPollTimer);
            this._starStudyFilterPollTimer = null;
        }
        
        this.gameMode = false;
        this.selectedConstellation = null;
        this.currentInfoConstellation = null;
        this.currentInfoStar = null;
        this.currentInfoType = null;

        this.messierGame = this._createDefaultMessierGameState();

        // Estudo de estrelas (filtros aplicados pela aba "Estrelas")
        this.starStudyFilter = {
            enabled: false,
            namedOnly: true,
            magnitudeMax: 3.5,
            constellation: ''
        };
        this._starStudyFilterUIBound = false;
        this._starStudyFilterPollTimer = null;
        this.highlightedConstellation = null;
    }
}

// ============================================
// EXPORTAÇÃO E INJEÇÃO
// ============================================

if (typeof window !== 'undefined') {
    window.Sftw1_Visualization = Sftw1_Visualization;
    
    Sftw1.injectVisualizationMethods = function(sftwInstance) {
        const visualization = new Sftw1_Visualization(sftwInstance);
        
        sftwInstance.createCelestialSphere = () => visualization.createCelestialSphere();
        sftwInstance.createCoordinateGrid = () => visualization.createCoordinateGrid();
        sftwInstance.createConstellationBoundaries = () => visualization.createConstellationBoundaries();
        sftwInstance.createStars = () => visualization.createStars();
        sftwInstance.createMessierMarkers = () => visualization.createMessierMarkers();
        sftwInstance.createTestSegmentVisualization = () => visualization.createTestSegmentVisualization();
        
        sftwInstance.toggleGrid = () => visualization.toggleGrid();
        sftwInstance.toggleBoundaries = () => visualization.toggleBoundaries();
        sftwInstance.toggleLabels = () => visualization.toggleLabels();
        sftwInstance.toggleStars = () => visualization.toggleStars();
        sftwInstance.toggleMessier = () => visualization.toggleMessier();
        sftwInstance.setMessierVisible = (v) => visualization.setMessierVisible(v);
        sftwInstance.setAsterismsVisible = (v) => visualization.setAsterismsVisible(v);
        sftwInstance.setAsterismLabelsVisible = (v) => visualization.setAsterismLabelsVisible(v);
        sftwInstance.focusOnMessier = (id) => visualization.focusOnMessier(id);
        sftwInstance.syncMessierGameVisuals = (state) => visualization.syncMessierGameVisuals(state);

        // Wrappers defensivos: preferem o controller canônico do Messier quando ele existir.
        sftwInstance.startMessierGame = (opts) => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.startGame === 'function') {
                return sftwInstance.messierGameController.startGame(opts);
            }
            return visualization.startMessierGame(opts);
        };
        sftwInstance.stopMessierGame = (opts) => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.stopGame === 'function') {
                return sftwInstance.messierGameController.stopGame(opts);
            }
            return visualization.stopMessierGame(opts);
        };
        sftwInstance.endMessierGame = (opts) => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.endGame === 'function') {
                return sftwInstance.messierGameController.endGame(opts);
            }
            return visualization.stopMessierGame(opts);
        };
        sftwInstance.restartMessierGame = (opts) => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.restartGame === 'function') {
                return sftwInstance.messierGameController.restartGame(opts);
            }
            visualization.stopMessierGame({ restoreVisible: false });
            return visualization.startMessierGame(opts);
        };
        sftwInstance.getMessierGameState = () => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.getGameState === 'function') {
                return sftwInstance.messierGameController.getGameState();
            }
            return visualization.getMessierGameState();
        };
        sftwInstance.setMessierGameOptions = (opts) => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.applyConfiguration === 'function') {
                return sftwInstance.messierGameController.applyConfiguration(opts);
            }
            return visualization.setMessierGameOptions(opts);
        };
        sftwInstance.setMessierGameTarget = (id) => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.setManualTarget === 'function') {
                return sftwInstance.messierGameController.setManualTarget(id);
            }
            return visualization.setMessierGameTarget(id);
        };
        sftwInstance.setMessierManualTarget = (id) => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.setManualTarget === 'function') {
                return sftwInstance.messierGameController.setManualTarget(id);
            }
            return visualization.setMessierGameTarget(id);
        };
        sftwInstance.isMessierGameActive = () => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.isActive === 'function') {
                return !!sftwInstance.messierGameController.isActive();
            }
            return visualization.isMessierGameActive();
        };
        sftwInstance.submitMessierAngleError = (deg) => {
            if (sftwInstance.messierGameController && typeof sftwInstance.messierGameController.submitAngleError === 'function') {
                return sftwInstance.messierGameController.submitAngleError(deg);
            }
            return false;
        };
        sftwInstance.toggleSegments = () => visualization.toggleSegments();
        
        sftwInstance.hideAllConstellations = () => visualization.hideAllConstellations();
        sftwInstance.showOnlyConstellation = (abbr) => visualization.showOnlyConstellation(abbr);
        sftwInstance.showConstellation = (abbr) => visualization.showConstellation(abbr);
        sftwInstance.showConstellationAsDark = (abbr) => visualization.showConstellationAsDark(abbr);
        sftwInstance.restoreConstellationAppearance = (abbr) => visualization.restoreConstellationAppearance(abbr);
        sftwInstance.focusOnConstellation = (abbr) => visualization.focusOnConstellation(abbr);
        sftwInstance.getStarUnderPointer = (ev) => visualization._pickStarUnderPointer(ev);
        
        sftwInstance.updateAllLabels = (nameType) => visualization.updateAllLabels(nameType);

        // Opções configuráveis do modo jogo (UI)
        sftwInstance.setGameOptions = (opts) => visualization.setGameOptions(opts);
        sftwInstance.setGameRevealedSet = (revealed) => visualization.setGameRevealedSet(revealed);
        
        sftwInstance.startGameMode = (constellationAbbr) =>
            visualization.startGameMode(constellationAbbr);
        sftwInstance.endGameMode = () => visualization.endGameMode();
        
        sftwInstance.visualization = visualization;
        
        console.log('✅ Visualization injetado (TODAS CORREÇÕES)');
    };
    
    console.log('✅ Sftw1_Visualization.js carregado (VERSÃO 100% CORRIGIDA)');
}