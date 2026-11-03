import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoPostulacion, Postulacion } from './postulacion.entity';
import { ConfiguracionService } from '../compartido/configuracion/configuracion.service';
import { DominioError } from '../compartido/errores/dominio-error';

// Transiciones permitidas de la maquina de estados (ADR-003). Cualquier
// otra combinacion lanza DominioError: "si no esta en esta tabla, no pasa".
const TRANSICIONES_VALIDAS: Record<EstadoPostulacion, EstadoPostulacion[]> = {
  [EstadoPostulacion.RECIBIDA]: [EstadoPostulacion.EN_REVISION],
  [EstadoPostulacion.EN_REVISION]: [EstadoPostulacion.VALIDADA, EstadoPostulacion.RECHAZADA],
  [EstadoPostulacion.VALIDADA]: [],
  [EstadoPostulacion.RECHAZADA]: [],
};

@Injectable()
export class PostulacionService {
  constructor(
    @InjectRepository(Postulacion) private readonly postulaciones: Repository<Postulacion>,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  // CU-09: el estudiante carga sus datos y documentos. ADR-007: se valida
  // contra la configuracion vigente del programa, no contra reglas fijas.
  async postular(datos: {
    estudianteId: string;
    programaAcademico: string;
    documentosAdjuntos: string[];
  }): Promise<Postulacion> {
    const requisito = await this.configuracionService.obtenerVigente(datos.programaAcademico);

    const faltantes = requisito.documentosRequeridos.filter(
      (req) => !datos.documentosAdjuntos.includes(req),
    );
    if (faltantes.length > 0) {
      throw new DominioError(
        `Faltan documentos requeridos para ${datos.programaAcademico}: ${faltantes.join(', ')}`,
        'DOCUMENTOS_INCOMPLETOS',
      );
    }

    return this.postulaciones.save(
      this.postulaciones.create({ ...datos, estado: EstadoPostulacion.RECIBIDA }),
    );
  }

  // CU-02: revision y validacion manual (RN-01 - ningun cambio de estado
  // ocurre solo, siempre hay un adminId que lo dispara).
  async revisar(
    postulacionId: string,
    nuevoEstado: EstadoPostulacion,
    adminId: string,
  ): Promise<Postulacion> {
    const postulacion = await this.postulaciones.findOneByOrFail({ id: postulacionId });

    const permitidas = TRANSICIONES_VALIDAS[postulacion.estado];
    if (!permitidas.includes(nuevoEstado)) {
      throw new DominioError(
        `No se puede pasar de ${postulacion.estado} a ${nuevoEstado}.`,
        'TRANSICION_INVALIDA',
      );
    }

    postulacion.estado = nuevoEstado;
    postulacion.revisadaPorAdminId = adminId;
    return this.postulaciones.save(postulacion);
  }

  // Usado por actas.service.ts (ADR-005) para confirmar que la postulacion
  // esta VALIDADA antes de generar el acta. Es la unica forma en que otro
  // modulo lee este dato: nunca directamente de la tabla `postulacion`.
  async estaValidada(estudianteId: string): Promise<boolean> {
    const postulacion = await this.postulaciones.findOne({
      where: { estudianteId, estado: EstadoPostulacion.VALIDADA },
    });
    return !!postulacion;
  }
}
