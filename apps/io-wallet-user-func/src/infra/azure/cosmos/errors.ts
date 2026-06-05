import { ServiceUnavailableError } from "io-wallet-common/error";

type CosmosLikeError = Error & {
  code?: number | string;
  statusCode?: number;
};

const isCosmosLikeError = (error: unknown): error is CosmosLikeError =>
  error instanceof Error;

export class CosmosNotFoundError extends Error {
  name = "CosmosNotFoundError";
}

export class CosmosPreconditionFailedError extends Error {
  name = "CosmosPreconditionFailedError";
}

export class InvalidCosmosResourceError extends Error {
  name = "InvalidCosmosResourceError";
}

const getCosmosStatusCode = (error: unknown): number | undefined => {
  if (!isCosmosLikeError(error)) {
    return undefined;
  }

  if (typeof error.statusCode === "number") {
    return error.statusCode;
  }

  if (typeof error.code === "number") {
    return error.code;
  }

  if (typeof error.code === "string") {
    const parsedStatusCode = Number(error.code);

    return Number.isFinite(parsedStatusCode) ? parsedStatusCode : undefined;
  }

  return undefined;
};

const hasCosmosStatusCode = (statusCode: number) => (error: unknown) =>
  getCosmosStatusCode(error) === statusCode;

const toErrorDetails = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message && error.message !== "[object Object]") {
      return error.message;
    }

    const cosmosError = isCosmosLikeError(error) ? error : undefined;
    const serializedError = JSON.stringify({
      code: cosmosError?.code,
      name: error.name,
      statusCode: cosmosError?.statusCode,
    });

    return serializedError && serializedError !== "{}"
      ? serializedError
      : error.toString();
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const toCosmosError =
  (genericMessage: string) =>
  (error: unknown): Error => {
    if (error instanceof Error && error.name === "TimeoutError") {
      return new ServiceUnavailableError(
        `The request to the database has timed out: ${error.message}`,
      );
    }

    if (hasCosmosStatusCode(404)(error)) {
      return new CosmosNotFoundError(genericMessage);
    }

    if (hasCosmosStatusCode(412)(error)) {
      return new CosmosPreconditionFailedError(genericMessage);
    }

    return new Error(`${genericMessage}: ${toErrorDetails(error)}`);
  };

export const toCosmosErrorOrInvalidResource =
  (genericMessage: string) =>
  (error: unknown): Error =>
    error instanceof InvalidCosmosResourceError
      ? error
      : toCosmosError(genericMessage)(error);
