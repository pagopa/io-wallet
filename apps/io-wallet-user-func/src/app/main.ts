import ai from "@/infra/azure/appinsights/start";
import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";
import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { GenerateEntityConfigurationFunction } from "@/infra/azure/functions/generate-entity-configuration";
import { GetCurrentWalletInstanceStatusFunction } from "@/infra/azure/functions/get-current-wallet-instance-status";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { HealthFunction } from "@/infra/azure/functions/health";
import { SetCurrentWalletInstanceStatusFunction } from "@/infra/azure/functions/set-current-wallet-instance-status";
import { SetWalletInstanceStatusFunction } from "@/infra/azure/functions/set-wallet-instance-status";
import { CryptoSigner } from "@/infra/crypto/signer";
import { jwtValidate } from "@/infra/jwt-validator";
import { PidIssuerClient } from "@/infra/pid-issuer/client";
import { TrialSystemClient } from "@/infra/trial-system/client";
import { CosmosClient } from "@azure/cosmos";
import { app, output } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import * as t from "io-ts";

import { getConfigFromEnvironment } from "./config";

const configOrError = pipe(
  getConfigFromEnvironment(process.env),
  E.getOrElseW(identity),
);

if (configOrError instanceof Error) {
  throw configOrError;
}

const config = configOrError;

const credential = new DefaultAzureCredential();

const cosmosClient = new CosmosClient({
  aadCredentials: credential,
  connectionPolicy: {
    requestTimeout: config.azure.cosmos.requestTimeout,
  },
  endpoint: config.azure.cosmos.endpoint,
});

const database = cosmosClient.database(config.azure.cosmos.dbName);

const nonceRepository = new CosmosDbNonceRepository(database);

const signer = new CryptoSigner(config.crypto);

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

const tokenValidate = jwtValidate(config.jwtValidator);

const trialSystemClient = new TrialSystemClient(config.trialSystem);

const pidIssuerClient = new PidIssuerClient(
  config.pidIssuer,
  config.federationEntity.basePath.href,
);

const appInsightsClient = ai.defaultClient;

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: HealthFunction({
    cosmosClient,
    pidIssuerClient,
    trialSystemClient,
  }),
  methods: ["GET"],
  route: "health",
});

app.http("createWalletAttestation", {
  authLevel: "function",
  handler: CreateWalletAttestationFunction({
    attestationServiceConfiguration: config.attestationService,
    federationEntityMetadata: config.federationEntity,
    nonceRepository,
    signer,
    telemetryClient: appInsightsClient,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "token",
});

app.http("createWalletInstance", {
  authLevel: "function",
  handler: CreateWalletInstanceFunction({
    attestationServiceConfiguration: config.attestationService,
    nonceRepository,
    telemetryClient: appInsightsClient,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "wallet-instances",
});

app.http("getNonce", {
  authLevel: "function",
  handler: GetNonceFunction({
    nonceRepository,
    telemetryClient: appInsightsClient,
  }),
  methods: ["GET"],
  route: "nonce",
});

app.timer("generateEntityConfiguration", {
  handler: GenerateEntityConfigurationFunction({
    federationEntityMetadata: config.federationEntity,
    inputDecoder: t.unknown,
    signer,
    telemetryClient: appInsightsClient,
  }),
  return: output.storageBlob({
    connection: "EntityConfigurationStorageAccount",
    path: `${config.azure.storage.entityConfiguration.containerName}/openid-federation`,
  }),
  schedule: "0 0 */12 * * *", // the function returns a jwt that is valid for 24 hours, so the trigger is set every 12 hours
});

import { HttpRequest, InvocationContext, HttpHandler } from "@azure/functions";
import {
  Attributes,
  SpanKind,
  SpanOptions,
  SpanStatusCode,
  TraceFlags,
  context,
  trace,
  Span,
  SpanContext,
} from "@opentelemetry/api";
import {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_URL,
} from "@opentelemetry/semantic-conventions";

function createAppInsightsWrapper(func: HttpHandler) {
  return async (req: HttpRequest, invocationContext: InvocationContext) => {
    const startTime = Date.now();

    // Extract the trace context from the incoming request
    const traceParent = req.headers.get("traceparent");
    const parts = traceParent?.split("-");

    const parentSpanContext: SpanContext | null =
      parts &&
      parts.length === 4 &&
      parts[1].length === 32 &&
      parts[2].length === 16
        ? {
            traceId: parts[1],
            spanId: parts[2],
            traceFlags: TraceFlags.NONE,
          }
        : null;

    const activeContext = context.active();

    // Set span context as the parent context if any
    const parentContext = parentSpanContext
      ? trace.setSpanContext(activeContext, parentSpanContext)
      : activeContext;

    const attributes: Attributes = {
      [SEMATTRS_HTTP_METHOD]: "HTTP",
      [SEMATTRS_HTTP_URL]: req.url,
    };

    const options: SpanOptions = {
      kind: SpanKind.SERVER,
      attributes: attributes,
      startTime: startTime,
    };

    const span: Span = trace
      .getTracer("ApplicationInsightsTracer")
      .startSpan(`${req.method} ${req.url}`, options, parentContext);

    let res;
    try {
      res = await context.with(trace.setSpan(activeContext, span), async () => {
        return await func(req, invocationContext);
      });
      const status = res?.status;
      if (status) {
        span.setStatus({
          code: status < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, status);
      }
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : JSON.stringify(error),
      });
      throw error;
    } finally {
      span.end(Date.now());
    }

    return res;
  };
}

app.http("getCurrentWalletInstanceStatus", {
  authLevel: "function",
  handler: createAppInsightsWrapper(
    GetCurrentWalletInstanceStatusFunction({
      jwtValidate: tokenValidate,
      telemetryClient: appInsightsClient,
      userTrialSubscriptionRepository: trialSystemClient,
      walletInstanceRepository,
    }),
  ),
  methods: ["GET"],
  route: "wallet-instances/current/status",
});

app.http("setWalletInstanceStatus", {
  authLevel: "function",
  handler: SetWalletInstanceStatusFunction({
    credentialRepository: pidIssuerClient,
    jwtValidate: tokenValidate,
    telemetryClient: appInsightsClient,
    userTrialSubscriptionRepository: trialSystemClient,
    walletInstanceRepository,
  }),
  methods: ["PUT"],
  route: "wallet-instances/{id}/status",
});

app.http("setCurrentWalletInstanceStatus", {
  authLevel: "function",
  handler: SetCurrentWalletInstanceStatusFunction({
    credentialRepository: pidIssuerClient,
    telemetryClient: appInsightsClient,
    walletInstanceRepository,
  }),
  methods: ["PUT"],
  route: "wallet-instances/current/status",
});
