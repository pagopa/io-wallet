/* eslint-disable no-bitwise -- This file intentionally uses bigint bitwise operators to build and apply status-list bit masks. */

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";

import { StatusListBinding, StatusListBitRevocation } from "@/status-list";

export interface StatusListBitRevocationPagesDataSource {
  revokeBits: (
    statusListBindings: readonly StatusListBinding[],
  ) => Promise<void>;
}

const statusListPageWordBitSize = 64;
const statusListPageWordByteSize = statusListPageWordBitSize / 8;

export interface StatusListPageRevocationUpdate {
  documentId: string;
  pageIndex: number;
  statusListId: NonEmptyString;
  wordMasks: ReadonlyMap<number, bigint>;
}

const getRevocationPosition = (
  statusBinding: StatusListBinding,
  pageBitsSize: number,
) => {
  const pageRelativeIndex = statusBinding.index % pageBitsSize;
  return {
    bitPosition: pageRelativeIndex % statusListPageWordBitSize,
    pageIndex: Math.floor(statusBinding.index / pageBitsSize),
    wordOffset: Math.floor(pageRelativeIndex / statusListPageWordBitSize),
  };
};

export const groupStatusBindingsByPageDocument = (
  statusBindings: readonly StatusListBinding[],
  pageBitsSize: number,
): readonly StatusListPageRevocationUpdate[] => {
  const groupedUpdates = new Map<
    string,
    {
      documentId: string;
      pageIndex: number;
      statusListId: NonEmptyString;
      wordMasks: Map<number, bigint>;
    }
  >();

  for (const statusBinding of statusBindings) {
    const { bitPosition, pageIndex, wordOffset } = getRevocationPosition(
      statusBinding,
      pageBitsSize,
    );
    const documentId = `${statusBinding.statusListId}:${pageIndex}`;
    const existingUpdate = groupedUpdates.get(documentId);
    const mask = 1n << BigInt(bitPosition);

    if (existingUpdate) {
      existingUpdate.wordMasks.set(
        wordOffset,
        (existingUpdate.wordMasks.get(wordOffset) ?? 0n) | mask,
      );

      continue;
    }

    groupedUpdates.set(documentId, {
      documentId,
      pageIndex,
      statusListId: statusBinding.statusListId,
      wordMasks: new Map([[wordOffset, mask]]),
    });
  }

  return Array.from(groupedUpdates.values());
};

export const applyRevocationWordMasks = ({
  bitsetBase64,
  wordMasks,
}: {
  bitsetBase64: string;
  wordMasks: ReadonlyMap<number, bigint>;
}) => {
  const bitset = Buffer.from(bitsetBase64, "base64");

  let hasChanges = false;

  for (const [wordOffset, mask] of wordMasks) {
    const byteOffset = wordOffset * statusListPageWordByteSize;

    if (byteOffset + statusListPageWordByteSize > bitset.length) {
      throw new Error(
        `Invalid status list page word offset ${wordOffset} for bitset length ${bitset.length}`,
      );
    }

    const currentWord = bitset.readBigUInt64LE(byteOffset);
    const updatedWord = currentWord | mask;

    if (updatedWord !== currentWord) {
      bitset.writeBigUInt64LE(updatedWord, byteOffset);
      hasChanges = true;
    }
  }

  return {
    bitsetBase64: hasChanges ? bitset.toString("base64") : bitsetBase64,
    hasChanges,
  };
};

export const createStatusListBitRevocation = (
  pages: StatusListBitRevocationPagesDataSource,
): StatusListBitRevocation => ({
  revokeBits: (statusListBindings: readonly StatusListBinding[]) =>
    TE.tryCatch(
      () => pages.revokeBits(statusListBindings),
      (error) => (error instanceof Error ? error : new Error(String(error))),
    ),
});
