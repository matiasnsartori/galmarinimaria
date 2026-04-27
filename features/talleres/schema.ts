import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum, time } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const edicionStatus = pgEnum('edicion_status', ['draft', 'open', 'closed', 'done']);

export const talleres = pgTable('talleres', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull(),
  description: text('description').notNull(),
  programa: jsonb('programa').notNull(),
  priceArs: integer('price_ars').notNull(),
  capacityMin: integer('capacity_min').notNull(),
  capacityMax: integer('capacity_max').notNull(),
  durationMin: integer('duration_min').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  heroImageUrl: text('hero_image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ediciones = pgTable('ediciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tallerId: uuid('taller_id').notNull().references(() => talleres.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  groupName: text('group_name').notNull(),
  dates: jsonb('dates').notNull(),
  timeStart: time('time_start').notNull(),
  timeEnd: time('time_end').notNull(),
  meetLink: text('meet_link'),
  capacityOverride: integer('capacity_override'),
  inscripcionesOpenAt: timestamp('inscripciones_open_at').notNull(),
  inscripcionesCloseAt: timestamp('inscripciones_close_at').notNull(),
  status: edicionStatus('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const talleresRelations = relations(talleres, ({ many }) => ({
  ediciones: many(ediciones),
}));

export const edicionesRelations = relations(ediciones, ({ one }) => ({
  taller: one(talleres, { fields: [ediciones.tallerId], references: [talleres.id] }),
}));

export type Taller = typeof talleres.$inferSelect;
export type Edicion = typeof ediciones.$inferSelect;
export type NewTaller = typeof talleres.$inferInsert;
export type NewEdicion = typeof ediciones.$inferInsert;
