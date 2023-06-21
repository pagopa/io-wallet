import { GetEntityConfigurationFunction } from "../infra/azure/functions/get-entity-configuration";
import { InfoFunction } from "../infra/azure/functions/info";

export const Info = InfoFunction({});

export const GetEntityConfiguration = GetEntityConfigurationFunction({
  publicKey: "",
});
