data "azurerm_subscription" "current" {}

data "azurerm_log_analytics_workspace" "law" {
  name                = "io-p-law-common"
  resource_group_name = "io-p-rg-common"
}