/* Actividad 14. Redacción de correos corporativos con comunicación efectiva. */
(function () {
  const { html, ui, util } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, AreaTexto, Casilla, Entrega, Aviso, Boton, Barra } = ui;

  const MINIMO = 80;

  function evaluar(correo, caso, marca) {
    const cuerpo = String(correo.cuerpo || '');
    const n = util.normalizar(cuerpo);
    const lineas = cuerpo.split('\n').map((l) => l.trim()).filter(Boolean);
    const inicio = util.normalizar(lineas.slice(0, 2).join(' '));
    const final = util.normalizar(lineas.slice(-4).join(' '));
    const asunto = String(correo.asunto || '');
    const parrafos = cuerpo.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const palabras = util.palabras(cuerpo);
    const gritos = cuerpo.split(/\s+/).filter((w) => w.length > 4 && /^[A-ZÁÉÍÓÚÑ]+$/.test(w.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')) && !/\d/.test(w));
    const emojis = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(cuerpo);
    const culpa = /(usted se equivoco|no es nuestra culpa|no es nuestro problema|debio leer|fue su error)/.test(n);
    const nombreCliente = util.normalizar(caso.cliente.split(' ')[0]);
    return [
      { texto: 'Asunto de 15 a 70 caracteres con el número de ticket o de pedido', peso: 10, ok: asunto.length >= 15 && asunto.length <= 70 && (asunto.includes(caso.id) || asunto.includes(caso.pedido)) },
      { texto: 'Saludo formal al inicio', peso: 10, ok: /^(estimad|apreciad|cordial saludo|buen(os|as) (dia|tarde)|senor|senora|respetad)/.test(inicio) },
      { texto: 'Menciona el nombre del cliente en el saludo', peso: 10, ok: inicio.includes(nombreCliente) },
      { texto: 'Reconoce la situación con empatía', peso: 10, ok: /(lamentamos|disculpas|entendemos|comprendemos|sentimos)/.test(n) },
      { texto: 'Propone una solución concreta con plazo (días, horas o fecha)', peso: 15, ok: /(\d+\s*(dias|horas)|habiles|\d{1,2} de [a-z]+)/.test(n) },
      { texto: 'Cierre cortés', peso: 10, ok: /(quedamos atentos|cordialmente|atentamente|saludos cordiales|a su disposicion|quedo atent)/.test(final) || /(quedamos atentos|cordialmente|atentamente|saludos cordiales)/.test(n) },
      { texto: `Firma con cargo y nombre de la tienda (${marca})`, peso: 10, ok: final.includes(util.normalizar(marca).split(' ')[0]) && /(asesor|coordinador|servicio al cliente|atencion|gerente|lider|analista)/.test(final) },
      { texto: `Extensión de 80 a 250 palabras (llevas ${palabras})`, peso: 10, ok: palabras >= 80 && palabras <= 250 },
      { texto: `Tres párrafos o más separados por una línea en blanco (llevas ${parrafos})`, peso: 5, ok: parrafos >= 3 },
      { texto: 'Tono profesional: sin mayúscula sostenida, sin emojis, máximo un signo de exclamación y sin culpar al cliente', peso: 10, ok: cuerpo.length > 0 && gritos.length === 0 && !emojis && (cuerpo.match(/!/g) || []).length <= 1 && !culpa },
    ];
  }

  function Correo({ actividad, datos, setDatos, proyecto, completar, hecho, estado }) {
    const tickets = (estado.datos[9] && estado.datos[9].tickets) || [];
    const caso = tickets.find((t) => t.clave.tipo === 'Reclamo') || { id: 'TK-2300', cliente: 'Laura Gómez', email: 'laura.gomez@correo.co', asunto: 'Mi pedido no llega', texto: 'Compré hace 8 días y el pedido no llega.', pedido: 'PED-1040' };
    const correo = datos.correo || { para: caso.email, asunto: '', cuerpo: '' };
    const auto = datos.auto || {};
    const setCorreo = (patch) => setDatos({ correo: { ...correo, ...patch }, revisado: false });
    const rubrica = evaluar(correo, caso, proyecto.marca.nombre);
    const puntaje = rubrica.reduce((s, r) => s + (r.ok ? r.peso : 0), 0);
    const revisado = datos.revisado;
    const mejor = datos.mejor || 0;

    const criterios = [
      { texto: 'Correo revisado con la rúbrica automática', ok: !!revisado },
      { texto: `Puntaje de ${MINIMO} o más en la rúbrica (mejor: ${mejor})`, ok: mejor >= MINIMO },
      { texto: 'Autoevaluación de las 4C completada', ok: ['claro', 'conciso', 'cortes', 'correcto'].every((k) => auto[k]) },
    ];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>El ticket <strong>${caso.id}</strong> de la bandeja de posventa es un reclamo que requiere respuesta formal por correo. Redacta el mensaje en nombre de ${proyecto.marca.nombre}, con estructura corporativa y comunicación efectiva.</p>
        <p>Aplica las 4C: claro, conciso, cortés y correcto. El sistema evalúa tu correo con una rúbrica de 10 criterios.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <${Tarjeta} titulo="Redacción" color="blanco">
          <div className="mb-4 border-3 border-tinta bg-papel p-3 text-sm">
            <p className="font-black">${caso.id} · ${caso.asunto}</p>
            <p className="font-bold">${caso.cliente} · ${caso.email}</p>
            <p className="mt-1 font-medium">“${caso.texto}”</p>
          </div>
          <div className="space-y-3">
            <${Campo} etiqueta="Para"><${Entrada} value=${correo.para} onChange=${(e) => setCorreo({ para: e.target.value })} /><//>
            <${Campo} etiqueta=${`Asunto (${String(correo.asunto).length}/70)`}><${Entrada} value=${correo.asunto} onChange=${(e) => setCorreo({ asunto: e.target.value })} /><//>
            <${Campo} etiqueta="Cuerpo del correo" ayuda="Separa los párrafos con una línea en blanco. Termina con cierre y firma.">
              <${AreaTexto} filas=${14} value=${correo.cuerpo} onChange=${(e) => setCorreo({ cuerpo: e.target.value })} />
            <//>
          </div>
          <${Boton} className="mt-4" variante="oscuro" onClick=${() => setDatos({ revisado: true, mejor: Math.max(mejor, puntaje) })}>Evaluar con la rúbrica<//>
        <//>

        <div className="space-y-6">
          <${Tarjeta} titulo="Rúbrica" color=${revisado ? (puntaje >= MINIMO ? 'menta' : 'coral') : 'sol'}>
            <${Barra} valor=${revisado ? puntaje : 0} etiqueta=${revisado ? `${puntaje} / 100` : 'Sin evaluar'} />
            ${revisado
              ? html`<ul className="mt-3 space-y-1.5">${rubrica.map((r, i) => html`<li key=${i} className="flex gap-2 text-sm font-medium">
                  <span className=${`flex h-5 w-8 shrink-0 items-center justify-center border-2 border-tinta text-xs font-black ${r.ok ? 'bg-white' : 'bg-tinta text-white'}`}>${r.ok ? r.peso : 0}</span>${r.texto}</li>`)}</ul>`
              : html`<p className="mt-3 text-sm font-medium">Redacta y evalúa para ver el detalle de cada criterio.</p>`}
          <//>
          <${Tarjeta} titulo="Autoevaluación 4C" color="lila">
            <div className="space-y-2">
              <${Casilla} etiqueta="Claro: el cliente entiende qué pasó y qué sigue." checked=${auto.claro} onChange=${(v) => setDatos({ auto: { ...auto, claro: v } })} />
              <${Casilla} etiqueta="Conciso: no hay frases de relleno ni repeticiones." checked=${auto.conciso} onChange=${(v) => setDatos({ auto: { ...auto, conciso: v } })} />
              <${Casilla} etiqueta="Cortés: el tono respeta al cliente y no lo culpa." checked=${auto.cortes} onChange=${(v) => setDatos({ auto: { ...auto, cortes: v } })} />
              <${Casilla} etiqueta="Correcto: revisé ortografía, datos del pedido y plazos." checked=${auto.correcto} onChange=${(v) => setDatos({ auto: { ...auto, correcto: v } })} />
            </div>
          <//>
          ${tickets.length === 0 && html`<${Aviso} tono="alerta">No hay tickets cargados: se usa un caso de ejemplo.<//>`}
        </div>
      </div>

      <${Tarjeta} titulo="Vista en cliente de correo" className="mt-6" color="papel">
        <div className="border-3 border-tinta bg-white">
          <div className="border-b-3 border-tinta p-3 text-sm">
            <p><strong>De:</strong> ${proyecto.perfil.correo || 'servicio@tienda.co'}</p>
            <p><strong>Para:</strong> ${correo.para}</p>
            <p><strong>Asunto:</strong> ${correo.asunto}</p>
          </div>
          <div className="whitespace-pre-wrap p-4 text-sm font-medium">${correo.cuerpo || 'El cuerpo del correo aparece aquí.'}</div>
        </div>
      <//>

      <${Entrega} criterios=${criterios} hecho=${hecho} puntaje=${mejor}
        onEntregar=${() => completar({ puntaje: mejor, resumen: `Respuesta al ${caso.id}: ${mejor}/100` })} />
    `;
  }

  SC.registrar({
    id: 14,
    orden: 13,
    modulo: 'transversal',
    titulo: 'Correo corporativo efectivo',
    corto: 'Correo corporativo',
    competencia: 'Redactar correos corporativos con estructura formal y principios de comunicación efectiva.',
    evidencia: 'Correo de respuesta a un reclamo evaluado con rúbrica y autoevaluación 4C.',
    Componente: Correo,
  });
})();
