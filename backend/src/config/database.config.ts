import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: configService.get('DATABASE_HOST', 'localhost'),
    port: configService.get('DATABASE_PORT', 5432),
    username: configService.get('DATABASE_USER', 'wathsaas'),
    password: configService.get('DATABASE_PASSWORD', 'wathsaas_secret_2024'),
    database: configService.get('DATABASE_NAME', 'wathsaas'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false, // Use migrations in production
    logging: configService.get('NODE_ENV') === 'development',
};

export default new DataSource(dataSourceOptions);
