/**
 * Pruebas ejecutables para CU-02: Revisar y validar la postulación del estudiante.
 * Ejecuta cada uno de los escenarios definidos en specs/002-revisar-postulacion/spec.md.
 */

import * as assert from 'node:assert';
import { performance } from 'node:perf_hooks';

// Enumeración de estados según el glosario y ADR-003
const EstadoPostulacion = {
  RECIBIDA: 'RECIBIDA',
  EN_REVISION: 'EN_REVISION',
  VALIDADA: 'VALIDADA',
  RECHAZADA: 'RECHAZADA',
} as const;

type EstadoPostulacion = (typeof EstadoPostulacion)[keyof typeof EstadoPostulacion];

// Tabla explícita de transiciones permitidas en la máquina de estados (ADR-003, RN-01)
const TRANSICIONES_VALIDAS: Record<EstadoPostulacion, EstadoPostulacion[]> = {
  [EstadoPostulacion.RECIBIDA]: [EstadoPostulacion.EN_REVISION],
  [EstadoPostulacion.EN_REVISION]: [
    EstadoPostulacion.VALIDADA,
    EstadoPostulacion.RECHAZADA,
  ],
  [EstadoPostulacion.VALIDADA]: [],
  [EstadoPostulacion.RECHAZADA]: [],
};

interface Estudiante {
  id: string;
  documento: string;
  programaAcademico: string;
}

interface Postulacion {
  id: string;
  estado: EstadoPostulacion;
  documentosAdjuntos: string[];
  motivoRechazo: string | null;
  estudiante: Estudiante;
  creadaEn: Date;
  actualizadaEn: Date;
}

interface RegistroAuditoria {
  id: string;
  evento: string;
  resultado: string;
  actorId: string | null;
  detalles: string | null;
  fecha: Date;
  duracionMs: number;
}

// Errores tipados de dominio (ADR-006)
class DominioError extends Error {
  constructor(
    public readonly mensaje: string,
    public readonly codigoHttp: number = 400,
  ) {
    super(mensaje);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class PostulacionNoEncontradaError extends DominioError {
  constructor(mensaje = 'La postulación solicitada no existe') {
    super(mensaje, 404);
  }
}

class TransicionEstadoInvalidaError extends DominioError {
  constructor(mensaje = 'Transición de estado inválida') {
    super(mensaje, 409);
  }
}

class MotivoRechazoObligatorioError extends DominioError {
  constructor(
    mensaje = 'El motivo del rechazo es obligatorio cuando se rechaza una postulación',
  ) {
    super(mensaje, 400);
  }
}

// Simulador en memoria del repositorio TypeORM de Postulación
class PostulacionRepositoryInMemory {
  private items: Postulacion[] = [];

  constructor(initialItems: Postulacion[] = []) {
    this.setItems(initialItems);
  }

  setItems(items: Postulacion[]) {
    this.items = items.map((item) => ({
      ...item,
      documentosAdjuntos: [...item.documentosAdjuntos],
      estudiante: { ...item.estudiante },
      creadaEn: new Date(item.creadaEn),
      actualizadaEn: new Date(item.actualizadaEn),
    }));
  }

  getAll(): Postulacion[] {
    return this.items.map((item) => ({ ...item }));
  }

  async findOne(options: { where: { id: string } }): Promise<Postulacion | null> {
    const found = this.items.find((p) => p.id === options.where.id);
    return found ? { ...found } : null;
  }

  async save(postulacion: Postulacion): Promise<Postulacion> {
    const idx = this.items.findIndex((p) => p.id === postulacion.id);
    const actualizada: Postulacion = {
      ...postulacion,
      actualizadaEn: new Date(),
    };
    if (idx >= 0) {
      this.items[idx] = actualizada;
    } else {
      this.items.push(actualizada);
    }
    return { ...actualizada };
  }
}

// Servicio de Auditoría en memoria (EAC-03, PA-04)
class AuditoriaServiceInMemory {
  public registros: RegistroAuditoria[] = [];

  async registrarEvento(
    evento: string,
    resultado: string,
    actorId?: string | null,
    detalles?: string | null,
  ): Promise<RegistroAuditoria> {
    const inicio = performance.now();
    const registro: RegistroAuditoria = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      evento,
      resultado,
      actorId: actorId ?? null,
      detalles: detalles ?? null,
      fecha: new Date(),
      duracionMs: 0,
    };
    const fin = performance.now();
    registro.duracionMs = fin - inicio;
    this.registros.push(registro);
    return registro;
  }

  async registrarAccesoDenegado(
    evento: string,
    actorId?: string | null,
    detalles?: string | null,
  ): Promise<RegistroAuditoria> {
    return this.registrarEvento(evento, 'DENEGADO', actorId, detalles);
  }
}

// Servicio PostulacionService reproduciendo exactamente la lógica de revisarPostulacion (CU-02)
class PostulacionServiceTest {
  constructor(
    private readonly postulacionRepo: PostulacionRepositoryInMemory,
    private readonly auditoriaService: AuditoriaServiceInMemory,
  ) {}

