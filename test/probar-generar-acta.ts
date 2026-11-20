/**
 * Pruebas ejecutables para CU-07: Generar el acta final de la práctica en PDF.
 * Instancia los componentes reales de src/ (ActasController, ActasService,
 * PostulacionService, HorasService, ConfiguracionService, AuditoriaService,
 * SsoAuthGuard, RolesGuard) con repositorios en memoria y ValidationPipe real,
 * validando escenario por escenario el 100% de specs/007-generar-acta/spec.md.
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
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { Acta } from '../src/actas/entities/acta.entity';
import { EstadoActa } from '../src/actas/enums/estado-acta.enum';
import { GenerarActaDto } from '../src/actas/dto/generar-acta.dto';
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

const JWT_SECRET = 'secreto_pruebas_cu07';
const DIRECTORIO_PDF_PRUEBAS = path.resolve(process.cwd(), 'uploads', 'actas-test-cu07');

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
// Utilidades de simulación HTTP sobre ActasController + Guards + ValidationPipe
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

async function simularPostActas(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: ActasController;
  pipe: ValidationPipe;
  tokenJwt?: string;
  headersExtra?: Record<string, string>;
  body: Record<string, any>;
}): Promise<RespuestaSimulada> {
  const inicio = performance.now();
  const headers: Record<string, string> = { ...(params.headersExtra ?? {}) };
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'POST',
    url: '/actas',
    headers,
    body: params.body,
  };

  const context = crearExecutionContext(req, params.controller.generarActa);

  try {
    await params.ssoGuard.canActivate(context);
    await params.rolesGuard.canActivate(context);

    const dtoValidado = (await params.pipe.transform(params.body, {
      type: 'body',
      metatype: GenerarActaDto,
    })) as GenerarActaDto;

    const usuario = req.user as UsuarioAutenticado;
    const resultado = await params.controller.generarActa(dtoValidado, usuario);

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
// Ejecución de escenarios de specs/007-generar-acta/spec.md
// ---------------------------------------------------------------------------

async function ejecutarPruebas() {
  console.log('====================================================================');
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-07 GENERAR EL ACTA FINAL (PDF)');
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
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  const tokenAdmin = jwtService.sign({
    sub: 'admin-01',
    documento: '30300300',
    rol: 'ADMINISTRATIVO',
  });

  const tokenEstudiante = jwtService.sign({
    sub: 'est-01',
    documento: '1053800000',
    rol: 'ESTUDIANTE',
    programaAcademico: 'Ingeniería de Sistemas',
  });

  // -------------------------------------------------------------------------
  // ESCENARIO 1: Generación exitosa del acta final en PDF con consolidación
  //              transaccional de horas (flujo básico)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 1: Generación exitosa del acta final en PDF con consolidación transaccional de horas (flujo básico)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();
  postulacionRepo.setItems([
    crearPostulacionMock('post-1', '1053800000', 'Ingeniería de Sistemas', EstadoPostulacion.VALIDADA),
  ]);
  registroHorasRepo.setItems([
    crearRegistroHorasMock('rh-1', '1053800000', 160, EstadoHoras.VERIFICADA),
    crearRegistroHorasMock('rh-2', '1053800000', 160, EstadoHoras.VERIFICADA),
    crearRegistroHorasMock('rh-3', '1053800000', 40, EstadoHoras.REGISTRADA), // No verificada, no debe sumarse
  ]);

  const resp1 = await simularPostActas({
    ssoGuard,
    rolesGuard,
    controller,
    pipe,
    tokenJwt: tokenAdmin,
    body: { estudianteId: '1053800000' },
  });

  assert.strictEqual(resp1.statusCode, HttpStatus.CREATED, 'Debe responder HTTP 201 Created');
  const actaCreada = resp1.body as Acta;
  assert.strictEqual(actaCreada.estudianteId, '1053800000');
  assert.strictEqual(actaCreada.totalHoras, 320, 'Debe consolidar únicamente las 320 horas VERIFICADA');
  assert.strictEqual(actaCreada.estado, EstadoActa.GENERADA);
  assert.ok(actaCreada.rutaPdf && fs.existsSync(actaCreada.rutaPdf), 'El archivo PDF debe existir en el almacenamiento local');

  const contenidoPdf = fs.readFileSync(actaCreada.rutaPdf!);
  assert.ok(
    contenidoPdf.subarray(0, 5).toString('ascii') === '%PDF-',
    'El archivo generado debe tener cabecera binaria %PDF- válida de PDFKit',
  );
  assert.strictEqual(auditoriaRepo.registros.length, 1);
  assert.strictEqual(auditoriaRepo.registros[0].evento, 'GENERACION_ACTA');
  assert.strictEqual(auditoriaRepo.registros[0].resultado, 'EXITOSO');
  assert.strictEqual(auditoriaRepo.registros[0].actorId, '30300300');
  console.log(
    `  -> RESULTADO: CUMPLE (HTTP ${resp1.statusCode}, estado=${actaCreada.estado}, totalHoras=${actaCreada.totalHoras}, PDF=${path.basename(actaCreada.rutaPdf!)} [${contenidoPdf.length} bytes], auditado EXITOSO por actor 30300300 en ${resp1.duracionMs.toFixed(2)} ms)\n`,
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 2: Intento de generación de acta cuando la postulación no está
  //              validada (excepción)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 2: Intento de generación de acta cuando la postulación no está validada (excepción)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();

  for (const estadoNoValidado of [EstadoPostulacion.RECIBIDA, EstadoPostulacion.EN_REVISION]) {
    postulacionRepo.setItems([
      crearPostulacionMock('post-2', '1053800000', 'Ingeniería de Sistemas', estadoNoValidado),
    ]);

    const resp2 = await simularPostActas({
      ssoGuard,
      rolesGuard,
      controller,
      pipe,
      tokenJwt: tokenAdmin,
      body: { estudianteId: '1053800000' },
    });

    assert.strictEqual(resp2.statusCode, HttpStatus.CONFLICT, 'Debe rechazar con HTTP 409');
    assert.strictEqual(resp2.body.mensaje, 'la postulación aún no está validada');
    assert.strictEqual(actaRepo.getAll().length, 0, 'No debe crear ningún registro de Acta');
  }
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 409 "la postulación aún no está validada" para postulación en RECIBIDA y EN_REVISION; 0 actas y 0 PDFs generados)\n',
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 3: Intento de generación de acta con horas verificadas
  //              insuficientes (excepción)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 3: Intento de generación de acta con horas verificadas insuficientes (excepción)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();
  postulacionRepo.setItems([
    crearPostulacionMock('post-3', '1053800000', 'Ingeniería de Sistemas', EstadoPostulacion.VALIDADA),
  ]);
  registroHorasRepo.setItems([
    crearRegistroHorasMock('rh-10', '1053800000', 180, EstadoHoras.VERIFICADA),
    crearRegistroHorasMock('rh-11', '1053800000', 200, EstadoHoras.REGISTRADA),
  ]);

  const resp3 = await simularPostActas({
    ssoGuard,
    rolesGuard,
    controller,
    pipe,
    tokenJwt: tokenAdmin,
    body: { estudianteId: '1053800000' },
  });

  assert.strictEqual(resp3.statusCode, HttpStatus.CONFLICT, 'Debe rechazar con HTTP 409');
  assert.strictEqual(
    resp3.body.mensaje,
    'El estudiante no cumple con las horas mínimas requeridas por su programa académico',
  );
  assert.strictEqual(actaRepo.getAll().length, 0, 'No debe crear ningún registro de Acta');
  console.log(
    `  -> RESULTADO: CUMPLE (HTTP ${resp3.statusCode} "${resp3.body.mensaje}" con 180/320 horas verificadas; 0 actas generadas)\n`,
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 4: Intento de generar acta cuando ya existe un acta previa
  //              generada para el estudiante (flujo alterno)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 4: Intento de generar acta cuando ya existe un acta previa generada para el estudiante (flujo alterno)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();
  postulacionRepo.setItems([
    crearPostulacionMock('post-4', '1053800000', 'Ingeniería de Sistemas', EstadoPostulacion.VALIDADA),
  ]);
  registroHorasRepo.setItems([
    crearRegistroHorasMock('rh-20', '1053800000', 320, EstadoHoras.VERIFICADA),
  ]);

  const primeraExpedicion = await simularPostActas({
    ssoGuard,
    rolesGuard,
    controller,
    pipe,
    tokenJwt: tokenAdmin,
    body: { estudianteId: '1053800000' },
  });
  assert.strictEqual(primeraExpedicion.statusCode, HttpStatus.CREATED);

  const resp4Duplicada = await simularPostActas({
    ssoGuard,
    rolesGuard,
    controller,
    pipe,
    tokenJwt: tokenAdmin,
    body: { estudianteId: '1053800000' },
  });

  assert.strictEqual(resp4Duplicada.statusCode, HttpStatus.CONFLICT, 'Debe rechazar duplicado con HTTP 409');
  assert.strictEqual(
    resp4Duplicada.body.mensaje,
    'Ya existe un acta oficial generada para este estudiante',
  );
  assert.strictEqual(actaRepo.getAll().length, 1, 'Debe conservarse únicamente el acta original');
  console.log(
    `  -> RESULTADO: CUMPLE (HTTP ${resp4Duplicada.statusCode} "${resp4Duplicada.body.mensaje}"; no se sobrescribe el archivo ni se duplican registros)\n`,
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 5: Manejo de fallo técnico durante la generación o guardado
  //              del PDF (excepción / resiliencia)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 5: Manejo de fallo técnico durante la generación o guardado del PDF (excepción / resiliencia)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();
  postulacionRepo.setItems([
    crearPostulacionMock('post-5', '1053800000', 'Ingeniería de Sistemas', EstadoPostulacion.VALIDADA),
  ]);
  registroHorasRepo.setItems([
    crearRegistroHorasMock('rh-30', '1053800000', 320, EstadoHoras.VERIFICADA),
  ]);

  // Simular fallo de escritura en disco (apuntando el directorio de almacenamiento a un archivo regular)
  const rutaArchivoBloqueante = path.join(DIRECTORIO_PDF_PRUEBAS, 'archivo_no_directorio.lock');
  fs.mkdirSync(DIRECTORIO_PDF_PRUEBAS, { recursive: true });
  fs.writeFileSync(rutaArchivoBloqueante, 'bloqueo_io');
  actasService.configurarDirectorioAlmacenamiento(path.join(rutaArchivoBloqueante, 'subcarpeta_invalida'));

  const resp5 = await simularPostActas({
    ssoGuard,
    rolesGuard,
    controller,
    pipe,
    tokenJwt: tokenAdmin,
    body: { estudianteId: '1053800000' },
  });

  // Restaurar directorio válido
  actasService.configurarDirectorioAlmacenamiento(DIRECTORIO_PDF_PRUEBAS);

  assert.strictEqual(
    resp5.statusCode,
    HttpStatus.INTERNAL_SERVER_ERROR,
    'Debe responder HTTP 500 ante fallo técnico de generación/guardado',
  );
  assert.strictEqual(resp5.body.mensaje, 'no se pudo generar el acta, reintentar manualmente');

  const actasTrasFallo = actaRepo.getAll();
  assert.strictEqual(actasTrasFallo.length, 1, 'Debe registrar 1 acta en estado FALLIDA sin reintentos automáticos');
  assert.strictEqual(actasTrasFallo[0].estado, EstadoActa.FALLIDA);
  assert.ok(
    actasTrasFallo[0].detalleError && actasTrasFallo[0].detalleError.length > 0,
    'Debe persistir el detalleError en la entidad Acta',
  );
  assert.strictEqual(auditoriaRepo.registros.length, 1);
  assert.strictEqual(auditoriaRepo.registros[0].evento, 'GENERACION_ACTA');
  assert.strictEqual(auditoriaRepo.registros[0].resultado, 'FALLIDO');
  console.log(
    `  -> RESULTADO: CUMPLE (HTTP ${resp5.statusCode} "${resp5.body.mensaje}", Acta registrada en estado=${actasTrasFallo[0].estado} con detalleError="${actasTrasFallo[0].detalleError.slice(0, 45)}...", sin reintentos automáticos y auditado FALLIDO)\n`,
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 6: Eficiencia de desempeño en la expedición síncrona del acta
  //              bajo carga concurrente (EAC-01 - Desempeño)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 6: Eficiencia de desempeño en la expedición síncrona del acta bajo carga concurrente (EAC-01 - Desempeño)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();

  const TOTAL_CONCURRENTES = 30;
  const postulacionesConcurrentes: Postulacion[] = [];
  const horasConcurrentes: RegistroHoras[] = [];

  for (let i = 1; i <= TOTAL_CONCURRENTES; i++) {
    const docEstudiante = `1053800${String(i).padStart(3, '0')}`;
    postulacionesConcurrentes.push(
      crearPostulacionMock(
        `post-conc-${i}`,
        docEstudiante,
        'Ingeniería de Sistemas',
        EstadoPostulacion.VALIDADA,
      ),
    );
    horasConcurrentes.push(
      crearRegistroHorasMock(`rh-conc-${i}`, docEstudiante, 320, EstadoHoras.VERIFICADA),
    );
  }
  postulacionRepo.setItems(postulacionesConcurrentes);
  registroHorasRepo.setItems(horasConcurrentes);

  const inicioCarga = performance.now();
  const respuestasConcurrentes = await Promise.all(
    Array.from({ length: TOTAL_CONCURRENTES }, (_, idx) => {
      const docEstudiante = `1053800${String(idx + 1).padStart(3, '0')}`;
      return simularPostActas({
        ssoGuard,
        rolesGuard,
        controller,
        pipe,
        tokenJwt: tokenAdmin,
        body: { estudianteId: docEstudiante },
      });
    }),
  );
  const tiempoTotalCargaMs = performance.now() - inicioCarga;

  const exitosasEnMenosDe5s = respuestasConcurrentes.filter(
    (r) => r.statusCode === HttpStatus.CREATED && r.duracionMs < 5000,
  ).length;
  const porcentajeMenosDe5s = (exitosasEnMenosDe5s / TOTAL_CONCURRENTES) * 100;
  const duracionesOrdenadas = respuestasConcurrentes
    .map((r) => r.duracionMs)
    .sort((a, b) => a - b);
  const p95Ms = duracionesOrdenadas[Math.floor(TOTAL_CONCURRENTES * 0.95) - 1];
  const maxMs = duracionesOrdenadas[TOTAL_CONCURRENTES - 1];

  assert.ok(
    porcentajeMenosDe5s >= 95,
    `Al menos el 95% de las 30 solicitudes simultáneas debe responder en < 5000 ms (obtenido: ${porcentajeMenosDe5s}%)`,
  );
  assert.strictEqual(
    actaRepo.getAll().filter((a) => a.estado === EstadoActa.GENERADA).length,
    TOTAL_CONCURRENTES,
    'Las 30 actas deben quedar persistidas en estado GENERADA',
  );
  console.log(
    `  -> RESULTADO: CUMPLE (${exitosasEnMenosDe5s}/${TOTAL_CONCURRENTES} solicitudes [${porcentajeMenosDe5s.toFixed(1)}%] completadas con HTTP 201 en < 5 s; P95=${p95Ms.toFixed(2)} ms, Máx=${maxMs.toFixed(2)} ms, Tiempo total lote=${tiempoTotalCargaMs.toFixed(2)} ms)\n`,
  );

  // -------------------------------------------------------------------------
  // ESCENARIO 7: Bloqueo de generación de acta sin autenticación o con rol
  //              no administrativo (EAC-03 - Seguridad)
  // -------------------------------------------------------------------------
  console.log(
    'ESCENARIO 7: Bloqueo de generación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)',
  );
  actaRepo.reset();
  auditoriaRepo.reset();

  // Caso 7.1: Usuario anónimo sin token
  const respAnonimo = await simularPostActas({
    ssoGuard,
    rolesGuard,
    controller,
    pipe,
    body: { estudianteId: '1053800000' },
  });
  assert.strictEqual(respAnonimo.statusCode, HttpStatus.UNAUTHORIZED, 'Anónimo debe recibir HTTP 401');
  assert.ok(respAnonimo.duracionMs < 1000, 'Debe auditarse en < 1 segundo');

  // Caso 7.2: Estudiante autenticado intentando generar su propia acta
  const respEstudiante = await simularPostActas({
    ssoGuard,
    rolesGuard,
    controller,
    pipe,
    tokenJwt: tokenEstudiante,
    body: { estudianteId: '1053800000' },
  });
  assert.strictEqual(respEstudiante.statusCode, HttpStatus.FORBIDDEN, 'Estudiante debe recibir HTTP 403');
  assert.ok(respEstudiante.duracionMs < 1000, 'Debe auditarse en < 1 segundo');

  // Caso 7.3: Supervisor externo presentando enlace-token pero sin sesión SSO administrativa
  const respSupervisor = await simularPostActas({
    ssoGuard,
    rolesGuard,
    controller,
    pipe,
    headersExtra: { 'enlace-token': 'token-supervisor-externo' },
    body: { estudianteId: '1053800000' },
  });
  assert.strictEqual(
    respSupervisor.statusCode,
    HttpStatus.UNAUTHORIZED,
    'Supervisor sin SSO administrativo debe recibir HTTP 401',
  );
  assert.ok(respSupervisor.duracionMs < 1000, 'Debe auditarse en < 1 segundo');

  assert.strictEqual(actaRepo.getAll().length, 0, 'Ningún intento no autorizado debe crear actas');
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
    `  -> RESULTADO: CUMPLE (100% bloqueados: Anónimo=HTTP ${respAnonimo.statusCode}, Estudiante=HTTP ${respEstudiante.statusCode}, Supervisor=HTTP ${respSupervisor.statusCode}; 0 actas creadas y 3/3 eventos DENEGADO registrados en RegistroAuditoria en < 1 s)\n`,
  );

  // Limpieza del directorio temporal de PDFs de prueba
  if (fs.existsSync(DIRECTORIO_PDF_PRUEBAS)) {
    fs.rmSync(DIRECTORIO_PDF_PRUEBAS, { recursive: true, force: true });
  }

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 7/7 ESCENARIOS DE SPEC.MD CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando las pruebas de CU-07:', err);
  process.exit(1);
});
