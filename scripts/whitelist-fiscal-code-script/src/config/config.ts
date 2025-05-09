import * as dotenv from 'dotenv';
import * as Joi from 'joi';

dotenv.config();

const ConfigSchema = Joi.object({
  DATABASE_CONNECTION_STRING: Joi.string().required().messages({
    'string.base': 'DATABASE_CONNECTION_STRING must be a string',
    'string.empty': 'DATABASE_CONNECTION_STRING is not allowed to be empty',
    'any.required': 'DATABASE_CONNECTION_STRING is required',
  }),
  FISCAL_CODES_CSV_FILE_PATH: Joi.string().required().messages({
    'string.base': 'FISCAL_CODES_CSV_FILE_PATH must be a string',
    'string.empty': 'FISCAL_CODES_CSV_FILE_PATH is not allowed to be empty',
    'any.required': 'FISCAL_CODES_CSV_FILE_PATH is required',
  }),
  SLEEP_TIME_BETWEEN_REQUESTS_MS: Joi.number()
    .min(0)
    .max(1_000_000)
    .optional()
    .default(500)
    .messages({
      'number.base': 'SLEEP_TIME_BETWEEN_REQUESTS_MS must be a number',
      'number.min': 'SLEEP_TIME_BETWEEN_REQUESTS_MS must be at least 0',
      'number.max': 'SLEEP_TIME_BETWEEN_REQUESTS_MS must be maximum 1_000_000',
    }),
  REQUEST_TIMEOUT_MS: Joi.number()
    .min(0)
    .max(1_000_000)
    .optional()
    .default(10_000)
    .messages({
      'number.base': 'REQUEST_TIMEOUT_MS must be a number',
      'number.min': 'REQUEST_TIMEOUT_MS must be at least 0',
      'number.max': 'REQUEST_TIMEOUT_MS must be maximum 1_000_000',
    }),
});

export const checkConfig = (): void => {
  try {
    const { error } = ConfigSchema.validate(process.env, {
      allowUnknown: true,
      abortEarly: false,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('config.ts: configuration validation failed');
    console.error(
      JSON.stringify((error as Joi.ValidationError)?.details ?? {}, null, 2),
    );
    throw error;
  }
};
