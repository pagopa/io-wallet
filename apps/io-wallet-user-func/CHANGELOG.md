# io-wallet-user-func

## 3.7.6

### Patch Changes

- c8e7082: Updated node version and migrated from yarn to pnpm
- Updated dependencies [c8e7082]
  - io-wallet-common@1.4.2

## 3.7.5

### Patch Changes

- f7f674d: Strengthened data validation in createWalletInstance and updated WalletInstance schema to allow string osPatchLevel for revoked instances
- Updated dependencies [f7f674d]
  - io-wallet-common@1.4.1

## 3.7.4

### Patch Changes

- ead85d6: Updated AI configuration

## 3.7.3

### Patch Changes

- 3581ee7: Updated user host.json file

## 3.7.2

### Patch Changes

- ef49aaa: Udpated host.json file

## 3.7.1

### Patch Changes

- 56ea851: Updated host.json file

## 3.7.0

### Minor Changes

- 8c7c0cb: Updated @azure/storage-blob and @azure/storage-queue dependencies"
- 1a07166: Updated dependencies

### Patch Changes

- 6c16860: Disabled email sending for fiscal codes in the whitelist
- Updated dependencies [1a07166]
  - io-wallet-common@1.4.0

## 3.6.2

### Patch Changes

- 9b9ec04: Updated vct Wallet Attestation

## 3.6.1

### Patch Changes

- d6017fd: Removed manual tracking of EntityNotFound exceptions in getCurrentWalletInstanceStatus

## 3.6.0

### Minor Changes

- 16ee9ce: Added x5c in wallet attestation mdoc cbor

## 3.5.5

### Patch Changes

- d72846d: Fixed `vct` value in wallet attestation SD-jWT

## 3.5.4

### Patch Changes

- 47905db: Added x5c generation for federation entity and wallet provider keys

## 3.5.3

### Patch Changes

- b4e56f0: Fix wallet attestation as mdoc cbor

## 3.5.2

### Patch Changes

- 901f649: Added support for using separate keys for the federation entity and the wallet provider

## 3.5.1

### Patch Changes

- 2a8ddc0: Fix typo
- 604a930: Removed trust_chain in wallet attestation header

## 3.5.0

### Minor Changes

- a74d443: Added wallet attestation mdoc cbor format

## 3.4.3

### Patch Changes

- e90742e: Fix: changed wallet attestation SD-JWT typ header in `dc+sd-jwt`

## 3.4.2

### Patch Changes

- c53ec5a: Temporarily removed `trust_chain` from wallet attestation header

## 3.4.1

### Patch Changes

- da599d1: Revert temp CRL fix

## 3.4.0

### Minor Changes

- 06ff9d0: Renamed endpoint /wallet-attestation in /wallet-attestations and updated createWalletAttestationV2 handler

## 3.3.6

### Patch Changes

- 0e14c2c: Fix CRL

## 3.3.5

### Patch Changes

- 1bc95f4: Added AddWalletInstanceUserIdFunction to populate wallet-instances-user-id collection

## 3.3.4

### Patch Changes

- 0543e2b: Removed collection `wallet-instances-user-id`

## 3.3.3

### Patch Changes

- 53c4ea2: Added in metadata.federation_entity.contacts field in EC

## 3.3.2

### Patch Changes

- 88979fc: Removed addWalletInstanceUserId function

## 3.3.1

### Patch Changes

- e22ca34: Fixed bug in /wallet-attestation endpoint

## 3.3.0

### Minor Changes

- 130ecca: Updated /wallet-attestation endpoint to return JWT and SD-JWT format

## 3.2.4

### Patch Changes

- cecfe31: Migrated Azure Blob Storage authentication from connection string to Azure Identity credentials

## 3.2.3

### Patch Changes

- b7705ee: Updated wallet provider entity configuration

## 3.2.2

### Patch Changes

- be80822: Added 503 response to the GET /whitelisted-fiscal-code/{fiscalCode} API

## 3.2.1

### Patch Changes

- be09148: Fix OpenAPI Spec

## 3.2.0

### Minor Changes

- aa53fb6: Added endpoint to check if a fiscal code is in the whitelist or not

## 3.1.0

### Minor Changes

- 6b58b6f: Added endpoint createWalletAttestationV2

## 3.0.4

### Patch Changes

- 89d6a5d: Removed the PUT /wallet-instances/current/status endpoint

## 3.0.3

### Patch Changes

- e0f6d17: Updated ioapp.it link in email

## 3.0.2

### Patch Changes

- 98321ad: Removed the check of the fiscal code list for sending the revocation email

## 3.0.1

### Patch Changes

- a1cc182: Bug fix: the revocation time in the email appears without considering the timezone

## 3.0.0

### Major Changes

- 19bb43d: Send email when wallet instance is revoked by user

## 2.4.0

### Minor Changes

- 1c8d468: Added deleteWalletInstances endpoint

## 2.3.4

### Patch Changes

- 248f6db: Removed feature flag on email sent after wallet instance creation

## 2.3.3

### Patch Changes

- f7ad7fa: Fix email on wallet instance creation title

## 2.3.2

### Patch Changes

- 24dd637: Add telemetryClient in sendEmailOnWalletInstanceCreation function

## 2.3.1

### Patch Changes

- b3ca3ff: Added fiscal codes whitelist for email test

## 2.3.0

### Minor Changes

- 4cf6097: Added email to the user after wallet instance creation

