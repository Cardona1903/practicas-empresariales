import { HttpStatus } from '@nestjs/common';

/**
 * Error de dominio base para la lógica de negocio del sistema.
 * Desacoplado de frameworks HTTP pero mapeable a códigos de estado consistentes (ADR-006).
 */
export class DominioError extends Error {
  constructor(
    public readonly mensaje: string,
    public readonly codigoHttp: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(mensaje);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DocumentoIncompletoError extends DominioError {
  constructor(mensaje = 'La documentación requerida está incompleta') {
    super(mensaje, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class DocumentoCorruptoError extends DominioError {
  constructor(mensaje = 'El archivo adjunto está corrupto o no corresponde a un documento válido') {
    super(mensaje, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class PostulacionActivaExistenteError extends DominioError {
  constructor(mensaje = 'El estudiante ya cuenta con un trámite de postulación activo en curso') {
    super(mensaje, HttpStatus.CONFLICT);
  }
}

export class AccesoNoAutorizadoError extends DominioError {
  constructor(mensaje = 'Acceso denegado: no autorizado para realizar esta acción') {
    super(mensaje, HttpStatus.FORBIDDEN);
  }
}

export class PostulacionNoEncontradaError extends DominioError {
  constructor(mensaje = 'La postulación solicitada no existe') {
    super(mensaje, HttpStatus.NOT_FOUND);
  }
}

export class TransicionEstadoInvalidaError extends DominioError {
  constructor(mensaje = 'Transición de estado inválida') {
    super(mensaje, HttpStatus.CONFLICT);
  }
}

export class MotivoRechazoObligatorioError extends DominioError {
  constructor(mensaje = 'El motivo del rechazo es obligatorio cuando se rechaza una postulación') {
    super(mensaje, HttpStatus.BAD_REQUEST);
  }
}

export class RegistroHorasNoEncontradoError extends DominioError {
  constructor(mensaje = 'El registro de horas solicitado no existe') {
    super(mensaje, HttpStatus.NOT_FOUND);
  }
}

export class RegistroHorasYaVerificadoError extends DominioError {
  constructor(mensaje = 'El registro de horas ya fue verificado previamente') {
    super(mensaje, HttpStatus.CONFLICT);
  }
}

export class PostulacionNoValidadaError extends DominioError {
  constructor(mensaje = 'la postulación aún no está validada') {
    super(mensaje, HttpStatus.CONFLICT);
  }
}

export class HorasInsuficientesError extends DominioError {
  constructor(mensaje = 'El estudiante no cumple con las horas mínimas requeridas por su programa académico') {
    super(mensaje, HttpStatus.CONFLICT);
  }
}

export class ActaYaExisteError extends DominioError {
  constructor(mensaje = 'Ya existe un acta oficial generada para este estudiante') {
    super(mensaje, HttpStatus.CONFLICT);
  }
}

export class FalloGeneracionActaError extends DominioError {
  constructor(mensaje = 'no se pudo generar el acta, reintentar manualmente') {
    super(mensaje, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

