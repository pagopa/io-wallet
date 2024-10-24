# IO Wallet - User Function

### Introduction

Welcome! 😊

This is the `io-wallet-user-func`, a backend porject made in [NodeJS](https://nodejs.org/), [TypeScript](https://www.typescriptlang.org/), [fp-ts](https://gcanti.github.io/fp-ts/) and different [Azure SDKs](https://azure.github.io/azure-sdk/#javascript) for the IO Wallet app. This backend includes the necessary functionality used directly from the IO Wallet end users.

This project uses the main fllowing NPM packages:

- [typescript](https://classic.yarnpkg.com/en/package/typescript)
- [fp-ts](https://classic.yarnpkg.com/en/package/fp-ts)
- [eslint](https://classic.yarnpkg.com/en/package/eslint)
- [prettier](https://classic.yarnpkg.com/en/package/prettier)
- [@azure/functions](https://classic.yarnpkg.com/en/package/@azure/functions)
- [@azure/identity](https://classic.yarnpkg.com/en/package/@azure/identity)
- [@azure/cosmos](https://classic.yarnpkg.com/en/package/@azure/cosmos)
- [tsup](https://classic.yarnpkg.com/en/package/tsup)
- [vitest](https://classic.yarnpkg.com/en/package/vitest)

This project uses [Yarn](https://classic.yarnpkg.com/) as depndencies manager.

Moreover, this project is strongly correlated to different [Azure Cloud](https://learn.microsoft.com/en-us/azure/?product=popular) Resources, all available by logging in with your user name directly to the Azure portal. The two most important Azure resources used by this service are [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/) and [Azure CosmosDB](https://learn.microsoft.com/en-us/azure/cosmos-db/).

> ❗❗❗ if you haven't already, it's strongly recommended to read the `README.md` file at the monorepo level (in the root directory of the monorepo). It will give you more context and a better understanding of how to get this project started. The `io-wallet-user-func` uses the `io-wallet-common` package; you can see under the `packages/` folder of the monorepo.

### Prerequisites

The following dependencies are strongly required:

- Node ^20.13
- Yarn ^4

The following dependencies are optional, but they are necessary to start the service locally in complete autonomy:

- AZ CLI ^2
- Python ^3

If you are interested in infrastructure issues, you may find it convenient to install terraform on your local machine:

- Terraform ^1.7.5

### Installation

```bash
yarn
# or
yarn install
```

### Configuration

This service can be configured by a [JSON](https://www.json.org/json-en.html) file called `local.settings.json` file. This codebase contains a template file called `local.settings.json.example` you can copy and rewrite as and when you want with.

To copy the environment variables template, run the following command:

```bash
cp local.settings.json.example local.settings.json
```

The template contains the following environment variables:

- `NODE_TLS_REJECT_UNAUTHORIZED` (required): todo
- `AzureWebJobsStorage` (required): todo
- `NODE_ENV` (required): todo
- `AzureFunctionsJobHost__logging__logLevel__Function` (required): todo
- `FederationEntityBasePath` (required): todo
- `FederationEntityOrganizationName` (required): todo
- `FederationEntityHomepageUri` (required): todo
- `FederationEntityPolicyUri` (required): todo
- `FederationEntityTosUri` (required): todo
- `FederationEntityLogoUri` (required): todo
- `FederationEntityTrustAnchorUri` (required): todo
- `WalletKeys` (required): todo
- `IosBundleIdentifiers` (required): todo
- `AndroidBundleIdentifiers` (required): todo
- `IosTeamIdentifier` (required): todo
- `AppleRootCertificate` (required): todo
- `GooglePublicKey` (required): todo
- `AndroidCrlUrl` (required): todo
- `AndroidPlayIntegrityUrl` (required): todo
- `AllowDevelopmentEnvironment` (required): todo
- `GoogleAppCredentialsEncoded` (required): todo
- `AndroidPlayStoreCertificateHash` (required): todo
- `EntityConfigurationStorageContainerName` (required): todo
- `EntityConfigurationStorageAccount__serviceUri` (required): todo
- `StorageAccount__queueServiceUri` (required): todo
- `HubSpidLoginJwtPubKey` (required): todo
- `HubSpidLoginJwtIssuer` (required): todo
- `HubSpidLoginClientBaseUrl` (required): todo
- `ExchangeJwtIssuer` (required): todo
- `ExchangeJwtPubKey` (required): todo
- `TrialSystemApiBaseURL` (required): todo
- `TrialSystemApiKey` (required): todo
- `TrialSystemTrialId` (required): todo
- `TrialSystemFeatureFlag` (required): todo
- `PidIssuerApiBaseURL` (required): todo
- `PidIssuerApiClientCertificate` (required): todo
- `PidIssuerApiClientPrivateKey` (required): todo
- `PidIssuerApiRootCACertificate` (required): todo
- `PidIssuerApiRequestTimeout` (required): todo
- `FUNCTIONS_WORKER_RUNTIME` (required, fixed value): always set to `node`. This is necessary for the `@azure/functions` SDK.
- `CosmosDbEndpoint` (required): the CosmosDB endpoint.
- `CosmosDbDatabaseName` (required): the database name hosted by the CosmosDB.
- `CosmosDbRequestTimeout` (required): the CosmosDB request timeout (expressed in milliseconds, where 1000ms = 1s).
- `HttpRequestTimeout` (required): the HTTP request timeout (expressed in milliseconds, where 1000ms = 1s).
- `AppInsightsConnectionString` (required): the AppInsights connection string.


### Useful Commands

```bash
yarn start          # [Description]
                    #       Run the function in a local environment
                    # [Aliases]
                    #       func start
                    #       func start --port 7071
                    #       yarn run start


yarn typecheck      # [Description]
                    #       Run the typecheck of the codebase
                    # [Aliases]
                    #       yarn run typecheck


yarn test           # [Description]
                    #       Run all unit tests (performed by vitest) present in the codebase
                    # [Aliases]
                    #       yarn run test


yarn test:coverage  # [Description]
                    #       Run a test coverage (performed by vitest) of the codebases
                    # [Aliases]
                    #       yarn run test:coverage


yarn lint           # [Description]
                    #       Run a code lint (performed by ESLint) of the codebases, but without
                    #       fixing any errors, or warnings found
                    # [Aliases]
                    #       yarn run lint


yarn lint:fix       # [Description]
                    #       Run a code lint (performed by ESLint) of the codebases, trying to fix any
                    #       errors/warnings that are correctable.
                    # [Aliases]
                    #       yarn run lint:fix


yarn format         # [Description]
                    #       Run a code formatting (performed by prettier) of the codebases. All
                    #       bad-formatted files are modified and formatted.
                    # [Aliases]
                    #       yarn run format


yarn build          # [Description]
                    #       Run a build (performed by tsup-node) of the codebases. The build
                    #       results are grouped in the dist/ directory, stored in the root directory
                    #       of the project.
                    # [Aliases]
                    #       yarn run format


yarn build:watch    # [Description]
                    #       Run a build (performed by tsup-node) in watch mode of the codebases.
                    #       The build results are grouped in the dist/ directory, stored in the
                    #       root directory of the project.
                    # [Aliases]
                    #       yarn run format
```

### Quickstart

Before following the steps below:
- Make sure your Node version is as specified in the `.node-version` file.
- Make sure you've build the `io-wallet-common` package at the monorepo level. This is a very important package for the `io-wallet-user-func`.

To quickly start this project in a local environment, run the following commands in the order they appear:

```bash
yarn            # installing all dependencies and creating the node_modules/ directory
yarn build      # building the project and creating the dist/ directory 
yarn start      # generating different log into your shell
```

To make sure the function is up, just go to a browser and type the following URL in the search bar, which invokes the healthcheck API: `http://localhost:7071/api/v1/wallet/health`. Alternatively, if you have the curl package installed on your operating system, simply open a terminal and type the following command:

```bash
curl http://localhost:7071/api/v1/wallet/health
```

In both cases, you should see the following response, expressed in JSON format:

```json
{ "message": "it works!" }
```

As you can see, the function is listening on `7071` port. You can change the listening port with the following command:

```bash
func start --port YOUR_PORT
```
