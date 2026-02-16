import { ValidUrl } from "@pagopa/ts-commons/lib/url";

import { CertificateRepository } from "@/certificates";
import { FederationEntity } from "@/entity-configuration";
import { Signer } from "@/signer";

export interface WalletAttestations {
  wallet_attestations: {
    wallet_app_attestation: string;
    wallet_unit_attestation: string;
  };
}

export interface WalletAttestationsEnvironment {
  certificateRepository: CertificateRepository;
  federationEntity: FederationEntity;
  signer: Signer;
  walletAttestationConfig: { trustAnchorUrl: ValidUrl };
}
