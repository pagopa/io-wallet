locals {

  resource_group_name_common = "${var.project}-rg-common"
  vnet_name_common           = "${var.project}-vnet-common"

  resource_group_name_common_legacy = "${var.project_legacy}-rg-common"
  vnet_name_common_legacy           = "${var.project_legacy}-vnet-common"

  function_wallet = {


    app_settings_common = {
      FUNCTIONS_WORKER_RUNTIME       = "node"
      WEBSITE_RUN_FROM_PACKAGE       = "1"
      WEBSITE_DNS_SERVER             = "168.63.129.16"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"

      // CosmosDB connection
      COSMOSDB_URI           = var.cosmos_db.endpoint
      COSMOSDB_KEY           = var.cosmos_db.primary_key
      COSMOSDB_DATABASE_NAME = "db"
      COSMOSDB_CONNECTION_STRING = format("AccountEndpoint=%s;AccountKey=%s;", var.cosmos_db.endpoint, var.cosmos_db.primary_key)
    }
  }
}
