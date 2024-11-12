import * as TE from "fp-ts/TaskEither";

export interface NotificationService {
  sendMessage: (message: string) => TE.TaskEither<Error, void>;
}
