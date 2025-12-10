resource "azurerm_subnet_nat_gateway_association" "func_support" {
  count = var.nat_gateway_id == null ? 0 : 1

  nat_gateway_id = var.nat_gateway_id
  subnet_id      = module.function_app_support.subnet.id
}

resource "azurerm_subnet_nat_gateway_association" "func_user_02" {
  count = var.nat_gateway_id == null ? 0 : 1

  nat_gateway_id = var.nat_gateway_id
  subnet_id      = module.function_app_user.subnet.id
}
