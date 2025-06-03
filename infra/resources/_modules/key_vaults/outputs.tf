output "key_vault_wallet" {
  value = {
    id                  = azurerm_key_vault.wallet.id
    name                = azurerm_key_vault.wallet.name
    resource_group_name = azurerm_key_vault.wallet.resource_group_name
  }
}

// to be deleted
output "subscription_id" {
  value = var.subscription_id
}
