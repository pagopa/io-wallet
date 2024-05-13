resource "azurerm_resource_group" "resource_group_wallet" {
  name     = "${var.project}-wallet-rg-01"
  location = var.location

  tags = var.tags
}
