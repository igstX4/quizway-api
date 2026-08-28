import {
  Catch,
  Logger,
  type ArgumentsHost,
  type RpcExceptionFilter,
} from "@nestjs/common";
import { throwError, type Observable } from "rxjs";

/** gRPC status codes used by the mapper below. */
const GRPC = {
  INVALID_ARGUMENT: 3,
  DEADLINE_EXCEEDED: 4,
  NOT_FOUND: 5,
  ALREADY_EXISTS: 6,
  PERMISSION_DENIED: 7,
  RESOURCE_EXHAUSTED: 8,
  FAILED_PRECONDITION: 9,
  UNIMPLEMENTED: 12,
  UNAVAILABLE: 14,
  UNAUTHENTICATED: 16,
  UNKNOWN: 2,
} as const;

/** HTTP status → gRPC status, for exceptions raised by guards and pipes. */
const HTTP_TO_GRPC: Record<number, number> = {
  400: GRPC.INVALID_ARGUMENT,
  401: GRPC.UNAUTHENTICATED,
  403: GRPC.PERMISSION_DENIED,
  404: GRPC.NOT_FOUND,
  409: GRPC.ALREADY_EXISTS,
  412: GRPC.FAILED_PRECONDITION,
  429: GRPC.RESOURCE_EXHAUSTED,
  501: GRPC.UNIMPLEMENTED,
  503: GRPC.UNAVAILABLE,
  504: GRPC.DEADLINE_EXCEEDED,
};

/**
 * Transport-level error handling for gRPC microservices.
 *
 * Nest's built-in gRPC filter only understands `RpcException`: anything else —
 * including the `HttpException`s that guards, pipes and services raise — is
 * turned into `UNKNOWN: Internal server error` **without a log line**. That
 * hides both validation failures and unexpected errors.
 *
 * This filter keeps the same promise (`Observable<never>`) but:
 *   1. maps HTTP status codes onto meaningful gRPC status codes, so the gateway
 *      can translate them back into 400/401/404/409 responses, and
 *   2. logs the cause before it leaves the process.
 */
@Catch()
export class GrpcExceptionFilter implements RpcExceptionFilter<unknown> {
  private readonly logger = new Logger("GrpcException");

  catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
    if (isRpcException(exception)) {
      const error = exception.getError();
      this.logger.warn(`RPC rejected: ${format(error)}`);
      return throwError(() => error);
    }

    if (isHttpException(exception)) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      this.logger.warn(`RPC rejected (${status}): ${format(response)}`);

      return throwError(() => ({
        code: HTTP_TO_GRPC[status] ?? GRPC.UNKNOWN,
        message: extractMessage(response) ?? exception.message,
      }));
    }

    this.logger.error(
      `Unhandled RPC exception: ${format(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return throwError(() => ({
      code: GRPC.UNKNOWN,
      message: "Internal server error",
    }));
  }
}

interface RpcExceptionLike {
  getError(): unknown;
}

function isRpcException(value: unknown): value is RpcExceptionLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RpcExceptionLike).getError === "function"
  );
}

interface HttpExceptionLike {
  message: string;
  getStatus(): number;
  getResponse(): unknown;
}

function isHttpException(value: unknown): value is HttpExceptionLike {
  return (
    isRpcException(value) === false &&
    typeof value === "object" &&
    value !== null &&
    typeof (value as HttpExceptionLike).getStatus === "function" &&
    typeof (value as HttpExceptionLike).getResponse === "function"
  );
}

/** Pulls a human-readable message out of an `HttpException` body. */
function extractMessage(body: unknown): string | undefined {
  if (typeof body === "string") return body;

  if (typeof body === "object" && body !== null && "message" in body) {
    const { message } = body as { message: unknown };

    if (typeof message === "string") return message;
    // ValidationPipe returns one message per invalid field.
    if (Array.isArray(message)) return message.join("; ");
  }

  return undefined;
}

function format(value: unknown): string {
  if (value instanceof Error) return value.message;

  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}
