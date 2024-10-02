import { LoadTestConfig } from "@/app/config";
import { LoadTestClient } from "@/load-test";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { pipe } from "fp-ts/lib/function";
import { PdvTokenizerClient } from "io-wallet-common/infra/pdv-tokenizer/client";
import { User } from "io-wallet-common/user";

export class IoLoadTestClient implements LoadTestClient {
  #users: string[];

  isTestUser = (user: User) =>
    pipe(
      this.#users,
      RA.findFirst((userId) => userId === user.id),
      O.isSome,
      E.right,
    );

  //Since it is necessary to have the list of users already processed at startup in the constructor, a functional approach is not used.
  constructor(
    { testUsersFiscalCode }: LoadTestConfig,
    pdvTokenizerClient: PdvTokenizerClient,
  ) {
    const users: string[] = [];
    testUsersFiscalCode.forEach((fiscalCode) =>
      pdvTokenizerClient
        .getOrCreateUserByFiscalCode(fiscalCode)()
        .then((result) => {
          if (result._tag === "Right") {
            const fiscalCodesTokens = result.right;
            users.push(fiscalCodesTokens.id);
          }
        }),
    );

    this.#users = users;
  }
}
