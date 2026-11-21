import { MsalGuard } from '@azure/msal-angular';
import { routes } from './app.routes';

describe('app.routes', () => {
  const ruta = (p: string) => routes.find(r => r.path === p);

  it('cotizarEsPublicaYDiferida', () => {
    const r = ruta('cotizar');
    expect(r?.loadComponent).toBeDefined();
    expect(r?.component).toBeUndefined();
    expect(r?.canActivate ?? []).toEqual([]);
    expect(routes.indexOf(r!)).toBeLessThan(routes.findIndex(x => x.path === '**'));
  });

  it('enviosDiferidaConGuard', () => {
    const r = ruta('envios');
    expect(r?.loadComponent).toBeDefined();
    expect(r?.component).toBeUndefined();
    expect(r?.canActivate).toEqual([MsalGuard]);
  });
});
