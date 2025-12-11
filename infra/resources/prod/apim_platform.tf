resource "azurerm_api_management_backend" "psn" {
  name                = "psn-backend-01"
  description         = "PSN hostname via private network"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  protocol            = "http"
  url                 = "http://psn.internal.io.pagopa.it/"
}

resource "azurerm_api_management_policy_fragment" "wallet_authentication" {
  name              = "io-wallet-app-session-fragment"
  description       = "Fragment to handle authentication session for IO app"
  api_management_id = data.azurerm_api_management.platform_api_gateway.id
  format            = "rawxml"
  value             = file("${path.module}/fragments/io-wallet-app-session-fragment.xml")
}

resource "azurerm_api_management_product" "wallet" {
  product_id   = "it-wallet"
  display_name = "IT WALLET"
  description  = "Product for IT-Wallet APIs"

  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name

  published             = true
  subscription_required = false
  approval_required     = false
}

resource "azurerm_api_management_api_version_set" "wallet_v1" {
  name                = "wallet_v1"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  display_name        = "v1"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api" "wallet" {
  name                  = format("%s-wallet-api", local.project_legacy)
  api_management_name   = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name   = data.azurerm_api_management.platform_api_gateway.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.wallet_v1.id
  version        = azurerm_api_management_api_version_set.wallet_v1.display_name
  revision       = 1

  description  = "IT-Wallet REST APIs"
  display_name = "IT-Wallet"
  path         = "api/wallet"
  protocols    = ["https"]
}

resource "azurerm_api_management_product_api" "wallet" {
  api_name            = azurerm_api_management_api.wallet.name
  product_id          = azurerm_api_management_product.wallet.product_id
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
}

resource "azurerm_api_management_api_operation" "wallet_catchall" {
  operation_id        = "wallet-catchall"
  api_name            = azurerm_api_management_api.wallet.name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  display_name        = "Wallet Catch All"
  method              = "*"
  url_template        = "/*"
  description         = "Forwards all requests to backend"
}

resource "azurerm_api_management_api_operation_policy" "wallet" {
  api_name            = azurerm_api_management_api.wallet.name
  operation_id        = azurerm_api_management_api_operation.wallet_catchall.id
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <include-fragment fragment-id="${azurerm_api_management_policy_fragment.wallet_authentication.name}" />
      <base />
      <set-backend-service backend-id="${azurerm_api_management_backend.psn.name}" />
  </inbound>
</policies>
XML
}
