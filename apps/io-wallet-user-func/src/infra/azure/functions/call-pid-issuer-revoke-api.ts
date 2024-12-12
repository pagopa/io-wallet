import { CallPidIssuerRevokeApiHandler } from "@/infra/handlers/call-pid-issuer-revoke-api";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const CallPidIssuerRevokeApiFunction = azureFunction(
  CallPidIssuerRevokeApiHandler,
);
