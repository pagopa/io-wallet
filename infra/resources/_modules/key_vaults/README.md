# key_vaults

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
| <a name="module_key_vault_role_assignments"></a> [key\_vault\_role\_assignments](#module\_key\_vault\_role\_assignments) | github.com/pagopa-dx/terraform-azurerm-azure-role-assignments//modules/key_vault | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault.wallet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault) | resource |
| [azurerm_key_vault_access_policy.certificate_access](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_cdn_principal_id"></a> [cdn\_principal\_id](#input\_cdn\_principal\_id) | n/a | `string` | n/a | yes |
| <a name="input_ci_infra_principal_id"></a> [ci\_infra\_principal\_id](#input\_ci\_infra\_principal\_id) | Principal ID of CICD infra pipelines | `string` | n/a | yes |
| <a name="input_key_vault_certificates"></a> [key\_vault\_certificates](#input\_key\_vault\_certificates) | n/a | <pre>object({<br>    id                  = string<br>    name                = string<br>    resource_group_name = string<br>  })</pre> | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | Azure region | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | IO prefix and short environment | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be created | `string` | n/a | yes |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | n/a | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |
| <a name="input_tenant_id"></a> [tenant\_id](#input\_tenant\_id) | Tenant Id | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_key_vault_wallet"></a> [key\_vault\_wallet](#output\_key\_vault\_wallet) | n/a |
<!-- END_TF_DOCS -->
