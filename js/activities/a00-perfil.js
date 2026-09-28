/* Actividad 0. Configuración inicial del aprendiz y del emprendimiento. */
(function () {
  const { html, ui } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, Seleccion, Entrega, Aviso } = ui;

  function Perfil({ actividad, estado, setPerfil, completar, hecho }) {
    const p = estado.perfil || {};
    const cambiar = (campo) => (e) => setPerfil({ [campo]: e.target.value });

    const criterios = [
      { texto: 'Nombre completo del aprendiz (mínimo dos palabras)', ok: String(p.nombre || '').trim().split(/\s+/).length >= 2 },
      { texto: 'Documento de identidad de 6 a 11 dígitos', ok: /^\d{6,11}$/.test(p.documento || '') },
      { texto: 'Número de ficha de formación (solo dígitos)', ok: /^\d{5,10}$/.test(p.ficha || '') },
      { texto: 'Nicho de mercado del emprendimiento', ok: !!p.nicho },
      { texto: 'Ciudad de origen de los despachos', ok: !!p.ciudad },
      { texto: 'Correo comercial con formato válido', ok: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(p.correo || '') },
      { texto: 'WhatsApp comercial colombiano de 10 dígitos que inicia en 3', ok: /^3\d{9}$/.test(p.whatsapp || '') },
    ];

    return html`
      <${Contexto} actividad=${actividad}>
        <p>Vas a crear y operar una tienda virtual durante todo el programa. Cada actividad usa los resultados de la anterior: la marca que generes con IA aparece en el catálogo, el catálogo alimenta el inventario, las promociones llegan al chat de ventas y al final publicas la tienda completa.</p>
        <p>Registra tus datos y define el nicho de tu emprendimiento. El simulador usa tu documento para generar clientes, pedidos y encuestas únicas para ti.</p>
      <//>
      <div className="grid gap-6 lg:grid-cols-2">
        <${Tarjeta} titulo="Datos del aprendiz" color="blanco">
          <div className="space-y-3">
            <${Campo} etiqueta="Nombre completo"><${Entrada} value=${p.nombre || ''} onChange=${cambiar('nombre')} placeholder="Ej. Laura Gómez Díaz" /><//>
            <${Campo} etiqueta="Documento de identidad" ayuda=${hecho ? 'El documento queda bloqueado porque define tus datos de práctica.' : 'Solo números, sin puntos.'}>
              <${Entrada} value=${p.documento || ''} disabled=${hecho} inputMode="numeric" onChange=${(e) => setPerfil({ documento: e.target.value.replace(/\D/g, '') })} />
            <//>
            <${Campo} etiqueta="Número de ficha"><${Entrada} value=${p.ficha || ''} inputMode="numeric" onChange=${(e) => setPerfil({ ficha: e.target.value.replace(/\D/g, '') })} /><//>
            <${Campo} etiqueta="Centro de formación (opcional)"><${Entrada} value=${p.centro || ''} onChange=${cambiar('centro')} /><//>
          </div>
        <//>
        <${Tarjeta} titulo="Datos del emprendimiento" color="sol">
          <div className="space-y-3">
            <${Campo} etiqueta="Nicho de mercado" ayuda="Define categorías, intereses de audiencia y productos sugeridos.">
              <${Seleccion} value=${p.nicho || ''} disabled=${hecho} vacio="Selecciona un nicho" onChange=${cambiar('nicho')}
                opciones=${Object.entries(SC.datos.nichos).map(([valor, n]) => ({ valor, etiqueta: n.nombre }))} />
            <//>
            <${Campo} etiqueta="Ciudad de origen de despachos">
              <${Seleccion} value=${p.ciudad || ''} vacio="Selecciona una ciudad" onChange=${cambiar('ciudad')} opciones=${SC.datos.ciudades.filter((c) => c.zona !== 'especial').map((c) => c.nombre)} />
            <//>
            <${Campo} etiqueta="Correo comercial"><${Entrada} type="email" value=${p.correo || ''} onChange=${cambiar('correo')} placeholder="ventas@mitienda.co" /><//>
            <${Campo} etiqueta="WhatsApp comercial"><${Entrada} value=${p.whatsapp || ''} inputMode="numeric" onChange=${(e) => setPerfil({ whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="3001234567" /><//>
          </div>
        <//>
      </div>
      ${p.nicho &&
      html`<${Aviso} tono="info" titulo="Categorías sugeridas para tu nicho" className="mt-6">${SC.datos.nichos[p.nicho].categorias.join(' · ')}<//>`}
      <${Entrega} criterios=${criterios} hecho=${hecho} onEntregar=${() => completar({ puntaje: 100, resumen: `${p.nombre} · ${SC.datos.nichos[p.nicho].nombre} · ${p.ciudad}` })} />
    `;
  }

  SC.registrar({
    id: 0,
    orden: 0,
    modulo: 'inicio',
    titulo: 'Perfil del emprendimiento',
    corto: 'Perfil',
    competencia: 'Configurar los datos básicos de operación de un emprendimiento de comercio electrónico.',
    evidencia: 'Ficha de registro del aprendiz y del negocio.',
    Componente: Perfil,
  });
})();
