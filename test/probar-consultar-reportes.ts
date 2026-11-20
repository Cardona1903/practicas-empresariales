/**
 * Pruebas ejecutables para CU-08: Consultar reportes/indicadores del estado de las prácticas en curso.
 * Instancia las clases reales de src/ (ReportesController, ReportesService, PostulacionService,
 * HorasService, SsoAuthGuard, RolesGuard, AuditoriaService) con repositorios en memoria,
 * ejecutando el 100% de los escenarios definidos en specs/008-consultar-reportes/spec.md.
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
import { EnlaceAcceso } from '../src/compartido/auth/entities/enlace-acceso.entity';
import { EnlaceAccesoService } from '../src/compartido/auth/enlace-acceso.service';
import { RegistroAuditoria } from '../src/compartido/auditoria/entities/registro-auditoria.entity';
import { AuditoriaService } from '../src/compartido/auditoria/auditoria.service';
import { ConfiguracionService } from '../src/compartido/configuracion/configuracion.service';
import { Estudiante } from '../src/postulacion/entities/estudiante.entity';
import { Postulacion } from '../src/postulacion/entities/postulacion.entity';
import { EstadoPostulacion } from '../src/postulacion/enums/estado-postulacion.enum';
import { PostulacionService } from '../src/postulacion/postulacion.service';
import { RegistroHoras } from '../src/horas/entities/registro-horas.entity';
import { EstadoHoras } from '../src/horas/enums/estado-horas.enum';
import { HorasService } from '../src/horas/horas.service';
import { ReportesService } from '../src/administracion/reportes.service';
import { ReportesController } from '../src/administracion/reportes.controller';
import { ReportePracticasDto } from '../src/administracion/dto/reporte-practicas.dto';
import { DominioError } from '../src/compartido/errores/dominio.error';

const JWT_SECRET = 'secreto_pruebas_cu08';

class PostulacionRepoInMemory {
  private items: Postulacion[] = [];

  setItems(items: Postulacion[]) {
    this.items = items.map((p) => Object.assign(new Postulacion(), p));
  }

  async find(): Promise<Postulacion[]> {
    return this.items.map((p) => Object.assign(new Postulacion(), p));
  }

  async findOne(options: { where: any }): Promise<Postulacion | null> {
    const found = this.items.find((p) => {
      if (options.where.id && p.id === options.where.id) {
        return true;
      }
      if (
        options.where.estudiante?.documento &&
        p.estudiante?.documento === options.where.estudiante.documento
      ) {
        return true;
      }
      return false;
    });
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

async function simularGetReportes(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: ReportesController;
  tokenJwt?: string;
}): Promise<RespuestaSimulada<ReportePracticasDto | any>> {
  const inicio = performance.now();
  const headers: Record<string, string> = {};
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'GET',
    url: '/administracion/reportes',
    headers,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => ReportesController as any,
    getHandler: () => params.controller.obtenerReportePracticas,
    getArgs: () => [req] as any,
    getArgByIndex: () => req,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;

  try {
    await params.ssoGuard.canActivate(context);
    await params.rolesGuard.canActivate(context);

    const resultado = await params.controller.obtenerReportePracticas();
    return {
      statusCode: HttpStatus.OK,
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
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-08 CONSULTAR REPORTES');
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

  const horasService = new HorasService(
    registroHorasRepo as unknown as Repository<RegistroHoras>,
    {} as unknown as EnlaceAccesoService,
    auditoriaService,
  );

  const reportesService = new ReportesService(postulacionService, horasService);
  const reportesController = new ReportesController(reportesService);

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

  // ---------------------------------------------------------------------------
  // TEST 1: Consulta exitosa de indicadores globales y avance de prácticas
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 1: Consulta exitosa de indicadores globales y avance de prácticas en curso (flujo básico)',
  );
  auditoriaRepo.reset();

  postulacionRepo.setItems([
    Object.assign(new Postulacion(), {
      id: 'post-1',
      estado: EstadoPostulacion.VALIDADA,
      documentosAdjuntos: ['hoja_vida.pdf'],
      motivoRechazo: null,
      estudiante: Object.assign(new Estudiante(), {
        id: 'est-1',
        documento: '1053800000',
        programaAcademico: 'Ingeniería de Sistemas',
      }),
      creadaEn: new Date('2026-04-01T10:00:00Z'),
      actualizadaEn: new Date('2026-04-02T10:00:00Z'),
    }),
    Object.assign(new Postulacion(), {
      id: 'post-2',
      estado: EstadoPostulacion.EN_REVISION,
      documentosAdjuntos: ['hoja_vida.pdf'],
      motivoRechazo: null,
      estudiante: Object.assign(new Estudiante(), {
        id: 'est-2',
        documento: '1053900000',
        programaAcademico: 'Ingeniería de Alimentos',
      }),
      creadaEn: new Date('2026-04-03T10:00:00Z'),
      actualizadaEn: new Date('2026-04-04T10:00:00Z'),
    }),
    Object.assign(new Postulacion(), {
      id: 'post-3',
      estado: EstadoPostulacion.RECIBIDA,
      documentosAdjuntos: ['hoja_vida.pdf'],
      motivoRechazo: null,
      estudiante: Object.assign(new Estudiante(), {
        id: 'est-3',
        documento: '1054000000',
        programaAcademico: 'Ingeniería de Sistemas',
      }),
      creadaEn: new Date('2026-04-05T10:00:00Z'),
      actualizadaEn: new Date('2026-04-05T10:00:00Z'),
    }),
    Object.assign(new Postulacion(), {
      id: 'post-4',
      estado: EstadoPostulacion.RECHAZADA,
      documentosAdjuntos: ['hoja_vida.pdf'],
      motivoRechazo: 'Falta firma',
      estudiante: Object.assign(new Estudiante(), {
        id: 'est-4',
        documento: '1054100000',
        programaAcademico: 'Ingeniería Química',
      }),
      creadaEn: new Date('2026-04-06T10:00:00Z'),
      actualizadaEn: new Date('2026-04-07T10:00:00Z'),
    }),
  ]);

  registroHorasRepo.setItems([
    Object.assign(new RegistroHoras(), {
      id: 'h-1',
      estudianteId: '1053800000',
      supervisorId: 'sup-1',
      fecha: '2026-04-10',
      horas: 40,
      descripcion: null,
      estado: EstadoHoras.VERIFICADA,
      creadoEn: new Date(),
    }),
    Object.assign(new RegistroHoras(), {
      id: 'h-2',
      estudianteId: '1053800000',
      supervisorId: 'sup-1',
      fecha: '2026-04-17',
      horas: 24,
      descripcion: null,
      estado: EstadoHoras.VERIFICADA,
      creadoEn: new Date(),
    }),
    Object.assign(new RegistroHoras(), {
      id: 'h-3',
      estudianteId: '1053800000',
      supervisorId: 'sup-1',
      fecha: '2026-04-24',
      horas: 8,
      descripcion: null,
      estado: EstadoHoras.REGISTRADA,
      creadoEn: new Date(),
    }),
  ]);

  const resp1 = await simularGetReportes({
    ssoGuard,
    rolesGuard,
    controller: reportesController,
    tokenJwt: tokenAdmin,
  });

  assert.strictEqual(resp1.statusCode, 200);
  const reporte: ReportePracticasDto = resp1.body;
  assert.strictEqual(reporte.resumenPostulaciones.totalPostulaciones, 4);
  assert.strictEqual(reporte.resumenPostulaciones.recibidas, 1);
  assert.strictEqual(reporte.resumenPostulaciones.enRevision, 1);
  assert.strictEqual(reporte.resumenPostulaciones.validadas, 1);
  assert.strictEqual(reporte.resumenPostulaciones.rechazadas, 1);

  const practicaEst1 = reporte.practicas.find(
    (p) => p.estudianteId === '1053800000',
  );
  assert.ok(practicaEst1);
  assert.strictEqual(practicaEst1.estadoPostulacion, EstadoPostulacion.VALIDADA);
  assert.strictEqual(
    practicaEst1.totalHorasValidadas,
    64,
    'Debe consolidar únicamente las horas en estado VERIFICADA (40 + 24 = 64)',
  );

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 200, indicadores por estado [total=4, 1 por estado] y horas verificadas consolidadas [64h para 1053800000])\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Consulta de reportes cuando aún no hay postulaciones registradas
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 2: Consulta de reportes cuando aún no hay postulaciones registradas (flujo alterno)',
  );
  postulacionRepo.setItems([]);
  registroHorasRepo.setItems([]);

  const respVacio = await simularGetReportes({
    ssoGuard,
    rolesGuard,
    controller: reportesController,
    tokenJwt: tokenAdmin,
  });

  assert.strictEqual(respVacio.statusCode, 200);
  assert.strictEqual(respVacio.body.resumenPostulaciones.totalPostulaciones, 0);
  assert.strictEqual(respVacio.body.resumenPostulaciones.recibidas, 0);
  assert.strictEqual(respVacio.body.resumenPostulaciones.enRevision, 0);
  assert.strictEqual(respVacio.body.resumenPostulaciones.validadas, 0);
  assert.strictEqual(respVacio.body.resumenPostulaciones.rechazadas, 0);
  assert.strictEqual(respVacio.body.practicas.length, 0);

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 200, contadores en 0 y lista de prácticas vacía)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Bloqueo de consulta sin autenticación o con rol no administrativo
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 3: Bloqueo de consulta de reportes sin autenticación o con rol no administrativo (EAC-03 - Seguridad)',
  );
  auditoriaRepo.reset();

  const respSinToken = await simularGetReportes({
    ssoGuard,
    rolesGuard,
    controller: reportesController,
    tokenJwt: undefined,
  });
  assert.strictEqual(respSinToken.statusCode, 401);
  assert.ok(respSinToken.duracionMs < 1000);

  const respEstudiante = await simularGetReportes({
    ssoGuard,
    rolesGuard,
    controller: reportesController,
    tokenJwt: tokenEstudiante,
  });
  assert.strictEqual(respEstudiante.statusCode, 403);
  assert.ok(respEstudiante.duracionMs < 1000);

  assert.strictEqual(auditoriaRepo.registros.length, 2);
  console.log(
    '  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403 y 2 eventos en RegistroAuditoria en < 1 s)\n',
  );

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 3/3 ESCENARIOS CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando pruebas de CU-08:', err);
  process.exit(1);
});
