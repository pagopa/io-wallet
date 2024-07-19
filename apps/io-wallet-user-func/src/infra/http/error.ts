import * as H from "@pagopa/handler-kit";
import { errorRTE } from "@pagopa/logger";
import * as RTE from "fp-ts/ReaderTaskEither";
import { flow } from "fp-ts/function";

export class HttpUnauthorizedError extends H.HttpError {
  status = 401 as const;
  title = "Unauthorized";
}

// Encode domain errors to http errors
const toHttpError = (e: Error): Error => {
  if (e.name === "HttpError") {
    return e;
  }
  switch (e.name) {
    case "EntityNotFoundError":
      return new H.HttpNotFoundError(e.message);
    case "HealthCheckError":
      return new H.HttpError(e.message);
    case "WalletInstanceRevoked":
      return new H.HttpForbiddenError(e.message);
    case "UnauthorizedError":
      return new HttpUnauthorizedError(e.message);
    case "ForbiddenError":
      return new H.HttpForbiddenError(e.message);
    case "CredentialsNotFound":
      return new H.HttpNotFoundError(e.message);
  }
  return e;
};

const isValidationError = (e: Error): e is H.ValidationError =>
  e.name === "ValidationError";

const isHttpError = (e: Error): e is H.HttpError => e.name === "HttpError";

const toProblemJson = (e: Error): H.ProblemJson => {
  if (isValidationError(e)) {
    return {
      detail: "Your request didn't validate",
      status: 422,
      title: "Validation Error",
      type: "/problem/validation-error",
      violations: e.violations,
    };
  }

  if (isHttpError(e)) {
    return {
      detail: e.message,
      status: e.status,
      title: e.title,
    };
  }
  return {
    detail: e.name,
    status: 500,
    title: "Internal Server Error",
  };
};

const toErrorResponse = flow(toHttpError, toProblemJson, H.problemJson);

export const logErrorAndReturnResponse = flow(
  RTE.right<object, Error, Error>,
  RTE.chainFirst((error) =>
    errorRTE("returning with an error response", { error }),
  ),
  RTE.map(toErrorResponse),
);
