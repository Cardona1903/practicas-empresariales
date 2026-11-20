/**
 * Pruebas ejecutables para CU-13: Evaluar el desempeño del estudiante en práctica.
 * Instancia las clases reales de src/ (EvaluacionController, EvaluacionService,
 * SupervisorTokenGuard, EnlaceAccesoService, AuditoriaService) con repositorios
 * en memoria y ValidationPipe real, ejecutando el 100% de los escenarios
 * definidos en specs/013-evaluar-desempeno/spec.md.
 */

import 'reflect-metadata';
import * as assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { EnlaceAcceso } from '../src/compartido/auth/entities/enlace-acceso.entity';
import { EnlaceAccesoService } from '../src/compartido/auth/enlace-acceso.service';
import { SupervisorTokenGuard } from '../src/compartido/auth/guards/supervisor-token.guard';
import { EnlaceSupervisorAutenticado } from '../src/compartido/auth/decorators/enlace-actual.decorator';
import { RegistroAuditoria } from '../src/compartido/auditoria/entities/registro-auditoria.entity';
import { AuditoriaService } from '../src/compartido/auditoria/auditoria.service';
import { Evaluacion } from '../src/evaluacion/entities/evaluacion.entity';
import { RegistrarEvaluacionDto } from '../src/evaluacion/dto/registrar-evaluacion.dto';
import { EvaluacionService } from '../src/evaluacion/evaluacion.service';
import { EvaluacionController } from '../src/evaluacion/evaluacion.controller';
import { DominioError } from '../src/compartido/errores/dominio.error';

class EnlaceAccesoRepoInMemory {
  private items: EnlaceAcceso[] = [];

  setItems(items: EnlaceAcceso[]) {
    this.items = items.map((e) => Object.assign(new EnlaceAcceso(), e));
  }

  async findOne(options: { where: { token: string } }): Promise<EnlaceAcceso | null> {
    const found = this.items.find((e) => e.token === options.where.token);
    return found ? Object.assign(new EnlaceAcceso(), found) : null;
  }

  async save(enlace: EnlaceAcceso): Promise<EnlaceAcceso> {
    const idx = this.items.findIndex((e) => e.token === enlace.token);
    const copia = Object.assign(new EnlaceAcceso(), enlace);
    if (idx >= 0) {
      this.items[idx] = copia;
    } else {
      this.items.push(copia);
    }
    return Object.assign(new EnlaceAcceso(), copia);
  }
}

class EvaluacionRepoInMemory {
  private items: Evaluacion[] = [];
  private seq = 1;

  reset() {
    this.items = [];
    this.seq = 1;
  }

  getAll(): Evaluacion[] {
    return this.items.map((e) => Object.assign(new Evaluacion(), e));
  }

  async findOne(options: {
    where: { estudianteId?: string; id?: string };
  }): Promise<Evaluacion | null> {
    const found = this.items.find((e) => {
      if (options.where.estudianteId && e.estudianteId !== options.where.estudianteId) {
        return false;
      }
      if (options.where.id && e.id !== options.where.id) {
        return false;
      }
      return true;
    });
    return found ? Object.assign(new Evaluacion(), found) : null;
  }

  create(partial: Partial<Evaluacion>): Evaluacion {
    const entidad = new Evaluacion();
    entidad.id = `eval-${this.seq++}`;
    entidad.estudianteId = partial.estudianteId!;
    entidad.supervisorId = partial.supervisorId ?? null;
    entidad.calificacion = partial.calificacion!;
    entidad.comentarios = partial.comentarios ?? null;
    entidad.creadaEn = new Date();
    return entidad;
  }

  async save(evaluacion: Evaluacion): Promise<Evaluacion> {
    const copia = Object.assign(new Evaluacion(), evaluacion);
    this.items.push(copia);
    return Object.assign(new Evaluacion(), copia);
  }
}

class AuditoriaRepoInMemory {
  public registros: RegistroAuditoria[] = [];
  private seq = 1;

  reset() {
    this.registros = [];
    this.seq = 1;
  }

