data "azurerm_subscription" "current" {}

module "key_vault_role_assignments" {
  source = "github.com/pagopa-dx/terraform-azurerm-azure-role-assignments//modules/key_vault"

  principal_id = var.cdn_principal_id

  subscription_id = data.azurerm_subscription.current.id

  key_vault = {
    name                = var.key_vault_certificates.name
    resource_group_name = var.key_vault_certificates.resource_group_name
    description         = "It is required so the CDN can get the certificates stored in the key vault"

    roles = {
      certificates = "reader"
    }
  }
}
