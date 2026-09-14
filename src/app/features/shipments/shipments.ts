import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import {
  CrearEnvioRequest,
  Envio,
  EnviosService,
  FiltrosEnvios
} from '../../core/services/envios.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './shipments.html',
  styleUrl: './shipments.css'
})
export class Shipments implements OnInit {

  envios: Envio[] = [];
  cargando = false;
  error = '';
  mensaje = '';

  estado = '';
  fechaDesde = '';
  fechaHasta = '';

  readonly estados = [
    'CREADO',
    'ACEPTADO',
    'EN_BODEGA',
    'EN_RUTA',
    'ENTREGADO',
    'CANCELADO'
  ];

  readonly transiciones: Record<string, string[]> = {
    CREADO: ['ACEPTADO', 'CANCELADO'],
    ACEPTADO: ['EN_BODEGA', 'CANCELADO'],
    EN_BODEGA: ['EN_RUTA', 'CANCELADO'],
    EN_RUTA: ['ENTREGADO'],
    ENTREGADO: [],
    CANCELADO: []
  };

  formularioEnvio;

  constructor(
    private enviosService: EnviosService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.formularioEnvio = this.fb.nonNullable.group({
      codigoSeguimiento: ['', Validators.required],
      rutRemitente: ['', Validators.required],
      rutDestinatario: ['', Validators.required],
      direccionOrigen: ['', Validators.required],
      direccionDestino: ['', Validators.required],
      pesoKg: [0, [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit(): void {
    this.cargarEnvios();
  }

  puedeGestionarEstados(): boolean {
    return this.authService.tieneRol('ADMIN', 'DESPACHADOR');
  }

  obtenerTransiciones(estadoActual: string): string[] {
    return this.transiciones[estadoActual] ?? [];
  }

  cargarEnvios(): void {
    this.cargando = true;
    this.error = '';

    const filtros: FiltrosEnvios = {
      estado: this.estado || undefined,
      fechaDesde: this.fechaDesde || undefined,
      fechaHasta: this.fechaHasta || undefined
    };

    this.enviosService.listar(filtros).subscribe({
      next: (envios) => {
        this.envios = envios;
        this.cargando = false;
      },
      error: () => {
        this.envios = [];
        this.error = 'No fue posible cargar los envíos.';
        this.cargando = false;
      }
    });
  }

  crearEnvio(): void {
    this.error = '';
    this.mensaje = '';

    if (this.formularioEnvio.invalid) {
      this.formularioEnvio.markAllAsTouched();
      this.error = 'Completa correctamente todos los campos obligatorios.';
      return;
    }

    const request: CrearEnvioRequest = this.formularioEnvio.getRawValue();

    this.enviosService.crear(request).subscribe({
      next: () => {
        this.mensaje = 'Envío creado correctamente.';
        this.formularioEnvio.reset({
          codigoSeguimiento: '',
          rutRemitente: '',
          rutDestinatario: '',
          direccionOrigen: '',
          direccionDestino: '',
          pesoKg: 0
        });
        this.cargarEnvios();
      },
      error: () => {
        this.error = 'No fue posible crear el envío.';
      }
    });
  }

  actualizarEstado(envio: Envio, nuevoEstado: string): void {
    this.error = '';
    this.mensaje = '';

    this.enviosService.actualizarEstado(envio.id, nuevoEstado).subscribe({
      next: () => {
        this.mensaje = `Estado actualizado a ${nuevoEstado}.`;
        this.cargarEnvios();
      },
      error: () => {
        this.error = 'No fue posible actualizar el estado del envío.';
      }
    });
  }

  limpiarFiltros(): void {
    this.estado = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.cargarEnvios();
  }
}
