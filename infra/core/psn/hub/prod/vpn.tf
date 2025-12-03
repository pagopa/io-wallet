resource "azurerm_public_ip" "vpn" {
  provider = azurerm.hub

  name                = "pagopa-vpng-italynorth-PublicIP"
  resource_group_name = azurerm_resource_group.network.name
  location            = azurerm_resource_group.network.location
  allocation_method   = "Static"

  zones = ["1", "2", "3"]
}

resource "azurerm_virtual_network_gateway" "vpn" {
  name                = "pagopa-vpng-italynorth"
  resource_group_name = azurerm_resource_group.network.name
  location            = azurerm_resource_group.network.location

  type          = "Vpn"
  vpn_type      = "RouteBased"
  active_active = false
  enable_bgp    = false
  sku           = "VpnGw2AZ"
  generation    = "Generation2"

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = "/subscriptions/f3c27dbc-5c86-4c14-b43f-9faed77e5e19/resourceGroups/pagopa-rg-hub-network-italynorth/providers/Microsoft.Network/virtualNetworks/pagopa-hub-italynorth/subnets/GatewaySubnet"
  }

  vpn_client_configuration {
    aad_tenant           = "https://login.microsoftonline.com/${data.azurerm_client_config.current.tenant_id}"
    aad_audience         = data.azuread_application_published_app_ids.well_known.result["AzureVPN"]
    aad_issuer           = "https://sts.windows.net/${data.azurerm_client_config.current.tenant_id}/"
    address_space        = [local.vpn_client_address]
    vpn_client_protocols = ["OpenVPN"]
  }

  tags = local.tags
}

resource "azurerm_private_dns_resolver" "hub" {
  provider = azurerm.hub

  name                = "pagopa-dnsResolver"
  resource_group_name = azurerm_resource_group.network.name
  location            = azurerm_resource_group.network.location

  virtual_network_id = data.azurerm_virtual_network.hub.id

  tags = local.tags
}

resource "azurerm_private_dns_resolver_inbound_endpoint" "dns_inbound" {
  provider = azurerm.hub

  name                    = "AzureDNSInbound"
  private_dns_resolver_id = azurerm_private_dns_resolver.hub.id
  location                = azurerm_private_dns_resolver.hub.location

  ip_configurations {
    subnet_id = data.azurerm_subnet.dns_inbound.id
  }

  tags = local.tags
}

resource "azurerm_private_dns_resolver_outbound_endpoint" "dns_outbound" {
  provider = azurerm.hub

  name                    = "AzureDNSOutbound"
  private_dns_resolver_id = azurerm_private_dns_resolver.hub.id
  location                = azurerm_private_dns_resolver.hub.location

  subnet_id = data.azurerm_subnet.dns_outbound.id

  tags = local.tags
}

resource "azurerm_private_dns_resolver_dns_forwarding_ruleset" "pagopa" {
  provider = azurerm.hub

  name                = "pagopa-forwardingRule"
  resource_group_name = azurerm_private_dns_resolver.hub.resource_group_name
  location            = azurerm_private_dns_resolver.hub.location

  private_dns_resolver_outbound_endpoint_ids = [azurerm_private_dns_resolver_outbound_endpoint.dns_outbound.id]

  tags = local.tags
}

resource "azurerm_private_dns_resolver_virtual_network_link" "hub" {
  name                      = "vnetlink"
  dns_forwarding_ruleset_id = azurerm_private_dns_resolver_dns_forwarding_ruleset.pagopa.id
  virtual_network_id        = data.azurerm_virtual_network.hub.id
}
