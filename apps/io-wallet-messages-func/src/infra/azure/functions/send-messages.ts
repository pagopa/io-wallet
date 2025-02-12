import { SendMessagesHandler } from "@/infra/handlers/send-messages";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const SendMessagesFunction = azureFunction(SendMessagesHandler);
