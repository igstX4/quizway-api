import { GRPC_LOADER_OPTIONS, GRPC_PACKAGES, getProtoPath } from "@quizway/contracts";
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { env } from "../config/env";

/** Injection tokens for the two downstream gRPC services. */
export const AUTH_GRPC_CLIENT = "AUTH_GRPC_CLIENT";
export const QUIZ_GRPC_CLIENT = "QUIZ_GRPC_CLIENT";

/**
 * Registers one gRPC client per downstream service.
 *
 * The gateway is the only process that knows the service topology, so wiring
 * lives here and nothing else in the codebase depends on host:port values.
 */
@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_GRPC_CLIENT,
        transport: Transport.GRPC,
        options: {
          url: env.AUTH_SERVICE_GRPC_URL,
          package: GRPC_PACKAGES.auth,
          protoPath: getProtoPath("auth"),
          loader: { ...GRPC_LOADER_OPTIONS },
        },
      },
      {
        name: QUIZ_GRPC_CLIENT,
        transport: Transport.GRPC,
        options: {
          url: env.QUIZ_SERVICE_GRPC_URL,
          package: GRPC_PACKAGES.quiz,
          protoPath: getProtoPath("quiz"),
          loader: { ...GRPC_LOADER_OPTIONS },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcClientsModule {}
