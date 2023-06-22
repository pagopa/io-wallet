import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { InfoHandler } from "../../http/handlers/info";

export const InfoFunction = httpAzureFunction(InfoHandler);
