resource "azurerm_virtual_network" "spoke" {
  name                = local.networking.vnet.name
  resource_group_name = azurerm_resource_group.networking.name
  location            = azurerm_resource_group.networking.location

  address_space = [
    "10.100.0.0/16"
  ]

  dns_servers = [local.networking.firewall_ip]

  tags = local.tags
}

resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  name                      = "peer-to-pagopa-hub-italynorth"
  resource_group_name       = azurerm_resource_group.networking.name
  virtual_network_name      = azurerm_virtual_network.spoke.name
  remote_virtual_network_id = "/subscriptions/f3c27dbc-5c86-4c14-b43f-9faed77e5e19/resourceGroups/pagopa-rg-hub-network-italynorth/providers/Microsoft.Network/virtualNetworks/pagopa-hub-italynorth"

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  use_remote_gateways          = true
}

resource "azurerm_route_table" "spoke" {
  name                = "pagopa-Prod-ITWallet-spoke-routetable"
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.networking.name

  bgp_route_propagation_enabled = false

  route = [
    {
      name                   = "ApplicationGatewaySubnet"
      address_prefix         = "10.210.0.128/26"
      next_hop_in_ip_address = local.networking.firewall_ip
      next_hop_type          = local.networking.next_hope_type
    },
    {
      name                   = "AzureDNSInbound"
      address_prefix         = "10.210.0.192/28"
      next_hop_in_ip_address = local.networking.firewall_ip
      next_hop_type          = local.networking.next_hope_type
    },
    {
      name                   = "AzureDNSOutbound"
      address_prefix         = "10.210.0.208/28"
      next_hop_in_ip_address = local.networking.firewall_ip
      next_hop_type          = local.networking.next_hope_type
    },
    {
      name                   = "AzurePeSubnet"
      address_prefix         = "10.210.0.224/27"
      next_hop_in_ip_address = local.networking.firewall_ip
      next_hop_type          = local.networking.next_hope_type
    },
    {
      name                   = "GatewaySubnet"
      address_prefix         = "10.210.0.0/27"
      next_hop_in_ip_address = local.networking.firewall_ip
      next_hop_type          = local.networking.next_hope_type
    },
    {
      name                   = "udr-default-to-hub-nva"
      address_prefix         = "0.0.0.0/0"
      next_hop_in_ip_address = local.networking.firewall_ip
      next_hop_type          = local.networking.next_hope_type
    },
    {
      name                   = "AllowP2SVPN"
      address_prefix         = "172.16.201.0/24" # from Hub Gateway configuration
      next_hop_type          = "VirtualNetworkGateway"
      next_hop_in_ip_address = null
    }
  ]

  tags = local.tags
}

resource "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.environment, {
    name          = "pep"
    resource_type = "subnet"
  }))
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.spoke.name

  address_prefixes = ["10.100.4.0/23"]
}

resource "azurerm_subnet_route_table_association" "pep" {
  subnet_id      = azurerm_subnet.pep.id
  route_table_id = azurerm_route_table.spoke.id
}
