# storage_accounts

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | n/a |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | github.com/pagopa/dx//infra/modules/azure_storage_account | main |

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault_secret.st_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_storage_queue.wallet_instances_revocation_check](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_queue) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | Id of the alert action group | `string` | n/a | yes |
| <a name="input_app_name"></a> [app\_name](#input\_app\_name) | Azure app\_name | `string` | n/a | yes |
| <a name="input_domain"></a> [domain](#input\_domain) | Azure domain | `string` | n/a | yes |
| <a name="input_env_short"></a> [env\_short](#input\_env\_short) | IO env\_short | `string` | n/a | yes |
| <a name="input_instance_number"></a> [instance\_number](#input\_instance\_number) | Azure instance\_number | `string` | n/a | yes |
| <a name="input_key_vault_wallet_id"></a> [key\_vault\_wallet\_id](#input\_key\_vault\_wallet\_id) | Id of the wallet Key Vault where storage account saves secrets | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | Azure region | `string` | n/a | yes |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | IO prefix | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group of the Private DNS Zone used for private endpoints | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be created | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | Id of the private endpoints' subnet | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_revocation_queue_name"></a> [revocation\_queue\_name](#output\_revocation\_queue\_name) | n/a |
| <a name="output_wallet"></a> [wallet](#output\_wallet) | n/a |
<!-- END_TF_DOCS -->