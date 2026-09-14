import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';

describe('App', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'procesarRedireccion'
    ]);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceSpy
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should process authentication redirect on init', () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    expect(authServiceSpy.procesarRedireccion).toHaveBeenCalled();
  });
});