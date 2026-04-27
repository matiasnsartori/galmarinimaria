import { describe, it, expect } from 'vitest';
import { buildWhatsappUrl } from '../whatsappUrl';

describe('buildWhatsappUrl', () => {
  it('builds url with encoded message', () => {
    expect(buildWhatsappUrl('541126132412', 'Hola María')).toBe(
      'https://wa.me/541126132412?text=Hola%20Mar%C3%ADa',
    );
  });
  it('strips leading + from number', () => {
    expect(buildWhatsappUrl('+541126132412', 'hi')).toBe('https://wa.me/541126132412?text=hi');
  });
});
