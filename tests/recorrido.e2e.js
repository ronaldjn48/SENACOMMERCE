/*
 * Prueba de extremo a extremo: recorre las 15 actividades como aprendiz, sin modo instructor,
 * y verifica el desbloqueo secuencial y la conexión de datos entre fases.
 * Uso: npm run test:e2e (requiere Playwright con Chromium instalado).
 */
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const W = (p, ms = 250) => p.waitForTimeout(ms);
const digits = (t) => Number(String(t).replace(/[^\d,-]/g, '').replace(',', '.'));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } }); global.P = p;
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
  await W(p, 600);
  const main = p.locator('main');
  const entregar = async (nombre) => {
    const btn = main.getByRole('button', { name: /Entregar y desbloquear|Actualizar evidencia/ });
    if (await btn.isDisabled()) {
      console.log('PENDIENTES en', nombre, await p.evaluate(() => [...document.querySelectorAll('main li')].filter(li => li.querySelector('span.bg-white') && li.textContent.length < 200).map(li => li.textContent)));
      await p.screenshot({ path: path.join(__dirname, `fallo-${nombre}.png`), fullPage: true });
      throw new Error('No se puede entregar ' + nombre);
    }
    await btn.click(); await W(p, 300);
    const sig = main.getByRole('button', { name: /^Siguiente/ });
    if (await sig.count()) { await sig.click(); await W(p, 400); }
    console.log('OK', nombre);
  };
  // Gating: actividad 01 bloqueada al inicio
  const bloqueada = await p.locator('nav li button').nth(1).isDisabled();
  console.log('Actividad 01 bloqueada al inicio:', bloqueada);

  // 00 Perfil
  await main.getByLabel(/^Nombre completo/).fill('Laura Gómez Díaz');
  await main.getByLabel(/^Documento de identidad/).fill('1098765432');
  await main.getByLabel(/^Número de ficha/).fill('2876543');
  await main.getByLabel(/^Nicho de mercado/).selectOption('cafe');
  await main.getByLabel(/^Ciudad de origen/).selectOption('Bucaramanga');
  await main.getByLabel(/^Correo comercial/).fill('ventas@tostion.co');
  await main.getByLabel(/^WhatsApp comercial/).fill('3001234567');
  await entregar('00');

  // 01 IA
  const prompt = {
    Rol: 'Actúa como experto en branding para tiendas virtuales colombianas',
    Tarea: 'Propón tres nombres de marca con eslogan y una descripción corta',
    Contexto: 'Tienda virtual de café especial colombiano en grano y molido que vende a todo el país desde Bucaramanga',
    Audiencia: 'Personas de 25 a 45 años que disfrutan el café de origen y compran en línea',
    'Formato de salida': 'Lista numerada con nombre, eslogan de máximo 8 palabras y un párrafo',
    Tono: 'Cercano y profesional',
    Restricciones: 'Evita anglicismos y no uses marcas registradas existentes',
  };
  for (const [k, v] of Object.entries(prompt)) await main.getByLabel(new RegExp('^' + k)).fill(v);
  await main.getByRole('button', { name: 'Generar con IA' }).click(); await W(p);
  await main.getByRole('button', { name: 'Generar con IA' }).click(); await W(p);
  await main.locator('input[name="nombre-marca"]').first().check();
  const desc = main.getByLabel(/^Descripción de la marca/);
  await desc.fill((await desc.inputValue()) + ' Tostamos cada semana en pequeños lotes para garantizar frescura.');
  await main.getByRole('button', { name: 'Amarillo sol' }).click();
  await main.getByRole('button', { name: 'Fucsia' }).click();
  await main.getByText('Verificar datos, revisar').click();
  await entregar('01');

  // 02 Pagos
  await main.getByLabel(/^Pasarela/).selectOption('Wompi');
  await main.getByLabel('Activar Tarjeta crédito / débito').check();
  await main.getByLabel('Activar PSE (débito a cuenta bancaria)').check();
  await main.getByLabel('Activar Nequi').check();
  await main.getByLabel(/^Tarifa general de IVA/).fill('19');
  for (const m of ['tarjeta', 'nequi']) {
    await main.getByLabel(/^Medio\b/).selectOption(m, { timeout: 3000 });
    await main.getByLabel(/^Valor de la compra/).fill('150000');
    await main.getByRole('button', { name: 'Procesar pago de prueba' }).click(); await W(p, 150);
  }
  await main.locator('section:has-text("Análisis de costos") button', { hasText: 'Nequi' }).click();
  await entregar('02');

  // 03 Catálogo por CSV
  await main.getByRole('tab', { name: 'Carga masiva CSV' }).click();
  const csv = `sku;nombre;categoria;precio;costo;stock;peso;largo;ancho;alto;descripcion;palabrasClave;variantes
CAF-001;Café de Huila en grano 500 g;Café en grano;42000;21000;30;0,5;20;12;8;"Café especial de Huila con notas a panela y frutos rojos, tostión media.";"café, huila, grano";"Molienda: Grano, Media, Fina"
CAF-002;Café de Nariño molido 250 g;Café molido;28000;13000;40;0,25;15;10;6;"Café de altura de Nariño con acidez brillante, molido para filtrado.";"café, nariño, molido";"Molienda: Media, Fina"
CAF-003;Prensa francesa 600 ml;Accesorios de barismo;89000;45000;12;0,8;25;15;15;"Prensa francesa de vidrio borosilicato para preparar café de origen en casa.";"prensa, barismo, cafetera";
CAF-004;Kit regalo origen;Kits de regalo;120000;60000;10;1,2;30;25;10;"Kit con dos cafés de origen, taza de cerámica y guía de preparación.";"regalo, kit, café";
CAF-005;Café del Cauca en grano 1 kg;Café en grano;78000;38000;20;1;25;15;10;"Café del Cauca con notas a chocolate y caramelo, ideal para espresso.";"café, cauca, espresso";`;
  await main.locator('textarea').fill(csv);
  await main.getByRole('button', { name: 'Importar filas' }).click(); await W(p);
  console.log('CSV:', await main.locator('[role=status]').first().textContent());
  await entregar('03');

  // 04 Inventario
  await W(p, 300);
  const skus = ['CAF-001', 'CAF-002', 'CAF-003', 'CAF-004', 'CAF-005'];
  for (const s of skus) await main.getByLabel(`Punto de reorden de ${s}`).fill('5');
  await main.getByLabel(/^SKU\b/).selectOption('CAF-001');
  await main.getByLabel(/^Cantidad a ingresar/).fill('20');
  await main.getByLabel(/^Proveedor/).fill('Finca La Esperanza');
  await main.getByRole('button', { name: 'Registrar entrada' }).click(); await W(p);
  await main.getByRole('tab', { name: /Pedidos y despachos/ }).click();
  for (let i = 0; i < 6; i++) {
    await main.getByRole('button', { name: 'Gestionar' }).nth(i).click(); await W(p, 150);
    await main.getByRole('button', { name: 'Confirmar picking y alistar' }).click(); await W(p, 150);
    await main.locator('tr:has-text("Menor costo") input[type=radio]').first().check();
    await main.getByRole('button', { name: 'Generar guía y despachar' }).click(); await W(p, 150);
    if (i < 3) { await main.getByRole('button', { name: 'Registrar entrega confirmada' }).click(); await W(p, 150); }
  }
  await entregar('04');

  // 05 Promociones
  const crearPromo = async (datos) => {
    await main.getByLabel(/^Nombre\b/).first().fill(datos.nombre);
    await main.getByLabel(/^Tipo\b/).selectOption(datos.tipo);
    for (const [k, v] of Object.entries(datos.campos)) await main.getByLabel(new RegExp('^' + k)).fill(v);
    await main.getByRole('button', { name: 'Crear promoción' }).click(); await W(p, 150);
  };
  await crearPromo({ nombre: 'Temporada cafetera', tipo: 'porcentaje', campos: { Porcentaje: '10' } });
  await crearPromo({ nombre: 'Cupón bienvenida', tipo: 'cupon', campos: { 'Código$': 'CAFE15', Porcentaje: '15' } });
  await crearPromo({ nombre: 'Envío gratis octubre', tipo: 'envio', campos: { 'Compra mínima': '100000', 'Vigente desde': '2026-09-01', 'Vigente hasta': '2026-12-31' } });
  await main.getByLabel(/^Producto\b/).selectOption('CAF-001');
  await main.getByLabel(/^Cant\./).fill('3');
  await main.getByRole('button', { name: 'Agregar', exact: true }).click();
  await main.getByLabel(/^Código de cupón/).fill('CAFE15');
  await main.getByRole('button', { name: 'Registrar prueba' }).click(); await W(p);
  await entregar('05');

  // 06 Pauta
  await main.getByLabel(/^Presupuesto total/).fill('1000000');
  await main.getByLabel(/^Duración/).fill('30');
  await main.getByLabel(/^Objetivo/).selectOption('ventas');
  for (const c of ['Bucaramanga', 'Bogotá', 'Medellín']) await main.getByRole('button', { name: c, exact: true }).click();
  for (const c of ['Café especial', 'Baristas']) await main.getByRole('button', { name: c, exact: true }).click();
  await main.getByLabel('Porcentaje para Google Ads (búsqueda)').fill('60');
  await main.getByLabel('Porcentaje para Meta (Facebook + Instagram)').fill('40');
  const marca = await p.evaluate(() => JSON.parse(localStorage.getItem('senacommerce_v1')).datos[1].marca.nombre);
  await main.getByLabel(/^Titular/).fill('Café de origen a tu puerta');
  await main.getByLabel(/^Texto principal/).fill(`${marca}: café especial colombiano tostado cada semana. Pide hoy.`);
  await main.getByLabel(/^Llamado a la acción/).selectOption('Comprar');
  await main.getByRole('button', { name: 'Guardar plan de medios' }).click(); await W(p);
  console.log('ROAS', await main.locator('text=ROAS').first().locator('..').textContent());
  await entregar('06');

  // 07 Email
  await main.getByLabel(/^Nombre del segmento/).fill('Frecuentes');
  await main.getByRole('button', { name: 'Guardar segmento' }).click(); await W(p, 150);
  await main.locator('input[type=number]').first().fill('1');
  await main.getByLabel(/^Nombre del segmento/).fill('Compradores');
  await main.getByRole('button', { name: 'Guardar segmento' }).click(); await W(p, 150);
  const segVal = await main.getByLabel(/^Segmento destino/).locator('option', { hasText: 'Compradores' }).getAttribute('value');
  await main.getByLabel(/^Segmento destino/).selectOption(segVal);
  await main.getByLabel(/^Asunto/).fill('{nombre}, tu café de origen te espera');
  await main.getByLabel(/^Preheader/).fill('Tostado esta semana y con descuento de bienvenida');
  await main.getByLabel(/^Cuerpo del mensaje/).fill('Hola {nombre}:\n\nEn {tienda} tostamos café esta semana. Usa el cupón {cupon} en tu próxima compra.\n\n{baja}');
  await main.getByText('Excluir contactos sin autorización').click();
  await main.getByRole('button', { name: /^Enviar a/ }).click(); await W(p);
  await entregar('07');

  // 08 Chat
  await main.getByRole('button', { name: 'Iniciar conversación' }).click();
  const patrones = [/Te saluda/, /Qué buen detalle/, /^Cuesta (?!.*muy buena calidad)/, /^Te entiendo/, /^(Sí, recibimos|Por ahora no recibimos)/];
  for (const pat of patrones) {
    await W(p, 900);
    const opts = main.locator('button.block');
    const n = await opts.count(); let ok = false;
    for (let i = 0; i < n; i++) { const t = await opts.nth(i).textContent(); if (pat.test(t)) { await opts.nth(i).click(); ok = true; break; } }
    if (!ok) throw new Error('chat sin opción ' + pat);
  }
  await W(p, 900);
  await main.locator('textarea').fill('¡Gracias por tu compra! Envíame tu dirección, ciudad y teléfono. Te comparto el enlace de pago y la entrega tarda 3 días hábiles.');
  await main.getByRole('button', { name: 'Enviar', exact: true }).click(); await W(p, 800);
  await entregar('08');

  // 09 Tickets
  await W(p, 300);
  const tickets = await p.evaluate(() => JSON.parse(localStorage.getItem('senacommerce_v1')).datos[9].tickets);
  for (let i = 0; i < tickets.length; i++) {
    await main.getByLabel('Tipo').nth(i).selectOption(tickets[i].clave.tipo);
    await main.getByLabel('Prioridad').nth(i).selectOption(tickets[i].clave.prioridad);
    await main.getByLabel('Área').nth(i).selectOption(tickets[i].clave.area);
  }
  await main.getByRole('button', { name: 'Validar clasificación' }).click(); await W(p);
  await entregar('09');

  // 10 Encuestas
  const filas = await main.locator('table tbody tr').evaluateAll(trs => trs.map(tr => { const td = tr.querySelectorAll('td'); return { csat: +td[1].textContent, nps: +td[2].textContent, tema: td[4].textContent }; }));
  const f = [1, 2, 3, 4, 5].map(v => filas.filter(r => r.csat === v).length);
  const prom = filas.filter(r => r.nps >= 9).length, pas = filas.filter(r => r.nps >= 7 && r.nps <= 8).length, det = filas.filter(r => r.nps <= 6).length;
  const temas = {}; filas.filter(r => r.nps <= 6).forEach(r => temas[r.tema] = (temas[r.tema] || 0) + 1);
  const temaTop = Object.entries(temas).sort((a, b) => b[1] - a[1])[0][0];
  for (let v = 1; v <= 5; v++) await main.getByLabel(new RegExp(`^${v} ★`)).fill(String(f[v - 1]));
  await main.getByLabel(/^CSAT %/).fill(((f[3] + f[4]) / filas.length * 100).toFixed(2).replace('.', ','));
  await main.getByLabel(/^Promedio CSAT/).fill((filas.reduce((s, r) => s + r.csat, 0) / filas.length).toFixed(3));
  await main.getByLabel(/^Promotores/).fill(String(prom));
  await main.getByLabel(/^Pasivos/).fill(String(pas));
  await main.getByLabel(/^Detractores/).fill(String(det));
  await main.getByLabel(/^NPS/).fill(((prom - det) / filas.length * 100).toFixed(1));
  await main.getByLabel(/^Tema más mencionado/).selectOption(temaTop);
  const accion = { Entrega: 'Renegociar', Precio: 'Crear un programa', Producto: 'Reforzar', 'Atención': 'Capacitar', Empaque: 'Rediseñar' }[temaTop];
  const optVal = await main.getByLabel(/^Acción de mejora/).locator('option', { hasText: accion }).getAttribute('value');
  await main.getByLabel(/^Acción de mejora/).selectOption(optVal);
  await main.getByRole('button', { name: 'Revisar tabulación' }).click(); await W(p);
  await entregar('10');

  // 11 ROI
  const met = await main.evaluate(() => { const o = {}; document.querySelectorAll('main .grid > div').forEach(d => { const ps = d.querySelectorAll('p'); if (ps.length >= 2) o[ps[0].textContent] = ps[1].textContent; }); return o; });
  const inv = digits(met['Inversión en pauta']), ope = digits(met['Costos operativos']), conv = digits(met['Conversiones reales']), ing = digits(met['Ingresos']), mg = digits(met['Margen bruto']);
  const util_ = ing * mg / 100, tot = inv + ope;
  const vals = { 'ROAS': ing / inv, 'CPA': inv / conv, 'Utilidad bruta': util_, 'Inversión total': tot, 'ROI %': (util_ - tot) / tot * 100, 'ROAS de equilibrio': 100 / mg };
  for (const [k, v] of Object.entries(vals)) await main.getByLabel(new RegExp('^' + k.replace('%', '%') + ' \\(')).fill(v.toFixed(2));
  await main.getByRole('button', { name: vals['ROI %'] > 0 ? 'Sí, el ROI es positivo' : 'No, el ROI es negativo' }).click();
  await main.getByRole('button', { name: 'Revisar cálculos' }).click(); await W(p);
  await entregar('11');

  // 12 Inglés
  const vocab = { 'Tracking number': 'Número de guía', Refund: 'Reembolso', 'Shipping fee': 'Costo de envío', 'Out of stock': 'Agotado', Warranty: 'Garantía', Checkout: 'Finalizar compra', 'Delivery address': 'Dirección de entrega', 'Customer service': 'Servicio al cliente' };
  const selects = main.locator('section').first().locator('select');
  for (let i = 0; i < 8; i++) { const en = (await selects.nth(i).locator('xpath=..').textContent()).replace('🔊', '').split('Selecciona')[0].trim(); await selects.nth(i).selectOption(vocab[Object.keys(vocab).find(k => en.startsWith(k))]); }
  const huecos = ['inconvenience', 'was', 'let', 'process'];
  for (let i = 0; i < 4; i++) await main.getByLabel(`Hueco ${i + 1}`).selectOption(huecos[i]);
  for (const t of ['Thank you for contacting us', "I'm very sorry to hear that", 'we ship nationwide', 'Thank you for your interest', 'Of course!']) await main.getByText(t).click();
  await main.locator('textarea').fill("Hello, thank you for writing to us and I'm sorry for the delay. Your tracking number shows the package is in transit. We will call the carrier today and I will send you an update before Friday so it arrives in time. Please let me know if you need anything else. Best regards.");
  await main.getByRole('button', { name: 'Revisar respuestas' }).click(); await W(p);
  await entregar('12');

  // 14 Correo
  const casoTxt = await main.locator('.bg-papel p.font-black').first().textContent();
  const tk = casoTxt.split(' · ')[0];
  const cliente = (await main.locator('.bg-papel p.font-bold').first().textContent()).split(' · ')[0];
  await main.getByLabel(/^Asunto/).fill(`Respuesta a su reclamo ${tk}`);
  await main.getByLabel(/^Cuerpo del correo/).fill(`Estimada ${cliente}:\n\nLamentamos los inconvenientes que presentó con su compra y le agradecemos informarnos la situación. Revisamos su caso con el equipo responsable y confirmamos lo ocurrido con el pedido.\n\nPara solucionarlo, en un plazo máximo de 3 días hábiles gestionaremos la solución correspondiente y le enviaremos la confirmación por este medio junto con los datos de seguimiento. Si requiere información adicional, puede responder este correo o escribirnos a nuestra línea de WhatsApp.\n\nQuedamos atentos a cualquier inquietud.\n\nCordialmente,\nLaura Gómez\nAsesora de servicio al cliente\n${marca}`);
  await main.getByRole('button', { name: 'Evaluar con la rúbrica' }).click(); await W(p);
  for (const t of ['Claro:', 'Conciso:', 'Cortés:', 'Correcto:']) await main.getByText(t).click();
  await entregar('14');

  // 15 Publicación
  await main.getByLabel(/^Dominio/).fill('tostion-cafe.com.co');
  await main.getByLabel(/^Hosting/).selectOption('GitHub Pages');
  await main.getByLabel(/Certificado SSL activo/).check();
  await main.getByLabel(/^Título SEO/).fill('Café especial colombiano de origen | Tienda');
  await main.getByLabel(/^Meta descripción/).fill('Compra café especial colombiano en grano y molido, tostado cada semana en Bucaramanga. Envíos a toda Colombia y pagos con Nequi y PSE.');
  await main.getByRole('tab', { name: '2. Políticas' }).click();
  const bases = main.getByRole('button', { name: 'Borrador base' });
  for (let i = 0; i < 4; i++) { await bases.nth(i).click(); await W(p, 80); }
  await main.getByRole('tab', { name: /3. Integraciones/ }).click();
  const mapa = {
    'Catálogo de Meta': { id: 'sku', title: 'nombre', description: 'descripcion', price: 'precio', availability: 'stock', brand: 'marca' },
    'Google Merchant Center': { id: 'sku', title: 'nombre', description: 'descripcion', price: 'precio', availability: 'stock', product_type: 'categoria' },
    'Mercado Libre': { seller_sku: 'sku', title: 'nombre', price: 'precio', available_quantity: 'stock', category: 'categoria' },
  };
  for (const [nombre, campos] of Object.entries(mapa)) {
    const card = main.locator('section', { has: p.locator('h3', { hasText: nombre }) });
    await card.getByText('Conectar').click(); await W(p, 100);
    for (const [dest, orig] of Object.entries(campos)) await card.getByLabel(new RegExp('^' + dest + '\\b')).selectOption(orig);
  }
  await main.getByRole('tab', { name: '4. Publicar' }).click();
  await main.getByRole('button', { name: 'Publicar tienda' }).click(); await W(p);
  await entregar('15');

  await p.getByRole('button', { name: 'Portafolio de evidencias' }).click(); await W(p);
  console.log(await p.locator('header [role=progressbar]').textContent());
  console.log(errs.join('\n') || 'sin errores de consola');
  await b.close();
})().catch(async e => { console.error('FALLO', e.message.split('\n')[0]); try { await global.P.screenshot({ path: path.join(__dirname, 'fallo.png'), fullPage: true }); } catch (x) {} process.exit(1); });
