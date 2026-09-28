/*
 * Núcleo del simulador SENACOMMERCE.
 * Define el espacio de nombres global SC, el enlace htm + React y las utilidades comunes.
 */
(function () {
  const html = htm.bind(React.createElement);

  const nfCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const nfNum = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

  const fmt = {
    cop: (n) => nfCOP.format(Math.round(Number(n) || 0)),
    num: (n) => nfNum.format(Number(n) || 0),
    pct: (n, dec = 1) => `${(Number(n) || 0).toFixed(dec)} %`,
    fecha: (ts) => new Date(ts).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
  };

  // Generador pseudoaleatorio con semilla (mulberry32). Cada aprendiz recibe datos distintos
  // según su documento, así los resultados de dos aprendices no coinciden.
  function semillaDesdeTexto(texto) {
    let h = 1779033703 ^ String(texto).length;
    for (let i = 0; i < String(texto).length; i++) {
      h = Math.imul(h ^ String(texto).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0) || 1;
  }

  function crearAleatorio(semilla) {
    let a = typeof semilla === 'number' ? semilla : semillaDesdeTexto(semilla);
    const rnd = function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rnd.entero = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
    rnd.elegir = (lista) => lista[Math.floor(rnd() * lista.length)];
    rnd.mezclar = (lista) => {
      const copia = lista.slice();
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    };
    return rnd;
  }

  const util = {
    uid: (prefijo = 'id') => `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    crearAleatorio,
    semillaDesdeTexto,
    num: (v) => {
      if (v === '' || v === null || v === undefined) return NaN;
      return Number(String(v).replace(',', '.'));
    },
    cerca: (valor, esperado, tolerancia = 0.01) => {
      const v = Number(valor);
      if (!Number.isFinite(v)) return false;
      if (esperado === 0) return Math.abs(v) <= 0.5;
      return Math.abs(v - esperado) / Math.abs(esperado) <= tolerancia;
    },
    palabras: (texto) => String(texto || '').trim().split(/\s+/).filter(Boolean).length,
    normalizar: (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
    descargar: (nombre, contenido, tipo = 'text/plain;charset=utf-8') => {
      const blob = new Blob([contenido], { type: tipo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    escaparHTML: (texto) =>
      String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    csvCampo: (v) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    },
  };

  const almacen = {
    clave: 'senacommerce_v1',
    leer() {
      try {
        const crudo = localStorage.getItem(this.clave);
        return crudo ? JSON.parse(crudo) : null;
      } catch (e) {
        return null;
      }
    },
    guardar(estado) {
      try {
        localStorage.setItem(this.clave, JSON.stringify(estado));
      } catch (e) {
        /* El navegador bloquea el almacenamiento: el simulador sigue funcionando en memoria. */
      }
    },
    borrar() {
      try {
        localStorage.removeItem(this.clave);
      } catch (e) {
        /* sin almacenamiento disponible */
      }
    },
  };

  window.SC = {
    html,
    fmt,
    util,
    almacen,
    ui: {},
    motores: {},
    datos: {},
    actividades: [],
    registrar(actividad) {
      this.actividades.push(actividad);
      this.actividades.sort((a, b) => a.orden - b.orden);
    },
  };
})();
