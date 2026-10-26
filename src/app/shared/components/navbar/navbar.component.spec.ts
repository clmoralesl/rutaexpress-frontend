import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, NavigationEnd, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';
import { By } from '@angular/platform-browser';
import { NavbarComponent } from './navbar.component';
import { SesionService } from '../../../core/auth/sesion.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let routerEvents$: Subject<any>;

  let mockAutenticado: WritableSignal<boolean>;
  let mockNombreUsuario: WritableSignal<string>;
  let mockRoles: WritableSignal<string[]>;
  let mockRolActivo: WritableSignal<string>;
  let mockSesionService: any;

  beforeEach(async () => {
    routerEvents$ = new Subject<any>();

    mockAutenticado = signal(false);
    mockNombreUsuario = signal('Usuario');
    mockRoles = signal([]);
    mockRolActivo = signal('Sin rol');

    mockSesionService = {
      autenticado: mockAutenticado,
      nombreUsuario: mockNombreUsuario,
      roles: mockRoles,
      rolActivo: mockRolActivo,
      tieneRol: (...rolesPermitidos: string[]) => {
        const rolesActuales = mockRoles();
        return rolesPermitidos.some((r) => rolesActuales.includes(r));
      },
      iniciarSesion: jasmine.createSpy('iniciarSesion'),
      cerrarSesion: jasmine.createSpy('cerrarSesion')
    };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: SesionService, useValue: mockSesionService }
      ]
    }).compileComponents();

    const router = TestBed.inject(Router);
    spyOnProperty(router, 'events', 'get').and.returnValue(routerEvents$.asObservable());

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente con el logotipo y la marca institucional', () => {
    expect(component).toBeTruthy();
    const logoTexto = fixture.debugElement.query(By.css('.nombre-marca')).nativeElement.textContent.trim();
    expect(logoTexto).toBe('RutaExpress');
  });

  describe('Navegación como usuario anónimo (sin sesión)', () => {
    beforeEach(() => {
      mockAutenticado.set(false);
      mockNombreUsuario.set('Usuario');
      mockRoles.set([]);
      mockRolActivo.set('Sin rol');
      fixture.detectChanges();
    });

    it('debe mostrar únicamente los enlaces públicos Inicio y Rastreo', () => {
      const etiquetas = component.enlacesVisibles().map((e) => e.etiqueta);
      expect(etiquetas).toEqual(['Inicio', 'Rastreo']);

      const enlacesDom = fixture.debugElement
        .queryAll(By.css('.enlace-nav'))
        .map((el) => el.nativeElement.textContent.trim());

      expect(enlacesDom).toContain('Inicio');
      expect(enlacesDom).toContain('Rastreo');
      expect(enlacesDom).not.toContain('Dashboard');
      expect(enlacesDom).not.toContain('Catálogo');
      expect(enlacesDom).not.toContain('Envíos');
      expect(enlacesDom).not.toContain('Auditoría');
      expect(enlacesDom).not.toContain('Reportes');
    });

    it('debe mostrar el botón Iniciar sesión y no mostrar datos de usuario', () => {
      const btnLogin = fixture.debugElement.query(By.css('.btn-iniciar-sesion'));
      expect(btnLogin).toBeTruthy();
      expect(fixture.debugElement.query(By.css('.datos-usuario'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.btn-cerrar-sesion'))).toBeNull();

      btnLogin.nativeElement.click();
      expect(mockSesionService.iniciarSesion).toHaveBeenCalledTimes(1);
    });
  });

  describe('Matriz de enlaces por rol autenticado', () => {
    it('debe mostrar todos los módulos al usuario con rol ADMIN', () => {
      mockAutenticado.set(true);
      mockNombreUsuario.set('Admin Usuario');
      mockRoles.set(['ADMIN']);
      mockRolActivo.set('ADMIN');
      fixture.detectChanges();

      const etiquetas = component.enlacesVisibles().map((e) => e.etiqueta);
      expect(etiquetas).toEqual([
        'Inicio',
        'Rastreo',
        'Dashboard',
        'Catálogo',
        'Envíos',
        'Auditoría',
        'Reportes'
      ]);

      const nombre = fixture.debugElement.query(By.css('.nombre-usuario')).nativeElement.textContent.trim();
      const rol = fixture.debugElement.query(By.css('.rol-badge')).nativeElement.textContent.trim();
      expect(nombre).toBe('Admin Usuario');
      expect(rol).toBe('ADMIN');
      expect(fixture.debugElement.query(By.css('.btn-cerrar-sesion'))).toBeTruthy();
    });

    it('debe mostrar módulo Envíos y ocultar Auditoría y Reportes al DESPACHADOR', () => {
      mockAutenticado.set(true);
      mockRoles.set(['DESPACHADOR']);
      fixture.detectChanges();

      const etiquetas = component.enlacesVisibles().map((e) => e.etiqueta);
      expect(etiquetas).toContain('Envíos');
      expect(etiquetas).not.toContain('Auditoría');
      expect(etiquetas).not.toContain('Reportes');
    });

    it('debe mostrar módulo Envíos y ocultar Auditoría y Reportes al CLIENTE', () => {
      mockAutenticado.set(true);
      mockRoles.set(['CLIENTE']);
      fixture.detectChanges();

      const etiquetas = component.enlacesVisibles().map((e) => e.etiqueta);
      expect(etiquetas).toContain('Envíos');
      expect(etiquetas).not.toContain('Auditoría');
      expect(etiquetas).not.toContain('Reportes');
    });

    it('debe mostrar Auditoría y Reportes pero ocultar Envíos al AUDITOR', () => {
      mockAutenticado.set(true);
      mockRoles.set(['AUDITOR']);
      fixture.detectChanges();

      const etiquetas = component.enlacesVisibles().map((e) => e.etiqueta);
      expect(etiquetas).toContain('Auditoría');
      expect(etiquetas).toContain('Reportes');
      expect(etiquetas).not.toContain('Envíos');
    });

    it('debe mostrar Reportes y Envíos pero ocultar Auditoría al OPERADOR', () => {
      mockAutenticado.set(true);
      mockRoles.set(['OPERADOR']);
      fixture.detectChanges();

      const etiquetas = component.enlacesVisibles().map((e) => e.etiqueta);
      expect(etiquetas).toContain('Reportes');
      expect(etiquetas).toContain('Envíos');
      expect(etiquetas).not.toContain('Auditoría');
    });

    it('debe mostrar únicamente Dashboard y Catálogo si el usuario autenticado no tiene roles asignados', () => {
      mockAutenticado.set(true);
      mockRoles.set([]);
      fixture.detectChanges();

      const etiquetas = component.enlacesVisibles().map((e) => e.etiqueta);
      expect(etiquetas).toEqual(['Inicio', 'Rastreo', 'Dashboard', 'Catálogo']);
    });
  });

  describe('Comportamiento del menú móvil e interactividad', () => {
    it('debe alternar la visibilidad del menú móvil al presionar el botón hamburguesa', () => {
      expect(component.menuMovilAbierto()).toBeFalse();

      component.alternarMenuMovil();
      expect(component.menuMovilAbierto()).toBeTrue();

      component.alternarMenuMovil();
      expect(component.menuMovilAbierto()).toBeFalse();
    });

    it('debe cerrar el menú móvil al emitir una navegación completada NavigationEnd', () => {
      component.menuMovilAbierto.set(true);

      routerEvents$.next(new NavigationEnd(1, '/rastreo', '/rastreo'));

      expect(component.menuMovilAbierto()).toBeFalse();
    });

    it('debe cerrar el menú móvil y reenfocar el botón al presionar la tecla Escape', () => {
      component.menuMovilAbierto.set(true);
      spyOn(component.botonHamburguesa?.nativeElement!, 'focus');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(component.menuMovilAbierto()).toBeFalse();
      expect(component.botonHamburguesa?.nativeElement?.focus).toHaveBeenCalled();
    });
  });

  describe('Flujo de cierre de sesión con confirmación modal', () => {
    beforeEach(() => {
      mockAutenticado.set(true);
      fixture.detectChanges();
    });

    it('debe abrir el diálogo modal al solicitar cerrar sesión', () => {
      expect(component.mostrarDialogoSalida()).toBeFalse();

      component.abrirDialogoSalida();
      expect(component.mostrarDialogoSalida()).toBeTrue();
    });

    it('debe cancelar el cierre de sesión sin invocar al servicio', () => {
      component.abrirDialogoSalida();
      component.cancelarCerrarSesion();

      expect(component.mostrarDialogoSalida()).toBeFalse();
      expect(mockSesionService.cerrarSesion).not.toHaveBeenCalled();
    });

    it('debe confirmar el cierre de sesión e invocar a sesion.cerrarSesion()', () => {
      component.abrirDialogoSalida();
      component.confirmarCerrarSesion();

      expect(component.mostrarDialogoSalida()).toBeFalse();
      expect(mockSesionService.cerrarSesion).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tipografía y estilos', () => {
    it('debe aplicar una tipografía sans-serif al componente host y no usar Times New Roman', () => {
      const hostElement = fixture.nativeElement as HTMLElement;
      const estilo = window.getComputedStyle(hostElement);
      const fuente = estilo.fontFamily.toLowerCase();
      expect(fuente).not.toContain('times new roman');
    });
  });

  describe('Accesibilidad', () => {
    it('debe contener un botón accesible de omisión para saltar al contenido principal', () => {
      const botonSaltar = fixture.debugElement.query(By.css('.enlace-saltar'));
      expect(botonSaltar).toBeTruthy();
      expect(botonSaltar.nativeElement.tagName.toLowerCase()).toBe('button');
    });

    it('debe enfocar el elemento main al activar el botón saltar al contenido', () => {
      const mainElemento = document.createElement('main');
      document.body.appendChild(mainElemento);
      spyOn(mainElemento, 'focus');

      const eventoFake = jasmine.createSpyObj('Event', ['preventDefault']);
      component.irAlContenido(eventoFake);

      expect(eventoFake.preventDefault).toHaveBeenCalled();
      expect(mainElemento.getAttribute('tabindex')).toBe('-1');
      expect(mainElemento.focus).toHaveBeenCalled();

      document.body.removeChild(mainElemento);
    });
  });
});
