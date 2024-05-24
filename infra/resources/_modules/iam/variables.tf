variable "cosmos_db" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
    database_names      = set(string)
  })
}

variable "function_app" {
  type = object({
    principal_id         = string
    staging_principal_id = string
  })

  description = "Function App system assigned identities"
}

variable "key_vault" {
  type = object({
    id        = string
    admin_ids = set(string)
  })

  description = "KeyVault Id and list of Entra groups who are administrator of Key Vaults"
}
