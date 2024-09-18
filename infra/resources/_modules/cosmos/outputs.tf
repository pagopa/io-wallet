output "cosmos_account_wallet" {
  value = {
    id                  = azurerm_cosmosdb_account.wallet.id
    name                = azurerm_cosmosdb_account.wallet.name
    resource_group_name = azurerm_cosmosdb_account.wallet.resource_group_name
    endpoint            = azurerm_cosmosdb_account.wallet.endpoint
    database_name       = azurerm_cosmosdb_sql_database.db.name
    primary_key         = azurerm_cosmosdb_account.wallet.primary_key
  }
}
