output "key_vault_wallet" {
  value = {
    id                  = azurerm_key_vault.wallet.id
    name                = azurerm_key_vault.wallet.name
    resource_group_name = azurerm_key_vault.wallet.resource_group_name
  }
}

output "key_vault_cosmos_key" {
  value = {
    id             = azurerm_key_vault_key.cosmos.id
    versionless_id = azurerm_key_vault_key.cosmos.versionless_id
  }
}
