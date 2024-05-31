data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "weu-common" {
  name = "${local.project}-rg-common"
}

data "azurerm_key_vault" "weu-common" {
  name                = "${local.project}-kv-common"
  resource_group_name = data.azurerm_resource_group.weu-common.name
}
