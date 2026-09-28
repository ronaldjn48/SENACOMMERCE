/* Actividad 5. Motor de promociones y cálculo de descuentos comerciales. */
(function () {
  const { html, ui, fmt, util, motores } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, Seleccion, Casilla, Entrega, Aviso, Boton, Insignia, Metrica } = ui;

  const vacia = { nombre: '', tipo: 'porcentaje', valor: '', categoria: 'todas', sku: '', n: 3, m: 2, montoMinimo: '', codigo: '', tope: '', desde: '', hasta: '', acumulable: false, activa: true };

  function validarPromo(p, promos) {
    const e = [];
    if (String(p.nombre).trim().length < 4) e.push('Nombre de 4 caracteres o más.');
    const v = Number(p.valor);
    if (p.tipo === 'porcentaje' && !(v >= 1 && v <= 50)) e.push('El porcentaje va de 1 a 50.');
    if (p.tipo === 'valor' && !(v > 0)) e.push('Ingresa el valor del descuento.');
    if (p.tipo === 'valor' && !(Number(p.montoMinimo) > v)) e.push('El monto mínimo de compra debe superar el descuento.');
    if (p.tipo === 'nxm' && (!p.sku || !(Number(p.n) > Number(p.m) && Number(p.m) >= 1))) e.push('Elige el producto y define N mayor que M.');
    if (p.tipo === 'envio' && !(Number(p.montoMinimo) > 0)) e.push('Define el monto mínimo para envío gratis.');
    if (p.tipo === 'cupon') {
      if (!/^[A-Z0-9]{4,15}$/.test(String(p.codigo).toUpperCase())) e.push('Código de 4 a 15 letras o números.');
      if (!(v >= 1 && v <= 50)) e.push('El cupón da entre 1 % y 50 %.');
      if (promos.some((x) => x.id !== p.id && x.tipo === 'cupon' && String(x.codigo).toUpperCase() === String(p.codigo).toUpperCase())) e.push('Ese código ya existe.');
    }
    if (p.desde && p.hasta && p.hasta < p.desde) e.push('La fecha final es anterior a la inicial.');
    return e;
  }

  function describir(p) {
    switch (p.tipo) {
      case 'porcentaje': return `${p.valor} % en ${p.categoria === 'todas' ? 'toda la tienda' : p.categoria}${Number(p.montoMinimo) ? ` desde ${fmt.cop(p.montoMinimo)}` : ''}`;
      case 'valor': return `${fmt.cop(p.valor)} de descuento en compras desde ${fmt.cop(p.montoMinimo)}`;
      case 'nxm': return `Lleve ${p.n} pague ${p.m} en ${p.sku}`;
      case 'envio': return `Envío gratis desde ${fmt.cop(p.montoMinimo)}`;
      case 'cupon': return `Cupón ${String(p.codigo).toUpperCase()}: ${p.valor} %${Number(p.tope) ? ` con tope de ${fmt.cop(p.tope)}` : ''}`;
      default: return '';
    }
  }

  function Promociones({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const productos = proyecto.productos.filter((p) => p.estado !== 'borrador');
    const promos = datos.promos || [];
    const carrito = datos.carrito || [];
    const pruebas = datos.pruebas || [];
    const [borrador, setBorrador] = React.useState(vacia);
    const [errores, setErrores] = React.useState([]);
    const [agregar, setAgregar] = React.useState({ sku: '', cantidad: 1 });

    const set = (campo) => (e) => setBorrador({ ...borrador, [campo]: campo === 'codigo' ? e.target.value.toUpperCase() : e.target.value });

    function guardarPromo() {
      const e = validarPromo(borrador, promos);
      setErrores(e);
      if (e.length) return;
      const lista = borrador.id ? promos.map((p) => (p.id === borrador.id ? borrador : p)) : [...promos, { ...borrador, id: util.uid('promo') }];
      setDatos({ promos: lista });
      setBorrador(vacia);
    }

    function agregarAlCarrito() {
      const cant = parseInt(agregar.cantidad, 10);
      if (!agregar.sku || !(cant > 0)) return;
      const existe = carrito.find((c) => c.sku === agregar.sku);
      setDatos({ carrito: existe ? carrito.map((c) => (c.sku === agregar.sku ? { ...c, cantidad: c.cantidad + cant } : c)) : [...carrito, { sku: agregar.sku, cantidad: cant }] });
    }

    const r = motores.calcularCarrito({ items: carrito, productos, promos, cupon: datos.cupon });

    function registrarPrueba() {
      setDatos({
        pruebas: [{ fecha: Date.now(), subtotal: r.subtotal, descuento: r.descuento, total: r.total, margenPct: r.margenPct, aplicadas: r.aplicadas.map((a) => a.promo.nombre), cupon: r.aplicadas.some((a) => a.promo.tipo === 'cupon') }, ...pruebas].slice(0, 10),
      });
    }

    const tipos = new Set(promos.map((p) => p.tipo));
    const criterios = [
      { texto: `Tres o más promociones creadas (llevas ${promos.length})`, ok: promos.length >= 3 },
      { texto: `Tres tipos de promoción distintos (llevas ${tipos.size})`, ok: tipos.size >= 3 },
      { texto: 'Un cupón de descuento con código', ok: tipos.has('cupon') },
      { texto: 'Una promoción con vigencia definida (fecha inicial y final)', ok: promos.some((p) => p.desde && p.hasta) },
      { texto: 'Prueba registrada con promoción aplicada y margen de 10 % o más', ok: pruebas.some((p) => p.aplicadas.length > 0 && p.margenPct >= 10) },
      { texto: 'Prueba registrada con el cupón aplicado', ok: pruebas.some((p) => p.cupon) },
      { texto: 'Ninguna prueba registrada con margen negativo', ok: pruebas.length > 0 && pruebas.every((p) => p.margenPct >= 0) },
    ];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>Se acerca una fecha comercial y ${proyecto.marca.nombre} necesita promociones rentables. Configura las reglas del motor y pruébalas en un carrito real con tu catálogo.</p>
        <p>Regla del motor: las promociones acumulables se suman. Entre las no acumulables se aplica la de mayor beneficio para el cliente. El sistema alerta si el margen cae por debajo del 10 %.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-2">
        <${Tarjeta} titulo=${borrador.id ? 'Editar promoción' : 'Nueva promoción'} color="blanco">
          <div className="grid gap-3 sm:grid-cols-2">
            <${Campo} etiqueta="Nombre" className="sm:col-span-2"><${Entrada} value=${borrador.nombre} onChange=${set('nombre')} placeholder="Ej. Temporada Amor y Amistad" /><//>
            <${Campo} etiqueta="Tipo"><${Seleccion} value=${borrador.tipo} opciones=${motores.tiposPromo.map((t) => ({ valor: t.id, etiqueta: t.nombre }))} onChange=${set('tipo')} /><//>
            ${borrador.tipo === 'porcentaje' && html`
              <${Campo} etiqueta="Porcentaje"><${Entrada} type="number" value=${borrador.valor} onChange=${set('valor')} /><//>
              <${Campo} etiqueta="Aplica a"><${Seleccion} value=${borrador.categoria} opciones=${[{ valor: 'todas', etiqueta: 'Toda la tienda' }, ...proyecto.nicho.categorias]} onChange=${set('categoria')} /><//>
              <${Campo} etiqueta="Compra mínima (opcional)"><${Entrada} type="number" value=${borrador.montoMinimo} onChange=${set('montoMinimo')} /><//>`}
            ${borrador.tipo === 'valor' && html`
              <${Campo} etiqueta="Descuento (COP)"><${Entrada} type="number" value=${borrador.valor} onChange=${set('valor')} /><//>
              <${Campo} etiqueta="Compra mínima (COP)"><${Entrada} type="number" value=${borrador.montoMinimo} onChange=${set('montoMinimo')} /><//>`}
            ${borrador.tipo === 'nxm' && html`
              <${Campo} etiqueta="Producto"><${Seleccion} value=${borrador.sku} vacio="Selecciona" opciones=${productos.map((p) => ({ valor: p.sku, etiqueta: `${p.sku} · ${p.nombre}` }))} onChange=${set('sku')} /><//>
              <${Campo} etiqueta="Lleve N"><${Entrada} type="number" value=${borrador.n} onChange=${set('n')} /><//>
              <${Campo} etiqueta="Pague M"><${Entrada} type="number" value=${borrador.m} onChange=${set('m')} /><//>`}
            ${borrador.tipo === 'envio' && html`
              <${Campo} etiqueta="Compra mínima (COP)"><${Entrada} type="number" value=${borrador.montoMinimo} onChange=${set('montoMinimo')} /><//>`}
            ${borrador.tipo === 'cupon' && html`
              <${Campo} etiqueta="Código"><${Entrada} value=${borrador.codigo} onChange=${set('codigo')} placeholder="BIENVENIDA10" /><//>
              <${Campo} etiqueta="Porcentaje"><${Entrada} type="number" value=${borrador.valor} onChange=${set('valor')} /><//>
              <${Campo} etiqueta="Tope en COP (opcional)"><${Entrada} type="number" value=${borrador.tope} onChange=${set('tope')} /><//>`}
            <${Campo} etiqueta="Vigente desde"><${Entrada} type="date" value=${borrador.desde} onChange=${set('desde')} /><//>
            <${Campo} etiqueta="Vigente hasta"><${Entrada} type="date" value=${borrador.hasta} onChange=${set('hasta')} /><//>
            <${Casilla} className="sm:col-span-2" etiqueta="Acumulable con otras promociones" checked=${borrador.acumulable} onChange=${(v) => setBorrador({ ...borrador, acumulable: v })} />
          </div>
          ${errores.length > 0 && html`<${Aviso} tono="error" className="mt-3">${errores.map((e) => html`<p key=${e}>${e}</p>`)}<//>`}
          <div className="mt-4 flex gap-2">
            <${Boton} variante="exito" onClick=${guardarPromo}>${borrador.id ? 'Guardar cambios' : 'Crear promoción'}<//>
            ${borrador.id && html`<${Boton} variante="secundario" onClick=${() => setBorrador(vacia)}>Cancelar<//>`}
          </div>
        <//>

        <${Tarjeta} titulo=${`Reglas activas (${promos.length})`} color="fucsia">
          ${promos.length === 0 && html`<p className="font-bold">Crea tu primera promoción.</p>`}
          <div className="space-y-2">
            ${promos.map((p) => {
              const vigente = motores.promoVigente(p);
              return html`<div key=${p.id} className="border-3 border-tinta bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black">${p.nombre}</p>
                  <div className="flex gap-1">
                    <${Insignia} color=${vigente ? 'menta' : 'blanco'}>${vigente ? 'Vigente' : 'Fuera de vigencia'}<//>
                    ${p.acumulable && html`<${Insignia} color="cielo">Acumulable<//>`}
                  </div>
                </div>
                <p className="text-sm font-medium">${describir(p)}</p>
                ${(p.desde || p.hasta) && html`<p className="text-xs font-bold">Vigencia: ${p.desde || '...'} a ${p.hasta || '...'}</p>`}
                <div className="mt-2 flex gap-2">
                  <${Boton} tam="sm" variante="secundario" onClick=${() => { setBorrador(p); setErrores([]); }}>Editar<//>
                  <${Boton} tam="sm" variante="peligro" onClick=${() => setDatos({ promos: promos.filter((x) => x.id !== p.id) })}>Eliminar<//>
                </div>
              </div>`;
            })}
          </div>
        <//>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[3fr_2fr]">
        <${Tarjeta} titulo="Carrito de prueba" color="blanco">
          <div className="flex flex-wrap items-end gap-2">
            <${Campo} etiqueta="Producto" className="min-w-[14rem] flex-1">
              <${Seleccion} value=${agregar.sku} vacio="Selecciona" opciones=${productos.map((p) => ({ valor: p.sku, etiqueta: `${p.nombre} · ${fmt.cop(p.precio)}` }))} onChange=${(e) => setAgregar({ ...agregar, sku: e.target.value })} />
            <//>
            <${Campo} etiqueta="Cant." className="w-24"><${Entrada} type="number" min="1" value=${agregar.cantidad} onChange=${(e) => setAgregar({ ...agregar, cantidad: e.target.value })} /><//>
            <${Boton} variante="oscuro" onClick=${agregarAlCarrito}>Agregar<//>
            <${Boton} variante="secundario" onClick=${() => setDatos({ carrito: [] })}>Vaciar<//>
          </div>
          <table className="nb-table mt-4">
            <thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${r.lineas.length === 0 && html`<tr><td colSpan="4">Carrito vacío.</td></tr>`}
              ${r.lineas.map((l) => html`<tr key=${l.sku}><td className="font-bold">${l.nombre}</td><td>${fmt.cop(l.precio)}</td><td>${l.cantidad}</td><td>${fmt.cop(l.subtotal)}</td></tr>`)}
            </tbody>
          </table>
          <${Campo} etiqueta="Código de cupón" className="mt-4 max-w-xs"><${Entrada} value=${datos.cupon || ''} onChange=${(e) => setDatos({ cupon: e.target.value.toUpperCase() })} /><//>
          <p className="mt-4 mb-2 text-sm font-extrabold uppercase">Evaluación del motor</p>
          <div className="space-y-1">
            ${r.evaluadas.map((e) => {
              const aplicada = r.aplicadas.includes(e);
              return html`<div key=${e.promo.id} className=${`flex flex-wrap justify-between gap-2 border-2 border-tinta px-2 py-1 text-sm ${aplicada ? 'bg-menta' : e.aplica ? 'bg-sol' : 'bg-white'}`}>
                <span className="font-bold">${e.promo.nombre}</span>
                <span>${aplicada ? `Aplicada: -${fmt.cop(e.descuento)}${e.envioGratis ? ' + envío gratis' : ''}` : e.aplica ? 'Descartada: otra promoción exclusiva da mayor beneficio' : e.motivo}</span>
              </div>`;
            })}
          </div>
        <//>

        <${Tarjeta} titulo="Liquidación" color=${r.margenPct < 10 && r.lineas.length ? 'coral' : 'sol'}>
          <div className="space-y-1 text-sm font-bold">
            <p className="flex justify-between"><span>Subtotal</span><span>${fmt.cop(r.subtotal)}</span></p>
            <p className="flex justify-between"><span>Descuentos</span><span>-${fmt.cop(r.descuento)}</span></p>
            <p className="flex justify-between"><span>Envío</span><span>${r.envioGratis ? 'Gratis' : fmt.cop(r.envio)}</span></p>
            <p className="flex justify-between border-t-3 border-tinta pt-1 text-xl font-black"><span>Total</span><span>${fmt.cop(r.total)}</span></p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <${Metrica} etiqueta="Costo mercancía" valor=${fmt.cop(r.costo)} />
            <${Metrica} etiqueta="Margen" valor=${fmt.pct(r.margenPct)} color=${r.margenPct >= 10 ? 'menta' : 'coral'} detalle=${fmt.cop(r.margen)} />
          </div>
          ${r.lineas.length > 0 && r.margenPct < 10 && html`<${Aviso} tono="error" className="mt-3">Margen inferior al 10 %. Ajusta los porcentajes, topes o la regla de acumulación.<//>`}
          <${Boton} className="mt-4 w-full" variante="oscuro" disabled=${!r.lineas.length} onClick=${registrarPrueba}>Registrar prueba<//>
          ${pruebas.length > 0 &&
          html`<div className="mt-3 space-y-1 text-xs font-medium">
            ${pruebas.map((p, i) => html`<p key=${i} className="border-2 border-tinta bg-white px-2 py-1">${fmt.cop(p.total)} · margen ${fmt.pct(p.margenPct)} · ${p.aplicadas.join(', ') || 'sin promociones'}</p>`)}
          </div>`}
        <//>
      </div>

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: 100, resumen: `${promos.length} promociones · ${[...tipos].join(', ')}` })} />
    `;
  }

  SC.motores.describirPromo = describir;

  SC.registrar({
    id: 5,
    orden: 5,
    modulo: 'ventas',
    titulo: 'Motor de promociones',
    corto: 'Promociones',
    competencia: 'Calcular descuentos comerciales y promociones que protejan el margen del negocio.',
    evidencia: 'Reglas promocionales configuradas y pruebas de carrito con liquidación y margen.',
    Componente: Promociones,
  });
})();
