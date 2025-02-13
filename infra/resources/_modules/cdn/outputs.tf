output "storage_account_cdn" {
  value = {
    id                  = azurerm_storage_account.this.id
    name                = azurerm_storage_account.this.name
    resource_group_name = azurerm_storage_account.this.resource_group_name
  }
}

output "cdn_endpoint_id" {
  value = azurerm_cdn_endpoint.this.id
}