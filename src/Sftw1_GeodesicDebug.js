// Sftw1_GeodesicDebug.js - VERSÃO SEGURA (SEM TRIÂNGULOS)
// Objetivo: Debug limpo e focado

class Sftw1_GeodesicDebug {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;
        this.debugObjects = [];
        this.active = false;
    }
    
    // ============================================
    // INICIALIZAÇÃO SEGURA
    // ============================================
    
    initialize() {
        if (this.active) {
            console.warn('⚠️ Debug já está ativo');
            return;
        }
        
        console.log('🔧 Iniciando Debug Geodésico SEGURO...');
        this.clearDebug();
        this.active = true;
        
        // NÃO criar esfera automática - deixa isso para o renderizador principal
        this.setupMinimalUI();
        
        console.log('✅ Debug pronto. Use métodos específicos para testes.');
    }
    
    // ============================================
    // TESTE DIRETO DOS DADOS BRUTOS (SEM INTERPRETAÇÃO)
    // ============================================
    
    testRawBoundaryData() {
        console.log('📊 Testando DADOS BRUTOS do boundaries.dat...');
        
        // 1. Verificar estrutura dos dados
        if (!this.sftw.dataLoader || !this.sftw.dataLoader.constellationBoundaries) {
            console.error('❌ Dados não carregados ou formato incorreto');
            return;
        }
        
        const boundaries = this.sftw.dataLoader.constellationBoundaries;
        
        console.log(`📦 ${boundaries.size} constelações carregadas`);
        
        // 2. Mostrar estatísticas
        boundaries.forEach((polylines, abbr) => {
            const segmentCount = polylines.reduce((sum, poly) => sum + (poly.length - 1), 0);
            const pointCount = polylines.reduce((sum, poly) => sum + poly.length, 0);
            
            console.log(`   ${abbr}: ${polylines.length} polilinhas, ${segmentCount} segmentos, ${pointCount} pontos`);
            
            // Detectar possíveis triângulos acidentais
            this.detectAccidentalTriangles(abbr, polylines);
        });
        
        // 3. Visualizar APENAS uma constelação para teste
        this.visualizeSingleConstellation('Ori'); // Órion como exemplo
    }
    
    detectAccidentalTriangles(abbr, polylines) {
        // Verificar se há polilinhas com exatamente 3 pontos
        const triangles = polylines.filter(poly => poly.length === 3);
        
        if (triangles.length > 0) {
            console.warn(`   ⚠️  ${abbr}: ${triangles.length} polilinhas com 3 pontos (suspeito!)`);
            
            // Analisar cada triângulo suspeito
            triangles.forEach((triangle, index) => {
                const [p1, p2, p3] = triangle;
                const distances = [
                    this.angularDistance(p1.ra, p1.dec, p2.ra, p2.dec),
                    this.angularDistance(p2.ra, p2.dec, p3.ra, p3.dec),
                    this.angularDistance(p3.ra, p3.dec, p1.ra, p1.dec)
                ];
                
                // Verificar se é aproximadamente equilátero
                const avg = distances.reduce((a, b) => a + b) / 3;
                const isRegular = distances.every(d => Math.abs(d - avg) < 0.1);
                
                if (isRegular) {
                    console.warn(`     🚨 Triângulo regular detectado em ${abbr}-${index}: lados ~${avg.toFixed(2)}°`);
                }
            });
        }
    }
    
    visualizeSingleConstellation(abbreviation) {
        console.log(`👁️  Visualizando ${abbreviation} apenas...`);
        
        const boundaries = this.sftw.dataLoader?.constellationBoundaries;
        if (!boundaries || !boundaries.has(abbreviation)) {
            console.error(`❌ ${abbreviation} não encontrada`);
            return;
        }
        
        const polylines = boundaries.get(abbreviation);
        
        // Limpar visualizações anteriores
        this.clearDebug();
        
        // Visualizar CADA polilinha com cores diferentes
        polylines.forEach((polyline, polyIndex) => {
            // Converter pontos para Vector3
            const points = polyline.map(point => 
                this.sftw.raDecToVector3(
                    point.ra,
                    point.dec,
                    this.sftw.settings.sphereRadius - 15
                )
            );
            
            // Cor baseada no índice (para diferenciar polilinhas)
            const hue = (polyIndex * 30) % 360;
            const color = new THREE.Color(`hsl(${hue}, 100%, 50%)`);
            
            // Criar linha (NÃO FECHAR!)
            const line = this.createDebugLine(
                points, 
                color, 
                2, 
                `${abbreviation}-poly${polyIndex} (${polyline.length} pts)`
            );
            
            // Marcar pontos de controle
            this.markControlPoints(points, abbreviation, polyIndex);
        });
        
        console.log(`✅ ${abbreviation} visualizada: ${polylines.length} polilinhas`);
    }
    
    markControlPoints(points, abbr, polyIndex) {
        // Marcar apenas o PRIMEIRO e ÚLTIMO ponto de cada polilinha
        if (points.length >= 2) {
            // Primeiro ponto: vermelho
            this.createDebugSphere(points[0], 0xff0000, 0.8, 
                `${abbr}-${polyIndex}-start`);
            
            // Último ponto: verde (se diferente do primeiro)
            if (points.length > 2) {
                this.createDebugSphere(points[points.length - 1], 0x00ff00, 0.8, 
                    `${abbr}-${polyIndex}-end`);
            }
        }
    }
    
    // ============================================
    // TESTE DE CONVERSÃO DE COORDENADAS
    // ============================================
    
    testCoordinateConversion() {
        console.log('🧭 Testando conversão RA/Dec → Vector3...');
        
        // Pontos de teste conhecidos
        const testPoints = [
            { ra: 0, dec: 0, label: 'Equador, Meridiano 0h' },
            { ra: 6, dec: 0, label: 'Equador, RA 6h' },
            { ra: 0, dec: 90, label: 'Pólo Norte' },
            { ra: 0, dec: -90, label: 'Pólo Sul' },
            { ra: 12, dec: 45, label: 'RA 12h, Dec 45°' }
        ];
        
        testPoints.forEach(point => {
            const vector = this.sftw.raDecToVector3(
                point.ra, 
                point.dec, 
                this.sftw.settings.sphereRadius - 10
            );
            
            // Verificar se está na esfera
            const distance = vector.length();
            const expected = this.sftw.settings.sphereRadius - 10;
            
            console.log(`   ${point.label}:`);
            console.log(`     RA=${point.ra}h, Dec=${point.dec}°`);
            console.log(`     Vector: (${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)})`);
            console.log(`     Distância: ${distance.toFixed(2)} (esperado: ${expected})`);
            
            if (Math.abs(distance - expected) > 0.1) {
                console.warn(`     ⚠️  Distância incorreta!`);
            }
            
            // Visualizar ponto
            this.createDebugSphere(vector, 0xffff00, 1.5, point.label);
        });
    }
    
    // ============================================
    // FERRAMENTAS DE ANÁLISE
    // ============================================
    
    analyzeTrianglePatterns() {
        console.log('🔺 Analisando padrões de triângulos no dataset...');
        
        if (!this.sftw.dataLoader?.constellationBoundaries) {
            console.error('❌ Dados não disponíveis');
            return;
        }
        
        const allTriangles = [];
        
        this.sftw.dataLoader.constellationBoundaries.forEach((polylines, abbr) => {
            polylines.forEach(polyline => {
                if (polyline.length === 3) {
                    const triangle = {
                        constellation: abbr,
                        points: polyline,
                        sideLengths: [
                            this.angularDistance(polyline[0].ra, polyline[0].dec, polyline[1].ra, polyline[1].dec),
                            this.angularDistance(polyline[1].ra, polyline[1].dec, polyline[2].ra, polyline[2].dec),
                            this.angularDistance(polyline[2].ra, polyline[2].dec, polyline[0].ra, polyline[0].dec)
                        ]
                    };
                    
                    allTriangles.push(triangle);
                }
            });
        });
        
        console.log(`📊 Total de triângulos (polilinhas com 3 pontos): ${allTriangles.length}`);
        
        if (allTriangles.length > 0) {
            // Agrupar por tamanho aproximado
            const groups = {};
            allTriangles.forEach(triangle => {
                const avgSize = triangle.sideLengths.reduce((a, b) => a + b) / 3;
                const sizeKey = Math.round(avgSize * 10) / 10; // Arredonda para 0.1°
                
                if (!groups[sizeKey]) groups[sizeKey] = [];
                groups[sizeKey].push(triangle);
            });
            
            console.log('📈 Distribuição por tamanho:');
            Object.keys(groups).sort((a, b) => a - b).forEach(size => {
                console.log(`   ${size}°: ${groups[size].length} triângulos`);
            });
            
            // Mostrar o maior grupo
            const largestGroup = Object.entries(groups).reduce((a, b) => 
                a[1].length > b[1].length ? a : b
            );
            
            console.log(`🎯 Maior grupo: ${largestGroup[0]}° com ${largestGroup[1].length} triângulos`);
            
            // Visualizar alguns triângulos desse grupo
            largestGroup[1].slice(0, 3).forEach((triangle, index) => {
                console.log(`   Exemplo ${index + 1}: ${triangle.constellation}`);
            });
        }
    }
    
    // ============================================
    // FUNÇÕES UTILITÁRIAS (SEGURAS)
    // ============================================
    
    angularDistance(ra1, dec1, ra2, dec2) {
        // Converter para radianos
        const ra1Rad = ra1 * Math.PI / 12;
        const ra2Rad = ra2 * Math.PI / 12;
        const dec1Rad = dec1 * Math.PI / 180;
        const dec2Rad = dec2 * Math.PI / 180;
        
        return Math.acos(
            Math.sin(dec1Rad) * Math.sin(dec2Rad) + 
            Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.cos(ra1Rad - ra2Rad)
        ) * 180 / Math.PI;
    }
    
    createDebugLine(points, color, lineWidth = 1, label = '') {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: lineWidth,
            transparent: true,
            opacity: 0.7
        });
        
        const line = new THREE.Line(geometry, material);
        line.userData = { 
            label: label, 
            type: 'debug-line',
            isClosed: false // EXPLÍCITO: não é fechado
        };
        
        this.sftw.sceneManager.scene.add(line);
        this.debugObjects.push(line);
        return line;
    }
    
    createDebugSphere(position, color, size = 1, label = '') {
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        sphere.userData = { 
            label: label, 
            type: 'debug-sphere',
            isPoint: true
        };
        
        this.sftw.sceneManager.scene.add(sphere);
        this.debugObjects.push(sphere);
        return sphere;
    }
    
    // ============================================
    // UI MINIMAL (APENAS CONTROLES ESSENCIAIS)
    // ============================================
    
    setupMinimalUI() {
        const debugHTML = `
            <div id="geodesic-debug-ui" style="
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(20,20,40,0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: 'Segoe UI', Arial;
                z-index: 10000;
                width: 280px;
                font-size: 14px;
                border: 1px solid #444;
            ">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="margin:0; color:#4fc3f7;">🔍 Debug de Dados</h4>
                    <button onclick="window.geodesicDebug.clearDebug()" 
                            style="background:#d32f2f; border:none; color:white; 
                                   padding:4px 8px; border-radius:4px; cursor:pointer;">
                        🧹 Limpar
                    </button>
                </div>
                
                <hr style="border-color:#444; margin:10px 0;">
                
                <div style="margin: 8px 0;">
                    <div style="font-weight:bold; margin-bottom:5px; color:#ccc">Análise:</div>
                    <button onclick="window.geodesicDebug.testRawBoundaryData()" 
                            style="width:100%; padding:6px; margin:3px 0; text-align:left;
                                   background:#2e7d32; border:none; color:white; border-radius:4px;">
                        📊 Analisar Dados Brutos
                    </button>
                    
                    <button onclick="window.geodesicDebug.analyzeTrianglePatterns()" 
                            style="width:100%; padding:6px; margin:3px 0; text-align:left;
                                   background:#f57c00; border:none; color:white; border-radius:4px;">
                        🔺 Procurar Triângulos
                    </button>
                    
                    <button onclick="window.geodesicDebug.testCoordinateConversion()" 
                            style="width:100%; padding:6px; margin:3px 0; text-align:left;
                                   background:#1565c0; border:none; color:white; border-radius:4px;">
                        🧭 Testar Conversões
                    </button>
                </div>
                
                <div style="margin: 8px 0;">
                    <div style="font-weight:bold; margin-bottom:5px; color:#ccc">Visualizar:</div>
                    <input id="const-input" type="text" placeholder="Ex: Ori, UMa, Cas" 
                           style="width:100%; padding:6px; box-sizing:border-box;
                                  background:#222; border:1px solid #555; color:white;
                                  border-radius:4px; margin-bottom:5px;">
                    <button onclick="window.geodesicDebug.visualizeSingleConstellation(
                        document.getElementById('const-input').value)" 
                            style="width:100%; padding:6px; background:#6a1b9a; 
                                   border:none; color:white; border-radius:4px;">
                        👁️ Visualizar Esta Constelação
                    </button>
                </div>
                
                <div style="font-size:11px; color:#888; margin-top:10px; border-top:1px solid #444; padding-top:8px;">
                    <strong>Dica:</strong> Use para verificar se os dados ORIGINAIS contêm triângulos.
                    Se não ver triângulos aqui, o problema está no renderizador principal.
                </div>
            </div>
        `;
        
        const div = document.createElement('div');
        div.innerHTML = debugHTML;
        document.body.appendChild(div);
    }
    
    // ============================================
    // LIMPEZA
    // ============================================
    
    clearDebug() {
        this.debugObjects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            this.sftw.sceneManager.scene.remove(obj);
        });
        
        this.debugObjects = [];
        console.log('🧹 Debug limpo');
    }
    
    // ============================================
    // DESTRUTOR
    // ============================================
    
    destroy() {
        this.clearDebug();
        
        const ui = document.getElementById('geodesic-debug-ui');
        if (ui) ui.remove();
        
        this.active = false;
        console.log('♻️ Debug desativado');
    }
}

// Exportação
if (typeof window !== 'undefined') {
    window.Sftw1_GeodesicDebug = Sftw1_GeodesicDebug;
    
    window.setupGeodesicDebug = function() {
        if (window.app?.modules?.sftw1) {
            window.geodesicDebug = new Sftw1_GeodesicDebug(window.app.modules.sftw1);
            window.geodesicDebug.initialize();
            console.log('✅ Debug SEGURO configurado');
        } else {
            console.error('❌ Sftw1 não encontrado');
        }
    };
    
    console.log('✅ Sftw1_GeodesicDebug.js (VERSÃO SEGURA) carregado');
}