module "wallet_cdn" {
  source = "git::https://github.com/pagopa/terraform-azurerm-v3.git//cdn?ref=v8.12.2"

  name                  = "wallet-cdn-01"
  prefix                = var.project
  resource_group_name   = var.resource_group_name
  location              = var.location
  cdn_location          = "westeurope"
  hostname              = "wallet.io.pagopa.it"
  https_rewrite_enabled = true

  index_document     = "index.html"
  error_404_document = "404.html"

  storage_account_replication_type = "ZRS"

  dns_zone_name                = var.dns_zone
  dns_zone_resource_group_name = "io-p-rg-external"

  keyvault_vault_name          = var.keyvault_vault_name
  keyvault_resource_group_name = var.resource_group_name
  keyvault_subscription_id     = data.azurerm_subscription.current.subscription_id

  querystring_caching_behaviour = "BypassCaching"

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.law.id

  tags = var.tags
}
