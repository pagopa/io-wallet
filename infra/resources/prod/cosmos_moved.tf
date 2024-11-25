moved {
  from = module.cosmos.azurerm_cosmosdb_sql_container.containers_01["leases"]
  to   = module.cosmos.azurerm_cosmosdb_sql_container.leases_01
}
