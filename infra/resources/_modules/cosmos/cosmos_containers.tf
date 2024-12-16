resource "azurerm_cosmosdb_sql_container" "containers_02" {
  for_each = { for c in local.wallet_cosmosdb_containers : c.name => c }

  name                = each.value.name
  resource_group_name = var.resource_group_name

  account_name        = azurerm_cosmosdb_account.wallet_02.name
  database_name       = azurerm_cosmosdb_sql_database.db_02.name
  partition_key_paths = [each.value.partition_key_path]
  default_ttl         = each.value.default_ttl

  autoscale_settings {
    max_throughput = each.value.autoscale_settings.max_throughput
  }
}
