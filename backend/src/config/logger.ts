import pino from 'pino';
import { env } from './env';

const isDev = env.nodeEnv === 'development';

export const logger = pino({
  level: env.logLevel,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

export default logger;