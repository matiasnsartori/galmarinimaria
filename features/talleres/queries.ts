import { db } from '@/lib/db/client';
import { talleres, ediciones } from './schema';
import { eq, and } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';

export async function getTallerBySlug(slug: string) {
  'use cache';
  cacheLife('max');
  cacheTag('talleres', `taller:${slug}`);

  const rows = await db.select().from(talleres).where(eq(talleres.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getAllTalleres() {
  'use cache';
  cacheLife('max');
  cacheTag('talleres');

  return db.select().from(talleres).where(eq(talleres.isActive, true));
}

export async function getEdicionesAbiertas(tallerId: string) {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300 });
  cacheTag('ediciones', `taller:${tallerId}`);

  return db
    .select()
    .from(ediciones)
    .where(and(eq(ediciones.tallerId, tallerId), eq(ediciones.status, 'open')));
}
