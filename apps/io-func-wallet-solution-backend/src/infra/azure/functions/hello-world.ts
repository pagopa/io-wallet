import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { HelloWorldHandler } from "../../http/handlers/hello-world";

export const HelloWorldFunction = httpAzureFunction(HelloWorldHandler);