  create(partial: Partial<RegistroAuditoria>): RegistroAuditoria {
    const reg = new RegistroAuditoria();
    reg.id = `aud-${this.seq++}`;
    reg.evento = partial.evento!;
    reg.resultado = partial.resultado!;
    reg.actorId = partial.actorId ?? null;
    reg.detalles = partial.detalles ?? null;
    reg.fecha = new Date();
    return reg;
  }

  async save(registro: RegistroAuditoria): Promise<RegistroAuditoria> {
    const guardado = Object.assign(new RegistroAuditoria(), registro);
    this.registros.push(guardado);
    return guardado;
  }
}

interface RespuestaSimulada<T = any> {
  statusCode: number;
  body: T;
  duracionMs: number;
}

async function simularPostEvaluacion(params: {
  guard: SupervisorTokenGuard;
  controller: EvaluacionController;
  pipe: ValidationPipe;
  enlaceToken?: string;
  body: Record<string, any>;
}): Promise<RespuestaSimulada> {
  const inicio = performance.now();
  const headers: Record<string, string> = {};
  if (params.enlaceToken !== undefined) {
    headers['enlace-token'] = params.enlaceToken;
  }

  const req: any = {
    method: 'POST',
    url: '/evaluaciones',
    headers,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => EvaluacionController as any,
    getHandler: () => params.controller.registrarEvaluacion,
    getArgs: () => [req] as any,
    getArgByIndex: () => req,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;

  try {
    await params.guard.canActivate(context);

    const dtoValidado = (await params.pipe.transform(params.body, {
      type: 'body',
      metatype: RegistrarEvaluacionDto,
    })) as RegistrarEvaluacionDto;

    const enlace = req.enlaceAcceso as EnlaceSupervisorAutenticado;
    const resultado = await params.controller.registrarEvaluacion(
      enlace,
      dtoValidado,
    );
    const duracionMs = performance.now() - inicio;

    return {
      statusCode: HttpStatus.CREATED,
      body: resultado,
      duracionMs,
    };
  } catch (error) {
    const duracionMs = performance.now() - inicio;
    if (error instanceof DominioError) {
      return {
        statusCode: error.codigoHttp,
        body: { statusCode: error.codigoHttp, mensaje: error.mensaje },
        duracionMs,
      };
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const resp = error.getResponse();
      const mensaje =
        typeof resp === 'object' && resp !== null && 'message' in resp
          ? (resp as any).message
          : resp;
      return {
        statusCode: status,
        body: { statusCode: status, mensaje },
        duracionMs,
      };
    }
    throw error;
  }
}

async function ejecutarPruebas() {
  console.log('====================================================================');
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-13 EVALUAR DESEMPEÑO');
  console.log('====================================================================\n');

  const enlaceRepo = new EnlaceAccesoRepoInMemory();
  const evaluacionRepo = new EvaluacionRepoInMemory();
  const auditoriaRepo = new AuditoriaRepoInMemory();

  const auditoriaService = new AuditoriaService(
    auditoriaRepo as unknown as Repository<RegistroAuditoria>,
  );
  const enlaceAccesoService = new EnlaceAccesoService(
    enlaceRepo as unknown as Repository<EnlaceAcceso>,
  );
  const supervisorTokenGuard = new SupervisorTokenGuard(
    enlaceAccesoService,
    auditoriaService,
  );
  const evaluacionService = new EvaluacionService(
    evaluacionRepo as unknown as Repository<Evaluacion>,
    enlaceAccesoService,
  );
  const evaluacionController = new EvaluacionController(evaluacionService);
  const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

  const reiniciarDatos = () => {
    evaluacionRepo.reset();
    auditoriaRepo.reset();
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);

    enlaceRepo.setItems([
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-eval-1',
        token: 'token-eval-valido-001',
        estudianteId: '1053800000',
        supervisorId: 'sup-empresa-01',
        expiraEn: manana,
        usado: false,
        creadoEn: new Date(),
      }),
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-eval-2',
        token: 'token-eval-valido-002',
        estudianteId: '1053900000',
        supervisorId: 'sup-empresa-01',
        expiraEn: manana,
        usado: false,
        creadoEn: new Date(),
      }),
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-eval-3',
        token: 'token-eval-extra-1053800000',
        estudianteId: '1053800000',
        supervisorId: 'sup-empresa-01',
        expiraEn: manana,
        usado: false,
        creadoEn: new Date(),
      }),
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-eval-4',
        token: 'token-eval-usado-004',
        estudianteId: '1053800000',
        supervisorId: 'sup-empresa-01',
        expiraEn: manana,
        usado: true,
        creadoEn: new Date(),
      }),
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-eval-5',
        token: 'token-eval-vencido-005',
        estudianteId: '1053800000',
        supervisorId: 'sup-empresa-01',
        expiraEn: ayer,
        usado: false,
        creadoEn: ayer,
      }),
    ]);
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Registro exitoso de evaluación con comentarios (flujo básico)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 1: Registro exitoso de evaluación de desempeño con comentarios usando un enlace de acceso válido (flujo básico)',
  );
  reiniciarDatos();

  const resp1 = await simularPostEvaluacion({
    guard: supervisorTokenGuard,
    controller: evaluacionController,
    pipe: validationPipe,
    enlaceToken: 'token-eval-valido-001',
    body: {
      calificacion: 4.5,
      comentarios: 'Excelente desempeño técnico, compromiso y trabajo en equipo',
    },
  });

  assert.strictEqual(resp1.statusCode, 201);
  assert.strictEqual(resp1.body.estudianteId, '1053800000');
  assert.strictEqual(resp1.body.calificacion, 4.5);
  assert.strictEqual(
    resp1.body.comentarios,
    'Excelente desempeño técnico, compromiso y trabajo en equipo',
  );

  const enlaceDespues1 = await enlaceRepo.findOne({
    where: { token: 'token-eval-valido-001' },
  });
  assert.strictEqual(enlaceDespues1?.usado, true);
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 201, Evaluacion creada para 1053800000 con calificación 4.5, comentarios y enlace marcado como usado)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Registro exitoso de evaluación sin comentarios (flujo alterno)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 2: Registro exitoso de evaluación de desempeño sin comentarios (flujo alterno)',
  );
  reiniciarDatos();

  const resp2 = await simularPostEvaluacion({
    guard: supervisorTokenGuard,
    controller: evaluacionController,
    pipe: validationPipe,
    enlaceToken: 'token-eval-valido-002',
    body: {
      calificacion: 4.2,
    },
  });

  assert.strictEqual(resp2.statusCode, 201);
  assert.strictEqual(resp2.body.estudianteId, '1053900000');
  assert.strictEqual(resp2.body.calificacion, 4.2);
  assert.strictEqual(resp2.body.comentarios, null);

  const enlaceDespues2 = await enlaceRepo.findOne({
    where: { token: 'token-eval-valido-002' },
  });
  assert.strictEqual(enlaceDespues2?.usado, true);
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 201, Evaluacion creada para 1053900000 con calificación 4.2 sin comentarios y enlace marcado como usado)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Intento de evaluar a un estudiante que ya cuenta con evaluación (409)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 3: Intento de evaluar a un estudiante que ya cuenta con evaluación registrada (excepción)',
  );
  reiniciarDatos();

  await simularPostEvaluacion({
    guard: supervisorTokenGuard,
    controller: evaluacionController,
    pipe: validationPipe,
    enlaceToken: 'token-eval-valido-001',
    body: {
      calificacion: 4.5,
      comentarios: 'Evaluación inicial',
    },
  });

  const respDuplicada = await simularPostEvaluacion({
    guard: supervisorTokenGuard,
    controller: evaluacionController,
    pipe: validationPipe,
    enlaceToken: 'token-eval-extra-1053800000',
    body: {
      calificacion: 3.0,
      comentarios: 'Segunda evaluación no permitida',
    },
  });

  assert.strictEqual(respDuplicada.statusCode, 409);
  const evaluacionOriginal = await evaluacionRepo.findOne({
    where: { estudianteId: '1053800000' },
  });
  assert.strictEqual(evaluacionOriginal?.calificacion, 4.5);

  const enlaceExtra = await enlaceRepo.findOne({
    where: { token: 'token-eval-extra-1053800000' },
  });
  assert.strictEqual(
    enlaceExtra?.usado,
    false,
    'El enlace no debe consumirse si se rechaza por evaluación ya existente',
  );
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 409 Conflict ante segunda evaluación para el mismo estudiante; evaluación original intacta y enlace no consumido)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Rechazo por calificación fuera del rango 0.0 a 5.0 (400)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 4: Rechazo por calificación fuera del rango permitido de 0.0 a 5.0 (excepción)',
  );
  reiniciarDatos();

  const respMenorCero = await simularPostEvaluacion({
    guard: supervisorTokenGuard,
    controller: evaluacionController,
    pipe: validationPipe,
    enlaceToken: 'token-eval-valido-001',
    body: {
      calificacion: -0.5,
    },
  });
  assert.strictEqual(respMenorCero.statusCode, 400);

  const respMayorCinco = await simularPostEvaluacion({
    guard: supervisorTokenGuard,
    controller: evaluacionController,
    pipe: validationPipe,
    enlaceToken: 'token-eval-valido-001',
    body: {
      calificacion: 5.5,
    },
  });
  assert.strictEqual(respMayorCinco.statusCode, 400);

  assert.strictEqual(evaluacionRepo.getAll().length, 0);
  const enlaceNoConsumido = await enlaceRepo.findOne({
    where: { token: 'token-eval-valido-001' },
  });
  assert.strictEqual(enlaceNoConsumido?.usado, false);
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 400 ante calificación < 0.0 o > 5.0, 0 evaluaciones creadas y enlace no consumido)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Esquema del escenario: Enlace inexistente, usado o vencido (EAC-03)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 5: Esquema del escenario: Bloqueo de evaluación con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad)',
  );
  reiniciarDatos();

  const ejemplos: Array<{ estado: string; token: string }> = [
    { estado: 'inexistente', token: 'token-eval-inexistente-999' },
    { estado: 'usado', token: 'token-eval-usado-004' },
    { estado: 'vencido', token: 'token-eval-vencido-005' },
  ];

  for (const ejemplo of ejemplos) {
    const resp = await simularPostEvaluacion({
      guard: supervisorTokenGuard,
      controller: evaluacionController,
      pipe: validationPipe,
      enlaceToken: ejemplo.token,
      body: {
        calificacion: 4.5,
      },
    });

    assert.strictEqual(resp.statusCode, 401);
    assert.strictEqual(resp.body.mensaje, 'enlace inválido, usado o vencido');
    assert.ok(resp.duracionMs < 1000);
  }

  assert.strictEqual(evaluacionRepo.getAll().length, 0);
  assert.strictEqual(auditoriaRepo.registros.length, 3);
  console.log(
    '  -> RESULTADO: CUMPLE (3/3 ejemplos [inexistente, usado, vencido] bloqueados con HTTP 401 "enlace inválido, usado o vencido" y auditados en < 1 s)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Bloqueo de evaluación sin token de enlace (EAC-03)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 6: Bloqueo de evaluación sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)',
  );
  reiniciarDatos();

  const respSinToken = await simularPostEvaluacion({
    guard: supervisorTokenGuard,
    controller: evaluacionController,
    pipe: validationPipe,
    enlaceToken: undefined,
    body: {
      calificacion: 4.5,
    },
  });

  assert.strictEqual(respSinToken.statusCode, 401);
  assert.ok(respSinToken.duracionMs < 1000);
  assert.strictEqual(evaluacionRepo.getAll().length, 0);
  assert.strictEqual(auditoriaRepo.registros.length, 1);
  assert.strictEqual(auditoriaRepo.registros[0].evento, 'ENLACE_SUPERVISOR_AUSENTE');

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 401 sin encabezado enlace-token, 0 evaluaciones creadas y evento ENLACE_SUPERVISOR_AUSENTE registrado en RegistroAuditoria en < 1 s)\n',
  );

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 6/6 ESCENARIOS CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando pruebas de CU-13:', err);
  process.exit(1);
});
