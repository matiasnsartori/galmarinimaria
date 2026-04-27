import Link from 'next/link';
import type { Route } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getTallerBySlug, getEdicionesAbiertas } from '@/features/talleres/queries';
import { formatPrecio } from '@/features/talleres/domain';

export async function TallerSection() {
  const taller = await getTallerBySlug('coloquio');
  if (!taller) return null;
  const ediciones = await getEdicionesAbiertas(taller.id);

  return (
    <section className="py-16 bg-mint/20" id="taller-coloquio">
      <SiteContainer>
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-ink">{taller.name}</h2>
          <p className="mt-3 text-lg text-ink-soft">{taller.tagline}</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="text-xl font-display font-semibold">Programa</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              {(taller.programa as { encuentro: number; titulo: string }[]).map((e) => (
                <li key={e.encuentro}>
                  <strong className="text-ink">Encuentro {e.encuentro}</strong> — {e.titulo}
                </li>
              ))}
            </ul>
            <Button className="mt-6" asChild>
              <Link href={`/talleres/${taller.slug}` as Route}>Ver detalle completo</Link>
            </Button>
          </Card>

          <Card>
            <h3 className="text-xl font-display font-semibold">Ediciones abiertas</h3>
            {ediciones.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">
                No hay ediciones abiertas por el momento.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {ediciones.map((ed) => (
                  <li key={ed.id} className="p-3 rounded-lg border border-border">
                    <p className="font-medium">
                      {ed.label} · {ed.groupName}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {ed.timeStart.slice(0, 5)} a {ed.timeEnd.slice(0, 5)} hs
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-lg font-bold">{formatPrecio(taller.priceArs)}</p>
          </Card>
        </div>
      </SiteContainer>
    </section>
  );
}
