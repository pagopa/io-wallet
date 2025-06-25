# cdn

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azapi"></a> [azapi](#provider\_azapi) | n/a |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | n/a |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_cdn_endpoint.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_endpoint) | resource |
| [azurerm_cdn_endpoint_custom_domain.cdn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_endpoint_custom_domain) | resource |
| [azurerm_cdn_profile.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_profile) | resource |
| [azurerm_monitor_diagnostic_setting.cdn_profile](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_monitor_metric_alert.storage_account_low_availability](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_storage_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account_static_website.cdn_website](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_static_website) | resource |
| [azurerm_storage_container.exchange](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container) | resource |
| [azurerm_storage_container.hub-spid-login](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container) | resource |
| [azurerm_storage_container.pdnd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container) | resource |
| [azurerm_storage_container.well_known](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_container) | resource |
| [azapi_resource.cdn_profile](https://registry.terraform.io/providers/azure/azapi/latest/docs/data-sources/resource) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_io_id"></a> [action\_group\_io\_id](#input\_action\_group\_io\_id) | Id of the Action Group shared among all IO teams | `string` | n/a | yes |
| <a name="input_action_group_wallet_id"></a> [action\_group\_wallet\_id](#input\_action\_group\_wallet\_id) | Id of the Action Group owned by the Wallet team | `string` | n/a | yes |
| <a name="input_key_vault_certificate_secret_id"></a> [key\_vault\_certificate\_secret\_id](#input\_key\_vault\_certificate\_secret\_id) | Secret Id of the key vault that contains the CDN certificate | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | Azure region | `string` | n/a | yes |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | Log Analytics Workspace id | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | IO prefix and short environment | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be created | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_cdn_endpoint_id"></a> [cdn\_endpoint\_id](#output\_cdn\_endpoint\_id) | n/a |
| <a name="output_cdn_principal_id"></a> [cdn\_principal\_id](#output\_cdn\_principal\_id) | n/a |
| <a name="output_storage_account_cdn"></a> [storage\_account\_cdn](#output\_storage\_account\_cdn) | n/a |
<!-- END_TF_DOCS -->
