/**
 * Pruebas ejecutables para CU-09: Realizar postulación a la práctica.
 * Ejecuta cada uno de los 6 escenarios definidos en specs/009-postularse/spec.md.
 */

import assert from 'node:assert';
import { performance } from 'node:perf_hooks';

// ============================================================================
// 1. Tipos y Enums alineados con el Glosario y ADRs
// ============================================================================

export const EstadoPostulacion = {
  RECIBIDA: 'RECIBIDA',
  EN_REVISION: 'EN_REVISION',
  VALIDADA: 'VALIDADA',
  RECHAZADA: 'RECHAZADA',
} as const;

export type EstadoPostulacion = (typeof EstadoPostulacion)[keyof typeof EstadoPostulacion];

export interface Estudiante {
  id: string;
  documento: string;
  programaAcademico: string;
}

export interface Postulacion {
  id: string;
  estado: EstadoPostulacion;
  documentosAdjuntos: string[];
  estudiante: Estudiante;
  creadaEn: Date;
  actualizadaEn: Date;
}

export interface RequisitoPrograma {
  id: string;
  programaAcademico: string;
  horasMinimas: number;
  documentosRequeridos: string[];
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface RegistroAuditoria {
  id: string;
  evento: string;
  actorId: string | null;
  resultado: string;
  detalles: string | null;
  fecha: Date;
  duracionMs: number;
}

export interface ArchivoAdjuntoDto {
  nombreArchivo: string;
  contenidoBase64: string;
  mimetype: string;
}

export interface CrearPostulacionDto {
  documentos: ArchivoAdjuntoDto[];
}

export interface UsuarioAutenticado {
  documento: string;
  programaAcademico: string;
  rol: string;
  nombre?: string;
  email?: string;
}

// ============================================================================
// 2. Errores de dominio (ADR-006)
// ============================================================================

export class DominioError extends Error {
  public readonly mensaje: string;
  public readonly codigoHttp: number;

  constructor(mensaje: string, codigoHttp: number = 400) {
    super(mensaje);
    this.mensaje = mensaje;
    this.codigoHttp = codigoHttp;
    this.name = new.target.name;
  }
}

export class DocumentoIncompletoError extends DominioError {
  constructor(mensaje = 'La documentación requerida está incompleta') {
    super(mensaje, 422);
  }
}

export class DocumentoCorruptoError extends DominioError {
  constructor(mensaje = 'El archivo adjunto está corrupto o no corresponde a un documento válido') {
    super(mensaje, 422);
  }
}

export class PostulacionActivaExistenteError extends DominioError {
  constructor(mensaje = 'El estudiante ya cuenta con un trámite de postulación activo en curso') {
    super(mensaje, 409);
  }
}

// ============================================================================
// 3. Adaptadores en memoria (Persistencia institucional simulada)
// ============================================================================

export class AuditoriaServiceInMemory {
  public registros: RegistroAuditoria[] = [];

  async registrarAccesoDenegado(
    evento: string,
    actorId?: string | null,
    detalles?: string | null,
  ): Promise<RegistroAuditoria> {
    const inicio = performance.now();
    const registro: RegistroAuditoria = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      evento,
      resultado: 'DENEGADO',
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
}

export class ConfiguracionServiceInMemory {
  private requisitos: Map<string, RequisitoPrograma> = new Map();

  async guardarRequisitos(
    programaAcademico: string,
    horasMinimas: number,
    documentosRequeridos: string[],
  ): Promise<RequisitoPrograma> {
    const req: RequisitoPrograma = {
      id: `req-${Date.now()}`,
      programaAcademico,
      horasMinimas,
      documentosRequeridos: [...documentosRequeridos],
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };
    this.requisitos.set(programaAcademico, req);
    return req;
  }

  async obtenerRequisitosVigentes(programaAcademico: string): Promise<RequisitoPrograma> {
    const req = this.requisitos.get(programaAcademico);
    if (!req) {
      throw new DominioError(
        `No existen requisitos de postulación configurados para el programa académico: ${programaAcademico}`,
      );
    }
    return req;
  }
}

export class PostulacionRepositoryInMemory {
  public items: Postulacion[] = [];
  public estudiantes: Map<string, Estudiante> = new Map();

