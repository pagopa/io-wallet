resource "azurerm_role_assignment" "infra_cd_subscription_rbac_admin" {
  scope                = var.wallet_dns_zone_id
  role_definition_name = "DNS Zone Contributor"
  principal_id         = var.cicd_principal_ids.infra.cd
  description          = "Allow io-wallet Infra CD identity to manage the wallet DNS zone"
}

resource "azurerm_role_assignment" "certificates_user" {
  scope                = azurerm_key_vault_certificate.foo.id // var
  role_definition_name = "Key Vault Certificate User"
  principal_id         = var.cicd_principal_ids.infra.ci
}
