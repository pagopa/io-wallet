resource "azurerm_cosmosdb_sql_container" "containers" {
  for_each = { for c in local.wallet_cosmosdb_containers : c.name => c }

  name                = each.value.name
  resource_group_name = var.resource_group_name

  account_name        = azurerm_cosmosdb_account.apps.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_paths = [each.value.partition_key_path]
  default_ttl         = each.value.default_ttl

  autoscale_settings {
    max_throughput = each.value.autoscale_settings.max_throughput
  }
}

resource "azurerm_cosmosdb_sql_container" "containers_uat" {
  for_each = { for c in local.wallet_cosmosdb_uat_containers : c.name => c }

  name                = each.value.name
  resource_group_name = var.resource_group_name

  account_name        = azurerm_cosmosdb_account.apps.name
  database_name       = azurerm_cosmosdb_sql_database.db_uat.name
  partition_key_paths = [each.value.partition_key_path]
  default_ttl         = each.value.default_ttl

  autoscale_settings {
    max_throughput = each.value.autoscale_settings.max_throughput
  }
}
