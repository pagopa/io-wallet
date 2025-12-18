# IT-Wallet - PSN Hub - PROD

This directory contains the Terraform code to deploy changes to PSN Hub infrastructure. Most of the resources have been deployed by PSN itself on behalf of IT-Wallet project and then imported as terraform code in [this repository folder](http://github.com/pagopa/io-wallet/tree/master/infra/core/psn/hub/prod), so it was not possible to adhere to PagoPA naming conventions.

This configuration stores the state file on the spoke Storage Account as currently we do not have permissions to add role assignments on the hub subscription.

## Environment description

In Hub and Spoke architecture, the Hub is a central virtual network that acts as a common point of connectivity to other networks, the Spokes. The Spokes are virtual networks that peer with the Hub and host the application resources.

There is a central Hub for the entire organization, and therefore **must not be tied within the IT-Wallet project**. Each Spoke represents a project.

The **Hub is the only component that has access to internet**. In fact, each Spoke routes all its internet-bound traffic to the Hub, which filters it through a firewall. By default, this firewall blocks any egress connection which is not specified in the allowed rules.

> **_WARNING:_** This may cause issues when deploying services in the Spoke. Sometimes, the deployment process needs to download packages or configurations from internet or other Azure services managed by the platfrom itself. In such cases, it is necessary to create specific allow rules in the Hub firewall to enable the required connections. To update rules, contact PSN support.

## List of resources

- Application Gateway
- Private DNS zones
- VPN configuration

### Application Gateway

The Application Gateway is the only component exposed to internet, and it is the only open door for accessing services hosted in the Spoke.
It is configured with both a public and private IP addresses. The public IP is used to receive incoming requests from internet, while the private IP is used for private communication from other PagoPA services.

The private communication is configured via a Private Link. The Private Link allows any PagoPA product to create a Private Endpoint in its own virtual network, linked to it. This way, the product can access the services hosted behind the Application Gateway without going through internet.

#### Configuring the Private Endpoint with the Private Link

To setup a Private Endpoint linked to the Application Gateway Private Link, follow these steps:

> **_NOTE:_** The steps below shows how to do things via Azure Portal, but they must be done via Terraform in your product repository.

1. Identify the Application Gateway Private Link resource ID. It can be found in the output of this Terraform configuration, or by querying Azure directly in the Hub subscription.
2. Create the Private Endpoint in your product virtual network with the following configuration:
   - In the "Resource" tab, select "Connect to an Azure resource by resource ID or alias.".
   - In Resource ID, past the value you note in step 1.
   - As "Target sub-resource", type "appGwPrivateFrontendIp".
   - As "Request message", type something meaningful which explains what and why you are connecting resources.
   - In the "Virtual Network" tab, select your product Virtual Network and related subnet.
   - Set Tags as needed.
   - Create the Private Endpoint.
3. When the Private Endpoint creation will be completed, you need to approve the connection from the Hub side. To do that, go to the Private Link Center in Azure Portal, select "Pending Connections", find your request and approve it.

Your product can now access the Application Gateway, via the private IP address.

#### Configuring the DNS for the Private Endpoint

To resolve the Application Gateway private IP address from your product virtual network, you need to configure DNS properly:

> **_INFO:_** The steps below shows how to do things via Azure Portal, but they must be done via Terraform in your product repository.

> **_WARNING:_** The names suggested below are not mandatory but they provide consistency across products. It is therefore strongly recommended to follow them.

1. Create an Private DNS zone on your product side with the name `internal.<your-domain>.pagopa.it`
2. Create an A record in the Private DNS zone created in step 1, with the name `psn` and the private IP address of the Private Endpont created in the previous section.
3. Link the Private DNS zone to your product virtual network.

Your product can now resolve the Application Gateway private IP address by querying `psn.internal.<your-domain>.pagopa.it`, but only via HTTP. To enable HTTPS, carry on with the next section.

> **_NOTE:_** If you try now to ping the address, it will not respond. The Application Gateway is configured to respond only to HTTPS requests.

1. Create a KeyVault in your **product Spoke** using RBAC model.
2. Generate a self-signed certificate for your domain via the KeyVault:
   - Under `Certificates` blade, click on `Generate/Import`.
   - Set the name using the domain name replacing dots with dashes (e.g. `psn-internal-<your-domain>-pagopa-it`).
   - As `Subejct`, set `CN=psn.internal.<your-domain>.pagopa.it`.
   - Set as desired policies for expiration and renewal and create the certificate.
3. Grant access to the Application Gateway Managed Identity `pagopa-app-gw-id-01` in the Hub to read **secrets** (`Key Vault Secrets User`) from the KeyVault in your Spoke.

Follow the remaining steps to [add the TLS certificate to Application Gateway](https://dx.pagopa.it/docs/azure/networking/app-gateway-tls-cert).

Finally, create the desired listener and routing rules in the Application Gateway to route HTTPS traffic to your product backend. You can look at the [existing code](https://github.com/pagopa/io-wallet/blob/main/infra/core/psn/hub/prod/appgw.tf#L12-L13) and replicate the configuration for your product.

Your product can now access the Application Gateway via HTTPS using the domain name `psn.internal.<your-domain>.pagopa.it`.

### VPN Configuration

VPN must be used only to connect from your local machine to the Hub network for management purposes.

The VPN is configured by using a Virtual Network Gateway to bridge connections, and an Azure Private DNS Resolver to resolve DNS queries. Most of the settings were already setup by PSN.

## TO DOs

Application Gateway firewall is temporarily set to Detection mode while we complete the tuning phase. After that, it should be switched to Prevention mode.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azuread"></a> [azuread](#provider\_azuread) | 3.7.0 |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.54.0 |
| <a name="provider_azurerm.hub"></a> [azurerm.hub](#provider\_azurerm.hub) | 4.54.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_application_gateway.hub](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_gateway) | resource |
| [azurerm_private_dns_resolver.hub](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver) | resource |
| [azurerm_private_dns_resolver_dns_forwarding_ruleset.pagopa](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_dns_forwarding_ruleset) | resource |
| [azurerm_private_dns_resolver_inbound_endpoint.dns_inbound](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_inbound_endpoint) | resource |
| [azurerm_private_dns_resolver_outbound_endpoint.dns_outbound](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_outbound_endpoint) | resource |
| [azurerm_private_dns_resolver_virtual_network_link.hub](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_virtual_network_link) | resource |
| [azurerm_private_dns_zone.acr](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.agentsvc](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.asp](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.containerapp_itn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.cosno](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.hsm](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.internal_wallet_io_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.management_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.monitor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.ods](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.oms](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.queue](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.scm_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone.table](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone) | resource |
| [azurerm_private_dns_zone_virtual_network_link.hub](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link) | resource |
| [azurerm_private_dns_zone_virtual_network_link.spoke](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link) | resource |
| [azurerm_public_ip.vpn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip) | resource |
| [azurerm_resource_group.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.private_links](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_user_assigned_identity.appgateway](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_virtual_network_gateway.vpn](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway) | resource |
| [azurerm_virtual_network_peering.hub_to_spoke](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering) | resource |
| [azuread_application_published_app_ids.well_known](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/application_published_app_ids) | data source |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_public_ip.appgw](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/public_ip) | data source |
| [azurerm_subnet.dns_inbound](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subnet.dns_outbound](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subnet.hub_gateway_subnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_virtual_network.hub](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_application_gateway"></a> [application\_gateway](#output\_application\_gateway) | n/a |
| <a name="output_vpn"></a> [vpn](#output\_vpn) | n/a |
<!-- END_TF_DOCS -->
