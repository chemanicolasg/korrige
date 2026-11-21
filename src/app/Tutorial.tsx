import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui';
import { PLAN } from '../config';

const STEPS: { title: string; text: string; tip: string }[] = [
  {
    title: 'Crea el examen y descarga la hoja',
    text: 'Elige el número de preguntas, las opciones y los modelos. Korrige genera la hoja de respuestas en PDF, con su código QR y, si quieres, el logotipo de tu centro.',
    tip: 'Cada examen tiene su propia hoja: no sirven las de otro examen.',
  },
  {
    title: 'Imprime al 100 % y examina',
    text: 'Imprime la hoja en papel normal a «tamaño real», nunca con «ajustar a página». Los alumnos rellenan las burbujas con bolígrafo azul o negro.',
    tip: 'Puedes imprimir una hoja y fotocopiarla.',
  },
  {
    title: 'Escanea todo el taco de golpe',
    text: 'Coloca las hojas en el alimentador de la fotocopiadora y envíatelas por correo como un único PDF (300 ppp, sin grapas). Da igual si alguna va al revés.',
    tip: 'Tienes la guía completa en el menú «Guía de impresión y escaneo».',
  },
  {
    title: 'Sube el PDF y revisa solo lo dudoso',
    text: 'En segundos tienes las notas. Las dobles marcas, las marcas flojas o los identificadores incompletos quedan en «Revisión» con la imagen, para que decidas con un clic.',
    tip: 'Después: estadísticas por pregunta y exportación a Excel o Moodle.',
  },
  {
    title: 'Publica las respuestas para tus alumnos (opcional)',
    text: 'Desde el resumen del examen puedes publicar las respuestas correctas, al momento o a partir de una fecha y hora. Los alumnos entran en korrige.es/comprobar con el código que les des y se comprueban con lo que anotaron en su cuadernillo.',
    tip: 'Tú decides el código y si pueden calcular su nota. No se muestran notas ni datos de ningún alumno.',
  },
];

/** Tutorial de inicio: se muestra la primera vez que alguien entra en la aplicación. */
export function Tutorial({ canCreateExam, onClose }: { canCreateExam: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const last = i === STEPS.length - 1;
  const s = STEPS[i];
  return (
    <Modal title="Cómo funciona Korrige" onClose={onClose}>
      <div data-testid="tutorial">
        <p className="label-mono text-brand-700">
          Paso {i + 1} de {STEPS.length}
        </p>
        <h3 className="display mt-2 text-2xl text-ink">{s.title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{s.text}</p>
        <p className="mt-3 border-l-[3px] border-brand-700 bg-brand-50 px-4 py-2.5 text-sm text-slate-700">{s.tip}</p>
        {last && canCreateExam && <p className="mt-3 text-sm font-medium text-ink">Tu primer examen es gratis y completo ({PLAN.freeExams} examen, sin tarjeta).</p>}
        <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, j) => (
            <span key={j} className={`h-2.5 w-2.5 rounded-full border-[1.5px] ${j === i ? 'border-brand-700 bg-brand-700' : 'border-rose-500'}`} />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button className="text-sm text-slate-500 underline-offset-4 hover:underline" onClick={onClose}>
            Saltar tutorial
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button className="btn" onClick={() => setI(i - 1)}>
                Anterior
              </button>
            )}
            {last ? (
              <button
                className="btn-primary"
                onClick={() => {
                  onClose();
                  if (canCreateExam) nav('/app/examenes/nuevo');
                }}
              >
                {canCreateExam ? 'Crear mi primer examen' : 'Empezar'}
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setI(i + 1)} autoFocus>
                Siguiente
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
