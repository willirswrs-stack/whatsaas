import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
    // Server
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3333),

    // Database (PostgreSQL)
    DATABASE_HOST: Joi.string().required(),
    DATABASE_PORT: Joi.number().default(5432),
    DATABASE_USER: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    DATABASE_NAME: Joi.string().required(),

    // Redis (Queue & Cache)
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').optional(),

    // Auth
    JWT_SECRET: Joi.string().required().min(10),
    JWT_EXPIRATION: Joi.string().default('7h'),

    // Evolution API (WhatsApp Provider)
    EVOLUTION_API_URL: Joi.string().uri().required(),
    EVOLUTION_API_KEY: Joi.string().required(),

    // Webhook Configuration (External access for Evolution callbacks)
    WEBHOOK_URL: Joi.string().uri().required().description('Public URL for this backend to receive webhooks'),

    // CORS
    CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
});
