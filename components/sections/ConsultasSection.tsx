import Link from 'next/link';
import type { Route } from 'next';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function ConsultasSection() {
  return (
    <section className="py-16" id="consultas">
      <SiteContainer>
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-ink">Consultas 1:1</h2>
          <p className="mt-3 text-lg text-ink-soft">
            Sesiones individuales para acompañarte en tu proceso personal o profesional.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="text-xl font-display font-semibold">Coach Ontológico</h3>
            <p className="mt-3 text-sm text-ink-soft">
              Reconciliación con tu ser, manejo de miedos y claridad en tus objetivos.
            </p>
          </Card>
          <Card>
            <h3 className="text-xl font-display font-semibold">Coach Educativo</h3>
            <p className="mt-3 text-sm text-ink-soft">
              Acompañamiento en tu práctica docente y desarrollo de liderazgo pedagógico.
            </p>
          </Card>
        </div>
        <div className="mt-8">
          <Button variant="accent" asChild>
            <Link href={'/consultas' as Route}>Reservar una sesión</Link>
          </Button>
        </div>
      </SiteContainer>
    </section>
  );
}
