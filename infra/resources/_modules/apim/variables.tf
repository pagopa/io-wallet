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
    name                = string
    resource_group_name = string
  })
  description = "APIM configuration variables"
}

variable "user_function" {
  type = object({
    function_hostname = string
  })
  description = "APIM configuration variables"
}

variable "key_vault_id" {
  type        = string
  description = "Key Vault ID"
}