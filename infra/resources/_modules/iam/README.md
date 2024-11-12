# iam

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

No providers.

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_admins_roles"></a> [admins\_roles](#module\_admins\_roles) | github.com/pagopa/dx//infra/modules/azure_role_assignments | main |
| <a name="module_func_app_support"></a> [func\_app\_support](#module\_func\_app\_support) | github.com/pagopa/dx//infra/modules/azure_role_assignments | main |
| <a name="module_func_app_support_slot"></a> [func\_app\_support\_slot](#module\_func\_app\_support\_slot) | github.com/pagopa/dx//infra/modules/azure_role_assignments | main |
| <a name="module_func_app_user_02"></a> [func\_app\_user\_02](#module\_func\_app\_user\_02) | github.com/pagopa/dx//infra/modules/azure_role_assignments | main |
| <a name="module_func_app_user_slot_02"></a> [func\_app\_user\_slot\_02](#module\_func\_app\_user\_slot\_02) | github.com/pagopa/dx//infra/modules/azure_role_assignments | main |

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_cdn_storage_account"></a> [cdn\_storage\_account](#input\_cdn\_storage\_account) | Storage Account Id used for CDN | <pre>object({<br>    id                  = string<br>    name                = string<br>    resource_group_name = string<br>  })</pre> | n/a | yes |
| <a name="input_cosmos_db"></a> [cosmos\_db](#input\_cosmos\_db) | n/a | <pre>object({<br>    id                  = string<br>    name                = string<br>    resource_group_name = string<br>    database_name       = string<br>    admin_ids           = set(string)<br>  })</pre> | n/a | yes |
| <a name="input_function_app"></a> [function\_app](#input\_function\_app) | Function App system assigned identities | <pre>object({<br>    user_func_02 = object({<br>      principal_id         = string<br>      staging_principal_id = string<br>    })<br>    support_func = object({<br>      principal_id         = string<br>      staging_principal_id = string<br>    })<br>  })</pre> | n/a | yes |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | KeyVault Id and list of Entra groups who are administrator of Key Vaults | <pre>object({<br>    id                  = string<br>    name                = string<br>    resource_group_name = string<br>    admin_ids           = set(string)<br>  })</pre> | n/a | yes |
| <a name="input_storage_account"></a> [storage\_account](#input\_storage\_account) | Generic Storage Account for Wallet uses | <pre>object({<br>    id                  = string<br>    name                = string<br>    resource_group_name = string<br>  })</pre> | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
