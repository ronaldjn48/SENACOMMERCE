/*
 * Motores de cálculo compartidos entre actividades:
 * pagos, logística, promociones y lectura del proyecto integrado del aprendiz.
 */
(function () {
  /* ---------- Pagos ---------- */
  const metodosPago = [
    { id: 'tarjeta', nombre: 'Tarjeta crédito / débito', tipo: 'tarjeta', pct: 2.99, fijo: 900 },
    { id: 'pse', nombre: 'PSE (débito a cuenta bancaria)', tipo: 'transferencia', pct: 1.5, fijo: 1500 },
    { id: 'nequi', nombre: 'Nequi', tipo: 'billetera', pct: 1.5, fijo: 0 },
    { id: 'daviplata', nombre: 'Daviplata', tipo: 'billetera', pct: 1.5, fijo: 0 },
    { id: 'efectivo', nombre: 'Efectivo en corresponsal', tipo: 'efectivo', pct: 2.5, fijo: 2000 },
    { id: 'contraentrega', nombre: 'Pago contra entrega', tipo: 'contraentrega', pct: 0, fijo: 6000 },
    { id: 'bnpl', nombre: 'Compra ahora, paga después', tipo: 'credito', pct: 4.5, fijo: 0 },
  ];

  function costoTransaccion(monto, metodo, ivaComision = 19) {
    const comision = (monto * (Number(metodo.pct) || 0)) / 100 + (Number(metodo.fijo) || 0);
    const iva = (comision * ivaComision) / 100;
    return { comision, iva, total: comision + iva, neto: monto - comision - iva };
  }

  /* ---------- Logística ---------- */
  const transportadoras = [
    { id: 'servientrega', nombre: 'Servientrega', base: { local: 8000, nacional: 12000, especial: 28000 }, kg: 1800, dias: { local: 1, nacional: 3, especial: 6 } },
    { id: 'coordinadora', nombre: 'Coordinadora', base: { local: 7500, nacional: 12500, especial: 30000 }, kg: 1600, dias: { local: 1, nacional: 2, especial: 7 } },
    { id: 'interrapidisimo', nombre: 'Interrapidísimo', base: { local: 7000, nacional: 11000, especial: 25000 }, kg: 2000, dias: { local: 2, nacional: 4, especial: 8 } },
    { id: 'envia', nombre: 'Envía', base: { local: 8500, nacional: 11500, especial: 27000 }, kg: 1500, dias: { local: 1, nacional: 3, especial: 7 } },
  ];

  function zonaEnvio(origen, destino) {
    if (origen === destino) return 'local';
    const ciudad = SC.datos.ciudades.find((c) => c.nombre === destino);
    return ciudad && ciudad.zona === 'especial' ? 'especial' : 'nacional';
  }

  function pesoVolumetrico(p) {
    return ((Number(p.largo) || 0) * (Number(p.ancho) || 0) * (Number(p.alto) || 0)) / 5000;
  }

  function cotizarEnvio({ transportadora, origen, destino, pesoFacturable, valorDeclarado }) {
    const zona = zonaEnvio(origen, destino);
    const ciudad = SC.datos.ciudades.find((c) => c.nombre === destino);
    const recargoIntermedia = ciudad && ciudad.zona === 'intermedia' && zona === 'nacional' ? 2000 : 0;
    const kilosAdicionales = Math.max(0, Math.ceil(pesoFacturable) - 1);
    const flete = transportadora.base[zona] + kilosAdicionales * transportadora.kg + recargoIntermedia;
    const seguro = Math.round((valorDeclarado || 0) * 0.01);
    return { zona, flete, seguro, total: flete + seguro, dias: transportadora.dias[zona] };
  }

  /* ---------- Promociones ---------- */
  const tiposPromo = [
    { id: 'porcentaje', nombre: 'Descuento porcentual' },
    { id: 'valor', nombre: 'Descuento en valor fijo' },
    { id: 'nxm', nombre: 'Lleve N pague M' },
    { id: 'envio', nombre: 'Envío gratis' },
    { id: 'cupon', nombre: 'Cupón de descuento' },
  ];

  function promoVigente(promo, hoy) {
    const fecha = hoy || new Date().toISOString().slice(0, 10);
    if (promo.desde && fecha < promo.desde) return false;
    if (promo.hasta && fecha > promo.hasta) return false;
    return promo.activa !== false;
  }

  function calcularCarrito({ items = [], productos = [], promos = [], cupon = '', envioBase = 12000, hoy }) {
    const lineas = items
      .map((it) => {
        const p = productos.find((x) => x.sku === it.sku);
        if (!p) return null;
        const cantidad = Math.max(0, Number(it.cantidad) || 0);
        return { sku: p.sku, nombre: p.nombre, categoria: p.categoria, precio: Number(p.precio), costo: Number(p.costo), cantidad, subtotal: Number(p.precio) * cantidad };
      })
      .filter((l) => l && l.cantidad > 0);

    const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
    const costo = lineas.reduce((s, l) => s + l.costo * l.cantidad, 0);
    const codigo = String(cupon || '').trim().toUpperCase();

    const evaluadas = promos
      .filter((p) => promoVigente(p, hoy))
      .map((p) => {
        const minimo = Number(p.montoMinimo) || 0;
        let descuento = 0;
        let envioGratis = false;
        let motivo = '';
        if (subtotal < minimo) motivo = `Requiere compra mínima de ${SC.fmt.cop(minimo)}`;
        else if (p.tipo === 'porcentaje') {
          const base = lineas.filter((l) => !p.categoria || p.categoria === 'todas' || l.categoria === p.categoria).reduce((s, l) => s + l.subtotal, 0);
          descuento = (base * (Number(p.valor) || 0)) / 100;
          if (!base) motivo = 'El carrito no tiene productos de la categoría';
        } else if (p.tipo === 'valor') {
          descuento = Math.min(Number(p.valor) || 0, subtotal);
        } else if (p.tipo === 'nxm') {
          const linea = lineas.find((l) => l.sku === p.sku);
          const n = Number(p.n) || 0;
          const m = Number(p.m) || 0;
          if (linea && n > m && m > 0) descuento = Math.floor(linea.cantidad / n) * (n - m) * linea.precio;
          if (!linea) motivo = 'El producto de la promoción no está en el carrito';
          else if (!descuento) motivo = `Agrega ${n} unidades para activar`;
        } else if (p.tipo === 'envio') {
          envioGratis = true;
        } else if (p.tipo === 'cupon') {
          if (codigo && codigo === String(p.codigo || '').trim().toUpperCase()) {
            descuento = (subtotal * (Number(p.valor) || 0)) / 100;
            const tope = Number(p.tope) || 0;
            if (tope > 0) descuento = Math.min(descuento, tope);
          } else motivo = codigo ? 'Código no coincide' : 'Ingresa el código del cupón';
        }
        const aplica = !motivo && (descuento > 0 || envioGratis);
        return { promo: p, descuento: Math.round(descuento), envioGratis, aplica, motivo };
      });

    // Regla del motor: las promociones acumulables se suman. Entre las no acumulables gana la de mayor beneficio.
    const aplicables = evaluadas.filter((e) => e.aplica);
    const acumulables = aplicables.filter((e) => e.promo.acumulable);
    const exclusivas = aplicables.filter((e) => !e.promo.acumulable);
    const valorBeneficio = (e) => e.descuento + (e.envioGratis ? envioBase : 0);
    const mejorExclusiva = exclusivas.sort((a, b) => valorBeneficio(b) - valorBeneficio(a))[0];
    const aplicadas = [...acumulables, ...(mejorExclusiva ? [mejorExclusiva] : [])];

    const descuento = Math.min(subtotal, aplicadas.reduce((s, e) => s + e.descuento, 0));
    const envioGratis = aplicadas.some((e) => e.envioGratis);
    const envio = lineas.length ? (envioGratis ? 0 : envioBase) : 0;
    const ventaNeta = subtotal - descuento;
    const margen = ventaNeta - costo - (envioGratis ? envioBase : 0);
    const margenPct = ventaNeta > 0 ? (margen / ventaNeta) * 100 : 0;

    return { lineas, subtotal, costo, evaluadas, aplicadas, descuento, envio, envioGratis, ventaNeta, total: ventaNeta + envio, margen, margenPct };
  }

  /* ---------- Proyecto integrado ---------- */
  const UNIDADES_POR_PEDIDO = 1.4;

  // Reúne en un objeto los productos de cada actividad para que las fases se conecten entre sí.
  function proyecto(estado) {
    const d = estado.datos || {};
    const perfil = estado.perfil || {};
    const nicho = SC.datos.nichos[perfil.nicho] || SC.datos.nichos.moda;
    const marca = (d[1] && d[1].marca) || { nombre: perfil.tienda || 'Mi tienda', slogan: '', descripcion: '' };
    const productos = (d[3] && d[3].productos) || [];
    const pagos = d[2] || {};
    const metodosActivos = metodosPago
      .filter((m) => pagos.metodos && pagos.metodos[m.id] && pagos.metodos[m.id].activo)
      .map((m) => ({ ...m, ...pagos.metodos[m.id] }));
    const promos = (d[5] && d[5].promos) || [];
    const precioPromedio = productos.length ? productos.reduce((s, p) => s + Number(p.precio || 0), 0) / productos.length : 60000;
    return {
      perfil,
      nicho,
      marca,
      productos,
      pagos,
      metodosActivos,
      promos,
      inventario: d[4] || {},
      pauta: d[6] || {},
      semilla: `${perfil.documento || 'demo'}-${perfil.nicho || 'moda'}`,
      precioPromedio,
      // Ticket promedio estimado: precio promedio × 1,4 unidades por pedido.
      ticketPromedio: precioPromedio * UNIDADES_POR_PEDIDO,
      margenPromedio: productos.length
        ? productos.reduce((s, p) => s + (Number(p.precio) - Number(p.costo)) / Number(p.precio || 1), 0) / productos.length
        : 0.4,
    };
  }

  SC.motores = { metodosPago, costoTransaccion, transportadoras, zonaEnvio, pesoVolumetrico, cotizarEnvio, tiposPromo, promoVigente, calcularCarrito, proyecto };
})();
