output "name" {
  value     = local.keyvault_name
}

output "id" {
  value     = module.key_vault_domain.id
}
