import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { App } from './app';
import { SesionService } from './core/auth/sesion.service';
import { inicializarOffsetScroll } from './app.config';

describe('App', () => {
  const fakeSesionService = {
    autenticado: signal(false),
    nombreUsuario: signal('Usuario'),
    roles: signal([]),
    rolActivo: signal('Sin rol'),
    tieneRol: () => false,
    iniciarSesion: jasmine.createSpy('iniciarSesion'),
    cerrarSesion: jasmine.createSpy('cerrarSesion')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: SesionService, useValue: fakeSesionService }
      ]
    }).compileComponents();
  });

  it('debe crearse correctamente', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  describe('inicializarOffsetScroll', () => {
    let mockScroller: jasmine.SpyObj<ViewportScroller>;

    beforeEach(() => {
      mockScroller = jasmine.createSpyObj<ViewportScroller>('ViewportScroller', ['setOffset']);
    });

    it('debe registrar una función de cálculo de offset en ViewportScroller', () => {
      const calculador = inicializarOffsetScroll(mockScroller);

      expect(mockScroller.setOffset).toHaveBeenCalledTimes(1);
      expect(typeof calculador).toBe('function');
    });

    it('debe retornar [0, 64] como valor de respaldo cuando app-navbar no existe en el DOM', () => {
      const calculador = inicializarOffsetScroll(mockScroller);
      const resultado = calculador();

      expect(resultado).toEqual([0, 64]);
    });

    it('debe retornar [0, altura] dinámicamente cuando app-navbar está presente en el DOM', () => {
      const dummyNavbar = document.createElement('app-navbar');
      spyOn(dummyNavbar, 'getBoundingClientRect').and.returnValue({
        height: 65,
        width: 1200,
        top: 0,
        bottom: 65,
        left: 0,
        right: 1200,
        x: 0,
        y: 0,
        toJSON: () => {}
      });
      document.body.appendChild(dummyNavbar);

      const calculador = inicializarOffsetScroll(mockScroller);
      const resultado = calculador();

      expect(resultado).toEqual([0, 65]);

      document.body.removeChild(dummyNavbar);
    });
  });
});
