import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { WalletInstanceAttestationV2Dependencies } from "@/infra/http/handlers/create-wallet-instance-attestation-v2";
import { CreateWalletInstanceAttestationV2Handler } from "@/infra/http/handlers/create-wallet-instance-attestation-v2";

export const CreateWalletInstanceAttestationV2Function = (
  dependencies: WalletInstanceAttestationV2Dependencies,
) => {
  const handler = CreateWalletInstanceAttestationV2Handler(dependencies);

  return async (
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      // Match handler-kit-azure-func: malformed or absent JSON reaches body validation.
      body = undefined;
    }

    const response = await handler(body, (error) => {
      context.error("returning with an error response", { error });
    });

    return {
      headers: response.headers,
      jsonBody: response.body,
      status: response.statusCode,
    };
  };
};
