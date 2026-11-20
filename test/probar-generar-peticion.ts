/**
 * Pruebas ejecutables para CU-11: Generar petición del acta final.
 * Instancia los componentes reales de src/ (ActasController, ActasService,
 * PostulacionService, HorasService, ConfiguracionService, AuditoriaService,
 * SsoAuthGuard, RolesGuard) con repositorios en memoria, validando escenario
 * por escenario el 100% de specs/011-generar-peticion/spec.md.
 */

import 'reflect-metadata';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
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

import { Acta } from '../src/actas/entities/acta.entity';
import { EstadoActa } from '../src/actas/enums/estado-acta.enum';
import { ActasService } from '../src/actas/actas.service';
import { ActasController } from '../src/actas/actas.controller';

import { Postulacion } from '../src/postulacion/entities/postulacion.entity';
import { Estudiante } from '../src/postulacion/entities/estudiante.entity';
import { EstadoPostulacion } from '../src/postulacion/enums/estado-postulacion.enum';
import { PostulacionService } from '../src/postulacion/postulacion.service';

import { RegistroHoras } from '../src/horas/entities/registro-horas.entity';
import { EstadoHoras } from '../src/horas/enums/estado-horas.enum';
import { HorasService } from '../src/horas/horas.service';

import { RequisitoPrograma } from '../src/compartido/configuracion/entities/requisito-programa.entity';
import { ConfiguracionService } from '../src/compartido/configuracion/configuracion.service';

import { RegistroAuditoria } from '../src/compartido/auditoria/entities/registro-auditoria.entity';
import { AuditoriaService } from '../src/compartido/auditoria/auditoria.service';

import { EnlaceAcceso } from '../src/compartido/auth/entities/enlace-acceso.entity';
import { EnlaceAccesoService } from '../src/compartido/auth/enlace-acceso.service';
import { SsoAuthGuard } from '../src/compartido/auth/guards/sso-auth.guard';
import { RolesGuard } from '../src/compartido/auth/guards/roles.guard';
import { UsuarioAutenticado } from '../src/compartido/auth/decorators/usuario-actual.decorator';
import { DominioError } from '../src/compartido/errores/dominio.error';

const JWT_SECRET = 'secreto_pruebas_cu11';
const DIRECTORIO_PDF_PRUEBAS = path.resolve(process.cwd(), 'uploads', 'actas-test-cu11');

// ---------------------------------------------------------------------------
// Repositorios en memoria que simulan las tablas de PostgreSQL
// ---------------------------------------------------------------------------

class ActaRepoInMemory {
  private items: Acta[] = [];
  private seq = 1;

  reset() {
    this.items = [];
    this.seq = 1;
  }

  getAll(): Acta[] {
    return this.items.map((a) => Object.assign(new Acta(), a));
  }

  create(partial: Partial<Acta>): Acta {
    const acta = new Acta();
    acta.id = partial.id ?? `acta-${this.seq++}`;
    acta.estudianteId = partial.estudianteId!;
    acta.totalHoras = partial.totalHoras!;
    acta.rutaPdf = partial.rutaPdf ?? null;
    acta.estado = partial.estado!;
    acta.detalleError = partial.detalleError ?? null;
    acta.creadoEn = partial.creadoEn ?? new Date();
    return acta;
  }

  async findOne(options: {
    where: Partial<Pick<Acta, 'id' | 'estudianteId' | 'estado'>>;
  }): Promise<Acta | null> {
    const found = this.items.find((a) => {
      if (options.where.id && a.id !== options.where.id) return false;
      if (options.where.estudianteId && a.estudianteId !== options.where.estudianteId)
        return false;
      if (options.where.estado && a.estado !== options.where.estado) return false;
      return true;
    });
    return found ? Object.assign(new Acta(), found) : null;
  }

  async save(acta: Acta): Promise<Acta> {
    if (!acta.id) {
      acta.id = `acta-${this.seq++}`;
    }
    if (!acta.creadoEn) {
      acta.creadoEn = new Date();
    }
    const idx = this.items.findIndex((a) => a.id === acta.id);
    const copia = Object.assign(new Acta(), acta);
    if (idx >= 0) {
      this.items[idx] = copia;
    } else {
      this.items.push(copia);
    }
    return Object.assign(new Acta(), copia);
  }
}

class PostulacionRepoInMemory {
  private items: Postulacion[] = [];

  setItems(items: Postulacion[]) {
    this.items = items.map((p) => Object.assign(new Postulacion(), p));
  }

