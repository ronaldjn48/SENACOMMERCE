/* Actividad 4. Tablero de inventario y despachos logísticos. */
(function () {
  const { html, ui, fmt, util, motores } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, Seleccion, Entrega, Aviso, Boton, Insignia, Pestanas, Metrica } = ui;

  const estados = {
    pendiente: { texto: 'Pendiente', color: 'sol' },
    alistado: { texto: 'Alistado', color: 'cielo' },
    despachado: { texto: 'Despachado', color: 'lila' },
    entregado: { texto: 'Entregado', color: 'menta' },
  };
  const justificaciones = ['Menor tiempo de entrega', 'Mejor cobertura en el destino', 'Solicitud expresa del cliente', 'Convenio comercial vigente'];

  // Crea el estado inicial del tablero a partir del catálogo y de la semilla del aprendiz.
  function inicializar(proyecto) {
    const rnd = util.crearAleatorio(`${proyecto.semilla}-inventario`);
    const productos = proyecto.productos;
    const stock = {};
    const kardex = [];
    productos.forEach((p) => {
      stock[p.sku] = Number(p.stock) || 0;
      kardex.push({ fecha: Date.now(), sku: p.sku, tipo: 'Saldo inicial', entrada: stock[p.sku], salida: 0, saldo: stock[p.sku], nota: 'Carga desde catálogo' });
    });
    // Ajuste por conteo físico: el primer producto queda con 1 unidad para exigir un reabastecimiento.
    const critico = productos[0];
    if (critico && stock[critico.sku] > 1) {
      const baja = stock[critico.sku] - 1;
      stock[critico.sku] = 1;
      kardex.push({ fecha: Date.now(), sku: critico.sku, tipo: 'Ajuste', entrada: 0, salida: baja, saldo: 1, nota: 'Conteo físico: unidades averiadas por humedad' });
    }
    const personas = SC.datos.personas(rnd, 6);
    const origen = proyecto.perfil.ciudad || 'Bogotá';
    const destinos = [origen, 'Medellín', 'Pasto', 'Leticia', 'Barranquilla', 'Bucaramanga'].map((c, i) => (i > 0 && c === origen ? 'Cali' : c));
    const pedidos = personas.map((persona, i) => {
      const items = [];
      if (i === 2 && critico) items.push({ sku: critico.sku, cantidad: 3 });
      const extra = rnd.mezclar(productos).slice(0, i === 2 ? 1 : rnd.entero(1, 2));
      extra.forEach((p) => { if (!items.some((x) => x.sku === p.sku)) items.push({ sku: p.sku, cantidad: rnd.entero(1, 2) }); });
      return { id: `PED-${1040 + i}`, cliente: persona.completo, email: persona.email, ciudad: destinos[i], items, estado: 'pendiente' };
    });
    return { inicializado: true, stock, reorden: {}, kardex, pedidos };
  }

  function metricasPedido(pedido, productos) {
    let real = 0;
    let volumetrico = 0;
    let valor = 0;
    pedido.items.forEach((it) => {
      const p = productos.find((x) => x.sku === it.sku);
      if (!p) return;
      real += Number(p.peso) * it.cantidad;
      volumetrico += motores.pesoVolumetrico(p) * it.cantidad;
      valor += Number(p.precio) * it.cantidad;
    });
    return { real, volumetrico, facturable: Math.max(real, volumetrico), valor };
  }

  function Inventario({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const productos = proyecto.productos;
    const origen = proyecto.perfil.ciudad || 'Bogotá';
    const [pestana, setPestana] = React.useState('inventario');
    const [seleccion, setSeleccion] = React.useState(null);
    const [repo, setRepo] = React.useState({ sku: '', cantidad: '', proveedor: '' });
    const [mensaje, setMensaje] = React.useState(null);
    const [eleccion, setEleccion] = React.useState({ transportadora: '', justificacion: '' });

    React.useEffect(() => {
      if (!datos.inicializado && productos.length) setDatos(inicializar(proyecto));
      else if (datos.inicializado) {
        const faltantes = productos.filter((p) => !(p.sku in (datos.stock || {})));
        if (faltantes.length) {
          const stock = { ...datos.stock };
          const kardex = [...datos.kardex];
          faltantes.forEach((p) => {
            stock[p.sku] = Number(p.stock) || 0;
            kardex.push({ fecha: Date.now(), sku: p.sku, tipo: 'Saldo inicial', entrada: stock[p.sku], salida: 0, saldo: stock[p.sku], nota: 'Producto nuevo en catálogo' });
          });
          setDatos({ stock, kardex });
        }
      }
    }, [datos.inicializado, productos.length]);

    if (!datos.inicializado) {
      return html`<${Aviso} tono="alerta">${productos.length ? 'Preparando el tablero con tu catálogo...' : 'El tablero necesita productos: carga el catálogo en la actividad 03.'}<//>`;
    }

    const stock = datos.stock;
    const reorden = datos.reorden || {};
    const kardex = datos.kardex || [];
    const pedidos = datos.pedidos || [];
    const pedido = pedidos.find((p) => p.id === seleccion);

    const actualizarPedido = (id, patch) => ({ pedidos: pedidos.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

    function reabastecer() {
      const cant = parseInt(repo.cantidad, 10);
      if (!repo.sku || !(cant > 0) || !repo.proveedor.trim()) {
        setMensaje({ tono: 'error', texto: 'Selecciona el SKU, la cantidad y el proveedor.' });
        return;
      }
      const saldo = (stock[repo.sku] || 0) + cant;
      setDatos({
        stock: { ...stock, [repo.sku]: saldo },
        kardex: [...kardex, { fecha: Date.now(), sku: repo.sku, tipo: 'Entrada', entrada: cant, salida: 0, saldo, nota: `Orden de compra a ${repo.proveedor}` }],
      });
      setMensaje({ tono: 'ok', texto: `Ingresaron ${cant} unidades de ${repo.sku}. Nuevo saldo: ${saldo}.` });
      setRepo({ sku: '', cantidad: '', proveedor: '' });
    }

    function alistar(p) {
      const faltante = p.items.find((it) => (stock[it.sku] || 0) < it.cantidad);
      if (faltante) {
        setMensaje({ tono: 'error', texto: `Stock insuficiente de ${faltante.sku}: hay ${stock[faltante.sku] || 0} y el pedido pide ${faltante.cantidad}. Registra un reabastecimiento.` });
        return;
      }
      const nuevoStock = { ...stock };
      const movimientos = p.items.map((it) => {
        nuevoStock[it.sku] -= it.cantidad;
        return { fecha: Date.now(), sku: it.sku, tipo: 'Salida', entrada: 0, salida: it.cantidad, saldo: nuevoStock[it.sku], nota: `Alistamiento ${p.id}` };
      });
      setDatos({ stock: nuevoStock, kardex: [...kardex, ...movimientos], ...actualizarPedido(p.id, { estado: 'alistado' }) });
      setMensaje({ tono: 'ok', texto: `${p.id} alistado. El stock se descontó en el kardex.` });
    }

    function despachar(p, cotizaciones) {
      const elegida = cotizaciones.find((c) => c.t.id === eleccion.transportadora);
      if (!elegida) return;
      const menor = Math.min(...cotizaciones.map((c) => c.cot.total));
      const optima = elegida.cot.total === menor;
      if (!optima && !eleccion.justificacion) {
        setMensaje({ tono: 'error', texto: 'Elegiste una transportadora con mayor costo. Registra la justificación.' });
        return;
      }
      const guia = `${elegida.t.nombre.slice(0, 2).toUpperCase()}${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
      setDatos(actualizarPedido(p.id, {
        estado: 'despachado',
        despacho: { transportadora: elegida.t.nombre, guia, costo: elegida.cot.total, dias: elegida.cot.dias, optima, justificacion: optima ? '' : eleccion.justificacion, fecha: Date.now() },
      }));
      setEleccion({ transportadora: '', justificacion: '' });
      setMensaje({ tono: 'ok', texto: `Guía ${guia} generada con ${elegida.t.nombre}.` });
    }

    const bajos = productos.filter((p) => reorden[p.sku] > 0 && (stock[p.sku] || 0) <= reorden[p.sku]);
    const despachados = pedidos.filter((p) => p.estado === 'despachado' || p.estado === 'entregado');
    const entregados = pedidos.filter((p) => p.estado === 'entregado');
    const entradas = kardex.filter((k) => k.tipo === 'Entrada');
    const valorInventario = productos.reduce((s, p) => s + (stock[p.sku] || 0) * Number(p.costo), 0);

    const criterios = [
      { texto: 'Punto de reorden definido para todos los SKU', ok: productos.length > 0 && productos.every((p) => Number(reorden[p.sku]) > 0) },
      { texto: 'Uno o más reabastecimientos registrados en el kardex', ok: entradas.length >= 1 },
      { texto: `Todos los pedidos despachados (${despachados.length} de ${pedidos.length})`, ok: pedidos.length > 0 && despachados.length === pedidos.length },
      { texto: 'Cada despacho usa la tarifa más baja o registra una justificación', ok: despachados.length > 0 && despachados.every((p) => p.despacho.optima || p.despacho.justificacion) },
      { texto: `Tres o más entregas confirmadas (llevas ${entregados.length})`, ok: entregados.length >= 3 },
      { texto: 'Ningún SKU con saldo negativo', ok: Object.values(stock).every((v) => v >= 0) },
    ];

    let panelDespacho = null;
    if (pedido) {
      const m = metricasPedido(pedido, productos);
      const cotizaciones = motores.transportadoras.map((t) => ({ t, cot: motores.cotizarEnvio({ transportadora: t, origen, destino: pedido.ciudad, pesoFacturable: m.facturable, valorDeclarado: m.valor }) }));
      const menor = Math.min(...cotizaciones.map((c) => c.cot.total));
      panelDespacho = html`<${Tarjeta} titulo=${`Pedido ${pedido.id}`} subtitulo=${`${pedido.cliente} · ${origen} → ${pedido.ciudad}`} color="papel"
        acciones=${html`<${Boton} tam="sm" variante="secundario" onClick=${() => setSeleccion(null)}>Cerrar<//>`}>
        <div className="grid gap-3 sm:grid-cols-4">
          <${Metrica} etiqueta="Peso real" valor=${`${fmt.num(m.real)} kg`} />
          <${Metrica} etiqueta="Peso volumétrico" valor=${`${fmt.num(m.volumetrico)} kg`} />
          <${Metrica} etiqueta="Peso facturable" valor=${`${fmt.num(m.facturable)} kg`} color="sol" />
          <${Metrica} etiqueta="Valor declarado" valor=${fmt.cop(m.valor)} />
        </div>
        <table className="nb-table mt-4">
          <thead><tr><th>SKU</th><th>Producto</th><th>Cant.</th><th>Stock</th></tr></thead>
          <tbody>${pedido.items.map((it) => {
            const p = productos.find((x) => x.sku === it.sku);
            const falta = (stock[it.sku] || 0) < it.cantidad && pedido.estado === 'pendiente';
            return html`<tr key=${it.sku} className=${falta ? 'bg-red-100' : ''}><td className="font-mono">${it.sku}</td><td>${p ? p.nombre : 'Producto retirado'}</td><td>${it.cantidad}</td><td>${stock[it.sku] ?? 0}</td></tr>`;
          })}</tbody>
        </table>
        ${pedido.estado === 'pendiente' && html`<${Boton} className="mt-4" variante="info" onClick=${() => alistar(pedido)}>Confirmar picking y alistar<//>`}
        ${pedido.estado === 'alistado' &&
        html`<div className="mt-4">
          <p className="mb-2 font-extrabold uppercase">Cotización de transportadoras (tarifas simuladas)</p>
          <div className="overflow-x-auto"><table className="nb-table">
            <thead><tr><th></th><th>Transportadora</th><th>Zona</th><th>Flete</th><th>Seguro 1 %</th><th>Total</th><th>Días</th></tr></thead>
            <tbody>${cotizaciones.map((c) => html`<tr key=${c.t.id} className=${eleccion.transportadora === c.t.id ? 'bg-yellow-100' : ''}>
              <td><input type="radio" name="transportadora" className="h-4 w-4 accent-black" checked=${eleccion.transportadora === c.t.id} onChange=${() => setEleccion({ ...eleccion, transportadora: c.t.id })} /></td>
              <td className="font-bold">${c.t.nombre} ${c.cot.total === menor ? html`<${Insignia} color="menta">Menor costo<//>` : null}</td>
              <td>${c.cot.zona}</td><td>${fmt.cop(c.cot.flete)}</td><td>${fmt.cop(c.cot.seguro)}</td><td className="font-black">${fmt.cop(c.cot.total)}</td><td>${c.cot.dias}</td>
            </tr>`)}</tbody>
          </table></div>
          ${eleccion.transportadora && cotizaciones.find((c) => c.t.id === eleccion.transportadora).cot.total !== menor &&
          html`<${Campo} etiqueta="Justificación de la elección" className="mt-3">
            <${Seleccion} value=${eleccion.justificacion} vacio="Selecciona" opciones=${justificaciones} onChange=${(e) => setEleccion({ ...eleccion, justificacion: e.target.value })} />
          <//>`}
          <${Boton} className="mt-3" variante="oscuro" disabled=${!eleccion.transportadora} onClick=${() => despachar(pedido, cotizaciones)}>Generar guía y despachar<//>
        </div>`}
        ${pedido.despacho &&
        html`<${Aviso} tono="info" className="mt-4" titulo=${`Guía ${pedido.despacho.guia}`}>
          ${pedido.despacho.transportadora} · ${fmt.cop(pedido.despacho.costo)} · entrega estimada en ${pedido.despacho.dias} días hábiles
          ${pedido.despacho.justificacion ? ` · Justificación: ${pedido.despacho.justificacion}` : ''}
        <//>`}
        ${pedido.estado === 'despachado' && html`<${Boton} className="mt-3" variante="exito" onClick=${() => setDatos(actualizarPedido(pedido.id, { estado: 'entregado', entregado: Date.now() }))}>Registrar entrega confirmada<//>`}
      <//>`;
    }

    return html`
      <${Contexto} actividad=${actividad}>
        <p>Llegaron los primeros pedidos de ${proyecto.marca.nombre}. Controla el inventario con un kardex, define puntos de reorden y gestiona cada despacho desde ${origen}: picking, cotización con transportadoras, guía y confirmación de entrega.</p>
        <p>Atención: el conteo físico detectó unidades averiadas. Revisa el kardex antes de alistar.</p>
      <//>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <${Metrica} etiqueta="Valor del inventario (costo)" valor=${fmt.cop(valorInventario)} color="sol" />
        <${Metrica} etiqueta="SKU en alerta de reorden" valor=${bajos.length} color=${bajos.length ? 'coral' : 'menta'} />
        <${Metrica} etiqueta="Pedidos despachados" valor=${`${despachados.length}/${pedidos.length}`} color="cielo" />
        <${Metrica} etiqueta="Entregas confirmadas" valor=${entregados.length} color="menta" />
      </div>

      ${mensaje && html`<${Aviso} tono=${mensaje.tono} className="mb-4">${mensaje.texto}<//>`}

      <${Pestanas} activa=${pestana} onCambio=${setPestana} pestanas=${[
        { id: 'inventario', etiqueta: 'Inventario' },
        { id: 'pedidos', etiqueta: 'Pedidos y despachos', contador: pedidos.length - despachados.length },
        { id: 'kardex', etiqueta: 'Kardex', contador: kardex.length },
      ]} />

      ${pestana === 'inventario' &&
      html`<div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <${Tarjeta} titulo="Existencias por SKU">
          <div className="overflow-x-auto"><table className="nb-table">
            <thead><tr><th>SKU</th><th>Producto</th><th>Saldo</th><th>Punto de reorden</th><th>Estado</th></tr></thead>
            <tbody>${productos.map((p) => {
              const saldo = stock[p.sku] || 0;
              const alerta = reorden[p.sku] > 0 && saldo <= reorden[p.sku];
              return html`<tr key=${p.sku} className=${alerta ? 'bg-red-100' : ''}>
                <td className="font-mono font-bold">${p.sku}</td><td>${p.nombre}</td><td className="text-lg font-black">${saldo}</td>
                <td><input type="number" min="0" aria-label=${`Punto de reorden de ${p.sku}`} className="nb-input w-24 py-1" value=${reorden[p.sku] ?? ''} onChange=${(e) => setDatos({ reorden: { ...reorden, [p.sku]: Number(e.target.value) } })} /></td>
                <td><${Insignia} color=${alerta ? 'coral' : reorden[p.sku] > 0 ? 'menta' : 'blanco'}>${alerta ? 'Reordenar' : reorden[p.sku] > 0 ? 'OK' : 'Sin definir'}<//></td>
              </tr>`;
            })}</tbody>
          </table></div>
          <p className="mt-3 text-sm font-medium">Punto de reorden = demanda diaria × días de reposición del proveedor + stock de seguridad.</p>
        <//>
        <${Tarjeta} titulo="Orden de reabastecimiento" color="sol">
          <div className="space-y-3">
            <${Campo} etiqueta="SKU"><${Seleccion} value=${repo.sku} vacio="Selecciona" opciones=${productos.map((p) => ({ valor: p.sku, etiqueta: `${p.sku} · ${p.nombre}` }))} onChange=${(e) => setRepo({ ...repo, sku: e.target.value })} /><//>
            <${Campo} etiqueta="Cantidad a ingresar"><${Entrada} type="number" min="1" value=${repo.cantidad} onChange=${(e) => setRepo({ ...repo, cantidad: e.target.value })} /><//>
            <${Campo} etiqueta="Proveedor"><${Entrada} value=${repo.proveedor} onChange=${(e) => setRepo({ ...repo, proveedor: e.target.value })} placeholder="Nombre del proveedor" /><//>
            <${Boton} variante="oscuro" onClick=${reabastecer}>Registrar entrada<//>
          </div>
        <//>
      </div>`}

      ${pestana === 'pedidos' &&
      html`<div className="space-y-6">
        ${panelDespacho}
        <${Tarjeta} titulo="Cola de pedidos">
          <div className="overflow-x-auto"><table className="nb-table">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Destino</th><th>Ítems</th><th>Estado</th><th>Guía</th><th></th></tr></thead>
            <tbody>${pedidos.map((p) => html`<tr key=${p.id} className=${seleccion === p.id ? 'bg-yellow-100' : ''}>
              <td className="font-mono font-bold">${p.id}</td><td>${p.cliente}</td><td>${p.ciudad}</td>
              <td>${p.items.map((i) => `${i.sku} ×${i.cantidad}`).join(', ')}</td>
              <td><${Insignia} color=${estados[p.estado].color}>${estados[p.estado].texto}<//></td>
              <td className="font-mono text-xs">${p.despacho ? p.despacho.guia : '·'}</td>
              <td><${Boton} tam="sm" variante="secundario" onClick=${() => { setSeleccion(p.id); setMensaje(null); setEleccion({ transportadora: '', justificacion: '' }); }}>Gestionar<//></td>
            </tr>`)}</tbody>
          </table></div>
        <//>
      </div>`}

      ${pestana === 'kardex' &&
      html`<${Tarjeta} titulo="Kardex de movimientos">
        <div className="max-h-[28rem] overflow-auto"><table className="nb-table">
          <thead><tr><th>Fecha</th><th>SKU</th><th>Tipo</th><th>Entrada</th><th>Salida</th><th>Saldo</th><th>Detalle</th></tr></thead>
          <tbody>${kardex.slice().reverse().map((k, i) => html`<tr key=${i}>
            <td className="whitespace-nowrap text-xs">${fmt.fecha(k.fecha)}</td><td className="font-mono">${k.sku}</td>
            <td><${Insignia} color=${k.tipo === 'Entrada' ? 'menta' : k.tipo === 'Salida' ? 'cielo' : k.tipo === 'Ajuste' ? 'coral' : 'blanco'}>${k.tipo}<//></td>
            <td>${k.entrada || ''}</td><td>${k.salida || ''}</td><td className="font-black">${k.saldo}</td><td className="text-xs">${k.nota}</td>
          </tr>`)}</tbody>
        </table></div>
      <//>`}

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: 100, resumen: `${despachados.length} despachos · ${entregados.length} entregas · ${entradas.length} reabastecimientos` })} />
    `;
  }

  SC.registrar({
    id: 4,
    orden: 4,
    modulo: 'portafolio',
    titulo: 'Inventario y despachos logísticos',
    corto: 'Inventario',
    competencia: 'Administrar el inventario y los despachos de pedidos según políticas logísticas y costos de transporte.',
    evidencia: 'Kardex actualizado, puntos de reorden, guías de despacho y confirmaciones de entrega.',
    Componente: Inventario,
  });
})();
