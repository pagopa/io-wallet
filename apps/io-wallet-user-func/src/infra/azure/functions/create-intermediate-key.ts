import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateIntermediateKeyHandler } from "@/infra/http/handlers/create-intermediate-key";

export const CreateIntermediateKeyFunction = httpAzureFunction(
  CreateIntermediateKeyHandler,
);
