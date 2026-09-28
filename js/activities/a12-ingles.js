/* Actividad 12. Interacciones de soporte al cliente en inglés. */
(function () {
  const { html, ui, util } = SC;
  const { Contexto, Tarjeta, Seleccion, AreaTexto, Entrega, Aviso, Boton, Barra, Insignia } = ui;

  const MINIMO = 80;
  const vocabulario = [
    ['Tracking number', 'Número de guía'],
    ['Refund', 'Reembolso'],
    ['Shipping fee', 'Costo de envío'],
    ['Out of stock', 'Agotado'],
    ['Warranty', 'Garantía'],
    ['Checkout', 'Finalizar compra'],
    ['Delivery address', 'Dirección de entrega'],
    ['Customer service', 'Servicio al cliente'],
  ];

  function escenarios(proyecto) {
    const pedidos = (proyecto.inventario.pedidos || []).filter((p) => p.despacho);
    const pedido = pedidos[0] || { id: 'PED-1040', despacho: { guia: 'SE123456789', transportadora: 'Servientrega', dias: 3 } };
    const prod = (proyecto.productos[0] && proyecto.productos[0].nombre) || proyecto.nicho.productoChat;
    return {
      pedido,
      casos: [
        {
          cliente: `Hi, I placed order ${pedido.id} last week. Where is my package?`,
          opciones: [
            `Hello! Thank you for contacting us. Your order ${pedido.id} was shipped with ${pedido.despacho.transportadora}. Your tracking number is ${pedido.despacho.guia}.`,
            `Your package is not my problem. Ask the carrier.`,
            `Hello, your order are in the way, it arrive soon maybe.`,
          ],
          correcta: 0,
        },
        {
          cliente: `The ${prod} I received is damaged. I want my money back.`,
          opciones: [
            'OK. Send it back and we see what happens.',
            `I'm very sorry to hear that. You are covered by our warranty. Please send us a photo and we will process your refund or a replacement.`,
            'Damaged products are not accepted for returns.',
          ],
          correcta: 1,
        },
        {
          cliente: 'Do you ship to Medellín? How much is the shipping fee?',
          opciones: [
            'Yes we ship. Price is variable.',
            'We only sell in Bogotá.',
            'Yes, we ship nationwide. The shipping fee depends on the weight and destination. You will see the exact amount at checkout.',
          ],
          correcta: 2,
        },
        {
          cliente: `Is the ${prod} available? The website says out of stock.`,
          opciones: [
            `Thank you for your interest! The item is temporarily out of stock. We expect new units next week. Would you like us to notify you by email?`,
            'No.',
            'The website is wrong, buy it anyway.',
          ],
          correcta: 0,
        },
        {
          cliente: 'Can I change my delivery address? I moved yesterday.',
          opciones: [
            'Addresses cannot be changed never.',
            'Of course! Please share the new delivery address and a contact phone number. If the order has not been shipped yet, we will update it right away.',
            'Yes. Write me.',
          ],
          correcta: 1,
        },
      ],
      huecos: [
        { frase: "I'm sorry for the ___. We are working to solve it.", opciones: ['inconvenience', 'inconvenient', 'convenience'], correcta: 'inconvenience' },
        { frase: 'Your order ___ shipped yesterday.', opciones: ['was', 'were', 'is being'], correcta: 'was' },
        { frase: 'Please ___ me know if you need further assistance.', opciones: ['let', 'make', 'allow'], correcta: 'let' },
        { frase: 'We will ___ your refund within 5 business days.', opciones: ['process', 'processing', 'processed'], correcta: 'process' },
      ],
      escritura: `A customer writes: "Hello, my order ${pedido.id} has not arrived and I need it for a birthday on Saturday. Please help!" Write a reply in English.`,
    };
  }

  function evaluarEscritura(t, pedido) {
    const n = String(t || '').toLowerCase();
    const items = [
      { texto: 'Saludo (Hello, Hi, Dear)', ok: /\b(hello|hi|dear|good (morning|afternoon))\b/.test(n) },
      { texto: 'Disculpa o agradecimiento (sorry, apologize, thank you)', ok: /(sorry|apologi[sz]e|thank)/.test(n) },
      { texto: 'Información concreta: número de pedido o de guía', ok: n.includes(pedido.id.toLowerCase()) || n.includes(String(pedido.despacho.guia).toLowerCase()) || /tracking/.test(n) },
      { texto: 'Acción o compromiso (we will, I will, we are)', ok: /\b(we will|i will|we'll|i'll|we are|we can)\b/.test(n) },
      { texto: 'Cierre cortés (regards, best, sincerely, let me know)', ok: /(regards|best|sincerely|let me know|have a (nice|great))/.test(n) },
      { texto: 'Extensión de 30 palabras o más', ok: util.palabras(t) >= 30 },
    ];
    return items;
  }

  function hablar(texto) {
    try {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* El navegador no soporta síntesis de voz. */
    }
  }

  function Ingles({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const esc = React.useMemo(() => escenarios(proyecto), [proyecto.semilla, proyecto.productos.length]);
    const opcionesVocab = React.useMemo(() => util.crearAleatorio(`${proyecto.semilla}-vocab`).mezclar(vocabulario.map((v) => v[1])), [proyecto.semilla]);
    const orden = React.useMemo(() => esc.casos.map((_, i) => util.crearAleatorio(`${proyecto.semilla}-caso-${i}`).mezclar([0, 1, 2])), [esc]);
    const r = datos.respuestas || { vocab: {}, casos: {}, huecos: {}, texto: '' };
    const set = (seccion, clave, valor) => setDatos({ respuestas: { ...r, [seccion]: { ...r[seccion], [clave]: valor } }, revisado: false });
    const revisado = datos.revisado;

    const pVocab = vocabulario.filter(([en, es]) => r.vocab[en] === es).length;
    const pCasos = esc.casos.filter((c, i) => r.casos[i] === c.correcta).length * 2;
    const pHuecos = esc.huecos.filter((h, i) => r.huecos[i] === h.correcta).length;
    const escritura = evaluarEscritura(r.texto, esc.pedido);
    const pEscritura = escritura.filter((x) => x.ok).length;
    const max = vocabulario.length + esc.casos.length * 2 + esc.huecos.length + escritura.length;
    const puntaje = Math.round(((pVocab + pCasos + pHuecos + pEscritura) / max) * 100);
    const mejor = datos.mejor || 0;

    function revisar() {
      setDatos({ revisado: true, mejor: Math.max(mejor, puntaje), intentos: (datos.intentos || 0) + 1 });
    }

    const color = (ok) => (revisado ? (ok ? 'bg-menta' : 'bg-coral') : 'bg-white');

    const criterios = [
      { texto: 'Todas las secciones respondidas', ok: Object.keys(r.vocab).length === vocabulario.length && Object.keys(r.casos).length === esc.casos.length && Object.keys(r.huecos).length === esc.huecos.length && util.palabras(r.texto) >= 10 },
      { texto: 'Respuestas revisadas por el sistema', ok: !!revisado },
      { texto: `Puntaje de ${MINIMO} % o más (mejor: ${mejor} %)`, ok: mejor >= MINIMO },
    ];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>${proyecto.marca.nombre} empezó a recibir pedidos de clientes extranjeros. Atiende los mensajes de soporte en inglés con respuestas corteses, claras y con información precisa del pedido.</p>
        <p>Usa el botón de audio para escuchar cada mensaje del cliente.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-2">
        <${Tarjeta} titulo="1. Vocabulary" subtitulo="Relaciona cada término con su equivalente en español." color="blanco">
          <div className="space-y-2">
            ${vocabulario.map(([en, es]) => html`<div key=${en} className="grid grid-cols-[1fr_1fr] items-center gap-2">
              <span className="flex items-center gap-2 font-black"><button type="button" aria-label=${`Escuchar ${en}`} className="border-2 border-tinta bg-cielo px-1.5 text-xs" onClick=${() => hablar(en)}>🔊</button>${en}</span>
              <${Seleccion} className=${color(r.vocab[en] === es)} value=${r.vocab[en] || ''} vacio="Selecciona" opciones=${opcionesVocab} onChange=${(e) => set('vocab', en, e.target.value)} />
            </div>`)}
          </div>
        <//>

        <${Tarjeta} titulo="2. Fill the gaps" subtitulo="Completa las frases frecuentes del soporte al cliente." color="blanco">
          <div className="space-y-3">
            ${esc.huecos.map((h, i) => html`<div key=${i} className="flex flex-wrap items-center gap-2 font-bold">
              <span>${h.frase.split('___')[0]}</span>
              <select aria-label=${`Hueco ${i + 1}`} className=${`nb-input w-auto py-1 ${color(r.huecos[i] === h.correcta)}`} value=${r.huecos[i] || ''} onChange=${(e) => set('huecos', i, e.target.value)}>
                <option value="">___</option>
                ${h.opciones.map((o) => html`<option key=${o} value=${o}>${o}</option>`)}
              </select>
              <span>${h.frase.split('___')[1]}</span>
            </div>`)}
          </div>
        <//>
      </div>

      <${Tarjeta} titulo="3. Customer conversations" subtitulo="Elige la respuesta más profesional y precisa." className="mt-6" color="blanco">
        <div className="grid gap-4 lg:grid-cols-2">
          ${esc.casos.map((c, i) => html`<div key=${i} className="border-3 border-tinta bg-papel p-3">
            <div className="flex items-start gap-2">
              <button type="button" aria-label="Escuchar mensaje" className="border-2 border-tinta bg-cielo px-2 py-1 text-sm" onClick=${() => hablar(c.cliente)}>🔊</button>
              <p className="font-black">Customer: “${c.cliente}”</p>
            </div>
            <div className="mt-2 space-y-1.5">
              ${orden[i].map((k) => html`<label key=${k} className=${`flex cursor-pointer gap-2 border-2 border-tinta p-2 text-sm font-medium ${r.casos[i] === k ? (revisado ? (k === c.correcta ? 'bg-menta' : 'bg-coral') : 'bg-sol') : 'bg-white'}`}>
                <input type="radio" name=${`caso-${i}`} className="accent-black" checked=${r.casos[i] === k} onChange=${() => set('casos', i, k)} />${c.opciones[k]}
              </label>`)}
            </div>
          </div>`)}
        </div>
      <//>

      <div className="mt-6 grid gap-6 xl:grid-cols-[3fr_2fr]">
        <${Tarjeta} titulo="4. Writing" color="blanco">
          <p className="mb-2 font-bold">${esc.escritura}</p>
          <${AreaTexto} filas=${6} value=${r.texto} onChange=${(e) => setDatos({ respuestas: { ...r, texto: e.target.value }, revisado: false })} placeholder="Hello ..." />
          <p className="mt-1 text-xs font-bold">${util.palabras(r.texto)} words</p>
          ${revisado && html`<div className="mt-3"><${ui.Criterios} items=${escritura} /></div>`}
        <//>
        <${Tarjeta} titulo="Resultado" color=${revisado ? (puntaje >= MINIMO ? 'menta' : 'coral') : 'sol'}>
          <${Barra} valor=${revisado ? puntaje : 0} etiqueta=${revisado ? `${puntaje} %` : 'Sin revisar'} />
          ${revisado && html`<div className="mt-3 flex flex-wrap gap-1">
            <${Insignia}>Vocabulary ${pVocab}/${vocabulario.length}<//>
            <${Insignia}>Gaps ${pHuecos}/${esc.huecos.length}<//>
            <${Insignia}>Conversations ${pCasos / 2}/${esc.casos.length}<//>
            <${Insignia}>Writing ${pEscritura}/${escritura.length}<//>
          </div>`}
          <${Boton} className="mt-4" variante="oscuro" onClick=${revisar}>Revisar respuestas<//>
          ${revisado && puntaje < MINIMO && html`<${Aviso} tono="error" className="mt-3">Corrige las respuestas marcadas en rojo y vuelve a revisar.<//>`}
        <//>
      </div>

      <${Entrega} criterios=${criterios} hecho=${hecho} puntaje=${mejor}
        onEntregar=${() => completar({ puntaje: mejor, resumen: `Soporte en inglés: ${mejor} %` })} />
    `;
  }

  SC.registrar({
    id: 12,
    orden: 12,
    modulo: 'transversal',
    titulo: 'Soporte al cliente en inglés',
    corto: 'Inglés',
    competencia: 'Interactuar con clientes en inglés en situaciones de soporte y servicio posventa.',
    evidencia: 'Vocabulario técnico, frases de servicio, selección de respuestas y redacción de un mensaje en inglés.',
    Componente: Ingles,
  });
})();
