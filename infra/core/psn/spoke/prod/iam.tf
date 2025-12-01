resource "azurerm_role_assignment" "itwallet_rg_terraform_blob_owner" {
  role_definition_name = "Storage Blob Data Owner"
  scope                = azurerm_resource_group.terraform.id
  principal_id         = data.azuread_group.itwallet.object_id
  description          = "Allow the group to read and write Terraform state"
}
