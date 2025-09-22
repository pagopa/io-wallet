import * as z from "zod";

const Config = z.object({
  cosmosAccountConnectionString: z.string(),
  cosmosContainerName: z.string(),
  cosmosDatabaseName: z.string(),
});

export type Config = z.infer<typeof Config>;

const readFromEnvironment: (
  variableName: string,
  env: NodeJS.ProcessEnv,
) => string = (variableName, env) => {
  const envVar = env[variableName];
  if (envVar === undefined) {
    throw new Error(`Missing env var ${variableName}`);
  }
  return envVar;
};

export const getConfig = (env: NodeJS.ProcessEnv): Config => ({
  cosmosAccountConnectionString: readFromEnvironment(
    "CosmosAccountConnectionString",
    env,
  ),
  cosmosContainerName: readFromEnvironment("CosmosContainerName", env),
  cosmosDatabaseName: readFromEnvironment("CosmosDatabaseName", env),
});
