import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';

import { AceptacionModalComponent } from './aceptacion-modal.component';
import { Envio, EnviosService } from '../../../../core/services/envios.service';

describe('AceptacionModalComponent', () => {
  let component: AceptacionModalComponent;
  let fixture: ComponentFixture<AceptacionModalComponent>;
  let enviosServiceMock: jasmine.SpyObj<EnviosService>;

  const envioBaseMock: Envio = {
    id: 7,
    codigoSeguimiento: 'RTX-2026-000007',
    rutRemitente: '11111111-1',
    rutDestinatario: '22222222-2',
    direccionOrigen: 'Sucursal Providencia',
    direccionDestino: 'Av. Libertad 500, Viña del Mar',
    pesoKg: 4.5,
    estado: 'CREADO',
    fechaCreacion: '2026-11-21T10:00:00Z',
    fechaActualizacion: '2026-11-21T10:00:00Z',
    preregistro: {
      sucursalOrigenId: 2,
      servicioId: 1,
      medidasDeclaradas: {
        largoCm: 30,
        anchoCm: 20,
        altoCm: 10
      },
      precioEstimado: {
        zona: 'URBANA',
        factorZona: 1.0,
        tarifaBase: 3000,
        precioPorKg: 500,
        pesoFacturableKg: 4.5,
        totalClp: 5250
      },
      pesoVerificadoKg: null,
      medidasVerificadas: null,
      precioFinal: null,
      fechaAceptacion: null
    }
  };

  beforeEach(async () => {
    enviosServiceMock = jasmine.createSpyObj('EnviosService', ['aceptar']);

    await TestBed.configureTestingModule({
      imports: [AceptacionModalComponent],
      providers: [
        { provide: EnviosService, useValue: enviosServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AceptacionModalComponent);
    component = fixture.componentInstance;
    component.envio = { ...envioBaseMock };
    fixture.detectChanges();
  });

  it('debe crearse e inicializar el formulario con los datos declarados', () => {
    expect(component).toBeTruthy();
    expect(component.formulario.get('pesoVerificadoKg')?.value).toBe(4.5);
    expect(component.formulario.get('medidas.largoCm')?.value).toBe(30);
    expect(component.formulario.get('medidas.anchoCm')?.value).toBe(20);
    expect(component.formulario.get('medidas.altoCm')?.value).toBe(10);
  });

  it('enviaVerificadoYMuestraPrecioFinal', () => {
    const envioAceptadoMock: Envio = {
      ...envioBaseMock,
      estado: 'ACEPTADO',
      preregistro: {
        ...envioBaseMock.preregistro!,
        pesoVerificadoKg: 4.5,
        medidasVerificadas: { largoCm: 30, anchoCm: 20, altoCm: 10 },
        precioFinal: {
          zona: 'URBANA',
          factorZona: 1.0,
          tarifaBase: 3000,
          precioPorKg: 500,
          pesoFacturableKg: 4.5,
          totalClp: 8900
        },
        fechaAceptacion: '2026-11-21T12:00:00Z'
      }
    };

    enviosServiceMock.aceptar.and.returnValue(of(envioAceptadoMock));
    spyOn(component.aceptado, 'emit');

    component.formulario.patchValue({
      pesoVerificadoKg: 4.5,
      medidas: { largoCm: 30, anchoCm: 20, altoCm: 10 },
      observacion: 'Caja reforzada'
    });

    component.enviar();
    fixture.detectChanges();

    expect(enviosServiceMock.aceptar).toHaveBeenCalledWith(7, {
      pesoVerificadoKg: 4.5,
      largoCm: 30,
      anchoCm: 20,
      altoCm: 10,
      observacion: 'Caja reforzada'
    });

    const textoDom = fixture.nativeElement.textContent;
    expect(textoDom).toContain('8.900');
    expect(component.aceptado.emit).toHaveBeenCalledTimes(1);
    expect(component.aceptado.emit).toHaveBeenCalledWith(envioAceptadoMock);
  });

  it('sinMedidasNiObservacionNoSeEnvian', () => {
    enviosServiceMock.aceptar.and.returnValue(of({ ...envioBaseMock, estado: 'ACEPTADO' }));

    component.formulario.patchValue({
      pesoVerificadoKg: 4.5,
      medidas: { largoCm: null, anchoCm: null, altoCm: null },
      observacion: '   '
    });

    component.enviar();

    expect(enviosServiceMock.aceptar).toHaveBeenCalledWith(7, {
      pesoVerificadoKg: 4.5
    });
  });

  it('dobleEnvioIgnorado', () => {
    const subjectPendiente = new Subject<Envio>();
    enviosServiceMock.aceptar.and.returnValue(subjectPendiente);

    component.enviar();
    component.enviar();

    expect(enviosServiceMock.aceptar).toHaveBeenCalledTimes(1);
  });

  it('envioBloqueadoMuestraMensaje', () => {
    const err409 = new HttpErrorResponse({
      status: 409,
      error: { codigo: 'ENVIO_BLOQUEADO', mensaje: 'Envio actualmente en modificacion' }
    });
    enviosServiceMock.aceptar.and.returnValue(throwError(() => err409));

    component.enviar();
    fixture.detectChanges();

    const textoDom = fixture.nativeElement.textContent;
    expect(textoDom).toContain('Otra persona');
  });

  it('debe cerrar el modal al pulsar la tecla Escape', () => {
    spyOn(component.cerrar, 'emit');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.cerrar.emit).toHaveBeenCalled();
  });
});
