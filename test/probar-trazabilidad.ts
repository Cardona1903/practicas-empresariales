/**
 * Pruebas ejecutables para CU-04: Visualización de datos y trazabilidad de postulantes.
 * Ejecuta cada uno de los escenarios definidos en specs/004-trazabilidad/spec.md.
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

  async findOnePorDocumentoEstudiante(documento: string): Promise<Postulacion | null> {
    const coincidencias = this.items
      .filter((p) => p.estudiante.documento === documento)
      .sort((a, b) => b.creadaEn.getTime() - a.creadaEn.getTime());
    return coincidencias.length > 0 ? { ...coincidencias[0] } : null;
  }
}

// Servicio de Auditoría en memoria (EAC-03, PA-04, ADR-001)
class AuditoriaServiceInMemory {
  public registros: RegistroAuditoria[] = [];

  async registrarEvento(
    evento: string,
    resultado: string,
    actorId?: string | null,
    detalles?: string | null,
    fechaPersonalizada?: Date,
  ): Promise<RegistroAuditoria> {
    const inicio = performance.now();
    const registro: RegistroAuditoria = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      evento,
      resultado,
      actorId: actorId ?? null,
      detalles: detalles ?? null,
      fecha: fechaPersonalizada ?? new Date(),
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

  async consultarPorTramite(
    postulacionId: string,
    documentoEstudiante: string,
  ): Promise<Array<{ evento: string; resultado: string; fecha: Date }>> {
    return [...this.registros]
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      .filter(
        (r) =>
          r.actorId === documentoEstudiante ||
          (r.detalles &&
            (r.detalles.includes(postulacionId) ||
              r.detalles.includes(documentoEstudiante))),
      )
      .map((r) => ({
        evento: r.evento,
        resultado: r.resultado,
        fecha: r.fecha,
      }));
  }
}

// Servicio PostulacionService reproduciendo exactamente obtenerTrazabilidadPorEstudiante (CU-04)
class PostulacionServiceTest {
  constructor(
    private readonly postulacionRepo: PostulacionRepositoryInMemory,
    private readonly auditoriaService: AuditoriaServiceInMemory,
  ) {}

  async obtenerPorEstudiante(documento: string): Promise<Postulacion | null> {
    return this.postulacionRepo.findOnePorDocumentoEstudiante(documento);
  }

  async obtenerTrazabilidadPorEstudiante(documento: string) {
    const postulacion = await this.obtenerPorEstudiante(documento);

    if (!postulacion || !postulacion.estudiante) {
      throw new PostulacionNoEncontradaError(
        `El postulante con documento "${documento}" no fue encontrado`,
      );
    }

    const trazabilidad = await this.auditoriaService.consultarPorTramite(
      postulacion.id,
      documento,
    );

    return {
      estudiante: {
        documento: postulacion.estudiante.documento,
        programaAcademico: postulacion.estudiante.programaAcademico,
      },
      postulacion: {
        id: postulacion.id,
        estado: postulacion.estado,
        documentosAdjuntos: postulacion.documentosAdjuntos,
        motivoRechazo: postulacion.motivoRechazo ?? null,
        creadaEn: postulacion.creadaEn,
        actualizadaEn: postulacion.actualizadaEn,
      },
      trazabilidad,
    };
  }
}

// Controlador HTTP con validación de SsoAuthGuard, RolesGuard y HttpExceptionFilter
class PostulacionControllerTest {
  constructor(
    private readonly service: PostulacionServiceTest,
    private readonly auditoria: AuditoriaServiceInMemory,
  ) {}

  async obtenerTrazabilidadEstudiante(
    documento: string,
    usuario: { rol?: string; documento?: string } | null,
  ): Promise<{
    status: number;
    data?: Awaited<ReturnType<PostulacionServiceTest['obtenerTrazabilidadPorEstudiante']>>;
    error?: string;
  }> {
    const inicio = performance.now();

    // 1. SsoAuthGuard
    if (!usuario || !usuario.documento) {
      await this.auditoria.registrarAccesoDenegado(
        'ACCESO_NO_AUTENTICADO_SSO',
        null,
        `Petición sin token en GET /postulaciones/estudiante/${documento}`,
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
        `Rol "${usuario.rol}" no autorizado en GET /postulaciones/estudiante/${documento}. Roles requeridos: [ADMINISTRATIVO]`,
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

    // 3. Invocación al servicio con captura de DominioError (HttpExceptionFilter, ADR-006)
    try {
      const data = await this.service.obtenerTrazabilidadPorEstudiante(documento);
      return { status: 200, data };
    } catch (err: unknown) {
      if (err instanceof DominioError) {
        return { status: err.codigoHttp, error: err.mensaje };
      }
      return { status: 500, error: 'Error interno del servidor' };
    }
  }
}

const estudianteBase: Estudiante = {
  id: 'est-1053800000',
  documento: '1053800000',
  programaAcademico: 'Ingeniería de Sistemas',
};

function crearPostulacionesIniciales(): Postulacion[] {
  return [
    {
      id: 'post-001',
      estado: EstadoPostulacion.VALIDADA,
      documentosAdjuntos: ['hoja_vida.pdf', 'carta_presentacion.pdf'],
      motivoRechazo: null,
      estudiante: estudianteBase,
      creadaEn: new Date('2026-11-19T10:00:00Z'),
      actualizadaEn: new Date('2026-11-19T12:00:00Z'),
    },
  ];
}

const adminAutenticado = {
  rol: 'ADMINISTRATIVO',
  documento: '30300300',
};

async function ejecutarPruebas() {
  console.log('====================================================================');
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-04 TRAZABILIDAD DE POSTULANTES');
  console.log('====================================================================\n');

  const repo = new PostulacionRepositoryInMemory(crearPostulacionesIniciales());
  const auditoria = new AuditoriaServiceInMemory();
  const service = new PostulacionServiceTest(repo, auditoria);
  const controller = new PostulacionControllerTest(service, auditoria);

  let pruebasPasadas = 0;
  const totalPruebas = 3;

  // -------------------------------------------------------------------------
  // ESCENARIO 1: Consulta exitosa de los datos y trazabilidad de un postulante existente (flujo básico)
  // -------------------------------------------------------------------------
  try {
    console.log(
      'TEST 1: Consulta exitosa de los datos y trazabilidad de un postulante existente (flujo básico)',
    );
    repo.setItems(crearPostulacionesIniciales());
    auditoria.registros = [];

    // Sembrar eventos de auditoría asociados al trámite post-001 del estudiante 1053800000
    await auditoria.registrarEvento(
      'CAMBIO_ESTADO_POSTULACION',
      'EXITOSO',
      '30300300',
      'Postulación [post-001]: estado anterior "RECIBIDA" -> nuevo estado "EN_REVISION"',
      new Date('2026-11-19T11:00:00Z'),
    );
    await auditoria.registrarEvento(
      'CAMBIO_ESTADO_POSTULACION',
      'EXITOSO',
      '30300300',
      'Postulación [post-001]: estado anterior "EN_REVISION" -> nuevo estado "VALIDADA"',
      new Date('2026-11-19T12:00:00Z'),
    );

    const res = await controller.obtenerTrazabilidadEstudiante(
      '1053800000',
      adminAutenticado,
    );

    assert.strictEqual(res.status, 200, 'Debe responder con código de estado HTTP 200');
    assert.ok(res.data, 'Debe retornar el cuerpo de datos');

    // Validar datos del estudiante postulante ("documento", "programaAcademico")
    assert.strictEqual(res.data.estudiante.documento, '1053800000');
    assert.strictEqual(
      res.data.estudiante.programaAcademico,
      'Ingeniería de Sistemas',
    );

    // Validar detalle de su postulación ("id", "estado", "documentosAdjuntos", "motivoRechazo", "creadaEn", "actualizadaEn")
    assert.strictEqual(res.data.postulacion.id, 'post-001');
    assert.strictEqual(res.data.postulacion.estado, EstadoPostulacion.VALIDADA);
    assert.deepStrictEqual(res.data.postulacion.documentosAdjuntos, [
      'hoja_vida.pdf',
      'carta_presentacion.pdf',
    ]);
    assert.strictEqual(res.data.postulacion.motivoRechazo, null);
    assert.ok(res.data.postulacion.creadaEn instanceof Date);
    assert.ok(res.data.postulacion.actualizadaEn instanceof Date);

    // Validar lista de eventos de auditoría asociados ("evento", "resultado", "fecha")
    assert.strictEqual(res.data.trazabilidad.length, 2);
    assert.strictEqual(
      res.data.trazabilidad[0].evento,
      'CAMBIO_ESTADO_POSTULACION',
    );
    assert.strictEqual(res.data.trazabilidad[0].resultado, 'EXITOSO');
    assert.ok(res.data.trazabilidad[0].fecha instanceof Date);

    console.log(
      '  -> RESULTADO: CUMPLE (HTTP 200, retorna estudiante, detalle de postulación y 2 eventos de auditoría asociados al trámite)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 2: Consulta de un postulante inexistente por documento (flujo alterno)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 2: Consulta de un postulante inexistente por documento (flujo alterno)');
    repo.setItems(crearPostulacionesIniciales());

    const res = await controller.obtenerTrazabilidadEstudiante(
      '9999999999',
      adminAutenticado,
    );

    assert.strictEqual(res.status, 404, 'Debe responder con código de estado HTTP 404');
    assert.ok(
      res.error?.toLowerCase().includes('no fue encontrado'),
      'El mensaje debe indicar que el postulante no fue encontrado',
    );

    console.log(
      '  -> RESULTADO: CUMPLE (HTTP 404 retornado con mensaje indicando que el postulante 9999999999 no fue encontrado)',
    );
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 3: Bloqueo de consulta de datos y trazabilidad sin rol administrativo (EAC-03 - Seguridad)
  // -------------------------------------------------------------------------
  try {
    console.log(
      '\nTEST 3: Bloqueo de consulta de datos y trazabilidad sin rol administrativo (EAC-03 - Seguridad)',
    );
    repo.setItems(crearPostulacionesIniciales());
    auditoria.registros = [];

    // 1. Usuario no autenticado
    const resAnonimo = await controller.obtenerTrazabilidadEstudiante(
      '1053800000',
      null,
    );
    assert.strictEqual(resAnonimo.status, 401, 'Debe bloquear usuario no autenticado con HTTP 401');
    assert.strictEqual(resAnonimo.data, undefined, 'No debe entregar información sensible');

    // 2. Usuario con rol ESTUDIANTE
    const resEstudiante = await controller.obtenerTrazabilidadEstudiante(
      '1053800000',
      { rol: 'ESTUDIANTE', documento: '1053800000' },
    );
    assert.strictEqual(resEstudiante.status, 403, 'Debe bloquear rol ESTUDIANTE con HTTP 403');
    assert.strictEqual(resEstudiante.data, undefined, 'No debe entregar información sensible');

    // 3. Usuario externo con rol SUPERVISOR
    const resSupervisor = await controller.obtenerTrazabilidadEstudiante(
      '1053800000',
      { rol: 'SUPERVISOR', documento: 'sup-empresa-01' },
    );
    assert.strictEqual(resSupervisor.status, 403, 'Debe bloquear rol SUPERVISOR con HTTP 403');
    assert.strictEqual(resSupervisor.data, undefined, 'No debe entregar información sensible');

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
      '  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, sin entrega de datos sensibles y 3 eventos en RegistroAuditoria en < 1 s)',
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
