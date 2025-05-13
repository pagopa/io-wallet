import { createLogger, transports, format } from 'winston';
import { getArgvParam } from './get-argv-param';

const outputDir = getArgvParam('--outputDir') ?? 'logs';

export const logger = createLogger({
  level: 'info',
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss', // Timestamp format
        }),
        format.printf(
          ({ timestamp, level, message, stack }) =>
            `${timestamp} [${level}]: ${message} ${stack || ''}`,
        ),
      ),
    }),
    new transports.File({
      filename: outputDir + '/app.log',
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        }),
      ),
    }),
  ],
});

export const fileLogger = createLogger({
  level: 'info',
  transports: [
    new transports.File({
      filename: outputDir + '/app.log',
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        }),
      ),
    }),
  ],
});
