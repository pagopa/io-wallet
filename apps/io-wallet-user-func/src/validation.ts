import * as E from "fp-ts/lib/Either";
import { flow } from "fp-ts/lib/function";
import * as t from "io-ts";
import { failure } from "io-ts/PathReporter";

export class ValidationError extends Error {
  static defaultMessage = "Your request parameters didn't validate";
  name = "ValidationError";
  title = "Validation Error";
  violations: string[];
  constructor(violations: string[], message = ValidationError.defaultMessage) {
    super(message);
    this.violations = violations;
  }
}

export const validate = <T>(
  schema: t.Decoder<unknown, T>,
  message = ValidationError.defaultMessage,
) =>
  flow(
    schema.decode,
    E.mapLeft((errors) => new ValidationError(failure(errors), message)),
  );
