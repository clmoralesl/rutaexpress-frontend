import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AyudaPlegableComponent } from './ayuda-plegable.component';

describe('AyudaPlegableComponent', () => {
  let component: AyudaPlegableComponent;
  let fixture: ComponentFixture<AyudaPlegableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AyudaPlegableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AyudaPlegableComponent);
    component = fixture.componentInstance;
    component.idAyuda = 'cot-ayuda-peso';
    component.titulo = 'Guía sobre peso facturable';
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('el boton empieza con aria-expanded="false" y el contenido hidden', () => {
    const boton = fixture.debugElement.query(By.css('button.btn-toggle-ayuda'));
    const contenedor = fixture.debugElement.query(By.css('#cot-ayuda-peso'));

    expect(boton.nativeElement.getAttribute('aria-expanded')).toBe('false');
    expect(boton.nativeElement.getAttribute('aria-controls')).toBe('cot-ayuda-peso');
    expect(contenedor.nativeElement.getAttribute('id')).toBe('cot-ayuda-peso');
    expect(contenedor.nativeElement.hidden).toBeTrue();
  });

  it('tras un clic, aria-expanded queda en "true" y el contenido queda visible', () => {
    const boton = fixture.debugElement.query(By.css('button.btn-toggle-ayuda'));
    const contenedor = fixture.debugElement.query(By.css('#cot-ayuda-peso'));

    boton.nativeElement.click();
    fixture.detectChanges();

    expect(boton.nativeElement.getAttribute('aria-expanded')).toBe('true');
    expect(contenedor.nativeElement.hidden).toBeFalse();

    boton.nativeElement.click();
    fixture.detectChanges();

    expect(boton.nativeElement.getAttribute('aria-expanded')).toBe('false');
    expect(contenedor.nativeElement.hidden).toBeTrue();
  });

  it('aria-controls es igual a idAyuda y al id del contenedor', () => {
    const boton = fixture.debugElement.query(By.css('button.btn-toggle-ayuda'));
    const contenedor = fixture.debugElement.query(By.css('#cot-ayuda-peso'));

    expect(boton.nativeElement.getAttribute('aria-controls')).toBe(component.idAyuda);
    expect(contenedor.nativeElement.getAttribute('id')).toBe(component.idAyuda);
  });
});
