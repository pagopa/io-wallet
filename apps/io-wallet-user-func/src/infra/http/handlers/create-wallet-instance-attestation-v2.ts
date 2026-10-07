import * as H from "@pagopa/handler-kit";

import { getSignAlgorithmFromCurve } from "@/infra/crypto/signer";
import { isLoadTestUser } from "@/user";

import {
  createWalletInstanceAttestationV2Adapters,
  ParsedWiaRequest,
} from "../wallet-instance-attestation-v2-adapters";

export type WalletInstanceAttestationV2Dependencies = ReturnType<
  typeof createWalletInstanceAttestationV2Adapters
>;

const toProblemResponse = (
  reason: unknown,
): H.HttpResponse<H.ProblemJson, H.HttpErrorStatusCode> => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  if (error.name === "ValidationError" && "violations" in error) {
    return H.problemJson({
      detail: "Your request didn't validate",
      status: 422,
      title: "Validation Error",
      type: "/problem/validation-error",
      violations: (error as H.ValidationError).violations,
    });
  }

  let status: H.HttpErrorStatusCode = 500;
  let title = "Internal Server Error";
  switch (error.name) {
    case "EntityNotFoundError":
      status = 404;
      title = "Not Found";
      break;
    case "ForbiddenError":
    case "WalletInstanceRevoked":
      status = 403;
      title = "Forbidden";
      break;
    case "HttpError":
      status = (error as H.HttpError).status;
      title = (error as H.HttpError).title;
      break;
    case "IntegrityCheckError":
      status = 409;
      title = "Conflict";
      break;
    case "ServiceUnavailable":
      status = 503;
      title = "Service Unavailable";
      break;
    case "UnauthorizedError":
      status = 401;
      title = "Unauthorized";
      break;
  }

  return H.problemJson({
    detail: status === 500 ? error.name : error.message,
    status,
    title,
  });
};

const generateAttestation = async (
  { userId, wiaRequest }: ParsedWiaRequest,
  dependencies: WalletInstanceAttestationV2Dependencies,
): Promise<string> => {
  await dependencies.consumeNonce(wiaRequest.nonce);
  const instance = await dependencies.getWalletInstance(
    wiaRequest.hardwareKeyTag,
    userId,
  );

  if (!isLoadTestUser(userId)) {
    const thumbprint = await dependencies.thumbprint(wiaRequest.cnf.jwk);
    const clientData = await dependencies.clientData(
      wiaRequest.nonce,
      thumbprint,
    );
    if (wiaRequest.platform === "ios") {
      await dependencies.verifyIos({
        clientData,
        hardwareKey: instance.hardwareKey,
        hardwareSignature: wiaRequest.hardwareSignature,
        integrityAssertion: wiaRequest.integrityAssertion,
        signCount: instance.signCount,
      });
    } else {
      await dependencies.verifyAndroid({
        clientData,
        hardwareKey: instance.hardwareKey,
        hardwareSignature: wiaRequest.hardwareSignature,
        integrityAssertion: wiaRequest.integrityAssertion,
        user: userId,
      });
    }
  }

  const signingKey = await dependencies.getSigningKey();
  const sub = await dependencies.thumbprint(wiaRequest.cnf.jwk);
  const encoded = dependencies.encodeAttestation({
    crv: signingKey.crv,
    jwk: wiaRequest.cnf.jwk,
    jwkAlg: getSignAlgorithmFromCurve(wiaRequest.cnf.jwk.crv),
    kid: signingKey.kid,
    sub,
    walletProviderName: dependencies.federationEntityId.href,
    x5c: signingKey.certificateChain,
  });
  const { x5c, ...payload } = encoded;

  return dependencies.sign({
    crv: signingKey.crv,
    kid: signingKey.kid,
    payload,
    x5c,
  });
};

export const CreateWalletInstanceAttestationV2Handler =
  (dependencies: WalletInstanceAttestationV2Dependencies) =>
  async (
    body: unknown,
    logError: (error: Error) => void,
  ): Promise<H.HttpResponse<unknown, H.HttpStatusCode>> => {
    try {
      const parsed = await dependencies.parseRequest(body);
      const token = await generateAttestation(parsed, dependencies);
      return H.successJson({ wallet_instance_attestation: token });
    } catch (reason) {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      try {
        await dependencies.sendTelemetry(body, error);
      } catch (telemetryError) {
        const replacement =
          telemetryError instanceof Error
            ? telemetryError
            : new Error(String(telemetryError));
        logError(replacement);
        return toProblemResponse(replacement);
      }
      logError(error);
      return toProblemResponse(error);
    }
  };
