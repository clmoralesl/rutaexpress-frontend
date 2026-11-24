import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { inicializarConfigEjecucion, mostrarErrorConfiguracion } from './app/core/config/config-ejecucion';

let configuracionValida = true;
try {
  inicializarConfigEjecucion();
} catch (error) {
  configuracionValida = false;
  mostrarErrorConfiguracion(document, error);
  console.error(error);
}

if (configuracionValida) {
  bootstrapApplication(App, appConfig).catch((err) => console.error(err));
}
