import { MsalInterceptorConfiguration } from '@azure/msal-angular';
import { InteractionType } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';
import { obtenerApiUrl } from '../config/config-ejecucion';

export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const base = obtenerApiUrl();
  const protectedResourceMap = new Map<string, Array<string> | null>();

  protectedResourceMap.set(
    `${base}/api/publico/*`,
    null
  );

  protectedResourceMap.set(
    `${base}/api/bff/catalogo/servicios*`,
    null
  );

  protectedResourceMap.set(
    `${base}/api/bff/auditoria*`,
    null
  );

  protectedResourceMap.set(
    `${base}/api/bff/reportes*`,
    null
  );

  protectedResourceMap.set(
    `${base}/api/*`,
    environment.azure.scopes
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}
