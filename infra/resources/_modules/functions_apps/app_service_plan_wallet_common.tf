resource "azurerm_app_service_plan" "app_service_plan_wallet_common" {
  name                = "${var.project}-plan-wallet-common"
  location            = var.location
  resource_group_name = var.resource_group_name

  kind     = "Linux"
  reserved = true

  sku {
    tier     = "PremiumV3"
    size     = "P1v3"
    capacity = 1
  }

  tags = var.tags
}
