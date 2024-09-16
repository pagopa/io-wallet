resource "azurerm_subnet_nat_gateway_association" "func_support" {
  nat_gateway_id = data.azurerm_nat_gateway.nat.id
  subnet_id      = module.function_app_support.subnet.id
}
