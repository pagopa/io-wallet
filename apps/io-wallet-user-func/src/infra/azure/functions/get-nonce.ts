import { GetNonceHandler } from "@/infra/http/handlers/get-nonce";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const GetNonceFunction = httpAzureFunction(GetNonceHandler);