  async findPorDocumento(documento: string): Promise<Postulacion[]> {
    return this.items.filter((p) => p.estudiante.documento === documento);
  }

  async save(postulacion: Postulacion): Promise<Postulacion> {
    const index = this.items.findIndex((p) => p.id === postulacion.id);
    if (index >= 0) {
      this.items[index] = postulacion;
    } else {
      this.items.push(postulacion);
    }
    return postulacion;
  }
}

// ============================================================================
// 4. Servicio PostulacionService (Reproduce exactamente src/postulacion/postulacion.service.ts)
// ============================================================================

export class PostulacionServiceTest {
  private readonly repo: PostulacionRepositoryInMemory;
  private readonly configService: ConfiguracionServiceInMemory;

  constructor(
    repo: PostulacionRepositoryInMemory,
    configService: ConfiguracionServiceInMemory,
  ) {
    this.repo = repo;
    this.configService = configService;
  }

  async crearPostulacion(
    usuario: UsuarioAutenticado,
    dto: CrearPostulacionDto,
  ): Promise<Postulacion> {
    const { documento, programaAcademico } = usuario;

    // 1. Verificar si el estudiante ya tiene una postulación activa en curso
    const postulacionesPrevias = await this.repo.findPorDocumento(documento);
    const tieneActiva = postulacionesPrevias.some(
      (p) =>
        p.estado === EstadoPostulacion.RECIBIDA ||
        p.estado === EstadoPostulacion.EN_REVISION,
    );

    if (tieneActiva) {
      throw new PostulacionActivaExistenteError();
    }

    // 2. Consultar requisitos vigentes por programa (ADR-007, EAC-02)
    const requisitos = await this.configService.obtenerRequisitosVigentes(programaAcademico);

    // 3. Validar completitud de documentos
    const nombresAdjuntos = dto.documentos.map((d) => d.nombreArchivo.toLowerCase().trim());
    const faltantes = requisitos.documentosRequeridos.filter(
      (docReq) => !nombresAdjuntos.includes(docReq.toLowerCase().trim()),
    );

    if (faltantes.length > 0) {
      throw new DocumentoIncompletoError(
        `La documentación adjunta está incompleta. Faltan los siguientes documentos requeridos: ${faltantes.join(', ')}`,
      );
    }

    // 4. Validar integridad de cada archivo (firma %PDF- y no vacío)
    for (const doc of dto.documentos) {
      this.validarIntegridadArchivo(doc.nombreArchivo, doc.contenidoBase64);
    }

    // 5. Garantizar persistencia del estudiante
    let estudiante = this.repo.estudiantes.get(documento);
    if (!estudiante) {
      estudiante = {
        id: `est-${Date.now()}`,
        documento,
        programaAcademico,
      };
      this.repo.estudiantes.set(documento, estudiante);
    }

    // 6. Crear y persistir en estado RECIBIDA sin transiciones automáticas (ADR-003, RN-01)
    const nuevaPostulacion: Postulacion = {
      id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      estado: EstadoPostulacion.RECIBIDA,
      documentosAdjuntos: dto.documentos.map((d) => d.nombreArchivo),
      estudiante,
      creadaEn: new Date(),
      actualizadaEn: new Date(),
    };

    return this.repo.save(nuevaPostulacion);
  }

  private validarIntegridadArchivo(nombreArchivo: string, contenidoBase64: string): void {
    try {
      const buffer = Buffer.from(contenidoBase64, 'base64');
      if (buffer.length === 0) {
        throw new Error('Archivo vacío');
      }
      const encabezado = buffer.subarray(0, 5).toString('ascii');
      if (!encabezado.startsWith('%PDF-')) {
        throw new Error('Cabecera mágica de archivo PDF inválida');
      }
    } catch {
      throw new DocumentoCorruptoError(
        `El archivo adjunto "${nombreArchivo}" está corrupto, vacío o no corresponde a un documento PDF válido`,
      );
    }
  }
}

// ============================================================================
// 5. Controlador y Guards (Reproduce src/postulacion/postulacion.controller.ts)
// ============================================================================

export class PostulacionControllerTest {
  private readonly service: PostulacionServiceTest;
  private readonly auditoria: AuditoriaServiceInMemory;

