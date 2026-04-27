import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';

const testimonios = [
  {
    nombre: 'A.M.',
    texto:
      'El taller me dio claridad y confianza. Pasé el coloquio con más seguridad de la que esperaba.',
  },
  {
    nombre: 'C.R.',
    texto: 'La forma en que María desarma el miedo es única. Gracias infinitas.',
  },
];

export function TestimoniosSection() {
  return (
    <section className="py-16" id="testimonios">
      <SiteContainer>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-ink">
          Lo que dicen quienes pasaron por el taller
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {testimonios.map((t) => (
            <Card key={t.nombre}>
              <p className="text-ink-soft italic">&ldquo;{t.texto}&rdquo;</p>
              <p className="mt-4 text-sm font-medium">— {t.nombre}</p>
            </Card>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
