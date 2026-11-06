export class ConflictError extends Error {
  constructor(message = "The workbook was modified by another process. Please refresh and retry.") {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Record not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class WorkbookConflictError extends Error {
  constructor(message = "The workbook was modified by another process. Please refresh and retry.") {
    super(message);
    this.name = "WorkbookConflictError";
  }
}