import winston from 'winston';
import { env } from '../config/env';

export const logger = winston.createLogger({
  level: env.isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    env.isDev
      ? winston.format.combine(winston.format.colorize(), winston.format.simple())
      : winston.format.json()
  ),
  defaultMeta: { service: 'lego-deal-finder' },
  transports: [new winston.transports.Console()],
});
