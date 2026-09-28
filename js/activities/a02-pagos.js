/* Actividad 2. Parametrización de medios de pago de la tienda virtual. */
(function () {
  const { html, ui, fmt, util, motores } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, Seleccion, Casilla, Entrega, Aviso, Boton, Insignia } = ui;

  const pasarelas = ['Wompi', 'PayU', 'Mercado Pago', 'ePayco', 'Botón de pagos bancario'];
  const MONTO_QUIZ = 150000;

  function Pagos({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const metodos = datos.metodos || {};
    const pruebas = datos.pruebas || [];
    const iva = datos.iva ?? '';
    const [prueba, setPrueba] = React.useState({ metodo: '', monto: 120000 });

    const config = motores.metodosPago.map((m) => ({ ...m, ...(metodos[m.id] || {}), activo: !!(metodos[m.id] && metodos[m.id].activo) }));
    const activos = config.filter((m) => m.activo);
    const setMetodo = (id, patch) => setDatos({ metodos: { ...metodos, [id]: { ...(metodos[id] || {}), ...patch } } });

    function registrarPrueba() {
      const m = activos.find((x) => x.id === prueba.metodo);
      const monto = util.num(prueba.monto);
      if (!m || !(monto > 0)) return;
      const c = motores.costoTransaccion(monto, m);
      setDatos({ pruebas: [{ metodo: m.id, nombre: m.nombre, monto, ...c, fecha: Date.now() }, ...pruebas].slice(0, 12) });
    }

    const netos = activos.map((m) => ({ id: m.id, neto: motores.costoTransaccion(MONTO_QUIZ, m).neto }));
    const mejorNeto = Math.max(...netos.map((n) => n.neto), -Infinity);
    const respuestaCorrecta = datos.quiz && netos.some((n) => n.id === datos.quiz && Math.abs(n.neto - mejorNeto) < 1);
    const comisionesValidas = activos.every((m) => Number(m.pct) >= 0 && Number(m.pct) <= 10 && Number(m.fijo) >= 0);
    const contraentrega = activos.some((m) => m.id === 'contraentrega');

    const criterios = [
      { texto: 'Pasarela de pagos seleccionada', ok: !!datos.pasarela },
      { texto: `Tres o más medios de pago activos (llevas ${activos.length})`, ok: activos.length >= 3 },
      { texto: 'Al menos una billetera digital activa', ok: activos.some((m) => m.tipo === 'billetera') },
      { texto: 'Al menos tarjeta o PSE activo', ok: activos.some((m) => m.tipo === 'tarjeta' || m.tipo === 'transferencia') },
      { texto: 'Comisiones entre 0 % y 10 % y costos fijos no negativos', ok: activos.length > 0 && comisionesValidas },
      { texto: 'Tarifa general de IVA configurada en 19 %', ok: Number(iva) === 19 },
      { texto: 'Monto máximo definido para pago contra entrega (si está activo)', ok: !contraentrega || Number(datos.maxContraentrega) > 0 },
      { texto: 'Dos transacciones de prueba con medios distintos', ok: new Set(pruebas.map((p) => p.metodo)).size >= 2 },
      { texto: 'Análisis de costo por medio de pago respondido correctamente', ok: !!respuestaCorrecta },
    ];

    const montoPrueba = util.num(prueba.monto) || 0;
    const base = datos.ivaIncluido !== false ? montoPrueba / (1 + (Number(iva) || 0) / 100) : montoPrueba;

    return html`
      <${Contexto} actividad=${actividad}>
        <p>${proyecto.marca.nombre} necesita recibir pagos en línea. Selecciona la pasarela, activa los medios de pago que prefieren tus clientes y parametriza las comisiones del contrato.</p>
        <p>Valida la configuración con transacciones de prueba y analiza cuánto dinero llega a la cuenta del negocio en cada medio.</p>
      <//>
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <${Tarjeta} titulo="Medios de pago" subtitulo="Las comisiones de referencia son simuladas. Ajústalas según el contrato de tu pasarela." color="blanco">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <${Campo} etiqueta="Pasarela">
              <${Seleccion} value=${datos.pasarela || ''} vacio="Selecciona" opciones=${pasarelas} onChange=${(e) => setDatos({ pasarela: e.target.value })} />
            <//>
            <${Campo} etiqueta="Moneda"><${Seleccion} value="COP" disabled opciones=${[{ valor: 'COP', etiqueta: 'COP · Peso colombiano' }]} /><//>
            <${Campo} etiqueta="Cuotas máximas con tarjeta">
              <${Entrada} type="number" min="1" max="36" value=${datos.cuotas ?? 12} onChange=${(e) => setDatos({ cuotas: e.target.value })} />
            <//>
          </div>
          <div className="overflow-x-auto">
            <table className="nb-table">
              <thead><tr><th>Activo</th><th>Medio</th><th>Tipo</th><th>Comisión %</th><th>Costo fijo</th></tr></thead>
              <tbody>
                ${config.map(
                  (m) => html`<tr key=${m.id} className=${m.activo ? 'bg-yellow-50' : ''}>
                    <td className="text-center"><input type="checkbox" aria-label=${`Activar ${m.nombre}`} className="h-5 w-5 accent-black" checked=${m.activo} onChange=${(e) => setMetodo(m.id, { activo: e.target.checked })} /></td>
                    <td className="font-bold">${m.nombre}</td>
                    <td><${Insignia} color=${m.tipo === 'billetera' ? 'menta' : m.tipo === 'tarjeta' ? 'cielo' : 'blanco'}>${m.tipo}<//></td>
                    <td><input type="number" step="0.01" className="nb-input w-24 py-1" disabled=${!m.activo} value=${m.pct} onChange=${(e) => setMetodo(m.id, { pct: e.target.value })} /></td>
                    <td><input type="number" step="100" className="nb-input w-28 py-1" disabled=${!m.activo} value=${m.fijo} onChange=${(e) => setMetodo(m.id, { fijo: e.target.value })} /></td>
                  </tr>`
                )}
              </tbody>
            </table>
          </div>
        <//>

        <div className="space-y-6">
          <${Tarjeta} titulo="Impuestos y políticas" color="sol">
            <div className="space-y-3">
              <${Campo} etiqueta="Tarifa general de IVA (%)" ayuda="Consulta la tarifa general vigente del Estatuto Tributario.">
                <${Entrada} type="number" value=${iva} onChange=${(e) => setDatos({ iva: e.target.value })} />
              <//>
              <${Casilla} etiqueta="Los precios del catálogo incluyen IVA" checked=${datos.ivaIncluido !== false} onChange=${(v) => setDatos({ ivaIncluido: v })} />
              ${contraentrega &&
              html`<${Campo} etiqueta="Monto máximo para contra entrega (COP)" ayuda="Controla el riesgo de pedidos rechazados en la puerta.">
                <${Entrada} type="number" value=${datos.maxContraentrega || ''} onChange=${(e) => setDatos({ maxContraentrega: e.target.value })} />
              <//>`}
            </div>
          <//>

          <${Tarjeta} titulo="Transacción de prueba" color="cielo">
            <div className="grid gap-3 sm:grid-cols-2">
              <${Campo} etiqueta="Medio">
                <${Seleccion} value=${prueba.metodo} vacio="Selecciona" opciones=${activos.map((m) => ({ valor: m.id, etiqueta: m.nombre }))} onChange=${(e) => setPrueba({ ...prueba, metodo: e.target.value })} />
              <//>
              <${Campo} etiqueta="Valor de la compra">
                <${Entrada} type="number" value=${prueba.monto} onChange=${(e) => setPrueba({ ...prueba, monto: e.target.value })} />
              <//>
            </div>
            ${montoPrueba > 0 &&
            html`<p className="mt-2 text-xs font-bold">Base gravable ${fmt.cop(base)} · IVA de la venta ${fmt.cop(montoPrueba - base)}</p>`}
            <${Boton} className="mt-3" variante="oscuro" onClick=${registrarPrueba} disabled=${!prueba.metodo}>Procesar pago de prueba<//>
          <//>
        </div>
      </div>

      ${pruebas.length > 0 &&
      html`<${Tarjeta} titulo="Registro de transacciones de prueba" className="mt-6">
        <div className="overflow-x-auto">
          <table className="nb-table">
            <thead><tr><th>Medio</th><th>Valor</th><th>Comisión</th><th>IVA comisión</th><th>Neto recibido</th><th>Estado</th></tr></thead>
            <tbody>
              ${pruebas.map(
                (p, i) => html`<tr key=${i}><td className="font-bold">${p.nombre}</td><td>${fmt.cop(p.monto)}</td><td>${fmt.cop(p.comision)}</td><td>${fmt.cop(p.iva)}</td><td className="font-black">${fmt.cop(p.neto)}</td><td><${Insignia} color="menta">Aprobada<//></td></tr>`
              )}
            </tbody>
          </table>
        </div>
      <//>`}

      <${Tarjeta} titulo="Análisis de costos" color="papel" className="mt-6">
        <p className="font-bold">Para una compra de ${fmt.cop(MONTO_QUIZ)}, ¿cuál de tus medios activos deja el mayor valor neto al negocio?</p>
        <p className="text-sm font-medium">Calcula: comisión = valor × % + costo fijo. Luego suma el IVA de la comisión (19 %) y réstalo del valor.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          ${activos.map(
            (m) => html`<button key=${m.id} type="button" onClick=${() => setDatos({ quiz: m.id })}
              className=${`border-3 border-tinta px-3 py-2 text-sm font-bold ${datos.quiz === m.id ? (respuestaCorrecta ? 'bg-menta' : 'bg-coral') : 'bg-white shadow-brutal-sm'}`}>${m.nombre}</button>`
          )}
        </div>
        ${datos.quiz && !respuestaCorrecta && html`<${Aviso} tono="error" className="mt-3">Revisa el cálculo. Usa las transacciones de prueba con ${fmt.cop(MONTO_QUIZ)} para comparar.<//>`}
        ${respuestaCorrecta && html`<${Aviso} tono="ok" className="mt-3">Correcto. Ese medio deja ${fmt.cop(mejorNeto)} netos.<//>`}
      <//>

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: 100, resumen: `${datos.pasarela} · ${activos.map((m) => m.nombre).join(', ')}` })} />
    `;
  }

  SC.registrar({
    id: 2,
    orden: 2,
    modulo: 'portafolio',
    titulo: 'Parametrización de medios de pago',
    corto: 'Medios de pago',
    competencia: 'Parametrizar opciones de pago de la tienda virtual según costos, riesgos y preferencias del cliente.',
    evidencia: 'Configuración de pasarela, medios activos, pruebas de transacción y análisis de costos.',
    Componente: Pagos,
  });
})();
