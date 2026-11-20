/**
 * Pruebas ejecutables para CU-03: Asignar tutor al estudiante.
 * Instancia las clases reales de src/ (AsignacionTutorController, AsignacionTutorService,
 * SsoAuthGuard, RolesGuard, AuditoriaService) con repositorios en memoria y ValidationPipe real,
 * ejecutando el 100% de los escenarios definidos en specs/003-asignar-tutor/spec.md.
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
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SsoAuthGuard } from '../src/compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../src/compartido/auth/guards/roles.guard';
import { UsuarioAutenticado } from '../src/compartido/auth/decorators/usuario-actual.decorator';
import { RegistroAuditoria } from '../src/compartido/auditoria/entities/registro-auditoria.entity';
import { AuditoriaService } from '../src/compartido/auditoria/auditoria.service';
import { Supervisor } from '../src/asignacion-tutor/entities/supervisor.entity';
import { AsignacionTutor } from '../src/asignacion-tutor/entities/asignacion-tutor.entity';
import { AsignarTutorDto } from '../src/asignacion-tutor/dto/asignar-tutor.dto';
import { AsignacionTutorService } from '../src/asignacion-tutor/asignacion-tutor.service';
import { AsignacionTutorController } from '../src/asignacion-tutor/asignacion-tutor.controller';
import { DominioError } from '../src/compartido/errores/dominio.error';

const JWT_SECRET = 'secreto_pruebas_cu03';

class SupervisorRepoInMemory {
  private items: Supervisor[] = [];
  private seq = 1;

  reset() {
    this.items = [];
    this.seq = 1;
  }

  async findOne(options: { where: { correo: string } }): Promise<Supervisor | null> {
    const found = this.items.find((s) => s.correo === options.where.correo);
    return found ? Object.assign(new Supervisor(), found) : null;
  }

  create(partial: Partial<Supervisor>): Supervisor {
    const sup = new Supervisor();
    sup.id = `sup-${this.seq++}`;
    sup.correo = partial.correo!;
    sup.nombre = partial.nombre ?? null;
    sup.creadoEn = new Date();
    return sup;
  }

  async save(supervisor: Supervisor): Promise<Supervisor> {
    const idx = this.items.findIndex((s) => s.id === supervisor.id);
    const copia = Object.assign(new Supervisor(), supervisor);
    if (idx >= 0) {
      this.items[idx] = copia;
    } else {
      this.items.push(copia);
    }
    return Object.assign(new Supervisor(), copia);
  }
}

class AsignacionTutorRepoInMemory {
  private items: AsignacionTutor[] = [];
  private seq = 1;

  reset() {
    this.items = [];
    this.seq = 1;
  }

  getAll(): AsignacionTutor[] {
    return this.items.map((a) => Object.assign(new AsignacionTutor(), a));
  }

  async findOne(options: {
    where: { estudianteId: string };
  }): Promise<AsignacionTutor | null> {
    const found = this.items.find(
      (a) => a.estudianteId === options.where.estudianteId,
    );
    return found ? Object.assign(new AsignacionTutor(), found) : null;
  }

  create(partial: Partial<AsignacionTutor>): AsignacionTutor {
    const asig = new AsignacionTutor();
    asig.id = `asig-${this.seq++}`;
    asig.estudianteId = partial.estudianteId!;
    asig.supervisor = partial.supervisor!;
    asig.asignadaEn = new Date();
    return asig;
  }

  async save(asignacion: AsignacionTutor): Promise<AsignacionTutor> {
    const idx = this.items.findIndex((a) => a.id === asignacion.id);
    const copia = Object.assign(new AsignacionTutor(), asignacion);
    if (idx >= 0) {
      this.items[idx] = copia;
    } else {
      this.items.push(copia);
    }
    return Object.assign(new AsignacionTutor(), copia);
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

async function simularPostAsignacionTutor(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: AsignacionTutorController;
  pipe: ValidationPipe;
  tokenJwt?: string;
  body: Record<string, any>;
}): Promise<RespuestaSimulada> {
  const inicio = performance.now();
  const headers: Record<string, string> = {};
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'POST',
    url: '/asignaciones-tutor',
    headers,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => AsignacionTutorController as any,
    getHandler: () => params.controller.asignarTutor,
    getArgs: () => [req] as any,
    getArgByIndex: () => req,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;

  try {
    await params.ssoGuard.canActivate(context);
    await params.rolesGuard.canActivate(context);

    const dtoValidado = (await params.pipe.transform(params.body, {
      type: 'body',
      metatype: AsignarTutorDto,
    })) as AsignarTutorDto;

    const usuario = req.user as UsuarioAutenticado;
    const resultado = await params.controller.asignarTutor(dtoValidado, usuario);
    return {
      statusCode: HttpStatus.CREATED,
      body: resultado,
      duracionMs: performance.now() - inicio,
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
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-03 ASIGNAR TUTOR AL ESTUDIANTE');
  console.log('====================================================================\n');

  const supervisorRepo = new SupervisorRepoInMemory();
  const asignacionRepo = new AsignacionTutorRepoInMemory();
  const auditoriaRepo = new AuditoriaRepoInMemory();

  const auditoriaService = new AuditoriaService(
    auditoriaRepo as unknown as Repository<RegistroAuditoria>,
  );
  const jwtService = new JwtService({ secret: JWT_SECRET });
  const configService = {
    get: (key: string) => (key === 'SSO_JWT_SECRET' ? JWT_SECRET : undefined),
  } as unknown as ConfigService;

  const ssoGuard = new SsoAuthGuard(jwtService, configService, auditoriaService);
  const rolesGuard = new RolesGuard(new Reflector(), auditoriaService);
  const asignacionTutorService = new AsignacionTutorService(
    supervisorRepo as unknown as Repository<Supervisor>,
    asignacionRepo as unknown as Repository<AsignacionTutor>,
    auditoriaService,
  );
  const asignacionTutorController = new AsignacionTutorController(
    asignacionTutorService,
  );
  const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

  const tokenAdmin = await jwtService.signAsync({
    documento: '30300300',
    programaAcademico: 'Administración',
    rol: 'ADMINISTRATIVO',
  });

  const tokenEstudiante = await jwtService.signAsync({
    documento: '1053800000',
    programaAcademico: 'Ingeniería de Sistemas',
    rol: 'ESTUDIANTE',
  });

  const reiniciarDatos = () => {
    supervisorRepo.reset();
    asignacionRepo.reset();
    auditoriaRepo.reset();
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Asignación inicial exitosa de tutor con nombre opcional
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 1: Asignación inicial exitosa de tutor con nombre opcional (flujo básico)',
  );
  reiniciarDatos();

  const resp1 = await simularPostAsignacionTutor({
    ssoGuard,
    rolesGuard,
    controller: asignacionTutorController,
    pipe: validationPipe,
    tokenJwt: tokenAdmin,
    body: {
      estudianteId: '1053800000',
      correoSupervisor: 'supervisor@empresa.com',
      nombreSupervisor: 'Carlos Gómez',
    },
  });

  assert.strictEqual(resp1.statusCode, 201);
  assert.strictEqual(resp1.body.estudianteId, '1053800000');
  assert.strictEqual(resp1.body.supervisor.correo, 'supervisor@empresa.com');
  assert.strictEqual(resp1.body.supervisor.nombre, 'Carlos Gómez');
  assert.ok(resp1.body.asignadaEn instanceof Date);

  assert.strictEqual(auditoriaRepo.registros.length, 1);
  assert.strictEqual(auditoriaRepo.registros[0].evento, 'ASIGNACION_TUTOR');
  assert.strictEqual(auditoriaRepo.registros[0].actorId, '30300300');
  assert.strictEqual(auditoriaRepo.registros[0].resultado, 'EXITOSO');

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 201, AsignacionTutor creada para 1053800000 con supervisor@empresa.com, fecha asignadaEn y evento auditado con actor 30300300)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Actualización del tutor asignado a un estudiante con asignación previa
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 2: Actualización del tutor asignado a un estudiante que ya tenía asignación previa (flujo alterno)',
  );
  reiniciarDatos();

  await simularPostAsignacionTutor({
    ssoGuard,
    rolesGuard,
    controller: asignacionTutorController,
    pipe: validationPipe,
    tokenJwt: tokenAdmin,
    body: {
      estudianteId: '1053800000',
      correoSupervisor: 'anterior@empresa.com',
    },
  });

  const respActualizar = await simularPostAsignacionTutor({
    ssoGuard,
    rolesGuard,
    controller: asignacionTutorController,
    pipe: validationPipe,
    tokenJwt: tokenAdmin,
    body: {
      estudianteId: '1053800000',
      correoSupervisor: 'nuevo.tutor@empresa.com',
    },
  });

  assert.strictEqual(respActualizar.statusCode, 201);
  assert.strictEqual(respActualizar.body.estudianteId, '1053800000');
  assert.strictEqual(
    respActualizar.body.supervisor.correo,
    'nuevo.tutor@empresa.com',
  );
  assert.strictEqual(
    asignacionRepo.getAll().length,
    1,
    'Debe actualizarse la asignación existente del estudiante sin duplicar registros',
  );
  assert.strictEqual(auditoriaRepo.registros.length, 2);

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 201, relación estudiante-tutor actualizada a nuevo.tutor@empresa.com y auditada con actor 30300300)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Rechazo por datos inválidos como correo incorrecto o estudiante vacío
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 3: Rechazo por datos inválidos como correo con formato incorrecto o estudiante vacío (excepción)',
  );
  reiniciarDatos();

  const respCorreoInvalido = await simularPostAsignacionTutor({
    ssoGuard,
    rolesGuard,
    controller: asignacionTutorController,
    pipe: validationPipe,
    tokenJwt: tokenAdmin,
    body: {
      estudianteId: '1053800000',
      correoSupervisor: 'correo-sin-arroba',
    },
  });
  assert.strictEqual(respCorreoInvalido.statusCode, 400);

  const respSinEstudiante = await simularPostAsignacionTutor({
    ssoGuard,
    rolesGuard,
    controller: asignacionTutorController,
    pipe: validationPipe,
    tokenJwt: tokenAdmin,
    body: {
      estudianteId: '',
      correoSupervisor: 'supervisor@empresa.com',
    },
  });
  assert.strictEqual(respSinEstudiante.statusCode, 400);

  assert.strictEqual(asignacionRepo.getAll().length, 0);
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 400 ante correo inválido o estudiante vacío y 0 asignaciones creadas)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Bloqueo de asignación sin autenticación o con rol no administrativo
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 4: Bloqueo de asignación de tutor sin autenticación o con rol no administrativo (EAC-03 - Seguridad)',
  );
  reiniciarDatos();

  const respSinToken = await simularPostAsignacionTutor({
    ssoGuard,
    rolesGuard,
    controller: asignacionTutorController,
    pipe: validationPipe,
    tokenJwt: undefined,
    body: {
      estudianteId: '1053800000',
      correoSupervisor: 'supervisor@empresa.com',
    },
  });
  assert.strictEqual(respSinToken.statusCode, 401);
  assert.ok(respSinToken.duracionMs < 1000);

  const respEstudiante = await simularPostAsignacionTutor({
    ssoGuard,
    rolesGuard,
    controller: asignacionTutorController,
    pipe: validationPipe,
    tokenJwt: tokenEstudiante,
    body: {
      estudianteId: '1053800000',
      correoSupervisor: 'supervisor@empresa.com',
    },
  });
  assert.strictEqual(respEstudiante.statusCode, 403);
  assert.ok(respEstudiante.duracionMs < 1000);

  assert.strictEqual(asignacionRepo.getAll().length, 0);
  assert.strictEqual(auditoriaRepo.registros.length, 2);

  console.log(
    '  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, 0 asignaciones creadas y 2 eventos en RegistroAuditoria en < 1 s)\n',
  );

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 4/4 ESCENARIOS CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando pruebas de CU-03:', err);
  process.exit(1);
});
