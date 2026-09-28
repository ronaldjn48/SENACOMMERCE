/* Actividad 1. Instrucciones (prompts) para herramientas de IA generativa. */
(function () {
  const { html, ui, util } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, AreaTexto, Seleccion, Entrega, Aviso, Barra, Insignia, Boton } = ui;

  const elementos = [
    {
      id: 'rol', nombre: 'Rol', peso: 15,
      guia: 'Indica qué papel asume la IA. Ej. "Actúa como experto en branding para tiendas virtuales colombianas".',
      evaluar: (t) => t.length >= 15 && /(act[uú]a|eres|asume|como)/i.test(t),
    },
    {
      id: 'tarea', nombre: 'Tarea', peso: 20,
      guia: 'Inicia con un verbo de acción: crea, genera, propón, redacta, diseña.',
      evaluar: (t) => t.length >= 20 && /^(crea|genera|redacta|prop[oó]n|dise[nñ]a|escribe|sugiere|elabora|construye|define|plantea)/i.test(t.trim()),
    },
    {
      id: 'contexto', nombre: 'Contexto', peso: 20,
      guia: 'Describe el negocio: nicho, ciudad, propuesta de valor y canal de venta (mínimo 40 caracteres).',
      evaluar: (t, nicho) => {
        const n = util.normalizar(t);
        const menciona = [nicho.nombre, ...nicho.categorias, 'tienda', 'colombia', 'virtual', 'online', 'en linea'].some((w) => n.includes(util.normalizar(w).split(' ')[0]));
        return t.length >= 40 && menciona;
      },
    },
    {
      id: 'audiencia', nombre: 'Audiencia', peso: 15,
      guia: 'Precisa el cliente ideal: edad, ubicación, intereses o tipo de empresa.',
      evaluar: (t) => t.length >= 15 && /(a[nñ]os|edad|clientes|personas|mujeres|hombres|j[oó]venes|empresas|p[uú]blico|segmento|compradores)/i.test(t),
    },
    {
      id: 'formato', nombre: 'Formato de salida', peso: 10,
      guia: 'Define cómo quieres la respuesta: lista numerada, tabla, número de opciones o de palabras.',
      evaluar: (t) => /(lista|tabla|vi[nñ]etas|p[aá]rrafo|json|palabras|caracteres|opciones|numerad)/i.test(t),
    },
    {
      id: 'tono', nombre: 'Tono', peso: 10,
      guia: 'Establece la voz de la marca: cercano, profesional, juvenil, inspirador.',
      evaluar: (t) => t.trim().length >= 4,
    },
    {
      id: 'restricciones', nombre: 'Restricciones', peso: 10,
      guia: 'Fija límites: "Evita anglicismos", "máximo 6 palabras", "no uses marcas registradas".',
      evaluar: (t) => t.length >= 15 && /(no |evita|sin |m[aá]ximo|m[ií]nimo|[uú]nicamente|excluye)/i.test(t),
    },
  ];

  const paleta = [
    { id: 'sol', hex: '#FFD60A', nombre: 'Amarillo sol' },
    { id: 'fucsia', hex: '#FF4D8D', nombre: 'Fucsia' },
    { id: 'cielo', hex: '#4CC9F0', nombre: 'Azul cielo' },
    { id: 'menta', hex: '#3DDC97', nombre: 'Verde menta' },
    { id: 'naranja', hex: '#FF8A00', nombre: 'Naranja' },
    { id: 'lila', hex: '#B69CFF', nombre: 'Lila' },
  ];

  function evaluarPrompt(prompt, nicho) {
    return elementos.map((e) => ({ ...e, ok: e.evaluar(String(prompt[e.id] || ''), nicho) }));
  }

  function simularRespuesta(prompt, nicho, semilla, intento, puntaje) {
    const rnd = util.crearAleatorio(`${semilla}-ia-${intento}`);
    const nombres = rnd.mezclar(nicho.raices).slice(0, 3).map((r) => `${r} ${rnd.elegir(nicho.sufijos)}`);
    const tono = String(prompt.tono || 'cercano').toLowerCase();
    const beneficios = ['hecho con propósito', 'con sello colombiano', 'que cuenta tu historia', 'pensado para ti', 'de origen a tu puerta'];
    const slogans = nombres.map(() => `${rnd.elegir(['Calidad', 'Estilo', 'Origen', 'Confianza', 'Detalle'])} ${rnd.elegir(beneficios)}`);
    const generico = puntaje < 80;
    const descripcion = generico
      ? `Somos una tienda en línea de ${nicho.nombre.toLowerCase()}. Ofrecemos productos de calidad a buen precio. Compra con nosotros.`
      : `Somos una tienda virtual de ${nicho.nombre.toLowerCase()} que atiende a ${String(prompt.audiencia || 'clientes de todo el país').replace(/\.$/, '')}. ` +
        `Trabajamos con ${nicho.categorias.slice(0, 3).join(', ').toLowerCase()} seleccionados con criterios de calidad y despachamos a toda Colombia. ` +
        `Nuestra voz es ${tono} y cada compra cuenta con acompañamiento por WhatsApp.`;
    return { nombres, slogans, descripcion, generico, fecha: Date.now() };
  }

  function IAPrompts({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const nicho = proyecto.nicho;
    const prompt = datos.prompt || {};
    const marca = datos.marca || {};
    const iteraciones = datos.iteraciones || [];
    const resultado = datos.resultado;
    const evaluacion = evaluarPrompt(prompt, nicho);
    const puntaje = evaluacion.reduce((s, e) => s + (e.ok ? e.peso : 0), 0);

    const promptTexto = elementos
      .filter((e) => String(prompt[e.id] || '').trim())
      .map((e) => `${e.nombre.toUpperCase()}: ${prompt[e.id].trim()}`)
      .join('\n');

    const setPrompt = (campo, valor) => setDatos({ prompt: { ...prompt, [campo]: valor } });
    const setMarca = (patch) => setDatos({ marca: { ...marca, ...patch } });

    function generar() {
      const res = simularRespuesta(prompt, nicho, proyecto.semilla, iteraciones.length, puntaje);
      setDatos({
        resultado: res,
        iteraciones: [...iteraciones, { puntaje, fecha: Date.now() }],
        marca: { ...marca, descripcionGenerada: res.descripcion, descripcion: marca.descripcion || res.descripcion },
      });
    }

    const colores = marca.colores || [];
    const alternarColor = (id) =>
      setMarca({ colores: colores.includes(id) ? colores.filter((c) => c !== id) : [...colores, id].slice(-2) });

    const criterios = [
      { texto: `Prompt con los 7 elementos y puntaje mínimo de 80 (actual: ${puntaje})`, ok: puntaje >= 80 },
      { texto: `Dos o más iteraciones del prompt (llevas ${iteraciones.length})`, ok: iteraciones.length >= 2 },
      { texto: 'Última generación hecha con un prompt de 80 puntos o más', ok: iteraciones.length > 0 && iteraciones[iteraciones.length - 1].puntaje >= 80 },
      { texto: 'Nombre de marca seleccionado', ok: !!marca.nombre },
      { texto: 'Eslogan de 10 a 60 caracteres', ok: String(marca.slogan || '').length >= 10 && String(marca.slogan || '').length <= 60 },
      { texto: 'Descripción editada por ti (diferente a la generada y de 120 caracteres o más)', ok: String(marca.descripcion || '').length >= 120 && marca.descripcion !== marca.descripcionGenerada },
      { texto: 'Dos colores de marca elegidos', ok: colores.length === 2 },
      { texto: 'Verificación ética respondida correctamente', ok: datos.etica === 'b' },
    ];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>Tu emprendimiento de <strong>${nicho.nombre.toLowerCase()}</strong> necesita identidad de marca. Usa un asistente de IA generativa para proponer nombre, eslogan y descripción.</p>
        <p>La calidad de la respuesta depende de la instrucción. Construye el prompt con sus siete elementos, genera, revisa críticamente y mejora en una segunda iteración.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <${Tarjeta} titulo="Constructor de prompts" subtitulo="Completa cada elemento. El evaluador revisa la estructura en tiempo real." color="blanco">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <${Campo} etiqueta="Herramienta">
              <${Seleccion} value=${datos.herramienta || 'Asistente general'} onChange=${(e) => setDatos({ herramienta: e.target.value })}
                opciones=${['Asistente general', 'ChatGPT', 'Gemini', 'Claude', 'Copilot']} />
            <//>
            <${Campo} etiqueta="Tipo de resultado">
              <${Seleccion} value="marca" disabled opciones=${[{ valor: 'marca', etiqueta: 'Identidad de marca' }]} />
            <//>
          </div>
          <div className="space-y-3">
            ${evaluacion.map(
              (e) => html`<${Campo} key=${e.id} etiqueta=${html`${e.nombre} <span className="ml-1 text-xs">(${e.peso} pts)</span> ${e.ok ? html`<${Insignia} color="menta">ok<//>` : null}`} ayuda=${e.guia}>
                <${AreaTexto} filas=${e.id === 'contexto' ? 3 : 2} value=${prompt[e.id] || ''} onChange=${(ev) => setPrompt(e.id, ev.target.value)} />
              <//>`
            )}
          </div>
        <//>

        <div className="space-y-6">
          <${Tarjeta} titulo="Calidad del prompt" color=${puntaje >= 80 ? 'menta' : 'sol'}>
            <${Barra} valor=${puntaje} etiqueta=${`${puntaje} / 100`} />
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap border-3 border-tinta bg-white p-3 text-xs font-medium">${promptTexto || 'Tu prompt aparece aquí.'}</pre>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <${Boton} variante="oscuro" onClick=${generar} disabled=${puntaje < 60}>Generar con IA<//>
              <span className="text-xs font-bold">${puntaje < 60 ? 'Necesitas 60 puntos para generar.' : `Iteraciones: ${iteraciones.length}`}</span>
            </div>
          <//>

          ${resultado &&
          html`<${Tarjeta} titulo="Respuesta del asistente (simulada)" color="cielo">
            ${resultado.generico &&
            html`<${Aviso} tono="alerta" className="mb-3">La respuesta salió genérica porque el prompt tiene menos de 80 puntos. Ajusta los elementos pendientes y vuelve a generar.<//>`}
            <p className="text-sm font-extrabold uppercase">Elige un nombre</p>
            <div className="mt-2 space-y-2">
              ${resultado.nombres.map(
                (n, i) => html`<label key=${n} className=${`flex cursor-pointer items-center gap-2 border-3 border-tinta p-2 font-bold ${marca.nombre === n ? 'bg-sol' : 'bg-white'}`}>
                  <input type="radio" name="nombre-marca" className="accent-black" checked=${marca.nombre === n}
                    onChange=${() => setMarca({ nombre: n, slogan: marca.slogan || resultado.slogans[i] })} />
                  <span>${n}</span><span className="text-xs font-medium">“${resultado.slogans[i]}”</span>
                </label>`
              )}
            </div>
          <//>`}
        </div>
      </div>

      ${resultado &&
      html`<div className="mt-6 grid gap-6 lg:grid-cols-2">
        <${Tarjeta} titulo="Revisión crítica del resultado" color="blanco">
          <div className="space-y-3">
            <${Campo} etiqueta="Nombre de la tienda"><${Entrada} value=${marca.nombre || ''} onChange=${(e) => setMarca({ nombre: e.target.value })} /><//>
            <${Campo} etiqueta=${`Eslogan (${String(marca.slogan || '').length}/60)`}><${Entrada} maxLength=${60} value=${marca.slogan || ''} onChange=${(e) => setMarca({ slogan: e.target.value })} /><//>
            <${Campo} etiqueta=${`Descripción de la marca (${String(marca.descripcion || '').length} caracteres)`} ayuda="Edita el texto generado: corrige datos, agrega tu propuesta de valor y ajusta el tono.">
              <${AreaTexto} filas=${5} value=${marca.descripcion || ''} onChange=${(e) => setMarca({ descripcion: e.target.value })} />
            <//>
            <div>
              <p className="mb-1 text-sm font-extrabold uppercase">Colores de marca (elige 2)</p>
              <div className="flex flex-wrap gap-2">
                ${paleta.map(
                  (c) => html`<button key=${c.id} type="button" onClick=${() => alternarColor(c.id)}
                    className=${`flex items-center gap-2 border-3 border-tinta px-2 py-1 text-xs font-bold ${colores.includes(c.id) ? 'shadow-none ring-4 ring-black' : 'shadow-brutal-sm'}`}
                    style=${{ background: c.hex }}>${c.nombre}</button>`
                )}
              </div>
            </div>
          </div>
        <//>
        <${Tarjeta} titulo="Verificación ética" color="papel">
          <p className="font-bold">Antes de publicar un texto creado con IA generativa, ¿qué debes hacer?</p>
          <div className="mt-3 space-y-2">
            ${[
              ['a', 'Publicarlo tal como salió, porque la herramienta no comete errores.'],
              ['b', 'Verificar datos, revisar que el nombre no coincida con marcas registradas y ajustar el texto a la voz de la marca.'],
              ['c', 'Pedirle a la misma IA que confirme que el texto es original y publicarlo.'],
            ].map(
              ([v, t]) => html`<label key=${v} className=${`flex cursor-pointer gap-2 border-3 border-tinta p-2 text-sm font-medium ${datos.etica === v ? (v === 'b' ? 'bg-menta' : 'bg-coral') : 'bg-white'}`}>
                <input type="radio" name="etica" className="accent-black" checked=${datos.etica === v} onChange=${() => setDatos({ etica: v })} />${t}
              </label>`
            )}
          </div>
          ${datos.etica && datos.etica !== 'b' && html`<${Aviso} tono="error" className="mt-3">Revisa la respuesta. La IA genera textos plausibles que requieren verificación humana y consulta de marcas en la SIC.<//>`}
        <//>
      </div>`}

      <${Entrega} criterios=${criterios} hecho=${hecho} puntaje=${puntaje}
        onEntregar=${() => completar({ puntaje, resumen: `Marca: ${marca.nombre} · “${marca.slogan}” · ${iteraciones.length} iteraciones` })} />
    `;
  }

  SC.paletaMarca = paleta;

  SC.registrar({
    id: 1,
    orden: 1,
    modulo: 'portafolio',
    titulo: 'Prompts para IA generativa',
    corto: 'IA generativa',
    competencia: 'Formular instrucciones a herramientas de inteligencia artificial generativa para crear contenidos del portafolio.',
    evidencia: 'Prompt estructurado, identidad de marca revisada y verificación ética.',
    Componente: IAPrompts,
  });
})();
