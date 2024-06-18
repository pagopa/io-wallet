import * as t from "io-ts";
import * as TE from "fp-ts/TaskEither";

import { JwkPublicKey, JwksMetadata } from "io-wallet-common";

export const TrustAnchorEntityConfigurationPayload = t.type({
  iss: t.string,
  sub: t.string,
  jwks: JwksMetadata,
  iat: t.number,
  exp: t.number,
  metadata: t.type({
    federation_entity: t.type({
      federation_fetch_endpoint: t.string,
      federation_resolve_endpoint: t.string,
      federation_trust_mark_status_endpoint: t.string,
      homepage_uri: t.string,
      name: t.string,
      federation_list_endpoint: t.string,
    }),
  }),
});
export type TrustAnchorEntityConfigurationPayload = t.TypeOf<
  typeof TrustAnchorEntityConfigurationPayload
>;

export const TrustMark = t.type({ id: t.string, trust_mark: t.string });
export type TrustMark = t.TypeOf<typeof TrustMark>;

export const EntityStatementHeader = t.type({
  typ: t.literal("entity-statement+jwt"),
  alg: t.string,
  kid: t.string,
});
export type EntityStatementHeader = t.TypeOf<typeof EntityStatementHeader>;

export const EntityStatementPayload = t.type({
  iss: t.string,
  sub: t.string,
  jwks: JwksMetadata,
  trust_marks: t.array(TrustMark),
  iat: t.number,
  exp: t.number,
});

export type EntityStatementPayload = t.TypeOf<typeof EntityStatementPayload>;

export type TrustAnchor = {
  getPublicKeys: () => TE.TaskEither<Error, JwkPublicKey[]>;
  getEntityStatement: () => TE.TaskEither<
    Error,
    { encoded: string; decoded: EntityStatementPayload }
  >;
};
