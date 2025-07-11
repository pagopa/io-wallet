variable "cosmos_db_02" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
    database_name       = string
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
    user_func_uat = object({
      principal_id         = string
      staging_principal_id = string
    })
  })

  description = "Function App system assigned identities"
}

variable "admin_ids" {
  type        = set(string)
  description = "Id of the Entra ID group with admin roles"
}

variable "key_vault" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
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

variable "storage_account" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
  description = "Generic Storage Account for Wallet uses"
}

variable "cicd_principal_ids" {
  type = object({
    infra = object({
      ci = string
      cd = string
    })
    app = object({
      ci = optional(string, "")
      cd = string
    })
  })
  description = "Principal ID of CICD pipelines"
}

variable "wallet_dns_zone_id" {
  type        = string
  description = "wallet.io.pagopa.it DNS zone id"
}

variable "cosmos_db_uat" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
    database_name       = string
  })
}
