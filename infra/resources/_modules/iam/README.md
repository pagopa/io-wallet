# iam

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

No providers.

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_admins_roles"></a> [admins\_roles](#module\_admins\_roles) | pagopa/dx-azure-role-assignments/azurerm | ~>0 |
| <a name="module_func_app_support"></a> [func\_app\_support](#module\_func\_app\_support) | pagopa/dx-azure-role-assignments/azurerm | ~>0 |
| <a name="module_func_app_support_slot"></a> [func\_app\_support\_slot](#module\_func\_app\_support\_slot) | pagopa/dx-azure-role-assignments/azurerm | ~>0 |
| <a name="module_func_app_user_02"></a> [func\_app\_user\_02](#module\_func\_app\_user\_02) | pagopa/dx-azure-role-assignments/azurerm | ~>0 |
| <a name="module_func_app_user_slot_02"></a> [func\_app\_user\_slot\_02](#module\_func\_app\_user\_slot\_02) | pagopa/dx-azure-role-assignments/azurerm | ~>0 |

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_admin_ids"></a> [admin\_ids](#input\_admin\_ids) | Id of the Entra ID group with admin roles | `set(string)` | n/a | yes |
| <a name="input_cdn_storage_account"></a> [cdn\_storage\_account](#input\_cdn\_storage\_account) | Storage Account Id used for CDN | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_cosmos_db_02"></a> [cosmos\_db\_02](#input\_cosmos\_db\_02) | n/a | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    resource_group_name = string<br/>    database_name       = string<br/>  })</pre> | n/a | yes |
| <a name="input_function_app"></a> [function\_app](#input\_function\_app) | Function App system assigned identities | <pre>object({<br/>    user_func_02 = object({<br/>      principal_id         = string<br/>      staging_principal_id = string<br/>    })<br/>    support_func = object({<br/>      principal_id         = string<br/>      staging_principal_id = string<br/>    })<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | KeyVault Id and list of Entra groups who are administrator of Key Vaults | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_storage_account"></a> [storage\_account](#input\_storage\_account) | Generic Storage Account for Wallet uses | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
