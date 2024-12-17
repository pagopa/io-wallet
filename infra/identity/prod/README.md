# IO Wallet - GitHub federated Managed Identities

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | <= 3.117.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 3.117.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_app_federated_identities"></a> [app\_federated\_identities](#module\_app\_federated\_identities) | github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github | main |
| <a name="module_federated_identities"></a> [federated\_identities](#module\_federated\_identities) | github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github | main |
| <a name="module_opex_federated_identities"></a> [opex\_federated\_identities](#module\_opex\_federated\_identities) | github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github | main |

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault_access_policy.cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_key_vault_access_policy.ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_key_vault.weu_common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |
| [azurerm_resource_group.weu_common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
