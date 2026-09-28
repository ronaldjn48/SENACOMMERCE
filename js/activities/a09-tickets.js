/* Actividad 9. Sistema de tickets para clasificar requerimientos de clientes (PQRS). */
(function () {
  const { html, ui, fmt, util } = SC;
  const { Contexto, Tarjeta, Seleccion, Entrega, Aviso, Boton, Insignia, Metrica } = ui;

  const tipos = ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación'];
  const prioridades = ['Alta', 'Media', 'Baja'];
  const areas = ['Logística', 'Pagos', 'Producto', 'Servicio al cliente'];
  const sla = { Alta: '24 horas', Media: '48 horas', Baja: '72 horas' };
  const MINIMO = 80;

  const plantillas = [
    { asunto: 'Mi pedido no llega', texto: 'Compré hace 8 días el pedido {pedido} y todavía no llega. La guía {guia} no muestra movimiento. Necesito una solución ya.', tipo: 'Reclamo', prioridad: 'Alta', area: 'Logística' },
    { asunto: 'Cobro doble', texto: 'Revisé mi extracto y me cobraron dos veces la misma compra. Solicito la devolución del cobro repetido.', tipo: 'Reclamo', prioridad: 'Alta', area: 'Pagos' },
    { asunto: 'Consulta de disponibilidad', texto: '¿Tienen disponible {producto} en otra presentación o variante? Quiero comprarlo la próxima semana.', tipo: 'Petición', prioridad: 'Baja', area: 'Producto' },
    { asunto: 'Mala atención en el chat', texto: 'La persona que me atendió por el chat tardó dos días en contestar y fue descortés conmigo.', tipo: 'Queja', prioridad: 'Media', area: 'Servicio al cliente' },
    { asunto: 'Producto defectuoso', texto: 'El producto {producto} llegó con un defecto de fábrica. Quiero hacer efectiva la garantía.', tipo: 'Reclamo', prioridad: 'Alta', area: 'Producto' },
    { asunto: 'Nuevo medio de pago', texto: 'Sería bueno que agregaran más opciones de pago, por ejemplo pagos en cuotas sin tarjeta.', tipo: 'Sugerencia', prioridad: 'Baja', area: 'Pagos' },
    { asunto: 'Excelente servicio', texto: 'Quiero felicitarlos. El pedido {pedido} llegó antes de lo prometido y muy bien empacado.', tipo: 'Felicitación', prioridad: 'Baja', area: 'Servicio al cliente' },
    { asunto: 'Derecho de retracto', texto: 'Compré hace 3 días por la página y quiero ejercer el derecho de retracto. ¿Qué trámite debo seguir?', tipo: 'Petición', prioridad: 'Alta', area: 'Servicio al cliente' },
    { asunto: 'Horario de atención', texto: '¿Cuál es el horario de atención de la línea de WhatsApp los fines de semana?', tipo: 'Petición', prioridad: 'Baja', area: 'Servicio al cliente' },
    { asunto: 'Pago PSE sin confirmar', texto: 'Pagué por PSE, el banco debitó el dinero y el pedido sigue como pendiente de pago.', tipo: 'Reclamo', prioridad: 'Alta', area: 'Pagos' },
    { asunto: 'Cambio de dirección', texto: 'Necesito cambiar la dirección de entrega del pedido {pedido}. Todavía no ha salido de bodega.', tipo: 'Petición', prioridad: 'Media', area: 'Logística' },
    { asunto: 'Empaques reciclables', texto: 'Me gustaría que los empaques de {producto} fueran de material reciclable.', tipo: 'Sugerencia', prioridad: 'Baja', area: 'Producto' },
  ];

  const reglas = [
    ['Petición', 'Solicitud de información, de un trámite o de un derecho (por ejemplo, retracto).'],
    ['Queja', 'Inconformidad con la conducta o la atención de una persona.'],
    ['Reclamo', 'Inconformidad con un producto o servicio incumplido que exige una solución.'],
    ['Sugerencia', 'Propuesta para mejorar el servicio.'],
    ['Felicitación', 'Reconocimiento positivo del servicio.'],
    ['Prioridad alta', 'Hay dinero comprometido, una entrega vencida o un plazo legal corriendo.'],
    ['Prioridad media', 'Afecta la experiencia o una gestión en curso sin pérdida económica.'],
    ['Prioridad baja', 'Consultas informativas, sugerencias y felicitaciones.'],
    ['Áreas', 'Logística: entregas y guías. Pagos: cobros, medios y reembolsos. Producto: calidad, garantía y disponibilidad. Servicio al cliente: trato, horarios y trámites generales.'],
  ];

  function generar(proyecto) {
    const rnd = util.crearAleatorio(`${proyecto.semilla}-tickets`);
    const pedidos = (proyecto.inventario.pedidos || []).filter((p) => p.despacho);
    const productos = proyecto.productos;
    const personas = SC.datos.personas(rnd, 10);
    return rnd.mezclar(plantillas).slice(0, 10).map((t, i) => {
      const pedido = pedidos.length ? rnd.elegir(pedidos) : { id: `PED-10${40 + i}`, despacho: { guia: 'SE000000000' } };
      const producto = productos.length ? rnd.elegir(productos).nombre : proyecto.nicho.productoChat;
      const rellenar = (s) => s.replace('{pedido}', pedido.id).replace('{guia}', pedido.despacho.guia).replace('{producto}', producto);
      return {
        id: `TK-${2300 + i}`,
        cliente: personas[i].completo,
        email: personas[i].email,
        canal: rnd.elegir(['Correo', 'WhatsApp', 'Formulario web', 'Instagram']),
        asunto: t.asunto,
        texto: rellenar(t.texto),
        pedido: pedido.id,
        clave: { tipo: t.tipo, prioridad: t.prioridad, area: t.area },
      };
    });
  }

  function Tickets({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    React.useEffect(() => {
      if (!datos.tickets) setDatos({ tickets: generar(proyecto), clasificacion: {} });
    }, [datos.tickets]);

    const [abierto, setAbierto] = React.useState(null);
    if (!datos.tickets) return html`<${Aviso}>Cargando bandeja de tickets...<//>`;

    const tickets = datos.tickets;
    const clasif = datos.clasificacion || {};
    const validaciones = datos.validaciones || [];
    const set = (id, campo, valor) => setDatos({ clasificacion: { ...clasif, [id]: { ...(clasif[id] || {}), [campo]: valor } } });
    const completos = tickets.filter((t) => clasif[t.id] && clasif[t.id].tipo && clasif[t.id].prioridad && clasif[t.id].area).length;
    const ultima = validaciones[validaciones.length - 1];

    function validar() {
      let aciertos = 0;
      const porTicket = {};
      tickets.forEach((t) => {
        const c = clasif[t.id] || {};
        const ok = ['tipo', 'prioridad', 'area'].filter((k) => c[k] === t.clave[k]).length;
        aciertos += ok;
        porTicket[t.id] = ok;
      });
      const total = tickets.length * 3;
      setDatos({ validaciones: [...validaciones, { fecha: Date.now(), aciertos, total, porcentaje: Math.round((aciertos / total) * 100), porTicket }] });
    }

    const conteo = tipos.map((t) => ({ etiqueta: t, valor: tickets.filter((x) => (clasif[x.id] || {}).tipo === t).length }));
    const mejor = validaciones.reduce((m, v) => Math.max(m, v.porcentaje), 0);

    const criterios = [
      { texto: `Todos los tickets clasificados (${completos} de ${tickets.length})`, ok: completos === tickets.length },
      { texto: 'Clasificación validada con el sistema', ok: validaciones.length > 0 },
      { texto: `Precisión de ${MINIMO} % o más (mejor: ${mejor} %)`, ok: mejor >= MINIMO },
    ];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>La bandeja de servicio de ${proyecto.marca.nombre} recibió ${tickets.length} requerimientos por distintos canales. Algunos mencionan los pedidos que despachaste. Clasifica cada ticket por tipo de PQRS, prioridad y área responsable para asignar el tiempo de respuesta (SLA).</p>
        <p>El Estatuto del Consumidor (Ley 1480 de 2011) protege al comprador en línea: derecho de retracto, garantía y reversión del pago.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-[3fr_1fr]">
        <${Tarjeta} titulo="Bandeja de entrada" subtitulo="Abre cada ticket para leer el mensaje completo."
          acciones=${html`<${Boton} variante="oscuro" onClick=${validar} disabled=${completos < tickets.length}>Validar clasificación<//>`}>
          <div className="space-y-3">
            ${tickets.map((t) => {
              const c = clasif[t.id] || {};
              const res = ultima && ultima.porTicket[t.id];
              return html`<div key=${t.id} className=${`border-3 border-tinta ${c.tipo && c.prioridad && c.area ? 'bg-white' : 'bg-yellow-50'}`}>
                <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left" onClick=${() => setAbierto(abierto === t.id ? null : t.id)}>
                  <span className="font-black">${t.id} · ${t.asunto}</span>
                  <span className="flex flex-wrap gap-1">
                    <${Insignia} color="blanco">${t.canal}<//>
                    ${c.prioridad && html`<${Insignia} color=${c.prioridad === 'Alta' ? 'coral' : c.prioridad === 'Media' ? 'sol' : 'menta'}>SLA ${sla[c.prioridad]}<//>`}
                    ${res !== undefined && html`<${Insignia} color=${res === 3 ? 'menta' : 'coral'}>${res}/3<//>`}
                  </span>
                </button>
                ${abierto === t.id && html`<div className="border-t-2 border-tinta bg-papel p-3 text-sm">
                  <p className="font-bold">${t.cliente} · ${t.email}</p>
                  <p className="mt-1 font-medium">“${t.texto}”</p>
                </div>`}
                <div className="grid gap-2 border-t-2 border-tinta p-3 sm:grid-cols-3">
                  <${Seleccion} aria-label="Tipo" value=${c.tipo || ''} vacio="Tipo de PQRS" opciones=${tipos} onChange=${(e) => set(t.id, 'tipo', e.target.value)} />
                  <${Seleccion} aria-label="Prioridad" value=${c.prioridad || ''} vacio="Prioridad" opciones=${prioridades} onChange=${(e) => set(t.id, 'prioridad', e.target.value)} />
                  <${Seleccion} aria-label="Área" value=${c.area || ''} vacio="Área responsable" opciones=${areas} onChange=${(e) => set(t.id, 'area', e.target.value)} />
                </div>
              </div>`;
            })}
          </div>
        <//>

        <div className="space-y-6">
          <${Tarjeta} titulo="Reglas de clasificación" color="cielo">
            <dl className="space-y-2 text-sm">
              ${reglas.map(([k, v]) => html`<div key=${k}><dt className="font-black">${k}</dt><dd className="font-medium">${v}</dd></div>`)}
            </dl>
          <//>
          <${Tarjeta} titulo="Resumen" color="sol">
            <${ui.GraficoBarras} datos=${conteo} />
            ${ultima && html`<div className="mt-4"><${Metrica} etiqueta="Última validación" valor=${`${ultima.porcentaje} %`} detalle=${`${ultima.aciertos} de ${ultima.total} campos correctos`} color=${ultima.porcentaje >= MINIMO ? 'menta' : 'coral'} /></div>`}
            ${ultima && ultima.porcentaje < MINIMO && html`<${Aviso} tono="error" className="mt-3">Revisa los tickets con menos de 3/3 y consulta las reglas.<//>`}
          <//>
        </div>
      </div>

      <${Entrega} criterios=${criterios} hecho=${hecho} puntaje=${mejor}
        onEntregar=${() => completar({ puntaje: mejor, resumen: `Precisión ${mejor} % en ${validaciones.length} validaciones` })} />
    `;
  }

  SC.registrar({
    id: 9,
    orden: 9,
    modulo: 'posventa',
    titulo: 'Sistema de tickets PQRS',
    corto: 'Tickets PQRS',
    competencia: 'Clasificar requerimientos de clientes según tipo, prioridad y área, conforme al Estatuto del Consumidor.',
    evidencia: 'Bandeja de tickets clasificada con SLA y precisión validada.',
    Componente: Tickets,
  });
})();
