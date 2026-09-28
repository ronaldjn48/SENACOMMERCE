/* Actividad 11. Cálculos matemáticos para definir métricas de retorno de inversión. */
(function () {
  const { html, ui, fmt, util } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, Entrega, Aviso, Boton, Metrica, Insignia } = ui;

  function escenario(proyecto) {
    const rnd = util.crearAleatorio(`${proyecto.semilla}-roi`);
    const plan = proyecto.pauta.plan || { inversion: 1000000, conversiones: 25, ticket: proyecto.ticketPromedio };
    const factor = 0.8 + rnd() * 0.35;
    const conversiones = Math.max(1, Math.round(plan.conversiones * factor));
    const ticket = Math.round(proyecto.ticketPromedio / 100) * 100;
    const margen = Math.round(proyecto.margenPromedio * 100);
    return {
      inversionPauta: Math.round(plan.inversion),
      proyectadas: plan.conversiones,
      conversiones,
      ticket,
      ingresos: conversiones * ticket,
      margen,
      operativos: rnd.entero(15, 40) * 10000,
      sinPlan: !proyecto.pauta.plan,
    };
  }

  function Roi({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const d = React.useMemo(() => escenario(proyecto), [proyecto.semilla, proyecto.pauta.plan && proyecto.pauta.plan.fecha]);
    const r = datos.respuestas || {};
    const intentos = datos.intentos || 0;
    const [sens, setSens] = React.useState({ cvr: 0, inversion: 0 });

    const utilidad = (d.ingresos * d.margen) / 100;
    const inversionTotal = d.inversionPauta + d.operativos;
    const roi = ((utilidad - inversionTotal) / inversionTotal) * 100;
    const ejercicios = [
      { id: 'roas', nombre: 'ROAS', formula: 'Ingresos ÷ inversión en pauta', valor: d.ingresos / d.inversionPauta, unidad: 'veces', tol: (v, x) => util.cerca(v, x, 0.01) },
      { id: 'cpa', nombre: 'CPA (costo por adquisición)', formula: 'Inversión en pauta ÷ conversiones', valor: d.inversionPauta / d.conversiones, unidad: 'COP', tol: (v, x) => util.cerca(v, x, 0.01) },
      { id: 'utilidad', nombre: 'Utilidad bruta', formula: 'Ingresos × margen bruto %', valor: utilidad, unidad: 'COP', tol: (v, x) => util.cerca(v, x, 0.01) },
      { id: 'total', nombre: 'Inversión total', formula: 'Inversión en pauta + costos operativos de la campaña', valor: inversionTotal, unidad: 'COP', tol: (v, x) => util.cerca(v, x, 0.005) },
      { id: 'roi', nombre: 'ROI %', formula: '(Utilidad bruta − inversión total) ÷ inversión total × 100', valor: roi, unidad: '%', tol: (v, x) => Math.abs(v - x) <= 0.5 },
      { id: 'equilibrio', nombre: 'ROAS de equilibrio', formula: '1 ÷ margen bruto (en decimal)', valor: 100 / d.margen, unidad: 'veces', tol: (v, x) => util.cerca(v, x, 0.01) },
    ];
    const revisado = datos.revisado;
    const ok = (e) => e.tol(util.num(r[e.id]), e.valor);
    const decisionCorrecta = r.decision === (roi > 0 ? 'si' : 'no');
    const todo = revisado && ejercicios.every(ok) && decisionCorrecta;

    function revisar() {
      setDatos({ revisado: true, intentos: intentos + 1 });
    }

    // Análisis de sensibilidad: cómo cambia el ROI si cambian la tasa de conversión o la inversión.
    const convSens = d.conversiones * (1 + sens.cvr / 100) * (1 + sens.inversion / 100);
    const invSens = d.inversionPauta * (1 + sens.inversion / 100);
    const utilSens = (convSens * d.ticket * d.margen) / 100;
    const roiSens = ((utilSens - (invSens + d.operativos)) / (invSens + d.operativos)) * 100;

    const criterios = [
      { texto: 'Seis indicadores calculados y revisados', ok: !!revisado && ejercicios.every((e) => r[e.id] !== undefined && r[e.id] !== '') },
      { texto: 'Todos los indicadores dentro del margen de tolerancia', ok: !!revisado && ejercicios.every(ok) },
      { texto: 'Decisión de rentabilidad coherente con el ROI', ok: !!revisado && decisionCorrecta },
    ];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>La campaña de pauta terminó. Estos son los resultados reales frente a la proyección de tu plan de medios. Calcula los indicadores de retorno para presentar el informe a la gerencia de ${proyecto.marca.nombre}.</p>
        <p>Escribe los valores con punto o coma decimal. La tolerancia es del 1 % por redondeo.</p>
      <//>

      ${d.sinPlan && html`<${Aviso} tono="alerta" className="mb-4">No hay plan de medios guardado: el simulador usa valores de referencia.<//>`}

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <${Metrica} etiqueta="Inversión en pauta" valor=${fmt.cop(d.inversionPauta)} color="sol" />
        <${Metrica} etiqueta="Costos operativos" valor=${fmt.cop(d.operativos)} detalle="Diseño, herramientas y community" />
        <${Metrica} etiqueta="Conversiones reales" valor=${d.conversiones} detalle=${`Proyectadas: ${d.proyectadas.toFixed(1)}`} color="cielo" />
        <${Metrica} etiqueta="Ticket promedio" valor=${fmt.cop(d.ticket)} />
        <${Metrica} etiqueta="Ingresos" valor=${fmt.cop(d.ingresos)} color="menta" />
        <${Metrica} etiqueta="Margen bruto" valor=${`${d.margen} %`} detalle="Promedio del catálogo" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <${Tarjeta} titulo="Hoja de cálculo de indicadores" color="blanco">
          <div className="grid gap-4 sm:grid-cols-2">
            ${ejercicios.map((e) => {
              const bien = ok(e);
              return html`<div key=${e.id} className=${`border-3 border-tinta p-3 ${revisado ? (bien ? 'bg-menta' : 'bg-coral') : 'bg-papel'}`}>
                <${Campo} etiqueta=${`${e.nombre} (${e.unidad})`}>
                  <${Entrada} inputMode="decimal" value=${r[e.id] ?? ''} onChange=${(ev) => setDatos({ respuestas: { ...r, [e.id]: ev.target.value }, revisado: false })} />
                <//>
                ${(intentos > 0 || bien) && html`<p className="mt-1 text-xs font-bold">Fórmula: ${e.formula}</p>`}
                ${revisado && bien && html`<p className="text-xs font-black">Valor: ${e.unidad === 'COP' ? fmt.cop(e.valor) : fmt.num(e.valor)}</p>`}
              </div>`;
            })}
          </div>
          <div className="mt-4 border-3 border-tinta bg-papel p-3">
            <p className="font-black">¿La campaña fue rentable para el negocio?</p>
            <div className="mt-2 flex gap-2">
              ${[['si', 'Sí, el ROI es positivo'], ['no', 'No, el ROI es negativo']].map(([v, t]) => html`<button key=${v} type="button" onClick=${() => setDatos({ respuestas: { ...r, decision: v }, revisado: false })}
                className=${`border-3 border-tinta px-3 py-2 text-sm font-bold ${r.decision === v ? 'bg-tinta text-white' : 'bg-white shadow-brutal-sm'}`}>${t}</button>`)}
            </div>
          </div>
          <${Boton} className="mt-4" variante="oscuro" onClick=${revisar}>Revisar cálculos<//>
          ${revisado && !todo && html`<${Aviso} tono="error" className="mt-3">Hay indicadores por corregir. Revisa la fórmula de cada casilla en rojo.<//>`}
        <//>

        <${Tarjeta} titulo="Análisis de sensibilidad" color=${todo ? 'lila' : 'papel'} subtitulo=${todo ? 'Modifica las variables y observa el ROI.' : 'Se habilita al resolver los indicadores.'}>
          ${todo
            ? html`<div className="space-y-4">
                <label className="block text-sm font-extrabold">Variación de la tasa de conversión: ${sens.cvr} %
                  <input type="range" min="-50" max="100" step="5" className="w-full accent-black" value=${sens.cvr} onChange=${(e) => setSens({ ...sens, cvr: Number(e.target.value) })} /></label>
                <label className="block text-sm font-extrabold">Variación de la inversión en pauta: ${sens.inversion} %
                  <input type="range" min="-50" max="100" step="5" className="w-full accent-black" value=${sens.inversion} onChange=${(e) => setSens({ ...sens, inversion: Number(e.target.value) })} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <${Metrica} etiqueta="Conversiones" valor=${convSens.toFixed(1)} />
                  <${Metrica} etiqueta="ROI simulado" valor=${fmt.pct(roiSens)} color=${roiSens > 0 ? 'menta' : 'coral'} />
                </div>
                <p className="text-xs font-medium">Supuesto: las conversiones crecen en la misma proporción que la inversión (rendimiento constante).</p>
              </div>`
            : html`<p className="font-medium">Resuelve la hoja de cálculo para explorar escenarios.</p>`}
          ${todo && html`<div className="mt-4"><${Insignia} color=${roi > 0 ? 'menta' : 'coral'}>ROI real: ${fmt.pct(roi)}<//></div>`}
        <//>
      </div>

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: Math.max(60, 100 - (intentos - 1) * 5), resumen: `ROAS ${(d.ingresos / d.inversionPauta).toFixed(2)} · ROI ${fmt.pct(roi)} · ${intentos} revisiones` })} />
    `;
  }

  SC.registrar({
    id: 11,
    orden: 11,
    modulo: 'transversal',
    titulo: 'Matemática del retorno de inversión',
    corto: 'ROI',
    competencia: 'Plantear cálculos matemáticos para definir métricas de retorno de la inversión comercial.',
    evidencia: 'Hoja de indicadores ROAS, CPA, utilidad, ROI y punto de equilibrio con decisión argumentada.',
    Componente: Roi,
  });
})();
