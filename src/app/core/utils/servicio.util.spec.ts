import { describirServicio } from './servicio.util';
import { ServicioPublico } from '../services/publico.service';

describe('servicio.util', () => {
  it('debe describir un servicio con plazo pero sin limites de peso ni lado', () => {
    const s: ServicioPublico = {
      id: 1,
      codigo: 'EXPRESS',
      nombre: 'Envío Express 24 Horas',
      descripcion: 'Rápido',
      tarifaBase: 3000,
      precioPorKg: 500,
      plazoMinDias: 1,
      plazoMaxDias: 2
    };

    const desc = describirServicio(s);
    expect(desc).toContain('Envío Express 24 Horas - Tarifa base $3.000 + $500/kg');
    expect(desc).toContain('Plazo: 1-2 días hábiles');
  });

  it('debe describir un servicio con plazo y con limites fisicos', () => {
    const s: ServicioPublico = {
      id: 2,
      codigo: 'ESTANDAR',
      nombre: 'Envío Estándar',
      descripcion: 'Normal',
      tarifaBase: 2000,
      precioPorKg: 400,
      plazoMinDias: 2,
      plazoMaxDias: 4,
      pesoMaximoKg: 30,
      ladoMaximoCm: 120
    };

    const desc = describirServicio(s);
    expect(desc).toContain('Envío Estándar - Tarifa base $2.000 + $400/kg');
    expect(desc).toContain('Plazo: 2-4 días hábiles');
    expect(desc).toContain('hasta 30 kg');
    expect(desc).toContain('lado máximo 120 cm');
  });

  it('debe incluir leyenda informativa si no hay plazo ni limites', () => {
    const s: ServicioPublico = {
      id: 3,
      codigo: 'ESPECIAL',
      nombre: 'Envío Especial',
      descripcion: 'Personalizado',
      tarifaBase: 5000,
      precioPorKg: 800
    };

    const desc = describirServicio(s);
    expect(desc).toContain('Envío Especial - Tarifa base $5.000 + $800/kg');
    expect(desc).toContain('Plazo y límites se informan al cotizar');
  });
});
