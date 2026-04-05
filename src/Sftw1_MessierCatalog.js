// Sftw1_MessierCatalog.js
// FOCO: consumir window.MESSIER_ALL e oferecer API pro Core/Visualization/UI
// - sem bundler (carrega via <script>)
// - valida formato e normaliza RA em horas [0,24)

class Sftw1_MessierCatalog {
  constructor(sftwInstance) {
    this.sftw = sftwInstance;

    this.items = [];          // array normalizado
    this.byId = new Map();    // "M42" -> item

    this.loaded = false;

    // visibilidade padrão
    this.visible = false;

    // tamanho visual padrão (raio em "unidades de cena" -> ajustado pela Visualization)
    this.pointRadius = 0.18; // você pode mudar depois
  }

  // ============================
  // LOAD
  // ============================
  loadFromGlobal() {
    const raw = (typeof window !== "undefined") ? (window.MESSIER_ALL || window.messier_all) : null;

    if (!raw || !Array.isArray(raw)) {
      console.warn("⚠️ MessierCatalog: window.MESSIER_ALL não encontrado (ou não é array).");
      this.items = [];
      this.byId.clear();
      this.loaded = false;
      return false;
    }

    const normalized = [];
    const byId = new Map();

    for (const obj of raw) {
      const it = this._normalizeItem(obj);
      if (!it) continue;

      if (!byId.has(it.id)) {
        byId.set(it.id, it);
        normalized.push(it);
      }
    }

    normalized.sort((a, b) => this._messierIndex(a.id) - this._messierIndex(b.id));

    this.items = normalized;
    this.byId = byId;
    this.loaded = true;

    console.log(`✅ MessierCatalog: carregado ${this.items.length} objetos.`);

    return true;
  }

  _normalizeItem(obj) {
    if (!obj || typeof obj !== "object") return null;

    let id = (obj.id || obj.ID || obj.nameId || "").toString().trim().toUpperCase();
    if (!/^M\d{1,3}$/.test(id)) {
      // tenta corrigir: "m 42" -> "M42"
      id = id.replace(/\s+/g, "").toUpperCase();
      if (!/^M\d{1,3}$/.test(id)) return null;
    }

    const ra = Number(obj.ra);
    const dec = Number(obj.dec);

    if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;

    const raN = this._normalizeRAHours(ra);
    const decN = Math.max(-90, Math.min(90, dec));

    const mag = (obj.mag == null) ? null : Number(obj.mag);
    const type = (obj.type || "").toString().trim();
    const name = (obj.name || "").toString().trim();

    return {
      id,
      ra: raN,     // horas
      dec: decN,   // graus
      mag: Number.isFinite(mag) ? mag : null,
      type: type || null,
      name: name || null,
    };
  }

  _normalizeRAHours(ra) {
    let x = ra;
    // aceita também RA em graus caso venha errado (0..360)
    // heurística: se > 24.5, assume graus e converte -> horas
    if (x > 24.5) x = x / 15.0;

    while (x >= 24) x -= 24;
    while (x < 0) x += 24;
    return x;
  }

  _messierIndex(id) {
    const m = id.match(/^M(\d{1,3})$/i);
    return m ? parseInt(m[1], 10) : 9999;
  }

  // ============================
  // PUBLIC API
  // ============================
  getAll() {
    return this.items.slice();
  }

  getById(id) {
    const key = (id || "").toString().trim().toUpperCase().replace(/\s+/g, "");
    return this.byId.get(key) || null;
  }

  isVisible() {
    return !!this.visible;
  }

  setVisible(v) {
    this.visible = !!v;

    // se houver visualization, pede pra atualizar
    this._notifyVisibilityChanged();
  }

  toggleVisible() {
    this.setVisible(!this.visible);
  }

  setPointRadius(r) {
    const x = Number(r);
    if (!Number.isFinite(x) || x <= 0) return;
    this.pointRadius = x;
    this._notifyVisibilityChanged(); // re-render
  }

  _notifyVisibilityChanged() {
    // 1) se a Visualization tiver API dedicada, usa
    if (this.sftw?.visualization && typeof this.sftw.visualization.setMessierLayer === "function") {
      this.sftw.visualization.setMessierLayer({
        visible: this.visible,
        items: this.items,
        pointRadius: this.pointRadius
      });
      return;
    }

    // 2) fallback: se existir um método genérico
    if (this.sftw?.visualization && typeof this.sftw.visualization.refresh === "function") {
      this.sftw.visualization.refresh();
    }
  }
}

// ============================
// INJEÇÃO NO CORE
// ============================
if (typeof window !== "undefined") {
  window.Sftw1_MessierCatalog = Sftw1_MessierCatalog;

  if (typeof Sftw1 !== "undefined") {
    Sftw1.injectMessierCatalogMethods = function (sftwInstance) {
      const cat = new Sftw1_MessierCatalog(sftwInstance);
      sftwInstance.messier = cat;

      // carregar imediatamente, se possível
      cat.loadFromGlobal();

      // API no core
      sftwInstance.getMessierAll = () => cat.getAll();
      sftwInstance.getMessierById = (id) => cat.getById(id);
      sftwInstance.setMessierVisible = (v) => cat.setVisible(v);
      sftwInstance.toggleMessierVisible = () => cat.toggleVisible();
      sftwInstance.isMessierVisible = () => cat.isVisible();
      sftwInstance.setMessierPointRadius = (r) => cat.setPointRadius(r);

      console.log("✅ MessierCatalog injetado no Core (sftwInstance.messier).");
    };
  }

  console.log("✅ Sftw1_MessierCatalog.js carregado");
}
