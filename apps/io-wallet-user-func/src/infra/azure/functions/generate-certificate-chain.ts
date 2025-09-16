import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { GenerateCertificateChainHandler } from "@/infra/http/handlers/generate-certificate-chain";

export const GenerateCertificateChainFunction = httpAzureFunction(
  GenerateCertificateChainHandler,
);
