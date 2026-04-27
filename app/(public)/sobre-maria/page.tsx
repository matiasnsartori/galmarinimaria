import type { Metadata } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';

export const metadata: Metadata = {
  title: 'Sobre María',
  description:
    'María de los Ángeles Galmarini — 19 años de experiencia en dirección de nivel inicial y coach certificada.',
};

export default function SobreMariaPage() {
  return (
    <article className="py-12 md:py-16">
      <SiteContainer>
        <div className="grid gap-10 md:grid-cols-[2fr_3fr]">
          <div
            className="aspect-square bg-mint/40 rounded-2xl md:sticky md:top-24 self-start"
            aria-label="Foto de María"
          />
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Sobre María</p>
            <h1 className="mt-2 text-4xl md:text-5xl font-display font-bold">
              María de los Ángeles Galmarini
            </h1>
            <p className="mt-6 text-lg text-ink-soft">
              Profesora de Nivel Inicial con <strong>19 años como directora</strong> en jardines de
              infantes y muchos otros como maestra.
            </p>
            <p className="mt-4 text-lg text-ink-soft">
              Certificada como <strong>Coach Ontológico</strong> y <strong>Coach Educativo</strong>,
              combino la trayectoria de gestión con herramientas del coaching para acompañar a
              quienes están en el camino de crecimiento profesional en educación.
            </p>

            <h2 className="mt-10 text-2xl font-display font-bold">Mi camino</h2>
            <p className="mt-4 text-ink-soft">
              Después de dos décadas al frente de instituciones educativas, descubrí que lo que más
              valor agrega no son las técnicas — son las personas. Entender qué las moviliza, qué
              las frena, y acompañarlas a gestionarlo.
            </p>

            <h2 className="mt-10 text-2xl font-display font-bold">Mi propuesta</h2>
            <p className="mt-4 text-ink-soft">
              &ldquo;Acompaño tu camino.&rdquo; No entreno para aprobar coloquios — entreno para que
              te encuentres con tu mejor versión docente y directiva.
            </p>
          </div>
        </div>
      </SiteContainer>
    </article>
  );
}
