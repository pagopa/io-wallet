data "azurerm_resource_group" "wallet" {
  name = provider::dx::resource_name(merge(
    local.environment,
    {
      name          = "wallet",
      resource_type = "resource_group"
    }
  ))
}
