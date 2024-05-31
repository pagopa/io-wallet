# IO Wallet - GitHub federated Managed Identities

<!-- markdownlint-disable -->
<!-- BEGINNING OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | <= 3.105.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 3.97.1 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_app_federated_identities"></a> [app\_federated\_identities](#module\_app\_federated\_identities) | github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github | main |
| <a name="module_federated_identities"></a> [federated\_identities](#module\_federated\_identities) | github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github | main |

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault_access_policy.cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_key_vault_access_policy.ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_key_vault.weu-common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |
| [azurerm_resource_group.weu-common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
