import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import {
  MSAL_INSTANCE,
  MsalBroadcastService,
  MsalService
} from '@azure/msal-angular';

import {
  BrowserCacheLocation,
  IPublicClientApplication,
  PublicClientApplication
} from '@azure/msal-browser';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.azure.clientId,
      authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
      redirectUri: environment.azure.redirectUri
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage
    }
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    provideHttpClient(withInterceptorsFromDi()),

    {
  provide: MSAL_INSTANCE,
  useFactory: msalInstanceFactory
},

MsalService,
MsalBroadcastService
  ]
};