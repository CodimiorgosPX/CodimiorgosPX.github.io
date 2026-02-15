// scripts/components/Sftw1_StarCatalog.js
// StarCatalog ATUALIZADO: suporta HYG 3000 + cores realistas (não fica tudo branco)
// - Se houver s.ci (B-V), usa Ballesteros para estimar temperatura e cor
// - Se não houver, usa temperatura estável baseada em hash do nome (realista o suficiente)
// - NÃO depende do Sftw1_StarDensity.js
// - Default: 3000 estrelas

class Sftw1_StarCatalog {
    constructor(sftwInstance) {
        this.sftw = sftwInstance;

        this.stars = [];
        this.starMeshes = [];

        this.starLimit = 3000;
        this.loadedCatalog = null;
    }

    async loadBrightStars(limit = null) {
        console.log('⭐ Carregando estrelas...');

        if (limit !== null && Number.isFinite(limit)) this.starLimit = limit;
        if (this.sftw && Number.isFinite(this.sftw.starLimit)) this.starLimit = this.sftw.starLimit;

        console.log(`🎯 Limite configurado: ${this.starLimit} estrelas`);

        try {
            // Banco novo HYG (window.SFTW_STAR_DATA.hyg_20000 / hyg_3000)
            const db = (typeof window !== 'undefined') ? window.SFTW_STAR_DATA : null;

            if (db) {
                const preferred = [
                    { key: 'hyg_20000', label: 'HYG 20000 (novo)' },
                    { key: 'hyg_3000', label: 'HYG 3000 (novo)' },
                ];

                const chosen = preferred.find(p => Array.isArray(db[p.key]) && db[p.key].length > 0);

                if (chosen) {
                    this.loadedCatalog = chosen.label;
                    console.log(`📁 Usando catálogo: ${this.loadedCatalog}`);

                    this.stars = this._parseObjectStars(db[chosen.key]);

                    if (this.starLimit > 0 && this.starLimit < this.stars.length) {
                        this.stars = this.stars.slice(0, this.starLimit);
                        console.log(`✂️ Aplicado limite de ${this.starLimit} estrelas`);
                    }

                    console.log(`✅ ${this.stars.length} estrelas carregadas`);
                    this._logStarStats();
                    this._notifyUI();
                    return this.stars;
                }
            }

            // Fallback legado (se existirem)
            const legacy = this._getLegacyCatalogPreferred(this.starLimit);
            if (legacy && legacy.data && legacy.data.length > 0) {
                this.loadedCatalog = legacy.name;
                console.log(`📁 Usando catálogo: ${this.loadedCatalog}`);

                this.stars = this._parseCompactStars(legacy.data);

                if (this.starLimit > 0 && this.starLimit < this.stars.length) {
                    this.stars = this.stars.slice(0, this.starLimit);
                    console.log(`✂️ Aplicado limite de ${this.starLimit} estrelas`);
                }

                console.log(`✅ ${this.stars.length} estrelas carregadas`);
                this._logStarStats();
                this._notifyUI();
                return this.stars;
            }

            console.warn('⚠️ Nenhum catálogo encontrado (HYG ou legado). Usando fallback mínimo.');
            this.loadedCatalog = 'fallback-min';
            return this._createFallbackStars();

        } catch (error) {
            console.error('❌ Erro ao carregar estrelas:', error);
            this.loadedCatalog = 'error';
            return this._createFallbackStars();
        }
    }

    // ============================================================
    // PARSER HYG (objeto)
    // Espera: {ra, dec, mag, con, name} e (opcional) ci
    // ============================================================
    _parseObjectStars(objData) {
        return objData.map((s, index) => {
            const mag = (typeof s.mag === 'number') ? s.mag : 6.5;

            const name = s.name || `Star ${index + 1}`;
            const con = s.con || '---';

            // ✅ Cor: tenta por CI (B-V), senão por hash estável
            const color = this._pickStarColor(s, name, con, mag);

            return {
                id: index,
                ra: s.ra,
                dec: s.dec,
                magnitude: mag,
                color,
                name,
                constellation: con,
                size: this._magnitudeToSize(mag),
                brightness: this._magnitudeToBrightness(mag),
                spectralClass: (s.spect || s.spectral || 'Unknown')
            };
        });
    }

