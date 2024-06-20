import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { JwkPublicKey, JwksMetadata } from "io-wallet-common/jwk";

export const TrustAnchorEntityConfigurationPayload = t.type({
  exp: t.number,
  iat: t.number,
  iss: t.string,
  jwks: JwksMetadata,
  metadata: t.type({
    federation_entity: t.type({
      federation_fetch_endpoint: t.string,
      federation_list_endpoint: t.string,
      federation_resolve_endpoint: t.string,
      federation_trust_mark_status_endpoint: t.string,
      homepage_uri: t.string,
      name: t.string,
    }),
  }),
  sub: t.string,
});
export type TrustAnchorEntityConfigurationPayload = t.TypeOf<
  typeof TrustAnchorEntityConfigurationPayload
>;

export const TrustMark = t.type({ id: t.string, trust_mark: t.string });
export type TrustMark = t.TypeOf<typeof TrustMark>;

export const EntityStatementHeader = t.type({
  alg: t.string,
  kid: t.string,
  typ: t.literal("entity-statement+jwt"),
});
export type EntityStatementHeader = t.TypeOf<typeof EntityStatementHeader>;

export const EntityStatementPayload = t.type({
  exp: t.number,
  iat: t.number,
  iss: t.string,
  jwks: JwksMetadata,
  sub: t.string,
  trust_marks: t.array(TrustMark),
});

export type EntityStatementPayload = t.TypeOf<typeof EntityStatementPayload>;

export interface TrustAnchor {
  getEntityStatement: () => TE.TaskEither<
    Error,
    { decoded: EntityStatementPayload; encoded: string }
  >;
  getPublicKeys: () => TE.TaskEither<Error, JwkPublicKey[]>;
}
