import Link from 'next/link';
import type { Route } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function Hero() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <SiteContainer>
        <div className="max-w-3xl">
          <Badge variant="default">Próximo taller · Mayo 2026</Badge>
          <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-display font-bold text-ink leading-[1.05]">
            Gestioná tus miedos. <span className="text-primary">Caminá hacia el éxito.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-soft max-w-2xl">
            Preparación integral para el coloquio de ascenso a cargos directivos, con el
            acompañamiento de María de los Ángeles Galmarini — 19 años de experiencia en dirección
            de nivel inicial.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href={'/talleres/coloquio' as Route}>Inscribirme al taller</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={'/consultas' as Route}>Reservar consulta 1:1</Link>
            </Button>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
