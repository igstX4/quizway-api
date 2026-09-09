import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/auth/public.decorator";

@ApiTags("health")
@Controller("health")
export class HealthController {
  /**
   * Liveness probe for Docker/Kubernetes.
   *
   * Intentionally does not touch the downstream services: it answers "is this
   * process alive", while deep dependency checks belong to monitoring.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness probe" })
  check(): { status: string; service: string; timestamp: string } {
    return {
      status: "ok",
      service: "quizway-gateway",
      timestamp: new Date().toISOString(),
    };
  }
}
