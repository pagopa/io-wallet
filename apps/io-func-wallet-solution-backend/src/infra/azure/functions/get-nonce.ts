import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";
import { GetNonceHandler } from "../../http/handlers/get-nonce";

export const GetNonceFunction = httpAzureFunction(GetNonceHandler);
