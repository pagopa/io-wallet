# io-wallet-common

## 1.4.1

### Patch Changes

- f7f674d: Strengthened data validation in createWalletInstance and updated WalletInstance schema to allow string osPatchLevel for revoked instances

## 1.4.0

### Minor Changes

- 1a07166: Updated dependencies

## 1.3.2

### Patch Changes

- 9d44162: Added async call to PID issuer

## 1.3.1

### Patch Changes

- 1671ade: Updated turbo dependency version

## 1.3.0

### Minor Changes

- 94c97c3: Added migrateWalletInstances user function and updated repository dependencies

## 1.2.1

### Patch Changes

- 07d296c: Add revocation reason to Wallet Instance

## 1.2.0

### Minor Changes

- 853fea6: Add slack notification message on Wallet Instance revocation

### Patch Changes

- 47c24e1: Add Wallet Instance Attested Key revocation event based

## 1.1.2

### Patch Changes

- WalletInstanceRepository improvement

## 1.1.1

### Patch Changes

- 35fdcb0: Moved IO Web token validation to APIM

## 1.1.0

### Minor Changes

- 4144850: Add exceptions log

## 1.0.4

### Patch Changes

- 795121e: Removed PDV service

## 1.0.3

### Patch Changes

- 9c920d2: Added setCurrentWalletInstanceStatus function in user-func and added 503 response status code

## 1.0.2

### Patch Changes

- 78e84ea: Added CosmosClient and fetch timeout as environment variables

## 1.0.1

### Patch Changes

- 96ba448: Added support health check function. Moved shared code in io-wallet-common package

## 1.0.0

### Major Changes

- c86eea3: Added io-wallet-support-func and io-wallet-common packages. Consequently refactored io-wallet-user-func
