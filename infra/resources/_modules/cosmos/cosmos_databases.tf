resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "db"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.apps.name
}


resource "azurerm_cosmosdb_sql_database" "db_uat" {
  name                = "db-uat"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.apps.name
}
