moved {
  from = module.repo.azurerm_role_assignment.infra_cd_apim_service_contributor
  to   = azurerm_role_assignment.infra_cd_apim_service_contributor
}

moved {
  from = module.repo.azurerm_role_assignment.infra_ci_subscription_apim_secrets
  to   = azurerm_role_assignment.infra_ci_subscription_apim_secrets
}

moved {
  from = module.repo.azurerm_role_assignment.infra_cd_vnet_network_contributor
  to   = azurerm_role_assignment.infra_cd_vnet_network_contributor
}

moved {
  from = module.repo.azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor
  to   = azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor
}

moved {
  from = module.repo.azurerm_key_vault_access_policy.infra_cd_kv_common
  to   = azurerm_key_vault_access_policy.infra_cd_kv_common
}

moved {
  from = module.repo.azurerm_key_vault_access_policy.infra_ci_kv_common
  to   = azurerm_key_vault_access_policy.infra_ci_kv_common
}

moved {
  from = github_actions_environment_secret.automation_prod_cd["ARM_CLIENT_ID"]
  to   = module.repo.github_actions_environment_secret.automation_cd["ARM_CLIENT_ID"]
}

moved {
  from = github_actions_environment_secret.automation_prod_cd["ARM_SUBSCRIPTION_ID"]
  to   = module.repo.github_actions_environment_secret.automation_cd["ARM_SUBSCRIPTION_ID"]
}

moved {
  from = azurerm_federated_identity_credential.github_automation_prod_cd
  to   = module.repo.azurerm_federated_identity_credential.github_automation_cd
}
