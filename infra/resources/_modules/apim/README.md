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
| <a name="module_apim_v2_wallet_admin_product"></a> [apim\_v2\_wallet\_admin\_product](#module\_apim\_v2\_wallet\_admin\_product) | github.com/pagopa/terraform-azurerm-v4//api_management_product | v1.0.0 |
| <a name="module_apim_v2_wallet_app_product"></a> [apim\_v2\_wallet\_app\_product](#module\_apim\_v2\_wallet\_app\_product) | github.com/pagopa/terraform-azurerm-v4//api_management_product | v1.0.0 |
| <a name="module_apim_v2_wallet_pdnd_product"></a> [apim\_v2\_wallet\_pdnd\_product](#module\_apim\_v2\_wallet\_pdnd\_product) | github.com/pagopa/terraform-azurerm-v4//api_management_product | v1.0.0 |
| <a name="module_apim_v2_wallet_support_api"></a> [apim\_v2\_wallet\_support\_api](#module\_apim\_v2\_wallet\_support\_api) | git::https://github.com/pagopa/terraform-azurerm-v4//api_management_api | v1.0.0 |
| <a name="module_apim_v2_wallet_support_product"></a> [apim\_v2\_wallet\_support\_product](#module\_apim\_v2\_wallet\_support\_product) | github.com/pagopa/terraform-azurerm-v4//api_management_product | v1.0.0 |
| <a name="module_apim_v2_web_wallet_api"></a> [apim\_v2\_web\_wallet\_api](#module\_apim\_v2\_web\_wallet\_api) | git::https://github.com/pagopa/terraform-azurerm-v4//api_management_api | v1.0.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_api_management_api_operation_policy.get_current_wallet_instance_status_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_operation_policy.is_fiscal_code_whitelisted_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_operation_policy.set_wallet_instance_status_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_tag.wallet_support](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_tag) | resource |
| [azurerm_api_management_api_tag.wallet_web](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_tag) | resource |
| [azurerm_api_management_tag.wallet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_tag) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_apim"></a> [apim](#input\_apim) | APIM configuration variables | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>    id                  = string<br/>  })</pre> | n/a | yes |
| <a name="input_product_id"></a> [product\_id](#input\_product\_id) | Product ID | `string` | n/a | yes |
| <a name="input_project_legacy"></a> [project\_legacy](#input\_project\_legacy) | n/a | `string` | n/a | yes |
| <a name="input_revision"></a> [revision](#input\_revision) | Revision | `string` | `"v1"` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_apim_v2_web_wallet_api"></a> [apim\_v2\_web\_wallet\_api](#output\_apim\_v2\_web\_wallet\_api) | n/a |
<!-- END_TF_DOCS -->
