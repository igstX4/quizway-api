import { GRPC_LOADER_OPTIONS, GRPC_PACKAGES, getProtoPath } from "@quizway/contracts";
import { Transport, type GrpcOptions } from "@nestjs/microservices";

/** Server options for `AuthService`, derived from the shared proto. */
export function authGrpcOptions(port: number): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${port}`,
      package: GRPC_PACKAGES.auth,
      protoPath: getProtoPath("auth"),
      loader: { ...GRPC_LOADER_OPTIONS },
    },
  };
}

