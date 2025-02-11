import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

interface MessageContent {
  markdown: string;
  subject: string;
}

export class CodeError extends Error {
  code: number;
  constructor(code: number) {
    super();
    this.code = code;
  }
}

export interface Message {
  sendMessage: (
    content: MessageContent,
  ) => (fiscalCode: FiscalCode) => TE.TaskEither<CodeError, string>;
}

// TODO [SIW-1995]: set as env variables
const messageContent = {
  markdown:
    "---\nit:\n  cta_1:\n    text: 'Inizia'\n    action: 'ioit://itw/discovery/info'\nen:\n  cta_1:\n    text: 'Start here'\n    action: 'ioit://itw/discovery/info'\n---\nCiao,\n\n\nmoltissime persone già usano la nuova funzionalità **Documenti su IO**, che ti permette di aggiungere al Portafoglio dell’app la **versione digitale dei tuoi documenti** personali come Patente e Tessera Sanitaria.\n\n\nAttiva anche tu **Documenti su IO** con **SPID** o **CIE** (Carta d’Identità Elettronica) e scopri com’è facile aggiungere e custodire in sicurezza i tuoi documenti nel Portafoglio.\n\n\n**Utile da sapere**\n\n\n - Hai i tuoi documenti **sempre a portata di mano sul tuo dispositivo**, in totale sicurezza.\n\n - La versione digitale dei tuoi documenti ha lo stesso valore legale di quelli fisici, solo in specifici contesti d’uso.\n\n - Puoi disattivare **Documenti su IO** in qualsiasi momento.",
  subject: "La tua Patente e la tua Tessera Sanitaria su IO",
};

export const sendMessage: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<Message, CodeError, string> =
  (fiscalCode) =>
  ({ sendMessage }) =>
    pipe(fiscalCode, sendMessage(messageContent));
