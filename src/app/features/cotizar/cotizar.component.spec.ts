import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { CotizarComponent } from './cotizar.component';
import {
  AVISO_REFERENCIAL,
  CotizacionPublica,
  PublicoService,
  ServicioPublico,
  SucursalPublica
} from '../../core/services/publico.service';
import { Region } from '../../core/services/envios.service';

describe('CotizarComponent', () => {
  let component: CotizarComponent;
  let fixture: ComponentFixture<CotizarComponent>;
  let publicoServiceMock: jasmine.SpyObj<PublicoService>;
  let mockQueryParamMap = convertToParamMap({});

  const mockSucursales: SucursalPublica[] = [
    {
      id: 1,
      nombre: 'Sucursal Central',
      calle: 'Moneda',
      numero: '1150',
      complemento: null,
      idComuna: 13101,
      horario: 'Lunes a Viernes 09:00 a 18:00'
    },
    {
      id: 2,
      nombre: 'Sucursal Providencia',
      calle: 'Av. Providencia',
      numero: '1234',
      complemento: null,
      idComuna: 13123,
      horario: 'Lunes a Viernes 09:00 a 19:00'
    }
  ];

  const mockServicios: ServicioPublico[] = [
    {
      id: 1,
      codigo: 'EXPRESS-24H',
      nombre: 'Envío Express 24 Horas',
      descripcion: 'Entrega rápida',
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
      precioPorKg: 400,
      plazoMinDias: null,
      plazoMaxDias: null
    }
  ];

  const mockRegiones: Region[] = [
    {
      idRegion: 13,
      nombre: 'Metropolitana de Santiago',
      comunas: [
        { idComuna: 13101, nombre: 'Santiago' },
        { idComuna: 13123, nombre: 'Providencia' }
      ]
    }
  ];

  const respuestaCotizacionMock: CotizacionPublica = {
    servicioId: 1,
    servicioCodigo: 'EXPRESS-24H',
    sucursalOrigenId: 2,
    zona: 'URBANA',
    factorZona: 1.35,
    tarifaBase: 3000,
    precioPorKg: 500,
    pesoVolumetricoKg: 2.0,
    pesoFacturableKg: 3.5,
    totalClp: 12345, // Combinacion que no da matematicamente (3000 + 3.5*500 = 4750)
    plazoMinDias: 1,
    plazoMaxDias: 2,
    direccionSucursal: mockSucursales[1],
    aviso: 'Aviso personalizado del servidor',
    calculadaEn: '2026-11-21T12:00:00Z',
    validaHasta: '2026-11-21T23:59:59Z'
  };

  beforeEach(async () => {
    mockQueryParamMap = convertToParamMap({});

    publicoServiceMock = jasmine.createSpyObj('PublicoService', [
      'obtenerSucursales',
      'obtenerServicios',
      'obtenerRegiones',
      'cotizar'
    ]);

    publicoServiceMock.obtenerSucursales.and.returnValue(of(mockSucursales));
    publicoServiceMock.obtenerServicios.and.returnValue(of(mockServicios));
    publicoServiceMock.obtenerRegiones.and.returnValue(of(mockRegiones));
    publicoServiceMock.cotizar.and.returnValue(of(respuestaCotizacionMock));

    await TestBed.configureTestingModule({
      imports: [CotizarComponent],
      providers: [
        provideRouter([]),
        { provide: PublicoService, useValue: publicoServiceMock },
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

    fixture = TestBed.createComponent(CotizarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar catalogos', () => {
    expect(component).toBeTruthy();
    expect(publicoServiceMock.obtenerSucursales).toHaveBeenCalled();
    expect(publicoServiceMock.obtenerServicios).toHaveBeenCalled();
    expect(publicoServiceMock.obtenerRegiones).toHaveBeenCalled();
    expect(component.sucursales().length).toBe(2);
    expect(component.servicios().length).toBe(2);
  });

  it('muestraTotalDelServidor', () => {
    component.formulario.setValue({
      sucursalOrigenId: 2,
      servicioId: 1,
      idRegion: 13,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      medidas: {
        largoCm: null,
        anchoCm: null,
        altoCm: null
      }
    });

    component.cotizar();
    fixture.detectChanges();

    expect(publicoServiceMock.cotizar).toHaveBeenCalledWith({
      servicioId: 1,
      sucursalOrigenId: 2,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      largoCm: null,
      anchoCm: null,
      altoCm: null
    });

    const textoDom = fixture.nativeElement.textContent;
    expect(textoDom).toContain('12.345');
    expect(textoDom).toContain('Factor de zona');
    expect(textoDom).toContain('1.35');
    expect(component.resultado()?.totalClp).toBe(12345);
  });

  it('medidasIncompletasNoConsultan', () => {
    component.formulario.setValue({
      sucursalOrigenId: 2,
      servicioId: 1,
      idRegion: 13,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      medidas: {
        largoCm: 10,
        anchoCm: null,
        altoCm: null
      }
    });

    component.cotizar();
    fixture.detectChanges();

    expect(publicoServiceMock.cotizar).not.toHaveBeenCalled();
    expect(component.formulario.get('medidas')?.hasError('medidasIncompletas')).toBeTrue();
  });

  it('limiteDeTasaDeshabilitaBoton', fakeAsync(() => {
    const error429 = new HttpErrorResponse({
      status: 429,
      error: { codigo: 'LIMITE_TASA_EXCEDIDO' },
      headers: new HttpHeaders({ 'Retry-After': '3' })
    });

    publicoServiceMock.cotizar.and.returnValue(throwError(() => error429));

    component.formulario.setValue({
      sucursalOrigenId: 2,
      servicioId: 1,
      idRegion: 13,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      medidas: { largoCm: null, anchoCm: null, altoCm: null }
    });

    component.cotizar();
    fixture.detectChanges();

    const boton = fixture.debugElement.query(By.css('button.btn-cotizar-submit'));
    expect(boton.nativeElement.disabled).toBeTrue();
    expect(boton.nativeElement.textContent).toContain('3');

    tick(3000);
    fixture.detectChanges();

    expect(boton.nativeElement.disabled).toBeFalse();
    expect(boton.nativeElement.textContent).toContain('Calcular cotización');
  }));

  it('cambioDeCampoBorraResultado', () => {
    component.formulario.setValue({
      sucursalOrigenId: 2,
      servicioId: 1,
      idRegion: 13,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      medidas: { largoCm: null, anchoCm: null, altoCm: null }
    });

    component.cotizar();
    fixture.detectChanges();
    expect(component.resultado()).not.toBeNull();

    component.formulario.get('pesoKg')?.setValue(5.0);
    fixture.detectChanges();

    expect(component.resultado()).toBeNull();
  });

  it('servicioIdInvalidoSeIgnora', () => {
    mockQueryParamMap = convertToParamMap({ servicioId: 'abc' });
    component.ngOnInit();
    expect(component.formulario.get('servicioId')?.value).toBe(0);

    mockQueryParamMap = convertToParamMap({ servicioId: '99' });
    component.ngOnInit();
    expect(component.formulario.get('servicioId')?.value).toBe(0);

    mockQueryParamMap = convertToParamMap({ servicioId: '2' });
    component.ngOnInit();
    expect(component.formulario.get('servicioId')?.value).toBe(2);
  });

  it('avisoPorOmision', () => {
    publicoServiceMock.cotizar.and.returnValue(
      of({ ...respuestaCotizacionMock, aviso: '' })
    );

    component.formulario.setValue({
      sucursalOrigenId: 2,
      servicioId: 1,
      idRegion: 13,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      medidas: { largoCm: null, anchoCm: null, altoCm: null }
    });

    component.cotizar();
    fixture.detectChanges();

    const textoDom = fixture.nativeElement.textContent;
    expect(textoDom).toContain(AVISO_REFERENCIAL);
  });

  it('ayudaEnlazada', () => {
    const inputPeso = fixture.debugElement.query(By.css('#cot-peso'));
    const describedBy = inputPeso.nativeElement.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const ids = describedBy.split(/\s+/);
    for (const id of ids) {
      const elemento = fixture.debugElement.query(By.css(`#${id}`));
      expect(elemento).withContext(`El elemento #${id} debe existir en el DOM`).toBeTruthy();
    }
  });

  it('ayudaMedidasEnlazada', () => {
    // 1. Estado inicial sin error
    for (const idCampo of ['cot-largo', 'cot-ancho', 'cot-alto']) {
      const input = fixture.debugElement.query(By.css(`#${idCampo}`));
      expect(input).withContext(`El input #${idCampo} debe existir`).toBeTruthy();
      const describedBy = input.nativeElement.getAttribute('aria-describedby');
      expect(describedBy).withContext(`El input #${idCampo} debe tener aria-describedby`).toBeTruthy();
      expect(describedBy).not.toContain('cot-medidas-error');
      const ids = describedBy ? describedBy.split(/\s+/).filter(Boolean) : [];
      for (const id of ids) {
        const el = fixture.debugElement.query(By.css(`#${id}`));
        expect(el).withContext(`El elemento #${id} referenciado por #${idCampo} debe existir en el DOM`).toBeTruthy();
      }
    }

    // 2. Estado con error de medidas incompletas
    component.formulario.get('medidas')?.patchValue({ largoCm: 10, anchoCm: null, altoCm: null });
    fixture.detectChanges();

    for (const idCampo of ['cot-largo', 'cot-ancho', 'cot-alto']) {
      const input = fixture.debugElement.query(By.css(`#${idCampo}`));
      const describedBy = input.nativeElement.getAttribute('aria-describedby');
      expect(describedBy).toContain('cot-medidas-error');
      const ids = describedBy ? describedBy.split(/\s+/).filter(Boolean) : [];
      for (const id of ids) {
        const el = fixture.debugElement.query(By.css(`#${id}`));
        expect(el).withContext(`El elemento #${id} referenciado por #${idCampo} debe existir en el DOM`).toBeTruthy();
      }
    }
  });

  it('medidaDecimalNoConsulta', () => {
    component.formulario.setValue({
      sucursalOrigenId: 2,
      servicioId: 1,
      idRegion: 13,
      idComunaDestino: 13101,
      pesoKg: 3.5,
      medidas: {
        largoCm: 10.5,
        anchoCm: 20,
        altoCm: 30
      }
    });

    component.cotizar();
    fixture.detectChanges();

    expect(publicoServiceMock.cotizar).not.toHaveBeenCalled();
    expect(component.formulario.get('medidas.largoCm')?.hasError('pattern')).toBeTrue();
  });
});
