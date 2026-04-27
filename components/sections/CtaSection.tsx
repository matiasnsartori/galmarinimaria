import Link from 'next/link';
import type { Route } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';

export function CtaSection() {
  return (
    <section className="py-16 bg-primary text-surface">
      <SiteContainer className="text-center max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-display font-bold">
          ¿Listas para el próximo paso?
        </h2>
        <p className="mt-4 text-lg opacity-90">
          Sumate al Taller de Coloquio o reservá una consulta 1:1. Yo te acompaño.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="accent" size="lg" asChild>
            <Link href={'/talleres/coloquio' as Route}>Inscribirme al taller</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-surface text-surface hover:bg-surface hover:text-primary"
            asChild
          >
            <Link href={'/consultas' as Route}>Reservar consulta</Link>
          </Button>
        </div>
      </SiteContainer>
    </section>
  );
}
