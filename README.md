# IO Wallet - Monorepo

### Introduction

Welcome! 😊

This is the `io-wallet` repository, a monorepo that use [NodeJS](https://nodejs.org/), [TypeScript](https://www.typescriptlang.org/), [fp-ts](https://gcanti.github.io/fp-ts/) and different [Azure SDKs](https://azure.github.io/azure-sdk/#javascript) for the IO Wallet app.

A monorepo is a single repository containing multiple different projects, with well-defined relationships and responsabilities. The `io-wallet` monorepo contains two main projects under the `app/` folder, present in the root directory of the monorepo:

- `io-wallet-support-func`: it contains all functionalities for assistance and support. It's a simple backend.
- `io-wallet-user-func`: it contains all functionalities used by the IO Wallet app end users. It's a complex backend.

It's strongly recommended to start looking at the code and understanding how Azure functions work from the `io-wallet-support-func` project, even just to have a basic overview. The `io-wallet` monorepo contains a package also, called `io-wallet-common`, present into the `packages/` folder, present in the root directory of the monorepo: this package is used by all two previous projects and it's very important for these. You can see the `io-wallet-common` package like a local NPM package that includes all the common functionalities and utilities of both the `io-wallet-support-func` and `io-wallet-message-func` projects.

Each project has an own `README.md` file that includes these sections:

- **Introduction**: a small introduction to the project.
- **Prerequisites**: OS (Operatign Systems) packages necessary and recommended.
- **Installation**: show the right command to install all dependencies.
- **Configuration**: show and explain the environment variables file, in a detailed way also.
- **Useful Commands**: show a list of useful command, necessary to have a complete overview of the specific project.
- **Quickstart**: a minimal and essential tutorial to make the project operational in a very short time, without going into a lot of explanations!

It is recommended that you read the README.md files of both projects only after reading the current README. In according to this monorepo, in this codepase you can find the `io-wallet.code-workspace` file, a small [JSON](https://www.json.org/) that includes some informations about the location of all projects and packages included in this monorepo. Moreover, in according to the Turborepo documentation, you can find the `turbo.json` file, that includes all necessary configurations about the `turbo` command. Another reference to the existence of multiple node projects is present in the `package.json` file: there is an attribute called `"workspace"`, inside which there are the directories of the two projects (`io-wallet-support-func` and `io-wallet-user-func`) and the package (`io-wallet-common`) present in this monorepo.

A small overview of the most NPM packages used in this monorepo is the following list:

- [typescript](https://classic.yarnpkg.com/en/package/typescript)
- [fp-ts](https://classic.yarnpkg.com/en/package/fp-ts)
- [eslint](https://classic.yarnpkg.com/en/package/eslint)
- [prettier](https://classic.yarnpkg.com/en/package/prettier)
- [@azure/functions](https://classic.yarnpkg.com/en/package/@azure/functions)
- [@azure/identity](https://classic.yarnpkg.com/en/package/@azure/identity)
- [@azure/cosmos](https://classic.yarnpkg.com/en/package/@azure/cosmos)
- [tsup](https://classic.yarnpkg.com/en/package/tsup)
- [vitest](https://classic.yarnpkg.com/en/package/vitest)

This project uses [Yarn](https://classic.yarnpkg.com/) as depndencies manager and [Turborepo](https://turbo.build/repo/docs) as monorepo manager. Before continuing to read, it is strongly recommended to read both documentations, especially the Turbo one.

All the projects present in this monorepo are strongly correlated to different [Azure Cloud](https://learn.microsoft.com/en-us/azure/?product=popular) Resources, all available by logging in with your user name directly to the Azure portal. The two most important Azure resources used by this service are [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/) and [Azure CosmosDB](https://learn.microsoft.com/en-us/azure/cosmos-db/). In this case also, before continuing to read, it's strongly recommended to read the relevant documentation.

There are many other things to talk about, however they are not essential to start writing code. However, here is a list of topics to learn in order to fully understand all the files and the context in which this monorepo operates:

- [Git](https://git-scm.com/), the most used VCS (Version Control System) in the world.
- [GitHub](https://github.com/), the most used HVCS (Hosting VCS) in the world.
- [GitHub Workflows](https://docs.github.com/en/actions/writing-workflows), to trigger well-structured workflows and pipelines depending on events happening within the repository.
- [Terraform](https://www.terraform.io/) a very useful tool to automate the infrastructure deployment and manage resources in any cloud, or data center in the world. In this monorepo, you can find more info about the infrastructure under the `infra/` directory.
- [Changesets](https://github.com/changesets/changesets/tree/main#readme), for automated management of NPM packages and releases.

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

### Useful Commands

At the monorepo level, you can run the following commands:

```bash
yarn test           # [Description]
                    #       Run all unit tests (performed by vitest) for all projects and packages
                    # [Aliases]
                    #       yarn run test


yarn format         # [Description]
                    #       Run a code formatting (performed by prettier) for all projects and pakcages.
                    # [Aliases]
                    #       yarn run format


yarn lint           # [Description]
                    #       Run a code lint (performed by ESLint) for all projects and pakcages, but without
                    #       fixing any errors, or warnings found
                    # [Aliases]
                    #       yarn run lint


yarn lint:fix       # [Description]
                    #       Run a code lint (performed by ESLint) for all projects and pakcages, trying to fix any
                    #       errors/warnings that are correctable.
                    # [Aliases]
                    #       yarn run lint:fix


yarn build          # [Description]
                    #       Run a build (performed by tsup-node) for all projects and packages. The build
                    #       results, for each project (or package), are stored under the dist/ directory,
                    #       in the root directory of the project.
                    # [Aliases]
                    #       yarn run build


yarn version        # [Description]
                    #       Thanks to the @changesets/cli NPM package, this command updates all the package present in the package.json file.
                    # [Aliases]
                    #       yarn run version


yarn release        # [Description]
                    #       Thanks to the @changesets/cli NPM package, you can generate in a easy way consistent versions of your packages.
                    # [Aliases]
                    #       yarn run release


yarn code-review    # [Description]
                    #       This command, for each project and package, runs a kind of "pipeline" (in a local environment) with the following steps:
                    #       typechecking (with typecheck), code linting (with eslint) and unit testing (with vitest). This is a very useful command
                    #       to pass the workflow controls (very similar) when you create a PR, or push new code in an existing PR.
                    # [Aliases]
                    #       yarn run code-review
```

Moreover, you can run a specific command using `yarn workspace` for a specific and only one project, or package. In the following list, there are the main commands you can run (replace the `PROJECT_NAME` string to the effective project name):

```bash
# typecheck

# linting and formatting
yarn workspace PROJECT_NAME run lint
yarn workspace PROJECT_NAME run lint:fix
yarn workspace PROJECT_NAME run format

# unit testing
yarn workspace PROJECT_NAME run test
yarn workspace PROJECT_NAME run test:coverage # not available for io-wallet-common

# build
yarn workspace PROJECT_NAME run build
yarn workspace PROJECT_NAME run build:watch # not available for io-wallet-common

# start
yarn workspace PROJECT_NAME run start # not available for io-wallet-common
```

`PROJECT_NAME` can be one of the following projects: `io-wallet-support-func`, `io-wallet-user-func` and `io-wallet-common`.
