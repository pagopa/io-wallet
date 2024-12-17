module "apim_v2_wallet_support_product" {
  source = "github.com/pagopa/terraform-azurerm-v4//api_management_product?ref=v1.0.0"

  product_id   = format("%s-wallet-support-api", var.project_legacy)
  display_name = "IO WALLET SUPPORT API"
  description  = "Product containing APIs for Wallet Support Assistance"

  api_management_name = var.apim.name
  resource_group_name = var.apim.resource_group_name

  published             = true
  subscription_required = true
  approval_required     = false
}

module "apim_v2_wallet_pdnd_product" {
  source = "github.com/pagopa/terraform-azurerm-v4//api_management_product?ref=v1.0.0"

  product_id   = format("%s-wallet-pdnd-api", var.project_legacy)
  display_name = "IO WALLET PDND TOKEN-PROTECTED APIs"
  description  = "Product containing APIs that must be called using the PDND token for authentication"

  api_management_name = var.apim.name
  resource_group_name = var.apim.resource_group_name

  published             = true
  subscription_required = false
  approval_required     = false
}
