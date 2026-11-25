/* =====================================================================
   Modelo clínica dental — comportamento do site
   Tudo aqui é MELHORIA: sem JS o conteúdo inteiro já aparece
   (menu vira link para o rodapé, "Saber más" abre sozinho, o FAQ abre
   sozinho, o mapa vira link para o Google Maps).
   Nada de terceiros carrega sem clique/consentimento.
   ===================================================================== */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DADOS = {};
  try { DADOS = JSON.parse(document.getElementById("datos-clinica").textContent); } catch (e) { /* sem dados */ }
  var app = { lenis: null };

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function guardar(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ---------- Horário de hoje + destaque na tabela ---------- */
  function iniciarHorario() {
    if (!window.HorarioClinica || !DADOS.horario) return;
    var alvo = $("[data-horario-hoy]");
    function atualizar() {
      var e = window.HorarioClinica.estado(DADOS.horario);
      if (alvo) {
        alvo.textContent = e.texto;
        var li = alvo.closest("[data-horario-estado]");
        if (li) li.classList.toggle("is-abierto", e.aberto);
      }
      var hoje = String(window.HorarioClinica.hojeIndice());
      $$(".horario tr[data-dias]").forEach(function (tr) {
        var sim = tr.getAttribute("data-dias").split(",").indexOf(hoje) > -1;
        tr.classList.toggle("es-hoy", sim);
        if (sim) tr.setAttribute("aria-current", "date"); else tr.removeAttribute("aria-current");
      });
    }
    atualizar();
    setInterval(atualizar, 60000); // vira sozinho "Abierto" → "Cerrado" com a página aberta
  }

  /* ---------- Cabeçalho: some ao descer, volta ao subir ---------- */
  function iniciarCabecera() {
    var cab = $("[data-cabecera]");
    if (!cab) return;
    var ultimo = window.scrollY, pendente = false;
    function atualizar() {
      pendente = false;
      var y = window.scrollY;
      if (doc.classList.contains("menu-abierto")) { ultimo = y; return; }
      cab.classList.toggle("is-fija", y > 8);
      if (y < 160) cab.classList.remove("is-oculta");
      else if (Math.abs(y - ultimo) > 6) cab.classList.toggle("is-oculta", y > ultimo);
      ultimo = y;
    }
    window.addEventListener("scroll", function () {
      if (!pendente) { pendente = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
    cab.addEventListener("focusin", function () { cab.classList.remove("is-oculta"); });
  }

  /* ---------- Menu do celular ---------- */
  function iniciarMenu() {
    var btn = $("[data-menu-boton]"), menu = $("#menu-movil");
    if (!btn || !menu) return;
    // sem JS é um link para o menu do rodapé; com JS vira botão
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-expanded", "false");
    btn.removeAttribute("href");
    btn.tabIndex = 0;
    function abrir(sim) {
      btn.setAttribute("aria-expanded", String(sim));
      btn.setAttribute("aria-label", sim ? "Cerrar menú" : "Menú");
      menu.hidden = !sim;
      doc.classList.toggle("menu-abierto", sim);
      doc.classList.toggle("sin-scroll", sim);
      if (app.lenis) sim ? app.lenis.stop() : app.lenis.start();
      if (sim) { var a = $("a", menu); if (a) a.focus(); }
    }
    function alternar() { abrir(btn.getAttribute("aria-expanded") !== "true"); }
    btn.addEventListener("click", alternar);
    btn.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alternar(); } });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) abrir(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { abrir(false); btn.focus(); }
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (m) { if (m.matches) abrir(false); });
  }

  /* ---------- "Saber más" (popover nativo): só ajustes finos ---------- */
  function iniciarDetalhes() {
    $$(".detalle[popover]").forEach(function (p) {
      p.addEventListener("toggle", function (e) {
        var aberto = e.newState === "open";
        doc.classList.toggle("sin-scroll", aberto);
        if (app.lenis) aberto ? app.lenis.stop() : app.lenis.start();
        if (aberto) { var f = $(".detalle__cerrar", p); if (f) f.focus({ preventScroll: true }); }
      });
    });
  }

  /* ---------- Galeria em tela cheia ---------- */
  function iniciarGaleria() {
    var itens = $$("[data-galeria]");
    if (!itens.length || typeof HTMLDialogElement !== "function") return;
    var visor = document.createElement("dialog");
    visor.className = "visor";
    visor.setAttribute("aria-label", "Fotos de la clínica");
    visor.innerHTML =
      '<div class="visor__barra"><span data-visor-cont aria-live="polite"></span>' +
      '<button type="button" data-visor-cerrar aria-label="Cerrar">' + svg("M6 6l12 12M18 6 6 18") + "</button></div>" +
      '<div class="visor__img"><img alt="" data-visor-img></div>' +
      '<div class="visor__nav"><button type="button" class="visor__ant" data-visor-ant aria-label="Foto anterior">' + svg("M5 12h13M13 6l6 6-6 6") + "</button>" +
      '<button type="button" data-visor-sig aria-label="Foto siguiente">' + svg("M5 12h13M13 6l6 6-6 6") + "</button></div>";
    document.body.appendChild(visor);
    var img = $("[data-visor-img]", visor), cont = $("[data-visor-cont]", visor), atual = 0;
    function mostrar(i) {
      atual = (i + itens.length) % itens.length;
      var a = itens[atual], mini = $("img", a);
      img.src = a.getAttribute("href");
      img.alt = mini ? mini.alt : "";
      cont.textContent = (atual + 1) + " / " + itens.length;
    }
    itens.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        mostrar(i);
        visor.showModal();
        if (app.lenis) app.lenis.stop();
      });
    });
    visor.addEventListener("close", function () { if (app.lenis) app.lenis.start(); itens[atual].focus(); });
    $("[data-visor-cerrar]", visor).addEventListener("click", function () { visor.close(); });
    $("[data-visor-ant]", visor).addEventListener("click", function () { mostrar(atual - 1); });
    $("[data-visor-sig]", visor).addEventListener("click", function () { mostrar(atual + 1); });
    visor.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") mostrar(atual - 1);
      if (e.key === "ArrowRight") mostrar(atual + 1);
    });
    visor.addEventListener("click", function (e) { if (e.target === visor || e.target.classList.contains("visor__img")) visor.close(); });
  }
  function svg(d) {
    return '<svg class="icono" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }

  /* ---------- Modo demo: aviso no lugar de ligar / abrir WhatsApp ----------
     (o gerador já trocou os links por href="#demo" data-demo="whatsapp|telefono").
     O aviso fala com a DONA da clínica, que é quem abre a vista previa. */
  var AVISOS_DEMO = {
    whatsapp: "En la web real, este botón abre el WhatsApp de tu clínica con el mensaje ya escrito.",
    telefono: "En la web real, este botón llama directamente al teléfono de tu clínica.",
    email: "En la web real, este enlace abre un correo nuevo dirigido al email de tu clínica.",
  };
  var avisoDemo = null, avisoTempo = null;
  function mostrarAvisoDemo(texto, mensagem) {
    if (!avisoDemo) {
      avisoDemo = document.createElement("div");
      avisoDemo.className = "aviso-toque";
      avisoDemo.setAttribute("role", "status");
      avisoDemo.setAttribute("aria-live", "polite");
      avisoDemo.innerHTML = '<span class="aviso-toque__selo">Demo</span><div class="aviso-toque__cuerpo"><p data-aviso-texto></p>' +
        '<blockquote class="aviso-toque__mensaje" data-aviso-mensaje hidden></blockquote></div>' +
        '<button class="aviso-toque__cerrar" type="button" aria-label="Cerrar aviso">' + svg("M6 6l12 12M18 6 6 18") + "</button>";
      document.body.appendChild(avisoDemo);
      $(".aviso-toque__cerrar", avisoDemo).addEventListener("click", fecharAvisoDemo);
    }
    $("[data-aviso-texto]", avisoDemo).textContent = texto;
    var m = $("[data-aviso-mensaje]", avisoDemo);
    m.hidden = !mensagem;
    m.textContent = mensagem || "";
    avisoDemo.classList.remove("is-visible");
    void avisoDemo.offsetWidth;                         // reinicia a animação se tocar de novo
    avisoDemo.classList.add("is-visible");
    clearTimeout(avisoTempo);
    avisoTempo = setTimeout(fecharAvisoDemo, mensagem ? 9000 : 5000);
  }
  function fecharAvisoDemo() { if (avisoDemo) avisoDemo.classList.remove("is-visible"); }
  function iniciarDemo() {
    if (!DADOS.demo) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-demo]");
      if (!a) return;
      e.preventDefault();
      mostrarAvisoDemo(AVISOS_DEMO[a.getAttribute("data-demo")] || AVISOS_DEMO.whatsapp);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharAvisoDemo(); });
  }

  /* ---------- Formulário → WhatsApp (nada é guardado) ---------- */
  function iniciarFormulario() {
    var f = $("[data-formulario-wa]");
    if (!f || !(DADOS.whatsapp || DADOS.demo)) return;
    var erro = $("#f-error", f);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = f.nombre.value.trim();
      if (!nome) {
        erro.textContent = DADOS.usted ? "Escriba su nombre, por favor." : "Escribe tu nombre, por favor.";
        erro.hidden = false;
        f.nombre.setAttribute("aria-invalid", "true");
        f.nombre.focus();
        return;
      }
      erro.hidden = true;
      f.nombre.removeAttribute("aria-invalid");
      var franja = (f.querySelector("input[name=franja]:checked") || {}).value || "me da igual";
      var msg = "Hola, soy " + nome + ". Me gustaría pedir cita en " + DADOS.clinica + " para " + f.motivo.value + ".";
      msg += franja === "me da igual" ? " Me viene bien cualquier horario." : " Me viene mejor " + franja + ".";
      var extra = f.mensaje.value.trim();
      if (extra) msg += "\n\n" + extra;
      // demo: mostra a mensagem que seria enviada, sem abrir WhatsApp nenhum
      if (DADOS.demo) { mostrarAvisoDemo("En la web real, se abriría el WhatsApp de tu clínica con este mensaje:", msg); return; }
      window.open("https://wa.me/" + DADOS.whatsapp + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
    });
  }

  /* ---------- Mapa: só carrega o Google depois do clique ---------- */
  var CHAVE_MAPA = "clinica-mapa-google";
  function carregarMapa(m) {
    if (m.classList.contains("is-cargado")) return;
    var f = document.createElement("iframe");
    f.src = m.getAttribute("data-src");
    f.title = m.getAttribute("data-titulo") || "Mapa";
    f.loading = "lazy";
    f.referrerPolicy = "no-referrer-when-downgrade";
    f.setAttribute("allowfullscreen", "");
    m.appendChild(f);
    m.classList.add("is-cargado");
  }
  function iniciarMapa() {
    $$("[data-mapa]").forEach(function (m) {
      var botao = $("[data-mapa-cargar]", m);
      if (botao) botao.addEventListener("click", function (e) {
        e.preventDefault();
        guardar(CHAVE_MAPA, "si");
        carregarMapa(m);
      });
      // já aceitou antes: carrega quando o mapa chegar perto da tela
      if (ler(CHAVE_MAPA) === "si" && "IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { carregarMapa(m); io.disconnect(); }
        }, { rootMargin: "400px" });
        io.observe(m);
      }
    });
  }

  /* ---------- Analítica: SÓ se o config tiver IDs, e SÓ depois de aceitar ---------- */
  var CHAVE_COOKIES = "clinica-cookies";
  function carregarAnalitica() {
    var a = DADOS.analitica || {};
    if (a.googleAnalytics) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(a.googleAnalytics);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", a.googleAnalytics, { anonymize_ip: true });
    }
    if (a.metaPixel) {
      /* código oficial do pixel, resumido */
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", a.metaPixel);
      window.fbq("track", "PageView");
    }
  }
  function iniciarCookies() {
    var faixa = $("[data-cookies]");
    var a = DADOS.analitica || {};
    if (!faixa || !(a.googleAnalytics || a.metaPixel)) return;
    var escolha = ler(CHAVE_COOKIES);
    if (escolha === "si") carregarAnalitica();
    else if (escolha !== "no") faixa.hidden = false;
    $("[data-cookies-aceptar]", faixa).addEventListener("click", function () { guardar(CHAVE_COOKIES, "si"); faixa.hidden = true; carregarAnalitica(); });
    $("[data-cookies-rechazar]", faixa).addEventListener("click", function () { guardar(CHAVE_COOKIES, "no"); faixa.hidden = true; });
  }
  // página Cookies: "Retirar mi consentimiento"
  function iniciarRevogar() {
    var b = $("[data-revocar]");
    if (!b) return;
    b.addEventListener("click", function () {
      guardar(CHAVE_MAPA, null);
      guardar(CHAVE_COOKIES, null);
      var ok = $("[data-revocar-ok]");
      if (ok) ok.hidden = false;
      var faixa = $("[data-cookies]");
      if (faixa) faixa.hidden = false;
    });
  }

  /* ---------- WhatsApp flutuante: depois da primeira tela, fora do rodapé ---------- */
  function iniciarFlutuante() {
    var b = $("[data-wa-flotante]");
    if (!b) return;
    var pie = $("#pie"), noPe = false;
    function atualizar() { b.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.8 && !noPe); }
    if (pie && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { noPe = es[0].isIntersecting; atualizar(); }).observe(pie);
    }
    window.addEventListener("scroll", atualizar, { passive: true });
    atualizar();
  }

  /* ---------- Rolagem suave + animações (GSAP), como no site da musgo ----------
     As bibliotecas (127 KB) só carregam DEPOIS que a página apareceu, para não
     atrasar a primeira tela. A entrada do topo é feita só com CSS. */
  var VENDOR = ["gsap-3.12.5.min.js", "ScrollTrigger-3.12.5.min.js", "lenis-1.1.13.min.js"];
  function carregarScript(src) {
    return new Promise(function (ok, falha) {
      var s = document.createElement("script");
      s.src = src; s.async = false; s.onload = ok; s.onerror = falha;
      document.head.appendChild(s);
    });
  }
  function carregarMovimento() {
    if (reducido) return;
    var base = (document.currentScript && document.currentScript.src) || ($('script[src*="app.js"]') || {}).src || "";
    base = base.replace(/app\.js.*$/, "vendor/");
    VENDOR.reduce(function (p, f) { return p.then(function () { return carregarScript(base + f); }); }, Promise.resolve())
      .then(function () { try { iniciarMovimento(); } catch (e) { /* sem animação, conteúdo visível */ } })
      .catch(function () { /* sem animação, conteúdo visível */ });
  }
  // carrega no PRIMEIRO gesto do visitante (rolar, tocar, mouse, teclado): é quando as
  // animações de rolagem passam a fazer sentido, e a primeira tela fica 100% livre.
  function depoisDeCarregar(fn) {
    var feito = false, eventos = ["scroll", "wheel", "pointerdown", "pointermove", "touchstart", "keydown"];
    function uma() {
      if (feito) return;
      feito = true;
      eventos.forEach(function (e) { window.removeEventListener(e, uma, { passive: true }); });
      fn();
    }
    eventos.forEach(function (e) { window.addEventListener(e, uma, { passive: true }); });
    if (window.scrollY > 0) uma();   // abriu já rolado (voltar/atualizar)
  }

  /* Ritmo de cada tema (Etapa 3). Sempre com propósito: guiar o olho na ordem de leitura
     (rótulo → título → conteúdo), nunca enfeite em loop.
     calma = respiração lenta · premium = cinema · cercana = leve e saltitante */
  var RITMOS = {
    calma:   { dur: 1.2,  ease: "sine.out",       y: 18, passo: 0.14, escala: 1,    lerp: 0.07 },
    premium: { dur: 1.15, ease: "expo.out",       y: 36, passo: 0.12, escala: 1,    lerp: 0.085, cinema: true },
    cercana: { dur: 0.7,  ease: "back.out(1.7)",  y: 30, passo: 0.06, escala: 0.94, lerp: 0.12, pulo: true },
  };

  function iniciarMovimento() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST) return;
    gsap.registerPlugin(ST);
    var R = RITMOS[doc.getAttribute("data-tema")] || RITMOS.calma;
    var celular = window.matchMedia("(max-width: 959px), (pointer: coarse)").matches;

    if (typeof window.Lenis === "function") {
      app.lenis = new window.Lenis({ lerp: R.lerp, smoothWheel: true });
      app.lenis.on("scroll", ST.update);
      gsap.ticker.add(function (t) { app.lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      // âncoras do menu usam o Lenis
      $$('a[href^="#"]').forEach(function (a) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        a.addEventListener("click", function (e) {
          var alvo = document.getElementById(id.slice(1));
          if (!alvo) return;
          e.preventDefault();
          app.lenis.scrollTo(alvo, { offset: id === "#contenido" ? 0 : -24, duration: R.dur + 0.3 });
          history.replaceState(null, "", id);
          if (id === "#contenido") alvo.focus({ preventScroll: true });
        });
      });
    }

    // Alvos: os cabeçalhos de seção entram em partes (rótulo → título → texto);
    // o resto entra bloco a bloco. Só o que AINDA está abaixo da tela é escondido (nada pisca).
    var alvos = [];
    $$("[data-revelar]").forEach(function (el) {
      if (el.matches(".seccion__cabecera, .porque__intro")) alvos = alvos.concat($$(":scope > *", el));
      else alvos.push(el);
    });
    alvos = alvos.filter(function (el) { return el.getBoundingClientRect().top > window.innerHeight; });
    if (!alvos.length) { ST.refresh(); return; }
    doc.classList.add("anim");

    var de = { opacity: 0, y: R.y };
    if (R.escala !== 1) de.scale = R.escala;
    gsap.set(alvos, de);
    alvos.forEach(function (el) { el.classList.add("pendente"); });

    // premium: fotos se revelam como cortina (de baixo para cima) e "assentam"
    var fotosCinema = R.cinema ? alvos.map(function (el) { return $(".galeria__item, .persona__foto", el); }).filter(Boolean) : [];
    if (fotosCinema.length) {
      gsap.set(fotosCinema, { clipPath: "inset(100% 0% 0% 0%)" });
      gsap.set(fotosCinema.map(function (f) { return $("img", f); }), { scale: 1.12 });
    }

    ST.batch(alvos, {
      start: "top 90%",
      once: true,
      onEnter: function (els) {
        var tl = gsap.timeline();
        tl.to(els, { opacity: 1, y: 0, scale: 1, duration: R.dur, ease: R.ease, stagger: R.passo, overwrite: true, clearProps: "transform" });
        els.forEach(function (el, i) {
          el.classList.remove("pendente");
          el.classList.add("is-visto");   // CSS: linhas que se desenham, ícones que pulam
          if (R.cinema) {
            var f = $(".galeria__item, .persona__foto", el);
            if (f) {
              tl.to(f, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut" }, i * R.passo);
              tl.to($("img", f), { scale: 1, duration: 1.8, ease: "expo.out" }, i * R.passo + 0.2);
            }
          }
        });
      },
    });

    // premium: leve paralaxe nas fotos grandes — SÓ no computador (no celular pode travar a rolagem)
    if (R.cinema && !celular) {
      $$(".galeria li:first-child img, [data-heroi-media] img").forEach(function (im) {
        gsap.fromTo(im, { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: im.closest("li, section"), start: "top bottom", end: "bottom top", scrub: true } });
      });
    }
    ST.refresh();
  }

  // O que aparece na primeira tela roda já; o resto roda quando o navegador estiver livre,
  // cada parte numa tarefa separada (não trava o celular enquanto a página aparece).
  function quandoLivre(fn) {
    if ("requestIdleCallback" in window) requestIdleCallback(function () { fn(); }, { timeout: 2000 });
    else setTimeout(fn, 1);
  }
  function iniciar() {
    iniciarHorario();
    iniciarDemo();         // já: um toque num botão da demo nunca pode ficar sem resposta
    iniciarFormulario();   // já: nunca deixar o formulário enviar "sozinho" (o nome iria parar no endereço)
    // menu e cabeçalho também esperam o navegador ficar livre: até lá o botão do menu
    // funciona como link para o menu do rodapé (nada quebra)
    [iniciarCabecera, iniciarMenu, iniciarDetalhes, iniciarMapa, iniciarCookies, iniciarRevogar, iniciarFlutuante, iniciarGaleria]
      .forEach(function (fn) { quandoLivre(fn); });
    depoisDeCarregar(carregarMovimento);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
