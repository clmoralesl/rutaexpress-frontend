import { MsalInterceptorConfiguration } from '@azure/msal-angular';
import { InteractionType } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string> | null>();

  protectedResourceMap.set(
    `${environment.apiUrl}/api/publico/*`,
    null
  );

  protectedResourceMap.set(
    `${environment.apiUrl}/api/bff/catalogo/servicios*`,
    null
  );

  protectedResourceMap.set(
    `${environment.apiUrl}/api/bff/auditoria*`,
    null
  );

  protectedResourceMap.set(
    `${environment.apiUrl}/api/bff/reportes*`,
    null
  );

  protectedResourceMap.set(
    `${environment.apiUrl}/api/*`,
    environment.azure.scopes
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}
