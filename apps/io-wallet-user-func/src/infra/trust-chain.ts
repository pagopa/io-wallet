import { WalletAttestationEnvironment } from "@/wallet-attestation";
import { sequenceT } from "fp-ts/Apply";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";
import * as jose from "jose";

interface TrustChainServiceConfig {
  ECTAURL: string;
  ECWPURL: string;
}

const ECTAJwtPayload = t.type({
  metadata: t.type({
    federation_entity: t.type({
      federation_fetch_endpoint: t.string,
    }),
  }),
});

export const getTrustChainApi =
  ({
    ECTAURL,
    ECWPURL,
  }: TrustChainServiceConfig): WalletAttestationEnvironment["getTrustChain"] =>
  () =>
    pipe(
      TE.tryCatch(
        () => fetch(ECTAURL).then((res) => res.text()),
        (reason) =>
          reason instanceof Error ? reason : new Error(String(reason)),
      ),
      TE.chain((ECTA) =>
        pipe(
          E.tryCatch(
            () => jose.decodeJwt(ECTA),
            (reason) =>
              reason instanceof Error ? reason : new Error(String(reason)),
          ),
          E.chainW(ECTAJwtPayload.decode),
          E.map(
            ({
              metadata: {
                federation_entity: { federation_fetch_endpoint },
              },
            }) => federation_fetch_endpoint,
          ),
          E.map((federationFetchEndpoint) => ({
            ECTA,
            federationFetchEndpoint,
          })),
          TE.fromEither,
        ),
      ),
      TE.chainW(({ ECTA, federationFetchEndpoint }) =>
        pipe(
          sequenceT(TE.ApplyPar)(
            TE.tryCatch(
              () =>
                fetch(
                  // TODO
                  `${federationFetchEndpoint}?sub=https://foo11.blob.core.windows.net/foo`,
                ).then((res) => res.text()),
              (reason) =>
                // TODO. return 200 or else
                reason instanceof Error ? reason : new Error(String(reason)),
            ),
            TE.tryCatch(
              () => fetch(ECWPURL).then((res) => res.text()),
              (reason) =>
                reason instanceof Error ? reason : new Error(String(reason)),
            ),
          ),
          TE.map(([SS, ECWP]) => ({
            ECTA,
            ECWP,
            SS,
          })),
        ),
      ),
      TE.map(({ ECTA, ECWP, SS }) => [ECWP, SS, ECTA]),
      TE.mapLeft(() => new Error("error")), // TODO
    );
