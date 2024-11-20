# io-wallet-user-func

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
