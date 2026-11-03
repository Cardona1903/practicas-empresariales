import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoRegistroHoras, RegistroHoras } from './horas.entity';

@Injectable()
export class HorasService {
  constructor(
    @InjectRepository(RegistroHoras) private readonly registros: Repository<RegistroHoras>,
  ) {}

  // CU-12: el supervisor (via SupervisorTokenGuard, ADR-004) registra horas.
  registrar(datos: { estudianteId: string; supervisorEmail: string; fecha: string; horas: number }) {
    return this.registros.save(this.registros.create(datos));
  }

  // CU-05: el personal administrativo consolida y cruza los registros antes
  // de habilitar el acta. Es manual (RN-01): un adminId siempre lo dispara.
  async verificar(estudianteId: string, adminId: string) {
    const pendientes = await this.registros.find({
      where: { estudianteId, estado: EstadoRegistroHoras.REGISTRADA },
    });
    for (const registro of pendientes) {
      registro.estado = EstadoRegistroHoras.VERIFICADA;
      registro.verificadoPorAdminId = adminId;
    }
    return this.registros.save(pendientes);
  }

  // Usado por actas.service.ts (ADR-005) para consolidar el total antes de
  // generar el acta. Unica forma en que otro modulo lee estos datos: nunca
  // directamente de la tabla `registro_horas`.
  async totalHorasValidadas(estudianteId: string): Promise<number> {
    const verificadas = await this.registros.find({
      where: { estudianteId, estado: EstadoRegistroHoras.VERIFICADA },
    });
    return verificadas.reduce((total, r) => total + Number(r.horas), 0);
  }
}
