import Link from 'next/link';
import type { Route } from 'next';
import { SiteContainer } from './SiteContainer';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <SiteContainer className="flex items-center justify-between py-4">
        <Link href="/" className="font-display text-xl font-bold text-ink">
          Abriendo Caminos
        </Link>
        <nav aria-label="Principal" className="hidden md:flex items-center gap-6 text-sm">
          <Link href={'/talleres/coloquio' as Route} className="text-ink-soft hover:text-ink">
            Taller
          </Link>
          <Link href={'/consultas' as Route} className="text-ink-soft hover:text-ink">
            Consultas
          </Link>
          <Link href={'/sobre-maria' as Route} className="text-ink-soft hover:text-ink">
            Sobre María
          </Link>
        </nav>
        <Button size="sm" asChild>
          <Link href={'/talleres/coloquio' as Route}>Inscribirme</Link>
        </Button>
      </SiteContainer>
    </header>
  );
}
