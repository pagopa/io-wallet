# iam

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
| <a name="module_admins_roles"></a> [admins\_roles](#module\_admins\_roles) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_func_app_support"></a> [func\_app\_support](#module\_func\_app\_support) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_func_app_support_slot"></a> [func\_app\_support\_slot](#module\_func\_app\_support\_slot) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_func_app_user"></a> [func\_app\_user](#module\_func\_app\_user) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_func_app_user_slot"></a> [func\_app\_user\_slot](#module\_func\_app\_user\_slot) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_func_app_user_uat"></a> [func\_app\_user\_uat](#module\_func\_app\_user\_uat) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_func_app_user_uat_slot"></a> [func\_app\_user\_uat\_slot](#module\_func\_app\_user\_uat\_slot) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_key_vault_certificate_cdn"></a> [key\_vault\_certificate\_cdn](#module\_key\_vault\_certificate\_cdn) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_key_vault_certificate_infra_cd"></a> [key\_vault\_certificate\_infra\_cd](#module\_key\_vault\_certificate\_infra\_cd) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_key_vault_certificate_infra_ci"></a> [key\_vault\_certificate\_infra\_ci](#module\_key\_vault\_certificate\_infra\_ci) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_key_vault_infra"></a> [key\_vault\_infra](#module\_key\_vault\_infra) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |

## Resources

| Name | Type |
|------|------|
| [azurerm_role_assignment.func_app_user_cdn_endpoint_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_subscription_rbac_admin](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_admin_ids"></a> [admin\_ids](#input\_admin\_ids) | Id of the Entra ID group with admin roles | `set(string)` | n/a | yes |
| <a name="input_application_gateway_id"></a> [application\_gateway\_id](#input\_application\_gateway\_id) | Application Gateway resource ID | `string` | `null` | no |
| <a name="input_cdn_endpoint_id"></a> [cdn\_endpoint\_id](#input\_cdn\_endpoint\_id) | CDN endpoint id | `string` | n/a | yes |
| <a name="input_cdn_frontdoor"></a> [cdn\_frontdoor](#input\_cdn\_frontdoor) | Whether the CDN is Front Door or not | `string` | `"false"` | no |
| <a name="input_cdn_principal_id"></a> [cdn\_principal\_id](#input\_cdn\_principal\_id) | Principal ID of the CDN managed identity | `string` | n/a | yes |
| <a name="input_cdn_storage_account"></a> [cdn\_storage\_account](#input\_cdn\_storage\_account) | Storage Account Id used for CDN | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_cicd_principal_ids"></a> [cicd\_principal\_ids](#input\_cicd\_principal\_ids) | Principal ID of CICD pipelines | <pre>object({<br/>    infra = object({<br/>      ci = string<br/>      cd = string<br/>    })<br/>    app = object({<br/>      ci = optional(string, "")<br/>      cd = string<br/>    })<br/>  })</pre> | n/a | yes |
| <a name="input_cosmos_db"></a> [cosmos\_db](#input\_cosmos\_db) | n/a | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>    database_name       = string<br/>  })</pre> | n/a | yes |
| <a name="input_cosmos_db_uat"></a> [cosmos\_db\_uat](#input\_cosmos\_db\_uat) | n/a | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>    database_name       = string<br/>  })</pre> | n/a | yes |
| <a name="input_function_app"></a> [function\_app](#input\_function\_app) | Function App system assigned identities | <pre>object({<br/>    user_func = object({<br/>      principal_id         = string<br/>      staging_principal_id = string<br/>    })<br/>    support_func = object({<br/>      principal_id         = string<br/>      staging_principal_id = string<br/>    })<br/>    user_func_uat = object({<br/>      principal_id         = string<br/>      staging_principal_id = string<br/>    })<br/>  })</pre> | n/a | yes |
| <a name="input_is_psn"></a> [is\_psn](#input\_is\_psn) | Temporary variable to manage both IO and PSN resources | `bool` | `false` | no |
| <a name="input_key_vault_app"></a> [key\_vault\_app](#input\_key\_vault\_app) | KeyVault Id and list of Entra groups who are administrator of Key Vaults | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault_certificates"></a> [key\_vault\_certificates](#input\_key\_vault\_certificates) | Key Vault used to store certificates for CDN | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_storage_account"></a> [storage\_account](#input\_storage\_account) | Generic Storage Account for Wallet uses | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_storage_account_uat"></a> [storage\_account\_uat](#input\_storage\_account\_uat) | Generic Storage Account for Wallet UAT uses | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | Azure Subscription Id | `string` | n/a | yes |
| <a name="input_wallet_dns_zone_id"></a> [wallet\_dns\_zone\_id](#input\_wallet\_dns\_zone\_id) | wallet.io.pagopa.it DNS zone id | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
