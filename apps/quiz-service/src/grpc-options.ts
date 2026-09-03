import { GRPC_LOADER_OPTIONS, GRPC_PACKAGES, getProtoPath } from "@quizway/contracts";
import { Transport, type GrpcOptions } from "@nestjs/microservices";

/** Server options used when bootstrapping the quiz microservice. */
export function quizServerOptions(port: number): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${port}`,
      package: GRPC_PACKAGES.quiz,
      protoPath: getProtoPath("quiz"),
      loader: { ...GRPC_LOADER_OPTIONS },
    },
  };
}

