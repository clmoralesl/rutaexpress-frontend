import { formatearClp } from './formato.util';

describe('formato.util', () => {
  it('formatea montos en pesos chilenos sin decimales', () => {
    const texto = formatearClp(12345);
    expect(texto).toContain('12.345');
    expect(texto).toContain('$');
  });

  it('formatea cero adecuadamente', () => {
    const texto = formatearClp(0);
    expect(texto).toContain('0');
    expect(texto).toContain('$');
  });
});
