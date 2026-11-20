/**
 * Pruebas ejecutables para CU-06: Dar confirmación para la generación del acta final.
 * Instancia las clases reales de src/ (ActasController, ActasService, SsoAuthGuard,
 * RolesGuard, AuditoriaService) con repositorios en memoria, ejecutando el 100%
 * de los escenarios definidos en specs/006-confirmar-acta/spec.md.
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
import { RegistroAuditoria } from '../src/compartido/auditoria/entities/registro-auditoria.entity';
import { AuditoriaService } from '../src/compartido/auditoria/auditoria.service';
import { ConfiguracionService } from '../src/compartido/configuracion/configuracion.service';
import { PostulacionService } from '../src/postulacion/postulacion.service';
import { HorasService } from '../src/horas/horas.service';
import { Acta } from '../src/actas/entities/acta.entity';
import { EstadoActa } from '../src/actas/enums/estado-acta.enum';
import { ActasService } from '../src/actas/actas.service';
import { ActasController } from '../src/actas/actas.controller';
import { DominioError } from '../src/compartido/errores/dominio.error';

const JWT_SECRET = 'secreto_pruebas_cu06';

class ActaRepoInMemory {
  private items: Acta[] = [];

  setItems(items: Acta[]) {
    this.items = items.map((a) => Object.assign(new Acta(), a));
  }

  async findOne(options: { where: { id?: string } }): Promise<Acta | null> {
    const found = this.items.find((a) => a.id === options.where.id);
    return found ? Object.assign(new Acta(), found) : null;
  }

  async save(acta: Acta): Promise<Acta> {
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

async function simularPatchConfirmarActa(params: {
  ssoGuard: SsoAuthGuard;
  rolesGuard: RolesGuard;
  controller: ActasController;
  tokenJwt?: string;
  id: string;
}): Promise<RespuestaSimulada<Acta | any>> {
  const inicio = performance.now();
  const headers: Record<string, string> = {};
  if (params.tokenJwt) {
    headers.authorization = `Bearer ${params.tokenJwt}`;
  }

  const req: any = {
    method: 'PATCH',
    url: `/actas/${params.id}/confirmar`,
    headers,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => ActasController as any,
    getHandler: () => params.controller.confirmarActa,
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
    const resultado = await params.controller.confirmarActa(params.id, usuario);
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
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-06 CONFIRMAR GENERACIÓN DE ACTA');
  console.log('====================================================================\n');

  const actaRepo = new ActaRepoInMemory();
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

  const actasService = new ActasService(
    actaRepo as unknown as Repository<Acta>,
    {} as unknown as PostulacionService,
    {} as unknown as HorasService,
    {} as unknown as ConfiguracionService,
    auditoriaService,
  );
  const actasController = new ActasController(actasService);

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
    actaRepo.setItems([
      Object.assign(new Acta(), {
        id: 'acta-sol-001',
        estudianteId: '1053800000',
        totalHoras: 320,
        rutaPdf: null,
        estado: EstadoActa.SOLICITADA,
        detalleError: null,
        creadoEn: new Date('2026-05-01T10:00:00Z'),
      }),
      Object.assign(new Acta(), {
        id: 'acta-gen-002',
        estudianteId: '1053900000',
        totalHoras: 320,
        rutaPdf: '/uploads/actas/acta_1053900000.pdf',
        estado: EstadoActa.GENERADA,
        detalleError: null,
        creadoEn: new Date('2026-05-01T10:00:00Z'),
      }),
    ]);
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Confirmación exitosa de una petición de acta en estado solicitada
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 1: Confirmación exitosa de una petición de acta en estado solicitada (flujo básico)',
  );
  reiniciarDatos();

  const resp1 = await simularPatchConfirmarActa({
    ssoGuard,
    rolesGuard,
    controller: actasController,
    tokenJwt: tokenAdmin,
    id: 'acta-sol-001',
  });

  assert.strictEqual(resp1.statusCode, 200);
  assert.strictEqual(resp1.body.id, 'acta-sol-001');
  assert.strictEqual(resp1.body.estado, EstadoActa.CONFIRMADA);
  assert.strictEqual(
    resp1.body.rutaPdf,
    null,
    'No debe generar automáticamente el PDF en el paso de confirmación (RN-01)',
  );

  assert.strictEqual(auditoriaRepo.registros.length, 1);
  assert.strictEqual(auditoriaRepo.registros[0].evento, 'CONFIRMACION_ACTA');
  assert.strictEqual(auditoriaRepo.registros[0].actorId, '30300300');
  assert.strictEqual(auditoriaRepo.registros[0].resultado, 'EXITOSO');

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 200, acta-sol-001 pasa de SOLICITADA a CONFIRMADA sin generar PDF automáticamente y se audita con actor 30300300)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Intento de confirmar un acta que no está en estado solicitada (409)
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 2: Intento de confirmar un acta que no se encuentra en estado solicitada (excepción)',
  );

  const respYaConfirmada = await simularPatchConfirmarActa({
    ssoGuard,
    rolesGuard,
    controller: actasController,
    tokenJwt: tokenAdmin,
    id: 'acta-sol-001',
  });
  assert.strictEqual(respYaConfirmada.statusCode, 409);

  const respYaGenerada = await simularPatchConfirmarActa({
    ssoGuard,
    rolesGuard,
    controller: actasController,
    tokenJwt: tokenAdmin,
    id: 'acta-gen-002',
  });
  assert.strictEqual(respYaGenerada.statusCode, 409);

  const acta002 = await actaRepo.findOne({ where: { id: 'acta-gen-002' } });
  assert.strictEqual(acta002?.estado, EstadoActa.GENERADA);

  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 409 Conflict cuando el acta ya está en CONFIRMADA o GENERADA, conservando su estado actual)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Confirmación de un registro de acta inexistente (404)
  // ---------------------------------------------------------------------------
  console.log('TEST 3: Confirmación de un registro de acta inexistente (excepción)');
  reiniciarDatos();

  const respInexistente = await simularPatchConfirmarActa({
    ssoGuard,
    rolesGuard,
    controller: actasController,
    tokenJwt: tokenAdmin,
    id: 'acta-inexistente-999',
  });

  assert.strictEqual(respInexistente.statusCode, 404);
  console.log(
    '  -> RESULTADO: CUMPLE (HTTP 404 Not Found para identificador de acta inexistente)\n',
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Bloqueo de confirmación sin autenticación o con rol no administrativo
  // ---------------------------------------------------------------------------
  console.log(
    'TEST 4: Bloqueo de confirmación de acta sin autenticación o con rol no administrativo (EAC-03 - Seguridad)',
  );
  reiniciarDatos();

  const respSinToken = await simularPatchConfirmarActa({
    ssoGuard,
    rolesGuard,
    controller: actasController,
    tokenJwt: undefined,
    id: 'acta-sol-001',
  });
  assert.strictEqual(respSinToken.statusCode, 401);
  assert.ok(respSinToken.duracionMs < 1000);

  const respEstudiante = await simularPatchConfirmarActa({
    ssoGuard,
    rolesGuard,
    controller: actasController,
    tokenJwt: tokenEstudiante,
    id: 'acta-sol-001',
  });
  assert.strictEqual(respEstudiante.statusCode, 403);
  assert.ok(respEstudiante.duracionMs < 1000);

  const acta001 = await actaRepo.findOne({ where: { id: 'acta-sol-001' } });
  assert.strictEqual(
    acta001?.estado,
    EstadoActa.SOLICITADA,
    'El acta no debe cambiar de estado tras intentos no autorizados',
  );
  assert.strictEqual(auditoriaRepo.registros.length, 2);

  console.log(
    '  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, acta conserva SOLICITADA y 2 eventos registrados en RegistroAuditoria en < 1 s)\n',
  );

  console.log('====================================================================');
  console.log(' RESUMEN DE PRUEBAS: 4/4 ESCENARIOS CUMPLIDOS (100%)');
  console.log('====================================================================');
}

ejecutarPruebas().catch((err) => {
  console.error('Error ejecutando pruebas de CU-06:', err);
  process.exit(1);
});