  constructor(
    service: PostulacionServiceTest,
    auditoria: AuditoriaServiceInMemory,
  ) {
    this.service = service;
    this.auditoria = auditoria;
  }

  async postularse(
    usuario: UsuarioAutenticado | null,
    dto: CrearPostulacionDto,
  ): Promise<{ status: number; data?: Postulacion; error?: string }> {
    const inicio = performance.now();

    // 1. Guard SSO (ADR-004)
    if (!usuario) {
      await this.auditoria.registrarAccesoDenegado(
        'ACCESO_NO_AUTENTICADO_SSO',
        null,
        'Petición sin token en POST /postulaciones',
      );
      const fin = performance.now();
      assert.ok(fin - inicio < 1000, 'El registro de auditoría debe tardar < 1 segundo (EAC-03)');
      return { status: 401, error: 'Token de autenticación institucional no proporcionado' };
    }

    // 2. Guard de Roles @Roles('ESTUDIANTE') (ADR-004, EAC-03)
    if (usuario.rol !== 'ESTUDIANTE') {
      await this.auditoria.registrarAccesoDenegado(
        'ACCESO_ROL_NO_AUTORIZADO',
        usuario.documento,
        `Rol actual: ${usuario.rol}. Requiere ESTUDIANTE en POST /postulaciones`,
      );
      const fin = performance.now();
      assert.ok(fin - inicio < 1000, 'El registro de auditoría debe tardar < 1 segundo (EAC-03)');
      return { status: 403, error: 'Acceso denegado: se requiere rol ESTUDIANTE' };
    }

    // 3. Ejecución del servicio con manejo centralizado de errores (ADR-006)
    try {
      const postulacion = await this.service.crearPostulacion(usuario, dto);
      return { status: 201, data: postulacion };
    } catch (err: any) {
      if (err instanceof DominioError) {
        return { status: err.codigoHttp, error: err.mensaje };
      }
      return { status: 500, error: err.message || 'Error interno' };
    }
  }
}

// ============================================================================
// 6. Ejecución de la suite de pruebas
// ============================================================================

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log(' EJECUTANDO PRUEBAS DE VALIDACIÓN: CU-09 POSTULARSE A LA PRÁCTICA');
  console.log('================================================================\n');

  const repo = new PostulacionRepositoryInMemory();
  const configService = new ConfiguracionServiceInMemory();
  const auditoriaService = new AuditoriaServiceInMemory();
  const service = new PostulacionServiceTest(repo, configService);
  const controller = new PostulacionControllerTest(service, auditoriaService);

  // Sembrar requisitos iniciales en base de datos para Ingeniería de Sistemas (ADR-007)
  await configService.guardarRequisitos(
    'Ingeniería de Sistemas',
    480,
    ['hoja_vida.pdf', 'carta_presentacion.pdf'],
  );

  const pdfValidoBase64 = Buffer.from('%PDF-1.4 Contenido simulado de prueba').toString('base64');
  const pdfCorruptoBase64 = Buffer.from('ESTO_NO_ES_UN_PDF_VALIDO').toString('base64');

  const usuarioEstudiante: UsuarioAutenticado = {
    documento: '1053800000',
    programaAcademico: 'Ingeniería de Sistemas',
    rol: 'ESTUDIANTE',
    nombre: 'Pepito Pérez',
  };

  let pruebasPasadas = 0;
  const totalPruebas = 6;

