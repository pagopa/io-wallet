import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";
import {
  readFromEnvironment,
  stringToNumberDecoderRE,
} from "io-wallet-common/infra/env";

const MessagesServiceConfig = t.type({
  apiKey: t.string,
  baseURL: t.string,
  maxConcurrentRequests: t.number,
  minTimeConsecutiveRequests: t.number,
});

export type MessagesServiceConfig = t.TypeOf<typeof MessagesServiceConfig>;

const Config = t.type({
  azure: t.type({
    storage: t.type({
      connectionString: t.string,
      containers: t.type({
        input: t.type({ name: t.string }),
        output: t.type({ name: t.string }),
      }),
      queue: t.type({ name: t.string }),
    }),
  }),
  fiscalCodesBatchSize: t.number,
  messagesService: MessagesServiceConfig,
});

type Config = t.TypeOf<typeof Config>;

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  sequenceS(RE.Apply)({
    fiscalCodesBatchSize: pipe(
      readFromEnvironment("FiscalCodesBatchSize"),
      RE.chainW(stringToNumberDecoderRE),
    ),
    inputContainerName: readFromEnvironment("InputContainerName"),
    messagesServiceApiBaseURL: readFromEnvironment("MessagesServiceApiBaseURL"),
    messagesServiceApiKey: readFromEnvironment("MessagesServiceApiKey"),
    outputContainerName: readFromEnvironment("OutputContainerName"),
    queueName: readFromEnvironment("QueueName"),
    storageAccountConnectionString: readFromEnvironment(
      "StorageConnectionString",
    ),
    messagesServiceMaxConcurrentRequests: pipe(
      readFromEnvironment("MessagesServiceMaxConcurrentRequests"),
      RE.chainW(stringToNumberDecoderRE),
    ),
    messagesServiceMinTimeConsecutiveRequests: pipe(
      readFromEnvironment("MessagesServiceMinTimeConsecutiveRequests"),
      RE.chainW(stringToNumberDecoderRE),
    ),
  }),
  RE.map(
    ({
      fiscalCodesBatchSize,
      inputContainerName,
      messagesServiceApiBaseURL: baseURL,
      messagesServiceApiKey: apiKey,
      messagesServiceMaxConcurrentRequests: maxConcurrentRequests,
      messagesServiceMinTimeConsecutiveRequests: minTimeConsecutiveRequests,
      outputContainerName,
      queueName,
      storageAccountConnectionString: connectionString,
    }) => ({
      azure: {
        storage: {
          connectionString,
          containers: {
            input: {
              name: inputContainerName,
            },
            output: {
              name: outputContainerName,
            },
          },
          queue: { name: queueName },
        },
      },
      fiscalCodesBatchSize,
      messagesService: {
        apiKey,
        baseURL,
        maxConcurrentRequests,
        minTimeConsecutiveRequests,
      },
    }),
  ),
);
