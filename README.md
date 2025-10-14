# IO Wallet

### Introduction

Welcome! 😊

This is the `io-wallet` project mono-repository containing applications and packages for the IO Wallet app:

- `apps/io-wallet-support-func`: Contains functionalities for assistance and support.
- `apps/io-wallet-user-func`: Contains functionalities for end users.
- `packages/io-wallet-common`: Contains shared code among the workspaces.
- `infra`: Contains Terraform code for provisioning and managing the IO Wallet infrastructure on Azure.

## Technologies

This project is built with [NodeJS](https://nodejs.org/) and deployed on [Azure Cloud](https://learn.microsoft.com/en-us/azure/?product=popular), utilizing [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/) and [Azure CosmosDB](https://learn.microsoft.com/en-us/azure/cosmos-db/).

It leverages [TypeScript](https://www.typescriptlang.org/), [fp-ts](https://gcanti.github.io/fp-ts/), and several [Azure SDKs](https://azure.github.io/azure-sdk/#javascript).

We use [pnpm](https://pnpm.io/) as the dependencies manager and [Turborepo](https://turbo.build/repo/docs) as the monorepo manager.

Infrastructure is managed with [Terraform](https://www.terraform.io/).

Changelog and versioning are managed with [Changesets](https://github.com/changesets/changesets).

### Setting the Azure Subscription to Access the Dev CosmosDB

To start the function apps `io-wallet-support-func` and `io-wallet-user-func`, you must first log in on Azure and set the subscription you want to use. Ensure you have the Azure `az-cli` package installed. If not, follow the instructions on the [official website](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).

This process is necessary for local function apps to connect to the development CosmosDB instance on Azure:

```bash
az login                                        # Redirects to your main browser for login.

az account set --subscription DEV-IO            # Sets the DEV-IO subscription for backend apps to connect to the dev CosmosDB.

az ad user show --id YOUR_EMAIL                 # Retrieves user info by email. Copy the "id" value from the output and use it as PRINCIPAL_ID in the next command.

az cosmosdb sql role assignment create
    --account-name io-d-itn-common-cosno-01
    --resource-group io-d-itn-common-rg-01
    --scope "/" --principal-id PRINCIPAL_ID
    --role-definition-id
        00000000-0000-0000-0000-000000000002    # Grants read and write access to the dev CosmosDB.
```

### Install the Azure Functions Core Tools

To run Azure Functions locally, you need to install the Azure Functions Core Tools.
Please follow the official instructions here:

https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=macos%2Cisolated-process%2Cnode-v4%2Cpython-v2%2Chttp-trigger%2Ccontainer-apps&pivots=programming-language-javascript#install-the-azure-functions-core-tools

### Installation

```bash
pnpm install
```

### Tasks

At the root level, you can run the following commands:

```bash
pnpm test           # Run all unit tests (performed by vitest) for all projects and packages.

pnpm format         # Run code formatting (performed by prettier) for all projects and packages.

pnpm lint           # Run code linting (performed by ESLint) for all projects and packages without fixing errors or warnings.

pnpm lint:fix       # Run code linting (performed by ESLint) for all projects and packages, attempting to fix correctable errors/warnings.

pnpm build          # Run a build (performed by tsup-node) for all projects and packages. Build results are stored under the dist/ directory.

pnpm code-review    # Run typechecking, code linting, and unit testing for each project and package. This command ensures code quality in PRs.
```

You can also run specific commands using `pnpm --filter <package-selector>` for a specific project or package. Replace `PROJECT_NAME` with the actual project name:

```bash
# Typecheck

# Linting and formatting
pnpm --filter PROJECT_NAME run lint
pnpm --filter PROJECT_NAME run lint:fix
pnpm --filter PROJECT_NAME run format

# Unit testing
pnpm --filter PROJECT_NAME run test
pnpm --filter PROJECT_NAME run test:coverage # Not available for io-wallet-common

# Build
pnpm --filter PROJECT_NAME run build
pnpm --filter PROJECT_NAME run build:watch # Not available for io-wallet-common

# Start
pnpm --filter PROJECT_NAME run start # Not available for io-wallet-common
```

`PROJECT_NAME` can be one of the following:

- `io-wallet-support-func`
- `io-wallet-user-func`
- `io-wallet-common`
