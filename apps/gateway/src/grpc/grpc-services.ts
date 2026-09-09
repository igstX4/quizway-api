import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  AUTH_SERVICE_NAME,
  QUIZ_SERVICE_NAME,
  type AuthServiceClient,
  type QuizServiceClient,
} from "@quizway/contracts";
import { lastValueFrom, type Observable } from "rxjs";
import { AUTH_GRPC_CLIENT, QUIZ_GRPC_CLIENT } from "./grpc-clients.module";

/**
 * Adapts a Nest gRPC service proxy so every method returns a Promise.
 *
 * `ClientGrpc.getService()` hands back methods that emit an **Observable**.
 * The contracts in `@quizway/contracts` describe promise-based methods, so the
 * conversion happens here once: controllers, guards and services can simply
 * `await` a call instead of remembering `lastValueFrom` at every site (and
 * silently receiving an Observable when they forget).
 */
function promisifyService<T extends object>(service: T): T {
  return new Proxy(service, {
    get(target, property): unknown {
      const value = Reflect.get(target, property, target) as unknown;

      if (typeof value !== "function") return value;

      return (...args: unknown[]) =>
        lastValueFrom(
          (value as (...innerArgs: unknown[]) => Observable<unknown>).apply(target, args),
        );
    },
  }) as T;
}

/**
 * Typed facade over the auth service.
 *
 * `getService` only works after the client has initialised, hence the
 * `onModuleInit` resolution instead of a constructor assignment.
 */
@Injectable()
export class AuthGrpcService implements OnModuleInit {
  private client!: AuthServiceClient;

  constructor(@Inject(AUTH_GRPC_CLIENT) private readonly grpc: ClientGrpc) {}

  onModuleInit(): void {
    this.client = promisifyService(
      this.grpc.getService<AuthServiceClient>(AUTH_SERVICE_NAME),
    );
  }

  get service(): AuthServiceClient {
    return this.client;
  }
}

/** Typed facade over the quiz service. */
@Injectable()
export class QuizGrpcService implements OnModuleInit {
  private client!: QuizServiceClient;

  constructor(@Inject(QUIZ_GRPC_CLIENT) private readonly grpc: ClientGrpc) {}

  onModuleInit(): void {
    this.client = promisifyService(
      this.grpc.getService<QuizServiceClient>(QUIZ_SERVICE_NAME),
    );
  }

  get service(): QuizServiceClient {
    return this.client;
  }
}
