/** Textos de la landing en español (idioma de referencia). */
export const es = {
  nav: { how: 'Cómo funciona', features: 'Funcionalidades', privacy: 'Privacidad', faq: 'Preguntas frecuentes', sales: 'Hablar con ventas', login: 'Acceder', demo: 'Probar la demo' },
  hero: {
    kicker: 'Para universidades, facultades y academias',
    title: 'Corrige cientos de exámenes tipo test en minutos con la impresora que ya tienes',
    subtitle:
      'Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF. Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar.',
    note: 'Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.',
    stats: [
      ['≈ 1 s', 'por hoja leída'],
      ['200', 'preguntas por examen'],
      ['0', 'hardware nuevo'],
    ],
  },
  problem: {
    title: 'Corregir tests no debería llevarte la tarde',
    intro: 'Hoy un examen tipo test de 150 alumnos se corrige de una de estas tres formas. Ninguna es buena.',
    cards: [
      ['A mano, con plantilla perforada', 'Horas de trabajo mecánico, errores al sumar y ninguna estadística de las preguntas. Y si hay que anular una, vuelta a empezar.'],
      ['Con apps de móvil, foto a foto', 'Una foto por hoja, con buena luz y buen pulso. Con 150 hojas son 150 fotos, y los datos acaban en el móvil personal de cada profesor.'],
      ['Con lectoras ópticas dedicadas', 'Máquinas caras, hojas preimpresas de proveedor y un único puesto en toda la facultad por el que hay que pasar.'],
    ],
    table: {
      head: ['', 'A mano', 'App de móvil', 'Lectora óptica', 'Korrige'],
      rows: [
        ['Cómo se leen 150 hojas', 'Una a una, con plantilla', 'Una foto por hoja', 'En la máquina dedicada', 'Un escaneo del taco entero'],
        ['Qué hay que comprar', 'Nada', 'Nada', 'Lectora y hojas del proveedor', 'Nada: la fotocopiadora que ya hay'],
        ['Dónde quedan los datos', 'En papel', 'En el móvil de cada profesor', 'En el puesto de la lectora', 'En la organización, con acceso por profesor'],
        ['Si se anula una pregunta', 'Se vuelve a corregir', 'Depende de la app', 'Depende del equipo', 'Se recalcula todo al instante'],
      ],
    },
    after: 'La multifunción del pasillo ya escanea 100 hojas por minuto y te las envía por correo en un PDF. Solo faltaba quien las leyera.',
  },
  how: {
    title: 'Cómo funciona',
    subtitle: 'Cuatro pasos. El único nuevo es subir un PDF.',
    steps: [
      ['Crea el examen y descarga la hoja', 'Elige nº de preguntas, opciones y modelos. Korrige genera la hoja de respuestas en PDF con su código QR.'],
      ['Imprime y examina', 'En papel normal, con cualquier impresora. Los alumnos marcan con bolígrafo azul o negro.'],
      ['Escanea todo el taco', 'Pon las hojas en el alimentador de tu fotocopiadora y envíatelas por correo como un único PDF. Da igual si alguna va al revés.'],
      ['Sube el PDF y obtén las notas', 'En segundos tienes notas, incidencias para revisar y estadísticas por pregunta. Exporta a Excel o a Moodle.'],
    ],
  },
  features: {
    title: 'Todo lo que necesita un examen de verdad',
    items: [
      ['Varios modelos de examen', 'Hasta 4 modelos con su propia plantilla. La hoja-plantilla del profesor también se puede escanear con el taco.'],
      ['Penalización configurable', 'Sin penalización, fórmula clásica o la tuya. Anula una pregunta o acepta dos respuestas y todo se recalcula al instante.'],
      ['Revisión de dudas con imagen', 'Dobles marcas, marcas flojas o un NIA mal rellenado: ves el recorte de la hoja y decides con un clic.'],
      ['Estadísticas por pregunta', 'Dificultad, discriminación y análisis de distractores. Detecta las preguntas candidatas a anulación.'],
      ['Exporta a Excel y a Moodle', 'Notas listas para el acta: .xlsx completo y CSV que Moodle importa directamente.'],
      ['Registro de cambios', 'Cada corrección manual queda anotada: quién, cuándo, valor anterior y nuevo. Ideal para revisiones y reclamaciones.'],
      ['Pensado para equipos', 'Organizaciones con administradores y profesores. Comparte un examen con otro profesor como coautor.'],
      ['Hasta 200 preguntas', 'De 10 a 200 preguntas, de 3 a 5 opciones, identificador de 6 a 10 dígitos (NIA, DNI, expediente…).'],
    ],
  },
  privacy: {
    title: 'Privacidad y seguridad desde el diseño',
    subtitle: 'Los exámenes son datos personales de tus alumnos. Los tratamos como tales.',
    items: [
      ['Las hojas se leen en tu ordenador', 'El PDF escaneado se procesa en el navegador del profesor. No se envía a ningún servidor de procesamiento: solo se guarda una imagen comprimida de cada hoja para la revisión.'],
      ['Servidores en la Unión Europea', 'La base de datos y las imágenes se alojan en la UE.'],
      ['Acceso por organización', 'Cada profesor ve solo sus exámenes y los que le compartan. Ningún dato de una organización es accesible desde otra.'],
      ['RGPD', 'Plazo de conservación de imágenes configurable, borrado completo de cualquier examen y registro de actividad.'],
    ],
  },
  faq: {
    title: 'Preguntas frecuentes',
    items: [
      ['¿Qué escáner necesito?', 'Cualquier fotocopiadora o multifunción con alimentador automático que escanee a PDF (Xerox, Canon, Ricoh, Konica Minolta, HP…). Recomendamos 300 ppp en blanco y negro o escala de grises. También sirve un escáner de sobremesa.'],
      ['¿Bolígrafo o lápiz?', 'Bolígrafo azul o negro, rellenando la burbuja entera. El lápiz blando suele funcionar, pero las marcas flojas se envían a revisión para que decidas tú.'],
      ['¿Qué pasa si un alumno marca dos respuestas?', 'La pregunta va a la cola de revisión con el recorte de la imagen. Decides con un clic si cuenta una de las dos, se deja en blanco o es nula, y queda registrado.'],
      ['¿Puedo usar mis propias hojas?', 'No: la hoja la genera Korrige para cada examen, con su código QR y sus marcas de esquina. A cambio puedes configurar preguntas, opciones, modelos, identificador y cabecera, e imprimirla donde quieras.'],
      ['¿Cuántas preguntas admite?', 'De 10 a 200 por examen. Hasta 100 caben en una página; a partir de ahí la hoja tiene dos páginas y Korrige las empareja por alumno.'],
      ['¿Se integra con Moodle?', 'Exporta un CSV que se importa directamente en el calificador de Moodle (por número de ID o por email). También un Excel completo con las respuestas de cada alumno.'],
      ['¿Y si el escáner mete una hoja torcida o al revés?', 'Las cuatro marcas de las esquinas permiten enderezar cada hoja, y si está boca abajo se gira sola.'],
    ],
  },
  sales: {
    title: 'Hablar con ventas',
    subtitle: 'Cuéntanos cuántos profesores sois y te preparamos una demo con vuestras propias hojas. Respondemos en un día laborable.',
    bullets: ['Piloto gratuito con un departamento', 'Alta de toda la facultad en una tarde', 'Formación para el profesorado incluida'],
    name: 'Nombre y apellidos',
    email: 'Email de trabajo',
    institution: 'Institución',
    role: 'Cargo',
    teachers: 'Nº aproximado de profesores',
    teachersOptions: ['1–10', '11–50', '51–200', 'Más de 200'],
    phone: 'Teléfono (opcional)',
    message: 'Mensaje',
    messagePlaceholder: '¿Qué asignaturas, cuántos exámenes al año, qué fotocopiadoras tenéis…?',
    privacy: 'He leído y acepto la',
    privacyLink: 'política de privacidad',
    submit: 'Enviar',
    sending: 'Enviando…',
    okTitle: '¡Gracias! Hemos recibido tu mensaje',
    okText: 'Te escribiremos muy pronto al email que nos has dejado.',
    errors: {
      required: 'Rellena los campos obligatorios y acepta la política de privacidad.',
      email: 'Revisa el email: no parece válido.',
      rate: 'Has enviado varios mensajes seguidos. Espera unos minutos, o escríbenos a',
      generic: 'No se ha podido enviar. Inténtalo de nuevo o escríbenos a',
    },
  },
  cta: { title: '¿Lo vemos con uno de tus exámenes?', text: 'Prueba la demo ahora mismo en tu navegador, sin registrarte.' },
  footer: { tagline: 'Corrección de exámenes tipo test con hoja óptica.', contact: 'Contacto', legal: 'Legal', legalNotice: 'Aviso legal', privacy: 'Privacidad', cookies: 'Cookies', guide: 'Guía de impresión y escaneo', rights: 'Todos los derechos reservados.' },
};

export type Dict = typeof es;