  async findOne(options: any): Promise<Postulacion | null> {
    if (options?.where?.id) {
      const f = this.items.find((p) => p.id === options.where.id);
      return f ? Object.assign(new Postulacion(), f) : null;
    }
    if (options?.where?.estudiante?.documento) {
      const doc = options.where.estudiante.documento;
      const candidatas = this.items.filter((p) => p.estudiante?.documento === doc);
      if (candidatas.length === 0) return null;
      candidatas.sort((a, b) => b.creadaEn.getTime() - a.creadaEn.getTime());
      return Object.assign(new Postulacion(), candidatas[0]);
    }
    return null;
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
      resultado = resultado.filter((r) => r.estudianteId === options.where!.estudianteId);
    }
    return resultado;
  }
}

class RequisitoProgramaRepoInMemory {
  private items: RequisitoPrograma[] = [];

  setItems(items: RequisitoPrograma[]) {
    this.items = items.map((r) => Object.assign(new RequisitoPrograma(), r));
  }

  async findOne(options: { where: { programaAcademico: string } }): Promise<RequisitoPrograma | null> {
    const f = this.items.find((r) => r.programaAcademico === options.where.programaAcademico);
    return f ? Object.assign(new RequisitoPrograma(), f) : null;
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

// ---------------------------------------------------------------------------
// Utilidades de simulación HTTP sobre ActasController.solicitarActa + Guards
// ---------------------------------------------------------------------------

interface RespuestaSimulada<T = any> {
  statusCode: number;
  body: T;
  duracionMs: number;
}

function crearExecutionContext(req: any, handler: Function): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => ActasController as any,
    getHandler: () => handler,
    getArgs: () => [req] as any,
    getArgByIndex: () => req,
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;
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

async function simularPostSolicitarActa(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: ActasController;
  tokenJwt?: string;
  headersExtra?: Record<string, string>;
}): Promise<RespuestaSimulada> {
  const inicio = performance.now();
  const headers: Record<string, string> = { ...(params.headersExtra ?? {}) };
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'POST',
    url: '/actas/solicitar',
    headers,
    body: {},
  };

  const context = crearExecutionContext(req, params.controller.solicitarActa);

  try {
    await params.ssoGuard.canActivate(context);
    await params.rolesGuard.canActivate(context);

    const usuario = req.user as UsuarioAutenticado;
    const resultado = await params.controller.solicitarActa(usuario);

    return {
      statusCode: HttpStatus.CREATED,
      body: resultado,
      duracionMs: performance.now() - inicio,
    };
  } catch (error) {
    return manejarExcepcion(error, inicio);
  }
}

function crearPostulacionMock(
  id: string,
  documentoEstudiante: string,
  programaAcademico: string,
  estado: EstadoPostulacion,
): Postulacion {
  const est = new Estudiante();
  est.id = `est-${documentoEstudiante}`;
  est.documento = documentoEstudiante;
  est.programaAcademico = programaAcademico;
  est.creadoEn = new Date('2026-02-01T10:00:00Z');

  const post = new Postulacion();
  post.id = id;
  post.estudiante = est;
  post.estado = estado;
  post.documentosAdjuntos = ['hoja_vida.pdf', 'carta_presentacion.pdf', 'eps.pdf'];
  post.motivoRechazo = null;
  post.creadaEn = new Date('2026-02-02T10:00:00Z');
  post.actualizadaEn = new Date('2026-02-05T10:00:00Z');
  return post;
}

function crearRegistroHorasMock(
  id: string,
  estudianteId: string,
  horas: number,
  estado: EstadoHoras,
): RegistroHoras {
  const reg = new RegistroHoras();
  reg.id = id;
  reg.estudianteId = estudianteId;
  reg.supervisorId = 'sup@empresa.com';
  reg.fecha = '2026-05-10';
  reg.horas = horas;
  reg.descripcion = 'Actividades de ingeniería de software';
  reg.estado = estado;
  reg.creadoEn = new Date('2026-05-10T12:00:00Z');
  return reg;
}

// ---------------------------------------------------------------------------
// Ejecución de escenarios de specs/011-generar-peticion/spec.md
// ---------------------------------------------------------------------------

