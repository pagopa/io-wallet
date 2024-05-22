module "wallet_cosmosdb_containers" {
  for_each = { for c in local.wallet_cosmosdb_containers : c.name => c }

  source = "github.com/pagopa/terraform-azurerm-v3//cosmosdb_sql_container?ref=v8.12.2"

  name                = each.value.name
  resource_group_name = var.resource_group_name

  account_name  = azurerm_cosmosdb_account.wallet.name
  database_name = azurerm_cosmosdb_sql_database.db.name

  partition_key_path = each.value.partition_key_path
  throughput         = lookup(each.value, "throughput", null)

  autoscale_settings = lookup(each.value, "autoscale_settings", null)
}