  async revisarPostulacion(
    id: string,
    dto: { estado: EstadoPostulacion; motivo?: string },
    actorId: string,
  ): Promise<Postulacion> {
    const postulacion = await this.postulacionRepo.findOne({ where: { id } });

    if (!postulacion) {
      throw new PostulacionNoEncontradaError(
        `La postulación con identificador "${id}" no existe`,
      );
    }

    const estadoAnterior = postulacion.estado;
    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoAnterior] ?? [];

    if (!transicionesPermitidas.includes(dto.estado)) {
      throw new TransicionEstadoInvalidaError(
        `Transición de estado inválida: no se permite pasar de "${estadoAnterior}" a "${dto.estado}"`,
      );
    }

    if (dto.estado === EstadoPostulacion.RECHAZADA) {
      const motivoLimpio = dto.motivo?.trim();
      if (!motivoLimpio) {
        throw new MotivoRechazoObligatorioError(
          'El motivo del rechazo es obligatorio cuando se rechaza una postulación',
        );
      }
      postulacion.motivoRechazo = motivoLimpio;
    }

    postulacion.estado = dto.estado;
    const actualizada = await this.postulacionRepo.save(postulacion);

    await this.auditoriaService.registrarEvento(
      'CAMBIO_ESTADO_POSTULACION',
      'EXITOSO',
      actorId,
      `Postulación [${actualizada.id}]: estado anterior "${estadoAnterior}" -> nuevo estado "${dto.estado}"${
        dto.estado === EstadoPostulacion.RECHAZADA
          ? ` | Motivo: "${actualizada.motivoRechazo}"`
          : ''
      }`,
    );

    return actualizada;
  }
}

// Controlador HTTP con validación de SsoAuthGuard, RolesGuard, ValidationPipe y HttpExceptionFilter
class PostulacionControllerTest {
  constructor(
    private readonly service: PostulacionServiceTest,
    private readonly auditoria: AuditoriaServiceInMemory,
  ) {}

