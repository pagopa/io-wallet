#tfsec:ignore:azure-storage-queue-services-logging-enabled:exp:2022-05-01 # already ignored, maybe a bug in tfsec
module "function_wallet" {
  source = "github.com/pagopa/terraform-azurerm-v3//function_app?ref=v8.12.2"

  resource_group_name          = var.resource_group_name
  name                         = "${var.project}-wallet-func-01"
  location                     = var.location
  app_service_plan_id          = azurerm_app_service_plan.app_service_plan_wallet_common.id
  health_check_path            = "/api/v1/wallet/info"
  health_check_maxpingfailures = 2

  node_version    = "18"
  runtime_version = "~4"

  always_on                                = "true"
  application_insights_instrumentation_key = data.azurerm_application_insights.application_insights.instrumentation_key

  app_settings = merge(
    local.function_wallet.app_settings_common, {}
  )

  internal_storage = {
    "enable"                     = true,
    "private_endpoint_subnet_id" = var.subnet_private_endpoints_id,
    "private_dns_zone_blob_ids"  = [data.azurerm_private_dns_zone.privatelink_blob_core.id],
    "private_dns_zone_queue_ids" = []
    "private_dns_zone_table_ids" = []
    "queues"                     = [],
    "containers"                 = [],
    "blobs_retention_days"       = 0,
  }

  subnet_id = var.subnet_id

  allowed_subnets = [
    var.subnet_id,
    data.azurerm_subnet.snet_backendl1.id,
    data.azurerm_subnet.snet_backendl2.id,
    data.azurerm_subnet.snet_apim_v2.id,
  ]

  sticky_app_setting_names = []

  storage_account_info = {
    # disable advanced_threat_protection_enable because it's not supported in the italynorth region
    advanced_threat_protection_enable = false #var.location != "italynorth" ? true : false
    # default values as in https://github.com/pagopa/terraform-azurerm-v3/blob/v8.12.2/function_app/variables.tf#L55
    account_kind                      = "StorageV2"
    account_tier                      = "Standard"
    account_replication_type          = "ZRS"
    access_tier                       = "Hot"
    use_legacy_defender_version       = true
    public_network_access_enabled     = false
  }

  tags = var.tags
}

module "function_wallet_staging_slot" {
  source = "github.com/pagopa/terraform-azurerm-v3//function_app_slot?ref=v8.12.2"

  name                         = "staging"
  location                     = var.location
  resource_group_name          = var.resource_group_name
  function_app_id              = module.function_wallet.id
  app_service_plan_id          = azurerm_app_service_plan.app_service_plan_wallet_common.id
  health_check_path            = "/api/v1/wallet/info"
  health_check_maxpingfailures = 2

  storage_account_name       = module.function_wallet.storage_account_name
  storage_account_access_key = module.function_wallet.storage_account.primary_access_key

  internal_storage_connection_string = module.function_wallet.storage_account_internal_function.primary_connection_string

  node_version                             = "18"
  always_on                                = "true"
  runtime_version                          = "~4"
  application_insights_instrumentation_key = data.azurerm_application_insights.application_insights.instrumentation_key

  app_settings = merge(
    local.function_wallet.app_settings_common, {}
  )

  subnet_id = var.subnet_id

  allowed_subnets = [
    var.subnet_id,
    data.azurerm_subnet.snet_github_runner.id,
    data.azurerm_subnet.snet_backendl1.id,
    data.azurerm_subnet.snet_backendl2.id,
    data.azurerm_subnet.snet_apim_v2.id,
  ]

  tags = var.tags
}
