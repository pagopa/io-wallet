# IO Wallet - Resources

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azapi"></a> [azapi](#requirement\_azapi) | ~> 2.0 |
| <a name="requirement_azuread"></a> [azuread](#requirement\_azuread) | <= 2.50.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azuread"></a> [azuread](#provider\_azuread) | 2.50.0 |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.54.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_admins_roles"></a> [admins\_roles](#module\_admins\_roles) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_apim_itn"></a> [apim\_itn](#module\_apim\_itn) | ../_modules/apim | n/a |
| <a name="module_cosmos"></a> [cosmos](#module\_cosmos) | ../_modules/cosmos | n/a |
| <a name="module_dns"></a> [dns](#module\_dns) | ../_modules/dns | n/a |
| <a name="module_ids"></a> [ids](#module\_ids) | ../_modules/identities | n/a |
| <a name="module_key_vault_certificate_infra_cd"></a> [key\_vault\_certificate\_infra\_cd](#module\_key\_vault\_certificate\_infra\_cd) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_key_vault_certificate_infra_ci"></a> [key\_vault\_certificate\_infra\_ci](#module\_key\_vault\_certificate\_infra\_ci) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |
| <a name="module_key_vaults"></a> [key\_vaults](#module\_key\_vaults) | ../_modules/key_vaults | n/a |
| <a name="module_monitoring"></a> [monitoring](#module\_monitoring) | ../_modules/monitoring | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_api_management_api.wallet_user_ioapp_v1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api) | resource |
| [azurerm_api_management_api.wallet_user_uat_ioapp_v1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api) | resource |
| [azurerm_api_management_api_operation_policy.health_check_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_operation_policy.health_check_uat_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_policy.wallet_user_uat_v1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_policy) | resource |
| [azurerm_api_management_api_policy.wallet_user_v1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_policy) | resource |
| [azurerm_api_management_api_tag.wallet_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_tag) | resource |
| [azurerm_api_management_api_tag.wallet_user_uat](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_tag) | resource |
| [azurerm_api_management_api_version_set.wallet_user_ioapp](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_version_set) | resource |
| [azurerm_api_management_api_version_set.wallet_user_uat_ioapp](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_version_set) | resource |
| [azurerm_api_management_backend.wallet_user_psn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_backend) | resource |
| [azurerm_api_management_backend.wallet_user_uat_psn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_backend) | resource |
| [azurerm_api_management_product.wallet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_product) | resource |
| [azurerm_api_management_product_api.wallet_user_uat_v1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_product_api) | resource |
| [azurerm_api_management_product_api.wallet_user_v1](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_product_api) | resource |
| [azurerm_api_management_tag.wallet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_tag) | resource |
| [azurerm_cosmosdb_sql_container.leases](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_container) | resource |
| [azurerm_dns_cname_record.wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record) | resource |
| [azurerm_dns_txt_record.wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record) | resource |
| [azurerm_key_vault_secret.app_insights_connection_string](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_private_dns_zone.internal_wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone_virtual_network_link.vnet_common_internal_wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link) | resource |
| [azurerm_role_assignment.infra_cd_subscription_rbac_admin](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azuread_group.eng_admins](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azuread_group.wallet_admins](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azuread_service_principal.psn_app_id](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/service_principal) | data source |
| [azurerm_api_management.apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/api_management) | data source |
| [azurerm_api_management.platform_api_gateway](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/api_management) | data source |
| [azurerm_application_insights.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/application_insights) | data source |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_dns_zone.io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/dns_zone) | data source |
| [azurerm_dns_zone.wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/dns_zone) | data source |
| [azurerm_key_vault.certificates](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |
| [azurerm_key_vault_secret.notification_email](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_key_vault_secret.notification_slack](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_monitor_action_group.io](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/monitor_action_group) | data source |
| [azurerm_private_dns_zone.privatelink_documents](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_resource_group.wallet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_resource_group.weu_common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_resource_group.weu_sec](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |
| [azurerm_user_assigned_identity.infra_cd_id](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/user_assigned_identity) | data source |
| [azurerm_user_assigned_identity.infra_ci_id](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/user_assigned_identity) | data source |
| [azurerm_virtual_network.vnet_common_itn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
