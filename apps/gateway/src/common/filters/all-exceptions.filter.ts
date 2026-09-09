import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type { Request, Response } from "express";

/** gRPC status codes → HTTP status codes. */
const GRPC_TO_HTTP: Record<number, number> = {
  1: 499, // CANCELLED
  3: 400, // INVALID_ARGUMENT
  4: 504, // DEADLINE_EXCEEDED
  5: 404, // NOT_FOUND
  6: 409, // ALREADY_EXISTS
  7: 403, // PERMISSION_DENIED
  8: 429, // RESOURCE_EXHAUSTED
  9: 400, // FAILED_PRECONDITION
  12: 501, // UNIMPLEMENTED
  13: 500, // INTERNAL
  14: 503, // UNAVAILABLE
  16: 401, // UNAUTHENTICATED
};

interface GrpcStatusError {
  code: number;
  details?: string;
  message?: string;
}

/**
 * Single error shape for the whole HTTP surface.
 *
 * Downstream failures arrive in two flavours: Nest wraps some of them in
 * `RpcException`, while grpc-js delivers its own `ServiceError` (an `Error`
 * with numeric `code`/`details`). Both are translated here, so controllers stay
 * free of mapping code and an upstream 401 never leaks as a 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const { status, message } = this.describe(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private describe(exception: unknown): { status: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      const message =
        typeof body === "string"
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);

      return { status: exception.getStatus(), message };
    }

    const grpc = toGrpcStatus(exception);

    if (grpc) {
      const status = GRPC_TO_HTTP[grpc.code] ?? 500;

      return {
        status,
        // Never forward INTERNAL/UNKNOWN details to the caller.
        message:
          status >= 500
            ? "Upstream service error"
            : (grpc.details ?? grpc.message ?? "Request failed"),
      };
    }

    return { status: 500, message: "Internal server error" };
  }
}

/** Normalises `RpcException` and grpc-js `ServiceError` into one shape. */
function toGrpcStatus(exception: unknown): GrpcStatusError | null {
  if (exception instanceof RpcException) {
    const error = exception.getError();

    if (typeof error === "object" && error !== null) {
      const candidate = error as Partial<GrpcStatusError>;
      return {
        code: typeof candidate.code === "number" ? candidate.code : 13,
        details: candidate.details ?? candidate.message,
        message: candidate.message,
      };
    }

    return { code: 13, details: String(error) };
  }

  if (
    typeof exception === "object" &&
    exception !== null &&
    typeof (exception as GrpcStatusError).code === "number"
  ) {
    const candidate = exception as GrpcStatusError;

    return {
      code: candidate.code,
      details: candidate.details,
      message: candidate.message,
    };
  }

  return null;
}
