type CosmosLikeError = Error & {
  code?: number | string;
  statusCode?: number;
};

const isCosmosLikeError = (error: unknown): error is CosmosLikeError =>
  error instanceof Error;

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

export class CosmosNotFoundError extends Error {
  name = "CosmosNotFoundError";
}

export const toCosmosError =
  (genericMessage: string) =>
  (error: unknown): Error => {
    if (hasCosmosStatusCode(404)(error)) {
      return new CosmosNotFoundError(genericMessage);
    }

    return new Error(`${genericMessage}: ${toErrorDetails(error)}`);
  };
