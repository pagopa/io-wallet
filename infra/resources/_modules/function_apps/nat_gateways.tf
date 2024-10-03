resource "azurerm_subnet_nat_gateway_association" "func_support" {
  nat_gateway_id = var.nat_gateway_id
  subnet_id      = module.function_app_support.subnet.id
}

resource "azurerm_subnet_nat_gateway_association" "func_user_02" {
  nat_gateway_id = var.nat_gateway_id
  subnet_id      = module.function_app_user_02.subnet.id
}
