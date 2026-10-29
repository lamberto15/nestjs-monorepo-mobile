/** One field's error in a `validation_failed` problem. */
export interface FieldError {
  path: string;
  message: string;
}

/**
 * An RFC 9457 problem details answer, as every error of the API is
 * (`application/problem+json`, docs/api-conventions.md). `code` is stable:
 * branch on it, not on `detail` (in the request's language).
 */
export interface Problem {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string;
  errors?: FieldError[];
  instance?: string;
  requestId?: string;
  /** Fields some problems add, such as `etag` on a 412. */
  [extra: string]: unknown;
}

/**
 * What the client throws for an answer that isn't 2xx (or 304): the problem's
 * fields, flattened. `problem` keeps the whole body, extra fields included.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  /** Stable and machine-readable: `validation_failed`, `not_found`, `conflict`… `http_<status>` when the body had none. */
  readonly code: string;
  readonly detail: string;
  readonly errors?: FieldError[];
  readonly requestId?: string;
  readonly problem: Problem;

  constructor(problem: Problem) {
    const detail = problem.detail ?? problem.title ?? `HTTP ${problem.status}`;
    super(detail);
    this.problem = problem;
    this.status = problem.status;
    this.code = problem.code ?? `http_${problem.status}`;
    this.detail = detail;
    this.errors = problem.errors;
    this.requestId = problem.requestId;
  }

  /** The problem of a response; a body that isn't one (a proxy's HTML page) still makes an ApiError. */
  static async fromResponse(response: Response): Promise<ApiError> {
    return new ApiError(
      parseProblem(
        response.status,
        await response.text().catch(() => ''),
        response.headers.get('x-request-id') ?? undefined,
      ),
    );
  }
}

/** Reads a problem from a body's text; anything else becomes a bare problem with the status. */
export function parseProblem(
  status: number,
  text: string,
  requestId?: string,
): Problem {
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  const problem: Problem =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), status }
      : { status, ...(text && { detail: text.slice(0, 500) }) };
  if (Array.isArray(problem.errors)) {
    problem.errors = problem.errors.filter(
      (error): error is FieldError =>
        !!error &&
        typeof error === 'object' &&
        typeof (error as FieldError).path === 'string' &&
        typeof (error as FieldError).message === 'string',
    );
  } else {
    delete problem.errors;
  }
  if (typeof problem.requestId !== 'string' && requestId) {
    problem.requestId = requestId;
  }
  return problem;
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;