  // -------------------------------------------------------------------------
  // TEST 1: Carga exitosa de postulación con requisitos completos (flujo básico)
  // -------------------------------------------------------------------------
  try {
    console.log('TEST 1: Carga exitosa de postulación con requisitos completos (flujo básico)');
    const dto: CrearPostulacionDto = {
      documentos: [
        { nombreArchivo: 'hoja_vida.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
        { nombreArchivo: 'carta_presentacion.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
      ],
    };

    const res = await controller.postularse(usuarioEstudiante, dto);

    assert.strictEqual(res.status, 201, 'Debe retornar código HTTP 201 Created');
    assert.ok(res.data, 'Debe retornar los datos de la postulación creada');
    assert.strictEqual(res.data.estado, EstadoPostulacion.RECIBIDA, 'El estado inicial debe ser RECIBIDA (ADR-003, RN-01)');
    assert.strictEqual(res.data.estudiante.documento, '1053800000', 'Debe estar asociada al estudiante autenticado');
    assert.strictEqual(res.data.documentosAdjuntos.length, 2, 'Debe registrar los 2 documentos adjuntos');

    console.log('  -> RESULTADO: CUMPLE (HTTP 201, postulación creada en estado explícito RECIBIDA, sin transiciones automáticas)');
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Rechazo de postulación por documentos incompletos (flujo alterno)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 2: Rechazo de postulación por documentos incompletos (flujo alterno)');
    const usuarioOtroEstudiante: UsuarioAutenticado = {
      documento: '1053800002',
      programaAcademico: 'Ingeniería de Sistemas',
      rol: 'ESTUDIANTE',
    };

    // Envía solo hoja_vida.pdf (falta carta_presentacion.pdf)
    const dtoIncompleto: CrearPostulacionDto = {
      documentos: [
        { nombreArchivo: 'hoja_vida.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
      ],
    };

    const countAntes = repo.items.length;
    const res = await controller.postularse(usuarioOtroEstudiante, dtoIncompleto);

    assert.strictEqual(res.status, 422, 'Debe responder con código HTTP 422 Unprocessable Entity');
    assert.ok(res.error?.includes('incompleta'), 'El mensaje debe indicar documentación incompleta');
    assert.strictEqual(repo.items.length, countAntes, 'No debe persistir ninguna postulación en base de datos');

    console.log('  -> RESULTADO: CUMPLE (HTTP 422, rechazo inmediato por documentación incompleta, 0 inserciones en BD)');
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Rechazo de postulación por archivo corrupto o ilegible (flujo alterno)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 3: Rechazo de postulación por archivo corrupto o ilegible (flujo alterno)');
    const usuarioEstudiante3: UsuarioAutenticado = {
      documento: '1053800003',
      programaAcademico: 'Ingeniería de Sistemas',
      rol: 'ESTUDIANTE',
    };

    const dtoCorrupto: CrearPostulacionDto = {
      documentos: [
        { nombreArchivo: 'hoja_vida.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
        { nombreArchivo: 'carta_presentacion.pdf', contenidoBase64: pdfCorruptoBase64, mimetype: 'application/pdf' },
      ],
    };

    const countAntes = repo.items.length;
    const res = await controller.postularse(usuarioEstudiante3, dtoCorrupto);

    assert.strictEqual(res.status, 422, 'Debe responder con código HTTP 422');
    assert.ok(res.error?.includes('corrupto') || res.error?.includes('válido'), 'El mensaje debe indicar archivo corrupto o inválido');
    assert.strictEqual(repo.items.length, countAntes, 'No debe modificar el estado ni insertar registros');

    console.log('  -> RESULTADO: CUMPLE (HTTP 422, rechazo por archivo corrupto sin cabecera PDF válida)');
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Intento de postulación cuando ya existe una postulación activa (flujo alterno)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 4: Intento de postulación cuando ya existe una postulación activa (flujo alterno)');
    // usuarioEstudiante (1053800000) ya tiene una postulación en estado RECIBIDA del TEST 1
    const dtoNuevo: CrearPostulacionDto = {
      documentos: [
        { nombreArchivo: 'hoja_vida.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
        { nombreArchivo: 'carta_presentacion.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
      ],
    };

    const res = await controller.postularse(usuarioEstudiante, dtoNuevo);

    assert.strictEqual(res.status, 409, 'Debe rechazar con código HTTP 409 Conflict');
    assert.ok(res.error?.includes('activo en curso'), 'Debe advertir que ya cuenta con un trámite activo');

    console.log('  -> RESULTADO: CUMPLE (HTTP 409 Conflict, rechaza trámite simultáneo si ya existe postulación activa)');
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Bloqueo de postulación sin autenticación o rol indebido (EAC-03 Seguridad)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 5: Bloqueo de postulación sin autenticación o rol indebido (EAC-03 Seguridad)');
    auditoriaService.registros = [];
    const dtoDummy: CrearPostulacionDto = {
      documentos: [
        { nombreArchivo: 'hoja_vida.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
      ],
    };

    // Intento 1: Usuario anónimo (sin autenticar)
    const tIni1 = performance.now();
    const resAnonimo = await controller.postularse(null, dtoDummy);
    const tFin1 = performance.now();
    assert.strictEqual(resAnonimo.status, 401, 'Debe bloquear con HTTP 401 si no hay token');

    // Intento 2: Supervisor externo
    const tIni2 = performance.now();
    const resSupervisor = await controller.postularse(
      { documento: 'sup-01', programaAcademico: 'N/A', rol: 'SUPERVISOR' },
      dtoDummy,
    );
    const tFin2 = performance.now();
    assert.strictEqual(resSupervisor.status, 403, 'Debe bloquear con HTTP 403 si el rol no es ESTUDIANTE');

    // Intento 3: Personal administrativo
    const tIni3 = performance.now();
    const resAdmin = await controller.postularse(
      { documento: 'adm-01', programaAcademico: 'N/A', rol: 'ADMINISTRATIVO' },
      dtoDummy,
    );
    const tFin3 = performance.now();
    assert.strictEqual(resAdmin.status, 403, 'Debe bloquear con HTTP 403 para rol ADMINISTRATIVO');

    // Verificación EAC-03: 100% de accesos bloqueados y registrados en auditoría en < 1 segundo
    assert.strictEqual(auditoriaService.registros.length, 3, 'Debe haber 3 registros en auditoría');
    for (const reg of auditoriaService.registros) {
      assert.strictEqual(reg.resultado, 'DENEGADO');
      assert.ok(reg.duracionMs < 1000, `Latencia de registro < 1000 ms (tomó ${reg.duracionMs.toFixed(3)} ms)`);
    }

    console.log('  -> RESULTADO: CUMPLE (100% accesos bloqueados con HTTP 401/403, 3 eventos en auditoría con latencia < 1 s)');
    pruebasPasadas++;
  } catch (err: any) {
    console.error('  -> RESULTADO: NO CUMPLE:', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Modificación de requisitos sin tocar código ni redesplegar (EAC-02 Mantenibilidad)
  // -------------------------------------------------------------------------
  try {
    console.log('\nTEST 6: Modificación de requisitos sin tocar código ni redesplegar (EAC-02 Mantenibilidad)');
    // Administrador actualiza requisitos agregando acuerdo_confidencialidad.pdf en base de datos
    await configService.guardarRequisitos(
      'Ingeniería de Sistemas',
      480,
      ['hoja_vida.pdf', 'carta_presentacion.pdf', 'acuerdo_confidencialidad.pdf'],
    );

    const usuarioEstudiante4: UsuarioAutenticado = {
      documento: '1053800004',
      programaAcademico: 'Ingeniería de Sistemas',
      rol: 'ESTUDIANTE',
    };

    // Estudiante envía postulación con los requisitos antiguos (sin acuerdo_confidencialidad.pdf)
    const dtoSinAcuerdo: CrearPostulacionDto = {
      documentos: [
        { nombreArchivo: 'hoja_vida.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
        { nombreArchivo: 'carta_presentacion.pdf', contenidoBase64: pdfValidoBase64, mimetype: 'application/pdf' },
      ],
    };

    const res = await controller.postularse(usuarioEstudiante4, dtoSinAcuerdo);

    assert.strictEqual(res.status, 422, 'Debe rechazar con HTTP 422');
    assert.ok(res.error?.includes('acuerdo_confidencialidad.pdf'), 'Debe exigir el nuevo documento configurado dinámicamente');

    console.log('  -> RESULTADO: CUMPLE (HTTP 422, reconoce regla modificada en base de datos sin alterar código de postulación)');
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
