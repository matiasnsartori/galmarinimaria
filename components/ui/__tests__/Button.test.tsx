import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });
  it('applies accent variant when specified', () => {
    render(<Button variant="accent">Accent</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-accent');
  });
  it('applies disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('has 44x44 min touch target', () => {
    render(<Button>T</Button>);
    expect(screen.getByRole('button')).toHaveClass('min-h-[44px]');
  });
});
