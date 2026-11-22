import { generarCodigoBarrasSvg, generarQrSvg } from './etiqueta.util';

describe('Utilidades de Etiqueta Logistica (etiqueta.util)', () => {

  describe('generarCodigoBarrasSvg', () => {
    it('debe generar un elemento SVG con dimensiones y rectangulos para un codigo de seguimiento', () => {
      const svg = generarCodigoBarrasSvg('RTX-297477', 300, 60);

      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('width="300"');
      expect(svg).toContain('height="60"');
      expect(svg).toContain('<rect');
      expect(svg).toContain('RTX-297477');
    });

    it('debe manejar texto vacio o nulo con valor por defecto', () => {
      const svg = generarCodigoBarrasSvg('', 250, 50);

      expect(svg).toContain('<svg');
      expect(svg).toContain('RTX-000000');
    });

    it('debe respetar el parametro mostrarTexto en falso', () => {
      const svg = generarCodigoBarrasSvg('RE-2026-001', 200, 50, false);

      expect(svg).toContain('<svg');
      expect(svg).not.toContain('<text');
    });
  });

  describe('generarQrSvg', () => {
    it('debe generar un SVG valido para una URL de seguimiento', () => {
      const url = 'https://rutaexpress.cl/rastreo/RE-2026-001';
      const svg = generarQrSvg(url, 160);

      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('width="160"');
      expect(svg).toContain('height="160"');
      expect(svg).toContain('<path d="M');
    });

    it('debe soportar cadenas largas cambiando de version sin fallar', () => {
      const urlLarga = 'https://plataforma.rutaexpress.cl/operaciones/rastreo-publico/detallado?codigo=RTX-999888777&origen=bodega-central-stgo';
      const svg = generarQrSvg(urlLarga, 200);

      expect(svg).toContain('<svg');
      expect(svg).toContain('shape-rendering="crispEdges"');
    });
  });
});
