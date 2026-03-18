import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { validateJwkKid } from "io-wallet-common/jwk";

import { CertificateRepository } from "@/certificates";
import { Signer } from "@/signer";

export interface SignerMetadataEnvironment {
  certificateRepository: CertificateRepository;
  signer: Signer;
}

interface SignerMetadata {
  kid: string;
  x5c: string[];
}

export const getSignerMetadata: RTE.ReaderTaskEither<
  SignerMetadataEnvironment,
  Error,
  SignerMetadata
> = ({ certificateRepository, signer }) =>
  pipe(
    "EC",
    signer.getFirstPublicKeyByKty,
    E.chainW(validateJwkKid),
    TE.fromEither,
    TE.chain(({ kid }) =>
      pipe(
        certificateRepository.getCertificateChainByKid(kid),
        TE.chain(
          flow(
            O.match(
              () => TE.left(new Error("Certificate chain not found")),
              (x5c) => TE.right({ kid, x5c }),
            ),
          ),
        ),
      ),
    ),
  );
