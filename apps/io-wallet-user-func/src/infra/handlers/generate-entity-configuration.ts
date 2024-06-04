import * as H from "@pagopa/handler-kit";
import { getEntityConfiguration } from "@/entity-configuration";

export const GenerateEntityConfigurationHandler = H.of(
  () => getEntityConfiguration
);
