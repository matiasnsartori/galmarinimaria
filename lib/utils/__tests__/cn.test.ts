import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('handles conditional', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
  it('dedupes tailwind classes with later winning', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
