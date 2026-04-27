import type { Metadata } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buildWhatsappUrl } from '@/components/layout/whatsappUrl';

export const metadata: Metadata = {
  title: 'Consultas 1:1',
  description:
    'Sesiones individuales de Coach Ontológico y Coach Educativo con María de los Ángeles Galmarini.',
};

const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '541126132412';

export default function ConsultasPage() {
  return (
    <article className="py-12 md:py-16">
      <SiteContainer>
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold">Consultas 1:1</h1>
          <p className="mt-4 text-xl text-ink-soft">
            Un espacio de acompañamiento individual, a tu ritmo y en tu contexto.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="text-xl font-display font-semibold">Coach Ontológico</h2>
            <p className="mt-3 text-sm text-ink-soft">
              Sesiones para trabajar tu relación con los miedos, la posibilidad y el propósito. 60
              minutos.
            </p>
            <Button className="mt-5" asChild>
              <a
                href={buildWhatsappUrl(
                  whatsapp,
                  'Hola María, quiero consultar por una sesión de Coach Ontológico.',
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar por WhatsApp
              </a>
            </Button>
          </Card>
          <Card>
            <h2 className="text-xl font-display font-semibold">Coach Educativo</h2>
            <p className="mt-3 text-sm text-ink-soft">
              Acompañamiento pedagógico para docentes en ejercicio o aspirantes a cargos directivos.
              60 minutos.
            </p>
            <Button className="mt-5" asChild>
              <a
                href={buildWhatsappUrl(
                  whatsapp,
                  'Hola María, quiero consultar por una sesión de Coach Educativo.',
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar por WhatsApp
              </a>
            </Button>
          </Card>
        </div>

        <p className="mt-8 text-sm text-ink-soft">
          Próximamente podrás reservar tu sesión y pagar directamente desde esta página.
        </p>
      </SiteContainer>
    </article>
  );
}
