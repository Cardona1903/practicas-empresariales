/**
 * Pruebas ejecutables para CU-05: Verificar horas de estudiantes.
 * Instancia las clases reales de src/ (HorasController, HorasService, SsoAuthGuard,
 * RolesGuard, AuditoriaService) con repositorios en memoria y ValidationPipe real,
 * ejecutando el 100% de los escenarios definidos en specs/005-verificar-horas/spec.md.
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
import { EnlaceAcceso } from '../src/compartido/auth/entities/enlace-acceso.entity';
import { EnlaceAccesoService } from '../src/compartido/auth/enlace-acceso.service';
import { SsoAuthGuard } from '../src/compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../src/compartido/auth/guards/roles.guard';
import { UsuarioAutenticado } from '../src/compartido/auth/decorators/usuario-actual.decorator';
import { RegistroAuditoria } from '../src/compartido/auditoria/entities/registro-auditoria.entity';
import { AuditoriaService } from '../src/compartido/auditoria/auditoria.service';
import { EstadoHoras } from '../src/horas/enums/estado-horas.enum';
import { RegistroHoras } from '../src/horas/entities/registro-horas.entity';
import { ConsultarHorasFiltroDto } from '../src/horas/dto/consultar-horas-filtro.dto';
import { HorasService } from '../src/horas/horas.service';
import { HorasController } from '../src/horas/horas.controller';
import { DominioError } from '../src/compartido/errores/dominio.error';

const JWT_SECRET = 'secreto_pruebas_cu05';

class RegistroHorasRepoInMemory {
  private items: RegistroHoras[] = [];

  setItems(items: RegistroHoras[]) {
    this.items = items.map((r) => Object.assign(new RegistroHoras(), r));
  }

  getAll(): RegistroHoras[] {
    return this.items.map((r) => Object.assign(new RegistroHoras(), r));
  }

  async find(options?: {
    where?: Partial<Pick<RegistroHoras, 'estado' | 'estudianteId'>>;
    order?: Record<string, 'ASC' | 'DESC'>;
  }): Promise<RegistroHoras[]> {
    let resultado = this.items.map((r) => Object.assign(new RegistroHoras(), r));
    if (options?.where?.estado) {
      resultado = resultado.filter((r) => r.estado === options.where!.estado);
    }
    if (options?.where?.estudianteId) {
      resultado = resultado.filter(
        (r) => r.estudianteId === options.where!.estudianteId,
      );
    }
    return resultado;
  }

  async findOne(options: { where: { id: string } }): Promise<RegistroHoras | null> {
    const found = this.items.find((r) => r.id === options.where.id);
    return found ? Object.assign(new RegistroHoras(), found) : null;
  }

  async save(registro: RegistroHoras): Promise<RegistroHoras> {
    const idx = this.items.findIndex((r) => r.id === registro.id);
    const copia = Object.assign(new RegistroHoras(), registro);
    if (idx >= 0) {
      this.items[idx] = copia;
    } else {
      this.items.push(copia);
    }
    return Object.assign(new RegistroHoras(), copia);
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

function crearExecutionContext(
  req: any,
  handler: Function,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => HorasController as any,
    getHandler: () => handler,
    getArgs: () => [req] as any,
    getArgByIndex: () => req,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;
}

async function simularGetHoras(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: HorasController;
  pipe: ValidationPipe;
  tokenJwt?: string;
  query: Record<string, any>;
}): Promise<RespuestaSimulada> {
  const inicio = performance.now();
  const headers: Record<string, string> = {};
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'GET',
    url: '/horas',
    headers,
    query: params.query,
  };

  const context = crearExecutionContext(req, params.controller.listarHoras);

  try {
    await params.ssoGuard.canActivate(context);
    await params.rolesGuard.canActivate(context);

    const filtroValidado = (await params.pipe.transform(params.query, {
      type: 'query',
      metatype: ConsultarHorasFiltroDto,
    })) as ConsultarHorasFiltroDto;

    const resultado = await params.controller.listarHoras(filtroValidado);
    return {
      statusCode: HttpStatus.OK,
      body: resultado,
      duracionMs: performance.now() - inicio,
    };
  } catch (error) {
    return manejarExcepcion(error, inicio);
  }
}

async function simularPatchHoras(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: HorasController;
  tokenJwt?: string;
  id: string;
}): Promise<RespuestaSimulada> {
  const inicio = performance.now();
  const headers: Record<string, string> = {};
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'PATCH',
    url: `/horas/${params.id}`,
    headers,
  };

  const context = crearExecutionContext(req, params.controller.verificarHoras);

  try {
    await params.ssoGuard.canActivate(context);
    await params.rolesGuard.canActivate(context);

    const usuario = req.user as UsuarioAutenticado;
    const resultado = await params.controller.verificarHoras(params.id, usuario);
    return {
      statusCode: HttpStatus.OK,
      body: resultado,
      duracionMs: performance.now() - inicio,
    };
  } catch (error) {
    return manejarExcepcion(error, inicio);
  }
}

function manejarExcepcion(error: unknown, inicio: number): RespuestaSimulada {
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

async function ejecutarPruebas() {
  console.log('====================================================================');
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-05 VERIFICAR HORAS DE ESTUDIANTES');
  console.log('====================================================================\n');

  const registroHorasRepo = new RegistroHorasRepoInMemory();
  const auditoriaRepo = new AuditoriaRepoInMemory();

  const auditoriaService = new AuditoriaService(
    auditoriaRepo as unknown as Repository<RegistroAuditoria>,
  );
  const enlaceAccesoService = new EnlaceAccesoService(
    {} as unknown as Repository<EnlaceAcceso>,
  );
  const jwtService = new JwtService({ secret: JWT_SECRET });
  const configService = {
    get: (key: string) => (key === 'SSO_JWT_SECRET' ? JWT_SECRET : undefined),
  } as unknown as ConfigService;

  const ssoGuard = new SsoAuthGuard(jwtService, configService, auditoriaService);
  const rolesGuard = new RolesGuard(new Reflector(), auditoriaService);
  const horasService = new HorasService(
    registroHorasRepo as unknown as Repository<RegistroHoras>,
    enlaceAccesoService,
    auditoriaService,
  );
  const horasController = new HorasController(horasService);
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
    auditoriaRepo.reset();
    registroHorasRepo.setItems([
      Object.assign(new RegistroHoras(), {
        id: 'horas-001',
        estudianteId: '1053800000',
        supervisorId: 'sup-01',
        fecha: '2026-04-10',
        horas: 6,
        descripcion: 'Diseño de arquitectura',
        estado: EstadoHoras.VERIFICADA,
        creadoEn: new Date('2026-04-10T10:00:00Z'),
      }),
      Object.assign(new RegistroHoras(), {
        id: 'horas-002',
        estudianteId: '1053800000',
        supervisorId: 'sup-01',
        fecha: '2026-04-15',
        horas: 8,
        descripcion: 'Implementación de servicios',
        estado: EstadoHoras.REGISTRADA,
        creadoEn: new Date('2026-04-15T10:00:00Z'),
      }),
      Object.assign(new RegistroHoras(), {
        id: 'horas-003',
        estudianteId: '1053900000',
        supervisorId: 'sup-02',
        fecha: '2026-04-16',
        horas: 4,
        descripcion: 'Pruebas unitarias',
        estado: EstadoHoras.REGISTRADA,
        creadoEn: new Date('2026-04-16T10:00:00Z'),
      }),
    ]);
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Consultar listado de registros de horas con filtros opcionales
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 1: Consultar listado de registros de horas con filtros opcionales de estado y estudiante (flujo básico)',
  );
  reiniciarDatos();

  const respPendientes = await simularGetHoras({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    pipe: validationPipe,
    tokenJwt: tokenAdmin,
    query: { estado: 'REGISTRADA' },
  });

  assert.strictEqual(respPendientes.statusCode, 200);
  assert.strictEqual(respPendientes.body.length, 2);
  assert.ok(
    respPendientes.body.every((r: RegistroHoras) => r.estado === EstadoHoras.REGISTRADA),
    'Todos los registros devueltos deben estar en estado REGISTRADA',
  );

  const respPorEstudiante = await simularGetHoras({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    pipe: validationPipe,
    tokenJwt: tokenAdmin,
    query: { estado: 'REGISTRADA', estudianteId: '1053800000' },
  });

  assert.strictEqual(respPorEstudiante.statusCode, 200);
  assert.strictEqual(respPorEstudiante.body.length, 1);
  assert.strictEqual(respPorEstudiante.body[0].id, 'horas-002');
  assert.strictEqual(respPorEstudiante.body[0].estudianteId, '1053800000');

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 200, filtrado por estado=REGISTRADA retorna 2 pendientes; filtrado con estudianteId=1053800000 retorna únicamente horas-002)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Verificar manualmente un registro pendiente y consolidar total
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 2: Verificar manualmente un registro de horas pendiente y consolidar total verificado (flujo básico)',
  );
  reiniciarDatos();

  const totalAntes = await horasService.totalHorasValidadas('1053800000');
  assert.strictEqual(totalAntes, 6, 'El total inicial verificado debe ser 6 horas');

  const respVerificar = await simularPatchHoras({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: tokenAdmin,
    id: 'horas-002',
  });

  assert.strictEqual(respVerificar.statusCode, 200);
  assert.strictEqual(respVerificar.body.id, 'horas-002');
  assert.strictEqual(respVerificar.body.estado, EstadoHoras.VERIFICADA);

  const totalDespues = await horasService.totalHorasValidadas('1053800000');
  assert.strictEqual(
    totalDespues,
    14,
    'El total consolidado de horas verificadas debe pasar de 6 a 14 horas (ADR-005)',
  );

  assert.strictEqual(auditoriaRepo.registros.length, 1);
  assert.strictEqual(auditoriaRepo.registros[0].evento, 'VERIFICACION_HORAS');
  assert.strictEqual(auditoriaRepo.registros[0].actorId, '30300300');
  assert.strictEqual(auditoriaRepo.registros[0].resultado, 'EXITOSO');

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 200, horas-002 pasa a VERIFICADA, total consolidado sube de 6 a 14 horas y cambio auditado con actor 30300300)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Intento de verificar un registro que ya estaba verificado (409)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 3: Intento de verificar un registro de horas que ya estaba verificado (excepción)',
  );
  reiniciarDatos();

  const respYaVerificado = await simularPatchHoras({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: tokenAdmin,
    id: 'horas-001',
  });

  assert.strictEqual(respYaVerificado.statusCode, 409);
  const reg001 = await registroHorasRepo.findOne({ where: { id: 'horas-001' } });
  assert.strictEqual(reg001?.estado, EstadoHoras.VERIFICADA);

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 409 Conflict retornado cuando el registro ya está en estado VERIFICADA)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Verificación de un registro de horas inexistente (404)
  // ---------------------------------------------------------------------------
  console.log('TEST 4: Verificación de un registro de horas inexistente (excepción)');
  reiniciarDatos();

  const respInexistente = await simularPatchHoras({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: tokenAdmin,
    id: 'horas-inexistente-999',
  });

  assert.strictEqual(respInexistente.statusCode, 404);
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 404 Not Found retornado para identificador inexistente)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Bloqueo de consulta o verificación sin rol administrativo (EAC-03)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 5: Bloqueo de consulta o verificación de horas sin rol administrativo (EAC-03 - Seguridad)',
  );
  reiniciarDatos();

  const respSinTokenGet = await simularGetHoras({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    pipe: validationPipe,
    tokenJwt: undefined,
    query: { estado: 'REGISTRADA' },
  });
  assert.strictEqual(respSinTokenGet.statusCode, 401);
  assert.ok(respSinTokenGet.duracionMs < 1000);

  const respEstudianteGet = await simularGetHoras({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    pipe: validationPipe,
    tokenJwt: tokenEstudiante,
    query: { estado: 'REGISTRADA' },
  });
  assert.strictEqual(respEstudianteGet.statusCode, 403);
  assert.ok(respEstudianteGet.duracionMs < 1000);

  const respEstudiantePatch = await simularPatchHoras({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: tokenEstudiante,
    id: 'horas-002',
  });
  assert.strictEqual(respEstudiantePatch.statusCode, 403);
  assert.ok(respEstudiantePatch.duracionMs < 1000);

  const reg002 = await registroHorasRepo.findOne({ where: { id: 'horas-002' } });
  assert.strictEqual(
    reg002?.estado,
    EstadoHoras.REGISTRADA,
    'El registro horas-002 no debe cambiar de estado tras intentos no autorizados',
  );
  assert.strictEqual(
    auditoriaRepo.registros.length,
    3,
    'Los 3 intentos no autorizados deben registrarse en RegistroAuditoria en < 1 s (EAC-03, PA-04)',
  );

  console.log(
    '  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, registros sin cambios y 3 eventos en RegistroAuditoria en < 1 s)\n',
  );

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 5/5 ESCENARIOS CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando pruebas de CU-05:', err);
  process.exit(1);
});
