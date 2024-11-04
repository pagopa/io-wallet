variable "product_id" {
  type        = string
  description = "Product ID"
}

variable "project_legacy" {
  type = string
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "apim" {
  type = object({
    name                    = string
    resource_group_name     = string
    name_itn                = optional(string)
    resource_group_name_itn = optional(string)
  })
  description = "APIM configuration variables"
}

variable "key_vault_id" {
  type        = string
  description = "Key Vault ID"
}

variable "key_vault_wallet_id" {
  type        = string
  description = "Wallet Key Vault ID"
}

variable "revision" {
  type        = string
  description = "Revision"
  default     = "v1"
}

variable "function_apps" {
  type = object({
    user_function = object({
      function_hostname = string
    })
    support_function = object({
      function_hostname = string
    })
  })
  description = "APIM configuration variables"
}
