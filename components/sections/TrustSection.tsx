import Link from 'next/link';
import type { Route } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';

export function TrustSection() {
  return (
    <section className="py-16 bg-surface border-y border-border" id="sobre-maria">
      <SiteContainer>
        <div className="grid gap-10 md:grid-cols-[2fr_3fr] items-start">
          <div className="aspect-square bg-mint/40 rounded-2xl" aria-hidden />
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Sobre María</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold">
              María de los Ángeles Galmarini
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              Profesora de Nivel Inicial con 19 años como directora. Coach Ontológico y Coach
              Educativo certificada. Acompaño el camino de docentes que quieren crecer.
            </p>
            <Button className="mt-6" variant="outline" asChild>
              <Link href={'/sobre-maria' as Route}>Conocé más sobre mi trayectoria</Link>
            </Button>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
