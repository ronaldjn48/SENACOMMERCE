/* Actividad 15. Proyecto final: publicación de la tienda e integración con plataformas del mercado. */
(function () {
  const { html, ui, fmt, util, motores } = SC;
  const { Contexto, Tarjeta, Campo, Entrada, AreaTexto, Seleccion, Casilla, Entrega, Aviso, Boton, Insignia, Pestanas } = ui;

  const hostings = ['GitHub Pages', 'Netlify', 'Vercel', 'Hosting compartido con cPanel'];
  const politicas = [
    { id: 'terminos', nombre: 'Términos y condiciones de venta' },
    { id: 'datos', nombre: 'Política de tratamiento de datos personales (Ley 1581 de 2012)' },
    { id: 'retracto', nombre: 'Política de cambios, devoluciones y derecho de retracto (Ley 1480 de 2011)' },
    { id: 'envios', nombre: 'Política de envíos y tiempos de entrega' },
  ];

  // Campos que exige cada plataforma y el campo del catálogo que los alimenta.
  const integraciones = [
    { id: 'meta', nombre: 'Catálogo de Meta (Facebook e Instagram Shopping)', campos: { id: 'sku', title: 'nombre', description: 'descripcion', price: 'precio', availability: 'stock', brand: 'marca' } },
    { id: 'google', nombre: 'Google Merchant Center', campos: { id: 'sku', title: 'nombre', description: 'descripcion', price: 'precio', availability: 'stock', product_type: 'categoria' } },
    { id: 'mercadolibre', nombre: 'Mercado Libre', campos: { seller_sku: 'sku', title: 'nombre', price: 'precio', available_quantity: 'stock', category: 'categoria' } },
    { id: 'whatsapp', nombre: 'Catálogo de WhatsApp Business', campos: { retailer_id: 'sku', name: 'nombre', price: 'precio', description: 'descripcion' } },
    { id: 'marketplace', nombre: 'Marketplace de gran superficie (Seller Center)', campos: { SellerSku: 'sku', Name: 'nombre', Price: 'precio', Quantity: 'stock', Weight: 'peso' } },
  ];
  const camposCatalogo = ['sku', 'nombre', 'descripcion', 'precio', 'costo', 'stock', 'categoria', 'marca', 'peso', 'palabrasClave'];

  function slug(t) {
    return util.normalizar(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function valorFeed(campoDestino, campoOrigen, p, marca) {
    if (campoOrigen === 'stock') return campoDestino === 'availability' ? (Number(p.stock) > 0 ? 'in stock' : 'out of stock') : Number(p.stock);
    if (campoOrigen === 'precio') return campoDestino === 'price' ? `${Number(p.precio)} COP` : Number(p.precio);
    if (campoOrigen === 'marca') return p.marca || marca;
    return p[campoOrigen] ?? '';
  }

  function generarFeed(integ, mapeo, productos, marca) {
    const cabecera = Object.keys(integ.campos);
    const filas = productos.map((p) => cabecera.map((c) => valorFeed(c, mapeo[c], p, marca)));
    return { cabecera, filas };
  }

  // Construye la tienda como un único archivo HTML autocontenido, listo para subir a cualquier hosting.
  function construirTienda(proyecto, d) {
    const e = util.escaparHTML;
    const colores = (proyecto.marca.colores || ['sol', 'fucsia']).map((id) => (SC.paletaMarca.find((c) => c.id === id) || { hex: '#FFD60A' }).hex);
    const productos = proyecto.productos.filter((p) => p.estado !== 'borrador');
    const vigentes = proyecto.promos.filter((p) => motores.promoVigente(p));
    const wa = proyecto.perfil.whatsapp ? `https://wa.me/57${proyecto.perfil.whatsapp}` : '#';
    const textosPol = d.textosPoliticas || {};
    const tarjetas = productos
      .map((p) => `<article class="card"><div class="img">${p.imagen ? `<img src="${e(p.imagen)}" alt="${e(p.nombre)}">` : e(p.icono || '📦')}</div>
      <p class="cat">${e(p.categoria)}</p><h3>${e(p.nombre)}</h3><p class="precio">${e(fmt.cop(p.precio))}</p><p>${e(p.descripcion)}</p>
      ${p.variantes ? `<p class="var">${e(p.variantes)}</p>` : ''}
      <a class="btn" href="${wa}?text=${encodeURIComponent(`Hola, quiero comprar ${p.nombre} (${p.sku})`)}" target="_blank" rel="noopener">Comprar por WhatsApp</a></article>`)
      .join('\n');
    const promos = vigentes.map((p) => `<li>${e(p.nombre)}: ${e(motores.describirPromo ? motores.describirPromo(p) : '')}</li>`).join('');
    const pagos = proyecto.metodosActivos.map((m) => `<li>${e(m.nombre)}</li>`).join('');
    const pols = politicas.map((p) => `<details><summary>${e(p.nombre)}</summary><p>${e(textosPol[p.id] || '')}</p></details>`).join('');
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(d.seoTitulo || proyecto.marca.nombre)}</title>
<meta name="description" content="${e(d.seoDescripcion || '')}">
<meta property="og:title" content="${e(d.seoTitulo || proyecto.marca.nombre)}"><meta property="og:description" content="${e(d.seoDescripcion || '')}">
<link rel="canonical" href="https://${e(d.dominio || '')}/">
<style>
*{box-sizing:border-box}body{margin:0;font-family:"Work Sans",system-ui,sans-serif;background:#FFFBEA;color:#0A0A0A}
header{background:${colores[0]};border-bottom:4px solid #0A0A0A;padding:24px 16px}header h1{margin:0;font-size:clamp(28px,6vw,52px);font-weight:900;text-transform:uppercase}
header p{margin:6px 0 0;font-weight:700;font-size:18px}.wrap{max-width:1100px;margin:0 auto;padding:0 16px}
.promo{background:${colores[1]};border-bottom:4px solid #0A0A0A;padding:12px 16px;font-weight:800}.promo ul{margin:0;padding-left:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px;margin:28px 0}
.card{background:#fff;border:3px solid #0A0A0A;box-shadow:6px 6px 0 #0A0A0A;padding:14px}.card h3{margin:6px 0;font-size:18px}
.img{height:160px;display:flex;align-items:center;justify-content:center;font-size:64px;border:3px solid #0A0A0A;background:#FFFBEA;overflow:hidden}.img img{width:100%;height:100%;object-fit:cover}
.cat{margin:10px 0 0;font-size:12px;font-weight:800;text-transform:uppercase}.precio{font-size:24px;font-weight:900;margin:4px 0}.var{font-size:13px;font-weight:700}
.btn{display:inline-block;margin-top:8px;background:#3DDC97;border:3px solid #0A0A0A;box-shadow:3px 3px 0 #0A0A0A;padding:8px 12px;font-weight:800;color:#0A0A0A;text-decoration:none;text-transform:uppercase;font-size:13px}
section.info{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin:28px 0}
.box{background:#fff;border:3px solid #0A0A0A;padding:14px}.box h2{margin-top:0;font-size:18px;text-transform:uppercase}
details{border-top:2px solid #0A0A0A;padding:8px 0}summary{font-weight:800;cursor:pointer}
footer{background:#0A0A0A;color:#fff;padding:20px 16px;margin-top:28px;font-size:14px}footer a{color:#FFD60A}
</style></head>
<body>
<header><div class="wrap"><h1>${e(proyecto.marca.nombre)}</h1><p>${e(proyecto.marca.slogan || '')}</p></div></header>
${promos ? `<div class="promo"><div class="wrap"><ul>${promos}</ul></div></div>` : ''}
<main class="wrap">
<p style="font-weight:600;font-size:17px;margin-top:24px">${e(proyecto.marca.descripcion || '')}</p>
<div class="grid">${tarjetas}</div>
<section class="info">
<div class="box"><h2>Medios de pago</h2><ul>${pagos}</ul></div>
<div class="box"><h2>Envíos</h2><p>Despachamos desde ${e(proyecto.perfil.ciudad || '')} a toda Colombia con transportadoras aliadas.</p></div>
<div class="box"><h2>Políticas</h2>${pols}</div>
</section>
</main>
<footer><div class="wrap">
<p>${e(proyecto.marca.nombre)} · ${e(proyecto.perfil.correo || '')} · WhatsApp ${e(proyecto.perfil.whatsapp || '')}</p>
<p>Protección al consumidor: <a href="https://www.sic.gov.co" target="_blank" rel="noopener">Superintendencia de Industria y Comercio</a></p>
<p>Proyecto formativo de ${e(proyecto.perfil.nombre || '')} · Ficha ${e(proyecto.perfil.ficha || '')} · Publicado ${e(new Date().toLocaleDateString('es-CO'))}</p>
</div></footer>
</body></html>`;
  }

  function borradorPolitica(id, proyecto) {
    const m = proyecto.marca.nombre;
    const textos = {
      terminos: `${m} vende productos a través de su tienda virtual a consumidores en Colombia. Los precios incluyen IVA y se expresan en pesos colombianos. La compra se perfecciona con la confirmación del pago.`,
      datos: `${m} trata los datos personales de sus clientes para gestionar pedidos, envíos y comunicaciones comerciales autorizadas. El titular puede conocer, actualizar, rectificar y suprimir sus datos escribiendo a ${proyecto.perfil.correo || 'nuestro correo'}.`,
      retracto: `El cliente puede ejercer el derecho de retracto dentro de los cinco días hábiles siguientes a la entrega. ${m} reintegra el dinero dentro de los treinta días calendario siguientes. Los productos con defecto tienen garantía legal.`,
      envios: `${m} despacha desde ${proyecto.perfil.ciudad || 'su bodega'} a todo el país. El tiempo de entrega varía entre uno y ocho días hábiles según el destino. El cliente recibe el número de guía por correo y WhatsApp.`,
    };
    return textos[id];
  }

  function Publicacion({ actividad, datos, setDatos, proyecto, completar, hecho, actividadesPrevias }) {
    const [pestana, setPestana] = React.useState('dominio');
    const [feedAbierto, setFeedAbierto] = React.useState(null);
    const d = datos;
    const sel = d.integraciones || {};
    const mapeos = d.mapeos || {};
    const textosPol = d.textosPoliticas || {};
    const productosActivos = proyecto.productos.filter((p) => p.estado !== 'borrador');

    const dominioOk = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(d.dominio || '');
    const tituloOk = String(d.seoTitulo || '').length >= 20 && String(d.seoTitulo || '').length <= 60;
    const descOk = String(d.seoDescripcion || '').length >= 120 && String(d.seoDescripcion || '').length <= 160;
    const politicasOk = politicas.every((p) => String(textosPol[p.id] || '').length >= 120);
    const elegidas = integraciones.filter((i) => sel[i.id]);
    const mapeoOk = (i) => Object.entries(i.campos).every(([destino, origen]) => (mapeos[i.id] || {})[destino] === origen);
    const pendientes = actividadesPrevias.filter((a) => !a.hecho);

    const criterios = [
      { texto: 'Todas las actividades anteriores aprobadas', ok: pendientes.length === 0 },
      { texto: 'Dominio con formato válido, hosting elegido y certificado SSL activo', ok: dominioOk && !!d.hosting && !!d.ssl },
      { texto: 'Título SEO de 20 a 60 caracteres y meta descripción de 120 a 160', ok: tituloOk && descOk },
      { texto: 'Cuatro políticas legales redactadas (120 caracteres o más cada una)', ok: politicasOk },
      { texto: `Tres integraciones o más con plataformas del mercado (llevas ${elegidas.length})`, ok: elegidas.length >= 3 },
      { texto: 'Campos de cada integración mapeados correctamente', ok: elegidas.length >= 3 && elegidas.every(mapeoOk) },
      { texto: 'Tienda publicada', ok: !!d.publicada },
    ];

    function publicar() {
      const html5 = construirTienda(proyecto, d);
      setDatos({ publicada: { fecha: Date.now(), url: `https://${d.dominio}`, productos: productosActivos.length, integraciones: elegidas.map((i) => i.nombre), bytes: html5.length } });
    }

    function descargarFeed(i) {
      const f = generarFeed(i, mapeos[i.id] || {}, productosActivos, proyecto.marca.nombre);
      const csv = [f.cabecera.join(','), ...f.filas.map((r) => r.map(util.csvCampo).join(','))].join('\n');
      util.descargar(`feed-${i.id}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
    }

    const preListo = criterios.slice(0, 6).every((c) => c.ok);
    const vistaPrevia = pestana === 'publicar' ? construirTienda(proyecto, d) : '';

    return html`
      <${Contexto} actividad=${actividad}>
        <p>Llegó el momento de salir al mercado. Configura el dominio, el posicionamiento en buscadores y las políticas legales de ${proyecto.marca.nombre}. Luego conecta el catálogo con los canales de venta del mercado mediante feeds de productos y publica la tienda.</p>
        <p>La tienda publicada reúne tu trabajo: marca creada con IA, catálogo, medios de pago, promociones vigentes y datos de contacto.</p>
      <//>

      ${pendientes.length > 0 && html`<${Aviso} tono="alerta" titulo="Actividades pendientes" className="mb-4">${pendientes.map((a) => a.titulo).join(' · ')}<//>`}

      <${Pestanas} activa=${pestana} onCambio=${setPestana} pestanas=${[
        { id: 'dominio', etiqueta: '1. Dominio y SEO' },
        { id: 'politicas', etiqueta: '2. Políticas' },
        { id: 'integraciones', etiqueta: '3. Integraciones', contador: elegidas.length },
        { id: 'publicar', etiqueta: '4. Publicar' },
      ]} />

      ${pestana === 'dominio' &&
      html`<div className="grid gap-6 xl:grid-cols-2">
        <${Tarjeta} titulo="Dominio y hosting" color="blanco">
          <div className="space-y-3">
            <${Campo} etiqueta="Dominio" ayuda=${`Sugerencia: ${slug(proyecto.marca.nombre)}.com.co`} error=${d.dominio && !dominioOk ? 'Formato no válido. Ej. mitienda.com.co' : undefined}>
              <${Entrada} value=${d.dominio || ''} onChange=${(e) => setDatos({ dominio: e.target.value.toLowerCase().trim(), publicada: null })} />
            <//>
            <${Campo} etiqueta="Hosting"><${Seleccion} value=${d.hosting || ''} vacio="Selecciona" opciones=${hostings} onChange=${(e) => setDatos({ hosting: e.target.value })} /><//>
            <${Casilla} etiqueta="Certificado SSL activo (HTTPS) para proteger los datos de pago" checked=${d.ssl} onChange=${(v) => setDatos({ ssl: v })} />
          </div>
        <//>
        <${Tarjeta} titulo="Posicionamiento (SEO)" color="sol">
          <div className="space-y-3">
            <${Campo} etiqueta=${`Título SEO (${String(d.seoTitulo || '').length}/60)`}><${Entrada} value=${d.seoTitulo || ''} onChange=${(e) => setDatos({ seoTitulo: e.target.value, publicada: null })} /><//>
            <${Campo} etiqueta=${`Meta descripción (${String(d.seoDescripcion || '').length}/160)`}><${AreaTexto} filas=${3} value=${d.seoDescripcion || ''} onChange=${(e) => setDatos({ seoDescripcion: e.target.value, publicada: null })} /><//>
          </div>
          <div className="mt-4 border-3 border-tinta bg-white p-3">
            <p className="text-xs font-medium text-green-800">https://${d.dominio || 'tudominio.com.co'}</p>
            <p className="text-lg font-bold text-blue-800">${d.seoTitulo || 'Título de la página'}</p>
            <p className="text-sm font-medium">${d.seoDescripcion || 'Meta descripción que aparece en los resultados de búsqueda.'}</p>
          </div>
        <//>
      </div>`}

      ${pestana === 'politicas' &&
      html`<div className="grid gap-6 lg:grid-cols-2">
        ${politicas.map((p) => html`<${Tarjeta} key=${p.id} titulo=${p.nombre} color="blanco"
          acciones=${html`<${Boton} tam="sm" variante="secundario" onClick=${() => setDatos({ textosPoliticas: { ...textosPol, [p.id]: borradorPolitica(p.id, proyecto) }, publicada: null })}>Borrador base<//>`}>
          <${AreaTexto} filas=${5} value=${textosPol[p.id] || ''} onChange=${(e) => setDatos({ textosPoliticas: { ...textosPol, [p.id]: e.target.value }, publicada: null })} />
          <p className="mt-1 text-xs font-bold">${String(textosPol[p.id] || '').length} caracteres · mínimo 120. Ajusta el borrador a tu negocio.</p>
        <//>`)}
      </div>`}

      ${pestana === 'integraciones' &&
      html`<div className="space-y-4">
        <${Aviso} tono="info">Activa las plataformas y relaciona cada campo que exige la plataforma con el campo de tu catálogo. Así se construye el feed de productos.<//>
        ${integraciones.map((i) => {
          const activa = !!sel[i.id];
          const bien = mapeoOk(i);
          return html`<${Tarjeta} key=${i.id} titulo=${i.nombre} color=${activa ? (bien ? 'menta' : 'sol') : 'blanco'}
            acciones=${html`<${Casilla} etiqueta="Conectar" checked=${activa} onChange=${(v) => setDatos({ integraciones: { ...sel, [i.id]: v }, publicada: null })} />`}>
            ${activa &&
            html`<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              ${Object.keys(i.campos).map((destino) => html`<${Campo} key=${destino} etiqueta=${destino}>
                <${Seleccion} value=${(mapeos[i.id] || {})[destino] || ''} vacio="Campo del catálogo" opciones=${camposCatalogo}
                  onChange=${(e) => setDatos({ mapeos: { ...mapeos, [i.id]: { ...(mapeos[i.id] || {}), [destino]: e.target.value } }, publicada: null })} />
              <//>`)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <${Insignia} color=${bien ? 'menta' : 'coral'}>${bien ? 'Mapeo correcto' : 'Revisa el mapeo'}<//>
              ${bien && html`<${Boton} tam="sm" variante="secundario" onClick=${() => setFeedAbierto(feedAbierto === i.id ? null : i.id)}>Ver feed<//>
                <${Boton} tam="sm" variante="oscuro" onClick=${() => descargarFeed(i)}>Descargar feed CSV<//>`}
            </div>
            ${feedAbierto === i.id && bien && (() => {
              const f = generarFeed(i, mapeos[i.id], productosActivos, proyecto.marca.nombre);
              return html`<div className="mt-3 max-h-64 overflow-auto"><table className="nb-table text-xs">
                <thead><tr>${f.cabecera.map((c) => html`<th key=${c}>${c}</th>`)}</tr></thead>
                <tbody>${f.filas.map((r, k) => html`<tr key=${k}>${r.map((v, j) => html`<td key=${j}>${String(v).slice(0, 60)}</td>`)}</tr>`)}</tbody>
              </table></div>`;
            })()}`}
          <//>`;
        })}
      </div>`}

      ${pestana === 'publicar' &&
      html`<div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <${Tarjeta} titulo="Lista previa a la publicación" color=${preListo ? 'menta' : 'sol'}>
          <${ui.Criterios} items=${criterios.slice(0, 6)} />
          <${Boton} className="mt-4 w-full" tam="lg" variante="exito" disabled=${!preListo} onClick=${publicar}>Publicar tienda<//>
          ${d.publicada &&
          html`<div className="mt-4 space-y-2">
            <${Aviso} tono="ok" titulo="Tienda publicada">
              <p className="font-mono">${d.publicada.url}</p>
              <p>${fmt.fecha(d.publicada.fecha)} · ${d.publicada.productos} productos · ${d.publicada.integraciones.length} integraciones</p>
            <//>
            <${Boton} className="w-full" variante="oscuro" onClick=${() => util.descargar('index.html', construirTienda(proyecto, d), 'text/html;charset=utf-8')}>Descargar sitio (index.html)<//>
            <p className="text-xs font-medium">Sube el archivo a ${d.hosting}. En GitHub Pages: crea un repositorio, carga index.html y activa Pages en la configuración.</p>
          </div>`}
        <//>
        <${Tarjeta} titulo="Vista previa del sitio" color="papel">
          <iframe title="Vista previa de la tienda" srcDoc=${vistaPrevia} className="h-[36rem] w-full border-3 border-tinta bg-white" sandbox="allow-popups"></iframe>
        <//>
      </div>`}

      <${Entrega} criterios=${criterios} hecho=${hecho}
        onEntregar=${() => completar({ puntaje: 100, resumen: `${d.publicada ? d.publicada.url : ''} · ${elegidas.length} integraciones` })} />
    `;
  }

  SC.registrar({
    id: 15,
    orden: 14,
    modulo: 'proyecto',
    titulo: 'Publicación e integración multicanal',
    corto: 'Proyecto final',
    competencia: 'Publicar el proyecto web de comercio electrónico e integrarlo con plataformas del mercado.',
    evidencia: 'Sitio publicado con dominio, SEO, políticas legales y feeds de productos para marketplaces y redes.',
    Componente: Publicacion,
  });
})();
