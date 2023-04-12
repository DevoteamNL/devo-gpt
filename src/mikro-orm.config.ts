import { LoadStrategy } from '@mikro-orm/core';
import { defineConfig } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { Migrator } from '@mikro-orm/migrations';
import { EntityGenerator } from '@mikro-orm/entity-generator';
import { SeedManager } from '@mikro-orm/seeder';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();
export default defineConfig({
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  user: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  dbName: 'parkingdb',
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  debug: true,
  loadStrategy: LoadStrategy.JOINED,
  highlighter: new SqlHighlighter(),
  metadataProvider: TsMorphMetadataProvider,
  // @ts-expect-error nestjs adapter option
  registerRequestContext: false,
  extensions: [Migrator, EntityGenerator, SeedManager],
  schemaGenerator: {
    disableForeignKeys: true, // wrap statements with `set foreign_key_checks = 0` or equivalent
    createForeignKeyConstraints: true, // whether to generate FK constraints
    ignoreSchema: [], // allows ignoring some schemas when diffing
  },
});