    // ============================================================
    // Cor realista:
    // 1) Se houver s.ci (B-V): estima temperatura e converte
    // 2) Se não houver: temperatura baseada em hash do nome (estável)
    // ============================================================
    _pickStarColor(s, name, con, mag) {
        // 1) CI disponível?
        const ci = (s && typeof s.ci === 'number' && Number.isFinite(s.ci)) ? s.ci : null;
        if (ci !== null) {
            const T = this._temperatureFromBV(ci);
            return this._temperatureToRGBHex(T);
        }

        // 2) Sem CI: usar hash estável para variar entre 3200K..10500K
        // (mistura de vermelhas/amareladas/brancas/azuladas, sem virar arco-íris)
        const h = this._hashString(`${con}|${name}`);
        // pesa um pouco pela magnitude (brilho alto tende a parecer mais branco)
        const tMin = 3200;
        const tMax = 10500;
        let t = tMin + (h % (tMax - tMin));

        // aproximação visual: muito brilhantes puxam pro branco
        if (mag < 1.0) t = Math.max(t, 5200);
        if (mag < 0.0) t = Math.max(t, 6000);

        return this._temperatureToRGBHex(t);
    }

    // Ballesteros (aprox.) BV -> Temperatura (Kelvin)
    _temperatureFromBV(bv) {
        // limita bv para não explodir
        const x = Math.max(-0.40, Math.min(2.00, bv));
        const T = 4600 * (1 / (0.92 * x + 1.7) + 1 / (0.92 * x + 0.62));
        return Math.max(2500, Math.min(40000, T));
    }

    // Converte temperatura (K) para RGB aproximado (Tanner Helland-like)
    _temperatureToRGBHex(tempK) {
        let T = tempK / 100;
        let r, g, b;

        // Red
        if (T <= 66) r = 255;
        else {
            r = 329.698727446 * Math.pow(T - 60, -0.1332047592);
            r = Math.max(0, Math.min(255, r));
        }

        // Green
        if (T <= 66) {
            g = 99.4708025861 * Math.log(T) - 161.1195681661;
            g = Math.max(0, Math.min(255, g));
        } else {
            g = 288.1221695283 * Math.pow(T - 60, -0.0755148492);
            g = Math.max(0, Math.min(255, g));
        }

        // Blue
        if (T >= 66) b = 255;
        else if (T <= 19) b = 0;
        else {
            b = 138.5177312231 * Math.log(T - 10) - 305.0447927307;
            b = Math.max(0, Math.min(255, b));
        }

        // dá uma "puxadinha" pro branco (estrelas no céu raramente são saturadas)
        const mix = 0.25; // 0..1 (quanto mais, mais branco)
        r = r * (1 - mix) + 255 * mix;
        g = g * (1 - mix) + 255 * mix;
        b = b * (1 - mix) + 255 * mix;

        return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    }

    _hashString(str) {
        // FNV-1a 32-bit
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return h >>> 0;
    }

    // ============================================================
    // LEGADO (se existir)
    // ============================================================
    _getLegacyCatalogPreferred(limit) {
        const w = (typeof window !== 'undefined') ? window : null;
        if (!w) return null;
        const has = (x) => Array.isArray(x) && x.length > 0;

        if (limit >= 1000 && has(w.STAR_CATALOG_1000)) return { name: '1000 estrelas (legado)', data: w.STAR_CATALOG_1000 };
        if (limit >= 500 && has(w.STAR_CATALOG_500)) return { name: '500 estrelas (legado)', data: w.STAR_CATALOG_500 };
        if (has(w.STAR_CATALOG_100)) return { name: '100 estrelas (legado)', data: w.STAR_CATALOG_100 };
        if (has(w.BRIGHT_STARS_100)) return { name: '100 estrelas brilhantes (legado)', data: w.BRIGHT_STARS_100 };
        return null;
    }

    _parseCompactStars(compactData) {
        return compactData.map((data, index) => ({
            id: index,
            ra: data[0],
            dec: data[1],
            magnitude: data[2],
            color: this._parseColor(data[3]),
            name: data[4] || `Star ${index + 1}`,
            constellation: data[5] || '---',
            size: this._magnitudeToSize(data[2]),
            brightness: this._magnitudeToBrightness(data[2]),
            spectralClass: this._guessSpectralClass(data[3])
        }));
    }

    _parseColor(colorValue) {
        if (typeof colorValue === 'number') return colorValue;
        if (typeof colorValue === 'string' && colorValue.startsWith('0x')) return parseInt(colorValue, 16);
        return 0xffffff;
    }

