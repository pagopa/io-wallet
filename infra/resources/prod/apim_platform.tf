resource "azurerm_api_management_backend" "psn" {
  name                = "psn-backend-01"
  description         = "PSN hostname via private network"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  protocol            = "http"
  url                 = "https://psn.internal.io.pagopa.it/"
}

resource "azurerm_api_management_policy_fragment" "wallet_authentication" {
  name              = "io-wallet-app-session-fragment"
  description       = "Handle authentication session for IO app"
  api_management_id = data.azurerm_api_management.platform_api_gateway.id
  format            = "rawxml"
  value             = file("${path.module}/fragments/io-wallet-app-session-fragment.xml")
}

resource "azurerm_api_management_product" "wallet" {
  product_id   = "it-wallet"
  display_name = "IT WALLET"
  description  = "Product for IT-Wallet APIs without subscription"

  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name

  published             = true
  subscription_required = false
  approval_required     = false
}

resource "azurerm_api_management_api_version_set" "wallet_user" {
  name                = "wallet-user-apis"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  display_name        = "Wallet User"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api_version_set" "wallet_support" {
  name                = "wallet-support-apis"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  display_name        = "Wallet Customer Support"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api" "wallet_user_v1" {
  name                  = "wallet-user-api-v1"
  api_management_name   = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name   = data.azurerm_api_management.platform_api_gateway.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.wallet_user.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by IO App"
  display_name = "IT-Wallet User"
  path         = "api/wallet"
  protocols    = ["https"]

  import {
    content_format = "openapi-link"
    content_value  = "https://raw.githubusercontent.com/pagopa/io-wallet/refs/heads/master/apps/io-wallet-user-func/openapi.yaml"
  }
}

resource "azurerm_api_management_api" "wallet_support_v1" {
  name                  = "wallet-support-api-v1"
  api_management_name   = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name   = data.azurerm_api_management.platform_api_gateway.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.wallet_support.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by Customer Service Support"
  display_name = "IT-Wallet Customer Support"
  path         = "api/wallet/support"
  protocols    = ["https"]

  import {
    content_format = "openapi-link"
    content_value  = "https://raw.githubusercontent.com/pagopa/io-wallet/refs/heads/master/apps/io-wallet-support-func/openapi.yaml"
  }
}

resource "azurerm_api_management_tag" "wallet" {
  api_management_id = data.azurerm_api_management.platform_api_gateway.id
  name              = "it-wallet"
}

resource "azurerm_api_management_api_tag" "wallet_user" {
  api_id = azurerm_api_management_api.wallet_user_v1.id
  name   = azurerm_api_management_tag.wallet.name
}

resource "azurerm_api_management_api_tag" "wallet_support" {
  api_id = azurerm_api_management_api.wallet_support_v1.id
  name   = azurerm_api_management_tag.wallet.name
}

resource "azurerm_api_management_product_api" "wallet_user" {
  api_name            = azurerm_api_management_api.wallet_user_v1.name
  product_id          = azurerm_api_management_product.wallet.product_id
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
}

resource "azurerm_api_management_product_api" "wallet_support" {
  api_name            = azurerm_api_management_api.wallet_support_v1.name
  product_id          = azurerm_api_management_product.wallet.product_id
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
}

resource "azurerm_api_management_api_policy" "wallet_user" {
  api_name            = azurerm_api_management_api.wallet_user_v1.name
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

resource "azurerm_api_management_api_policy" "wallet_support" {
  api_name            = azurerm_api_management_api.wallet_support_v1.name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <base />
      <set-backend-service backend-id="${azurerm_api_management_backend.psn.name}" />
  </inbound>
</policies>
XML
}
