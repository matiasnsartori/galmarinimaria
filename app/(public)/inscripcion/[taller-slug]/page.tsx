import { notFound } from 'next/navigation';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getTallerBySlug, getAllTalleres } from '@/features/talleres/queries';
import { buildWhatsappUrl } from '@/components/layout/whatsappUrl';

interface Props {
  params: Promise<{ 'taller-slug': string }>;
}

const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '541126132412';

export async function generateStaticParams() {
  const talleres = await getAllTalleres();
  return talleres.map((t) => ({ 'taller-slug': t.slug }));
}

export default async function InscripcionPage({ params }: Props) {
  const { 'taller-slug': slug } = await params;
  const taller = await getTallerBySlug(slug);
  if (!taller) notFound();

  return (
    <article className="py-12 md:py-16">
      <SiteContainer className="max-w-2xl">
        <Card>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Inscripción al {taller.name}
          </h1>
          <p className="mt-4 text-ink-soft">
            Estamos terminando de integrar el pago en línea con Mercado Pago. Mientras tanto,
            escribinos por WhatsApp y coordinamos tu inscripción.
          </p>
          <Button className="mt-6" asChild>
            <a
              href={buildWhatsappUrl(whatsapp, `Hola María, quiero inscribirme al ${taller.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Inscribirme por WhatsApp
            </a>
          </Button>
        </Card>
      </SiteContainer>
    </article>
  );
}
