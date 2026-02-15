// Planetário OBA - entrypoint do app
// Bootstrap do planetário (sem HUB).
// Compatível com seu app.html atual.

(() => {
  async function boot() {
    console.log("🌌 Planetário: iniciando...");

    // ========= Sanidade: libs =========
    if (typeof THREE === "undefined") {
      console.error("❌ THREE não carregado");
      alert("Erro: Three.js não carregou (verifique internet/CDN).");
      return;
    }
    if (typeof SceneManager === "undefined") {
      console.error("❌ SceneManager não carregado");
      alert("Erro: SceneManager não carregou (verifique ../../shared/SceneManager.js).");
      return;
    }
    if (typeof Sftw1 === "undefined") {
      console.error("❌ Sftw1_Core não carregado");
      alert("Erro: Sftw1_Core não carregou (verifique ./src/Sftw1_Core.js).");
      return;
    }

    // ========= Sanidade: canvas =========
    const canvas = document.getElementById("module-canvas");
    if (!canvas) {
      console.error("❌ Canvas #module-canvas não encontrado no app.html");
      alert("Erro: faltou <canvas id='module-canvas'></canvas> no app.html.");
      return;
    }

    // ========= Instanciação =========
    try {
      let app = null;

      // Preferir o Loader (injeção + init num lugar só)
      if (typeof Sftw1_Loader !== "undefined" && typeof Sftw1_Loader.createInstance === "function") {
        console.log("✅ Usando Sftw1_Loader.createInstance(...)");

        app = await Sftw1_Loader.createInstance("module-canvas", {
          debugMode: false,
          settings: {
            showGrid: true,
            showBoundaries: true,
            showLabels: true,
            showStars: true,
            autoStartGame: false,
          },
        });

        // ✅ Messier injection (mesmo com Loader)
        if (typeof Sftw1.injectMessierCatalogMethods === "function") {
          Sftw1.injectMessierCatalogMethods(app);
        } else {
          console.warn("⚠️ injectMessierCatalogMethods não encontrado (Sftw1_MessierCatalog.js carregou?)");
        }

        // starLimit é propriedade do Core (não é opção de initialize)
        app.starLimit = app.starLimit ?? 20000;

      } else {
        console.warn("⚠️ Sftw1_Loader não disponível. Fazendo boot manual (injeções).");

        app = new Sftw1();

        // starLimit precisa ser setado antes de loadStars()
        app.starLimit = 20000; // ou 3000, se quiser leve

        // Injeções (se existirem)
        if (typeof Sftw1.injectDataLoaderMethods === "function") Sftw1.injectDataLoaderMethods(app);
        if (typeof Sftw1.injectVisualizationMethods === "function") Sftw1.injectVisualizationMethods(app);
        if (typeof Sftw1.injectGameMethods === "function") Sftw1.injectGameMethods(app);
        if (typeof Sftw1.injectUIMethods === "function") Sftw1.injectUIMethods(app);
        if (typeof Sftw1.injectStarCatalogMethods === "function") Sftw1.injectStarCatalogMethods(app);

        // ✅ Messier injection (manual)
        if (typeof Sftw1.injectMessierCatalogMethods === "function") {
          Sftw1.injectMessierCatalogMethods(app);
        } else {
          console.warn("⚠️ injectMessierCatalogMethods não encontrado (Sftw1_MessierCatalog.js carregou?)");
        }

        await app.initialize("module-canvas");
      }

      // Expor para debug
      window.planetario = app;

      // debug extra: confirma se o DB chegou
      const nMessier = (typeof app.getMessierAll === "function") ? app.getMessierAll().length : 0;
      console.log("✅ Planetário pronto! window.planetario =", app, "| Messier:", nMessier);

    } catch (err) {
      console.error("❌ Erro ao inicializar planetário:", err);
      alert("Erro ao inicializar planetário. Veja o console.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
