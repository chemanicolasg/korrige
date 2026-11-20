import { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { APP_DOMAIN, APP_NAME, CONTACT_EMAIL } from '../config';
import { Logo } from '../components/ui';

// La titular solo se nombra una vez (aviso legal); en el resto se habla de «la titular de Korrige».
const HOLDER = 'Carlota M.';
const HOLDER_REF = `la titular de ${APP_NAME}`;

const DOCS: Record<string, { title: string; body: ReactNode }> = {
  'aviso-legal': {
    title: 'Aviso legal',
    body: (
      <>
        <h2>1. Titular del sitio</h2>
        <p>
          En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de que el sitio web{' '}
          {APP_DOMAIN} es titularidad de {HOLDER}. Contacto: {CONTACT_EMAIL}.
        </p>
        <h2>2. Objeto</h2>
        <p>
          {APP_NAME} es una plataforma para la corrección de exámenes tipo test mediante hojas de respuestas escaneadas, dirigida a universidades, facultades y academias.
        </p>
        <h2>3. Condiciones de uso</h2>
        <p>
          El usuario se compromete a utilizar la plataforma conforme a la ley y a estas condiciones, y es responsable de la custodia de sus credenciales y de los datos que
          introduzca. La organización que contrata el servicio es responsable de contar con base jurídica para tratar los datos de sus alumnos.
        </p>
        <h2>4. Propiedad intelectual</h2>
        <p>El software, el diseño y los contenidos del sitio pertenecen a su titular o a sus licenciantes. Los exámenes y resultados pertenecen a cada organización.</p>
        <h2>5. Responsabilidad</h2>
        <p>
          La lectura automática puede contener errores; la plataforma señala las marcas dudosas para su revisión, y la calificación final es responsabilidad del
          profesorado.
        </p>
        <h2>6. Legislación aplicable</h2>
        <p>
          Este aviso se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales de la ciudad de Barcelona, salvo que
          la normativa aplicable establezca otro fuero.
        </p>
      </>
    ),
  },
  privacidad: {
    title: 'Política de privacidad',
    body: (
      <>
        <h2>1. Quién trata los datos</h2>
        <p>
          <b>Formulario de contacto y cuentas de profesores:</b> el responsable del tratamiento es {HOLDER_REF} ({CONTACT_EMAIL}).
        </p>
        <p>
          <b>Datos de alumnos (identificadores, hojas escaneadas, respuestas y notas):</b> el responsable es la universidad, facultad o academia que usa {APP_NAME};{' '}
          {HOLDER_REF} actúa como <b>encargado del tratamiento</b> conforme al contrato de encargo (art. 28 RGPD) firmado con cada organización.
        </p>
        <h2>2. Qué datos se tratan y para qué</h2>
        <ul>
          <li>Contacto comercial: nombre, email, institución, cargo, teléfono y mensaje, para responder a la solicitud (base: consentimiento / medidas precontractuales).</li>
          <li>Profesores: nombre, email y actividad en la plataforma, para prestar el servicio (base: ejecución del contrato).</li>
          <li>Alumnos: identificador, nombre y email si la organización importa la lista de clase, imagen de la hoja de respuestas, respuestas y calificaciones, para la corrección de exámenes por cuenta de la organización.</li>
        </ul>
        <h2>3. Dónde se procesan</h2>
        <p>
          Los PDF escaneados se leen en el navegador del profesor y no se envían a ningún servidor. Se almacenan en servidores situados en la Unión Europea los
          resultados de la lectura y una imagen comprimida de cada hoja para revisión y reclamaciones. Proveedores (subencargados): Supabase (base de datos y
          almacenamiento, región UE), Netlify (alojamiento web) y Resend (envío de correo).
        </p>
        <h2>4. Conservación</h2>
        <p>
          Cada organización configura el plazo de conservación de las imágenes de las hojas tras cerrar un examen y puede borrar por completo cualquier examen. Los datos
          de contacto comercial se conservan mientras dure la relación y, como máximo, 24 meses desde el último contacto.
        </p>
        <h2>5. Derechos</h2>
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {CONTACT_EMAIL}. Los alumnos deben dirigirse a
          su centro, que es el responsable. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
        </p>
        <h2>6. Seguridad</h2>
        <p>Control de acceso por organización a nivel de base de datos, comunicaciones cifradas y registro de actividad de todas las correcciones.</p>
      </>
    ),
  },
  cookies: {
    title: 'Política de cookies',
    body: (
      <>
        <h2>Qué usamos</h2>
        <p>
          {APP_NAME} no utiliza cookies publicitarias ni de analítica de terceros. Solo usa almacenamiento técnico del navegador, imprescindible para funcionar, que no
          requiere consentimiento:
        </p>
        <ul>
          <li>
            <b>Sesión</b> (almacenamiento local): mantiene iniciada la sesión del profesor.
          </li>
          <li>
            <b>Preferencias</b> (almacenamiento local): organización activa e idioma.
          </li>
          <li>
            <b>Modo demo</b> (almacenamiento local e IndexedDB): los datos de la demo se guardan solo en tu navegador.
          </li>
          <li>
            <b>Anti-abuso del formulario</b> (almacenamiento local): fecha de los últimos envíos del formulario de contacto.
          </li>
        </ul>
        <h2>Cómo borrarlo</h2>
        <p>Puedes eliminar estos datos desde la configuración de tu navegador (borrar datos del sitio). Si en el futuro se añadieran cookies no técnicas, se pedirá tu consentimiento antes.</p>
      </>
    ),
  },
};

export default function Legal() {
  const { doc } = useParams();
  const d = DOCS[doc ?? ''];
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link to="/" className="text-lg">
        <Logo />
      </Link>
      {!d ? (
        <p className="mt-10">Documento no encontrado.</p>
      ) : (
        <article className="mt-8">
          <h1 className="text-3xl font-semibold text-slate-900">{d.title}</h1>
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <b>Texto plantilla pendiente de revisión legal.</b>
          </p>
          <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-slate-700 [&_h2]:mt-7 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">{d.body}</div>
        </article>
      )}
      <nav className="mt-10 flex gap-4 border-t border-slate-200 pt-4 text-sm text-brand-700" aria-label="Documentos legales">
        <Link to="/legal/aviso-legal">Aviso legal</Link>
        <Link to="/legal/privacidad">Privacidad</Link>
        <Link to="/legal/cookies">Cookies</Link>
      </nav>
    </div>
  );
}
