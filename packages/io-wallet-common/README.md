# IO Wallet - Common Package

### Introduction

Welcome! 😊

This is the `io-wallet-common`, a NPM package made in [NodeJS](https://nodejs.org/), [TypeScript](https://www.typescriptlang.org/), [fp-ts](https://gcanti.github.io/fp-ts/) and different [Azure SDKs](https://azure.github.io/azure-sdk/#javascript) for the IO Wallet app. This package is used by both the `io-wallet-support-func` and `io-wallet-user-func` projects.

This project uses the main fllowing NPM packages:

- [typescript](https://classic.yarnpkg.com/en/package/typescript)
- [fp-ts](https://classic.yarnpkg.com/en/package/fp-ts)
- [eslint](https://classic.yarnpkg.com/en/package/eslint)
- [prettier](https://classic.yarnpkg.com/en/package/prettier)
- [@azure/cosmos](https://classic.yarnpkg.com/en/package/@azure/cosmos)
- [io-ts](https://classic.yarnpkg.com/en/package/io-ts)
- [@pagopa/handler-kit](https://classic.yarnpkg.com/en/package/@pagopa/handler-kit)
- [@pagopa/ts-commons](https://classic.yarnpkg.com/en/package/@pagopa/ts-commons)
- [@pagopa/logger](https://classic.yarnpkg.com/en/package/@pagopa/logger)
- [vitest](https://classic.yarnpkg.com/en/package/vitest)
- [applicationinsights](https://classic.yarnpkg.com/en/package/applicationinsights)

This project uses [Yarn](https://classic.yarnpkg.com/) as dependencies manager. This project is a simple package that is seen as a "container" (NPM package) by all projects that use it. Both projects that are part of this monorepo use `io-wallet-common`.

### Prerequisites

The following dependencies are strongly required:

- Node ^20.13
- Yarn ^4

### Installation

```bash
yarn
# or
yarn install
```

### Useful Commands

```bash
yarn typecheck      # [Description]
                    #       Run the typecheck of the codebase
                    # [Aliases]
                    #       yarn run typecheck


yarn test           # [Description]
                    #       Run all unit tests (performed by vitest) present in the codebase
                    # [Aliases]
                    #       yarn run test


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
                    #       yarn run build
```

### Adding io-wallet-common to Other Project

Before following the steps below:

- Make sure your Node version is as specified in the `.node-version` file.
- Make sure you've build the `io-wallet-common` package at the monorepo level. This is a very important package for the `io-wallet-support-func`.

To allow all the other projects to use the `io-wallet-common` package, you must follow these steps:

```bash
# step 1 - installing all dependencies and creating the node_modules/ directory
yarn

# step 2 - building the project and creating the dist/ directory
yarn build

# step 3 - renaming the dist/ folder to io-wallet-common/
mv dist io-wallet-common

# step 4 - copy the io-wallet-common/ folder into the node_modules/ folder of the target project
# in this case, you must change PROJECT_PATH to the relative (or absolute also) path of the project
cp io-wallet-common/ PROJECT_PATH/node_modules
```
