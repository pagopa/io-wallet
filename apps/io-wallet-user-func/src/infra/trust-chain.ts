import { WalletAttestationEnvironment } from "@/wallet-attestation";
import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { sequenceT } from "fp-ts/Apply";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";
import * as jose from "jose";

interface TrustChainServiceConfig {
  trustAnchorURL: ValidUrl;
  walletProviderURL: ValidUrl;
}

const EntityConfigurationTrustAnchor = t.type({
  metadata: t.type({
    federation_entity: t.type({
      federation_fetch_endpoint: t.string,
    }),
  }),
});

const fetchEndpoint = (url: string): TE.TaskEither<Error, string> =>
  TE.tryCatch(
    () => fetch(url).then((res) => res.text()),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason))),
  );

export const getTrustChainApi =
  ({
    trustAnchorURL,
    walletProviderURL,
  }: TrustChainServiceConfig): WalletAttestationEnvironment["getTrustChain"] =>
  () =>
    pipe(
      // get the trust anchor entity configuration
      fetchEndpoint(`${trustAnchorURL}/.well-known/openid-federation`),
      // get `federation_fetch_endpoint` from the entity configuration jwt
      TE.chain((trustAnchorEntityConfiguration) =>
        pipe(
          E.tryCatch(
            () => jose.decodeJwt(trustAnchorEntityConfiguration),
            (reason) =>
              reason instanceof Error ? reason : new Error(String(reason)),
          ),
          E.chainW(EntityConfigurationTrustAnchor.decode),
          E.mapLeft(
            () =>
              new Error(
                "Invalid Trust Anchor entity configuration: federation_fetch_endpoint is missing or malformed",
              ),
          ),
          E.map(
            ({
              metadata: {
                federation_entity: { federation_fetch_endpoint },
              },
            }) => federation_fetch_endpoint,
          ),
          E.map((trustAnchorFederationFetchEndpoint) => ({
            trustAnchorEntityConfiguration,
            trustAnchorFederationFetchEndpoint,
          })),
          TE.fromEither,
        ),
      ),
      TE.chainW(
        ({
          trustAnchorEntityConfiguration,
          trustAnchorFederationFetchEndpoint,
        }) =>
          pipe(
            sequenceT(TE.ApplyPar)(
              // get the trust anchor subordinate statement for the wallet provider
              fetchEndpoint(
                `${trustAnchorFederationFetchEndpoint}?sub=${walletProviderURL}`,
              ),
              // get the wallet provider entity configuration
              fetchEndpoint(
                `${walletProviderURL}/.well-known/openid-federation`,
              ),
            ),
            TE.map(
              ([
                trustAnchorSubordinateStatement,
                walletProviderEntityConfiguration,
              ]) => ({
                trustAnchorEntityConfiguration,
                walletProviderEntityConfiguration,
                trustAnchorSubordinateStatement,
              }),
            ),
          ),
      ),
      TE.map(
        ({
          trustAnchorEntityConfiguration,
          walletProviderEntityConfiguration,
          trustAnchorSubordinateStatement,
        }) => [
          walletProviderEntityConfiguration,
          trustAnchorSubordinateStatement,
          trustAnchorEntityConfiguration,
        ],
      ),
    );
