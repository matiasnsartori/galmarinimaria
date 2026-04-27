import 'dotenv/config';
import { db } from '../lib/db/client';
import { talleres, ediciones } from '../lib/db/schema';

async function seed() {
  console.log('Seeding talleres...');

  const [tallerColoquio] = await db
    .insert(talleres)
    .values({
      slug: 'coloquio',
      name: 'Taller de Coloquio',
      tagline: 'Gestioná tus miedos, estudiá desde la posibilidad, caminá hacia el éxito.',
      description:
        'Preparación integral para el coloquio de ascenso, con el acompañamiento de María de los Ángeles Galmarini.',
      programa: [
        {
          encuentro: 1,
          titulo: 'Coloquio — ideas principales',
          bullets: [
            'Qué es un coloquio',
            'Momentos de su desarrollo',
            'Características del coloquio',
            'Claves para la resolución exitosa',
          ],
        },
        {
          encuentro: 2,
          titulo: 'Problemáticas: lectura consciente y facilitadores',
          bullets: [
            'Qué es una problemática en coloquio',
            'Desglose e interpretación',
            'Temas comunes',
            'Práctica',
          ],
        },
        {
          encuentro: 3,
          titulo: 'Desarrolla confianza',
          bullets: [
            'Relajación y concentración',
            'Tema de base',
            'Comunicación verbal y no verbal',
            'Manejo de la interacción',
            'Práctica',
          ],
        },
      ],
      priceArs: 30000,
      capacityMin: 3,
      capacityMax: 12,
      durationMin: 90,
      isActive: true,
      heroImageUrl: null,
    })
    .returning();

  if (!tallerColoquio) {
    throw new Error('Insert returned no rows for talleres');
  }

  console.log('Seeding ediciones...');

  await db.insert(ediciones).values([
    {
      tallerId: tallerColoquio.id,
      label: 'Mayo 2026',
      groupName: 'Grupo mañana',
      dates: ['2026-05-02', '2026-05-09', '2026-05-16'],
      timeStart: '08:30:00',
      timeEnd: '10:00:00',
      meetLink: null,
      capacityOverride: null,
      inscripcionesOpenAt: new Date('2026-04-20T00:00:00-03:00'),
      inscripcionesCloseAt: new Date('2026-04-30T23:59:00-03:00'),
      status: 'open',
    },
    {
      tallerId: tallerColoquio.id,
      label: 'Mayo 2026',
      groupName: 'Grupo tarde',
      dates: ['2026-05-02', '2026-05-09', '2026-05-16'],
      timeStart: '10:30:00',
      timeEnd: '12:00:00',
      meetLink: null,
      capacityOverride: null,
      inscripcionesOpenAt: new Date('2026-04-20T00:00:00-03:00'),
      inscripcionesCloseAt: new Date('2026-04-30T23:59:00-03:00'),
      status: 'open',
    },
  ]);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
