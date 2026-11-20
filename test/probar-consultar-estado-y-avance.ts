/**
 * Pruebas ejecutables para CU-10: Consultar el estado de la postulación y el avance de horas.
 * Instancia las clases reales de src/ (PostulacionController, PostulacionService,
 * HorasController, HorasService, SsoAuthGuard, RolesGuard, AuditoriaService) con
 * repositorios en memoria, ejecutando el 100% de los escenarios definidos en
 * specs/010-consultar-estado-y-avance/spec.md.
 */

import 'reflect-metadata';
import * as assert from 'node:assert';
import { performance } from 'node:perf_hooks';
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SsoAuthGuard } from '../src/compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../src/compartido/auth/guards/roles.guard';
import { UsuarioAutenticado } from '../src/compartido/auth/decorators/usuario-actual.decorator';
import { EnlaceAccesoService } from '../src/compartido/auth/enlace-acceso.service';
import { RegistroAuditoria } from '../src/compartido/auditoria/entities/registro-auditoria.entity';
import { AuditoriaService } from '../src/compartido/auditoria/auditoria.service';
import { ConfiguracionService } from '../src/compartido/configuracion/configuracion.service';
import { Estudiante } from '../src/postulacion/entities/estudiante.entity';
import { Postulacion } from '../src/postulacion/entities/postulacion.entity';
import { EstadoPostulacion } from '../src/postulacion/enums/estado-postulacion.enum';
import { PostulacionService } from '../src/postulacion/postulacion.service';
import { PostulacionController } from '../src/postulacion/postulacion.controller';
import { RegistroHoras } from '../src/horas/entities/registro-horas.entity';
import { EstadoHoras } from '../src/horas/enums/estado-horas.enum';
import { AvanceHorasEstudianteDto } from '../src/horas/dto/avance-horas-estudiante.dto';
import { HorasService } from '../src/horas/horas.service';
import { HorasController } from '../src/horas/horas.controller';
import { DominioError } from '../src/compartido/errores/dominio.error';

const JWT_SECRET = 'secreto_pruebas_cu10';

class PostulacionRepoInMemory {
  private items: Postulacion[] = [];

  setItems(items: Postulacion[]) {
    this.items = items.map((p) => Object.assign(new Postulacion(), p));
  }

  async findOne(options: { where: any }): Promise<Postulacion | null> {
    const found = this.items.find(
      (p) =>
        options.where?.estudiante?.documento &&
        p.estudiante?.documento === options.where.estudiante.documento,
    );
    return found ? Object.assign(new Postulacion(), found) : null;
  }
}

class RegistroHorasRepoInMemory {
  private items: RegistroHoras[] = [];

  setItems(items: RegistroHoras[]) {
    this.items = items.map((r) => Object.assign(new RegistroHoras(), r));
  }

  async find(options?: {
    where?: Partial<Pick<RegistroHoras, 'estado' | 'estudianteId'>>;
    order?: Record<string, 'ASC' | 'DESC'>;
  }): Promise<RegistroHoras[]> {
    let resultado = this.items.map((r) => Object.assign(new RegistroHoras(), r));
    if (options?.where?.estudianteId) {
      resultado = resultado.filter(
        (r) => r.estudianteId === options.where!.estudianteId,
      );
    }
    if (options?.where?.estado) {
      resultado = resultado.filter((r) => r.estado === options.where!.estado);
    }
    return resultado;
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

async function simularGetMiPostulacion(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: PostulacionController;
  tokenJwt?: string;
}): Promise<RespuestaSimulada<Postulacion | null | any>> {
  const inicio = performance.now();
  const headers: Record<string, string> = {};
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'GET',
    url: '/postulaciones/mi-postulacion',
    headers,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => PostulacionController as any,
    getHandler: () => params.controller.obtenerMiPostulacion,
    getArgs: () => [req] as any,
    getArgByIndex: () => req,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;

  try {
    await params.ssoGuard.canActivate(context);
    await params.rolesGuard.canActivate(context);

    const usuario = req.user as UsuarioAutenticado;
    const resultado = await params.controller.obtenerMiPostulacion(usuario);
    return {
      statusCode: HttpStatus.OK,
      body: resultado,
      duracionMs: performance.now() - inicio,
    };
  } catch (error) {
    return manejarError(error, inicio);
  }
}

async function simularGetMiAvance(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: HorasController;
  tokenJwt?: string;
}): Promise<RespuestaSimulada<AvanceHorasEstudianteDto | any>> {
  const inicio = performance.now();
  const headers: Record<string, string> = {};
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'GET',
    url: '/horas/mi-avance',
    headers,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => HorasController as any,
    getHandler: () => params.controller.obtenerMiAvance,
    getArgs: () => [req] as any,
    getArgByIndex: () => req,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;

  try {
    await params.ssoGuard.canActivate(context);
    await params.rolesGuard.canActivate(context);

    const usuario = req.user as UsuarioAutenticado;
    const resultado = await params.controller.obtenerMiAvance(usuario);
    return {
      statusCode: HttpStatus.OK,
      body: resultado,
      duracionMs: performance.now() - inicio,
    };
  } catch (error) {
    return manejarError(error, inicio);
  }
}

