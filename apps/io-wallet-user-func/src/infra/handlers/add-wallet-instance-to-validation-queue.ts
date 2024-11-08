import { filterValidWithAndroidCertificatesChain } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";

export const AddWalletInstanceToValidationQueueHandler = H.of(
  filterValidWithAndroidCertificatesChain,
);
