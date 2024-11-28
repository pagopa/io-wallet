resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "db"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.wallet.name
}

resource "azurerm_cosmosdb_sql_database" "db_02" {
  name                = "db"
  resource_group_name = var.resource_group_name
  account_name        = local.cosmos_02.name
}
