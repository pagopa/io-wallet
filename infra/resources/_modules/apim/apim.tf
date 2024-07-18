module "apim_v2_wallet_api" {
  source = "git::https://github.com/pagopa/terraform-azurerm-v3//api_management_api?ref=v8.12.2"

  name                  = format("%s-ioweb-wallet", var.project_legacy)
  api_management_name   = var.apim.name
  resource_group_name   = var.apim.resource_group_name
  product_ids           = [var.product_id]
  subscription_required = false

  service_url = format("https://%s", var.user_function.function_hostname)

  description  = "Wallet APIs"
  display_name = "IO Web - Wallet"
  path         = "ioweb/wallet/api/v1"
  protocols    = ["https"]

  content_format = "openapi"

  # NOTE: This openapi does not contains `upgradeToken` endpoint, since it's not necessary
  content_value = file("${path.module}/api/ioweb/user-function/_swagger.json")

  xml_content = file("${path.module}/api/ioweb/user-function/_base_policy.xml")
}

resource "azurerm_api_management_named_value" "user_func_key" {
  name                = "io-wallet-user-func-key"
  api_management_name = var.apim.name
  resource_group_name = var.apim.resource_group_name
  display_name        = "io-wallet-user-func-key"
  value               = data.azurerm_key_vault_secret.funciowallet_default.value
  secret              = "true"
}

data "azurerm_key_vault_secret" "funciowallet_default" {
  name         = "funciowallet-KEY-APPBACKEND"
  key_vault_id = var.key_vault_id
}