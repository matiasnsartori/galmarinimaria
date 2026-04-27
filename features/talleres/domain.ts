export type EdicionStatus = 'draft' | 'open' | 'closed' | 'done';

export interface EdicionAbiertaInput {
  status: EdicionStatus;
  inscripcionesOpenAt: Date;
  inscripcionesCloseAt: Date;
}

export interface CupoInput {
  capacityMax: number;
  capacityOverride: number | null;
}

export function formatPrecio(ars: number): string {
  if (ars === 0) return 'Gratis';
  return '$' + ars.toLocaleString('es-AR');
}

export function edicionEstaAbierta(edicion: EdicionAbiertaInput, now: Date = new Date()): boolean {
  if (edicion.status !== 'open') return false;
  return now >= edicion.inscripcionesOpenAt && now <= edicion.inscripcionesCloseAt;
}

export function tieneCupo(edicion: CupoInput, inscritos: number): boolean {
  const cap = edicion.capacityOverride ?? edicion.capacityMax;
  return inscritos < cap;
}
