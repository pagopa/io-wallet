export class EntityNotFoundError extends Error {
  name = "EntityNotFoundError";
}

export class UnauthorizedError extends Error {
  name = "UnauthorizedError";
  constructor() {
    super("You are not authorized to perform this operation");
  }
}

export class HealthCheckError extends Error {
  name = "HealthCheckError";
  constructor(cause?: string) {
    super(`The function is not healthy. ${cause}`);
  }
}
