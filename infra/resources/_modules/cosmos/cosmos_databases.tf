resource "azurerm_cosmosdb_sql_database" "db_02" {
  name                = "db"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.wallet_02.name
}


resource "azurerm_cosmosdb_sql_database" "pre_prod_db" {
  name                = "pre-db"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.wallet_02.name
}
