output "cosmos_account_wallet" {
  value = {
    id   = azurerm_cosmosdb_account.wallet.id
    name = azurerm_cosmosdb_account.wallet.name
  }
}
