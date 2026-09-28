/* Actividad 3. Carga del catálogo de productos con sus atributos. */
(function () {
  const { html, ui, fmt, util, motores } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, AreaTexto, Seleccion, Entrega, Aviso, Boton, Insignia, Pestanas } = ui;

  const iconos = ['👕', '👖', '👟', '🧢', '🎒', '☕', '🫘', '🏺', '🧺', '🧶', '🧴', '🧼', '🌿', '🎧', '🔌', '📱', '⌨️', '🐶', '🐱', '🦴', '🎁', '🕯️', '💡', '📦'];
  const vacio = { sku: '', nombre: '', categoria: '', marca: '', precio: '', costo: '', stock: '', peso: '', largo: '', ancho: '', alto: '', variantes: '', descripcion: '', palabrasClave: '', icono: '📦', imagen: '', estado: 'activo' };
  const columnasCSV = ['sku', 'nombre', 'categoria', 'precio', 'costo', 'stock', 'peso', 'largo', 'ancho', 'alto', 'descripcion', 'palabrasClave', 'variantes'];

  function margen(p) {
    const precio = Number(p.precio);
    return precio > 0 ? ((precio - Number(p.costo)) / precio) * 100 : 0;
  }

  function validar(p, productos, skuOriginal) {
    const e = {};
    if (!/^[A-Z]{3}-\d{3}$/.test(p.sku || '')) e.sku = 'Formato AAA-000: tres letras mayúsculas, guion y tres dígitos.';
    else if (productos.some((x) => x.sku === p.sku && x.sku !== skuOriginal)) e.sku = 'Este SKU ya existe en el catálogo.';
    if (String(p.nombre || '').trim().length < 5) e.nombre = 'Mínimo 5 caracteres.';
    if (!p.categoria) e.categoria = 'Selecciona una categoría.';
    const precio = Number(p.precio);
    const costo = Number(p.costo);
    if (!(precio > 0)) e.precio = 'Ingresa un precio mayor a cero.';
    if (!(costo > 0)) e.costo = 'Ingresa el costo unitario.';
    if (precio > 0 && costo > 0 && margen(p) < 15) e.precio = `Margen de ${margen(p).toFixed(1)} %. El mínimo aceptado es 15 %.`;
    if (!Number.isInteger(Number(p.stock)) || Number(p.stock) < 0 || p.stock === '') e.stock = 'Unidades enteras, cero o más.';
    else if (p.estado === 'activo' && Number(p.stock) < 1) e.stock = 'Un producto activo necesita al menos una unidad.';
    if (!(Number(p.peso) > 0 && Number(p.peso) <= 50)) e.peso = 'Peso entre 0,01 y 50 kg.';
    if (!(Number(p.largo) > 0 && Number(p.ancho) > 0 && Number(p.alto) > 0)) e.dimensiones = 'Ingresa largo, ancho y alto en centímetros.';
    if (String(p.descripcion || '').trim().length < 60) e.descripcion = `Mínimo 60 caracteres (llevas ${String(p.descripcion || '').trim().length}).`;
    if (String(p.palabrasClave || '').split(',').filter((w) => w.trim()).length < 3) e.palabrasClave = 'Escribe al menos 3 palabras clave separadas por coma.';
    return e;
  }

  function parsearCSV(texto) {
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
    if (!lineas.length) return [];
    const sep = lineas[0].includes(';') ? ';' : ',';
    const partir = (linea) => {
      const celdas = [];
      let actual = '';
      let comillas = false;
      for (let i = 0; i < linea.length; i++) {
        const c = linea[i];
        if (c === '"' && linea[i + 1] === '"') { actual += '"'; i++; }
        else if (c === '"') comillas = !comillas;
        else if (c === sep && !comillas) { celdas.push(actual); actual = ''; }
        else actual += c;
      }
      celdas.push(actual);
      return celdas.map((x) => x.trim());
    };
    const cabecera = partir(lineas[0]);
    return lineas.slice(1).map((l) => {
      const celdas = partir(l);
      const obj = { ...vacio };
      cabecera.forEach((c, i) => { if (c in obj) obj[c] = celdas[i] ?? ''; });
      obj.sku = String(obj.sku).toUpperCase();
      // Formato colombiano: los enteros admiten separador de miles y los decimales usan coma.
      ['precio', 'costo', 'stock'].forEach((c) => { obj[c] = String(obj[c]).replace(/[^\d]/g, ''); });
      ['peso', 'largo', 'ancho', 'alto'].forEach((c) => { obj[c] = String(obj[c]).replace(/\s/g, '').replace(',', '.'); });
      return obj;
    });
  }

  function Catalogo({ actividad, datos, setDatos, proyecto, completar, hecho }) {
    const productos = datos.productos || [];
    const [borrador, setBorrador] = React.useState(vacio);
    const [editando, setEditando] = React.useState(null);
    const [intento, setIntento] = React.useState(false);
    const [pestana, setPestana] = React.useState('formulario');
    const [csv, setCsv] = React.useState('');
    const [reporteCSV, setReporteCSV] = React.useState(null);
    const nicho = proyecto.nicho;
    const errores = validar(borrador, productos, editando);
    const cambiar = (campo) => (e) => setBorrador({ ...borrador, [campo]: campo === 'sku' ? e.target.value.toUpperCase() : e.target.value });
    const err = (campo) => (intento ? errores[campo] : undefined);

    function guardar() {
      setIntento(true);
      if (Object.keys(errores).length) return;
      const limpio = { ...borrador, precio: Number(borrador.precio), costo: Number(borrador.costo), stock: Number(borrador.stock), peso: Number(borrador.peso), largo: Number(borrador.largo), ancho: Number(borrador.ancho), alto: Number(borrador.alto) };
      const lista = editando ? productos.map((p) => (p.sku === editando ? limpio : p)) : [...productos, limpio];
      setDatos({ productos: lista });
      setBorrador(vacio);
      setEditando(null);
      setIntento(false);
    }

    function editar(p) {
      setBorrador({ ...vacio, ...p });
      setEditando(p.sku);
      setPestana('formulario');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function importar() {
      const filas = parsearCSV(csv);
      let lista = productos.slice();
      const rechazadas = [];
      filas.forEach((f, i) => {
        const e = validar(f, lista);
        if (Object.keys(e).length) rechazadas.push({ fila: i + 2, sku: f.sku, errores: Object.values(e) });
        else lista.push({ ...f, precio: Number(f.precio), costo: Number(f.costo), stock: Number(f.stock), peso: Number(f.peso), largo: Number(f.largo), ancho: Number(f.ancho), alto: Number(f.alto) });
      });
      setDatos({ productos: lista });
      setReporteCSV({ importadas: lista.length - productos.length, rechazadas });
    }

    const ejemplo = () =>
      setBorrador({
        ...vacio,
        ...nicho.ejemplo,
        sku: '',
        stock: 25,
        peso: 0.5,
        largo: 30,
        ancho: 20,
        alto: 5,
        marca: proyecto.marca.nombre,
        descripcion: `${nicho.ejemplo.nombre} elaborado con materiales seleccionados. Ideal para clientes que buscan calidad y despacho a toda Colombia.`,
        palabrasClave: nicho.categorias.slice(0, 3).join(', ').toLowerCase(),
      });

    const invalidos = productos.filter((p) => Object.keys(validar(p, productos, p.sku)).length);
    const categorias = new Set(productos.map((p) => p.categoria));
    const conVariantes = productos.filter((p) => String(p.variantes || '').includes(':'));
    const margenPromedio = productos.length ? productos.reduce((s, p) => s + margen(p), 0) / productos.length : 0;

    const criterios = [
      { texto: `Cinco o más productos cargados (llevas ${productos.length})`, ok: productos.length >= 5 },
      { texto: 'Todos los productos cumplen las reglas de atributos', ok: productos.length > 0 && invalidos.length === 0 },
      { texto: `Productos en dos o más categorías (llevas ${categorias.size})`, ok: categorias.size >= 2 },
      { texto: `Dos o más productos con variantes en formato "Atributo: valores" (llevas ${conVariantes.length})`, ok: conVariantes.length >= 2 },
      { texto: `Margen promedio del catálogo igual o superior a 25 % (actual ${margenPromedio.toFixed(1)} %)`, ok: margenPromedio >= 25 },
    ];

    const pv = motores.pesoVolumetrico(borrador);

    return html`
      <${Contexto} actividad=${actividad}>
        <p>Con la identidad de <strong>${proyecto.marca.nombre}</strong> lista, carga el catálogo. Cada atributo cumple una función: el SKU identifica el producto en inventario, el peso y las dimensiones definen el costo del envío y las palabras clave mejoran la búsqueda.</p>
        <p>Carga los productos uno a uno o de forma masiva con un archivo CSV, como en las plataformas de comercio electrónico.</p>
      <//>

      <${Pestanas} activa=${pestana} onCambio=${setPestana} pestanas=${[
        { id: 'formulario', etiqueta: editando ? 'Editar producto' : 'Nuevo producto' },
        { id: 'csv', etiqueta: 'Carga masiva CSV' },
      ]} />

      ${pestana === 'formulario' &&
      html`<div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <${Tarjeta} titulo=${editando ? `Editando ${editando}` : 'Ficha de producto'} color="blanco"
          acciones=${html`<${Boton} variante="secundario" tam="sm" onClick=${ejemplo}>Ver ejemplo<//>`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <${Campo} etiqueta="SKU" ayuda="Ej. CAM-001" error=${err('sku')}><${Entrada} value=${borrador.sku} onChange=${cambiar('sku')} maxLength=${7} /><//>
            <${Campo} etiqueta="Estado">
              <${Seleccion} value=${borrador.estado} onChange=${cambiar('estado')} opciones=${[{ valor: 'activo', etiqueta: 'Activo (visible)' }, { valor: 'borrador', etiqueta: 'Borrador' }]} />
            <//>
            <${Campo} etiqueta="Nombre del producto" error=${err('nombre')} className="sm:col-span-2"><${Entrada} value=${borrador.nombre} onChange=${cambiar('nombre')} maxLength=${80} /><//>
            <${Campo} etiqueta="Categoría" error=${err('categoria')}>
              <${Seleccion} value=${borrador.categoria} vacio="Selecciona" opciones=${nicho.categorias} onChange=${cambiar('categoria')} />
            <//>
            <${Campo} etiqueta="Marca"><${Entrada} value=${borrador.marca} placeholder=${proyecto.marca.nombre} onChange=${cambiar('marca')} /><//>
            <${Campo} etiqueta="Precio de venta (COP)" error=${err('precio')}><${Entrada} type="number" value=${borrador.precio} onChange=${cambiar('precio')} /><//>
            <${Campo} etiqueta="Costo unitario (COP)" error=${err('costo')} ayuda=${Number(borrador.precio) > 0 && Number(borrador.costo) > 0 ? `Margen bruto: ${margen(borrador).toFixed(1)} %` : ''}>
              <${Entrada} type="number" value=${borrador.costo} onChange=${cambiar('costo')} />
            <//>
            <${Campo} etiqueta="Stock inicial (unidades)" error=${err('stock')}><${Entrada} type="number" value=${borrador.stock} onChange=${cambiar('stock')} /><//>
            <${Campo} etiqueta="Peso real (kg)" error=${err('peso')}><${Entrada} type="number" step="0.01" value=${borrador.peso} onChange=${cambiar('peso')} /><//>
            <${Campo} etiqueta="Dimensiones del empaque (cm)" error=${err('dimensiones')} className="sm:col-span-2"
              ayuda=${pv > 0 ? `Peso volumétrico: ${fmt.num(pv)} kg (largo × ancho × alto ÷ 5000). La transportadora cobra el mayor entre peso real y volumétrico.` : 'Largo, ancho y alto.'}>
              <div className="grid grid-cols-3 gap-2">
                <${Entrada} type="number" placeholder="Largo" value=${borrador.largo} onChange=${cambiar('largo')} />
                <${Entrada} type="number" placeholder="Ancho" value=${borrador.ancho} onChange=${cambiar('ancho')} />
                <${Entrada} type="number" placeholder="Alto" value=${borrador.alto} onChange=${cambiar('alto')} />
              </div>
            <//>
            <${Campo} etiqueta="Variantes" ayuda="Formato Atributo: valores. Separa atributos con barra vertical. Ej. Talla: S, M, L | Color: Negro" className="sm:col-span-2">
              <${Entrada} value=${borrador.variantes} onChange=${cambiar('variantes')} />
            <//>
            <${Campo} etiqueta="Descripción comercial" error=${err('descripcion')} className="sm:col-span-2"><${AreaTexto} value=${borrador.descripcion} onChange=${cambiar('descripcion')} /><//>
            <${Campo} etiqueta="Palabras clave SEO" error=${err('palabrasClave')} ayuda="Separadas por coma." className="sm:col-span-2"><${Entrada} value=${borrador.palabrasClave} onChange=${cambiar('palabrasClave')} /><//>
            <${Campo} etiqueta="URL de imagen (opcional)" className="sm:col-span-2"><${Entrada} type="url" value=${borrador.imagen} placeholder="https://" onChange=${cambiar('imagen')} /><//>
          </div>
          <div className="mt-3">
            <p className="mb-1 text-sm font-extrabold uppercase">Ícono del producto</p>
            <div className="flex flex-wrap gap-1">
              ${iconos.map((i) => html`<button key=${i} type="button" onClick=${() => setBorrador({ ...borrador, icono: i })} className=${`h-10 w-10 border-2 border-tinta text-xl ${borrador.icono === i ? 'bg-sol' : 'bg-white'}`}>${i}</button>`)}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <${Boton} variante="exito" onClick=${guardar}>${editando ? 'Guardar cambios' : 'Agregar al catálogo'}<//>
            ${editando && html`<${Boton} variante="secundario" onClick=${() => { setBorrador(vacio); setEditando(null); setIntento(false); }}>Cancelar<//>`}
          </div>
        <//>

        <${Tarjeta} titulo="Vista previa" color="sol">
          <div className="nb-card bg-white p-4">
            <div className="flex h-40 items-center justify-center border-3 border-tinta bg-papel text-6xl">
              ${borrador.imagen ? html`<img src=${borrador.imagen} alt=${borrador.nombre} className="h-full w-full object-cover" />` : borrador.icono}
            </div>
            <p className="mt-3 text-xs font-extrabold uppercase">${borrador.categoria || 'Categoría'} · ${borrador.sku || 'SKU'}</p>
            <p className="text-lg font-black">${borrador.nombre || 'Nombre del producto'}</p>
            <p className="text-2xl font-black">${fmt.cop(borrador.precio)}</p>
            <p className="mt-2 text-sm font-medium">${borrador.descripcion || 'Descripción comercial del producto.'}</p>
            ${borrador.variantes && html`<p className="mt-2 text-xs font-bold">${borrador.variantes}</p>`}
          </div>
        <//>
      </div>`}

      ${pestana === 'csv' &&
      html`<${Tarjeta} titulo="Carga masiva" subtitulo="Pega el contenido CSV con la fila de encabezados. Acepta coma o punto y coma como separador." color="blanco">
        <p className="mb-2 text-xs font-bold">Encabezados: ${columnasCSV.join(', ')}</p>
        <${AreaTexto} filas=${8} value=${csv} onChange=${(e) => setCsv(e.target.value)} className="font-mono text-xs"
          placeholder=${`sku;nombre;categoria;precio;costo;stock;peso;largo;ancho;alto;descripcion;palabrasClave;variantes\nABC-010;${nicho.ejemplo.nombre};${nicho.ejemplo.categoria};${nicho.ejemplo.precio};${nicho.ejemplo.costo};20;0,5;30;20;5;"Descripción de 60 caracteres o más...";"palabra1, palabra2, palabra3";"${nicho.ejemplo.variantes}"`} />
        <div className="mt-3 flex flex-wrap gap-2">
          <${Boton} variante="oscuro" onClick=${importar} disabled=${!csv.trim()}>Importar filas<//>
          <${Boton} variante="secundario" onClick=${() => util.descargar('plantilla-catalogo.csv', columnasCSV.join(';') + '\n', 'text/csv;charset=utf-8')}>Descargar plantilla<//>
        </div>
        ${reporteCSV &&
        html`<${Aviso} tono=${reporteCSV.rechazadas.length ? 'alerta' : 'ok'} titulo=${`${reporteCSV.importadas} filas importadas · ${reporteCSV.rechazadas.length} rechazadas`} className="mt-3">
          ${reporteCSV.rechazadas.map((r) => html`<p key=${r.fila}>Fila ${r.fila} (${r.sku || 'sin SKU'}): ${r.errores.join(' ')}</p>`)}
        <//>`}
      <//>`}

      <${Tarjeta} titulo=${`Catálogo de ${proyecto.marca.nombre} (${productos.length})`} className="mt-6">
        ${productos.length === 0
          ? html`<p className="font-medium">Aún no tienes productos. Usa el formulario o la carga masiva.</p>`
          : html`<div className="overflow-x-auto"><table className="nb-table">
              <thead><tr><th></th><th>SKU</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Margen</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                ${productos.map((p) => {
                  const malo = Object.keys(validar(p, productos, p.sku)).length > 0;
                  return html`<tr key=${p.sku} className=${malo ? 'bg-red-100' : ''}>
                    <td className="text-2xl">${p.icono}</td><td className="font-mono font-bold">${p.sku}</td><td className="font-bold">${p.nombre}</td><td>${p.categoria}</td>
                    <td>${fmt.cop(p.precio)}</td><td>${margen(p).toFixed(1)} %</td><td>${p.stock}</td>
                    <td><${Insignia} color=${malo ? 'coral' : p.estado === 'activo' ? 'menta' : 'blanco'}>${malo ? 'Revisar' : p.estado}<//></td>
                    <td className="whitespace-nowrap"><${Boton} tam="sm" variante="secundario" onClick=${() => editar(p)}>Editar<//>
                      <${Boton} tam="sm" variante="peligro" className="ml-1" onClick=${() => setDatos({ productos: productos.filter((x) => x.sku !== p.sku) })}>Quitar<//></td>
                  </tr>`;
                })}
              </tbody></table></div>`}
      <//>

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: 100, resumen: `${productos.length} productos · ${categorias.size} categorías · margen ${margenPromedio.toFixed(1)} %` })} />
    `;
  }

  SC.registrar({
    id: 3,
    orden: 3,
    modulo: 'portafolio',
    titulo: 'Catálogo de productos',
    corto: 'Catálogo',
    competencia: 'Cargar el catálogo de productos con atributos comerciales, logísticos y de posicionamiento.',
    evidencia: 'Catálogo validado con SKU, precios, márgenes, variantes, medidas y palabras clave.',
    Componente: Catalogo,
  });
})();
