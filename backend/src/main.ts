import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get("CORS_ORIGIN") ?? "http://localhost:3000",
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix("api");

  const swaggerConfig = new DocumentBuilder()
    .setTitle("NexusRM API")
    .setDescription("REST API for NexusRM CRM, AI insights and public integrations.")
    .setVersion("1.0")
    .addBearerAuth()
    .addApiKey({ type: "apiKey", name: "x-api-key", in: "header" }, "public-api-key")
    .build();

  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(config.get("BACKEND_PORT") ?? 4000);
}

bootstrap();
