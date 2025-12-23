variable "subscription_id" {
  type        = string
  description = "Azure Subscription Id"
}

variable "cdn_principal_id" {
  type        = string
  description = "Principal ID of the CDN managed identity"
}

variable "cosmos_db" {
  type = object({
    name                = string
    resource_group_name = string
    database_name       = string
  })
}

variable "function_app" {
  type = object({
    user_func = object({
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

variable "key_vault_app" {
  type = object({
    name                = string
    resource_group_name = string
  })

  description = "KeyVault Id and list of Entra groups who are administrator of Key Vaults"
}

variable "key_vault_certificates" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Key Vault used to store certificates for CDN"
}

variable "cdn_storage_account" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Storage Account Id used for CDN"
}

variable "storage_account" {
  type = object({
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
    name                = string
    resource_group_name = string
    database_name       = string
  })
}

variable "application_gateway_id" {
  type        = string
  description = "Application Gateway resource ID"
  default     = null
}

variable "is_psn" {
  type        = bool
  default     = false
  description = "Temporary variable to manage both IO and PSN resources"
}

variable "cdn_endpoint_id" {
  type        = string
  description = "CDN endpoint id"
}

variable "cdn_frontdoor" {
  type        = string
  description = "Whether the CDN is Front Door or not"
  default     = "false"
}
