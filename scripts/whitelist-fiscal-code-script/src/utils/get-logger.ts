import { createLogger, transports, format } from 'winston';
import { getArgvParam } from './get-argv-param';
import fs from 'fs';

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

fs.truncateSync(outputDir + '/whitelisted-fiscal-codes.csv', 0);

export const whitelistedFiscalCodeFileLogger = createLogger({
  level: 'info',
  transports: [
    new transports.File({
      filename: outputDir + '/whitelisted-fiscal-codes.csv',
      level: 'info',
      format: format.printf(({ message }) => String(message)),
    }),
  ],
});

fs.truncateSync(outputDir + '/not-whitelisted-fiscal-codes.csv', 0);

export const notWhitelistedFiscalCodeFileLogger = createLogger({
  level: 'info',
  transports: [
    new transports.File({
      filename: outputDir + '/not-whitelisted-fiscal-codes.csv',
      level: 'info',
      format: format.printf(({ message }) => String(message)),
    }),
  ],
});
