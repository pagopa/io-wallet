import { getEntityConfiguration } from "@/entity-configuration";
import * as H from "@pagopa/handler-kit";

export const GenerateEntityConfigurationHandler = H.of(
  () => getEntityConfiguration,
);
