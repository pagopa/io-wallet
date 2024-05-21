module "function" {
  source = "github.com/pagopa/dx//infra/modules/azure_function_app?ref=DEVEX-121-produrre-un-modulo-terraform-che-crea-una-function-azure"

  prefix          = var.prefix
  env_short       = var.env_short
  domain          = "wallet"
  app_name        = ""
  instance_number = "01"

  location                               = var.location
  resource_group_name                    = var.resource_group_name
  application_insights_connection_string = var.application_insights_connection_string
  health_check_path                      = "/api/v1/wallet/info"
  node_version                           = 18
  ai_sampling_percentage                 = 5

  subnet_cidr   = "10.0.2.0/24"
  subnet_pep_id = var.private_endpoint_subnet_id
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

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

    // CosmosDB connection
    COSMOS_DB_URI  = var.cosmos_db.endpoint
    COSMOS_DB_NAME = var.cosmos_db.name
  }

  tier = "test"

  tags = var.tags
}
