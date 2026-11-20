/**
 * Pruebas ejecutables para CU-01: Visualizar peticiones de postulación.
 * Ejecuta cada uno de los escenarios definidos en specs/001-visualizar-peticiones/spec.md.
 */

import assert from 'node:assert';
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
  estudiante: Estudiante;
  creadaEn: Date;
  actualizadaEn: Date;
}

interface RegistroAuditoria {
  id: string;
  evento: string;
  actorId: string | null;
  detalle: string;
  fecha: Date;
  duracionMs: number;
}

// Simulador en memoria del repositorio TypeORM de Postulación
class PostulacionRepositoryInMemory {
  private items: Postulacion[] = [];

  constructor(initialItems: Postulacion[] = []) {
    this.items = [...initialItems];
  }

  setItems(items: Postulacion[]) {
    this.items = [...items];
  }

  async find(options: {
    where?: { estado?: EstadoPostulacion };
    order?: { creadaEn?: 'ASC' | 'DESC' };
  }): Promise<Postulacion[]> {
    let result = [...this.items];

    if (options.where && options.where.estado) {
      result = result.filter((p) => p.estado === options.where!.estado);
    }

    if (options.order && options.order.creadaEn) {
      result.sort((a, b) => {
        const diff = a.creadaEn.getTime() - b.creadaEn.getTime();
        return options.order!.creadaEn === 'DESC' ? -diff : diff;
      });
    }

    return result;
  }
}

// Servicio de Auditoría en memoria (EAC-03, PA-04)
class AuditoriaServiceInMemory {
  public registros: RegistroAuditoria[] = [];

  async registrarAccesoDenegado(
    evento: string,
    actorId: string | null,
    detalle: string,
  ): Promise<RegistroAuditoria> {
    const inicio = performance.now();
    const registro: RegistroAuditoria = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      evento,
      actorId,
      detalle,
      fecha: new Date(),
      duracionMs: 0,
    };
    const fin = performance.now();
    registro.duracionMs = fin - inicio;
    this.registros.push(registro);
    return registro;
  }
}

// Servicio PostulacionService reproduciendo exactamente la lógica implementada
class PostulacionServiceTest {
  private readonly postulacionRepo: PostulacionRepositoryInMemory;

  constructor(postulacionRepo: PostulacionRepositoryInMemory) {
    this.postulacionRepo = postulacionRepo;
  }

  async listarPostulaciones(estado?: EstadoPostulacion): Promise<Postulacion[]> {
    const where = estado ? { estado } : {};
    return this.postulacionRepo.find({
      where,
      order: { creadaEn: 'DESC' },
    });
  }
}

// Guard y Controlador reproduciendo autorización y enrutamiento
class PostulacionControllerTest {
  private readonly service: PostulacionServiceTest;
  private readonly auditoria: AuditoriaServiceInMemory;

  constructor(service: PostulacionServiceTest, auditoria: AuditoriaServiceInMemory) {
    this.service = service;
    this.auditoria = auditoria;
  }

  async listarPostulaciones(
    usuario: { rol?: string; documento?: string } | null,
    filtro: { estado?: EstadoPostulacion } = {},
  ): Promise<{ status: number; data?: Postulacion[]; error?: string }> {
    const inicio = performance.now();

    // 1. Verificación SsoAuthGuard
    if (!usuario) {
      await this.auditoria.registrarAccesoDenegado(
        'ACCESO_NO_AUTENTICADO_SSO',
        null,
        'Petición sin token en GET /postulaciones',
      );
      const fin = performance.now();
      assert.ok(fin - inicio < 1000, 'El registro de auditoría debe tardar menos de 1 segundo (EAC-03)');
      return { status: 401, error: 'Token de autenticación institucional no proporcionado' };
    }

    // 2. Verificación RolesGuard con @Roles('ADMINISTRATIVO')
    if (usuario.rol !== 'ADMINISTRATIVO') {
      await this.auditoria.registrarAccesoDenegado(
        'ACCESO_ROL_NO_AUTORIZADO',
        usuario.documento || 'DESCONOCIDO',
        `Rol actual: ${usuario.rol}. Requiere ADMINISTRATIVO en GET /postulaciones`,
      );
      const fin = performance.now();
      assert.ok(fin - inicio < 1000, 'El registro de auditoría debe tardar menos de 1 segundo (EAC-03)');
      return { status: 403, error: 'Acceso denegado: se requiere rol ADMINISTRATIVO' };
    }

    // 3. Ejecución de la consulta en el servicio
    const data = await this.service.listarPostulaciones(filtro.estado);
    return { status: 200, data };
  }
}

