# storage_accounts

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | n/a |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_metric_alert.storage_account_health_check](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_private_endpoint.storage_account_common_blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.storage_account_common_blob_uat](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.storage_account_common_queue](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.storage_account_common_queue_uat](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_storage_account.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account.common_uat](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_queue.wallet-instance-creation-email-queue-01](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_queue) | resource |
| [azurerm_storage_queue.wallet-instance-creation-email-queue-uat](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_queue) | resource |
| [azurerm_storage_queue.wallet-instance-revocation-email-queue-01](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_queue) | resource |
| [azurerm_storage_queue.wallet-instance-revocation-email-queue-uat](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_queue) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | Id of the alert action group | `string` | n/a | yes |
| <a name="input_customer_managed_key_url"></a> [customer\_managed\_key\_url](#input\_customer\_managed\_key\_url) | URL of the customer managed key to encrypt the Storage Account | `string` | `null` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | n/a | <pre>object({<br/>    prefix          = string<br/>    environment     = string<br/>    location        = string<br/>    name            = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_private_endpoint"></a> [private\_endpoint](#input\_private\_endpoint) | Configuration for the Private Endpoints | <pre>object({<br/>    subnet_pep_id             = string<br/>    blob_private_dns_zone_id  = string<br/>    queue_private_dns_zone_id = string<br/>  })</pre> | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be created | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |
| <a name="input_u_env_short"></a> [u\_env\_short](#input\_u\_env\_short) | IO uat env\_short | `string` | n/a | yes |
| <a name="input_user_assigned_managed_identity_id"></a> [user\_assigned\_managed\_identity\_id](#input\_user\_assigned\_managed\_identity\_id) | Id of the user-assigned managed identity to associate to Storage Accounts | `string` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_wallet"></a> [wallet](#output\_wallet) | n/a |
| <a name="output_wallet_instance_creation_email_queue_name_01"></a> [wallet\_instance\_creation\_email\_queue\_name\_01](#output\_wallet\_instance\_creation\_email\_queue\_name\_01) | n/a |
| <a name="output_wallet_instance_revocation_email_queue_name_01"></a> [wallet\_instance\_revocation\_email\_queue\_name\_01](#output\_wallet\_instance\_revocation\_email\_queue\_name\_01) | n/a |
| <a name="output_wallet_uat"></a> [wallet\_uat](#output\_wallet\_uat) | n/a |
<!-- END_TF_DOCS -->
