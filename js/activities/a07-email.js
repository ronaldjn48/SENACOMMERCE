/* Actividad 7. Herramienta de envíos masivos y segmentación de listas de correo. */
(function () {
  const { html, ui, fmt, util } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, AreaTexto, Seleccion, Casilla, Entrega, Aviso, Boton, Insignia, Metrica } = ui;

  const campos = [
    { id: 'ciudad', nombre: 'Ciudad', tipo: 'texto' },
    { id: 'interes', nombre: 'Categoría de interés', tipo: 'texto' },
    { id: 'compras', nombre: 'Número de compras', tipo: 'numero' },
    { id: 'dias', nombre: 'Días desde la última compra', tipo: 'numero' },
    { id: 'gasto', nombre: 'Gasto acumulado (COP)', tipo: 'numero' },
  ];
  const operadores = { numero: ['>', '>=', '<', '<=', '='], texto: ['=', '≠'] };
  const palabrasSpam = ['gratis!!!', 'gana dinero', 'urgente', '100% gratis', 'haz clic aqui', 'dinero facil', 'oferta unica!!!'];

  function generarContactos(proyecto) {
    const rnd = util.crearAleatorio(`${proyecto.semilla}-contactos`);
    return SC.datos.personas(rnd, 40).map((p, i) => {
      const compras = rnd() < 0.25 ? 0 : rnd.entero(1, 8);
      return {
        id: i + 1,
        nombre: p.nombre,
        apellido: p.apellido,
        email: p.email,
        ciudad: rnd.elegir(SC.datos.ciudades).nombre,
        interes: rnd.elegir(proyecto.nicho.categorias),
        compras,
        dias: compras ? rnd.entero(3, 240) : 0,
        gasto: compras * rnd.entero(40, 160) * 1000,
        consentimiento: rnd() < 0.8,
        estado: rnd() < 0.08 ? 'rebotado' : 'activo',
      };
    });
  }

  function cumple(c, regla) {
    const campo = campos.find((x) => x.id === regla.campo);
    if (!campo) return true;
    const a = c[regla.campo];
    if (campo.tipo === 'numero') {
      const b = Number(regla.valor);
      return { '>': a > b, '>=': a >= b, '<': a < b, '<=': a <= b, '=': a === b }[regla.op];
    }
    return regla.op === '≠' ? a !== regla.valor : a === regla.valor;
  }

  const filtrar = (contactos, reglas) => contactos.filter((c) => reglas.every((r) => cumple(c, r)));

  function combinar(texto, c, extra) {
    return String(texto || '')
      .replace(/\{nombre\}/g, c.nombre)
      .replace(/\{ciudad\}/g, c.ciudad)
      .replace(/\{tienda\}/g, extra.tienda)
      .replace(/\{cupon\}/g, extra.cupon || '[sin cupón]')
      .replace(/\{baja\}/g, '[Cancelar suscripción]');
  }

  function EmailMasivo({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const contactos = React.useMemo(() => generarContactos(proyecto), [proyecto.semilla]);
    const segmentos = datos.segmentos || [];
    const camp = datos.campana || { segmento: '', asunto: '', preheader: '', cuerpo: '', remitente: proyecto.perfil.correo || '', excluir: false };
    const envios = datos.envios || [];
    const [reglas, setReglas] = React.useState([{ campo: 'compras', op: '>=', valor: '2' }]);
    const [nombreSeg, setNombreSeg] = React.useState('');
    const setCamp = (patch) => setDatos({ campana: { ...camp, ...patch } });
    const cupones = proyecto.promos.filter((p) => p.tipo === 'cupon');
    const extra = { tienda: proyecto.marca.nombre, cupon: cupones[0] ? String(cupones[0].codigo).toUpperCase() : '' };

    const previa = filtrar(contactos, reglas);
    const segmento = segmentos.find((s) => s.id === camp.segmento);
    const audiencia = segmento ? filtrar(contactos, segmento.reglas) : [];
    const destinatarios = audiencia.filter((c) => c.estado === 'activo' && (!camp.excluir || c.consentimiento));
    const sinPermiso = audiencia.filter((c) => !c.consentimiento).length;

    const asunto = String(camp.asunto || '');
    const textoNorm = util.normalizar(`${asunto} ${camp.cuerpo}`);
    const gritos = asunto.split(/\s+/).filter((w) => w.length > 4 && w === w.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(w));
    const spam = palabrasSpam.filter((p) => textoNorm.includes(p));
    const chequeo = [
      { texto: 'Asunto de 20 a 60 caracteres', ok: asunto.length >= 20 && asunto.length <= 60 },
      { texto: 'Asunto sin palabras en mayúscula sostenida', ok: asunto.length > 0 && gritos.length === 0 },
      { texto: 'Sin expresiones asociadas a spam', ok: spam.length === 0 && !/!{2,}/.test(asunto) },
      { texto: 'Preheader de 30 a 90 caracteres', ok: String(camp.preheader || '').length >= 30 && String(camp.preheader || '').length <= 90 },
      { texto: 'Personalización con {nombre}', ok: /\{nombre\}/.test(camp.cuerpo || '') },
      { texto: 'Enlace de cancelación con {baja}', ok: /\{baja\}/.test(camp.cuerpo || '') },
      { texto: 'Remitente con correo corporativo válido', ok: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(camp.remitente || '') },
      { texto: 'Exclusión de contactos sin autorización (Ley 1581 de 2012)', ok: !!camp.excluir },
    ];
    const listoEnviar = chequeo.every((c) => c.ok) && destinatarios.length >= 5;

    function guardarSegmento() {
      if (nombreSeg.trim().length < 3 || !reglas.length) return;
      setDatos({ segmentos: [...segmentos, { id: util.uid('seg'), nombre: nombreSeg.trim(), reglas, total: previa.length }] });
      setNombreSeg('');
    }

    function enviar() {
      const rnd = util.crearAleatorio(`${proyecto.semilla}-envio-${envios.length}`);
      const bonus = (/\{nombre\}/.test(asunto) ? 4 : 0) + (camp.preheader ? 2 : 0) + (/\{cupon\}/.test(camp.cuerpo) && extra.cupon ? 1.5 : 0);
      const apertura = Math.min(60, 20 + bonus + rnd() * 8);
      const clic = Math.min(apertura, 2 + (extra.cupon && /\{cupon\}/.test(camp.cuerpo) ? 1.5 : 0) + rnd() * 2);
      setDatos({
        envios: [{ fecha: Date.now(), segmento: segmento.nombre, enviados: destinatarios.length, excluidos: audiencia.length - destinatarios.length, apertura, clic, bajas: rnd() * 1, asunto }, ...envios],
      });
    }

    const criterios = [
      { texto: `Dos segmentos o más guardados con reglas (llevas ${segmentos.length})`, ok: segmentos.length >= 2 },
      { texto: 'Los segmentos guardados usan reglas distintas', ok: new Set(segmentos.map((s) => JSON.stringify(s.reglas))).size >= 2 },
      { texto: 'Campaña enviada a 5 destinatarios o más', ok: envios.some((e) => e.enviados >= 5) },
      { texto: 'Campaña con cumplimiento de protección de datos y enlace de baja', ok: envios.length > 0 && chequeo[5].ok && chequeo[7].ok },
      { texto: 'Mensaje con cupón de la actividad de promociones ({cupon})', ok: !!extra.cupon && /\{cupon\}/.test(camp.cuerpo || '') },
    ];

    const muestra = destinatarios[0] || contactos[0];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>${proyecto.marca.nombre} tiene una base de ${contactos.length} contactos. Segmenta la lista según comportamiento de compra y envía una campaña personalizada que incluya el cupón creado en el motor de promociones.</p>
        <p>La Ley 1581 de 2012 exige autorización previa del titular para el tratamiento de datos personales. Solo envía a contactos con consentimiento y ofrece siempre la opción de cancelar la suscripción.</p>
      <//>

      <div className="grid gap-6 xl:grid-cols-2">
        <${Tarjeta} titulo="Constructor de segmentos" color="blanco">
          <div className="space-y-2">
            ${reglas.map((r, i) => {
              const campo = campos.find((c) => c.id === r.campo);
              return html`<div key=${i} className="grid grid-cols-[1fr_5rem_1fr_auto] gap-2">
                <${Seleccion} value=${r.campo} opciones=${campos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
                  onChange=${(e) => { const tipo = campos.find((c) => c.id === e.target.value).tipo; setReglas(reglas.map((x, j) => (j === i ? { campo: e.target.value, op: operadores[tipo][0], valor: '' } : x))); }} />
                <${Seleccion} value=${r.op} opciones=${operadores[campo.tipo]} onChange=${(e) => setReglas(reglas.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))} />
                ${campo.id === 'ciudad'
                  ? html`<${Seleccion} value=${r.valor} vacio="Ciudad" opciones=${SC.datos.ciudades.map((c) => c.nombre)} onChange=${(e) => setReglas(reglas.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />`
                  : campo.id === 'interes'
                  ? html`<${Seleccion} value=${r.valor} vacio="Categoría" opciones=${proyecto.nicho.categorias} onChange=${(e) => setReglas(reglas.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />`
                  : html`<${Entrada} type="number" value=${r.valor} onChange=${(e) => setReglas(reglas.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />`}
                <${Boton} tam="sm" variante="peligro" onClick=${() => setReglas(reglas.filter((_, j) => j !== i))} aria-label="Quitar regla">✕<//>
              </div>`;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <${Boton} tam="sm" variante="secundario" onClick=${() => setReglas([...reglas, { campo: 'dias', op: '<=', valor: '90' }])}>Agregar condición<//>
            <${Insignia} color="cielo">${previa.length} contactos cumplen<//>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <${Campo} etiqueta="Nombre del segmento" className="flex-1"><${Entrada} value=${nombreSeg} onChange=${(e) => setNombreSeg(e.target.value)} placeholder="Ej. Clientes frecuentes" /><//>
            <${Boton} variante="oscuro" onClick=${guardarSegmento} disabled=${nombreSeg.trim().length < 3 || !reglas.length}>Guardar segmento<//>
          </div>
          <div className="mt-4 max-h-60 overflow-auto">
            <table className="nb-table text-xs">
              <thead><tr><th>Contacto</th><th>Ciudad</th><th>Interés</th><th>Compras</th><th>Días</th><th>Autoriza</th></tr></thead>
              <tbody>${previa.map((c) => html`<tr key=${c.id} className=${c.estado === 'rebotado' ? 'bg-gray-200' : ''}>
                <td>${c.nombre} ${c.apellido}</td><td>${c.ciudad}</td><td>${c.interes}</td><td>${c.compras}</td><td>${c.dias}</td>
                <td>${c.consentimiento ? 'Sí' : html`<span className="font-black text-red-700">No</span>`}${c.estado === 'rebotado' ? ' · rebotado' : ''}</td>
              </tr>`)}</tbody>
            </table>
          </div>
        <//>

        <${Tarjeta} titulo="Segmentos guardados" color="cielo">
          ${segmentos.length === 0 && html`<p className="font-bold">Aún no hay segmentos.</p>`}
          <div className="space-y-2">
            ${segmentos.map((s) => html`<div key=${s.id} className="border-3 border-tinta bg-white p-3">
              <div className="flex items-center justify-between gap-2"><p className="font-black">${s.nombre}</p><${Insignia}>${filtrar(contactos, s.reglas).length} contactos<//></div>
              <p className="text-xs font-medium">${s.reglas.map((r) => `${campos.find((c) => c.id === r.campo).nombre} ${r.op} ${r.valor}`).join(' Y ')}</p>
              <${Boton} tam="sm" variante="peligro" className="mt-2" onClick=${() => setDatos({ segmentos: segmentos.filter((x) => x.id !== s.id) })}>Eliminar<//>
            </div>`)}
          </div>
        <//>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <${Tarjeta} titulo="Campaña de correo" color="blanco">
          <div className="space-y-3">
            <${Campo} etiqueta="Segmento destino"><${Seleccion} value=${camp.segmento} vacio="Selecciona" opciones=${segmentos.map((s) => ({ valor: s.id, etiqueta: s.nombre }))} onChange=${(e) => setCamp({ segmento: e.target.value })} /><//>
            <${Campo} etiqueta="Remitente"><${Entrada} value=${camp.remitente} onChange=${(e) => setCamp({ remitente: e.target.value })} /><//>
            <${Campo} etiqueta=${`Asunto (${asunto.length}/60)`}><${Entrada} value=${asunto} onChange=${(e) => setCamp({ asunto: e.target.value })} /><//>
            <${Campo} etiqueta="Preheader"><${Entrada} value=${camp.preheader} onChange=${(e) => setCamp({ preheader: e.target.value })} /><//>
            <${Campo} etiqueta="Cuerpo del mensaje" ayuda="Etiquetas disponibles: {nombre} {ciudad} {tienda} {cupon} {baja}">
              <${AreaTexto} filas=${7} value=${camp.cuerpo} onChange=${(e) => setCamp({ cuerpo: e.target.value })} />
            <//>
            <${Casilla} etiqueta=${`Excluir contactos sin autorización de tratamiento de datos (${sinPermiso} en el segmento)`} checked=${camp.excluir} onChange=${(v) => setCamp({ excluir: v })} />
          </div>
          <div className="mt-4"><${ui.Criterios} items=${chequeo} /></div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <${Boton} variante="exito" onClick=${enviar} disabled=${!listoEnviar || !segmento}>Enviar a ${destinatarios.length} contactos<//>
            ${segmento && destinatarios.length < 5 && html`<span className="text-sm font-bold">El segmento necesita 5 destinatarios válidos o más.</span>`}
          </div>
        <//>

        <div className="space-y-6">
          <${Tarjeta} titulo="Vista previa" color="papel" subtitulo=${muestra ? `Para: ${muestra.email}` : ''}>
            <div className="border-3 border-tinta bg-white">
              <div className="border-b-3 border-tinta bg-sol p-3">
                <p className="text-sm font-black">${muestra ? combinar(asunto, muestra, extra) || 'Asunto' : 'Asunto'}</p>
                <p className="text-xs font-medium">${muestra ? combinar(camp.preheader, muestra, extra) : ''}</p>
              </div>
              <div className="whitespace-pre-wrap p-4 text-sm font-medium">${muestra ? combinar(camp.cuerpo, muestra, extra) || 'Cuerpo del mensaje.' : ''}</div>
            </div>
            ${!extra.cupon && html`<${Aviso} tono="alerta" className="mt-3">No tienes cupones en el motor de promociones. Crea uno para usar {cupon}.<//>`}
          <//>
          ${envios.length > 0 &&
          html`<${Tarjeta} titulo="Resultados de envío" color="menta">
            ${envios.slice(0, 3).map((e, i) => html`<div key=${i} className="mb-3">
              <p className="text-sm font-black">${e.segmento} · ${fmt.fecha(e.fecha)}</p>
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <${Metrica} etiqueta="Enviados" valor=${e.enviados} detalle=${`${e.excluidos} excluidos`} />
                <${Metrica} etiqueta="Apertura" valor=${fmt.pct(e.apertura)} />
                <${Metrica} etiqueta="Clics" valor=${fmt.pct(e.clic)} />
                <${Metrica} etiqueta="Bajas" valor=${fmt.pct(e.bajas)} />
              </div>
            </div>`)}
          <//>`}
        </div>
      </div>

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: 100, resumen: `${segmentos.length} segmentos · ${envios[0] ? `${envios[0].enviados} envíos, apertura ${fmt.pct(envios[0].apertura)}` : ''}` })} />
    `;
  }

  SC.registrar({
    id: 7,
    orden: 7,
    modulo: 'ventas',
    titulo: 'Envíos masivos y segmentación',
    corto: 'Email marketing',
    competencia: 'Segmentar listas de contactos y ejecutar campañas de correo masivo conforme a la normativa de protección de datos.',
    evidencia: 'Segmentos de clientes, campaña personalizada enviada y reporte de apertura.',
    Componente: EmailMasivo,
  });
})();
