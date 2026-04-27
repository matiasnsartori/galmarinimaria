import { describe, it, expect } from 'vitest';
import { formatPrecio, edicionEstaAbierta, tieneCupo } from '../domain';

describe('formatPrecio', () => {
  it('formats ARS with thousand separators', () => {
    expect(formatPrecio(30000)).toBe('$30.000');
  });
  it('handles zero as free', () => {
    expect(formatPrecio(0)).toBe('Gratis');
  });
  it('handles large amounts', () => {
    expect(formatPrecio(1500000)).toBe('$1.500.000');
  });
});

describe('edicionEstaAbierta', () => {
  const now = new Date('2026-04-24T12:00:00Z');

  it('returns true when status open and within window', () => {
    expect(
      edicionEstaAbierta(
        {
          status: 'open',
          inscripcionesOpenAt: new Date('2026-04-20T00:00:00Z'),
          inscripcionesCloseAt: new Date('2026-04-30T00:00:00Z'),
        },
        now,
      ),
    ).toBe(true);
  });

  it('returns false when status draft', () => {
    expect(
      edicionEstaAbierta(
        {
          status: 'draft',
          inscripcionesOpenAt: new Date('2026-04-20T00:00:00Z'),
          inscripcionesCloseAt: new Date('2026-04-30T00:00:00Z'),
        },
        now,
      ),
    ).toBe(false);
  });

  it('returns false when before open window', () => {
    expect(
      edicionEstaAbierta(
        {
          status: 'open',
          inscripcionesOpenAt: new Date('2026-05-01T00:00:00Z'),
          inscripcionesCloseAt: new Date('2026-05-10T00:00:00Z'),
        },
        now,
      ),
    ).toBe(false);
  });

  it('returns false when after close window', () => {
    expect(
      edicionEstaAbierta(
        {
          status: 'open',
          inscripcionesOpenAt: new Date('2026-04-01T00:00:00Z'),
          inscripcionesCloseAt: new Date('2026-04-20T00:00:00Z'),
        },
        now,
      ),
    ).toBe(false);
  });
});

describe('tieneCupo', () => {
  it('returns true when inscritos less than capacity', () => {
    expect(tieneCupo({ capacityMax: 12, capacityOverride: null }, 5)).toBe(true);
  });
  it('returns false when inscritos equal to capacity', () => {
    expect(tieneCupo({ capacityMax: 12, capacityOverride: null }, 12)).toBe(false);
  });
  it('uses capacityOverride when set', () => {
    expect(tieneCupo({ capacityMax: 12, capacityOverride: 20 }, 15)).toBe(true);
    expect(tieneCupo({ capacityMax: 12, capacityOverride: 8 }, 8)).toBe(false);
  });
});
