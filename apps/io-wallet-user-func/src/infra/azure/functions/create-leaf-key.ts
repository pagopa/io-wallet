import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateLeafKeyHandler } from "@/infra/http/handlers/create-leaf-key";

export const CreateLeafKeyFunction = httpAzureFunction(CreateLeafKeyHandler);
