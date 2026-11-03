import { Injectable } from '@nestjs/common';
import { PostulacionService } from '../postulacion/postulacion.service';
import { HorasService } from '../horas/horas.service';

// CU-08: "valioso para el negocio, pero no estructura el sistema" (ver
// drivers.md) - por eso no tiene entidad propia, solo lee de los servicios
// exportados de otros modulos (misma regla de ADR-001 que actas.service.ts).
@Injectable()
export class ReportesService {
  constructor(
    private readonly postulacionService: PostulacionService,
    private readonly horasService: HorasService,
  ) {}

  async indicadoresEstudiante(estudianteId: string) {
    return {
      postulacionValidada: await this.postulacionService.estaValidada(estudianteId),
      horasValidadas: await this.horasService.totalHorasValidadas(estudianteId),
    };
  }
}
