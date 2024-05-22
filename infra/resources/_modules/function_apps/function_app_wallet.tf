module "function" {
  # source = "../../../../../../devex/dx/infra/modules/azure_function_app"
  source = "github.com/pagopa/dx//infra/modules/azure_function_app?ref=DEVEX-121-produrre-un-modulo-terraform-che-crea-una-function-azure"

  prefix          = var.prefix
  env_short       = var.env_short
  domain          = "wallet"
  app_name        = "fn"
  instance_number = "01"

  location                               = var.location
  resource_group_name                    = var.resource_group_name
  application_insights_connection_string = var.application_insights_connection_string
  health_check_path                      = "/api/v1/wallet/info"
  node_version                           = 18
  ai_sampling_percentage                 = 5

  subnet_cidr                          = "10.0.2.0/24"
  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name
  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.function_app_wallet.app_settings
  slot_app_settings = local.function_app_wallet.app_settings

  tier = "test"

  tags = var.tags
}
