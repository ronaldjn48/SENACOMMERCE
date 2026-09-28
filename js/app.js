/*
 * Aplicación principal: estado global, flujo secuencial de actividades,
 * desbloqueo progresivo y portafolio de evidencias.
 */
(function () {
  const { html, ui, fmt, util, almacen, motores } = SC;
  const { Boton, Barra, Insignia, Tarjeta, Aviso, Modal } = ui;
  const { useState, useEffect, useMemo, useCallback } = React;

  const estadoInicial = () => ({ version: 1, perfil: {}, datos: {}, completadas: {}, actual: 0, creado: Date.now() });
  const modoInstructor = new URLSearchParams(location.search).get('instructor') === '1';

  const fondoModulo = { papel: 'bg-papel', sol: 'bg-sol', fucsia: 'bg-fucsia', cielo: 'bg-cielo', lila: 'bg-lila', menta: 'bg-menta' };
  const numero = (a) => String(a.id).padStart(2, '0');
  const moduloDe = (a) => SC.datos.modulos.find((m) => m.id === a.modulo);

  // Una actividad se desbloquea cuando la anterior del flujo está aprobada.
  function desbloqueada(indice, estado) {
    if (modoInstructor || indice === 0) return true;
    const previa = SC.actividades[indice - 1];
    return !!estado.completadas[previa.id];
  }

  function Encabezado({ estado, progreso, onMenu, onResumen, vista }) {
    return html`
      <header className="no-print relative z-40 border-b-3 border-tinta bg-sol lg:sticky lg:top-0">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
          <button type="button" className="nb-btn bg-white px-3 py-1.5 lg:hidden" onClick=${onMenu} aria-label="Abrir menú de actividades">☰</button>
          <div className="flex items-center gap-2">
            <span className="border-3 border-tinta bg-tinta px-2 py-1 text-lg font-black text-sol">SC</span>
            <div>
              <p className="text-lg font-black uppercase leading-none">SenaCommerce</p>
              <p className="text-xs font-bold">Técnico en Operaciones de Comercio Electrónico</p>
            </div>
          </div>
          <div className="ml-auto flex min-w-[14rem] flex-1 items-center gap-3 sm:max-w-md">
            <${Barra} valor=${progreso} etiqueta=${`${Math.round(progreso)} % del programa`} />
          </div>
          <${Boton} variante=${vista === 'resumen' ? 'oscuro' : 'secundario'} tam="sm" onClick=${onResumen}>Portafolio de evidencias<//>
          ${estado.perfil.nombre && html`<span className="hidden text-sm font-extrabold xl:inline">${estado.perfil.nombre}</span>`}
        </div>
        ${modoInstructor && html`<p className="border-t-3 border-tinta bg-tinta px-4 py-1 text-center text-xs font-black uppercase text-white">Modo instructor: todas las actividades desbloqueadas</p>`}
      </header>
    `;
  }

  function MenuLateral({ estado, onIr, abierto, onCerrar }) {
    return html`
      <nav aria-label="Ruta de aprendizaje" className=${`no-print fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto border-r-3 border-tinta bg-papel p-4 transition-transform lg:sticky lg:top-[4.5rem] lg:z-0 lg:h-[calc(100vh-4.5rem)] lg:translate-x-0 ${abierto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <p className="font-black uppercase">Ruta de aprendizaje</p>
          <${Boton} tam="sm" variante="secundario" onClick=${onCerrar}>✕<//>
        </div>
        ${SC.datos.modulos.map((m) => {
          const acts = SC.actividades.filter((a) => a.modulo === m.id);
          if (!acts.length) return null;
          return html`<div key=${m.id} className="mb-4">
            <p className=${`mb-2 border-3 border-tinta px-2 py-1 text-xs font-black uppercase tracking-wider ${fondoModulo[m.color]}`}>${m.nombre}</p>
            <ul className="space-y-1.5">
              ${acts.map((a) => {
                const i = SC.actividades.indexOf(a);
                const libre = desbloqueada(i, estado);
                const hecha = !!estado.completadas[a.id];
                const actual = estado.actual === i;
                return html`<li key=${a.id}>
                  <button type="button" disabled=${!libre} onClick=${() => onIr(i)}
                    className=${`flex w-full items-center gap-2 border-3 border-tinta px-2 py-1.5 text-left text-sm font-bold ${actual ? 'bg-tinta text-white' : hecha ? 'bg-menta' : libre ? 'bg-white hover:bg-yellow-100' : 'cursor-not-allowed bg-gray-200 text-gray-600'}`}>
                    <span className=${`flex h-7 w-8 shrink-0 items-center justify-center border-2 text-xs font-black ${actual ? 'border-white' : 'border-tinta'}`}>${hecha ? '✓' : libre ? numero(a) : '🔒'}</span>
                    <span className="leading-tight">${a.titulo}</span>
                  </button>
                </li>`;
              })}
            </ul>
          </div>`;
        })}
      </nav>
      ${abierto && html`<div className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden" onClick=${onCerrar}></div>`}
    `;
  }

  function VistaActividad({ estado, indice, setEstado, onIr, notificar }) {
    const actividad = SC.actividades[indice];
    const modulo = moduloDe(actividad);
    const hecho = !!estado.completadas[actividad.id];
    const proyecto = useMemo(() => motores.proyecto(estado), [estado]);
    const siguiente = SC.actividades[indice + 1];

    const setDatos = useCallback(
      (patch) => setEstado((e) => ({ ...e, datos: { ...e.datos, [actividad.id]: { ...(e.datos[actividad.id] || {}), ...patch } } })),
      [actividad.id]
    );
    const setPerfil = useCallback((patch) => setEstado((e) => ({ ...e, perfil: { ...e.perfil, ...patch } })), []);
    const completar = useCallback(
      ({ puntaje, resumen }) => {
        setEstado((e) => ({ ...e, completadas: { ...e.completadas, [actividad.id]: { fecha: Date.now(), puntaje, resumen } } }));
        notificar(siguiente ? `Actividad aprobada. Se desbloqueó: ${siguiente.titulo}` : 'Completaste el programa. Revisa tu portafolio de evidencias.');
      },
      [actividad.id, siguiente]
    );

    const actividadesPrevias = SC.actividades.slice(0, indice).map((a) => ({ titulo: a.titulo, hecho: !!estado.completadas[a.id] }));
    const Componente = actividad.Componente;

    return html`
      <article>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <${Insignia} color=${modulo.color}>${modulo.nombre}<//>
              <${Insignia} color="blanco">Actividad ${numero(actividad)} · paso ${indice + 1} de ${SC.actividades.length}<//>
              ${hecho && html`<${Insignia} color="menta">Aprobada<//>`}
            </div>
            <h1 className="text-3xl font-black uppercase leading-none sm:text-4xl">${actividad.titulo}</h1>
          </div>
        </div>
        <${Componente} key=${actividad.id} actividad=${actividad} estado=${estado} proyecto=${proyecto} datos=${estado.datos[actividad.id] || {}}
          setDatos=${setDatos} setPerfil=${setPerfil} completar=${completar} hecho=${hecho} actividadesPrevias=${actividadesPrevias} />
        <div className="no-print mt-8 flex flex-wrap justify-between gap-3 border-t-3 border-tinta pt-4">
          <${Boton} variante="secundario" disabled=${indice === 0} onClick=${() => onIr(indice - 1)}>← Anterior<//>
          ${siguiente &&
          html`<${Boton} variante=${hecho || modoInstructor ? 'primario' : 'secundario'} disabled=${!hecho && !modoInstructor} onClick=${() => onIr(indice + 1)}>
            ${hecho || modoInstructor ? `Siguiente: ${siguiente.corto} →` : `🔒 Aprueba esta actividad para continuar`}
          <//>`}
        </div>
      </article>
    `;
  }

  function Portafolio({ estado, onIr, onImportar, onReiniciar }) {
    const proyecto = motores.proyecto(estado);
    const hechas = SC.actividades.filter((a) => estado.completadas[a.id]);
    const conPuntaje = hechas.map((a) => estado.completadas[a.id].puntaje).filter((p) => typeof p === 'number');
    const promedio = conPuntaje.length ? conPuntaje.reduce((s, p) => s + p, 0) / conPuntaje.length : 0;
    const completo = hechas.length === SC.actividades.length;

    function exportar() {
      const nombre = `senacommerce-${util.normalizar(estado.perfil.nombre || 'aprendiz').replace(/\s+/g, '-')}.json`;
      util.descargar(nombre, JSON.stringify({ ...estado, exportado: Date.now() }, null, 2), 'application/json');
    }

    function importar(ev) {
      const archivo = ev.target.files && ev.target.files[0];
      if (!archivo) return;
      const lector = new FileReader();
      lector.onload = () => {
        try {
          const obj = JSON.parse(lector.result);
          if (!obj || typeof obj !== 'object' || !obj.perfil || !obj.datos || !obj.completadas) throw new Error('estructura');
          onImportar(obj);
        } catch (e) {
          alert('El archivo no corresponde a un progreso de SenaCommerce.');
        }
      };
      lector.readAsText(archivo);
      ev.target.value = '';
    }

    const flujo = [
      ['IA generativa', 'Marca, eslogan y colores'],
      ['Catálogo', 'Productos con la marca'],
      ['Inventario', 'Stock y pedidos del catálogo'],
      ['Promociones', 'Descuentos sobre el catálogo'],
      ['Pauta', 'Ticket promedio del catálogo'],
      ['Email', 'Cupón de promociones'],
      ['Chat', 'Precios, cupón y pagos'],
      ['Tickets', 'Pedidos y guías despachadas'],
      ['ROI', 'Inversión y conversiones de la pauta'],
      ['Correo corporativo', 'Reclamo de la bandeja de tickets'],
      ['Publicación', 'Todo el proyecto integrado'],
    ];

    return html`
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <${Insignia} color="menta">Portafolio de evidencias<//>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-4xl">${estado.perfil.nombre || 'Aprendiz sin registrar'}</h1>
            <p className="font-bold">Documento ${estado.perfil.documento || '·'} · Ficha ${estado.perfil.ficha || '·'} ${estado.perfil.centro ? `· ${estado.perfil.centro}` : ''}</p>
            <p className="font-bold">Emprendimiento: ${proyecto.marca.nombre} · ${proyecto.nicho.nombre}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <${Boton} variante="secundario" onClick=${() => window.print()}>Imprimir o guardar PDF<//>
            <${Boton} variante="info" onClick=${exportar}>Exportar progreso (JSON)<//>
            <label className="nb-btn cursor-pointer bg-white text-sm">Importar progreso<input type="file" accept="application/json" className="hidden" onChange=${importar} /></label>
          </div>
        </div>

        ${completo && html`<${Aviso} tono="ok" titulo="Programa completado">Aprobaste las ${SC.actividades.length} actividades. Tu tienda está publicada en ${(estado.datos[15] && estado.datos[15].publicada && estado.datos[15].publicada.url) || 'tu dominio'}.<//>`}

        <div className="grid gap-3 sm:grid-cols-3">
          <${ui.Metrica} etiqueta="Actividades aprobadas" valor=${`${hechas.length} / ${SC.actividades.length}`} color="sol" />
          <${ui.Metrica} etiqueta="Puntaje promedio" valor=${promedio ? promedio.toFixed(1) : '·'} color="cielo" />
          <${ui.Metrica} etiqueta="Estado" valor=${completo ? 'Certificable' : 'En curso'} color=${completo ? 'menta' : 'blanco'} />
        </div>

        <${Tarjeta} titulo="Registro de evidencias">
          <div className="overflow-x-auto"><table className="nb-table">
            <thead><tr><th>N.º</th><th>Módulo</th><th>Actividad</th><th>Evidencia</th><th>Resultado</th><th>Puntaje</th><th>Fecha</th></tr></thead>
            <tbody>${SC.actividades.map((a, i) => {
              const c = estado.completadas[a.id];
              return html`<tr key=${a.id}>
                <td className="font-black">${numero(a)}</td><td>${moduloDe(a).nombre}</td>
                <td><button type="button" className="text-left font-bold underline decoration-2 disabled:no-underline" disabled=${!desbloqueada(i, estado)} onClick=${() => onIr(i)}>${a.titulo}</button></td>
                <td className="text-xs">${a.evidencia}</td>
                <td className="text-xs">${c ? c.resumen : html`<${Insignia} color="blanco">Pendiente<//>`}</td>
                <td className="font-black">${c && typeof c.puntaje === 'number' ? Math.round(c.puntaje) : ''}</td>
                <td className="whitespace-nowrap text-xs">${c ? fmt.fecha(c.fecha) : ''}</td>
              </tr>`;
            })}</tbody>
          </table></div>
        <//>

        <${Tarjeta} titulo="Flujo de trabajo integrado" subtitulo="Cada fase alimenta a la siguiente con los datos reales del aprendiz." color="papel">
          <ol className="flex flex-wrap items-stretch gap-2">
            ${flujo.map(([t, d], i) => html`<li key=${t} className="flex items-center gap-2">
              <div className="border-3 border-tinta bg-white px-3 py-2 shadow-brutal-sm"><p className="text-sm font-black">${t}</p><p className="text-xs font-medium">${d}</p></div>
              ${i < flujo.length - 1 && html`<span className="text-xl font-black" aria-hidden="true">→</span>`}
            </li>`)}
          </ol>
        <//>

        <div className="no-print">
          <${Boton} variante="peligro" onClick=${onReiniciar}>Reiniciar simulador<//>
        </div>
      </div>
    `;
  }

  function App() {
    const [estado, setEstado] = useState(() => {
      const guardado = almacen.leer();
      return guardado && guardado.version === 1 ? { ...estadoInicial(), ...guardado } : estadoInicial();
    });
    const [vista, setVista] = useState('actividad');
    const [menu, setMenu] = useState(false);
    const [aviso, setAviso] = useState(null);
    const [confirmar, setConfirmar] = useState(false);

    useEffect(() => { almacen.guardar(estado); }, [estado]);
    useEffect(() => {
      if (!aviso) return undefined;
      const t = setTimeout(() => setAviso(null), 5000);
      return () => clearTimeout(t);
    }, [aviso]);

    const indice = Math.min(Math.max(0, estado.actual || 0), SC.actividades.length - 1);
    const indiceSeguro = desbloqueada(indice, estado) ? indice : 0;
    const progreso = (SC.actividades.filter((a) => estado.completadas[a.id]).length / SC.actividades.length) * 100;

    function ir(i) {
      if (!desbloqueada(i, estado)) return;
      setEstado((e) => ({ ...e, actual: i }));
      setVista('actividad');
      setMenu(false);
      window.scrollTo({ top: 0 });
    }

    return html`
      <${Encabezado} estado=${estado} progreso=${progreso} vista=${vista} onMenu=${() => setMenu(true)} onResumen=${() => { setVista(vista === 'resumen' ? 'actividad' : 'resumen'); window.scrollTo({ top: 0 }); }} />
      <div className="mx-auto flex max-w-[1500px]">
        <${MenuLateral} estado=${estado} onIr=${ir} abierto=${menu} onCerrar=${() => setMenu(false)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          ${vista === 'resumen'
            ? html`<${Portafolio} estado=${estado} onIr=${ir} onImportar=${(obj) => { setEstado({ ...estadoInicial(), ...obj }); setAviso('Progreso importado.'); }} onReiniciar=${() => setConfirmar(true)} />`
            : html`<${VistaActividad} key=${indiceSeguro} estado=${estado} indice=${indiceSeguro} setEstado=${setEstado} onIr=${ir} notificar=${setAviso} />`}
        </main>
      </div>
      ${aviso && html`<div role="status" className="no-print fixed bottom-4 right-4 z-50 max-w-sm border-3 border-tinta bg-menta p-4 font-black shadow-brutal-lg">${aviso}</div>`}
      <${Modal} abierto=${confirmar} titulo="Reiniciar simulador" onCerrar=${() => setConfirmar(false)}>
        <p className="font-bold">Se borran el perfil, los datos y las actividades aprobadas de este navegador. Exporta tu progreso antes si lo necesitas.</p>
        <div className="mt-4 flex gap-2">
          <${Boton} variante="peligro" onClick=${() => { almacen.borrar(); setEstado(estadoInicial()); setVista('actividad'); setConfirmar(false); }}>Borrar todo<//>
          <${Boton} variante="secundario" onClick=${() => setConfirmar(false)}>Cancelar<//>
        </div>
      <//>
    `;
  }

  ReactDOM.createRoot(document.getElementById('app')).render(html`<${App} />`);
})();
