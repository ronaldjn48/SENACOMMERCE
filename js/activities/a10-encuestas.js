/* Actividad 10. Panel de métricas para tabular encuestas de satisfacción (CSAT y NPS). */
(function () {
  const { html, ui, fmt, util } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, Seleccion, Entrega, Aviso, Boton, Metrica, GraficoBarras } = ui;

  const temas = ['Entrega', 'Precio', 'Producto', 'Atención', 'Empaque'];
  const acciones = {
    Entrega: 'Renegociar tiempos con la transportadora y notificar el estado de la guía por WhatsApp',
    Precio: 'Crear un programa de fidelización con cupones para la segunda compra',
    Producto: 'Reforzar el control de calidad antes del alistamiento',
    Atención: 'Capacitar al equipo de servicio y fijar un tiempo máximo de respuesta en el chat',
    Empaque: 'Rediseñar el empaque con protección interna y material reciclable',
  };
  const comentarios = {
    positivo: ['Todo llegó perfecto, volveré a comprar.', 'Muy buena atención por WhatsApp.', 'El producto supera lo que esperaba.', 'Rápido y bien empacado.'],
    neutro: ['Bien, aunque podría mejorar.', 'Cumplió, nada especial.', 'Normal, sin problemas.'],
    negativo: {
      Entrega: 'El pedido llegó tres días tarde.',
      Precio: 'Me pareció caro frente a otras tiendas.',
      Producto: 'El producto no era igual al de la foto.',
      Atención: 'Nadie respondió mis mensajes.',
      Empaque: 'La caja llegó golpeada.',
    },
  };

  function generar(semilla) {
    const rnd = util.crearAleatorio(`${semilla}-encuesta`);
    const temaCritico = rnd.elegir(temas);
    return Array.from({ length: 40 }, (_, i) => {
      const r = rnd();
      const csat = r < 0.08 ? 1 : r < 0.18 ? 2 : r < 0.33 ? 3 : r < 0.63 ? 4 : 5;
      const base = { 1: [0, 3], 2: [2, 5], 3: [5, 7], 4: [7, 9], 5: [8, 10] }[csat];
      const nps = rnd.entero(base[0], base[1]);
      const tema = nps <= 6 ? (rnd() < 0.6 ? temaCritico : rnd.elegir(temas)) : rnd.elegir(temas);
      const comentario = nps <= 6 ? comentarios.negativo[tema] : nps <= 8 ? rnd.elegir(comentarios.neutro) : rnd.elegir(comentarios.positivo);
      return { id: i + 1, csat, nps, canal: rnd.elegir(['Web', 'WhatsApp', 'Correo']), tema, comentario };
    });
  }

  function calcular(resp) {
    const frec = [1, 2, 3, 4, 5].map((v) => resp.filter((r) => r.csat === v).length);
    const total = resp.length;
    const promotores = resp.filter((r) => r.nps >= 9).length;
    const pasivos = resp.filter((r) => r.nps >= 7 && r.nps <= 8).length;
    const detractores = resp.filter((r) => r.nps <= 6).length;
    const conteoTemas = temas.map((t) => ({ t, n: resp.filter((r) => r.nps <= 6 && r.tema === t).length })).sort((a, b) => b.n - a.n);
    return {
      frec,
      total,
      csatPct: ((frec[3] + frec[4]) / total) * 100,
      promedio: resp.reduce((s, r) => s + r.csat, 0) / total,
      promotores,
      pasivos,
      detractores,
      nps: ((promotores - detractores) / total) * 100,
      temaTop: conteoTemas[0].t,
      empateTema: conteoTemas[0].n === conteoTemas[1].n ? conteoTemas.filter((c) => c.n === conteoTemas[0].n).map((c) => c.t) : [conteoTemas[0].t],
    };
  }

  function Encuestas({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const respuestas = React.useMemo(() => generar(proyecto.semilla), [proyecto.semilla]);
    const k = React.useMemo(() => calcular(respuestas), [respuestas]);
    const [filtro, setFiltro] = React.useState({ csat: '', npsTipo: '' });
    const e = datos.entradas || {};
    const revisado = datos.revisado;

    const pruebas = {
      f1: Number(e.f1) === k.frec[0] && e.f1 !== '' && e.f1 !== undefined,
      f2: Number(e.f2) === k.frec[1] && e.f2 !== '' && e.f2 !== undefined,
      f3: Number(e.f3) === k.frec[2] && e.f3 !== '' && e.f3 !== undefined,
      f4: Number(e.f4) === k.frec[3] && e.f4 !== '' && e.f4 !== undefined,
      f5: Number(e.f5) === k.frec[4] && e.f5 !== '' && e.f5 !== undefined,
      csatPct: Math.abs(util.num(e.csatPct) - k.csatPct) <= 0.5,
      promedio: Math.abs(util.num(e.promedio) - k.promedio) <= 0.05,
      promotores: Number(e.promotores) === k.promotores && e.promotores !== '' && e.promotores !== undefined,
      pasivos: Number(e.pasivos) === k.pasivos && e.pasivos !== '' && e.pasivos !== undefined,
      detractores: Number(e.detractores) === k.detractores && e.detractores !== '' && e.detractores !== undefined,
      nps: Math.abs(util.num(e.nps) - k.nps) <= 0.5,
      tema: k.empateTema.includes(e.tema),
      accion: !!e.tema && e.accion === acciones[e.tema] && k.empateTema.includes(e.tema),
    };
    const todo = !!revisado && Object.values(pruebas).every(Boolean);
    const estadoCampo = (id) => (revisado ? (pruebas[id] ? 'bg-menta' : 'bg-coral') : '');

    const filtradas = respuestas.filter((r) => {
      if (filtro.csat && r.csat !== Number(filtro.csat)) return false;
      if (filtro.npsTipo === 'promotor' && r.nps < 9) return false;
      if (filtro.npsTipo === 'pasivo' && (r.nps < 7 || r.nps > 8)) return false;
      if (filtro.npsTipo === 'detractor' && r.nps > 6) return false;
      return true;
    });

    function exportar() {
      const filas = ['id;csat;nps;canal;tema;comentario', ...respuestas.map((r) => [r.id, r.csat, r.nps, r.canal, r.tema, util.csvCampo(r.comentario)].join(';'))];
      util.descargar('encuesta-satisfaccion.csv', '﻿' + filas.join('\n'), 'text/csv;charset=utf-8');
    }

    const criterios = [
      { texto: 'Tabla de frecuencias CSAT correcta', ok: !!revisado && pruebas.f1 && pruebas.f2 && pruebas.f3 && pruebas.f4 && pruebas.f5 },
      { texto: 'CSAT % y promedio correctos', ok: !!revisado && pruebas.csatPct && pruebas.promedio },
      { texto: 'Promotores, pasivos y detractores correctos', ok: !!revisado && pruebas.promotores && pruebas.pasivos && pruebas.detractores },
      { texto: 'NPS calculado correctamente', ok: !!revisado && pruebas.nps },
      { texto: 'Tema crítico identificado y acción de mejora coherente', ok: !!revisado && pruebas.tema && pruebas.accion },
    ];

    const campoNum = (id, etiqueta, ayuda) => html`<${Campo} etiqueta=${etiqueta} ayuda=${ayuda}>
      <${Entrada} className=${estadoCampo(id)} inputMode="decimal" value=${e[id] ?? ''} onChange=${(ev) => setDatos({ entradas: { ...e, [id]: ev.target.value }, revisado: false })} />
    <//>`;

    return html`
      <${Contexto} actividad=${actividad}>
        <p>${proyecto.marca.nombre} envió una encuesta de satisfacción a los clientes con pedidos entregados. Recibiste ${respuestas.length} respuestas con calificación CSAT (1 a 5), probabilidad de recomendación NPS (0 a 10) y un comentario.</p>
        <p>Tabula los resultados, calcula los indicadores y define una acción de mejora con base en lo que dicen los detractores. Usa los filtros o descarga el CSV para trabajar en hoja de cálculo.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-2">
        <${Tarjeta} titulo="Respuestas de la encuesta" acciones=${html`<${Boton} tam="sm" variante="secundario" onClick=${exportar}>Descargar CSV<//>`}>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <${Seleccion} aria-label="Filtrar por CSAT" value=${filtro.csat} vacio="CSAT: todas" opciones=${['1', '2', '3', '4', '5']} onChange=${(ev) => setFiltro({ ...filtro, csat: ev.target.value })} />
            <${Seleccion} aria-label="Filtrar por NPS" value=${filtro.npsTipo} vacio="NPS: todos" opciones=${[{ valor: 'promotor', etiqueta: 'Promotores (9-10)' }, { valor: 'pasivo', etiqueta: 'Pasivos (7-8)' }, { valor: 'detractor', etiqueta: 'Detractores (0-6)' }]} onChange=${(ev) => setFiltro({ ...filtro, npsTipo: ev.target.value })} />
          </div>
          <p className="mb-2 text-sm font-black">Mostrando ${filtradas.length} de ${respuestas.length}</p>
          <div className="max-h-[30rem] overflow-auto">
            <table className="nb-table text-xs">
              <thead><tr><th>#</th><th>CSAT</th><th>NPS</th><th>Canal</th><th>Tema</th><th>Comentario</th></tr></thead>
              <tbody>${filtradas.map((r) => html`<tr key=${r.id}><td>${r.id}</td><td className="font-black">${r.csat}</td><td className="font-black">${r.nps}</td><td>${r.canal}</td><td>${r.tema}</td><td>${r.comentario}</td></tr>`)}</tbody>
            </table>
          </div>
        <//>

        <div className="space-y-6">
          <${Tarjeta} titulo="Tabulación" color="sol">
            <p className="mb-2 text-sm font-extrabold uppercase">Frecuencia por calificación CSAT</p>
            <div className="grid grid-cols-5 gap-2">
              ${[1, 2, 3, 4, 5].map((v) => campoNum(`f${v}`, `${v} ★`))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              ${campoNum('csatPct', 'CSAT %', 'Respuestas 4 y 5 ÷ total × 100')}
              ${campoNum('promedio', 'Promedio CSAT', 'Suma de calificaciones ÷ total')}
              ${campoNum('promotores', 'Promotores', 'NPS 9 y 10')}
              ${campoNum('pasivos', 'Pasivos', 'NPS 7 y 8')}
              ${campoNum('detractores', 'Detractores', 'NPS 0 a 6')}
              ${campoNum('nps', 'NPS', '% promotores − % detractores')}
            </div>
          <//>
          <${Tarjeta} titulo="Análisis y mejora" color="blanco">
            <div className="space-y-3">
              <${Campo} etiqueta="Tema más mencionado por los detractores">
                <${Seleccion} className=${estadoCampo('tema')} value=${e.tema || ''} vacio="Selecciona" opciones=${temas} onChange=${(ev) => setDatos({ entradas: { ...e, tema: ev.target.value }, revisado: false })} />
              <//>
              <${Campo} etiqueta="Acción de mejora prioritaria">
                <${Seleccion} className=${estadoCampo('accion')} value=${e.accion || ''} vacio="Selecciona" opciones=${Object.values(acciones)} onChange=${(ev) => setDatos({ entradas: { ...e, accion: ev.target.value }, revisado: false })} />
              <//>
            </div>
            <${Boton} className="mt-4" variante="oscuro" onClick=${() => setDatos({ revisado: true })}>Revisar tabulación<//>
            ${revisado && !todo && html`<${Aviso} tono="error" className="mt-3">Los campos en rojo tienen errores. Corrige y vuelve a revisar.<//>`}
          <//>
        </div>
      </div>

      ${todo &&
      html`<${Tarjeta} titulo="Tablero de satisfacción" color="menta" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <${Metrica} etiqueta="CSAT" valor=${fmt.pct(k.csatPct)} />
          <${Metrica} etiqueta="Promedio" valor=${k.promedio.toFixed(2)} />
          <${Metrica} etiqueta="NPS" valor=${k.nps.toFixed(1)} color=${k.nps >= 30 ? 'menta' : k.nps >= 0 ? 'sol' : 'coral'} />
          <${Metrica} etiqueta="Tema crítico" valor=${e.tema} />
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <${GraficoBarras} datos=${k.frec.map((n, i) => ({ etiqueta: `${i + 1} ★`, valor: n, color: i >= 3 ? 'menta' : i === 2 ? 'sol' : 'coral' }))} />
          <${GraficoBarras} datos=${[{ etiqueta: 'Promotores', valor: k.promotores, color: 'menta' }, { etiqueta: 'Pasivos', valor: k.pasivos, color: 'sol' }, { etiqueta: 'Detractores', valor: k.detractores, color: 'coral' }]} />
        </div>
      <//>`}

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: 100, resumen: `CSAT ${fmt.pct(k.csatPct)} · NPS ${k.nps.toFixed(1)} · tema crítico: ${e.tema}` })} />
    `;
  }

  SC.registrar({
    id: 10,
    orden: 10,
    modulo: 'posventa',
    titulo: 'Métricas de satisfacción',
    corto: 'Encuestas',
    competencia: 'Tabular resultados de encuestas de satisfacción y proponer acciones de mejora en la posventa.',
    evidencia: 'Tabla de frecuencias, indicadores CSAT y NPS, tema crítico y plan de mejora.',
    Componente: Encuestas,
  });
})();
