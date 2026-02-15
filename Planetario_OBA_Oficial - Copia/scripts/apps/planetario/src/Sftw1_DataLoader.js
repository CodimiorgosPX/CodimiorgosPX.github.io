// Sftw1_DataLoader.js
// FOCO: banco de dados de limites/vizinhanças correto (88 constelações)
// - Parse robusto do Stellarium boundaries.dat
// - NÃO fecha polilinhas (isso estraga seus limites visuais)
// - Captura K + abreviações mesmo quando aparece na linha seguinte
// - Vizinhança por arestas compartilhadas (com rounding controlado)

class Sftw1_DataLoader {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;

        this.constellationSegmentsRaw = new Map(); // abbr -> segments[]
        this.edgeSets = new Map();                 // abbr -> Set(edgeKey)
        this.neighbors = new Map();                // abbr -> Set(abbr)
        this.centers = new Map();                  // abbr -> {ra,dec}

        this.loadedSuccessfully = false;
        this.dataSource = 'none';

        // tuning
        this.EDGE_ROUND_RA = 0.001;   // horas
        this.EDGE_ROUND_DEC = 0.001;  // graus
        this.MAX_LOOKAHEAD_LINES_FOR_K = 4;
        this.MAX_CENTER_DISTANCE_DEG = 65; // filtro anti falso-positivo bem permissivo
        this.MIN_SHARED_EDGES = 1;
    }

    // ============================================================
    // ENTRYPOINT
    // ============================================================
    async loadConstellationData() {
        console.log('📥 DataLoader: carregando limites de constelações...');

        this._reset();

        // ✅ NOVA ÁRVORE: app roda em /scripts/apps/planetario/
        // então data/common fica 3 níveis acima
        let raw = await this._tryFetchText('../../../data/common/boundaries.dat');
        if (raw && raw.trim()) {
            this.dataSource = 'boundaries.dat';
        } else {
            console.warn('⚠️ DataLoader: boundaries.dat falhou. Tentando boundaries.txt...');
            raw = await this._tryFetchText('../../../data/common/boundaries.txt');
            if (raw && raw.trim()) this.dataSource = 'boundaries.txt';
        }

        if (!raw || !raw.trim()) {
            console.error('❌ DataLoader: nenhum arquivo encontrado. Usando fallback mínimo.');
            this._createEmergencyFallback();
            this.loadedSuccessfully = false;
            return this.sftw.constellations;
        }

        if (this.dataSource === 'boundaries.dat') {
            this._parseBoundariesDat(raw);
        } else {
            this._parseBoundariesTxt(raw);
        }

        this._buildEdgeSets();
        this._computeCenters();

        if (this.dataSource === 'boundaries.dat') {
            this._computeNeighborsBySharedEdges();
        } else {
            this._computeNeighborsByProximityFallback();
        }

        this._buildConstellationsArray();

        this.loadedSuccessfully = true;

        const st = this.getStatistics();
        console.log(`✅ DataLoader OK (${this.dataSource})`);
        console.log(
            `📊 constelações: ${st.totalConstellations} | média vizinhos: ${st.averageNeighbors.toFixed(1)} | ` +
            `min/max: ${st.minNeighbors}/${st.maxNeighbors} | links: ${st.totalNeighborLinks}`
        );

        // debug rápido: listar top 10 com menos vizinhos
        try {
            const sorted = (this.sftw.constellations || []).slice()
                .sort((a, b) => (a.neighborCount || 0) - (b.neighborCount || 0))
                .slice(0, 10)
                .map(c => `${c.abbreviation}:${c.neighborCount}`);
            console.log('🔎 Menores vizinhos (top 10):', sorted.join(' | '));
        } catch { /* ignore */ }

        return this.sftw.constellations;
    }

    // ============================================================
    // PARSE boundaries.dat (Stellarium)
    // ============================================================
    _parseBoundariesDat(raw) {
        console.log('🔍 Parse boundaries.dat (robusto)...');

        const lines = raw.split('\n');
        let i = 0;
        let segCount = 0;
        let failures = 0;

        while (i < lines.length) {
            const line = (lines[i] || '').trim();
            if (!line || line.startsWith('#')) { i++; continue; }

            // segment começa com N (int) e depois números
            const firstTokens = line.split(/\s+/);
            const N = parseInt(firstTokens[0], 10);
            if (!Number.isFinite(N) || N < 2) { i++; continue; }

            const parsed = this._parseDatSegment(lines, i);
            if (!parsed) {
                failures++;
                i++;
                continue;
            }

            segCount++;
            const { points, constellations, nextIndex } = parsed;

            for (const abbr of constellations) {
                if (!this.constellationSegmentsRaw.has(abbr)) this.constellationSegmentsRaw.set(abbr, []);
                this.constellationSegmentsRaw.get(abbr).push({
                    abbreviation: abbr,
                    points,
                    pointCount: points.length,
                    type: 'stellarium-boundary',
                    isClosed: false
                });
            }

            i = nextIndex;
        }

        console.log(
            `📊 boundaries.dat: ${segCount} segmentos | ${this.constellationSegmentsRaw.size} constelações | ` +
            `falhas parse: ${failures}`
        );
    }

    _parseDatSegment(lines, startIndex) {
        try {
            const firstLine = (lines[startIndex] || '').trim();
            const first = firstLine.split(/\s+/);
            const numPoints = parseInt(first[0], 10);
            if (!Number.isFinite(numPoints) || numPoints < 2) return null;

            const points = [];
            let idx = startIndex;
            let collected = 0;

            // Guardar tokens “sobrando” na linha onde fechamos os pontos
            let remainderTokens = [];

            while (collected < numPoints && idx < lines.length) {
                const parts = (lines[idx] || '').trim().split(/\s+/);

                // primeira linha: pula o N
                let k = (idx === startIndex) ? 1 : 0;

                while (k + 1 < parts.length && collected < numPoints) {
                    const ra = parseFloat(parts[k]);
                    const dec = parseFloat(parts[k + 1]);
                    if (Number.isFinite(ra) && Number.isFinite(dec)) {
                        points.push({ ra: this._normalizeRA(ra), dec });
                        collected++;
                    }
                    k += 2;
                }

                // Se coletamos tudo nesta linha, o que sobrou pode ser "K ABBR ABBR"
                if (collected >= numPoints && k < parts.length) {
                    remainderTokens = parts.slice(k);
                }

                idx++;
            }

            if (points.length < 2) return null;

            // 1) tentar extrair constelações do remainderTokens
            let constellations = this._extractKAbbrFromTokens(remainderTokens);

            // 2) se falhou, tentar na linha final (idx-1) inteira (às vezes K+abbr fica colado no fim)
            if (!constellations.length) {
                constellations = this._extractKAbbrFromLine(lines[idx - 1]);
            }

            // 3) se ainda falhou, olhar A FRENTE em até MAX_LOOKAHEAD_LINES_FOR_K linhas
            //    (muito comum o K+abbr estar na linha seguinte, se a linha terminou exatamente no último ponto)
            if (!constellations.length) {
                constellations = this._extractKAbbrLookahead(lines, idx, this.MAX_LOOKAHEAD_LINES_FOR_K);
            }

            // 4) fallback extremo: pegar qualquer abbr que aparecer no tail (não ideal, mas melhor que 1 só)
            if (!constellations.length) {
                constellations = this._extractAnyAbbrFallback(lines, idx - 1, 2);
            }

            if (!constellations.length) return null;

            return { points, constellations, nextIndex: idx };
        } catch (e) {
            console.warn('⚠️ _parseDatSegment falhou:', e);
            return null;
        }
    }

    _extractKAbbrLookahead(lines, startIdx, maxLookahead) {
        for (let j = 0; j < maxLookahead; j++) {
            const idx = startIdx + j;
            if (idx >= lines.length) break;

            const raw = (lines[idx] || '').trim();
            if (!raw || raw.startsWith('#')) continue;

            // Se a linha parece iniciar NOVO segmento (N float float...), não olhar mais
            // Novo segmento: primeiro token int >= 2 e segundo token é número (float)
            const toks = raw.split(/\s+/);
            const maybeN = parseInt(toks[0], 10);
            const maybeSecond = toks[1];
            if (Number.isFinite(maybeN) && maybeN >= 2 && maybeSecond !== undefined && this._looksNumeric(maybeSecond)) {
                break;
            }

            const got = this._extractKAbbrFromLine(raw);
            if (got.length) return got;
        }
        return [];
    }

    _extractKAbbrFromLine(line) {
        const raw = (line || '').trim();
        if (!raw) return [];
        const tokens = raw.split(/\s+/);
        return this._extractKAbbrFromTokens(tokens);
    }

    _extractKAbbrFromTokens(tokens) {
        if (!tokens || !tokens.length) return [];

        const toAbbr = (tok) => {
            const canon = this._canonicalizeAbbr(tok);
            if (typeof canon === 'string' && /^[A-Za-z]{3}$/.test(canon)) return canon;
            return null;
        };

        // Procurar padrão: K ABBR ABBR ...
        // Aqui K costuma ser 1 ou 2 (às vezes mais em casos especiais).
        for (let i = 0; i < tokens.length; i++) {
            const k = parseInt(tokens[i], 10);
            if (!Number.isFinite(k) || k <= 0 || k > 8) continue;

            const out = [];
            for (let j = 0; j < k; j++) {
                const tok = tokens[i + 1 + j];
                const abbr = toAbbr(tok);
                if (abbr) out.push(abbr);
            }

            // Só aceita se bateu o K certinho
            if (out.length === k) return out;
        }

        return [];
    }

    _extractAnyAbbrFallback(lines, tailIndex, takeN = 2) {
        const raw = (lines[tailIndex] || '').trim();
        if (!raw) return [];

        const toks = raw
            .split(/\s+/)
            .map(t => this._canonicalizeAbbr(t))
            .filter(t => typeof t === 'string' && /^[A-Za-z]{3}$/.test(t));

        if (!toks.length) return [];
        return toks.slice(-takeN);
    }

    // ============================================================
    // PARSE boundaries.txt (fallback best-effort)
    // ============================================================
    _parseBoundariesTxt(raw) {
        console.warn('⚠️ Parse boundaries.txt (fallback). Vizinhança será por proximidade.');

        const lines = raw.split('\n');
        let segs = 0;

        for (const L of lines) {
            const line = (L || '').trim();
            if (!line || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);

            // Pegar a ÚLTIMA abreviação válida na linha (robusto; não depende de findLast)
            let abbr = null;
            for (let i = parts.length - 1; i >= 0; i--) {
                const c = this._canonicalizeAbbr(parts[i]);
                if (typeof c === 'string' && /^[A-Za-z]{3}$/.test(c)) {
                    abbr = c;
                    break;
                }
            }
            if (!abbr) continue;

            const nums = parts.map(x => parseFloat(x)).filter(v => Number.isFinite(v));
            if (nums.length < 4) continue;

            const ra1 = this._normalizeRA(nums[0]);
            const dec1 = nums[1];
            const ra2 = this._normalizeRA(nums[2]);
            const dec2 = nums[3];

            if (!this.constellationSegmentsRaw.has(abbr)) this.constellationSegmentsRaw.set(abbr, []);
            this.constellationSegmentsRaw.get(abbr).push({
                abbreviation: abbr,
                points: [{ ra: ra1, dec: dec1 }, { ra: ra2, dec: dec2 }],
                pointCount: 2,
                type: 'boundary-txt-segment',
                isClosed: false
            });

            segs++;
        }

        console.log(`📊 boundaries.txt: ${segs} segmentos | ${this.constellationSegmentsRaw.size} constelações detectadas (fallback)`);
    }

    // ============================================================
    // EDGES & CENTERS
    // ============================================================
    _buildEdgeSets() {
        this.edgeSets.clear();

        for (const [abbr, segList] of this.constellationSegmentsRaw.entries()) {
            const set = new Set();

            for (const seg of segList) {
                const pts = seg.points || [];
                for (let i = 0; i < pts.length - 1; i++) {
                    set.add(this._edgeKey(pts[i], pts[i + 1]));
                }
            }

            this.edgeSets.set(abbr, set);
        }
    }

    _edgeKey(a, b) {
        const ra1 = this._round(a.ra, this.EDGE_ROUND_RA);
        const dec1 = this._round(a.dec, this.EDGE_ROUND_DEC);
        const ra2 = this._round(b.ra, this.EDGE_ROUND_RA);
        const dec2 = this._round(b.dec, this.EDGE_ROUND_DEC);

        const p1 = { ra: ra1, dec: dec1 };
        const p2 = { ra: ra2, dec: dec2 };

        const leftFirst = (p1.ra < p2.ra) || (p1.ra === p2.ra && p1.dec <= p2.dec);
        const L = leftFirst ? p1 : p2;
        const R = leftFirst ? p2 : p1;

        return `${L.ra.toFixed(3)},${L.dec.toFixed(3)}-${R.ra.toFixed(3)},${R.dec.toFixed(3)}`;
    }

    _computeCenters() {
        this.centers.clear();

        for (const [abbr, segList] of this.constellationSegmentsRaw.entries()) {
            const pts = [];
            for (const seg of segList) {
                if (seg.points && seg.points.length) pts.push(...seg.points);
            }
            if (pts.length < 2) continue;

            this.centers.set(abbr, this._meanRaDecByVector(pts));
        }
    }

    _meanRaDecByVector(points) {
        let x = 0, y = 0, z = 0;

        for (const p of points) {
            const raRad = (p.ra * Math.PI) / 12.0;
            const decRad = (p.dec * Math.PI) / 180.0;

            x += Math.cos(decRad) * Math.cos(raRad);
            y += Math.sin(decRad);
            z += Math.cos(decRad) * Math.sin(raRad);
        }

        const n = Math.sqrt(x * x + y * y + z * z) || 1;
        x /= n; y /= n; z /= n;

        const decRad = Math.asin(y);
        let raRad = Math.atan2(z, x);
        if (raRad < 0) raRad += 2 * Math.PI;

        const ra = (raRad * 12.0) / Math.PI;
        const dec = (decRad * 180.0) / Math.PI;

        return { ra, dec };
    }

    // ============================================================
    // NEIGHBORS
    // ============================================================
    _computeNeighborsBySharedEdges() {
        console.log('🔗 Calculando vizinhos por arestas compartilhadas...');

        this.neighbors.clear();
        for (const abbr of this.edgeSets.keys()) this.neighbors.set(abbr, new Set());

        const abbrs = Array.from(this.edgeSets.keys());

        for (let i = 0; i < abbrs.length; i++) {
            const a = abbrs[i];
            const setA = this.edgeSets.get(a);
            if (!setA || setA.size === 0) continue;

            for (let j = i + 1; j < abbrs.length; j++) {
                const b = abbrs[j];
                const setB = this.edgeSets.get(b);
                if (!setB || setB.size === 0) continue;

                // filtro por distância de centros (evita falso positivo por rounding)
                const ca = this.centers.get(a);
                const cb = this.centers.get(b);
                if (ca && cb) {
                    const d = this._angularDistanceDeg(ca.ra, ca.dec, cb.ra, cb.dec);
                    if (d > this.MAX_CENTER_DISTANCE_DEG) continue;
                }

                // interseção iterando o menor
                const [small, big] = (setA.size <= setB.size) ? [setA, setB] : [setB, setA];

                let shared = 0;
                for (const e of small) {
                    if (big.has(e)) {
                        shared++;
                        if (shared >= this.MIN_SHARED_EDGES) break;
                    }
                }

                if (shared >= this.MIN_SHARED_EDGES) {
                    this.neighbors.get(a).add(b);
                    this.neighbors.get(b).add(a);
                }
            }
        }

        // fallback para isoladas
        for (const abbr of abbrs) {
            const n = this.neighbors.get(abbr);
            if (!n || n.size === 0) {
                this._addNeighborsByProximity(abbr, 5, 26);
            }
        }
    }

    _computeNeighborsByProximityFallback() {
        console.warn('⚠️ Vizinhança por proximidade (fallback boundaries.txt).');

        this.neighbors.clear();
        const abbrs = Array.from(this.centers.keys());
        for (const abbr of abbrs) this.neighbors.set(abbr, new Set());

        for (const abbr of abbrs) {
            this._addNeighborsByProximity(abbr, 6, 26);
        }
    }

    _addNeighborsByProximity(abbr, takeN = 5, maxDeg = 26) {
        const c1 = this.centers.get(abbr);
        if (!c1) return;

        const arr = [];
        for (const [other, c2] of this.centers.entries()) {
            if (other === abbr) continue;
            const d = this._angularDistanceDeg(c1.ra, c1.dec, c2.ra, c2.dec);
            if (d <= maxDeg) arr.push({ abbr: other, d });
        }

        arr.sort((a, b) => a.d - b.d);
        const top = arr.slice(0, takeN);

        const setA = this.neighbors.get(abbr) || new Set();
        this.neighbors.set(abbr, setA);

        for (const t of top) {
            setA.add(t.abbr);

            const setB = this.neighbors.get(t.abbr) || new Set();
            setB.add(abbr);
            this.neighbors.set(t.abbr, setB);
        }
    }

    // ============================================================
    // BUILD sftw.constellations (compat com Visualization)
    // ============================================================
    _buildConstellationsArray() {
        const out = [];

        for (const [abbr, segList] of this.constellationSegmentsRaw.entries()) {
            const center = this.centers.get(abbr) || { ra: 0, dec: 0 };
            const neigh = this.neighbors.get(abbr) ? Array.from(this.neighbors.get(abbr)) : [];

            // bounding box simples (não usado pra vizinho; só debug)
            let minRA = 24, maxRA = 0, minDec = 90, maxDec = -90;
            let totalPoints = 0;

            for (const seg of segList) {
                const pts = seg.points || [];
                totalPoints += pts.length;
                for (const p of pts) {
                    minRA = Math.min(minRA, p.ra);
                    maxRA = Math.max(maxRA, p.ra);
                    minDec = Math.min(minDec, p.dec);
                    maxDec = Math.max(maxDec, p.dec);
                }
            }

            out.push({
                abbreviation: abbr,
                name: (typeof this.sftw.getConstellationName === 'function')
                    ? this.sftw.getConstellationName(abbr)
                    : abbr,

                geodesicSegments: segList,
                polygons: [],

                center,
                boundingBox: { minRA, maxRA, minDec, maxDec },

                totalPoints,
                totalPolygons: 0,
                totalSegments: segList.length,

                neighbors: neigh,
                neighborCount: neigh.length,

                source: this.dataSource,
                hasValidBoundaries: segList.length > 0
            });
        }

        out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        this.sftw.constellations = out;
    }

    // ============================================================
    // PUBLIC HELPERS (UI diagnóstico usa isso)
    // ============================================================
    getConstellationNeighbors(abbr) {
        const set = this.neighbors.get(abbr);
        return set ? Array.from(set) : [];
    }

    getStatistics() {
        const list = this.sftw.constellations || [];
        const counts = list.map(c => c.neighborCount || 0);
        const sum = counts.reduce((s, v) => s + v, 0);

        return {
            dataSource: this.dataSource,
            totalConstellations: list.length,
            averageNeighbors: list.length ? (sum / list.length) : 0,
            minNeighbors: list.length ? Math.min(...counts) : 0,
            maxNeighbors: list.length ? Math.max(...counts) : 0,
            totalNeighborLinks: Math.round(sum / 2)
        };
    }

    validateData() {
        const issues = [];
        const list = this.sftw.constellations || [];

        if (!list.length) issues.push('Nenhuma constelação carregada');

        for (const c of list) {
            if (!c.geodesicSegments || c.geodesicSegments.length === 0) issues.push(`${c.abbreviation}: sem segmentos`);
            if (!c.center) issues.push(`${c.abbreviation}: sem centro`);
            if ((c.neighborCount || 0) === 0) issues.push(`${c.abbreviation}: sem vizinhos`);
        }

        if (issues.length) {
            console.warn(`⚠️ validateData: ${issues.length} problemas`);
            issues.slice(0, 80).forEach(x => console.warn('  -', x));
            return false;
        }

        console.log('✅ validateData: OK');
        return true;
    }

    // ============================================================
    // UTIL
    // ============================================================
    async _tryFetchText(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            return await res.text();
        } catch {
            return null;
        }
    }

    _reset() {
        this.constellationSegmentsRaw.clear();
        this.edgeSets.clear();
        this.neighbors.clear();
        this.centers.clear();
        this.loadedSuccessfully = false;
        this.dataSource = 'none';
    }

    _normalizeRA(ra) {
        let x = ra;
        while (x >= 24) x -= 24;
        while (x < 0) x += 24;
        return x;
    }

    _round(v, step) {
        return Math.round(v / step) * step;
    }

    _looksNumeric(token) {
        // aceita "12.34" "-5.2" "0" etc
        return /^-?\d+(\.\d+)?$/.test(token);
    }

    _canonicalizeAbbr(token) {
        // Canonicaliza abreviações vindas do boundaries.*:
        // - remove pontuação colada (ex: "Ser1," -> "Ser1")
        // - remove sufixos numéricos quando existirem (ex: "Ser1" / "Ser2")
        // - unifica Serpens (Caput/Cauda) sob a IAU real: "Ser"
        if (typeof token !== 'string') return null;
        let t = token.trim();
        if (!t) return null;

        // Remover caracteres não alfanuméricos (pontos, vírgulas, etc.)
        t = t.replace(/[^A-Za-z0-9_]/g, '');
        if (!t) return null;

        // Remover sufixo numérico (caso apareça)
        const base = t.replace(/\d+$/, '');
        if (!base) return null;

        // Serpens: sempre normalizar para "Ser"
        if (base.toLowerCase() === 'ser') return 'Ser';

        return base;
    }

    _angularDistanceDeg(ra1h, dec1d, ra2h, dec2d) {
        const ra1 = (ra1h * Math.PI) / 12.0;
        const ra2 = (ra2h * Math.PI) / 12.0;
        const d1 = (dec1d * Math.PI) / 180.0;
        const d2 = (dec2d * Math.PI) / 180.0;

        const cos = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(ra1 - ra2);
        const clamped = Math.max(-1, Math.min(1, cos));
        return (Math.acos(clamped) * 180.0) / Math.PI;
    }

    _createEmergencyFallback() {
        this.sftw.constellations = [
            {
                abbreviation: 'Ori',
                name: 'Órion',
                geodesicSegments: [{
                    abbreviation: 'Ori',
                    points: [
                        { ra: 5.5, dec: 5.0 },
                        { ra: 5.8, dec: 10.0 },
                        { ra: 6.2, dec: 5.0 },
                        { ra: 5.5, dec: 0.0 }
                    ],
                    pointCount: 4,
                    type: 'emergency',
                    isClosed: false
                }],
                polygons: [],
                center: { ra: 5.8, dec: 5.0 },
                boundingBox: { minRA: 5.5, maxRA: 6.2, minDec: 0.0, maxDec: 10.0 },
                neighbors: [],
                neighborCount: 0,
                source: 'emergency',
                hasValidBoundaries: true
            }
        ];
    }
}

// ============================================================
// INJEÇÃO NO CORE
// ============================================================
if (typeof window !== 'undefined') {
    window.Sftw1_DataLoader = Sftw1_DataLoader;

    if (typeof Sftw1 !== 'undefined') {
        Sftw1.injectDataLoaderMethods = function (sftwInstance) {
            const loader = new Sftw1_DataLoader(sftwInstance);
            sftwInstance.dataLoader = loader;

            sftwInstance.loadConstellationData = async () => loader.loadConstellationData();
            sftwInstance.getDataStatistics = () => loader.getStatistics();
            sftwInstance.validateData = () => loader.validateData();
            sftwInstance.getConstellationNeighbors = (abbr) => loader.getConstellationNeighbors(abbr);

            console.log('✅ DataLoader injetado (parse robusto K+abbr, vizinhos por aresta)');
        };
    }

    console.log('✅ Sftw1_DataLoader.js carregado (vizinhos robustos)');
}
