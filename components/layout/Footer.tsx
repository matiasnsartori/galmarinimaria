import Link from 'next/link';
import type { Route } from 'next';
import { SiteContainer } from './SiteContainer';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-ink text-surface">
      <SiteContainer className="py-12 grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold">Abriendo Caminos</p>
          <p className="mt-2 text-sm opacity-80">
            María de los Ángeles Galmarini — Coach Ontológico y Educativo. 19 años de experiencia en
            dirección de nivel inicial.
          </p>
        </div>
        <div>
          <p className="font-display text-sm uppercase tracking-wider opacity-70">Navegación</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li>
              <Link href={'/talleres/coloquio' as Route} className="hover:underline">
                Taller de Coloquio
              </Link>
            </li>
            <li>
              <Link href={'/consultas' as Route} className="hover:underline">
                Consultas 1:1
              </Link>
            </li>
            <li>
              <Link href={'/sobre-maria' as Route} className="hover:underline">
                Sobre María
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-display text-sm uppercase tracking-wider opacity-70">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>WhatsApp: +54 9 11 2613 2412 (L-J de 10 a 15h)</li>
          </ul>
          <p className="mt-6 text-xs opacity-60">G.E.P · Gestión Educativa Práctica</p>
        </div>
      </SiteContainer>
      <div className="border-t border-surface/10">
        <SiteContainer className="py-4 text-xs opacity-60">
          © {new Date().getFullYear()} Abriendo Caminos. Todos los derechos reservados.
        </SiteContainer>
      </div>
    </footer>
  );
}
