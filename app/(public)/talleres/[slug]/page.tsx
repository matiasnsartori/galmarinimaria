import type { Metadata } from 'next';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getTallerBySlug, getEdicionesAbiertas, getAllTalleres } from '@/features/talleres/queries';
import { formatPrecio } from '@/features/talleres/domain';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const talleres = await getAllTalleres();
  return talleres.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const taller = await getTallerBySlug(slug);
  if (!taller) return { title: 'Taller no encontrado' };
  return {
    title: taller.name,
    description: taller.tagline,
    openGraph: { title: taller.name, description: taller.tagline, type: 'article' },
  };
}

export default async function TallerPage({ params }: Props) {
  const { slug } = await params;
  const taller = await getTallerBySlug(slug);
  if (!taller) notFound();
  const ediciones = await getEdicionesAbiertas(taller.id);

  return (
    <article className="py-12 md:py-16">
      <SiteContainer>
        <Link href="/" className="text-sm text-ink-soft hover:text-ink">
          ← Volver
        </Link>

        <div className="mt-6 max-w-3xl">
          <Badge variant="default">Taller</Badge>
          <h1 className="mt-3 text-4xl md:text-5xl font-display font-bold">{taller.name}</h1>
          <p className="mt-4 text-xl text-ink-soft">{taller.tagline}</p>
          <p className="mt-4 text-base text-ink-soft">{taller.description}</p>
        </div>

        <section className="mt-12 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-2xl font-display font-bold">Programa</h2>
            <div className="mt-6 space-y-5">
              {(taller.programa as { encuentro: number; titulo: string; bullets: string[] }[]).map(
                (e) => (
                  <Card key={e.encuentro}>
                    <p className="text-sm text-primary font-medium">Encuentro {e.encuentro}</p>
                    <h3 className="mt-1 text-lg font-semibold">{e.titulo}</h3>
                    <ul className="mt-3 list-disc list-inside text-sm text-ink-soft space-y-1">
                      {e.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </Card>
                ),
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <Card>
              <p className="text-sm text-ink-soft">Inversión</p>
              <p className="text-3xl font-display font-bold">{formatPrecio(taller.priceArs)}</p>
              <p className="mt-2 text-sm text-ink-soft">
                Duración: {taller.durationMin} min por encuentro · Modalidad: virtual (Meet)
              </p>
            </Card>

            <Card>
              <p className="font-semibold">Ediciones abiertas</p>
              {ediciones.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">
                  No hay ediciones abiertas por el momento.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {ediciones.map((ed) => (
                    <li key={ed.id} className="border-t border-border pt-3">
                      <p className="font-medium">
                        {ed.label} · {ed.groupName}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {ed.timeStart.slice(0, 5)} a {ed.timeEnd.slice(0, 5)} hs
                      </p>
                      <Button size="sm" className="mt-3 w-full" asChild>
                        <Link href={`/inscripcion/${taller.slug}?edicion=${ed.id}` as Route}>
                          Inscribirme
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </section>
      </SiteContainer>
    </article>
  );
}
