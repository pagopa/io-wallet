module "apim_v2_wallet_support_product" {
  source = "github.com/pagopa/terraform-azurerm-v3//api_management_product?ref=v8.27.0"

  product_id   = format("%s-wallet-support-api", var.project_legacy)
  display_name = "IO WALLET SUPPORT API"
  description  = "Product for support Wallet API"

  api_management_name = var.apim.name
  resource_group_name = var.apim.resource_group_name

  published             = true
  subscription_required = true
  approval_required     = false
}
