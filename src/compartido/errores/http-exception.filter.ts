import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DominioError } from './dominio-error';

// ADR-006: manejo de errores centralizado. Un documento incompleto o una
// transicion de estado invalida (DominioError) responde 422 con un mensaje
// util; cualquier otro fallo (p. ej. al generar el PDF del acta) responde
// 500 pero SIEMPRE con el mismo formato. No hay reintento automatico aqui
// (coherente con RN-01): quien reintenta es una persona, volviendo a llamar
// al mismo endpoint.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExcepcionNoManejada');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let mensaje = 'Error interno. Se registro el intento, reintente manualmente.';
    let codigo = 'ERROR_INTERNO';

    if (exception instanceof DominioError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      mensaje = exception.message;
      codigo = exception.codigo;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      mensaje = typeof body === 'string' ? body : (body as any).message ?? mensaje;
      codigo = 'HTTP';
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      statusCode: status,
      codigo,
      mensaje,
      ruta: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
