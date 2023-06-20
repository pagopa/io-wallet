import { HelloWorldFunction } from "../infra/azure/functions/hello-world";

export const HelloWorld = HelloWorldFunction({ myName: "world" });
