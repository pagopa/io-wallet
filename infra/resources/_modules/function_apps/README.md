# function_apps

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
| <a name="module_function_app_support"></a> [function\_app\_support](#module\_function\_app\_support) | github.com/pagopa/dx//infra/modules/azure_function_app | main |
| <a name="module_function_app_support_autoscaler"></a> [function\_app\_support\_autoscaler](#module\_function\_app\_support\_autoscaler) | github.com/pagopa/dx//infra/modules/azure_app_service_plan_autoscaler | main |
| <a name="module_function_app_user_02"></a> [function\_app\_user\_02](#module\_function\_app\_user\_02) | github.com/pagopa/dx//infra/modules/azure_function_app | main |
| <a name="module_function_app_user_autoscaler_02"></a> [function\_app\_user\_autoscaler\_02](#module\_function\_app\_user\_autoscaler\_02) | github.com/pagopa/dx//infra/modules/azure_app_service_plan_autoscaler | main |

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault_secret.func_support_default_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_key_vault_secret.func_user_default_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_monitor_metric_alert.function_app_support_response_time](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.function_app_user_response_time](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_subnet_nat_gateway_association.func_support](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_nat_gateway_association) | resource |
| [azurerm_subnet_nat_gateway_association.func_user_02](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_nat_gateway_association) | resource |
| [azurerm_function_app_host_keys.support_func](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/function_app_host_keys) | data source |
| [azurerm_function_app_host_keys.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/function_app_host_keys) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_io_id"></a> [action\_group\_io\_id](#input\_action\_group\_io\_id) | Id of the Action Group shared among all IO teams | `string` | n/a | yes |
| <a name="input_action_group_wallet_id"></a> [action\_group\_wallet\_id](#input\_action\_group\_wallet\_id) | Id of the Action Group owned by the Wallet team | `string` | n/a | yes |
| <a name="input_application_insights_connection_string"></a> [application\_insights\_connection\_string](#input\_application\_insights\_connection\_string) | Application Insights instrumentation key | `string` | `null` | no |
| <a name="input_cidr_subnet_support_func"></a> [cidr\_subnet\_support\_func](#input\_cidr\_subnet\_support\_func) | CIDR block for support function app subnet | `string` | n/a | yes |
| <a name="input_cidr_subnet_user_func_02"></a> [cidr\_subnet\_user\_func\_02](#input\_cidr\_subnet\_user\_func\_02) | CIDR block for user function app subnet 02 | `string` | n/a | yes |
| <a name="input_cosmos_database_name"></a> [cosmos\_database\_name](#input\_cosmos\_database\_name) | Wallet Cosmos DB database name | `string` | n/a | yes |
| <a name="input_cosmos_db_endpoint"></a> [cosmos\_db\_endpoint](#input\_cosmos\_db\_endpoint) | Cosmos DB endpoint to use as application environment variable | `string` | n/a | yes |
| <a name="input_env_short"></a> [env\_short](#input\_env\_short) | Short environment | `string` | n/a | yes |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | Id of the common Key Vault where save secrets in | `string` | n/a | yes |
| <a name="input_key_vault_wallet_id"></a> [key\_vault\_wallet\_id](#input\_key\_vault\_wallet\_id) | Id of the wallet Key Vault where save secrets | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | Azure region | `string` | n/a | yes |
| <a name="input_nat_gateway_id"></a> [nat\_gateway\_id](#input\_nat\_gateway\_id) | NAT gateway Id | `string` | n/a | yes |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | IO Prefix | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group name of the private DNS zone to use for private endpoints | `string` | n/a | yes |
| <a name="input_private_endpoint_subnet_id"></a> [private\_endpoint\_subnet\_id](#input\_private\_endpoint\_subnet\_id) | Private Endpoints subnet Id | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | IO prefix and short environment | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be created | `string` | n/a | yes |
| <a name="input_revocation_queue_name"></a> [revocation\_queue\_name](#input\_revocation\_queue\_name) | Wallet Instance Revocation Queue Name | `string` | n/a | yes |
| <a name="input_storage_account_cdn_name"></a> [storage\_account\_cdn\_name](#input\_storage\_account\_cdn\_name) | Name of the CDN storage account | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |
| <a name="input_user_func"></a> [user\_func](#input\_user\_func) | Configuration of the user-func | <pre>object({<br/>    app_settings = list(object({<br/>      name                  = string<br/>      value                 = optional(string, "")<br/>      key_vault_secret_name = optional(string)<br/>    }))<br/>  })</pre> | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network to create subnet in | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_function_app_support"></a> [function\_app\_support](#output\_function\_app\_support) | n/a |
| <a name="output_function_app_user_02"></a> [function\_app\_user\_02](#output\_function\_app\_user\_02) | n/a |
<!-- END_TF_DOCS -->