import { ServiceUnavailableError } from "io-wallet-common/error";

type CosmosLikeError = Error & {
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

const hasCosmosStatusCode = (statusCode: number) => (error: unknown) =>
  isCosmosLikeError(error) && error.statusCode === statusCode;

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

    return new Error(
      `${genericMessage}: ${error instanceof Error ? error.message : String(error)}`,
    );
  };

export const toCosmosErrorOrInvalidResource =
  (genericMessage: string) =>
  (error: unknown): Error =>
    error instanceof InvalidCosmosResourceError
      ? error
      : toCosmosError(genericMessage)(error);