  async revisarPostulacion(
    id: string,
    body: { estado?: string; motivo?: unknown },
    usuario: { rol?: string; documento?: string } | null,
  ): Promise<{ status: number; data?: Postulacion; error?: string }> {
    const inicio = performance.now();

    // 1. SsoAuthGuard
    if (!usuario || !usuario.documento) {
      await this.auditoria.registrarAccesoDenegado(
        'ACCESO_NO_AUTENTICADO_SSO',
        null,
        `Petición sin token en PATCH /postulaciones/${id}`,
      );
      const fin = performance.now();
      assert.ok(
        fin - inicio < 1000,
        'El registro de auditoría debe tardar menos de 1 segundo (EAC-03)',
      );
      return {
        status: 401,
        error: 'No autenticado: se requiere sesión institucional SSO activa',
      };
    }

    // 2. RolesGuard (@Roles('ADMINISTRATIVO'))
    if (usuario.rol !== 'ADMINISTRATIVO') {
      await this.auditoria.registrarAccesoDenegado(
        'ACCESO_DENEGADO_RBAC',
        usuario.documento,
        `Rol "${usuario.rol}" no autorizado en PATCH /postulaciones/${id}. Roles requeridos: [ADMINISTRATIVO]`,
      );
      const fin = performance.now();
      assert.ok(
        fin - inicio < 1000,
        'El registro de auditoría debe tardar menos de 1 segundo (EAC-03)',
      );
      return {
        status: 403,
        error: 'Acceso prohibido: su rol no tiene permisos para ejecutar esta operación',
      };
    }

    // 3. ValidationPipe sobre RevisarPostulacionDto (@IsEnum(EstadoPostulacion), @IsOptional(), @IsString())
    const estadosValidos = Object.values(EstadoPostulacion) as string[];
    if (!body.estado || !estadosValidos.includes(body.estado)) {
      return {
        status: 400,
        error:
          'El estado solicitado no pertenece a la máquina de estados válida (RECIBIDA, EN_REVISION, VALIDADA, RECHAZADA)',
      };
    }

    if (body.motivo !== undefined && typeof body.motivo !== 'string') {
      return {
        status: 400,
        error: 'El motivo del rechazo debe ser una cadena de texto',
      };
    }

    // 4. Invocación al servicio con captura de DominioError (HttpExceptionFilter, ADR-006)
    try {
      const data = await this.service.revisarPostulacion(
        id,
        {
          estado: body.estado as EstadoPostulacion,
          motivo: body.motivo as string | undefined,
        },
        usuario.documento,
      );
      return { status: 200, data };
    } catch (err: unknown) {
      if (err instanceof DominioError) {
        return { status: err.codigoHttp, error: err.mensaje };
      }
      return { status: 500, error: 'Error interno del servidor' };
    }
  }
}

// Datos base para los escenarios
const estudianteBase: Estudiante = {
  id: 'est-1053800000',
  documento: '1053800000',
  programaAcademico: 'Ingeniería de Sistemas',
};

const estudianteOtro: Estudiante = {
  id: 'est-1053800999',
  documento: '1053800999',
  programaAcademico: 'Ingeniería de Alimentos',
};

function crearPostulacionesIniciales(): Postulacion[] {
  return [
    {
      id: 'post-001',
      estado: EstadoPostulacion.RECIBIDA,
      documentosAdjuntos: ['hoja_vida.pdf', 'carta_presentacion.pdf'],
      motivoRechazo: null,
      estudiante: estudianteBase,
      creadaEn: new Date('2026-11-19T10:00:00Z'),
      actualizadaEn: new Date('2026-11-19T10:00:00Z'),
    },
    {
      id: 'post-002',
      estado: EstadoPostulacion.RECIBIDA,
      documentosAdjuntos: ['hoja_vida.pdf', 'carta_presentacion.pdf'],
      motivoRechazo: null,
      estudiante: estudianteOtro,
      creadaEn: new Date('2026-11-19T11:00:00Z'),
      actualizadaEn: new Date('2026-11-19T11:00:00Z'),
    },
  ];
}

const adminAutenticado = {
  rol: 'ADMINISTRATIVO',
  documento: '30300300',
};

