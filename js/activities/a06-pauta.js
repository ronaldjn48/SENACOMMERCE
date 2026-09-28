/* Actividad 6. Simulador de pauta publicitaria y asignación de presupuesto en redes. */
(function () {
  const { html, ui, fmt, util } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, AreaTexto, Seleccion, Entrega, Aviso, Boton, Insignia, Metrica, GraficoBarras } = ui;

  // Referencias simuladas con fines formativos. No corresponden a tarifas oficiales de las plataformas.
  const plataformas = [
    { id: 'meta', nombre: 'Meta (Facebook + Instagram)', color: 'cielo', cpm: 9000, ctr: 1.2, cvr: 2.5 },
    { id: 'tiktok', nombre: 'TikTok Ads', color: 'fucsia', cpm: 6500, ctr: 0.9, cvr: 1.8 },
    { id: 'google', nombre: 'Google Ads (búsqueda)', color: 'sol', cpm: 45000, ctr: 4.5, cvr: 4.5 },
  ];
  const objetivos = {
    ventas: { nombre: 'Ventas (conversiones)', cpm: 1.1, ctr: 1, cvr: 1 },
    trafico: { nombre: 'Tráfico al sitio', cpm: 1, ctr: 1.2, cvr: 0.7 },
    reconocimiento: { nombre: 'Reconocimiento de marca', cpm: 0.7, ctr: 0.6, cvr: 0.4 },
  };
  const ctas = ['Comprar', 'Más información', 'Enviar mensaje', 'Registrarte', 'Ver catálogo'];

  function proyectar(d, proyecto) {
    const aud = d.audiencia || {};
    const obj = objetivos[d.objetivo] || objetivos.ventas;
    const presupuesto = Number(d.presupuesto) || 0;
    const ciudades = (aud.ciudades || []).length;
    const rangoEdad = (Number(aud.edadMax) || 0) - (Number(aud.edadMin) || 0);
    const factorAudiencia = 1 + Math.max(0, 3 - ciudades) * 0.08 + (rangoEdad > 0 && rangoEdad < 10 ? 0.15 : 0);
    const afines = (aud.intereses || []).filter((i) => proyecto.nicho.intereses.includes(i)).length;
    const relevancia = afines >= 2 ? 1.15 : 1;
    const anuncio = d.anuncio || {};
    const nombreMarca = util.normalizar(proyecto.marca.nombre).split(' ')[0];
    const calidad =
      String(anuncio.titular || '').length >= 10 && String(anuncio.texto || '').length >= 30 && util.normalizar(`${anuncio.titular} ${anuncio.texto}`).includes(nombreMarca) ? 1.1 : 1;
    const ticket = proyecto.ticketPromedio;
    const reparto = d.reparto || {};

    const filas = plataformas.map((p) => {
      const inversion = (presupuesto * (Number(reparto[p.id]) || 0)) / 100;
      const cpm = p.cpm * obj.cpm * factorAudiencia;
      const impresiones = inversion > 0 ? (inversion / cpm) * 1000 : 0;
      const clics = impresiones * ((p.ctr * obj.ctr * calidad) / 100);
      const conversiones = clics * ((p.cvr * obj.cvr * relevancia) / 100);
      const ingresos = conversiones * ticket;
      return { ...p, inversion, cpm, impresiones, clics, conversiones, ingresos, roas: inversion ? ingresos / inversion : 0 };
    });
    const tot = filas.reduce(
      (a, f) => ({ inversion: a.inversion + f.inversion, impresiones: a.impresiones + f.impresiones, clics: a.clics + f.clics, conversiones: a.conversiones + f.conversiones, ingresos: a.ingresos + f.ingresos }),
      { inversion: 0, impresiones: 0, clics: 0, conversiones: 0, ingresos: 0 }
    );
    tot.roas = tot.inversion ? tot.ingresos / tot.inversion : 0;
    tot.cpa = tot.conversiones ? tot.inversion / tot.conversiones : 0;
    tot.ctr = tot.impresiones ? (tot.clics / tot.impresiones) * 100 : 0;
    return { filas, tot, factorAudiencia, relevancia, calidad, ticket };
  }

  function Pauta({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const aud = datos.audiencia || { edadMin: 18, edadMax: 45, ciudades: [], intereses: [] };
    const reparto = datos.reparto || { meta: 0, tiktok: 0, google: 0 };
    const anuncio = datos.anuncio || { titular: '', texto: '', cta: '' };
    const setAud = (patch) => setDatos({ audiencia: { ...aud, ...patch } });
    const setAnuncio = (patch) => setDatos({ anuncio: { ...anuncio, ...patch } });
    const alternar = (lista, valor) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);

    const proy = proyectar(datos, proyecto);
    const suma = plataformas.reduce((s, p) => s + (Number(reparto[p.id]) || 0), 0);
    const plataformasUsadas = plataformas.filter((p) => Number(reparto[p.id]) >= 10).length;
    const presupuesto = Number(datos.presupuesto) || 0;
    const dias = Number(datos.dias) || 0;

    const criterios = [
      { texto: 'Presupuesto de 300.000 COP o más y duración entre 7 y 60 días', ok: presupuesto >= 300000 && dias >= 7 && dias <= 60 },
      { texto: 'Objetivo de campaña seleccionado', ok: !!datos.objetivo },
      { texto: 'Audiencia: mayores de 18, rango de edad válido, una ciudad o más y dos intereses o más', ok: Number(aud.edadMin) >= 18 && Number(aud.edadMax) > Number(aud.edadMin) && aud.ciudades.length >= 1 && aud.intereses.length >= 2 },
      { texto: `Reparto del presupuesto suma 100 % (actual ${suma} %)`, ok: suma === 100 },
      { texto: 'Dos plataformas o más con 10 % del presupuesto o más', ok: plataformasUsadas >= 2 },
      { texto: 'Anuncio: titular de 10 a 40 caracteres, texto de 30 a 125 caracteres y llamado a la acción', ok: anuncio.titular.length >= 10 && anuncio.titular.length <= 40 && anuncio.texto.length >= 30 && anuncio.texto.length <= 125 && !!anuncio.cta },
      { texto: `ROAS proyectado igual o superior a 2,0 (actual ${proy.tot.roas.toFixed(2)})`, ok: proy.tot.roas >= 2 },
      { texto: 'Plan de medios guardado con la proyección vigente', ok: !!datos.plan && Math.abs(datos.plan.roas - proy.tot.roas) < 0.001 && datos.plan.inversion === proy.tot.inversion },
    ];

    function guardarPlan() {
      setDatos({ plan: { fecha: Date.now(), dias, ...proy.tot, ticket: proy.ticket, porPlataforma: proy.filas.map((f) => ({ id: f.id, nombre: f.nombre, inversion: f.inversion, conversiones: f.conversiones, ingresos: f.ingresos })) } });
    }

    return html`
      <${Contexto} actividad=${actividad}>
        <p>${proyecto.marca.nombre} lanza su primera campaña pagada. Define el presupuesto, el objetivo y la audiencia. Reparte la inversión entre plataformas y redacta el anuncio.</p>
        <p>El simulador proyecta impresiones, clics, conversiones e ingresos con un ticket promedio de ${fmt.cop(proyecto.ticketPromedio)} (precio promedio del catálogo ${fmt.cop(proyecto.precioPromedio)} × 1,4 unidades por pedido). Las audiencias muy estrechas encarecen el CPM y los intereses afines al nicho mejoran la conversión.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-2">
        <${Tarjeta} titulo="Configuración de campaña" color="blanco">
          <div className="grid gap-3 sm:grid-cols-2">
            <${Campo} etiqueta="Presupuesto total (COP)"><${Entrada} type="number" step="50000" value=${datos.presupuesto || ''} onChange=${(e) => setDatos({ presupuesto: e.target.value })} /><//>
            <${Campo} etiqueta="Duración (días)" ayuda=${presupuesto && dias ? `Inversión diaria: ${fmt.cop(presupuesto / dias)}` : ''}><${Entrada} type="number" value=${datos.dias || ''} onChange=${(e) => setDatos({ dias: e.target.value })} /><//>
            <${Campo} etiqueta="Objetivo" className="sm:col-span-2">
              <${Seleccion} value=${datos.objetivo || ''} vacio="Selecciona" opciones=${Object.entries(objetivos).map(([valor, o]) => ({ valor, etiqueta: o.nombre }))} onChange=${(e) => setDatos({ objetivo: e.target.value })} />
            <//>
            <${Campo} etiqueta="Edad mínima"><${Entrada} type="number" value=${aud.edadMin} onChange=${(e) => setAud({ edadMin: e.target.value })} /><//>
            <${Campo} etiqueta="Edad máxima"><${Entrada} type="number" value=${aud.edadMax} onChange=${(e) => setAud({ edadMax: e.target.value })} /><//>
          </div>
          <p className="mt-4 mb-1 text-sm font-extrabold uppercase">Ubicaciones</p>
          <div className="flex flex-wrap gap-1.5">
            ${SC.datos.ciudades.map((c) => html`<button key=${c.nombre} type="button" onClick=${() => setAud({ ciudades: alternar(aud.ciudades, c.nombre) })}
              className=${`border-2 border-tinta px-2 py-1 text-xs font-bold ${aud.ciudades.includes(c.nombre) ? 'bg-tinta text-white' : 'bg-white'}`}>${c.nombre}</button>`)}
          </div>
          <p className="mt-4 mb-1 text-sm font-extrabold uppercase">Intereses</p>
          <div className="flex flex-wrap gap-1.5">
            ${[...proyecto.nicho.intereses, 'Deportes', 'Viajes', 'Finanzas personales', 'Videojuegos'].map((i) => html`<button key=${i} type="button" onClick=${() => setAud({ intereses: alternar(aud.intereses, i) })}
              className=${`border-2 border-tinta px-2 py-1 text-xs font-bold ${aud.intereses.includes(i) ? 'bg-fucsia' : 'bg-white'}`}>${i}</button>`)}
          </div>
        <//>

        <${Tarjeta} titulo="Reparto del presupuesto" color=${suma === 100 ? 'menta' : 'sol'} subtitulo=${`Suma actual: ${suma} %`}>
          <div className="space-y-4">
            ${plataformas.map((p) => html`<div key=${p.id}>
              <div className="flex justify-between text-sm font-extrabold"><span>${p.nombre}</span><span>${reparto[p.id] || 0} % · ${fmt.cop((presupuesto * (reparto[p.id] || 0)) / 100)}</span></div>
              <input type="range" min="0" max="100" step="5" aria-label=${`Porcentaje para ${p.nombre}`} className="w-full accent-black" value=${reparto[p.id] || 0}
                onChange=${(e) => setDatos({ reparto: { ...reparto, [p.id]: Number(e.target.value) } })} />
              <p className="text-xs font-medium">Referencia simulada: CPM ${fmt.cop(p.cpm)} · CTR ${p.ctr} % · tasa de conversión ${p.cvr} %</p>
            </div>`)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <${Insignia} color=${proy.factorAudiencia > 1 ? 'coral' : 'menta'}>Factor CPM por audiencia ×${proy.factorAudiencia.toFixed(2)}<//>
            <${Insignia} color=${proy.relevancia > 1 ? 'menta' : 'blanco'}>Relevancia de intereses ×${proy.relevancia.toFixed(2)}<//>
            <${Insignia} color=${proy.calidad > 1 ? 'menta' : 'blanco'}>Calidad del anuncio ×${proy.calidad.toFixed(2)}<//>
          </div>
        <//>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <${Tarjeta} titulo="Creatividad del anuncio" color="blanco">
          <div className="space-y-3">
            <${Campo} etiqueta=${`Titular (${anuncio.titular.length}/40)`}><${Entrada} maxLength=${40} value=${anuncio.titular} onChange=${(e) => setAnuncio({ titular: e.target.value })} /><//>
            <${Campo} etiqueta=${`Texto principal (${anuncio.texto.length}/125)`} ayuda="Menciona la marca para mejorar la calidad del anuncio.">
              <${AreaTexto} filas=${3} maxLength=${125} value=${anuncio.texto} onChange=${(e) => setAnuncio({ texto: e.target.value })} />
            <//>
            <${Campo} etiqueta="Llamado a la acción"><${Seleccion} value=${anuncio.cta} vacio="Selecciona" opciones=${ctas} onChange=${(e) => setAnuncio({ cta: e.target.value })} /><//>
          </div>
        <//>
        <div className="nb-card mx-auto w-full max-w-sm bg-white">
          <div className="flex items-center gap-2 border-b-3 border-tinta p-3">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-tinta bg-sol font-black">${proyecto.marca.nombre.charAt(0)}</div>
            <div><p className="text-sm font-black">${proyecto.marca.nombre}</p><p className="text-xs">Publicidad</p></div>
          </div>
          <p className="p-3 text-sm font-medium">${anuncio.texto || 'Texto principal del anuncio.'}</p>
          <div className="flex h-44 items-center justify-center border-y-3 border-tinta bg-papel text-6xl">${(proyecto.productos[0] && proyecto.productos[0].icono) || '🛍️'}</div>
          <div className="flex items-center justify-between gap-2 p-3">
            <p className="text-sm font-black">${anuncio.titular || 'Titular del anuncio'}</p>
            <span className="border-2 border-tinta bg-cielo px-2 py-1 text-xs font-extrabold uppercase">${anuncio.cta || 'CTA'}</span>
          </div>
        </div>
      </div>

      <${Tarjeta} titulo="Proyección de resultados" color="papel" className="mt-6"
        acciones=${html`<${Boton} variante="oscuro" onClick=${guardarPlan} disabled=${suma !== 100 || !presupuesto}>Guardar plan de medios<//>`}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <${Metrica} etiqueta="Impresiones" valor=${fmt.num(Math.round(proy.tot.impresiones))} />
          <${Metrica} etiqueta="Clics" valor=${fmt.num(Math.round(proy.tot.clics))} detalle=${`CTR ${proy.tot.ctr.toFixed(2)} %`} />
          <${Metrica} etiqueta="Conversiones" valor=${fmt.num(proy.tot.conversiones.toFixed(1))} />
          <${Metrica} etiqueta="Ingresos" valor=${fmt.cop(proy.tot.ingresos)} />
          <${Metrica} etiqueta="CPA" valor=${fmt.cop(proy.tot.cpa)} />
          <${Metrica} etiqueta="ROAS" valor=${proy.tot.roas.toFixed(2)} color=${proy.tot.roas >= 2 ? 'menta' : 'coral'} />
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-extrabold uppercase">ROAS por plataforma</p>
            <${GraficoBarras} datos=${proy.filas.map((f) => ({ etiqueta: f.id.toUpperCase(), valor: f.roas, color: f.color }))} formato=${(v) => v.toFixed(2)} />
          </div>
          <div className="overflow-x-auto"><table className="nb-table">
            <thead><tr><th>Plataforma</th><th>Inversión</th><th>Conv.</th><th>Ingresos</th></tr></thead>
            <tbody>${proy.filas.map((f) => html`<tr key=${f.id}><td className="font-bold">${f.nombre}</td><td>${fmt.cop(f.inversion)}</td><td>${f.conversiones.toFixed(1)}</td><td>${fmt.cop(f.ingresos)}</td></tr>`)}</tbody>
          </table></div>
        </div>
        ${datos.plan && html`<${Aviso} tono="ok" className="mt-4">Plan guardado el ${fmt.fecha(datos.plan.fecha)}. La actividad de ROI usa estos datos.<//>`}
      <//>

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: 100, resumen: `Inversión ${fmt.cop(proy.tot.inversion)} · ROAS ${proy.tot.roas.toFixed(2)} · ${Math.round(proy.tot.conversiones)} conversiones` })} />
    `;
  }

  SC.registrar({
    id: 6,
    orden: 6,
    modulo: 'ventas',
    titulo: 'Simulador de pauta publicitaria',
    corto: 'Pauta digital',
    competencia: 'Asignar presupuestos de pauta en redes sociales y buscadores según objetivos y audiencias.',
    evidencia: 'Plan de medios con segmentación, reparto de inversión, anuncio y proyección de ROAS.',
    Componente: Pauta,
  });
})();
