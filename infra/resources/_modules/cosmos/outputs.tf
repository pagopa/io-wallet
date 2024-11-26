output "cosmos_account_wallet" {
  value = {
    id                  = azurerm_cosmosdb_account.wallet.id
    name                = azurerm_cosmosdb_account.wallet.name
    resource_group_name = azurerm_cosmosdb_account.wallet.resource_group_name
    endpoint            = azurerm_cosmosdb_account.wallet.endpoint
    database_name       = azurerm_cosmosdb_sql_database.db.name
  }
}

# Temporary, see CES-535
output "cosmos_account_wallet_02" {
  value = {
    id                  = local.cosmos_02.id
    name                = local.cosmos_02.name
    resource_group_name = var.resource_group_name
    endpoint            = "https://${local.cosmos_02.name}.documents.azure.com:443/" # Temporary, see CES-535
    database_name       = azurerm_cosmosdb_sql_database.db_02.name
  }
}
