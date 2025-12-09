moved {
  from = module.cosmos.azurerm_cosmosdb_account.wallet_02
  to   = module.cosmos.azurerm_cosmosdb_account.apps
}

moved {
  from = module.cosmos.azurerm_cosmosdb_sql_container.containers_02
  to   = module.cosmos.azurerm_cosmosdb_sql_container.containers
}

moved {
  from = module.cosmos.azurerm_cosmosdb_sql_database.db_02
  to   = module.cosmos.azurerm_cosmosdb_sql_database.db
}

moved {
  from = module.cosmos.azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded_02
  to   = module.cosmos.azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded
}

moved {
  from = module.cosmos.azurerm_private_endpoint.sql_02
  to   = module.cosmos.azurerm_private_endpoint.sql
}
