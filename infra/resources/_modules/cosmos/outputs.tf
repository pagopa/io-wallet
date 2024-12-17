output "cosmos_account_wallet" {
  value = {
    id                  = azurerm_cosmosdb_account.wallet_02.id
    name                = azurerm_cosmosdb_account.wallet_02.name
    resource_group_name = azurerm_cosmosdb_account.wallet_02.resource_group_name
    endpoint            = azurerm_cosmosdb_account.wallet_02.endpoint
    database_name       = azurerm_cosmosdb_sql_database.db_02.name
  }
}
