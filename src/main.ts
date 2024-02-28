import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import 'reflect-metadata';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const appOptions = { cors: true };
  const app = await NestFactory.create(AppModule, appOptions);
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  const options = new DocumentBuilder()
    .setTitle('Devoteam Parking Helper Application')
    .setDescription('API/Backend of the devoteam parking helper application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/api/docs', app, document);

  await app.listen(8080);
}

bootstrap().catch((err) => {
  console.log(err);
});
