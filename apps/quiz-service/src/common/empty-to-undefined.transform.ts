import { Transform } from "class-transformer";

/**
 * Treats empty strings as "not provided".
 *
 * The proto loader runs with `defaults: true`, so a scalar field the caller did
 * not send arrives as `""` instead of `undefined` — and `@IsOptional()` only
 * skips `undefined`/`null`. This transform bridges the two, which keeps DTOs
 * readable: `@IsOptional() @EmptyToUndefined() @IsUUID()`.
 */
export const EmptyToUndefined = (): PropertyDecorator =>
  Transform(({ value }) => (value === "" ? undefined : value));
