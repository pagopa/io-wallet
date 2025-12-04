output "apps" {
  value = {
    id                  = azurerm_cosmosdb_account.apps.id
    name                = azurerm_cosmosdb_account.apps.name
    resource_group_name = azurerm_cosmosdb_account.apps.resource_group_name
    endpoint            = azurerm_cosmosdb_account.apps.endpoint
    database_name       = azurerm_cosmosdb_sql_database.db.name
    database_name_uat   = azurerm_cosmosdb_sql_database.db_uat.name
  }
}
