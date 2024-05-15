resource "azurerm_service_plan" "app_service_plan_wallet_common" {
  name                = "${var.project}-plan-wallet-common"
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = "P1v3"
  zone_balancing_enabled = true

  tags = var.tags
}