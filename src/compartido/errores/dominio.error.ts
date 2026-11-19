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
