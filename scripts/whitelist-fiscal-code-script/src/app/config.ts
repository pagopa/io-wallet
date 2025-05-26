import * as dotenv from 'dotenv';
import * as Joi from 'joi';

import { getArgvParam } from '../get-argv-param';
import { logger } from '../get-logger';

dotenv.config();

const ArgumentsSchema = Joi.object({
  input: Joi.string().optional().default('fiscalcodes.csv').messages({
    'string.base': 'input must be a string',
    'string.empty': 'input is not allowed to be empty',
  }),
  outputDir: Joi.string().optional().default('logs/').messages({
    'string.base': 'outputDir must be a string',
    'string.empty': 'outputDir is not allowed to be empty',
  }),
});

const EnvSchema = Joi.object({
  DATABASE_CONNECTION_STRING: Joi.string().required().messages({
    'any.required': 'DATABASE_CONNECTION_STRING is required',
    'string.base': 'DATABASE_CONNECTION_STRING must be a string',
    'string.empty': 'DATABASE_CONNECTION_STRING is not allowed to be empty',
  }),
  DATABASE_CONTAINER_NAME: Joi.string().required().messages({
    'any.required': 'DATABASE_CONTAINER_NAME is required',
    'string.base': 'DATABASE_CONTAINER_NAME must be a string',
    'string.empty': 'DATABASE_CONTAINER_NAME is not allowed to be empty',
  }),
  DATABASE_NAME: Joi.string().required().messages({
    'any.required': 'DATABASE_NAME is required',
    'string.base': 'DATABASE_NAME must be a string',
    'string.empty': 'DATABASE_NAME is not allowed to be empty',
  }),
  REQUEST_TIMEOUT_MS: Joi.number()
    .min(0)
    .max(1_000_000)
    .optional()
    .default(10_000)
    .messages({
      'number.base': 'REQUEST_TIMEOUT_MS must be a number',
      'number.max': 'REQUEST_TIMEOUT_MS must be maximum 1_000_000',
      'number.min': 'REQUEST_TIMEOUT_MS must be at least 0',
    }),
  SLEEP_TIME_BETWEEN_REQUESTS_MS: Joi.number()
    .min(0)
    .max(1_000_000)
    .optional()
    .default(500)
    .messages({
      'number.base': 'SLEEP_TIME_BETWEEN_REQUESTS_MS must be a number',
      'number.max': 'SLEEP_TIME_BETWEEN_REQUESTS_MS must be maximum 1_000_000',
      'number.min': 'SLEEP_TIME_BETWEEN_REQUESTS_MS must be at least 0',
    }),
});

const ConfigSchema = Joi.object({}).concat(EnvSchema).concat(ArgumentsSchema);

export const checkConfig = (): void => {
  try {
    const configs = {
      ...process.env,
      input: getArgvParam('--input'),
      outputDir: getArgvParam('--outputDir'),
    };

    const { error } = ConfigSchema.validate(configs, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error('config.ts: configuration validation failed');
    logger.error(
      JSON.stringify((error as Joi.ValidationError)?.details ?? {}, null, 2),
    );
    throw error;
  }
};
