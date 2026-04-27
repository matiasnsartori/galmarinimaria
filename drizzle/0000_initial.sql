CREATE TYPE "public"."edicion_status" AS ENUM('draft', 'open', 'closed', 'done');--> statement-breakpoint
CREATE TABLE "ediciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" uuid NOT NULL,
	"label" text NOT NULL,
	"group_name" text NOT NULL,
	"dates" jsonb NOT NULL,
	"time_start" time NOT NULL,
	"time_end" time NOT NULL,
	"meet_link" text,
	"capacity_override" integer,
	"inscripciones_open_at" timestamp NOT NULL,
	"inscripciones_close_at" timestamp NOT NULL,
	"status" "edicion_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talleres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"programa" jsonb NOT NULL,
	"price_ars" integer NOT NULL,
	"capacity_min" integer NOT NULL,
	"capacity_max" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"hero_image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "talleres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "ediciones" ADD CONSTRAINT "ediciones_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE cascade ON UPDATE no action;