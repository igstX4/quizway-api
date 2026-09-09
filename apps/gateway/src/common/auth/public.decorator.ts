import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a route as reachable without a bearer token.
 *
 * Used by the participant-facing endpoints: taking a public quiz must not
 * require an account.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
