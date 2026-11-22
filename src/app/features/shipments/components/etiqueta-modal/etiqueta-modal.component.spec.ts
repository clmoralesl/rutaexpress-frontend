import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtiquetaModalComponent } from './etiqueta-modal.component';
import { Envio } from '../../../../core/services/envios.service';

describe('EtiquetaModalComponent', () => {
  let component: EtiquetaModalComponent;
  let fixture: ComponentFixture<EtiquetaModalComponent>;

  const mockEnvio: Envio = {
    id: 1,
    codigoSeguimiento: 'RE-2026-001',
    rutRemitente: '15678901-2',
    rutDestinatario: '18234567-8',
    direccionOrigen: 'Av. Providencia 1234, Santiago',
    direccionDestino: 'Calle Los Aromos 456, Maipu',
    pesoKg: 2.5,
    estado: 'CREADO',
    fechaCreacion: '2026-10-18T23:22:43.735Z',
    fechaActualizacion: '2026-10-18T23:22:43.735Z',
    remitenteNombre: 'Acme SpA',
    destinatarioNombre: 'Juan Perez'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EtiquetaModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EtiquetaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe renderizar el modal si visible es false', () => {
    component.visible = false;
    component.envio = mockEnvio;
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(overlay).toBeNull();
  });

  it('debe renderizar el modal y los graficos si visible es true y hay envio', () => {
    component.visible = true;
    component.envio = mockEnvio;
    component.actualizarGraficosEtiqueta();
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(overlay).not.toBeNull();

    const codigoTexto = fixture.nativeElement.querySelector('.barcode-texto-grande');
    expect(codigoTexto?.textContent).toContain('RE-2026-001');

    const remitente = fixture.nativeElement.querySelector('.caja-remitente');
    expect(remitente?.textContent).toContain('Acme SpA');
    expect(remitente?.textContent).toContain('15678901-2');

    const destinatario = fixture.nativeElement.querySelector('.caja-destinatario');
    expect(destinatario?.textContent).toContain('Juan Perez');
    expect(destinatario?.textContent).toContain('Calle Los Aromos 456, Maipu');

    expect(component.codigoBarrasSvg).toBeTruthy();
    expect(component.qrSvg).toBeTruthy();
  });

  it('debe emitir cerrar cuando se hace clic en el boton cerrar', () => {
    spyOn(component.cerrar, 'emit');
    component.visible = true;
    component.envio = mockEnvio;
    fixture.detectChanges();

    const botonCerrar = fixture.nativeElement.querySelector('.boton-cerrar-modal');
    botonCerrar?.click();

    expect(component.cerrar.emit).toHaveBeenCalled();
  });

  it('debe llamar a window.print al presionar imprimir', () => {
    spyOn(window, 'print');
    component.imprimir();
    expect(window.print).toHaveBeenCalled();
  });

  it('debe emitir reintentarEncolado al solicitar reintento', () => {
    spyOn(component.reintentarEncolado, 'emit');
    component.envio = mockEnvio;
    component.solicitarReencolado();

    expect(component.reintentarEncolado.emit).toHaveBeenCalledWith(mockEnvio);
  });

  it('debe calcular servicio correcto segun peso o servicioNombre', () => {
    component.envio = { ...mockEnvio, pesoKg: 10 };
    expect(component.obtenerServicioEstimado()).toBe('EXPRESS CARGA CONSOLIDADA');

    component.envio = { ...mockEnvio, servicioNombre: 'Ultra Express Hoy' };
    expect(component.obtenerServicioEstimado()).toBe('ULTRA EXPRESS HOY');
  });
});