function manejarError(error: unknown, inicio: number): RespuestaSimulada {
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
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-10 ESTADO Y AVANCE DE HORAS');
  console.log('====================================================================\n');

  const postulacionRepo = new PostulacionRepoInMemory();
  const registroHorasRepo = new RegistroHorasRepoInMemory();
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

  const postulacionService = new PostulacionService(
    postulacionRepo as unknown as Repository<Postulacion>,
    {} as unknown as Repository<Estudiante>,
    {} as unknown as ConfiguracionService,
    auditoriaService,
  );
  const postulacionController = new PostulacionController(postulacionService);

  const horasService = new HorasService(
    registroHorasRepo as unknown as Repository<RegistroHoras>,
    {} as unknown as EnlaceAccesoService,
    auditoriaService,
  );
  const horasController = new HorasController(horasService);

  const tokenEstudiante1 = await jwtService.signAsync({
    documento: '1053800000',
    programaAcademico: 'Ingeniería de Sistemas',
    rol: 'ESTUDIANTE',
  });

  const tokenEstudiante2 = await jwtService.signAsync({
    documento: '1053900000',
    programaAcademico: 'Ingeniería de Sistemas',
    rol: 'ESTUDIANTE',
  });

  const tokenAdmin = await jwtService.signAsync({
    documento: '30300300',
    programaAcademico: 'Administración',
    rol: 'ADMINISTRATIVO',
  });

  const cargarDatosBase = () => {
    auditoriaRepo.reset();
    postulacionRepo.setItems([
      Object.assign(new Postulacion(), {
        id: 'post-est-1',
        estado: EstadoPostulacion.VALIDADA,
        documentosAdjuntos: ['hoja_vida.pdf', 'carta_presentacion.pdf'],
        motivoRechazo: null,
        estudiante: Object.assign(new Estudiante(), {
          id: 'est-1',
          documento: '1053800000',
          programaAcademico: 'Ingeniería de Sistemas',
        }),
        creadaEn: new Date('2026-04-01T10:00:00Z'),
        actualizadaEn: new Date('2026-04-02T10:00:00Z'),
      }),
    ]);

    registroHorasRepo.setItems([
      Object.assign(new RegistroHoras(), {
        id: 'reg-h-1',
        estudianteId: '1053800000',
        supervisorId: 'sup-1',
        fecha: '2026-04-10',
        horas: 40,
        descripcion: 'Sprint 1 completado',
        estado: EstadoHoras.VERIFICADA,
        creadoEn: new Date('2026-04-10T10:00:00Z'),
      }),
      Object.assign(new RegistroHoras(), {
        id: 'reg-h-2',
        estudianteId: '1053800000',
        supervisorId: 'sup-1',
        fecha: '2026-04-17',
        horas: 8,
        descripcion: 'Avance Sprint 2',
        estado: EstadoHoras.REGISTRADA,
        creadoEn: new Date('2026-04-17T10:00:00Z'),
      }),
      Object.assign(new RegistroHoras(), {
        id: 'reg-h-ajeno',
        estudianteId: '1053999999',
        supervisorId: 'sup-2',
        fecha: '2026-04-17',
        horas: 100,
        descripcion: 'Horas de otro estudiante',
        estado: EstadoHoras.VERIFICADA,
        creadoEn: new Date('2026-04-17T10:00:00Z'),
      }),
    ]);
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Consulta exitosa del estado de la postulación y avance de horas
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 1: Consulta exitosa del estado de la postulación y del avance de horas del propio estudiante (flujo básico)',
  );
  cargarDatosBase();

  const respPostulacion = await simularGetMiPostulacion({
    ssoGuard,
    rolesGuard,
    controller: postulacionController,
    tokenJwt: tokenEstudiante1,
  });
  assert.strictEqual(respPostulacion.statusCode, 200);
  assert.strictEqual(respPostulacion.body.estado, EstadoPostulacion.VALIDADA);

  const respAvance = await simularGetMiAvance({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: tokenEstudiante1,
  });
  assert.strictEqual(respAvance.statusCode, 200);
  const avance: AvanceHorasEstudianteDto = respAvance.body;
  assert.strictEqual(avance.estudianteId, '1053800000');
  assert.strictEqual(avance.totalHorasVerificadas, 40);
  assert.strictEqual(avance.totalHorasRegistradas, 8);
  assert.strictEqual(avance.totalHorasReportadas, 48);
  assert.strictEqual(avance.registros.length, 2);

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 200 en ambas consultas: postulación VALIDADA, 40h verificadas, 8h registradas, 48h totales y 2 registros propios)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Consulta de avance cuando el estudiante aún no tiene horas
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 2: Consulta de avance cuando el estudiante aún no tiene horas registradas (flujo alterno)',
  );
  cargarDatosBase();

  const respSinHoras = await simularGetMiAvance({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: tokenEstudiante2,
  });

  assert.strictEqual(respSinHoras.statusCode, 200);
  assert.strictEqual(respSinHoras.body.estudianteId, '1053900000');
  assert.strictEqual(respSinHoras.body.totalHorasVerificadas, 0);
  assert.strictEqual(respSinHoras.body.totalHorasRegistradas, 0);
  assert.strictEqual(respSinHoras.body.totalHorasReportadas, 0);
  assert.strictEqual(respSinHoras.body.registros.length, 0);

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 200 con 0h verificadas, 0h pendientes, 0h totales y lista vacía)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Aislamiento de datos para que solo vea sus propias horas (EAC-03)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 3: Aislamiento de datos para que un estudiante solo vea sus propias horas (EAC-03 - Seguridad)',
  );
  cargarDatosBase();

  const respAislamiento = await simularGetMiAvance({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: tokenEstudiante1,
  });

  assert.strictEqual(respAislamiento.statusCode, 200);
  assert.ok(
    respAislamiento.body.registros.every(
      (r: RegistroHoras) => r.estudianteId === '1053800000',
    ),
    'Ningún registro devuelto puede pertenecer a otro estudiante',
  );
  assert.ok(
    !respAislamiento.body.registros.some(
      (r: RegistroHoras) => r.estudianteId === '1053999999',
    ),
    'No debe exponerse ningún registro del estudiante 1053999999',
  );

  console.log(
    '  -> RESULTADO: CUMPLE (Extracción de documento desde JWT institucional garantiza aislamiento total respecto a 1053999999)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Bloqueo de consulta sin autenticación o con rol distinto a estudiante
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 4: Bloqueo de consulta de avance de horas sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)',
  );
  cargarDatosBase();

  const respSinToken = await simularGetMiAvance({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: undefined,
  });
  assert.strictEqual(respSinToken.statusCode, 401);
  assert.ok(respSinToken.duracionMs < 1000);

  const respRolAdmin = await simularGetMiAvance({
    ssoGuard,
    rolesGuard,
    controller: horasController,
    tokenJwt: tokenAdmin,
  });
  assert.strictEqual(respRolAdmin.statusCode, 403);
  assert.ok(respRolAdmin.duracionMs < 1000);

  assert.strictEqual(auditoriaRepo.registros.length, 2);
  console.log(
    '  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403 y 2 eventos en RegistroAuditoria en < 1 s)\n',
  );

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 4/4 ESCENARIOS CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando pruebas de CU-10:', err);
  process.exit(1);
});
