# SenaCommerce · Simulador de comercio electrónico

Simulador web interactivo para el programa **Técnico en Operaciones de Comercio Electrónico**. El aprendiz crea y opera una tienda virtual a lo largo de 15 actividades secuenciales: inicia con la configuración básica del emprendimiento y termina con la tienda publicada e integrada con plataformas del mercado.

Interfaz neobrutalista con tipografía Work Sans, colores de alto contraste y sombras marcadas.

## Cómo usarlo

Opción 1. Abre `index.html` con doble clic. Funciona sin conexión a internet: React, htm, la fuente Work Sans y el CSS compilado de Tailwind están dentro del repositorio.

Opción 2. Publícalo en GitHub Pages, Netlify o cualquier hosting estático. No necesita servidor ni base de datos.

Opción 3. Servidor local para desarrollo:

```bash
npm install
npm start          # http://localhost:8080
```

### Modo instructor

Agrega `?instructor=1` a la URL (`index.html?instructor=1`) para desbloquear todas las actividades y revisar el contenido sin completar el flujo.

## Ruta de aprendizaje

| N.º | Módulo | Actividad | Conexión con el flujo |
| --- | --- | --- | --- |
| 00 | Configuración inicial | Perfil del emprendimiento | Nicho, ciudad de despacho, contacto. El documento genera datos únicos por aprendiz |
| 01 | Gestión de Portafolio | Prompts para IA generativa | Evaluador de 7 elementos del prompt. Produce nombre, eslogan, descripción y colores de marca |
| 02 | Gestión de Portafolio | Medios de pago | Pasarela, comisiones, IVA, transacciones de prueba y análisis de costo neto |
| 03 | Gestión de Portafolio | Catálogo de productos | Formulario validado y carga masiva CSV. SKU, márgenes, variantes, peso volumétrico |
| 04 | Gestión de Portafolio | Inventario y despachos | Kardex, puntos de reorden, picking, cotización de transportadoras y guías |
| 05 | Ventas Digitales | Motor de promociones | Porcentaje, valor fijo, N×M, envío gratis y cupones. Control de margen |
| 06 | Ventas Digitales | Pauta publicitaria | Reparto en Meta, TikTok y Google. Proyección de clics, conversiones y ROAS |
| 07 | Ventas Digitales | Envíos masivos | Segmentación por reglas, etiquetas de personalización y Ley 1581 de 2012 |
| 08 | Ventas Digitales | Venta conversacional | Chat con cliente simulado. Usa precios, cupones y medios de pago reales de la tienda |
| 09 | Posventa | Tickets PQRS | Clasificación por tipo, prioridad y área con SLA. Tickets con pedidos y guías del aprendiz |
| 10 | Posventa | Encuestas de satisfacción | Tabulación de frecuencias, CSAT, NPS y acción de mejora |
| 11 | Transversal | Retorno de inversión | ROAS, CPA, utilidad, ROI y ROAS de equilibrio con los datos de la pauta |
| 12 | Transversal | Soporte en inglés | Vocabulario, frases de servicio, conversaciones con audio y redacción |
| 14 | Transversal | Correo corporativo | Respuesta a un reclamo de la bandeja PQRS evaluada con rúbrica y 4C |
| 15 | Proyecto Final | Publicación e integración | Dominio, SEO, políticas legales, feeds para Meta, Google, Mercado Libre, WhatsApp y marketplaces. Descarga el sitio `index.html` |

La numeración conserva la de la solicitud original, que no incluía la actividad 13. El proyecto final ocupa el número 15.

### Reglas de avance

- Cada actividad tiene una lista de chequeo de la evidencia. El botón **Entregar y desbloquear siguiente** se activa solo cuando se cumplen todos los criterios.
- La actividad siguiente permanece bloqueada hasta aprobar la anterior.
- El progreso se guarda en el navegador (`localStorage`). Desde **Portafolio de evidencias** el aprendiz exporta su progreso en JSON, lo importa en otro equipo o imprime el portafolio en PDF.

## Estructura del código

```
index.html                  Punto de entrada. Carga librerías, núcleo, actividades y app
css/app.css                 Tailwind compilado (no editar a mano)
src/tailwind.css            Fuente de estilos: fuentes, capa base y componentes nb-*
tailwind.config.js          Tokens de color, sombras y tipografía neobrutalista
vendor/                     React 18, ReactDOM, htm y fuente Work Sans (uso sin conexión)
js/core/base.js             Espacio de nombres SC, formato COP, aleatorio con semilla, almacenamiento
js/core/ui.js               Componentes: Boton, Tarjeta, Campo, Entrega, Metrica, GraficoBarras...
js/core/datos.js            Módulos, nichos de negocio, ciudades y generador de personas
js/core/motores.js          Motores de pagos, logística, promociones y proyecto integrado
js/activities/aNN-*.js      Una actividad por archivo
js/app.js                   Estado global, desbloqueo secuencial, navegación y portafolio
tests/recorrido.e2e.js      Recorrido automatizado de las 15 actividades
```

El simulador usa React con [htm](https://github.com/developit/htm) para escribir JSX sin compilación. Cada actividad se registra así:

```js
SC.registrar({
  id: 5,                 // identificador y número visible
  orden: 5,              // posición en el flujo
  modulo: 'ventas',
  titulo: 'Motor de promociones',
  corto: 'Promociones',
  competencia: '...',
  evidencia: '...',
  Componente,            // recibe datos, setDatos, proyecto, completar, hecho
});
```

`proyecto` reúne en un objeto la marca, el catálogo, los medios de pago activos, las promociones, el inventario y la pauta. Así cada fase lee los resultados de las anteriores.

### Agregar una actividad

1. Crea `js/activities/aNN-nombre.js` con la estructura anterior y una lista de `criterios` para el componente `Entrega`.
2. Agrega el `<script>` en `index.html` antes de `js/app.js`.
3. Si usas clases de Tailwind nuevas, ejecuta `npm run build:css`.

## Comandos

```bash
npm install          # dependencias de desarrollo
npm run build        # copia librerías a vendor/ y compila el CSS
npm run build:css    # solo CSS
npm run watch:css    # CSS en modo observación
npm run test:e2e     # recorrido completo (requiere Playwright y Chromium)
```

## Aviso sobre los datos

Las tarifas de transportadoras, comisiones de pasarelas y referencias de CPM, CTR y conversión son valores simulados con fines formativos. No corresponden a tarifas oficiales de ninguna empresa.
