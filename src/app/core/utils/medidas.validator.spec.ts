import { FormControl, FormGroup } from '@angular/forms';
import {
  medidasCompletasONinguna,
  medidasParaEnviar,
  ValorMedidas
} from './medidas.validator';

describe('medidas.validator', () => {
  function crearGrupo(largo: number | null, ancho: number | null, alto: number | null): FormGroup {
    return new FormGroup({
      largoCm: new FormControl(largo),
      anchoCm: new FormControl(ancho),
      altoCm: new FormControl(alto)
    });
  }

  describe('medidasCompletasONinguna', () => {
    it('retorna null con tres campos vacios (null, null, null)', () => {
      const grupo = crearGrupo(null, null, null);
      expect(medidasCompletasONinguna(grupo)).toBeNull();
    });

    it('retorna error con una sola medida (10, null, null)', () => {
      const grupo = crearGrupo(10, null, null);
      expect(medidasCompletasONinguna(grupo)).toEqual({ medidasIncompletas: true });
    });

    it('retorna error con dos medidas (10, 20, null)', () => {
      const grupo = crearGrupo(10, 20, null);
      expect(medidasCompletasONinguna(grupo)).toEqual({ medidasIncompletas: true });
    });

    it('retorna null con las tres medidas completas (10, 20, 30)', () => {
      const grupo = crearGrupo(10, 20, 30);
      expect(medidasCompletasONinguna(grupo)).toBeNull();
    });
  });

  describe('medidasParaEnviar', () => {
    it('retorna objeto vacio con medidas incompletas', () => {
      const m: ValorMedidas = { largoCm: 10, anchoCm: null, altoCm: null };
      expect(medidasParaEnviar(m)).toEqual({});
    });

    it('retorna las tres medidas numericas cuando vienen completas', () => {
      const m: ValorMedidas = { largoCm: 10, anchoCm: 20, altoCm: 30 };
      expect(medidasParaEnviar(m)).toEqual({ largoCm: 10, anchoCm: 20, altoCm: 30 });
    });
  });
});
