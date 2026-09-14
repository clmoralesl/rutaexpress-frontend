import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Envio,
  EnviosService,
  FiltrosEnvios
} from '../../core/services/envios.service';

@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shipments.html',
  styleUrl: './shipments.css'
})
export class Shipments implements OnInit {

  envios: Envio[] = [];
  cargando = false;
  error = '';

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

  constructor(private enviosService: EnviosService) {}

  ngOnInit(): void {
    this.cargarEnvios();
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

  limpiarFiltros(): void {
    this.estado = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.cargarEnvios();
  }
}