    _magnitudeToSize(mag) {
        const minSize = 1.0;
        const maxSize = 10.0;
        const normalized = (6.5 - mag) / 8.0;
        return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * normalized));
    }

    _magnitudeToBrightness(mag) {
        return Math.max(0.1, Math.min(1.0, 1.0 - (mag + 1) / 8));
    }

    _guessSpectralClass(color) {
        if (typeof color === 'number') {
            const r = (color >> 16) & 255;
            const g = (color >> 8) & 255;
            const b = color & 255;

            if (r > 200 && g < 150 && b < 150) return 'M';
            if (r > 200 && g > 200 && b < 150) return 'K';
            if (r > 200 && g > 200 && b > 200) return 'G';
            if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return 'A';
            if (b > r && b > g) return 'B';
        }
        return 'Unknown';
    }

    _createFallbackStars() {
        console.log('🔄 Criando fallback mínimo de estrelas...');

        const fallback = [
            [6.7525, -16.7161, -1.46, 0xffffff, "Sirius", "CMa"],
            [5.9195, 7.4071, 0.42, 0xffb070, "Betelgeuse", "Ori"],
            [5.2423, -8.2016, 0.18, 0xaac8ff, "Rigel", "Ori"],
            [14.6608, -60.8350, 0.01, 0xb8e5ff, "Rigil Kentaurus", "Cen"],
            [5.2423, 45.9989, 0.03, 0xfff0c8, "Capella", "Aur"]
        ];

        this.stars = this._parseCompactStars(fallback);
        console.log(`✅ ${this.stars.length} estrelas fallback criadas`);
        this._logStarStats();
        this._notifyUI();
        return this.stars;
    }

    _notifyUI() {
        if (this.sftw?.ui && typeof this.sftw.ui.updateStats === 'function') {
            setTimeout(() => this.sftw.ui.updateStats(), 100);
        }
    }

    _logStarStats() {
        if (!this.stars.length) {
            console.log('📊 Nenhuma estrela carregada');
            return;
        }

        const magnitudes = this.stars.map(s => s.magnitude);
        const minMag = Math.min(...magnitudes).toFixed(2);
        const maxMag = Math.max(...magnitudes).toFixed(2);
        const avgMag = (magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length).toFixed(2);

        const constellations = new Set(this.stars.map(s => s.constellation).filter(c => c && c !== '---'));

        console.log(`📊 Estatísticas do catálogo (${this.loadedCatalog}):`);
        console.log(`   • Total: ${this.stars.length} estrelas`);
        console.log(`   • Magnitude: ${minMag} a ${maxMag} (média: ${avgMag})`);
        console.log(`   • Constelações: ${constellations.size} com estrelas`);
    }

    async reloadWithLimit(newLimit) {
        console.log(`🔄 Recarregando estrelas com novo limite: ${newLimit}`);
        this.cleanupMeshes();
        this.stars = [];
        this.starLimit = newLimit;
        return this.loadBrightStars();
    }

    cleanupMeshes() {
        if (this.starMeshes && this.starMeshes.length > 0) {
            console.log(`🧹 Limpando ${this.starMeshes.length} malhas de estrelas...`);
            this.starMeshes.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.sftw?.sceneManager?.scene?.remove(mesh);
            });
            this.starMeshes = [];
        }
    }

    getCatalogInfo() {
        return {
            loadedStars: this.stars.length,
            starLimit: this.starLimit,
            catalogName: this.loadedCatalog,
            constellationCount: new Set(this.stars.map(s => s.constellation).filter(c => c && c !== '---')).size
        };
    }
}

// ============================================================
// INJEÇÃO NO CORE
// ============================================================
if (typeof window !== 'undefined') {
    window.Sftw1_StarCatalog = Sftw1_StarCatalog;

    if (typeof Sftw1 !== 'undefined') {
        Sftw1.injectStarCatalogMethods = function (sftwInstance) {
            const catalog = new Sftw1_StarCatalog(sftwInstance);

            sftwInstance.loadStars = async () => {
                const result = await catalog.loadBrightStars();
                sftwInstance.stars = result;
                return result;
            };

            sftwInstance.reloadStarsWithLimit = async (newLimit) =>
                catalog.reloadWithLimit(newLimit);

            sftwInstance.getStarCatalogInfo = () => catalog.getCatalogInfo();

            sftwInstance.starCatalog = catalog;

            console.log('✅ StarCatalog injetado (cores ativadas)');
        };
    }

    console.log('✅ Sftw1_StarCatalog.js carregado (cores ativadas)');
}
