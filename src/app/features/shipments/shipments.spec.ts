import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { Shipments } from './shipments';
import { EnviosService, Envio, Region } from '../../core/services/envios.service';
import { SesionService } from '../../core/auth/sesion.service';
import { NotificationService } from '../../shared/feedback/notification.service';
import { PublicoService, ServicioPublico, SucursalPublica } from '../../core/services/publico.service';

describe('Shipments Component', () => {
  let component: Shipments;
  let fixture: ComponentFixture<Shipments>;
  let enviosServiceMock: jasmine.SpyObj<EnviosService>;
  let publicoServiceMock: jasmine.SpyObj<PublicoService>;
  let sesionServiceMock: jasmine.SpyObj<SesionService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let mockQueryParamMap = convertToParamMap({});

  const mockRegiones: Region[] = [
    {
      idRegion: 13,
      nombre: 'Metropolitana de Santiago',
      comunas: [
        { idComuna: 13101, nombre: 'Santiago' },
        { idComuna: 13123, nombre: 'Providencia' }
      ]
    },
    {
      idRegion: 5,
      nombre: 'Valparaíso',
      comunas: [
        { idComuna: 5101, nombre: 'Valparaíso' },
        { idComuna: 5109, nombre: 'Viña del Mar' }
      ]
    }
  ];

  const mockSucursales: SucursalPublica[] = [
    {
      id: 1,
      nombre: 'Sucursal Central',
      calle: 'Moneda',
      numero: '1150',
      complemento: null,
      idComuna: 13101,
      horario: '09:00 a 18:00'
    },
    {
      id: 2,
      nombre: 'Sucursal Providencia',
      calle: 'Av. Providencia',
      numero: '1234',
      complemento: null,
      idComuna: 13123,
      horario: '09:00 a 19:00'
    }
  ];

  const mockServicios: ServicioPublico[] = [
    {
      id: 1,
      codigo: 'EXPRESS-24H',
      nombre: 'Envío Express 24 Horas',
      descripcion: 'Rápido',
      tarifaBase: 3000,
      precioPorKg: 500,
      plazoMinDias: 1,
      plazoMaxDias: 2
    },
    {
      id: 2,
      codigo: 'ESTANDAR',
      nombre: 'Envío Estándar',
      descripcion: 'Económico',
      tarifaBase: 2000,
      precioPorKg: 400
    }
  ];

  const listaEnviosMock: Envio[] = [
    {
      id: 1,
      codigoSeguimiento: 'RTX-2026-000001',
      rutRemitente: '11111111-1',
      rutDestinatario: '22222222-2',
      direccionOrigen: 'Sucursal Providencia',
      direccionDestino: 'Av. Libertad 500, Viña del Mar, Valparaíso',
      pesoKg: 2.5,
      estado: 'CREADO',
      fechaCreacion: '2026-10-18T10:00:00Z',
      fechaActualizacion: '2026-10-18T10:00:00Z',
      preregistro: {
        sucursalOrigenId: 2,
        servicioId: 1,
        medidasDeclaradas: null,
        precioEstimado: {
          zona: 'URBANA',
          factorZona: 1.0,
          tarifaBase: 3000,
          precioPorKg: 500,
          pesoFacturableKg: 2.5,
          totalClp: 4250
        },
        pesoVerificadoKg: null,
        medidasVerificadas: null,
        precioFinal: null,
        fechaAceptacion: null
      }
    },
    {
      id: 2,
      codigoSeguimiento: 'RTX-2026-000002',
      rutRemitente: '33333333-3',
      rutDestinatario: '44444444-4',
      direccionOrigen: 'Sucursal Central',
      direccionDestino: 'Av. Marina 200, Viña del Mar, Valparaíso',
      pesoKg: 6.0,
      estado: 'ACEPTADO',
      fechaCreacion: '2026-10-19T12:00:00Z',
      fechaActualizacion: '2026-10-19T12:00:00Z',
      preregistro: {
        sucursalOrigenId: 1,
        servicioId: 2,
        medidasDeclaradas: null,
        precioEstimado: {
          zona: 'URBANA',
          factorZona: 1.0,
          tarifaBase: 2000,
          precioPorKg: 400,
          pesoFacturableKg: 6.0,
          totalClp: 4400
        },
        pesoVerificadoKg: 6.0,
        medidasVerificadas: null,
        precioFinal: {
          zona: 'URBANA',
          factorZona: 1.0,
          tarifaBase: 2000,
          precioPorKg: 400,
          pesoFacturableKg: 6.0,
          totalClp: 4400
        },
        fechaAceptacion: '2026-10-19T13:00:00Z'
      }
    }
  ];

  beforeEach(async () => {
    mockQueryParamMap = convertToParamMap({});

    enviosServiceMock = jasmine.createSpyObj('EnviosService', [
      'listar',
      'crear',
      'actualizarEstado',
      'solicitarEtiqueta',
      'obtenerRegiones'
    ]);
    publicoServiceMock = jasmine.createSpyObj('PublicoService', [
      'obtenerSucursales',
      'obtenerServicios'
    ]);
    sesionServiceMock = jasmine.createSpyObj('SesionService', ['tieneRol']);
    notificationServiceMock = jasmine.createSpyObj('NotificationService', [
      'info',
      'success',
      'warning',
      'error'
    ]);

    enviosServiceMock.listar.and.returnValue(of(listaEnviosMock));
    enviosServiceMock.solicitarEtiqueta.and.returnValue(of(undefined as unknown as void));
    enviosServiceMock.obtenerRegiones.and.returnValue(of(mockRegiones));
    publicoServiceMock.obtenerSucursales.and.returnValue(of(mockSucursales));
    publicoServiceMock.obtenerServicios.and.returnValue(of(mockServicios));

    // Por defecto asume rol ADMIN (acceso completo)
    sesionServiceMock.tieneRol.and.callFake((...r: string[]) => r.some((x) => ['ADMIN'].includes(x)));

    await TestBed.configureTestingModule({
      imports: [Shipments],
      providers: [
        provideRouter([]),
        { provide: EnviosService, useValue: enviosServiceMock },
        { provide: PublicoService, useValue: publicoServiceMock },
        { provide: SesionService, useValue: sesionServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return mockQueryParamMap;
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Shipments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar listado de envios y catalogos', () => {
    expect(component).toBeTruthy();
    expect(enviosServiceMock.listar).toHaveBeenCalled();
    expect(enviosServiceMock.obtenerRegiones).toHaveBeenCalled();
    expect(publicoServiceMock.obtenerSucursales).toHaveBeenCalled();
    expect(publicoServiceMock.obtenerServicios).toHaveBeenCalled();
    expect(component.envios.length).toBe(2);
    expect(component.regiones.length).toBe(2);
    expect(component.sucursales.length).toBe(2);
    expect(component.servicios.length).toBe(2);
  });

  it('debe filtrar comunas dependientes al seleccionar una region de destino', () => {
    const mockSelectEvent = {
      target: { value: '13' }
    } as unknown as Event;

    component.onRegionDestinoChange(mockSelectEvent);

    expect(component.comunasDestino.length).toBe(2);
    expect(component.comunasDestino[0].nombre).toBe('Santiago');
    expect(component.formularioEnvio.get('destino.idComuna')?.value).toBe(0);
  });

  it('debe asignar S/N al activar checkbox de sin numero y restaurar vacio al desmarcar en destino', () => {
    const eventChecked = {
      target: { checked: true }
    } as unknown as Event;

    component.toggleSinNumeroDestino(eventChecked);
    expect(component.formularioEnvio.get('destino.numero')?.value).toBe('S/N');

    const eventUnchecked = {
      target: { checked: false }
    } as unknown as Event;

    component.toggleSinNumeroDestino(eventUnchecked);
    expect(component.formularioEnvio.get('destino.numero')?.value).toBe('');
  });

  it('clienteNoVeRemitenteEmail', () => {
    sesionServiceMock.tieneRol.and.callFake((...r: string[]) => r.some((x) => ['CLIENTE'].includes(x)));
    component.configurarValidacionRemitenteEmail();
    fixture.detectChanges();

    const inputEmail = fixture.debugElement.query(By.css('#pre-remitente-email'));
    expect(inputEmail).toBeNull();

    component.formularioEnvio.patchValue({
      rutRemitente: '11111111-1',
      rutDestinatario: '22222222-2',
      sucursalOrigenId: 1,
      servicioId: 2,
      pesoKg: 3.5,
      medidas: { largoCm: null, anchoCm: null, altoCm: null },
      remitenteEmail: '',
      destino: {
        idRegion: 13,
        idComuna: 13101,
        calle: 'Moneda',
        numero: '1150',
        complemento: ''
      }
    });

    expect(component.formularioEnvio.valid).toBeTrue();
  });

  it('personalVeRemitenteEmailObligatorio', () => {
    // Caso 1: ADMIN
    sesionServiceMock.tieneRol.and.callFake((...r: string[]) => r.some((x) => ['ADMIN'].includes(x)));
    component.configurarValidacionRemitenteEmail();
    fixture.detectChanges();
    let inputEmail = fixture.debugElement.query(By.css('#pre-remitente-email'));
    expect(inputEmail).toBeTruthy();
    component.formularioEnvio.get('remitenteEmail')?.setValue('');
    expect(component.formularioEnvio.get('remitenteEmail')?.hasError('required')).toBeTrue();

    // Caso 2: DESPACHADOR
    sesionServiceMock.tieneRol.and.callFake((...r: string[]) => r.some((x) => ['DESPACHADOR'].includes(x)));
    component.configurarValidacionRemitenteEmail();
    fixture.detectChanges();
    inputEmail = fixture.debugElement.query(By.css('#pre-remitente-email'));
    expect(inputEmail).toBeTruthy();
    component.formularioEnvio.get('remitenteEmail')?.setValue('');
    expect(component.formularioEnvio.get('remitenteEmail')?.hasError('required')).toBeTrue();

    // Caso 3: ADMIN y CLIENTE
    sesionServiceMock.tieneRol.and.callFake((...r: string[]) => r.some((x) => ['ADMIN', 'CLIENTE'].includes(x)));
    component.configurarValidacionRemitenteEmail();
    fixture.detectChanges();
    inputEmail = fixture.debugElement.query(By.css('#pre-remitente-email'));
    expect(inputEmail).toBeTruthy();
    component.formularioEnvio.get('remitenteEmail')?.setValue('');
    expect(component.formularioEnvio.get('remitenteEmail')?.hasError('required')).toBeTrue();
  });

  it('aceptadoNoSeOfrecePorPut', () => {
    expect(component.obtenerTransiciones('CREADO')).toEqual(['CANCELADO']);
  });

  it('botonAceptarSoloPersonalYConServicio', () => {
    // 1. Con ADMIN: envío 1 (CREADO y con servicioId) -> debe tener el botón
    sesionServiceMock.tieneRol.and.callFake((...r: string[]) => r.some((x) => ['ADMIN'].includes(x)));
    fixture.detectChanges();
    const btnAceptar = fixture.debugElement.query(By.css('.boton-aceptar-sucursal'));
    expect(btnAceptar).toBeTruthy();

    // 2. Con OPERADOR: no puede gestionar estados -> no debe tener el botón
    sesionServiceMock.tieneRol.and.callFake((...r: string[]) => r.some((x) => ['OPERADOR'].includes(x)));
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.boton-aceptar-sucursal'))).toBeNull();

    // 3. Con ADMIN pero con envío en ACEPTADO o sin servicioId
    sesionServiceMock.tieneRol.and.callFake((...r: string[]) => r.some((x) => ['ADMIN'].includes(x)));
    const enviosSinServicio: Envio[] = [
      {
        ...listaEnviosMock[0],
        estado: 'CREADO',
        preregistro: null
      }
    ];
    enviosServiceMock.listar.and.returnValue(of(enviosSinServicio));
    component.cargarEnvios();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.boton-aceptar-sucursal'))).toBeNull();
    const aviso = fixture.debugElement.query(By.css('.aviso-sin-servicio'));
    expect(aviso).toBeTruthy();
    expect(aviso.nativeElement.textContent).toContain('Envío anterior al pre-registro');
  });

  it('muestraPrecioEstimadoDelServidor', () => {
    const envioCreadoMock: Envio = {
      id: 10,
      codigoSeguimiento: 'RTX-2026-NUEVO1',
      rutRemitente: '11111111-1',
      rutDestinatario: '22222222-2',
      direccionOrigen: 'Sucursal Central',
      direccionDestino: 'Moneda 1150',
      pesoKg: 3.5,
      estado: 'CREADO',
      fechaCreacion: '2026-11-21T10:00:00Z',
      fechaActualizacion: '2026-11-21T10:00:00Z',
      preregistro: {
        sucursalOrigenId: 1,
        servicioId: 2,
        medidasDeclaradas: null,
        precioEstimado: {
          zona: 'URBANA',
          factorZona: 1.0,
          tarifaBase: 3000,
          precioPorKg: 500,
          pesoFacturableKg: 3.5,
          totalClp: 5700
        },
        pesoVerificadoKg: null,
        medidasVerificadas: null,
        precioFinal: null,
        fechaAceptacion: null
      }
    };

    enviosServiceMock.crear.and.returnValue(of(envioCreadoMock));

    component.formularioEnvio.setValue({
      rutRemitente: '11111111-1',
      rutDestinatario: '22222222-2',
      sucursalOrigenId: 1,
      servicioId: 2,
      pesoKg: 3.5,
      medidas: { largoCm: null, anchoCm: null, altoCm: null },
      remitenteEmail: 'admin@rutaexpress.cl',
      destino: {
        idRegion: 13,
        idComuna: 13101,
        calle: 'Moneda',
        numero: '1150',
        complemento: ''
      }
    });

    component.crearEnvio();
    fixture.detectChanges();

    expect(enviosServiceMock.crear).toHaveBeenCalled();
    const textoDom = fixture.nativeElement.textContent;
    expect(textoDom).toContain('5.700');
  });

  it('servicioIdDeLaConsultaSePreselecciona', () => {
    mockQueryParamMap = convertToParamMap({ servicioId: '2' });
    component.ngOnInit();
    expect(component.formularioEnvio.get('servicioId')?.value).toBe(2);
  });

  it('debe permitir filtrar envios por estado y fechas', () => {
    component.estado = 'CREADO';
    component.fechaDesde = '2026-10-01';
    component.fechaHasta = '2026-10-20';
    component.cargarEnvios();

    expect(enviosServiceMock.listar).toHaveBeenCalledWith({
      estado: 'CREADO',
      fechaDesde: '2026-10-01',
      fechaHasta: '2026-10-20'
    });
  });

  it('debe limpiar filtros y recargar', () => {
    component.estado = 'CREADO';
    component.limpiarFiltros();

    expect(component.estado).toBe('');
    expect(component.fechaDesde).toBe('');
    expect(component.fechaHasta).toBe('');
    expect(enviosServiceMock.listar).toHaveBeenCalled();
  });

  it('debe abrir modal de etiqueta y notificar asincronamente a RabbitMQ', () => {
    const envio = listaEnviosMock[0];
    component.abrirEtiqueta(envio);

    expect(component.etiquetaModalVisible).toBeTrue();
    expect(component.envioSeleccionadoEtiqueta).toEqual(envio);
    expect(enviosServiceMock.solicitarEtiqueta).toHaveBeenCalledWith(envio.id);
    expect(component.encoladoRabbitMQ).toBeTrue();
  });

  it('debe abrir y cerrar modal de aceptacion', () => {
    const envio = listaEnviosMock[0];
    component.abrirAceptacion(envio);

    expect(component.aceptacionModalVisible).toBeTrue();
    expect(component.envioSeleccionadoAceptacion).toEqual(envio);

    component.cerrarAceptacion();
    expect(component.aceptacionModalVisible).toBeFalse();
    expect(component.envioSeleccionadoAceptacion).toBeNull();
  });

  it('errorDePreregistroUsaTraductor', () => {
    const error422 = new HttpErrorResponse({
      status: 422,
      error: { codigo: 'COMUNA_NO_CUBIERTA', mensaje: 'x' }
    });
    enviosServiceMock.crear.and.returnValue(throwError(() => error422));

    component.formularioEnvio.patchValue({
      rutRemitente: '11111111-1',
      rutDestinatario: '22222222-2',
      remitenteEmail: 'remitente@test.com',
      sucursalOrigenId: 1,
      servicioId: 1,
      pesoKg: 2,
      destino: {
        idRegion: 13,
        idComuna: 13101,
        calle: 'Moneda',
        numero: '1150'
      }
    });

    component.crearEnvio();
    expect(component.error).toContain('no llega a la comuna de destino');

    const error400 = new HttpErrorResponse({
      status: 400,
      error: {
        mensaje: 'Error de validación en la solicitud',
        errores: { pesoKg: 'El peso no puede superar 500 kg' }
      }
    });
    enviosServiceMock.crear.and.returnValue(throwError(() => error400));

    component.crearEnvio();
    expect(component.error).toContain('El peso no puede superar 500 kg');
  });

  it('crearDeshabilitadoSiFallanCatalogos', () => {
    publicoServiceMock.obtenerServicios.and.returnValue(
      throwError(() => new Error('Error al cargar servicios'))
    );
    component.ngOnInit();
    fixture.detectChanges();

    const botonCrear = fixture.debugElement.query(By.css('.acciones-formulario button[type="submit"]'));
    expect(botonCrear.nativeElement.disabled).toBeTrue();
  });

  it('ayudaMedidasEnlazada', () => {
    // 1. Estado inicial sin error
    for (const idCampo of ['pre-largo', 'pre-ancho', 'pre-alto']) {
      const input = fixture.debugElement.query(By.css(`#${idCampo}`));
      expect(input).withContext(`El input #${idCampo} debe existir`).toBeTruthy();
      const describedBy = input.nativeElement.getAttribute('aria-describedby');
      expect(describedBy).withContext(`El input #${idCampo} debe tener aria-describedby`).toBeTruthy();
      expect(describedBy).not.toContain('pre-medidas-error');
      const ids = describedBy ? describedBy.split(/\s+/).filter(Boolean) : [];
      for (const id of ids) {
        const el = fixture.debugElement.query(By.css(`#${id}`));
        expect(el).withContext(`El elemento #${id} referenciado por #${idCampo} debe existir en el DOM`).toBeTruthy();
      }
    }

    // 2. Estado con error de medidas incompletas
    component.formularioEnvio.get('medidas')?.patchValue({ largoCm: 10, anchoCm: null, altoCm: null });
    fixture.detectChanges();

    for (const idCampo of ['pre-largo', 'pre-ancho', 'pre-alto']) {
      const input = fixture.debugElement.query(By.css(`#${idCampo}`));
      const describedBy = input.nativeElement.getAttribute('aria-describedby');
      expect(describedBy).toContain('pre-medidas-error');
      const ids = describedBy ? describedBy.split(/\s+/).filter(Boolean) : [];
      for (const id of ids) {
        const el = fixture.debugElement.query(By.css(`#${id}`));
        expect(el).withContext(`El elemento #${id} referenciado por #${idCampo} debe existir en el DOM`).toBeTruthy();
      }
    }
  });
});
