# io-wallet
EUDI Wallet and Italian Wallet implementation for App IO


## Prerequisites

In order to run the applications locally you need the following tool installed on your machine.

- `Node.js`
- `yarn`

The preferred way to set up the local environment is using [nodenv](https://github.com/nodenv/nodenv) to manage `Node.js` installation and `corepack` (included with `Node.js`) to manage the installation of `yarn`.
Please refer to `.node-version` for the actual runtime version used.


## Release management

This project uses [changesets](https://github.com/changesets/changesets) to automate updating package versions, and changelogs.

Each Pull Request that includes changes that require a version bump should include a `changeset` file that describe that changes.

To create a new `changeset` file run the following command from the project root:

```bash
yarn changeset
```

## Useful commands

This project uses `yarn@3` with workspaces to manage projects and dependencies. Here is a list of useful commands to work in this repo.

### Work with workspaces

```bash
# to execute COMMAND on WORKSPACE_NAME
yarn workspace WORKSPACE_NAME run command
# to execute COMMAD on all workspaces
yarn workspace foreach run command

# run unit tests on my-package
yarn workspace my-package run test

# run the typecheck script on all workspaces
yarn workspaces foreach run typecheck

# generate the API models for all workspaces
yarn workspaces foreach run generate:api-models
```

### Add dependencies

```bash
# add a dependency to the workspace root
yarn add turbo

# add a jest as dev dependency on my-package
yarn workspace my-package add -D jest

# add io-ts as dependency on each workspace
yarn workspace foreach add io-ts
```

### Stand-alone workspaces
Some workspaces don't cope well with `yarn workspace` and its dependency hoisting structure. Such packages are under `packages-sa` (`sa` stands for stand-alone); they have their own dependency set (that is: a dedicated `node_module` folder).
Being they are not listed as workspaces, they have the following limitations:
* `turbo` cannot be used to run commands on them; it must `cd` into the specific folder and treat them as a usual package
* they cannot be referenced by other workspaces before being distributed to public registries

## Infrastructure resources

Resources are defined using `Terraform` into `/infra`. 

### Configure environment

`/infra/env` contains the configuration for the different environments the applications must be deployed on. Each subdirectory is an environemnt; the name of the subdirectory is the name of the environment. Each environment contains:
* `backend.ini`, in which we set the subscription to work on;
* `backend.tfvars`, where we reference the remote storage to keep the terraform state into;
* `terraform.tfvars`, where developers can set actual infrastructure variables.

### Infrastructure-as-code
Terraform code files are meant to be into `/infra/src`. Files must be in the same directory, that is there cannot be subdirectories.
The `main.ts` file initialize the required provider.

### Run Terraform commands

The script `/infra/terraform.sh` is a wrapper over the `terraform` CLI that:
* load the configuration for the selected environment
* connect to the remote storage for the Terraform state
* execute the command

To run a command, follow the pattern:
```sh
./infra/terraform.sh <command> <environment>
```

examples:
```sh
# Run plan on prod environment
./infra/terraform.sh plan prod 

# Run apply on dev environment
./infra/terraform.sh apply dev
```

### Precommit checks

Check your code before commit.

https://github.com/antonbabenko/pre-commit-terraform#how-to-install

```sh
pre-commit run -a
```
