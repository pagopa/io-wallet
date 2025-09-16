import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { SendMessagesHandler } from "@/infra/handlers/send-messages";

export const SendMessagesFunction = azureFunction(SendMessagesHandler);
