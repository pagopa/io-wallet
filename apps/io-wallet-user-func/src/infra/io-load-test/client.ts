import { LoadTestConfig } from "@/app/config";
import { LoadTestClient } from "@/load-test";
import * as O from "fp-ts/lib/Option";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { pipe } from "fp-ts/lib/function";
import { PdvTokenizerClient } from "io-wallet-common/infra/pdv-tokenizer/client";
import { User } from "io-wallet-common/user";

export class IoLoadTestClient implements LoadTestClient {
  #users: User[];

  isTestUser = (user: User) =>
    pipe(
      this.#users,
      RA.findFirst((testUser) => testUser.id === user.id),
      O.isSome,
    );

  //Since it is necessary to have the list of users already processed at startup in the constructor, a functional approach is not used.
  constructor(
    { testUsersFiscalCode }: LoadTestConfig,
    pdvTokenizerClient: PdvTokenizerClient,
  ) {
    const users: User[] = [];
    testUsersFiscalCode.forEach((fiscalCode) =>
      pdvTokenizerClient
        .getOrCreateUserByFiscalCode(fiscalCode)()
        .then((result) => {
          if (result._tag === "Right") {
            const fiscalCodesTokens = result.right;
            users.push(fiscalCodesTokens);
          }
        }),
    );

    this.#users = users;
  }
}
