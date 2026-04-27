import Link from 'next/link';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <SiteContainer className="py-24 max-w-xl text-center">
      <p className="text-6xl font-display font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-display font-bold">Página no encontrada</h1>
      <p className="mt-2 text-ink-soft">El contenido que buscás no existe o fue movido.</p>
      <Button className="mt-6" asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </SiteContainer>
  );
}
