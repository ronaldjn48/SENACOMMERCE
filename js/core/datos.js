/*
 * Datos de referencia: módulos de formación, nichos de negocio y bancos de texto.
 * Las tarifas y comisiones son valores simulados con fines formativos.
 */
(function () {
  SC.datos.modulos = [
    { id: 'inicio', nombre: 'Configuración inicial', color: 'papel', descripcion: 'Perfil del aprendiz y del emprendimiento.' },
    { id: 'portafolio', nombre: 'Gestión de Portafolio', color: 'sol', descripcion: 'IA generativa, pagos, catálogo, inventario y despachos.' },
    { id: 'ventas', nombre: 'Ventas Digitales', color: 'fucsia', descripcion: 'Promociones, pauta, email marketing y venta conversacional.' },
    { id: 'posventa', nombre: 'Posventa', color: 'cielo', descripcion: 'PQRS, tickets y medición de satisfacción.' },
    { id: 'transversal', nombre: 'Módulos Transversales', color: 'lila', descripcion: 'Matemática del ROI, inglés y comunicación escrita.' },
    { id: 'proyecto', nombre: 'Proyecto Final', color: 'menta', descripcion: 'Publicación de la tienda e integración con plataformas del mercado.' },
  ];

  SC.datos.nichos = {
    moda: {
      nombre: 'Moda sostenible',
      categorias: ['Camisetas', 'Pantalones', 'Accesorios', 'Calzado'],
      raices: ['Telar', 'Hilo', 'Trama', 'Raíz', 'Urdimbre', 'Algodón'],
      sufijos: ['Studio', 'Co.', 'Moda Consciente', 'Taller', 'Wear'],
      ejemplo: { nombre: 'Camiseta de algodón orgánico', categoria: 'Camisetas', precio: 69000, costo: 32000, variantes: 'Talla: S, M, L, XL | Color: Arena, Negro' },
      intereses: ['Moda sostenible', 'Compras en línea', 'Diseño colombiano', 'Estilo de vida', 'Medio ambiente'],
      productoChat: 'camiseta de algodón orgánico',
    },
    cafe: {
      nombre: 'Café especial colombiano',
      categorias: ['Café en grano', 'Café molido', 'Accesorios de barismo', 'Kits de regalo'],
      raices: ['Tostión', 'Cereza', 'Montaña', 'Origen', 'Grano', 'Cafetal'],
      sufijos: ['Café', 'Coffee Lab', 'Tostadores', 'Origen', 'Club'],
      ejemplo: { nombre: 'Café de Huila en grano 500 g', categoria: 'Café en grano', precio: 42000, costo: 21000, variantes: 'Molienda: Grano, Media, Fina' },
      intereses: ['Café especial', 'Baristas', 'Gastronomía', 'Regalos corporativos', 'Turismo cafetero'],
      productoChat: 'café en grano de origen',
    },
    artesanias: {
      nombre: 'Artesanías colombianas',
      categorias: ['Mochilas', 'Cerámica', 'Tejidos', 'Decoración'],
      raices: ['Chambira', 'Werregue', 'Barro', 'Iraca', 'Kankuamo', 'Telar'],
      sufijos: ['Artesanal', 'Hecho a Mano', 'Casa', 'Raíces', 'Tradición'],
      ejemplo: { nombre: 'Mochila tejida en fique', categoria: 'Mochilas', precio: 185000, costo: 95000, variantes: 'Color: Natural, Tierra, Multicolor' },
      intereses: ['Artesanías', 'Decoración de interiores', 'Cultura colombiana', 'Comercio justo', 'Regalos'],
      productoChat: 'mochila tejida a mano',
    },
    cosmetica: {
      nombre: 'Cosmética natural',
      categorias: ['Cuidado facial', 'Cuidado capilar', 'Jabones', 'Aceites'],
      raices: ['Botánica', 'Flora', 'Semilla', 'Aloe', 'Caléndula', 'Esencia'],
      sufijos: ['Natural', 'Lab', 'Botanics', 'Skin', 'Care'],
      ejemplo: { nombre: 'Sérum facial de caléndula 30 ml', categoria: 'Cuidado facial', precio: 58000, costo: 24000, variantes: 'Tipo de piel: Seca, Mixta, Grasa' },
      intereses: ['Cuidado de la piel', 'Productos naturales', 'Belleza', 'Bienestar', 'Veganismo'],
      productoChat: 'sérum facial natural',
    },
    tecnologia: {
      nombre: 'Accesorios tecnológicos',
      categorias: ['Cargadores', 'Audio', 'Fundas', 'Periféricos'],
      raices: ['Voltio', 'Pixel', 'Nodo', 'Circuito', 'Byte', 'Onda'],
      sufijos: ['Tech', 'Store', 'Gear', 'Digital', 'Hub'],
      ejemplo: { nombre: 'Cargador rápido USB-C 30 W', categoria: 'Cargadores', precio: 79000, costo: 41000, variantes: 'Color: Blanco, Negro' },
      intereses: ['Tecnología', 'Smartphones', 'Gamers', 'Trabajo remoto', 'Gadgets'],
      productoChat: 'cargador rápido USB-C',
    },
    mascotas: {
      nombre: 'Productos para mascotas',
      categorias: ['Alimento', 'Juguetes', 'Accesorios', 'Higiene'],
      raices: ['Huella', 'Colita', 'Patitas', 'Bigotes', 'Ladrido', 'Mascota'],
      sufijos: ['Pet Shop', 'Club', 'Store', 'Amigos', 'Market'],
      ejemplo: { nombre: 'Cama ortopédica para perro talla M', categoria: 'Accesorios', precio: 145000, costo: 72000, variantes: 'Talla: S, M, L | Color: Gris, Azul' },
      intereses: ['Mascotas', 'Perros', 'Gatos', 'Veterinaria', 'Adopción'],
      productoChat: 'cama ortopédica para perro',
    },
  };

  SC.datos.ciudades = [
    { nombre: 'Bogotá', zona: 'principal' },
    { nombre: 'Medellín', zona: 'principal' },
    { nombre: 'Cali', zona: 'principal' },
    { nombre: 'Barranquilla', zona: 'principal' },
    { nombre: 'Bucaramanga', zona: 'principal' },
    { nombre: 'Pereira', zona: 'intermedia' },
    { nombre: 'Pasto', zona: 'intermedia' },
    { nombre: 'Montería', zona: 'intermedia' },
    { nombre: 'Villavicencio', zona: 'intermedia' },
    { nombre: 'Leticia', zona: 'especial' },
    { nombre: 'San Andrés', zona: 'especial' },
    { nombre: 'Mitú', zona: 'especial' },
  ];

  SC.datos.nombres = ['Laura', 'Andrés', 'Valentina', 'Camilo', 'Daniela', 'Santiago', 'Mariana', 'Julián', 'Sofía', 'Felipe', 'Paula', 'Sebastián', 'Isabela', 'Mateo', 'Natalia', 'Juan David', 'Carolina', 'Esteban', 'Luisa', 'Kevin', 'Yuliana', 'Brayan', 'Alejandra', 'Óscar'];
  SC.datos.apellidos = ['Gómez', 'Rodríguez', 'Martínez', 'López', 'García', 'Hernández', 'Ramírez', 'Torres', 'Díaz', 'Moreno', 'Rojas', 'Vargas', 'Castro', 'Ortiz', 'Suárez', 'Cárdenas', 'Mosquera', 'Palacios'];

  // Genera un conjunto estable de personas a partir de la semilla del aprendiz.
  SC.datos.personas = function (rnd, cantidad) {
    const lista = [];
    for (let i = 0; i < cantidad; i++) {
      const nombre = rnd.elegir(SC.datos.nombres);
      const apellido = rnd.elegir(SC.datos.apellidos);
      const usuario = SC.util.normalizar(`${nombre}.${apellido}`).replace(/\s+/g, '');
      lista.push({ nombre, apellido, completo: `${nombre} ${apellido}`, email: `${usuario}${rnd.entero(1, 99)}@correo.co` });
    }
    return lista;
  };
})();
