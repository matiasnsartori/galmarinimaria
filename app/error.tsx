'use client';
import { SiteContainer } from '@/components/layout/SiteContainer';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SiteContainer className="py-24 max-w-xl text-center">
      <p className="text-6xl font-display font-bold text-accent">Uy</p>
      <h1 className="mt-4 text-2xl font-display font-bold">Algo salió mal</h1>
      <p className="mt-2 text-ink-soft">Probá recargar la página o volvé al inicio.</p>
      {error.digest && <p className="mt-4 text-xs text-muted">ID: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Reintentar
      </Button>
    </SiteContainer>
  );
}
