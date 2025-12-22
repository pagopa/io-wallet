# IT-Wallet - PagoPA - PROD

This directory contains the Terraform configuration used to create the Private Endpoint in the IO virtual network that exposes the PSN Application Gateway to IO virtual network.

> **_WARNING:_**
> This configuration depends on the PSN Hub configuration in [../../psn/hub/prod](../../psn/hub/prod/). 
> Any change to the Application Gateway must be applied there first, and only afterwards to the Private Endpoint defined in this directory. Make sure you read the Hub documentation in [../../psn/hub/prod/README.md](../../psn/hub/prod/README.md) before working here.

## Purpose

When a product needs to reach PSN services through the PSN Application Gateway from its own virtual network, it must do so over a private and controlled path. This directory defines the reference pattern for IT-Wallet: a Private Endpoint within the IO virtual network bound to the private frontend IP of the PSN Application Gateway.

> **_INFO:_**
> Other products that need to consume PSN services from their own virtual networks can replicate this same pattern.

## List of Resources

- Private Endpoint in the IO virtual network linked to the PSN Application Gateway
- A record in the IO private DNS zone to resolve the Application Gateway FQDN to the private IP assigned to the Private Endpoint

### Private Endpoint to PSN Application Gateway

The PSN Application Gateway exposes both a public and a private IP. To connect to the private IP from the IO virtual network, this configuration creates a Private Endpoint in the IO virtual network linked to the Application Gateway Private Link.

The following attributes of the Private Endpoint are particularly important:

- `is_manual_connection = true`: because the Private Endpoint is cross-tenant, the connection request must be manually approved by a PSN tenant user;
- `private_connection_resource_id`: the resource ID of the PSN Application Gateway exposed via Private Link;
- `subresource_names = ["appGwPrivateFrontendIp"]`: indicates that the Private Endpoint is linked to the private frontend IP of the Application Gateway. The value `appGwPrivateFrontendIp` is the name of the private frontend IP [configured on the Application Gateway](https://github.com/pagopa/io-wallet/blob/97b77caf37c69a69c8d3e3452b7acff7f7ece3a4/infra/core/psn/hub/prod/appgw.tf#L8);
- `request_message`: a description that will be shown to the PSN tenant user when they receive the connection request.

Once this Terraform configuration has been applied and the connection request has been approved by a PSN tenant user, workloads in the IO virtual network can reach the PSN Application Gateway through the Private Endpoint.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.55.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_private_dns_a_record.psn_application_gateway](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record) | resource |
| [azurerm_private_endpoint.psn_application_gateway](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.internal_wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_resource_group.common_itn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_virtual_network.vnet_common_itn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
