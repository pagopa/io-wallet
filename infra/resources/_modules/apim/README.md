# apim

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
| <a name="module_apim_v2_wallet_pdnd_api"></a> [apim\_v2\_wallet\_pdnd\_api](#module\_apim\_v2\_wallet\_pdnd\_api) | git::https://github.com/pagopa/terraform-azurerm-v4//api_management_api | v1.0.0 |
| <a name="module_apim_v2_wallet_pdnd_product"></a> [apim\_v2\_wallet\_pdnd\_product](#module\_apim\_v2\_wallet\_pdnd\_product) | github.com/pagopa/terraform-azurerm-v4//api_management_product | v1.0.0 |
| <a name="module_apim_v2_wallet_support_api"></a> [apim\_v2\_wallet\_support\_api](#module\_apim\_v2\_wallet\_support\_api) | git::https://github.com/pagopa/terraform-azurerm-v4//api_management_api | v1.0.0 |
| <a name="module_apim_v2_wallet_support_product"></a> [apim\_v2\_wallet\_support\_product](#module\_apim\_v2\_wallet\_support\_product) | github.com/pagopa/terraform-azurerm-v4//api_management_product | v1.0.0 |
| <a name="module_apim_v2_web_wallet_api"></a> [apim\_v2\_web\_wallet\_api](#module\_apim\_v2\_web\_wallet\_api) | git::https://github.com/pagopa/terraform-azurerm-v4//api_management_api | v1.0.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_api_management_api_operation_policy.get_current_wallet_instance_status_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_operation_policy.health_check_pdnd_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_operation_policy.set_wallet_instance_status_pdnd_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_operation_policy.set_wallet_instance_status_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_named_value.support_func_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_named_value) | resource |
| [azurerm_api_management_named_value.user_func_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_named_value) | resource |
| [azurerm_key_vault_secret.funciowallet_default](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.support_func_key_default](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_apim"></a> [apim](#input\_apim) | APIM configuration variables | <pre>object({<br>    name                = string<br>    resource_group_name = string<br>  })</pre> | n/a | yes |
| <a name="input_function_apps"></a> [function\_apps](#input\_function\_apps) | APIM configuration variables | <pre>object({<br>    user_function = object({<br>      function_hostname = string<br>    })<br>    support_function = object({<br>      function_hostname = string<br>    })<br>  })</pre> | n/a | yes |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | Key Vault ID | `string` | n/a | yes |
| <a name="input_key_vault_wallet_id"></a> [key\_vault\_wallet\_id](#input\_key\_vault\_wallet\_id) | Wallet Key Vault ID | `string` | n/a | yes |
| <a name="input_product_id"></a> [product\_id](#input\_product\_id) | Product ID | `string` | n/a | yes |
| <a name="input_project_legacy"></a> [project\_legacy](#input\_project\_legacy) | n/a | `string` | n/a | yes |
| <a name="input_revision"></a> [revision](#input\_revision) | Revision | `string` | `"v1"` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_apim_v2_web_wallet_api"></a> [apim\_v2\_web\_wallet\_api](#output\_apim\_v2\_web\_wallet\_api) | n/a |
<!-- END_TF_DOCS -->
