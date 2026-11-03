// ADR-006: error de negocio explicito (p. ej. una transicion de estado
// invalida en Postulacion, ver ADR-003). Se distingue de un error tecnico
// para que el filtro global pueda responder con un mensaje claro en vez de
// un 500 generico.
export class DominioError extends Error {
  constructor(message: string, public readonly codigo: string = 'DOMINIO') {
    super(message);
    this.name = 'DominioError';
  }
}
