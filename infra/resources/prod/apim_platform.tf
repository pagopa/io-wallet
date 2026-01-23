resource "azurerm_api_management_backend" "wallet_user_psn" {
  name                = "wallet-user-psn-backend-01"
  description         = "Wallet User PSN hostname via private network"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  protocol            = "http"
  url                 = "https://api.internal.wallet.io.pagopa.it/api/wallet/v1"
}

resource "azurerm_api_management_backend" "wallet_user_uat_psn" {
  name                = "wallet-user-uat-psn-backend-01"
  description         = "Wallet User UAT PSN hostname via private network"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  protocol            = "http"
  url                 = "https://api.internal.wallet.io.pagopa.it/api/wallet/uat/v1/"
}

locals {
  wallet_authentication_fragment_name = "ioapp-authenticated"
}

resource "azurerm_api_management_product" "wallet" {
  product_id   = "it-wallet"
  display_name = "IT WALLET - Public"
  description  = "Product for IT-Wallet APIs without subscription"

  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name

  published             = true
  subscription_required = false
  approval_required     = false
}

resource "azurerm_api_management_api_version_set" "wallet_user_ioapp" {
  name                = "wallet-user-ioapp-apis"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  display_name        = "Wallet User - IO App"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api_version_set" "wallet_user_uat_ioapp" {
  name                = "wallet-user-uat-ioapp-apis"
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  display_name        = "Wallet User UAT - IO App"
  versioning_scheme   = "Segment"
}

resource "azurerm_api_management_api" "wallet_user_ioapp_v1" {
  name                  = "wallet-user-ioapp-api-v1"
  api_management_name   = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name   = data.azurerm_api_management.platform_api_gateway.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.wallet_user_ioapp.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by IO App"
  display_name = "IT-Wallet User - IO App v1"
  path         = "api/wallet"
  protocols    = ["https"]

  import {
    content_format = "openapi"
    content_value  = file("${path.module}/apis/user_v1/swagger.yaml")
  }
}

resource "azurerm_api_management_api" "wallet_user_uat_ioapp_v1" {
  name                  = "wallet-user-uat-ioapp-api-v1"
  api_management_name   = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name   = data.azurerm_api_management.platform_api_gateway.resource_group_name
  subscription_required = false

  version_set_id = azurerm_api_management_api_version_set.wallet_user_uat_ioapp.id
  version        = "v1"
  revision       = 1

  description  = "REST APIs consumed by IO App"
  display_name = "IT-Wallet User UAT - IO App v1"
  path         = "api/wallet/uat"
  protocols    = ["https"]

  import {
    content_format = "openapi"
    content_value  = file("${path.module}/apis/user_uat_v1/swagger.yaml")
  }
}

resource "azurerm_api_management_tag" "wallet" {
  api_management_id = data.azurerm_api_management.platform_api_gateway.id
  name              = "it-wallet"
}

resource "azurerm_api_management_api_tag" "wallet_user" {
  api_id = azurerm_api_management_api.wallet_user_ioapp_v1.id
  name   = azurerm_api_management_tag.wallet.name
}

resource "azurerm_api_management_api_tag" "wallet_user_uat" {
  api_id = azurerm_api_management_api.wallet_user_uat_ioapp_v1.id
  name   = azurerm_api_management_tag.wallet.name
}

resource "azurerm_api_management_product_api" "wallet_user_v1" {
  api_name            = azurerm_api_management_api.wallet_user_ioapp_v1.name
  product_id          = azurerm_api_management_product.wallet.product_id
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
}

resource "azurerm_api_management_product_api" "wallet_user_uat_v1" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  product_id          = azurerm_api_management_product.wallet.product_id
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
}

resource "azurerm_api_management_api_policy" "wallet_user_v1" {
  api_name            = azurerm_api_management_api.wallet_user_ioapp_v1.name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <choose>
          <when condition="@(!context.Variables.ContainsKey(&quot;skipSessionFragment&quot;))">
              <include-fragment fragment-id="${local.wallet_authentication_fragment_name}" />
          </when>
      </choose>
      <base />
      <set-backend-service backend-id="${azurerm_api_management_backend.wallet_user_psn.name}" />
  </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_policy" "wallet_user_uat_v1" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  xml_content         = <<XML
<policies>
  <inbound>
      <choose>
          <when condition="@(!context.Variables.ContainsKey(&quot;skipSessionFragment&quot;))">
              <include-fragment fragment-id="${local.wallet_authentication_fragment_name}" />
          </when>
      </choose>
      <base />
      <set-backend-service backend-id="${azurerm_api_management_backend.wallet_user_uat_psn.name}" />
  </inbound>
</policies>
XML
}

resource "azurerm_api_management_api_operation_policy" "health_check_policy" {
  api_name            = azurerm_api_management_api.wallet_user_ioapp_v1.name
  operation_id        = "healthCheck"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/health_check_operation_policy.xml")
}

resource "azurerm_api_management_api_operation_policy" "health_check_uat_policy" {
  api_name            = azurerm_api_management_api.wallet_user_uat_ioapp_v1.name
  operation_id        = "healthCheck"
  resource_group_name = data.azurerm_api_management.platform_api_gateway.resource_group_name
  api_management_name = data.azurerm_api_management.platform_api_gateway.name

  xml_content = file("${path.module}/policies/health_check_operation_policy.xml")
}