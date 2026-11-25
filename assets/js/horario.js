/* =====================================================================
   Horário da clínica — "Abierto hoy hasta las 20:00" e afins.
   Sempre no fuso da Espanha peninsular (Europe/Madrid), seja qual for
   o fuso do celular do paciente. Trata horário partido, fim de semana,
   feriados (fechados) e dias com horário especial.
   Funciona no navegador (window.HorarioClinica) e no Node (testes).
   ===================================================================== */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.HorarioClinica = fabrica();
})(this, function () {
  "use strict";

  // índice = getUTCDay() (0 = domingo)
  var DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  var DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  function dois(n) { return (n < 10 ? "0" : "") + n; }
  function minutos(hhmm) { var p = hhmm.split(":"); return +p[0] * 60 + +p[1]; }
  function hora(m) { return Math.floor(m / 60) + ":" + dois(m % 60); }     // 570 → "9:30"

  // data e hora "de parede" em Madrid
  function agoraMadrid(data) {
    var partes = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(data).forEach(function (p) { partes[p.type] = p.value; });
    return { ano: +partes.year, mes: +partes.month, dia: +partes.day, minutos: +partes.hour * 60 + +partes.minute };
  }

  // dia de calendário + n dias (sem problemas de fuso: conta em UTC)
  function diaMais(base, n) {
    var d = new Date(Date.UTC(base.ano, base.mes - 1, base.dia + n));
    return {
      iso: d.getUTCFullYear() + "-" + dois(d.getUTCMonth() + 1) + "-" + dois(d.getUTCDate()),
      semana: d.getUTCDay(), dia: d.getUTCDate(), mes: d.getUTCMonth()
    };
  }

  // turnos de um dia: [[ini, fim], ...] em minutos. Feriado = []
  function turnos(cfg, d) {
    var lista;
    if (cfg.especiais && cfg.especiais[d.iso]) lista = cfg.especiais[d.iso];
    else if (cfg.fechados && cfg.fechados.indexOf(d.iso) > -1) lista = [];
    else lista = cfg.semana[DIAS[d.semana]] || [];
    return lista.map(function (t) { var p = t.split("-"); return [minutos(p[0]), minutos(p[1])]; })
      .sort(function (a, b) { return a[0] - b[0]; });
  }

  function quando(d, n) {
    if (n === 1) return "mañana";
    if (n < 7) return "el " + DIAS_ES[d.semana];
    return "el " + d.dia + " de " + MESES[d.mes];
  }

  /* Estado agora. cfg = { semana: {lunes: ["09:30-13:30", ...], ...}, fechados: ["2026-12-25"], especiais: {"2026-12-24": ["09:00-14:00"]} }
     Devolve { aberto: bool, texto: "..." } */
  function estado(cfg, data) {
    var agora = agoraMadrid(data || new Date());
    var hoje = diaMais(agora, 0);
    var hj = turnos(cfg, hoje);
    var m = agora.minutos;
    var festivo = !hj.length && cfg.fechados && cfg.fechados.indexOf(hoje.iso) > -1;

    for (var i = 0; i < hj.length; i++) {
      var t = hj[i];
      if (m >= t[0] && m < t[1]) {
        if (i === hj.length - 1) return { aberto: true, texto: "Abierto hoy hasta las " + hora(t[1]) };
        return { aberto: true, texto: "Abierto hasta las " + hora(t[1]) + " · reabrimos a las " + hora(hj[i + 1][0]) };
      }
      if (m < t[0]) {
        if (i === 0) return { aberto: false, texto: "Hoy abrimos a las " + hora(t[0]) };
        return { aberto: false, texto: "Cerrado ahora · reabrimos a las " + hora(t[0]) };
      }
    }
    // fechado pelo resto do dia: procura o próximo dia com horário (até 60 dias)
    var inicio = hj.length ? "Ya hemos cerrado" : festivo ? "Hoy cerrado (festivo)" : "Hoy cerrado";
    for (var n = 1; n <= 60; n++) {
      var d = diaMais(agora, n), td = turnos(cfg, d);
      if (td.length) return { aberto: false, texto: inicio + " · abrimos " + quando(d, n) + " a las " + hora(td[0][0]) };
    }
    return { aberto: false, texto: inicio };
  }

  // índice do dia de hoje (0 = lunes … 6 = domingo), para destacar na tabela
  function hojeIndice(data) {
    var s = diaMais(agoraMadrid(data || new Date()), 0).semana;
    return (s + 6) % 7;
  }

  return { estado: estado, hojeIndice: hojeIndice };
});