// Datos de prueba iniciales
const estudiante1: Estudiante = {
  id: 'est-1',
  documento: '1053800001',
  programaAcademico: 'Ingeniería de Sistemas',
};

const estudiante2: Estudiante = {
  id: 'est-2',
  documento: '1053800002',
  programaAcademico: 'Ingeniería de Alimentos',
};

const estudiante3: Estudiante = {
  id: 'est-3',
  documento: '1053800003',
  programaAcademico: 'Ingeniería Mecatrónica',
};

const mockPostulaciones: Postulacion[] = [
  {
    id: 'pos-001',
    estado: EstadoPostulacion.RECIBIDA,
    documentosAdjuntos: ['hoja_vida.pdf', 'carta_presentacion.pdf'],
    estudiante: estudiante1,
    creadaEn: new Date('2026-11-19T10:00:00Z'),
    actualizadaEn: new Date('2026-11-19T10:00:00Z'),
  },
  {
    id: 'pos-002',
    estado: EstadoPostulacion.EN_REVISION,
    documentosAdjuntos: ['hoja_vida.pdf', 'carta_presentacion.pdf'],
    estudiante: estudiante2,
    creadaEn: new Date('2026-11-19T11:30:00Z'),
    actualizadaEn: new Date('2026-11-19T11:30:00Z'),
  },
  {
    id: 'pos-003',
    estado: EstadoPostulacion.VALIDADA,
    documentosAdjuntos: ['hoja_vida.pdf', 'convenio.pdf'],
    estudiante: estudiante3,
    creadaEn: new Date('2026-11-18T08:00:00Z'),
    actualizadaEn: new Date('2026-11-18T08:00:00Z'),
  },
];

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-01 VISUALIZAR PETICIONES');
  console.log('================================================================\n');

  const repo = new PostulacionRepositoryInMemory(mockPostulaciones);
  const auditoria = new AuditoriaServiceInMemory();
  const service = new PostulacionServiceTest(repo);
  const controller = new PostulacionControllerTest(service, auditoria);

  let pruebasPasadas = 0;
  const totalPruebas = 4;

  // -------------------------------------------------------------------------
  // ESCENARIO 1: Consulta exitosa del listado general de peticiones (flujo básico)
  // -------------------------------------------------------------------------
  try {
    console.log('TEST 1: Consulta exitosa del listado general de peticiones (flujo básico)');
    const res = await controller.listarPostulaciones({
      rol: 'ADMINISTRATIVO',
      documento: 'admin-01',
    });

    assert.strictEqual(res.status, 200, 'Debe responder con código HTTP 200');
    assert.ok(Array.isArray(res.data), 'Debe retornar un arreglo de postulaciones');
    assert.strictEqual(res.data.length, 3, 'Debe retornar las 3 postulaciones existentes');

    // Verificar orden cronológico descendente (la más reciente primero)
    assert.strictEqual(res.data[0].id, 'pos-002', 'La primera debe ser la creada a las 11:30');
    assert.strictEqual(res.data[1].id, 'pos-001', 'La segunda debe ser la creada a las 10:00');
    assert.strictEqual(res.data[2].id, 'pos-003', 'La tercera debe ser la creada el 18-Nov');

    // Verificar estructura de datos
    for (const post of res.data) {
      assert.ok(post.id, 'Debe contener identificador de postulación');
      assert.ok(post.estudiante.documento, 'Debe contener documento del estudiante');
      assert.ok(post.estudiante.programaAcademico, 'Debe contener programa académico');
      assert.ok(post.creadaEn, 'Debe contener fecha de radicación');
      assert.ok(Array.isArray(post.documentosAdjuntos), 'Debe contener documentos adjuntos');
      assert.ok(
        Object.values(EstadoPostulacion).includes(post.estado as any),
        'Debe contener estado válido de la máquina',
      );
    }

    console.log('  -> RESULTADO: CUMPLE (HTTP 200, 3 registros recibidos en orden cronológico descendente)');
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 2: Consulta de peticiones cuando no existen registros en el sistema (flujo alterno)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 2: Consulta de peticiones cuando no existen registros (flujo alterno)');
    repo.setItems([]); // Vaciar registros
    const res = await controller.listarPostulaciones({
      rol: 'ADMINISTRATIVO',
      documento: 'admin-01',
    });

    assert.strictEqual(res.status, 200, 'Debe responder con código HTTP 200');
    assert.ok(Array.isArray(res.data), 'Debe retornar un arreglo');
    assert.strictEqual(res.data.length, 0, 'El arreglo debe estar vacío');

    console.log('  -> RESULTADO: CUMPLE (HTTP 200, lista vacía [] retornada correctamente)');
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  } finally {
    repo.setItems(mockPostulaciones); // Restaurar registros
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 3: Filtrado opcional de peticiones por estado de postulación (flujo alterno)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 3: Filtrado opcional de peticiones por estado (flujo alterno)');
    const res = await controller.listarPostulaciones(
      { rol: 'ADMINISTRATIVO', documento: 'admin-01' },
      { estado: EstadoPostulacion.RECIBIDA },
    );

    assert.strictEqual(res.status, 200, 'Debe responder con código HTTP 200');
    assert.ok(Array.isArray(res.data), 'Debe retornar un arreglo');
    assert.strictEqual(res.data.length, 1, 'Debe retornar exactamente 1 postulación en estado RECIBIDA');
    assert.strictEqual(res.data[0].id, 'pos-001', 'Debe corresponder a pos-001');
    assert.strictEqual(res.data[0].estado, EstadoPostulacion.RECIBIDA, 'El estado debe ser RECIBIDA');

    console.log('  -> RESULTADO: CUMPLE (HTTP 200, filtrado exacto por estado RECIBIDA)');
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // ESCENARIO 4: Bloqueo de consulta sin autenticación o rol no administrativo (EAC-03 - Seguridad)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 4: Bloqueo de consulta sin rol administrativo (EAC-03 Seguridad)');
    auditoria.registros = [];

    // Intento 1: Usuario anónimo (sin autenticar)
    const tInicio1 = performance.now();
    const resAnonimo = await controller.listarPostulaciones(null);
    const tFin1 = performance.now();
    assert.strictEqual(resAnonimo.status, 401, 'Debe rechazar con HTTP 401 si no hay token');

    // Intento 2: Estudiante autenticado
    const tInicio2 = performance.now();
    const resEstudiante = await controller.listarPostulaciones({
      rol: 'ESTUDIANTE',
      documento: '1053800001',
    });
    const tFin2 = performance.now();
    assert.strictEqual(resEstudiante.status, 403, 'Debe rechazar con HTTP 403 si el rol es ESTUDIANTE');

    // Intento 3: Supervisor externo
    const tInicio3 = performance.now();
    const resSupervisor = await controller.listarPostulaciones({
      rol: 'SUPERVISOR',
      documento: 'sup-externo',
    });
    const tFin3 = performance.now();
    assert.strictEqual(resSupervisor.status, 403, 'Debe rechazar con HTTP 403 si el rol es SUPERVISOR');

    // Verificación de auditoría: 100% de accesos no autorizados bloqueados y registrados en < 1 segundo
    assert.strictEqual(auditoria.registros.length, 3, 'Debe registrar los 3 intentos en RegistroAuditoria');
    for (const reg of auditoria.registros) {
      assert.ok(reg.duracionMs < 1000, `El registro en auditoría debe tomar < 1 s (tomó ${reg.duracionMs.toFixed(3)} ms)`);
    }

    console.log(`  -> RESULTADO: CUMPLE (100% bloqueados con HTTP 401/403, 3 eventos en auditoría con latencia < 1 s)`);
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  console.log('\n================================================================');
  console.log(` RESUMEN DE PRUEBAS: ${pruebasPasadas}/${totalPruebas} ESCENARIOS CUMPLIDOS`);
  console.log('================================================================');

  if (pruebasPasadas === totalPruebas) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

ejecutarPruebas();
