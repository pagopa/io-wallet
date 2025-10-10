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

output "cdn_principal_id" {
  value = data.azapi_resource.cdn_profile.output.identity.principalId
}

output "cdn_profile_name" {
  value = azurerm_cdn_profile.this.name
}

output "cdn_endpoint_name" {
  value = azurerm_cdn_endpoint.this.name
}
