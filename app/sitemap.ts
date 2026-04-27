import type { MetadataRoute } from 'next';
import { getAllTalleres } from '@/features/talleres/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const talleres = await getAllTalleres();

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/consultas`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/sobre-maria`, changeFrequency: 'monthly', priority: 0.7 },
    ...talleres.map((t) => ({
      url: `${base}/talleres/${t.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];
}
