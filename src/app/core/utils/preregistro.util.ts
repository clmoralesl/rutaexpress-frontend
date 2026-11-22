import { CrearEnvioRequest } from '../services/envios.service';
import { ValorMedidas, medidasParaEnviar } from './medidas.validator';

export interface ValorPreregistro {
  rutRemitente: string;
  rutDestinatario: string;
  sucursalOrigenId: number;
  servicioId: number;
  pesoKg: number;
  medidas: ValorMedidas;
  remitenteEmail: string;
  destino: { idComuna: number; calle: string; numero: string; complemento: string };
}

export function construirSolicitudPreregistro(v: ValorPreregistro, esPersonal: boolean): CrearEnvioRequest {
  const solicitud: CrearEnvioRequest = {
    rutRemitente: v.rutRemitente.trim(),
    rutDestinatario: v.rutDestinatario.trim(),
    sucursalOrigenId: Number(v.sucursalOrigenId),
    servicioId: Number(v.servicioId),
    pesoKg: Number(v.pesoKg),
    destino: {
      calle: v.destino.calle.trim(),
      numero: v.destino.numero.trim(),
      complemento: v.destino.complemento?.trim() || null,
      idComuna: Number(v.destino.idComuna)
    },
    ...medidasParaEnviar(v.medidas)
  };
  if (esPersonal) {
    solicitud.remitenteEmail = v.remitenteEmail.trim();
  }
  return solicitud;
}
