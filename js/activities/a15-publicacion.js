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

  // Calcula descuentos aplicables a un producto
  function calcularPrecioFinal(producto, promos) {
    let precioFinal = Number(producto.precio) || 0;
    const promoAplicada = promos.find((p) => {
      if (!motores.promoVigente(p)) return false;
      if (p.aplicaA === 'todos') return true;
      if (p.aplicaA === 'categoria') return producto.categoria === p.valor;
      return false;
    });
    if (promoAplicada) {
      if (promoAplicada.tipo === 'porcentaje') precioFinal = precioFinal * (1 - Number(promoAplicada.valor) / 100);
      if (promoAplicada.tipo === 'valor') precioFinal = Math.max(0, precioFinal - Number(promoAplicada.valor));
    }
    return Math.round(precioFinal);
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
      .map((p) => {
        const precioFinal = calcularPrecioFinal(p, vigentes);
        const descuento = Number(p.precio) - precioFinal;
        const hayDescuento = descuento > 0;
        return `<article class="card" data-producto="${e(p.sku)}"><div class="img">${p.imagen ? `<img src="${e(p.imagen)}" alt="${e(p.nombre)}">` : e(p.icono || '📦')}</div>
      <p class="cat">${e(p.categoria)}</p><h3>${e(p.nombre)}</h3>
      ${hayDescuento ? `<p class="descuento">-${Math.round((descuento / Number(p.precio)) * 100)}%</p>` : ''}
      <div class="precios">
        ${hayDescuento ? `<p class="precio-original">${e(fmt.cop(Number(p.precio)))}</p>` : ''}
        <p class="precio">${e(fmt.cop(precioFinal))}</p>
      </div>
      <p>${e(p.descripcion)}</p>
      ${p.variantes ? `<p class="var">${e(p.variantes)}</p>` : ''}
      <div class="acciones">
        <input type="number" class="qty" value="1" min="1" max="${Number(p.stock) || 1}">
        <button class="btn addcart" data-sku="${e(p.sku)}" data-nombre="${e(p.nombre)}" data-precio="${precioFinal}">Añadir al carrito</button>
      </div>
      <a class="btn-wa" href="${wa}?text=${encodeURIComponent(`Hola, quiero comprar ${p.nombre} (${p.sku})`)}" target="_blank" rel="noopener">Por WhatsApp</a></article>`;
      })
      .join('\n');
    const promos = vigentes.map((p) => `<li><strong>${e(p.nombre)}</strong>: ${e(motores.describirPromo ? motores.describirPromo(p) : '')}</li>`).join('');
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
header{background:${colores[0]};border-bottom:4px solid #0A0A0A;padding:16px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100}
header .info h1{margin:0;font-size:28px;font-weight:900;text-transform:uppercase}header p{margin:2px 0 0;font-weight:700;font-size:14px}
.carrito-btn{background:${colores[1]};border:3px solid #0A0A0A;padding:8px 12px;cursor:pointer;font-weight:800;font-size:13px;box-shadow:2px 2px 0 #0A0A0A}
.carrito-badge{background:#FF5555;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;position:absolute;top:-8px;right:-8px}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}
.promo{background:${colores[1]};border-bottom:4px solid #0A0A0A;padding:16px;font-weight:800}.promo ul{margin:0;padding-left:18px;list-style:none}.promo li{margin:6px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;margin:28px 0}
.card{background:#fff;border:3px solid #0A0A0A;box-shadow:6px 6px 0 #0A0A0A;padding:16px;position:relative;transition:all 0.2s}.card:hover{transform:translate(-2px,-2px);box-shadow:8px 8px 0 #0A0A0A}
.card h3{margin:8px 0 4px;font-size:18px;line-height:1.2}.card p{margin:4px 0;font-size:14px}.cat{font-size:11px;font-weight:900;text-transform:uppercase;opacity:0.7}
.descuento{position:absolute;top:10px;right:10px;background:#FF5555;color:white;padding:6px 10px;font-weight:900;font-size:12px;border:2px solid #0A0A0A}
.img{height:140px;display:flex;align-items:center;justify-content:center;font-size:48px;border:3px solid #0A0A0A;background:#FFFBEA;overflow:hidden;margin-bottom:8px}.img img{width:100%;height:100%;object-fit:cover}
.precios{margin:6px 0;display:flex;gap:8px;align-items:baseline}.precio-original{font-size:14px;text-decoration:line-through;opacity:0.6}.precio{font-size:22px;font-weight:900;margin:0}
.var{font-size:12px;font-weight:700;color:#555}
.acciones{display:grid;grid-template-columns:60px 1fr;gap:8px;margin:8px 0}.qty{border:2px solid #0A0A0A;padding:6px;font-weight:700;text-align:center}
.addcart{background:#3DDC97;border:3px solid #0A0A0A;box-shadow:3px 3px 0 #0A0A0A;padding:8px;font-weight:800;color:#0A0A0A;text-transform:uppercase;font-size:11px;cursor:pointer;transition:all 0.1s}
.addcart:hover:not(:disabled){transform:translate(-1px,-1px);box-shadow:4px 4px 0 #0A0A0A}
.addcart:disabled{opacity:0.5;cursor:not-allowed}
.btn-wa{display:inline-block;margin-top:4px;background:#25D366;border:2px solid #0A0A0A;padding:6px 10px;font-weight:700;color:#fff;text-decoration:none;text-transform:uppercase;font-size:11px;cursor:pointer}
section.info{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin:28px 0}
.box{background:#fff;border:3px solid #0A0A0A;padding:16px}.box h2{margin-top:0;font-size:16px;text-transform:uppercase}
details{border-top:2px solid #0A0A0A;padding:8px 0}summary{font-weight:800;cursor:pointer;user-select:none}
.modal-carrito{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}
.modal-carrito.oculto{display:none}
.modal-content{background:#fff;border:4px solid #0A0A0A;padding:20px;max-height:80vh;overflow-auto;width:100%;max-width:500px;box-shadow:8px 8px 0 #0A0A0A}
.modal-content h2{margin-top:0;font-weight:900;text-transform:uppercase}
.carrito-vacio{text-align:center;padding:20px;opacity:0.6}
.item-carrito{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0A0A0A;padding:12px 0}.item-carrito button{background:#FF5555;color:white;border:2px solid #0A0A0A;padding:4px 8px;cursor:pointer;font-weight:700}
.total-carrito{margin-top:16px;padding-top:16px;border-top:3px solid #0A0A0A;font-size:18px;font-weight:900;text-align:right}
.btn-checkout{width:100%;background:#3DDC97;border:3px solid #0A0A0A;padding:12px;margin-top:12px;font-weight:900;cursor:pointer;text-transform:uppercase;font-size:14px}
footer{background:#0A0A0A;color:#fff;padding:20px 16px;margin-top:28px;font-size:13px}footer a{color:#FFD60A}
@media(max-width:600px){.grid{grid-template-columns:1fr}.carrito-btn{padding:6px 10px;font-size:12px}}
</style></head>
<body>
<header><div class="info"><h1>${e(proyecto.marca.nombre)}</h1><p>${e(proyecto.marca.slogan || '')}</p></div>
<button class="carrito-btn" onclick="document.getElementById('modal-carrito').classList.toggle('oculto')">🛒 CARRITO <span class="carrito-badge" id="badge-cantidad">0</span></button></header>
<div id="modal-carrito" class="modal-carrito oculto"><div class="modal-content"><h2>Mi carrito</h2><div id="carrito-items"></div><div class="total-carrito">Total: <span id="carrito-total">$0</span></div><button class="btn-checkout" onclick="finalizarCompra()">Finalizar compra</button><button onclick="document.getElementById('modal-carrito').classList.add('oculto')" style="width:100%;background:#999;border:2px solid #0A0A0A;padding:8px;margin-top:8px;cursor:pointer">Cerrar</button></div></div>
${promos ? `<div class="promo"><div class="wrap"><strong>Promociones activas</strong><ul>${promos}</ul></div></div>` : ''}
<main class="wrap">
<p style="font-weight:600;font-size:16px;margin:24px 0 0">${e(proyecto.marca.descripcion || '')}</p>
<div class="grid">${tarjetas}</div>
<section class="info">
<div class="box"><h2>Medios de pago</h2><ul style="list-style:none;padding:0">${pagos}</ul></div>
<div class="box"><h2>Envíos desde ${e(proyecto.perfil.ciudad || '')}</h2><p>Despachamos a toda Colombia con transportadoras aliadas. Tiempo de entrega: 1 a 8 días hábiles.</p></div>
<div class="box"><h2>Políticas legales</h2>${pols}</div>
</section>
</main>
<footer><div class="wrap">
<p><strong>${e(proyecto.marca.nombre)}</strong> · ${e(proyecto.perfil.correo || '')} · WhatsApp ${e(proyecto.perfil.whatsapp || '')}</p>
<p>Protección: <a href="https://www.sic.gov.co" target="_blank">SIC</a> | Datos: Ley 1581 de 2012 | Consumidor: Ley 1480 de 2011</p>
<p>Proyecto educativo · Ficha ${e(proyecto.perfil.ficha || '')} · ${e(new Date().toLocaleDateString('es-CO'))}</p>
</div></footer>
<script>
let carrito = JSON.parse(localStorage.getItem('tienda-carrito') || '{}');
function fmt(n){return n.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}
function actualizarCarrito(){
  const items = Object.values(carrito);
  const badge = document.getElementById('badge-cantidad');
  badge.textContent = items.reduce((a,b)=>a+b.cantidad,0);
  const itemsDiv = document.getElementById('carrito-items');
  if(items.length===0){itemsDiv.innerHTML='<div class="carrito-vacio">Carrito vacío</div>';}
  else{
    itemsDiv.innerHTML = items.map(i=>'<div class="item-carrito"><div><strong>'+i.nombre+'</strong><br>'+i.cantidad+' × '+fmt(i.precio)+'</div><button onclick="quitarDelCarrito(\\''+i.sku+'\\')">Quitar</button></div>').join('');
  }
  const total = items.reduce((a,b)=>a+(b.precio*b.cantidad),0);
  document.getElementById('carrito-total').textContent = fmt(total);
}
document.querySelectorAll('.addcart').forEach(btn=>{
  btn.addEventListener('click',function(){
    const sku = this.dataset.sku;
    const nombre = this.dataset.nombre;
    const precio = parseInt(this.dataset.precio);
    const cantidad = parseInt(this.parentElement.querySelector('.qty').value);
    if(carrito[sku]){carrito[sku].cantidad += cantidad;}
    else{carrito[sku]={sku,nombre,precio,cantidad};}
    localStorage.setItem('tienda-carrito',JSON.stringify(carrito));
    actualizarCarrito();
    this.textContent = '✓ Añadido';
    setTimeout(()=>{this.textContent = 'Añadir al carrito'},1000);
  });
});
function quitarDelCarrito(sku){delete carrito[sku];localStorage.setItem('tienda-carrito',JSON.stringify(carrito));actualizarCarrito()}
function finalizarCompra(){
  const wa = '${wa}'.replace('https://wa.me/','');
  const items = Object.values(carrito);
  if(items.length===0){alert('El carrito está vacío');return;}
  const texto = 'Hola, quisiera comprar:\\n' + items.map(i=>i.cantidad+'x '+i.nombre+' = '+fmt(i.precio*i.cantidad)).join('\\n') + '\\nTotal: ' + fmt(items.reduce((a,b)=>a+b.precio*b.cantidad,0));
  if(wa && wa !== '#'){window.open('https://wa.me/57'+wa+'?text='+encodeURIComponent(texto),'_blank');}
}
actualizarCarrito();
</script>
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
      html`<div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <${Tarjeta} titulo="Checklist final" color=${preListo ? 'menta' : 'sol'}>
          <${ui.Criterios} items=${criterios.slice(0, 6)} />
          <${Boton} className="mt-4 w-full" tam="lg" variante="exito" disabled=${!preListo} onClick=${publicar}>Publicar tienda<//>
          ${d.publicada &&
          html`<div className="mt-4 space-y-3">
            <${Aviso} tono="ok" titulo="✓ Tienda publicada">
              <p className="font-mono font-bold">${d.publicada.url}</p>
              <p className="text-sm">${fmt.fecha(d.publicada.fecha)} · ${d.publicada.productos} productos en venta · ${d.publicada.integraciones.length} canales integrados</p>
            <//>
            <${Boton} className="w-full" variante="oscuro" onClick=${() => util.descargar('index.html', construirTienda(proyecto, d), 'text/html;charset=utf-8')}>📥 Descargar HTML (index.html)<//>
            <div className="border-2 border-tinta bg-cielo p-3">
              <p className="text-xs font-extrabold uppercase">Próximo paso</p>
              <p className="text-sm font-medium">Sube index.html a tu hosting. Si usas GitHub Pages: crea repo, carga el archivo y activa Pages en Settings.</p>
            </div>
          </div>`}
        <//>
        <div>
          <${Tarjeta} titulo="Simulador en vivo" color="papel">
            <iframe title="Simulador interactivo de la tienda" srcDoc=${vistaPrevia} className="h-[600px] w-full border-4 border-tinta bg-white" sandbox="allow-popups allow-scripts allow-same-origin"></iframe>
            <p className="mt-2 text-xs font-medium text-gray-700">Puedes añadir productos al carrito, aplicar descuentos y simular una compra por WhatsApp.</p>
          <//>
        </div>
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
