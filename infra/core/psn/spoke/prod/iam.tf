resource "azurerm_role_assignment" "itwallet_rg_terraform_blob_owner" {
  role_definition_name = "Storage Blob Data Owner"
  scope                = azurerm_resource_group.terraform.id
  principal_id         = data.azuread_group.itwallet.object_id
  description          = "Allow the group to read and write Terraform state"
}

data "azurerm_user_assigned_identity" "infra_cd" {
  name                = "iw-p-itn-infra-github-cd-id-01"
  resource_group_name = "iw-p-itn-github-identities-rg-01"
}

resource "azurerm_role_assignment" "infra_cd_pep_subnet_network_contributor" {
  role_definition_name = "Network Contributor"
  scope                = azurerm_subnet.pep.id
  principal_id         = data.azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Grant Network Contributor to infra CD pipeline on pep subnet"
}