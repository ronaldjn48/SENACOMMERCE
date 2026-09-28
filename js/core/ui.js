/*
 * Componentes de interfaz neobrutalista reutilizables.
 */
(function () {
  const { html } = SC;

  const fondos = {
    blanco: 'bg-white',
    sol: 'bg-sol',
    menta: 'bg-menta',
    cielo: 'bg-cielo',
    fucsia: 'bg-fucsia',
    naranja: 'bg-naranja',
    lila: 'bg-lila',
    coral: 'bg-coral',
    papel: 'bg-papel',
    tinta: 'bg-tinta text-white',
  };

  const variantesBoton = {
    primario: 'bg-sol text-tinta',
    secundario: 'bg-white text-tinta',
    exito: 'bg-menta text-tinta',
    peligro: 'bg-coral text-tinta',
    info: 'bg-cielo text-tinta',
    oscuro: 'bg-tinta text-white',
    lila: 'bg-lila text-tinta',
  };

  function Boton({ variante = 'primario', tam = 'md', className = '', children, type = 'button', ...resto }) {
    const tamanos = { sm: 'px-2.5 py-1 text-xs', md: 'text-sm', lg: 'px-6 py-3 text-base' };
    return html`<button type=${type} className=${`nb-btn ${variantesBoton[variante] || variantesBoton.primario} ${tamanos[tam]} ${className}`} ...${resto}>${children}</button>`;
  }

  function Tarjeta({ titulo, subtitulo, color = 'blanco', className = '', acciones, children }) {
    return html`
      <section className=${`nb-card ${fondos[color] || fondos.blanco} ${className}`}>
        ${titulo &&
        html`<header className="flex flex-wrap items-start justify-between gap-2 border-b-3 border-tinta px-4 py-3">
          <div>
            <h3 className="text-lg font-black uppercase leading-tight">${titulo}</h3>
            ${subtitulo && html`<p className="text-sm font-medium opacity-80">${subtitulo}</p>`}
          </div>
          ${acciones && html`<div className="flex flex-wrap gap-2">${acciones}</div>`}
        </header>`}
        <div className="p-4">${children}</div>
      </section>
    `;
  }

  // Asocia la etiqueta con el primer control por id, así el nombre accesible es solo el texto de la etiqueta.
  function Campo({ etiqueta, ayuda, error, children, className = '' }) {
    const id = React.useId();
    const idAyuda = `${id}-ayuda`;
    let asociado = null;
    const hijos = React.Children.map(children, (c) => {
      if (asociado || !React.isValidElement(c) || typeof c.type === 'string') return c;
      asociado = c.props.id || id;
      return React.cloneElement(c, { id: asociado, 'aria-describedby': ayuda || error ? idAyuda : undefined, 'aria-invalid': error ? true : undefined });
    });
    return html`
      <div className=${`block ${className}`}>
        ${etiqueta && html`<label htmlFor=${asociado || undefined} className="mb-1 block text-sm font-extrabold uppercase tracking-wide">${etiqueta}</label>`}
        ${hijos}
        ${ayuda && !error && html`<span id=${idAyuda} className="mt-1 block text-xs font-medium text-gray-700">${ayuda}</span>`}
        ${error && html`<span id=${idAyuda} className="mt-1 block border-2 border-tinta bg-coral px-2 py-0.5 text-xs font-bold">${error}</span>`}
      </div>
    `;
  }

  function Entrada({ className = '', ...resto }) {
    return html`<input className=${`nb-input ${className}`} ...${resto} />`;
  }

  function AreaTexto({ className = '', filas = 4, ...resto }) {
    return html`<textarea rows=${filas} className=${`nb-input ${className}`} ...${resto}></textarea>`;
  }

  function Seleccion({ opciones = [], vacio, className = '', ...resto }) {
    return html`
      <select className=${`nb-input cursor-pointer ${className}`} ...${resto}>
        ${vacio !== undefined && html`<option value="">${vacio}</option>`}
        ${opciones.map((o) => {
          const valor = typeof o === 'object' ? o.valor : o;
          const etiqueta = typeof o === 'object' ? o.etiqueta : o;
          return html`<option key=${valor} value=${valor}>${etiqueta}</option>`;
        })}
      </select>
    `;
  }

  function Casilla({ etiqueta, checked, onChange, disabled, className = '' }) {
    return html`
      <label className=${`flex cursor-pointer items-start gap-2 font-medium ${disabled ? 'opacity-60' : ''} ${className}`}>
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-black" checked=${!!checked} disabled=${disabled}
          onChange=${(e) => onChange && onChange(e.target.checked)} />
        <span>${etiqueta}</span>
      </label>
    `;
  }

  function Insignia({ color = 'sol', children, className = '' }) {
    return html`<span className=${`inline-flex items-center gap-1 border-2 border-tinta px-2 py-0.5 text-xs font-extrabold uppercase ${fondos[color] || fondos.sol} ${className}`}>${children}</span>`;
  }

  function Aviso({ tono = 'info', titulo, children, className = '' }) {
    const tonos = { info: 'bg-cielo', ok: 'bg-menta', alerta: 'bg-sol', error: 'bg-coral', neutro: 'bg-white' };
    return html`
      <div role=${tono === 'error' ? 'alert' : 'status'} className=${`border-3 border-tinta p-3 shadow-brutal-sm ${tonos[tono]} ${className}`}>
        ${titulo && html`<p className="font-black uppercase">${titulo}</p>`}
        <div className="text-sm font-medium">${children}</div>
      </div>
    `;
  }

  function Barra({ valor = 0, color = 'menta', alto = 'h-5', etiqueta }) {
    const v = Math.max(0, Math.min(100, valor));
    return html`
      <div className=${`relative w-full border-3 border-tinta bg-white ${alto}`} role="progressbar" aria-valuenow=${Math.round(v)} aria-valuemin="0" aria-valuemax="100">
        <div className=${`h-full ${fondos[color]}`} style=${{ width: `${v}%` }}></div>
        ${etiqueta && html`<span className="absolute inset-0 flex items-center justify-center text-xs font-black">${etiqueta}</span>`}
      </div>
    `;
  }

  function Metrica({ etiqueta, valor, detalle, color = 'blanco' }) {
    return html`
      <div className=${`border-3 border-tinta p-3 shadow-brutal-sm ${fondos[color]}`}>
        <p className="text-xs font-extrabold uppercase tracking-wide">${etiqueta}</p>
        <p className="text-2xl font-black leading-tight">${valor}</p>
        ${detalle && html`<p className="text-xs font-medium">${detalle}</p>`}
      </div>
    `;
  }

  function Pestanas({ pestanas, activa, onCambio }) {
    return html`
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        ${pestanas.map(
          (p) => html`<button key=${p.id} type="button" role="tab" aria-selected=${activa === p.id}
            className=${`border-3 border-tinta px-3 py-1.5 text-sm font-extrabold uppercase ${activa === p.id ? 'bg-tinta text-white' : 'bg-white shadow-brutal-sm hover:bg-sol'}`}
            onClick=${() => onCambio(p.id)}>${p.etiqueta}${p.contador !== undefined ? html` <span className="ml-1 border-2 border-current px-1">${p.contador}</span>` : null}</button>`
        )}
      </div>
    `;
  }

  function Criterios({ items }) {
    return html`
      <ul className="space-y-1.5">
        ${items.map(
          (c, i) => html`<li key=${i} className="flex items-start gap-2 text-sm font-medium">
            <span className=${`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 border-tinta text-xs font-black ${c.ok ? 'bg-menta' : 'bg-white'}`}>${c.ok ? '✓' : ''}</span>
            <span className=${c.ok ? '' : 'text-gray-800'}>${c.texto}</span>
          </li>`
        )}
      </ul>
    `;
  }

  // Panel de entrega: la actividad avanza solo cuando todos los criterios están cumplidos.
  function Entrega({ criterios, onEntregar, hecho, puntaje }) {
    const cumplidos = criterios.filter((c) => c.ok).length;
    const listo = cumplidos === criterios.length;
    return html`
      <${Tarjeta} titulo="Lista de chequeo de la evidencia" color=${hecho ? 'menta' : 'papel'} className="mt-6">
        <div className="mb-3">
          <${Barra} valor=${(cumplidos / criterios.length) * 100} etiqueta=${`${cumplidos} de ${criterios.length} criterios`} />
        </div>
        <${Criterios} items=${criterios} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          ${hecho
            ? html`<${Insignia} color="menta">Actividad aprobada${puntaje !== undefined ? ` · ${Math.round(puntaje)} pts` : ''}<//>
                <${Boton} variante="oscuro" onClick=${onEntregar} disabled=${!listo}>Actualizar evidencia<//>`
            : html`<${Boton} variante="exito" tam="lg" onClick=${onEntregar} disabled=${!listo}>Entregar y desbloquear siguiente<//>`}
          ${!listo && html`<span className="text-sm font-bold">Completa los criterios pendientes para entregar.</span>`}
        </div>
      <//>
    `;
  }

  function GraficoBarras({ datos, formato = (v) => v, maximo }) {
    const max = maximo || Math.max(1, ...datos.map((d) => d.valor));
    return html`
      <div className="space-y-2">
        ${datos.map(
          (d) => html`<div key=${d.etiqueta} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-sm">
            <span className="truncate font-bold">${d.etiqueta}</span>
            <div className="h-6 border-2 border-tinta bg-white">
              <div className=${`h-full ${fondos[d.color || 'cielo']}`} style=${{ width: `${Math.max(0, (d.valor / max) * 100)}%` }}></div>
            </div>
            <span className="min-w-[4rem] text-right font-black">${formato(d.valor)}</span>
          </div>`
        )}
      </div>
    `;
  }

  function Modal({ abierto, titulo, onCerrar, children }) {
    if (!abierto) return null;
    return html`
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick=${onCerrar}>
        <div className="nb-card max-h-[90vh] w-full max-w-2xl overflow-auto bg-papel" onClick=${(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b-3 border-tinta bg-sol px-4 py-3">
            <h3 className="text-lg font-black uppercase">${titulo}</h3>
            <${Boton} variante="secundario" tam="sm" onClick=${onCerrar} aria-label="Cerrar">✕<//>
          </div>
          <div className="p-4">${children}</div>
        </div>
      </div>
    `;
  }

  // Encabezado estándar de cada actividad con su situación problema.
  function Contexto({ actividad, children }) {
    return html`
      <div className="mb-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="nb-card bg-white p-4">
          <p className="text-xs font-extrabold uppercase tracking-widest">Situación de aprendizaje</p>
          <div className="mt-1 space-y-2 font-medium">${children}</div>
        </div>
        <div className="nb-card bg-lila p-4">
          <p className="text-xs font-extrabold uppercase tracking-widest">Competencia</p>
          <p className="font-bold">${actividad.competencia}</p>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-widest">Evidencia</p>
          <p className="text-sm font-medium">${actividad.evidencia}</p>
        </div>
      </div>
    `;
  }

  SC.ui = { Boton, Tarjeta, Campo, Entrada, AreaTexto, Seleccion, Casilla, Insignia, Aviso, Barra, Metrica, Pestanas, Criterios, Entrega, GraficoBarras, Modal, Contexto };
})();