async function ejecutarPruebas() {
  console.log('====================================================================');
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-02 REVISAR Y VALIDAR POSTULACIÓN');
  console.log('====================================================================\n');

  const repo = new PostulacionRepositoryInMemory(crearPostulacionesIniciales());
  const auditoria = new AuditoriaServiceInMemory();
  const service = new PostulacionServiceTest(repo, auditoria);
  const controller = new PostulacionControllerTest(service, auditoria);

  let pruebasPasadas = 0;
  const totalPruebas = 9;

  // -------------------------------------------------------------------------
  // ESCENARIO 1: Tomar en revisión una postulación recibida (flujo básico)
  // -------------------------------------------------------------------------
  try {
    console.log('TEST 1: Tomar en revisión una postulación recibida (flujo básico)');
    repo.setItems(crearPostulacionesIniciales());

    const res = await controller.revisarPostulacion(
      'post-001',
      { estado: 'EN_REVISION' },
      adminAutenticado,
    );

    assert.strictEqual(res.status, 200, 'Debe responder con código HTTP 200');
    assert.strictEqual(
      res.data?.estado,
      EstadoPostulacion.EN_REVISION,
      'La postulación debe quedar en estado EN_REVISION',
    );

    const otra = await repo.findOne({ where: { id: 'post-002' } });
    assert.strictEqual(
      otra?.estado,
      EstadoPostulacion.RECIBIDA,
      'Ninguna otra postulación debe cambiar de estado',
    );

    console.log(
      '  -> RESULTADO: CUMPLE (HTTP 200, transición RECIBIDA -> EN_REVISION exitosa, demás postulaciones intactas)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 2: Validar una postulación en revisión (flujo básico)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 2: Validar una postulación en revisión (flujo básico)');
    const items = crearPostulacionesIniciales();
    items[0].estado = EstadoPostulacion.EN_REVISION;
    repo.setItems(items);

    const res = await controller.revisarPostulacion(
      'post-001',
      { estado: 'VALIDADA' },
      adminAutenticado,
    );

    assert.strictEqual(res.status, 200, 'Debe responder con código HTTP 200');
    assert.strictEqual(
      res.data?.estado,
      EstadoPostulacion.VALIDADA,
      'La postulación debe quedar en estado VALIDADA',
    );

    const almacenada = await repo.findOne({ where: { id: 'post-001' } });
    assert.strictEqual(
      almacenada?.estado,
      EstadoPostulacion.VALIDADA,
      'No ocurre ninguna transición automática posterior (RN-01, ADR-003)',
    );

    console.log(
      '  -> RESULTADO: CUMPLE (HTTP 200, transición EN_REVISION -> VALIDADA manual sin automatizaciones)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 3: Rechazar una postulación en revisión (flujo alterno)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 3: Rechazar una postulación en revisión (flujo alterno)');
    const items = crearPostulacionesIniciales();
    items[0].estado = EstadoPostulacion.EN_REVISION;
    repo.setItems(items);

    const motivoEsperado = 'La carta de presentación no está firmada por la empresa';
    const res = await controller.revisarPostulacion(
      'post-001',
      { estado: 'RECHAZADA', motivo: motivoEsperado },
      adminAutenticado,
    );

    assert.strictEqual(res.status, 200, 'Debe responder con código HTTP 200');
    assert.strictEqual(
      res.data?.estado,
      EstadoPostulacion.RECHAZADA,
      'La postulación debe quedar en estado RECHAZADA',
    );
    assert.strictEqual(
      res.data?.motivoRechazo,
      motivoEsperado,
      'El motivo del rechazo debe quedar guardado en la postulación',
    );

    console.log(
      `  -> RESULTADO: CUMPLE (HTTP 200, transición EN_REVISION -> RECHAZADA con motivo "${motivoEsperado}" persistido)`,
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 4: Rechazo sin motivo (excepción)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 4: Rechazo sin motivo (excepción)');
    const items = crearPostulacionesIniciales();
    items[0].estado = EstadoPostulacion.EN_REVISION;
    repo.setItems(items);

    const res = await controller.revisarPostulacion(
      'post-001',
      { estado: 'RECHAZADA' },
      adminAutenticado,
    );

    assert.strictEqual(res.status, 400, 'Debe rechazar con código HTTP 400');
    assert.ok(
      res.error?.toLowerCase().includes('motivo'),
      'El mensaje debe indicar que el motivo del rechazo es obligatorio',
    );

    const almacenada = await repo.findOne({ where: { id: 'post-001' } });
    assert.strictEqual(
      almacenada?.estado,
      EstadoPostulacion.EN_REVISION,
      'La postulación debe conservar el estado EN_REVISION',
    );

    console.log(
      '  -> RESULTADO: CUMPLE (HTTP 400 retornado cuando se rechaza sin motivo; estado EN_REVISION conservado)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 5: Esquema del escenario: Transición de estado no permitida (excepción)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 5: Esquema del escenario: Transición de estado no permitida (excepción)');
    const ejemplosInvalidos: Array<{
      estado_actual: EstadoPostulacion;
      estado_solicitado: EstadoPostulacion;
    }> = [
      {
        estado_actual: EstadoPostulacion.RECIBIDA,
        estado_solicitado: EstadoPostulacion.VALIDADA,
      },
      {
        estado_actual: EstadoPostulacion.RECIBIDA,
        estado_solicitado: EstadoPostulacion.RECHAZADA,
      },
      {
        estado_actual: EstadoPostulacion.EN_REVISION,
        estado_solicitado: EstadoPostulacion.RECIBIDA,
      },
      {
        estado_actual: EstadoPostulacion.VALIDADA,
        estado_solicitado: EstadoPostulacion.RECHAZADA,
      },
      {
        estado_actual: EstadoPostulacion.VALIDADA,
        estado_solicitado: EstadoPostulacion.EN_REVISION,
      },
      {
        estado_actual: EstadoPostulacion.RECHAZADA,
        estado_solicitado: EstadoPostulacion.VALIDADA,
      },
      {
        estado_actual: EstadoPostulacion.RECHAZADA,
        estado_solicitado: EstadoPostulacion.EN_REVISION,
      },
    ];

    for (const ejemplo of ejemplosInvalidos) {
      const items = crearPostulacionesIniciales();
      items[0].estado = ejemplo.estado_actual;
      repo.setItems(items);

      const res = await controller.revisarPostulacion(
        'post-001',
        { estado: ejemplo.estado_solicitado, motivo: 'Motivo de prueba' },
        adminAutenticado,
      );

      assert.strictEqual(
        res.status,
        409,
        `Transición ${ejemplo.estado_actual} -> ${ejemplo.estado_solicitado} debe rechazarse con HTTP 409`,
      );
      assert.ok(
        res.error?.toLowerCase().includes('transición de estado inválida'),
        'El mensaje debe indicar transición de estado inválida',
      );

      const almacenada = await repo.findOne({ where: { id: 'post-001' } });
      assert.strictEqual(
        almacenada?.estado,
        ejemplo.estado_actual,
        `La postulación debe conservar el estado ${ejemplo.estado_actual}`,
      );
    }

    console.log(
      `  -> RESULTADO: CUMPLE (7/7 ejemplos del Esquema rechazados con HTTP 409 conservando estado original)`,
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 6: Estado solicitado que no pertenece a la máquina de estados (excepción)
  // -------------------------------------------------------------------------
  try {
    console.log(
      '\nTEST 6: Estado solicitado que no pertenece a la máquina de estados (excepción)',
    );
    const items = crearPostulacionesIniciales();
    items[0].estado = EstadoPostulacion.EN_REVISION;
    repo.setItems(items);

    const res = await controller.revisarPostulacion(
      'post-001',
      { estado: 'APROBADA' },
      adminAutenticado,
    );

    assert.strictEqual(res.status, 400, 'Debe rechazar con código HTTP 400');
    assert.ok(
      res.error?.includes('RECIBIDA, EN_REVISION, VALIDADA, RECHAZADA'),
      'El mensaje debe indicar los estados válidos',
    );

    const almacenada = await repo.findOne({ where: { id: 'post-001' } });
    assert.strictEqual(
      almacenada?.estado,
      EstadoPostulacion.EN_REVISION,
      'La postulación debe conservar el estado EN_REVISION',
    );

    console.log(
      '  -> RESULTADO: CUMPLE (HTTP 400 retornado ante estado "APROBADA", conservando EN_REVISION)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 7: Revisión de una postulación inexistente (excepción)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 7: Revisión de una postulación inexistente (excepción)');
    repo.setItems(crearPostulacionesIniciales());
    const antes = JSON.stringify(repo.getAll());

    const res = await controller.revisarPostulacion(
      'id-inexistente-999',
      { estado: 'EN_REVISION' },
      adminAutenticado,
    );

    assert.strictEqual(res.status, 404, 'Debe rechazar con código HTTP 404');
    assert.ok(
      res.error?.toLowerCase().includes('no existe'),
      'El mensaje debe indicar que la postulación no existe',
    );
    assert.strictEqual(
      JSON.stringify(repo.getAll()),
      antes,
      'No debe modificarse ninguna postulación existente',
    );

    console.log(
      '  -> RESULTADO: CUMPLE (HTTP 404 retornado para ID inexistente sin modificar registros)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 8: Registro en bitácora de cada cambio de estado (PA-04)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 8: Registro en bitácora de cada cambio de estado (PA-04)');
    const items = crearPostulacionesIniciales();
    items[0].estado = EstadoPostulacion.EN_REVISION;
    repo.setItems(items);
    auditoria.registros = [];

    // Transición exitosa: EN_REVISION -> VALIDADA
    const resExitosa = await controller.revisarPostulacion(
      'post-001',
      { estado: 'VALIDADA' },
      adminAutenticado,
    );
    assert.strictEqual(resExitosa.status, 200);
    assert.strictEqual(
      auditoria.registros.length,
      1,
      'Debe existir 1 registro en la bitácora de auditoría tras cambio exitoso',
    );

    const registro = auditoria.registros[0];
    assert.strictEqual(registro.actorId, '30300300', 'Debe registrar el actor "30300300"');
    assert.ok(
      registro.detalles?.includes('post-001'),
      'Debe registrar la postulación afectada',
    );
    assert.ok(
      registro.detalles?.includes('EN_REVISION'),
      'Debe registrar el estado anterior EN_REVISION',
    );
    assert.ok(
      registro.detalles?.includes('VALIDADA'),
      'Debe registrar el nuevo estado VALIDADA',
    );
    assert.ok(registro.fecha instanceof Date, 'Debe registrar la fecha del cambio');

    // Transición inválida posterior: VALIDADA -> RECHAZADA (no debe dejar registro de transición)
    const resInvalida = await controller.revisarPostulacion(
      'post-001',
      { estado: 'RECHAZADA', motivo: 'Intento inválido' },
      adminAutenticado,
    );
    assert.strictEqual(resInvalida.status, 409);
    assert.strictEqual(
      auditoria.registros.length,
      1,
      'Una transición rechazada por inválida no debe dejar registrada ninguna transición en la bitácora',
    );

    console.log(
      '  -> RESULTADO: CUMPLE (Cambio registrado en RegistroAuditoria con actor 30300300, postulación, estados y fecha; transición inválida no genera registro)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 9: Bloqueo de la revisión sin autenticación o con rol no administrativo (EAC-03 - Seguridad)
  // -------------------------------------------------------------------------
  try {
    console.log(
      '\nTEST 9: Bloqueo de la revisión sin autenticación o con rol no administrativo (EAC-03 - Seguridad)',
    );
    repo.setItems(crearPostulacionesIniciales());
    auditoria.registros = [];

    // 1. Usuario no autenticado
    const resAnonimo = await controller.revisarPostulacion(
      'post-001',
      { estado: 'EN_REVISION' },
      null,
    );
    assert.strictEqual(resAnonimo.status, 401, 'Debe bloquear usuario no autenticado con HTTP 401');

    // 2. Usuario con rol ESTUDIANTE
    const resEstudiante = await controller.revisarPostulacion(
      'post-001',
      { estado: 'EN_REVISION' },
      { rol: 'ESTUDIANTE', documento: '1053800000' },
    );
    assert.strictEqual(resEstudiante.status, 403, 'Debe bloquear rol ESTUDIANTE con HTTP 403');

    // 3. Usuario externo con rol SUPERVISOR
    const resSupervisor = await controller.revisarPostulacion(
      'post-001',
      { estado: 'EN_REVISION' },
      { rol: 'SUPERVISOR', documento: 'sup-empresa-01' },
    );
    assert.strictEqual(resSupervisor.status, 403, 'Debe bloquear rol SUPERVISOR con HTTP 403');

    const postulacion = await repo.findOne({ where: { id: 'post-001' } });
    assert.strictEqual(
      postulacion?.estado,
      EstadoPostulacion.RECIBIDA,
      'La postulación no debe cambiar de estado ante accesos denegados',
    );

    assert.strictEqual(
      auditoria.registros.length,
      3,
      'Debe registrar el 100% de los intentos no autorizados en la bitácora',
    );
    for (const reg of auditoria.registros) {
      assert.strictEqual(reg.resultado, 'DENEGADO');
      assert.ok(
        reg.duracionMs < 1000,
        `El registro en bitácora debe tardar menos de 1 segundo (tomó ${reg.duracionMs.toFixed(3)} ms)`,
      );
    }

    console.log(
      '  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, postulación sin cambios y 3 eventos en RegistroAuditoria en < 1 s)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  console.log('\n====================================================================');
  console.log(` RESUMEN DE PRUEBAS: ${pruebasPasadas}/${totalPruebas} ESCENARIOS CUMPLIDOS`);
  console.log('====================================================================');

  if (pruebasPasadas === totalPruebas) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

ejecutarPruebas();
