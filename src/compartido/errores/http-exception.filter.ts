import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DominioError } from './dominio.error';

/**
 * Filtro global de excepciones (ADR-006).
 * Unifica el formato de respuesta para errores de dominio y excepciones HTTP en toda la aplicación.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let mensaje: string | object = 'Error interno del servidor';

    if (exception instanceof DominioError) {
      status = exception.codigoHttp;
      mensaje = exception.mensaje;
      this.logger.warn(
        `Error de dominio [${exception.name}] en ${request.method} ${request.url}: ${exception.mensaje}`,
      );
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      mensaje =
        typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
          ? (exceptionResponse as any).message
          : exceptionResponse;
      this.logger.warn(`HttpException [${status}] en ${request.method} ${request.url}: ${JSON.stringify(mensaje)}`);
    } else if (exception instanceof Error) {
      this.logger.error(`Excepción no controlada en ${request.method} ${request.url}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      mensaje,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
