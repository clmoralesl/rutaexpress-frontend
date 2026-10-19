
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import { provideRouter, Router } from '@angular/router';

import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS
} from '@angular/common/http';

import {
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalService,
  MsalGuard,
  MsalInterceptor,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration
} from '@azure/msal-angular';

import {
  BrowserCacheLocation,
  InteractionType,
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

export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: environment.azure.scopes
    }
  };
}

export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();

  protectedResourceMap.set(
    `${environment.apiUrl}/*`,
    environment.azure.scopes
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideZoneChangeDetection({
      eventCoalescing: true
    }),

    provideRouter(routes),

    provideHttpClient(withInterceptorsFromDi()),

    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },

    {
      provide: MSAL_INSTANCE,
      useFactory: msalInstanceFactory
    },

    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: msalGuardConfigFactory
    },

    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: msalInterceptorConfigFactory
    },

    MsalService,
    MsalBroadcastService,
    MsalGuard,

    provideAppInitializer(async () => {
      const msalService = inject(MsalService);
      const router = inject(Router);

      await msalService.instance.initialize();

      try {
        const resultado =
          await msalService.instance.handleRedirectPromise();

        if (!resultado?.account) {
          return;
        }

        msalService.instance.setActiveAccount(resultado.account);

        const tokenResult =
          await msalService.instance.acquireTokenSilent({
            account: resultado.account,
            scopes: environment.azure.scopes
          });

        sessionStorage.setItem(
          'access_token',
          tokenResult.accessToken
        );

        // La navegación se realizará cuando Angular arranque.
        sessionStorage.setItem(
          'rutaexpress_login_completado',
          'true'
        );

      } catch (error) {
        console.error(
          'Error procesando la redirección de Microsoft',
          error
        );
      }
    })
  ]
};
