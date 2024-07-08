export class EntityNotFoundError extends Error {
  name = "EntityNotFoundError";
}

export class UnauthorizedError extends Error {
  name = "UnauthorizedError";
  constructor() {
    super("You are not authorized to perform this operation");
  }
}

export class ForbiddenError extends Error {
  name = "ForbiddenError";
  constructor() {
    super("Access to this resource is forbidden");
  }
}

export class HealthCheckError extends Error {
  name = "HealthCheckError";
  constructor(cause?: string) {
    super(`The function is not healthy. ${cause}`);
  }
}
