locals {
  function_app_wallet = {
    app_settings = {
      FUNCTIONS_WORKER_RUNTIME       = "node"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"

      # COSMOS_DB_ENDPOINT = var.cosmos_db_endpoint
      CosmosDbConnectionString = "AccountEndpoint=${var.cosmos_db_endpoint};AccountKey=${var.cosmos_db_key};"

      FederationEntityBasePath         = "https://io-d-wallet-it.azurewebsites.net"
      FederationEntityOrganizationName = "PagoPa S.p.A."
    }
  }
}
