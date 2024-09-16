resource "azurerm_subnet_nat_gateway_association" "func_support" {
  nat_gateway_id = var.nat_gateway_id_support_func
  subnet_id      = module.function_app_support.subnet.id
}
