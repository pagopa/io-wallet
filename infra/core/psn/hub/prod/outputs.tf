output "application_gateway" {
  value = {
    id                  = azurerm_application_gateway.hub.id
    name                = azurerm_application_gateway.hub.name
    resource_group_name = azurerm_application_gateway.hub.resource_group_name
    public_ip           = data.azurerm_public_ip.appgw.ip_address
  }
}

output "vpn" {
  value = {
    client_ip_address = local.vpn_client_address
  }
}
