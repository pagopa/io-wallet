variable "cosmos_db" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
    database_name       = string
    admin_ids           = set(string)
  })
}

variable "function_app" {
  type = object({
    user_func_02 = object({
      principal_id         = string
      staging_principal_id = string
    })
    support_func = object({
      principal_id         = string
      staging_principal_id = string
    })
  })

  description = "Function App system assigned identities"
}

variable "key_vault" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
    admin_ids           = set(string)
  })

  description = "KeyVault Id and list of Entra groups who are administrator of Key Vaults"
}

variable "cdn_storage_account" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
  description = "Storage Account Id used for CDN"
}