async function ejecutarPruebas() {
  console.log('====================================================================');
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-11 GENERAR PETICIÓN DEL ACTA');
  console.log('====================================================================\n');

  if (fs.existsSync(DIRECTORIO_PDF_PRUEBAS)) {
    fs.rmSync(DIRECTORIO_PDF_PRUEBAS, { recursive: true, force: true });
  }

  const actaRepo = new ActaRepoInMemory();
  const postulacionRepo = new PostulacionRepoInMemory();
  const registroHorasRepo = new RegistroHorasRepoInMemory();
  const requisitoRepo = new RequisitoProgramaRepoInMemory();
  const auditoriaRepo = new AuditoriaRepoInMemory();

  const reqSistemas = new RequisitoPrograma();
  reqSistemas.id = 'req-sistemas';
  reqSistemas.programaAcademico = 'Ingeniería de Sistemas';
  reqSistemas.horasMinimas = 320;
  reqSistemas.documentosRequeridos = ['hoja_vida', 'carta_presentacion', 'eps'];
  requisitoRepo.setItems([reqSistemas]);

  const auditoriaService = new AuditoriaService(
    auditoriaRepo as unknown as Repository<RegistroAuditoria>,
  );
  const configuracionService = new ConfiguracionService(
    requisitoRepo as unknown as Repository<RequisitoPrograma>,
  );
  const postulacionService = new PostulacionService(
    postulacionRepo as unknown as Repository<Postulacion>,
    {} as unknown as Repository<Estudiante>,
    configuracionService,
    auditoriaService,
  );
  const enlaceAccesoService = new EnlaceAccesoService(
    {} as unknown as Repository<EnlaceAcceso>,
  );
  const horasService = new HorasService(
    registroHorasRepo as unknown as Repository<RegistroHoras>,
    enlaceAccesoService,
    auditoriaService,
  );
  const actasService = new ActasService(
    actaRepo as unknown as Repository<Acta>,
    postulacionService,
    horasService,
    configuracionService,
    auditoriaService,
  );
  actasService.configurarDirectorioAlmacenamiento(DIRECTORIO_PDF_PRUEBAS);

  const controller = new ActasController(actasService);

  const jwtService = new JwtService({ secret: JWT_SECRET });
  const configService = {
    get: <T>(key: string, defaultVal?: T): T =>
      key === 'SSO_JWT_SECRET' || key === 'JWT_SECRET'
        ? (JWT_SECRET as unknown as T)
        : (defaultVal as T),
  } as unknown as ConfigService;

  const ssoGuard = new SsoAuthGuard(jwtService, configService, auditoriaService);
  const rolesGuard = new RolesGuard(new Reflector(), auditoriaService);

  const tokenEstudiante = jwtService.sign({
    sub: 'est-01',
    documento: '1053800000',
    rol: 'ESTUDIANTE',
    programaAcademico: 'Ingeniería de Sistemas',
  });

  const tokenAdmin = jwtService.sign({
    sub: 'admin-01',
    documento: '30300300',
    rol: 'ADMINISTRATIVO',
  });

  // -------------------------------------------------------------------------
  // ESCENARIO 1: Radicación exitosa de la petición del acta final con
  //              requisitos cumplidos (flujo básico)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 1: Radicación exitosa de la petición del acta final con requisitos cumplidos (flujo básico)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();
  postulacionRepo.setItems([
    crearPostulacionMock('post-1', '1053800000', 'Ingeniería de Sistemas', EstadoPostulacion.VALIDADA),
  ]);
  registroHorasRepo.setItems([
    crearRegistroHorasMock('rh-1', '1053800000', 160, EstadoHoras.VERIFICADA),
    crearRegistroHorasMock('rh-2', '1053800000', 160, EstadoHoras.VERIFICADA),
    crearRegistroHorasMock('rh-3', '1053800000', 40, EstadoHoras.REGISTRADA),
  ]);

  const resp1 = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
    tokenJwt: tokenEstudiante,
  });

  assert.strictEqual(resp1.statusCode, HttpStatus.CREATED, 'Debe responder HTTP 201 Created');
  const peticionCreada = resp1.body as Acta;
  assert.strictEqual(peticionCreada.estudianteId, '1053800000', 'Debe extraer el documento del token JWT');
  assert.strictEqual(peticionCreada.totalHoras, 320, 'Debe consolidar las 320 horas VERIFICADA');
  assert.strictEqual(peticionCreada.estado, EstadoActa.SOLICITADA, 'El estado debe ser SOLICITADA');
  assert.strictEqual(peticionCreada.rutaPdf, null, 'No debe generar automáticamente ningún archivo PDF (RN-01)');
  assert.strictEqual(
    fs.existsSync(DIRECTORIO_PDF_PRUEBAS),
    false,
    'No debe haberse creado ningún archivo PDF en disco',
  );
  assert.strictEqual(auditoriaRepo.registros.length, 1);
  assert.strictEqual(auditoriaRepo.registros[0].evento, 'SOLICITUD_ACTA');
  assert.strictEqual(auditoriaRepo.registros[0].resultado, 'EXITOSO');
  assert.strictEqual(auditoriaRepo.registros[0].actorId, '1053800000');
  console.log(
    `  -> RESULTADO: CUMPLE (HTTP ${resp1.statusCode}, estado=${peticionCreada.estado}, estudianteId=${peticionCreada.estudianteId}, totalHoras=${peticionCreada.totalHoras}, rutaPdf=${peticionCreada.rutaPdf} [sin PDF automático RN-01], auditado SOLICITUD_ACTA EXITOSO por actor 1053800000 en ${resp1.duracionMs.toFixed(2)} ms)\n`,
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 2: Rechazo de petición del acta final cuando la postulación no
  //              está validada (excepción)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 2: Rechazo de petición del acta final cuando la postulación no está validada (excepción)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();

  // Caso 2.1: Sin postulación registrada
  postulacionRepo.setItems([]);
  const respSinPost = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
    tokenJwt: tokenEstudiante,
  });
  assert.strictEqual(respSinPost.statusCode, HttpStatus.CONFLICT);
  assert.strictEqual(respSinPost.body.mensaje, 'la postulación aún no está validada');
  assert.strictEqual(actaRepo.getAll().length, 0);

  // Caso 2.2: Postulación en RECIBIDA, EN_REVISION o RECHAZADA
  for (const estadoNoValidado of [
    EstadoPostulacion.RECIBIDA,
    EstadoPostulacion.EN_REVISION,
    EstadoPostulacion.RECHAZADA,
  ]) {
    postulacionRepo.setItems([
      crearPostulacionMock('post-2', '1053800000', 'Ingeniería de Sistemas', estadoNoValidado),
    ]);

    const resp2 = await simularPostSolicitarActa({
      ssoGuard,
      rolesGuard,
      controller,
      tokenJwt: tokenEstudiante,
    });

    assert.strictEqual(resp2.statusCode, HttpStatus.CONFLICT, 'Debe rechazar con HTTP 409');
    assert.strictEqual(resp2.body.mensaje, 'la postulación aún no está validada');
    assert.strictEqual(actaRepo.getAll().length, 0, 'No debe crear ninguna petición de acta');
  }
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 409 "la postulación aún no está validada" cuando no existe postulación o está en RECIBIDA, EN_REVISION o RECHAZADA; 0 peticiones registradas)\n',
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 3: Rechazo de petición del acta final cuando las horas
  //              verificadas son insuficientes (excepción)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 3: Rechazo de petición del acta final cuando las horas verificadas son insuficientes (excepción)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();
  postulacionRepo.setItems([
    crearPostulacionMock('post-3', '1053800000', 'Ingeniería de Sistemas', EstadoPostulacion.VALIDADA),
  ]);
  registroHorasRepo.setItems([
    crearRegistroHorasMock('rh-10', '1053800000', 180, EstadoHoras.VERIFICADA),
    crearRegistroHorasMock('rh-11', '1053800000', 160, EstadoHoras.REGISTRADA),
  ]);

  const resp3 = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
    tokenJwt: tokenEstudiante,
  });

  assert.strictEqual(resp3.statusCode, HttpStatus.CONFLICT, 'Debe rechazar con HTTP 409');
  assert.strictEqual(
    resp3.body.mensaje,
    'El estudiante no cumple con las horas mínimas verificadas requeridas por su programa académico',
  );
  assert.strictEqual(actaRepo.getAll().length, 0, 'No debe registrar ninguna petición de acta');
  console.log(
    `  -> RESULTADO: CUMPLE (HTTP ${resp3.statusCode} "${resp3.body.mensaje}" con 180/320 horas verificadas; 0 peticiones registradas)\n`,
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 4: Rechazo de petición duplicada cuando ya existe una petición
  //              en curso o un acta generada (flujo alterno - excepción)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 4: Rechazo de petición duplicada cuando ya existe una petición en curso o un acta generada (flujo alterno - excepción)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();
  postulacionRepo.setItems([
    crearPostulacionMock('post-4', '1053800000', 'Ingeniería de Sistemas', EstadoPostulacion.VALIDADA),
  ]);
  registroHorasRepo.setItems([
    crearRegistroHorasMock('rh-20', '1053800000', 320, EstadoHoras.VERIFICADA),
  ]);

  // 4.1 Primera petición queda en estado SOLICITADA
  const primeraPeticion = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
    tokenJwt: tokenEstudiante,
  });
  assert.strictEqual(primeraPeticion.statusCode, HttpStatus.CREATED);

  // 4.2 Intento duplicado teniendo ya una en estado SOLICITADA
  const respDuplicadaSolicitada = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
    tokenJwt: tokenEstudiante,
  });
  assert.strictEqual(respDuplicadaSolicitada.statusCode, HttpStatus.CONFLICT);
  assert.strictEqual(actaRepo.getAll().length, 1);

  // 4.3 Intento duplicado cuando ya existe un acta en estado GENERADA
  actaRepo.reset();
  await actaRepo.save(
    actaRepo.create({
      estudianteId: '1053800000',
      totalHoras: 320,
      rutaPdf: '/uploads/actas/acta_1053800000.pdf',
      estado: EstadoActa.GENERADA,
      detalleError: null,
    }),
  );

  const respDuplicadaGenerada = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
    tokenJwt: tokenEstudiante,
  });
  assert.strictEqual(respDuplicadaGenerada.statusCode, HttpStatus.CONFLICT);
  assert.strictEqual(actaRepo.getAll().length, 1);
  console.log(
    `  -> RESULTADO: CUMPLE (HTTP ${respDuplicadaSolicitada.statusCode} "${respDuplicadaSolicitada.body.mensaje}" tanto con petición en estado SOLICITADA como con acta en estado GENERADA; registros previos intactos)\n`,
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 5: Bloqueo de petición del acta final sin autenticación o con
  //              rol distinto a estudiante (EAC-03 - Seguridad)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 5: Bloqueo de petición del acta final sin autenticación o con rol distinto a estudiante (EAC-03 - Seguridad)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();

  // Caso 5.1: Usuario no autenticado (anónimo)
  const respAnonimo = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
  });
  assert.strictEqual(respAnonimo.statusCode, HttpStatus.UNAUTHORIZED, 'Anónimo debe recibir HTTP 401');
  assert.ok(respAnonimo.duracionMs < 1000, 'Debe auditarse en < 1 segundo');

  // Caso 5.2: Personal administrativo intentando usar el endpoint exclusivo del estudiante
  const respAdmin = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
    tokenJwt: tokenAdmin,
  });
  assert.strictEqual(respAdmin.statusCode, HttpStatus.FORBIDDEN, 'Administrativo debe recibir HTTP 403');
  assert.ok(respAdmin.duracionMs < 1000, 'Debe auditarse en < 1 segundo');

  // Caso 5.3: Supervisor externo presentando enlace-token pero sin sesión SSO de estudiante
  const respSupervisor = await simularPostSolicitarActa({
    ssoGuard,
    rolesGuard,
    controller,
    headersExtra: { 'enlace-token': 'token-supervisor-externo' },
  });
  assert.strictEqual(
    respSupervisor.statusCode,
    HttpStatus.UNAUTHORIZED,
    'Supervisor externo sin SSO de estudiante debe recibir HTTP 401',
  );
  assert.ok(respSupervisor.duracionMs < 1000, 'Debe auditarse en < 1 segundo');

  assert.strictEqual(actaRepo.getAll().length, 0, 'Ningún intento no autorizado debe crear peticiones');
  assert.strictEqual(
    auditoriaRepo.registros.length,
    3,
    'Los 3 intentos no autorizados deben quedar registrados en RegistroAuditoria',
  );
  assert.ok(
    auditoriaRepo.registros.every((r) => r.resultado === 'DENEGADO'),
    'Todos los eventos de auditoría deben tener resultado DENEGADO',
  );
  console.log(
    `  -> RESULTADO: CUMPLE (100% bloqueados: Anónimo=HTTP ${respAnonimo.statusCode}, Administrativo=HTTP ${respAdmin.statusCode}, Supervisor=HTTP ${respSupervisor.statusCode}; 0 peticiones creadas y 3/3 eventos DENEGADO registrados en RegistroAuditoria en < 1 s)\n`,
  );

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 5/5 ESCENARIOS DE SPEC.MD CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando las pruebas de CU-11:', err);
  process.exit(1);
});
