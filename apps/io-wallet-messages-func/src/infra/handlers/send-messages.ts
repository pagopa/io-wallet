import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as A from "fp-ts/Array";
import { flow, pipe } from "fp-ts/function";
import * as RT from "fp-ts/ReaderTask";
import * as RTE from "fp-ts/ReaderTaskEither";

import { CodeError, sendMessage } from "@/message";

import { uploadFile } from "../azure/storage/blob";

const splitFiscalCodes = (str: string): FiscalCode[] =>
  pipe(
    str.endsWith("\n") ? str.slice(0, -1) : str,
    (slicedString) => slicedString.split("\n"),
    (array) => array.map((s) => s as FiscalCode), // TODO: If it's not a valid fiscal code, I still want to keep track of it in the output.
  );

const getStatusCode: (error: CodeError) => number = (error) => error.code;

const sendMessageToFiscalCode = (fiscalCode: FiscalCode) =>
  pipe(
    fiscalCode,
    sendMessage,
    RTE.match(
      (error) => [fiscalCode, "undefined", getStatusCode(error)],
      (messageId) => [fiscalCode, messageId, 201],
    ),
  );

const sendMessagesToFiscalCodes = (fiscalCodes: FiscalCode[]) =>
  pipe(fiscalCodes, A.traverse(RT.ApplicativePar)(sendMessageToFiscalCode));

const addCSVHeaders = (rows: unknown[][]) => [
  ["fiscal_code", "message_id", "status_code"],
  ...rows,
];

const stringToBuffer: (s: string) => Buffer<ArrayBuffer> = (s) =>
  Buffer.from(s, "utf-8");

const convertToCSV: (rows: unknown[][]) => Buffer<ArrayBuffer> = flow(
  addCSVHeaders,
  (res) => res.map((row) => row.join(",")).join("\n"),
  stringToBuffer,
);

const sendMessages = (fiscalCodes: string) =>
  pipe(
    fiscalCodes,
    splitFiscalCodes,
    RTE.fromReaderTaskK(sendMessagesToFiscalCodes),
    RTE.map(convertToCSV),
    RTE.chainW(uploadFile),
  );

export const SendMessagesHandler = H.of(sendMessages);
