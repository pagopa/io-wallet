import { createLogger, format, transports } from "winston";

import { getArgvParam } from "./get-argv-param";

export const outputDir = getArgvParam("--outputDir") ?? "logs";

export const logger = createLogger({
  level: "info",
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.printf(
          ({ level, message, stack, timestamp }) =>
            `${timestamp} [${level}]: ${message} ${stack || ""}`,
        ),
      ),
    }),
    new transports.File({
      filename: outputDir + "/app.log",
      format: format.combine(
        format.timestamp(),
        format.printf(
          ({ level, message, timestamp }) =>
            `${timestamp} [${level}]: ${message}`,
        ),
      ),
      level: "info",
    }),
  ],
});
