import { z } from 'zod';

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const getEnv = (): Readonly<ReturnType<typeof validateEnv>> => {
    return Object.freeze(validateEnv(process.env));
};

export const envSchema = z.object({
    ENV: z.enum(['dev', 'prod']).default('dev'),
    SERVICE_NAME: z.string().min(1),
    PORT: z.string().regex(/^\d+$/).transform(Number),
    METRICS_PREFIX: z.string().min(1).default('app_').transform(val => val.replace(/-/g, '_')),
});

export const validateEnv = (env: NodeJS.ProcessEnv) => {
    return envSchema.parse(env);
};
