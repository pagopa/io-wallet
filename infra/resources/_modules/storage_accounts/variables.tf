variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    name            = string
    instance_number = string
  })
}

variable "u_env_short" {
  type        = string
  description = "IO uat env_short"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "action_group_id" {
  type        = string
  description = "Id of the alert action group"
}

variable "key_vault_wallet_id" {
  type        = string
  description = "Id of the wallet Key Vault where storage account saves secrets"
  default     = null
}

variable "private_endpoint" {
  type = object({
    subnet_pep_id             = string
    blob_private_dns_zone_id  = string
    queue_private_dns_zone_id = string
  })
  default     = null
  description = "Configuration for the Private Endpoints"
}

variable "user_assigned_managed_identity_id" {
  type        = string
  default     = null
  description = "Id of the user-assigned managed identity to associate to Storage Accounts"
}

variable "customer_managed_key_url" {
  type        = string
  default     = null
  description = "URL of the customer managed key to encrypt the Storage Account"
}

variable "is_psn" {
  type        = bool
  default     = false
  description = "Temporary variable to manage both IO and PSN resources"
}