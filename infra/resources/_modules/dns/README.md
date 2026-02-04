# dns

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
| [azurerm_dns_txt_record.cbor_wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record) | resource |
| [azurerm_dns_txt_record.proximity_wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record) | resource |
| [azurerm_dns_txt_record.wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |
| <a name="input_wallet_dns_zone_name"></a> [wallet\_dns\_zone\_name](#input\_wallet\_dns\_zone\_name) | DNS zone name for wallet | `string` | n/a | yes |
| <a name="input_wallet_dns_zone_resource_group_name"></a> [wallet\_dns\_zone\_resource\_group\_name](#input\_wallet\_dns\_zone\_resource\_group\_name) | Resource group name for wallet DNS zone | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
