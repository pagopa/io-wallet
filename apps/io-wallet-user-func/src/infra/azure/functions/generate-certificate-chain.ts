import { GenerateCertificateChainHandler } from "@/infra/http/handlers/generate-certificate-chain";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const GenerateCertificateChainFunction = httpAzureFunction(
  GenerateCertificateChainHandler,
);
