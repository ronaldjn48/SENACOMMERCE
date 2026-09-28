/* Actividad 8. Chat interactivo para simular ventas conversacionales. */
(function () {
  const { html, ui, fmt, util, motores } = SC;
  const { Contexto, Tarjeta, AreaTexto, Entrega, Aviso, Boton, Insignia, Barra } = ui;

  const MINIMO = 80;

  function construirGuion(proyecto) {
    const rnd = util.crearAleatorio(`${proyecto.semilla}-chat`);
    const productos = proyecto.productos.filter((p) => p.estado !== 'borrador');
    const prod = productos[0] || { nombre: proyecto.nicho.productoChat, precio: 90000, variantes: '', descripcion: '' };
    const cliente = SC.datos.personas(rnd, 1)[0];
    const asesor = proyecto.perfil.nombre ? proyecto.perfil.nombre.split(' ')[0] : 'tu asesor';
    const marca = proyecto.marca.nombre;
    const cupon = proyecto.promos.find((p) => p.tipo === 'cupon');
    let ofertaBuena;
    if (cupon) {
      let desc = (prod.precio * Number(cupon.valor)) / 100;
      if (Number(cupon.tope) > 0) desc = Math.min(desc, Number(cupon.tope));
      ofertaBuena = `Te entiendo. Hoy puedes usar el cupón ${String(cupon.codigo).toUpperCase()} y el producto te queda en ${fmt.cop(prod.precio - desc)}. Además te acompañamos por WhatsApp hasta que lo recibas.`;
    } else {
      ofertaBuena = `Te entiendo. Es un producto con garantía y despacho a toda Colombia. Si agregas otro artículo, revisamos la promoción vigente para que ahorres.`;
    }
    const metodo = rnd.elegir(motores.metodosPago);
    const activo = proyecto.metodosActivos.some((m) => m.id === metodo.id);
    const otros = proyecto.metodosActivos.map((m) => m.nombre).join(', ') || 'los medios disponibles';
    const beneficio = String(prod.descripcion || '').split('.')[0];

    return {
      cliente,
      etapas: [
        {
          nombre: 'Saludo y apertura',
          cliente: `Hola 👋 vi su publicación en Instagram. ¿Tienen ${prod.nombre}?`,
          opciones: [
            { texto: `¡Hola, ${cliente.nombre}! Te saluda ${asesor} de ${marca}. Sí, lo tenemos disponible. ¿Para quién es o en qué lo vas a usar?`, puntos: 10, retro: 'Saludo personalizado, presentación y pregunta abierta para indagar.' },
            { texto: 'Sí hay.', puntos: 5, retro: 'Responde, pero no saluda, no se presenta ni abre la conversación.' },
            { texto: 'Mira el catálogo en la página, ahí está todo.', puntos: 0, retro: 'Envía al cliente a buscar solo. Pierdes la oportunidad de venta.' },
          ],
        },
        {
          nombre: 'Indagación de necesidades',
          cliente: 'Es para un regalo, pero no sé cuál elegir 🤔',
          opciones: [
            { texto: '¡Qué buen detalle! Para recomendarte bien: ¿qué presupuesto tienes y qué le gusta a esa persona?', puntos: 10, retro: 'Indaga presupuesto y preferencias antes de recomendar.' },
            { texto: 'Todos son buenos, lleva el más caro.', puntos: 5, retro: 'Recomienda sin conocer la necesidad del cliente.' },
            { texto: 'Eso depende de ti.', puntos: 0, retro: 'Deja al cliente sin orientación.' },
          ],
        },
        {
          nombre: 'Presentación del producto',
          cliente: `Tengo más o menos ${fmt.cop(Math.round((prod.precio * 1.1) / 1000) * 1000)}. ¿Cuánto cuesta ${prod.nombre}?`,
          opciones: [
            { texto: `Cuesta ${fmt.cop(prod.precio)}. ${beneficio}.${prod.variantes ? ` Lo tienes en ${prod.variantes}.` : ''}`, puntos: 10, retro: 'Precio exacto del catálogo, beneficio y variantes.' },
            { texto: `Cuesta ${fmt.cop(Math.round(prod.precio * 1.15))}, es de muy buena calidad.`, puntos: 0, retro: 'El precio no coincide con el catálogo. Verifica siempre la información antes de responder.' },
            { texto: 'Está en promoción, cómpralo ya antes de que se acabe.', puntos: 5, retro: 'Presiona al cliente sin darle el precio ni los beneficios.' },
          ],
        },
        {
          nombre: 'Manejo de objeciones',
          cliente: 'Uy, está un poco caro 😕',
          opciones: [
            { texto: ofertaBuena, puntos: 10, retro: 'Valida la objeción y ofrece una alternativa concreta con la promoción vigente.' },
            { texto: 'Es que la calidad se paga.', puntos: 5, retro: 'Defiende el precio sin empatía ni alternativa.' },
            { texto: 'Es lo que hay. Si no te alcanza, mira otra tienda.', puntos: 0, retro: 'Respuesta descortés que rompe la relación con el cliente.' },
          ],
        },
        {
          nombre: 'Medios de pago',
          cliente: `¿Puedo pagar con ${metodo.nombre}?`,
          opciones: [
            activo
              ? { texto: `Sí, recibimos ${metodo.nombre}. Te envío el enlace de pago seguro.`, puntos: 10, retro: 'Responde con base en la configuración de medios de pago de la tienda.' }
              : { texto: `Por ahora no recibimos ${metodo.nombre}. Puedes pagar con ${otros}.`, puntos: 10, retro: 'Informa con honestidad y ofrece alternativas configuradas en la tienda.' },
            activo
              ? { texto: `No, ese medio no lo manejamos.`, puntos: 0, retro: `Error: ${metodo.nombre} está activo en tu configuración de pagos.` }
              : { texto: `Sí, claro, te envío el enlace de ${metodo.nombre}.`, puntos: 0, retro: `Error: ${metodo.nombre} no está activo en tu configuración de pagos.` },
            { texto: 'Creo que sí, déjame preguntar y te aviso.', puntos: 5, retro: 'El asesor necesita conocer los medios de pago de su tienda.' },
          ],
        },
        {
          nombre: 'Cierre de la venta',
          cliente: '¡Listo, lo quiero! ¿Qué necesitas para el envío?',
          libre: true,
          evaluar: (t) => {
            const n = util.normalizar(t);
            const items = [
              { texto: 'Solicita datos de envío (dirección, ciudad o teléfono)', ok: /(direccion|ciudad|barrio|telefono|datos)/.test(n) },
              { texto: 'Indica el medio o enlace de pago', ok: /(enlace|link|pago|pagar|nequi|daviplata|pse|tarjeta)/.test(n) },
              { texto: 'Informa el tiempo de entrega', ok: /(dias|entrega|llega|despach|guia)/.test(n) },
              { texto: 'Agradece la compra', ok: /(gracias|agradec)/.test(n) },
            ];
            return { items, puntos: items.filter((i) => i.ok).length * 2.5 };
          },
        },
      ],
    };
  }

  function Chat({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const guion = React.useMemo(() => construirGuion(proyecto), [proyecto.semilla, proyecto.productos.length, proyecto.promos.length, proyecto.metodosActivos.length]);
    const intentos = datos.intentos || [];
    const [mensajes, setMensajes] = React.useState([]);
    const [etapa, setEtapa] = React.useState(-1);
    const [escribiendo, setEscribiendo] = React.useState(false);
    const [respuestas, setRespuestas] = React.useState([]);
    const [libre, setLibre] = React.useState('');
    const [orden, setOrden] = React.useState([]);
    const fin = React.useRef(null);

    React.useEffect(() => { if (fin.current) fin.current.scrollTop = fin.current.scrollHeight; }, [mensajes, escribiendo]);

    function mostrarCliente(i) {
      setEscribiendo(true);
      setTimeout(() => {
        setEscribiendo(false);
        setMensajes((m) => [...m, { de: 'cliente', texto: guion.etapas[i].cliente }]);
        setEtapa(i);
        setOrden(util.crearAleatorio(`${Date.now()}`).mezclar([0, 1, 2]));
      }, 700);
    }

    function iniciar() {
      setMensajes([]);
      setRespuestas([]);
      setLibre('');
      mostrarCliente(0);
    }

    function responder(opcion) {
      const e = guion.etapas[etapa];
      const nueva = [...respuestas, { etapa: e.nombre, puntos: opcion.puntos, max: 10, retro: opcion.retro }];
      setRespuestas(nueva);
      setMensajes((m) => [...m, { de: 'asesor', texto: opcion.texto }]);
      avanzar(nueva);
    }

    function responderLibre() {
      const e = guion.etapas[etapa];
      const r = e.evaluar(libre);
      const nueva = [...respuestas, { etapa: e.nombre, puntos: r.puntos, max: 10, retro: r.items.map((i) => `${i.ok ? '✓' : '✗'} ${i.texto}`).join(' · ') }];
      setRespuestas(nueva);
      setMensajes((m) => [...m, { de: 'asesor', texto: libre }]);
      setLibre('');
      avanzar(nueva);
    }

    function avanzar(nueva) {
      if (etapa + 1 < guion.etapas.length) mostrarCliente(etapa + 1);
      else {
        setEtapa(guion.etapas.length);
        const total = nueva.reduce((s, r) => s + r.puntos, 0);
        const max = nueva.reduce((s, r) => s + r.max, 0);
        const puntaje = Math.round((total / max) * 100);
        setTimeout(() => setMensajes((m) => [...m, { de: 'cliente', texto: puntaje >= MINIMO ? '¡Perfecto, muchas gracias! Quedo atenta al enlace 🙌' : 'Mmm... lo voy a pensar mejor. Gracias.' }]), 500);
        setDatos({ intentos: [...intentos, { fecha: Date.now(), puntaje, detalle: nueva }] });
      }
    }

    const mejor = intentos.reduce((m, i) => Math.max(m, i.puntaje), 0);
    const actual = guion.etapas[etapa];
    const terminado = etapa >= guion.etapas.length;
    const ultimo = intentos[intentos.length - 1];

    const criterios = [
      { texto: 'Conversación completa hasta el cierre', ok: intentos.length > 0 },
      { texto: `Puntaje de ${MINIMO} % o más en una conversación (mejor: ${mejor} %)`, ok: mejor >= MINIMO },
      { texto: 'Respuesta correcta sobre medios de pago en la conversación aprobada', ok: intentos.some((i) => i.puntaje >= MINIMO && i.detalle.find((d) => d.etapa === 'Medios de pago').puntos === 10) },
    ];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>Un cliente escribe al WhatsApp de ${proyecto.marca.nombre} después de ver la campaña. Atiende la conversación con la técnica de venta consultiva: saludo, indagación, presentación, manejo de objeciones y cierre.</p>
        <p>Usa la información real de tu tienda: precios del catálogo, cupones del motor de promociones y medios de pago configurados.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="nb-card flex h-[36rem] flex-col bg-white">
          <div className="flex items-center gap-3 border-b-3 border-tinta bg-menta p-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-tinta bg-white text-lg font-black">${guion.cliente.nombre.charAt(0)}</div>
            <div><p className="font-black">${guion.cliente.completo}</p><p className="text-xs font-bold">${escribiendo ? 'escribiendo...' : 'en línea'}</p></div>
          </div>
          <div ref=${fin} className="flex-1 space-y-2 overflow-y-auto bg-papel p-3">
            ${etapa === -1 && html`<div className="flex h-full items-center justify-center"><${Boton} variante="exito" tam="lg" onClick=${iniciar}>Iniciar conversación<//></div>`}
            ${mensajes.map((m, i) => html`<div key=${i} className=${`flex ${m.de === 'asesor' ? 'justify-end' : 'justify-start'}`}>
              <p className=${`max-w-[80%] border-2 border-tinta px-3 py-2 text-sm font-medium shadow-brutal-sm ${m.de === 'asesor' ? 'bg-sol' : 'bg-white'}`}>${m.texto}</p>
            </div>`)}
            ${escribiendo && html`<p className="w-16 border-2 border-tinta bg-white px-3 py-2 text-sm font-black">···</p>`}
          </div>
          <div className="border-t-3 border-tinta p-3">
            ${actual && !escribiendo && !actual.libre && html`<div className="space-y-2">
              <p className="text-xs font-extrabold uppercase">Elige tu respuesta · ${actual.nombre}</p>
              ${orden.map((i) => html`<button key=${i} type="button" onClick=${() => responder(actual.opciones[i])} className="block w-full border-2 border-tinta bg-white p-2 text-left text-sm font-medium hover:bg-yellow-100">${actual.opciones[i].texto}</button>`)}
            </div>`}
            ${actual && !escribiendo && actual.libre && html`<div className="space-y-2">
              <p className="text-xs font-extrabold uppercase">Redacta tu mensaje de cierre</p>
              <${AreaTexto} filas=${3} value=${libre} onChange=${(e) => setLibre(e.target.value)} placeholder="Escribe como lo harías en WhatsApp" />
              <${Boton} variante="oscuro" onClick=${responderLibre} disabled=${libre.trim().length < 20}>Enviar<//>
            </div>`}
            ${terminado && html`<${Boton} variante="primario" onClick=${iniciar}>Nueva conversación<//>`}
          </div>
        </div>

        <div className="space-y-6">
          <${Tarjeta} titulo="Retroalimentación" color=${terminado && ultimo ? (ultimo.puntaje >= MINIMO ? 'menta' : 'coral') : 'sol'}>
            ${respuestas.length === 0 && html`<p className="font-medium">Cada respuesta recibe 10, 5 o 0 puntos según la técnica de venta.</p>`}
            <div className="space-y-2">
              ${respuestas.map((r, i) => html`<div key=${i} className="border-2 border-tinta bg-white p-2 text-sm">
                <div className="flex justify-between font-black"><span>${r.etapa}</span><span>${r.puntos}/10</span></div>
                <p className="font-medium">${r.retro}</p>
              </div>`)}
            </div>
            ${terminado && ultimo && html`<div className="mt-3"><${Barra} valor=${ultimo.puntaje} color=${ultimo.puntaje >= MINIMO ? 'menta' : 'coral'} etiqueta=${`${ultimo.puntaje} %`} /></div>`}
          <//>
          <${Tarjeta} titulo="Historial de intentos">
            ${intentos.length === 0 ? html`<p className="font-medium">Sin intentos.</p>` : intentos.map((i, k) => html`<p key=${k} className="flex justify-between border-b-2 border-tinta py-1 text-sm font-bold"><span>Intento ${k + 1} · ${fmt.fecha(i.fecha)}</span><${Insignia} color=${i.puntaje >= MINIMO ? 'menta' : 'coral'}>${i.puntaje} %<//></p>`)}
          <//>
          ${proyecto.productos.length === 0 && html`<${Aviso} tono="alerta">Tu catálogo está vacío: el chat usa un producto de ejemplo.<//>`}
        </div>
      </div>

      <${Entrega} criterios=${criterios} hecho=${hecho} puntaje=${mejor}
        onEntregar=${() => completar({ puntaje: mejor, resumen: `Mejor conversación: ${mejor} % en ${intentos.length} intentos` })} />
    `;
  }

  SC.registrar({
    id: 8,
    orden: 8,
    modulo: 'ventas',
    titulo: 'Venta conversacional por chat',
    corto: 'Chat de ventas',
    competencia: 'Atender clientes en canales conversacionales aplicando técnicas de venta consultiva.',
    evidencia: 'Conversación de venta completa con puntaje y retroalimentación por etapa.',
    Componente: Chat,
  });
})();