## 2.2.4

### Patch Changes

- 8798c8f: Revert to sync call to PID issuer for revoke

## 2.2.3

### Patch Changes

- 9d44162: Added async call to PID issuer
- Updated dependencies [9d44162]
  - io-wallet-common@1.3.2

## 2.2.2

### Patch Changes

- 50c4813: Add multiple Android CRL url

## 2.2.1

### Patch Changes

- e6e197b: Changed leaseContainerName for addWalletInstanceToValidationQueue function

## 2.2.0

### Minor Changes

- 02fd0bb: Removed migrateWalletInstances function

## 2.1.3

### Patch Changes

- d7e2dba: Changed cosmosdb env var in migrateWalletInstances function

## 2.1.2

### Patch Changes

- d1179a6: Updated migrateWalletInstances function

## 2.1.1

### Patch Changes

- 1671ade: Updated turbo dependency version
- Updated dependencies [1671ade]
  - io-wallet-common@1.3.1

## 2.1.0

### Minor Changes

- 94c97c3: Added migrateWalletInstances user function and updated repository dependencies

### Patch Changes

- Updated dependencies [94c97c3]
  - io-wallet-common@1.3.0

## 2.0.2

### Patch Changes

- 0feaede: Remove unused algs

## 2.0.1

### Patch Changes

- 125dfbe: Added getWalletInstance endpoint

## 2.0.0

### Major Changes

- 2e7ce98: Updated getCurrentWalletInstanceStatus method from POST to GET

## 1.3.10

### Patch Changes

- 07d296c: Add revocation reason to Wallet Instance
- Updated dependencies [07d296c]
  - io-wallet-common@1.2.1

## 1.3.9

### Minor Changes

- 47c24e1: Add Wallet Instance Attested Key revocation event based

### Patch Changes

- 853fea6: Add slack notification message on Wallet Instance revocation
- Updated dependencies [47c24e1]
- Updated dependencies [853fea6]
  - io-wallet-common@1.2.0

## 1.3.8

### Patch Changes

- 40f7a27: Refactor certificates validation

## 1.3.7

### Patch Changes

- f465ea9: Refactor to validation result for attestation/assertion library

## 1.3.6

### Patch Changes

- 35fdcb0: Moved IO Web token validation to APIM
- Updated dependencies [35fdcb0]
  - io-wallet-common@1.1.1

## 1.3.5

### Patch Changes

- 47bcac6: Fix Android Attestation revocation validation

## 1.3.4

### Patch Changes

- 9486e3c: Added `requests` telemetry in Application Insights

## 1.3.3

### Patch Changes

- f9dbfdd: Add integrity error logs

## 1.3.2

### Patch Changes

- c51f327: Update AI settings

## 1.3.1

### Patch Changes

- 3a7b52d: Add functionName in application insights exceptions

## 1.3.0

### Minor Changes

- 4144850: Add exceptions log

### Patch Changes

- Updated dependencies [4144850]
  - io-wallet-common@1.1.0

## 1.2.7

### Patch Changes

- 8125ecf: Fix test attestation

## 1.2.6

### Patch Changes

- 7da8056: Increase security on test wallet attestation

## 1.2.5

### Patch Changes

- 940b7cc: Fix bug

## 1.2.4

### Patch Changes

- a905214: Add allowedDeveloperUsers
- 9b858ab: Add load test integration

## 1.2.3

### Patch Changes

- 795121e: Removed PDV service
- Updated dependencies [795121e]
  - io-wallet-common@1.0.4

## 1.2.2

### Patch Changes

- 8b6d769: Fix attestation bug and remove SkipChainValidation

## 1.2.1

### Patch Changes

- 00d2603: Add SkipChainValidation

## 1.2.0

### Minor Changes

- 9c920d2: Added setCurrentWalletInstanceStatus function in user-func and added 503 response status code

### Patch Changes

- Updated dependencies [9c920d2]
  - io-wallet-common@1.0.3

## 1.1.9

### Patch Changes

- 78e84ea: Added CosmosClient and fetch timeout as environment variables
- Updated dependencies [78e84ea]
  - io-wallet-common@1.0.2

## 1.1.8

### Patch Changes

- 261a3d9: Increase error details

## 1.1.7

### Patch Changes

- bdf1332: Added getCurrentWalletInstanceByFiscalCode in support function

## 1.1.6

### Patch Changes

- 96ba448: Added support health check function. Moved shared code in io-wallet-common package
- Updated dependencies [96ba448]
  - io-wallet-common@1.0.1

## 1.1.5

### Patch Changes

- c86eea3: Added io-wallet-support-func and io-wallet-common packages. Consequently refactored io-wallet-user-func
- Updated dependencies [c86eea3]
  - io-wallet-common@1.0.0

## 1.1.4

### Patch Changes

- 5ed07a0: Add io-web magic link jwt validation

## 1.1.3

### Patch Changes

- a164214: Removed trailing slash in the body passed to pid issuer API

## 1.1.2

### Patch Changes

- 0d20ef2: Added pid issuer health check toggler

## 1.1.1

### Patch Changes

- 0a9dc42: Fix error attestation and assertion

## 1.1.0

### Minor Changes

- 4a2649e: Added 409 status code for /wallet-instance and /token endpoints

## 1.0.1

### Patch Changes

- 776707c: Added deviceDetails

## 1.0.0

### Major Changes

- a52b443: Created user wallet function
