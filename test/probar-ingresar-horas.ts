/**
 * Pruebas ejecutables para CU-12: Ingresar horas de práctica de los estudiantes.
 * Instancia las clases reales de src/ (HorasController, HorasService, SupervisorTokenGuard,
 * EnlaceAccesoService, AuditoriaService) con repositorios en memoria y ValidationPipe real,
 * ejecutando el 100% de los escenarios definidos en specs/012-ingresar-horas/spec.md.
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
import { EstadoHoras } from '../src/horas/enums/estado-horas.enum';
import { RegistroHoras } from '../src/horas/entities/registro-horas.entity';
import { RegistrarHorasDto } from '../src/horas/dto/registrar-horas.dto';
import { HorasService } from '../src/horas/horas.service';
import { HorasController } from '../src/horas/horas.controller';
import { DominioError } from '../src/compartido/errores/dominio.error';

class EnlaceAccesoRepoInMemory {
  private items: EnlaceAcceso[] = [];

  setItems(items: EnlaceAcceso[]) {
    this.items = items.map((e) => Object.assign(new EnlaceAcceso(), e));
  }

  getAll(): EnlaceAcceso[] {
    return this.items.map((e) => Object.assign(new EnlaceAcceso(), e));
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

class RegistroHorasRepoInMemory {
  private items: RegistroHoras[] = [];
  private seq = 1;

  reset() {
    this.items = [];
    this.seq = 1;
  }

  getAll(): RegistroHoras[] {
    return this.items.map((r) => Object.assign(new RegistroHoras(), r));
  }

  create(partial: Partial<RegistroHoras>): RegistroHoras {
    const entidad = new RegistroHoras();
    entidad.id = `reg-horas-${this.seq++}`;
    entidad.estudianteId = partial.estudianteId!;
    entidad.supervisorId = partial.supervisorId ?? null;
    entidad.fecha = partial.fecha!;
    entidad.horas = partial.horas!;
    entidad.descripcion = partial.descripcion ?? null;
    entidad.estado = partial.estado ?? EstadoHoras.REGISTRADA;
    entidad.creadoEn = new Date();
    return entidad;
  }

  async save(registro: RegistroHoras): Promise<RegistroHoras> {
    const copia = Object.assign(new RegistroHoras(), registro);
    this.items.push(copia);
    return Object.assign(new RegistroHoras(), copia);
  }
}

class AuditoriaRepoInMemory {
  public registros: Array<RegistroAuditoria & { duracionMs: number }> = [];
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
    const guardado = Object.assign(new RegistroAuditoria(), registro, {
      duracionMs: 0,
    });
    this.registros.push(guardado);
    return guardado;
  }
}

interface RespuestaSimulada<T = any> {
  statusCode: number;
  body: T;
  duracionMs: number;
}

async function simularPostHoras(params: {
  guard: SupervisorTokenGuard;
  controller: HorasController;
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
    url: '/horas',
    headers,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => HorasController as any,
    getHandler: () => params.controller.registrarHoras,
    getArgs: () => [req] as any,
    getArgByIndex: (i: number) => req,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;

  try {
    await params.guard.canActivate(context);

    const dtoValidado = (await params.pipe.transform(params.body, {
      type: 'body',
      metatype: RegistrarHorasDto,
    })) as RegistrarHorasDto;

    const enlace = req.enlaceAcceso as EnlaceSupervisorAutenticado;
    const resultado = await params.controller.registrarHoras(enlace, dtoValidado);
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
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-12 INGRESAR HORAS DE PRÁCTICA');
  console.log('====================================================================\n');

  const enlaceRepo = new EnlaceAccesoRepoInMemory();
  const registroHorasRepo = new RegistroHorasRepoInMemory();
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
  const horasService = new HorasService(
    registroHorasRepo as unknown as Repository<RegistroHoras>,
    enlaceAccesoService,
  );
  const horasController = new HorasController(horasService);
  const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

  const reiniciarDatos = () => {
    registroHorasRepo.reset();
    auditoriaRepo.reset();
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);

    enlaceRepo.setItems([
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-1',
        token: 'token-valido-001',
        estudianteId: '1053800000',
        supervisorId: 'sup-empresa-01',
        expiraEn: manana,
        usado: false,
        creadoEn: new Date(),
      }),
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-2',
        token: 'token-valido-002',
        estudianteId: '1053800000',
        supervisorId: 'sup-empresa-01',
        expiraEn: manana,
        usado: false,
        creadoEn: new Date(),
      }),
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-3',
        token: 'token-usado-003',
        estudianteId: '1053800000',
        supervisorId: 'sup-empresa-01',
        expiraEn: manana,
        usado: true,
        creadoEn: new Date(),
      }),
      Object.assign(new EnlaceAcceso(), {
        id: 'enlace-4',
        token: 'token-vencido-004',
        estudianteId: '1053800000',
        supervisorId: 'sup-empresa-01',
        expiraEn: ayer,
        usado: false,
        creadoEn: ayer,
      }),
    ]);
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Registro exitoso de horas con descripción opcional (flujo básico)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 1: Registro exitoso de horas con descripción opcional usando un enlace de acceso válido (flujo básico)',
  );
  reiniciarDatos();

  const resp1 = await simularPostHoras({
    guard: supervisorTokenGuard,
    controller: horasController,
    pipe: validationPipe,
    enlaceToken: 'token-valido-001',
    body: {
      fecha: '2026-04-15',
      horas: 8,
      descripcion: 'Desarrollo de pruebas e integración de servicios',
    },
  });

  assert.strictEqual(resp1.statusCode, 201, 'Debe responder con código HTTP 201');
  assert.strictEqual(resp1.body.estudianteId, '1053800000');
  assert.strictEqual(resp1.body.fecha, '2026-04-15');
  assert.strictEqual(resp1.body.horas, 8);
  assert.strictEqual(
    resp1.body.descripcion,
    'Desarrollo de pruebas e integración de servicios',
  );
  assert.strictEqual(
    resp1.body.estado,
    EstadoHoras.REGISTRADA,
    'El registro debe quedar en estado REGISTRADA sin verificarse automáticamente (RN-01)',
  );

  const enlaceDespues1 = await enlaceRepo.findOne({
    where: { token: 'token-valido-001' },
  });
  assert.strictEqual(
    enlaceDespues1?.usado,
    true,
    'El enlace utilizado debe quedar marcado como usado (ADR-004)',
  );
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 201, RegistroHoras creado para 1053800000 con 8h, descripción, estado REGISTRADA y enlace marcado como usado)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Registro exitoso de horas sin descripción (flujo alterno)
  // ---------------------------------------------------------------------------
  console.log('TEST 2: Registro exitoso de horas sin descripción (flujo alterno)');
  reiniciarDatos();

  const resp2 = await simularPostHoras({
    guard: supervisorTokenGuard,
    controller: horasController,
    pipe: validationPipe,
    enlaceToken: 'token-valido-002',
    body: {
      fecha: '2026-04-16',
      horas: 6,
    },
  });

  assert.strictEqual(resp2.statusCode, 201, 'Debe responder con código HTTP 201');
  assert.strictEqual(resp2.body.estudianteId, '1053800000');
  assert.strictEqual(resp2.body.fecha, '2026-04-16');
  assert.strictEqual(resp2.body.horas, 6);
  assert.strictEqual(resp2.body.descripcion, null);
  assert.strictEqual(resp2.body.estado, EstadoHoras.REGISTRADA);

  const enlaceDespues2 = await enlaceRepo.findOne({
    where: { token: 'token-valido-002' },
  });
  assert.strictEqual(enlaceDespues2?.usado, true);
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 201, RegistroHoras creado para 1053800000 con 6h sin descripción, estado REGISTRADA y enlace marcado como usado)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Rechazo por cantidad de horas o fecha inválida (excepción)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 3: Rechazo por cantidad de horas o fecha inválida (flujo alterno - excepción)',
  );
  reiniciarDatos();

  const respHorasCero = await simularPostHoras({
    guard: supervisorTokenGuard,
    controller: horasController,
    pipe: validationPipe,
    enlaceToken: 'token-valido-001',
    body: {
      fecha: '2026-04-15',
      horas: 0,
    },
  });
  assert.strictEqual(respHorasCero.statusCode, 400);

  const respHorasNegativas = await simularPostHoras({
    guard: supervisorTokenGuard,
    controller: horasController,
    pipe: validationPipe,
    enlaceToken: 'token-valido-001',
    body: {
      fecha: '2026-04-15',
      horas: -4,
    },
  });
  assert.strictEqual(respHorasNegativas.statusCode, 400);

  const respFechaInvalida = await simularPostHoras({
    guard: supervisorTokenGuard,
    controller: horasController,
    pipe: validationPipe,
    enlaceToken: 'token-valido-001',
    body: {
      fecha: 'fecha-no-valida',
      horas: 8,
    },
  });
  assert.strictEqual(respFechaInvalida.statusCode, 400);

  assert.strictEqual(
    registroHorasRepo.getAll().length,
    0,
    'No se debe crear ningún registro de horas ante datos inválidos',
  );
  const enlaceNoConsumido = await enlaceRepo.findOne({
    where: { token: 'token-valido-001' },
  });
  assert.strictEqual(
    enlaceNoConsumido?.usado,
    false,
    'El enlace no debe consumirse cuando la validación de datos falla',
  );
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 400 ante horas <= 0 o fecha inválida, 0 registros creados y el enlace permanece como no usado)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Esquema del escenario: Enlace inexistente, usado o vencido (EAC-03)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 4: Esquema del escenario: Bloqueo de ingreso de horas con enlace inexistente, ya utilizado o vencido (EAC-03 - Seguridad)',
  );
  reiniciarDatos();

  const ejemplosEnlace: Array<{ estado: string; token: string }> = [
    { estado: 'inexistente', token: 'token-que-no-existe-999' },
    { estado: 'usado', token: 'token-usado-003' },
    { estado: 'vencido', token: 'token-vencido-004' },
  ];

  for (const ejemplo of ejemplosEnlace) {
    const resp = await simularPostHoras({
      guard: supervisorTokenGuard,
      controller: horasController,
      pipe: validationPipe,
      enlaceToken: ejemplo.token,
      body: {
        fecha: '2026-04-15',
        horas: 8,
      },
    });

    assert.strictEqual(
      resp.statusCode,
      401,
      `El enlace ${ejemplo.estado} debe rechazarse con HTTP 401`,
    );
    assert.strictEqual(
      resp.body.mensaje,
      'enlace inválido, usado o vencido',
      'Debe retornar el mensaje exacto del escenario',
    );
    assert.ok(
      resp.duracionMs < 1000,
      `El bloqueo y registro en auditoría debe tardar menos de 1 s (tardó ${resp.duracionMs.toFixed(2)} ms)`,
    );
  }

  assert.strictEqual(
    registroHorasRepo.getAll().length,
    0,
    'No debe crearse ningún registro de horas con enlaces rechazados',
  );
  assert.strictEqual(
    auditoriaRepo.registros.length,
    3,
    'Los 3 intentos rechazados deben quedar registrados en RegistroAuditoria (EAC-03, PA-04)',
  );
  console.log(
    '  -> RESULTADO: CUMPLE (3/3 ejemplos [inexistente, usado, vencido] bloqueados con HTTP 401 "enlace inválido, usado o vencido" y auditados en < 1 s)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Bloqueo de ingreso de horas sin token de enlace (EAC-03)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 5: Bloqueo de ingreso de horas sin token de enlace o por un actor no autorizado (EAC-03 - Seguridad)',
  );
  reiniciarDatos();

  const respSinToken = await simularPostHoras({
    guard: supervisorTokenGuard,
    controller: horasController,
    pipe: validationPipe,
    enlaceToken: undefined,
    body: {
      fecha: '2026-04-15',
      horas: 8,
    },
  });

  assert.strictEqual(respSinToken.statusCode, 401);
  assert.ok(respSinToken.duracionMs < 1000);
  assert.strictEqual(registroHorasRepo.getAll().length, 0);
  assert.strictEqual(auditoriaRepo.registros.length, 1);
  assert.strictEqual(auditoriaRepo.registros[0].resultado, 'DENEGADO');
  assert.strictEqual(auditoriaRepo.registros[0].evento, 'ENLACE_SUPERVISOR_AUSENTE');

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 401 sin encabezado enlace-token, 0 registros creados y evento ENLACE_SUPERVISOR_AUSENTE registrado en RegistroAuditoria en < 1 s)\n',
  );

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 5/5 ESCENARIOS CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando pruebas de CU-12:', err);
  process.exit(1);
});
