// app.js
// ETAPA 2A — estabilização da navegação do app
// Objetivo:
// - manter a inicialização atual estável
// - centralizar a navegação global do planetário
// - reduzir acoplamento entre UI/jogos e a página

(function () {
  'use strict';

  const APP_LOG_PREFIX = '🪐 [Planetário]';

  function log() {
    console.log(APP_LOG_PREFIX, ...arguments);
  }

  function warn() {
    console.warn(APP_LOG_PREFIX, ...arguments);
  }

  function safe(fn, fallback = undefined) {
    try {
      return typeof fn === 'function' ? fn() : fallback;
    } catch (err) {
      warn(err);
      return fallback;
    }
  }

  function deriveHubUrl() {
    const pathname = window.location.pathname || '';

    if (/\/scripts\/apps\/planetario\/app\.html$/i.test(pathname)) {
      return pathname.replace(/\/scripts\/apps\/planetario\/app\.html$/i, '/index.html');
    }

    return '../../../index.html';
  }

  function createNavigator() {
    function getPlanetario() {
      return window.planetario || null;
    }

    function stopCurrentModes() {
      const app = getPlanetario();
      if (!app) return false;

      // 1) jogo principal
      safe(() => app.endGame && app.endGame());
      safe(() => app.cancelGame && app.cancelGame());
      safe(() => app.game && app.game.endGame && app.game.endGame());

      // 2) jogo de vizinhanças
      safe(() => app.endNeighborGame && app.endNeighborGame());
      safe(() => app.cancelNeighborGame && app.cancelNeighborGame());

      // 3) Messier
      safe(() => app.stopMessierGame && app.stopMessierGame());
      safe(() => app.endMessierGame && app.endMessierGame());

      if (app.visualization) {
        safe(() => app.visualization.stopMessierGame && app.visualization.stopMessierGame());
        safe(() => app.visualization.endMessierGame && app.visualization.endMessierGame());
      }

      // 4) voltar visualmente à aba explorar
      const exploreBtn =
        document.querySelector('[data-tab-btn="explore"]') ||
        document.querySelector('[data-tab="explore"]') ||
        document.getElementById('tab-explore');

      if (exploreBtn) {
        safe(() => exploreBtn.click());
      }

      // 5) restaurar estado básico dos botões conhecidos
      const startBtn = document.getElementById('btn-start-game');
      const endBtn = document.getElementById('btn-end-game');
      if (startBtn) startBtn.style.display = '';
      if (endBtn) endBtn.style.display = 'none';

      const startMessierBtn = document.getElementById('btn-start-messier-game');
      const stopMessierBtn = document.getElementById('btn-stop-messier-game');
      if (startMessierBtn) startMessierBtn.style.display = '';
      if (stopMessierBtn) stopMessierBtn.style.display = 'none';

      return true;
    }

    function returnToHub() {
      stopCurrentModes();
      const hubUrl = deriveHubUrl();
      log('Voltando ao hub:', hubUrl);
      window.location.href = hubUrl;
    }

    return {
      getHubUrl: deriveHubUrl,
      getApp: getPlanetario,
      exitCurrentMode: stopCurrentModes,
      returnToHub
    };
  }

  function installNavigator() {
    const navigator = createNavigator();

    window.planetarioNavigator = navigator;
    window.planetarioApp = navigator;

    // Compatibilidade com fluxos antigos
    window.app = window.app || {};
    window.app.returnToMainMenu = navigator.returnToHub;

    return navigator;
  }

  function bindHubButton() {
    const btn =
      document.getElementById('btn-return-hub') ||
      document.getElementById('btn-back-to-hub') ||
      document.querySelector('[data-action="return-hub"]');

    if (!btn || btn.dataset.hubBound === '1') return false;

    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      if (window.planetarioNavigator && typeof window.planetarioNavigator.returnToHub === 'function') {
        window.planetarioNavigator.returnToHub();
      } else {
        window.location.href = deriveHubUrl();
      }
    });

    btn.dataset.hubBound = '1';
    return true;
  }

  async function createPlanetarioInstance() {
    if (!window.THREE) throw new Error('THREE não encontrado.');
    if (!window.SceneManager) throw new Error('SceneManager não encontrado.');
    if (!window.Sftw1) throw new Error('Sftw1 não encontrado.');

    if (window.Sftw1_Loader && typeof window.Sftw1_Loader.createInstance === 'function') {
      return window.Sftw1_Loader.createInstance('module-canvas', {
        controlsContainer: '.module-controls'
      });
    }

    const instance = new window.Sftw1();
    if (typeof instance.initialize !== 'function') {
      throw new Error('Instância Sftw1 sem método initialize().');
    }

    await instance.initialize('module-canvas', {
      controlsContainer: '.module-controls'
    });

    return instance;
  }

  async function boot() {
    try {
      installNavigator();

      const instance = await createPlanetarioInstance();
      window.planetario = instance;

      log('Planetário inicializado com sucesso.');

      // a UI é montada durante a inicialização
      setTimeout(bindHubButton, 150);
      setTimeout(bindHubButton, 600);
      setTimeout(bindHubButton, 1200);

    } catch (error) {
      console.error('❌ Falha ao iniciar o Planetário:', error);

      const controls = document.querySelector('.module-controls');
      if (controls) {
        controls.innerHTML = `
          <div style="padding:16px;color:#fff;background:#2b1020;border:1px solid rgba(255,255,255,.15);border-radius:12px;">
            <h3 style="margin:0 0 8px 0;">Falha ao carregar o Planetário</h3>
            <p style="margin:0 0 12px 0;opacity:.9;">${String(error.message || error)}</p>
            <button id="btn-fallback-hub" style="padding:10px 14px;border-radius:10px;border:none;cursor:pointer;">
              Voltar ao hub
            </button>
          </div>
        `;

        const btn = document.getElementById('btn-fallback-hub');
        if (btn) {
          btn.addEventListener('click', function () {
            window.location.href = deriveHubUrl();
          });
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
