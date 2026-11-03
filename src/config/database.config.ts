import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

// ADR-002: PostgreSQL en infraestructura institucional. La conexion se
// parametriza por variables de entorno (.env) en vez de quedar fija en el
// codigo, para que cada ambiente (dev/TI institucional) use sus propias
// credenciales sin tocar este archivo.
export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USER', 'postgres'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.get<string>('DB_NAME', 'practicas_empresariales'),
    autoLoadEntities: true,
    // En institucional: false + migraciones. true solo es comodo en dev local.
    synchronize: config.get<string>('NODE_ENV', 'development') !== 'production',
  }),
};
