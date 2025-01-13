variable "prefix" {
  type        = string
  description = "IO Prefix"
}

variable "env_short" {
  type        = string
  description = "Short environment"
}

variable "project" {
  type        = string
  description = "IO prefix and short environment"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "cidr_subnet_user_func_02" {
  type        = string
  description = "CIDR block for user function app subnet 02"
}

variable "private_endpoint_subnet_id" {
  type        = string
  description = "Private Endpoints subnet Id"
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network to create subnet in"
}

variable "cosmos_db_endpoint" {
  type        = string
  description = "Cosmos DB endpoint to use as application environment variable"
}

variable "key_vault_id" {
  type        = string
  description = "Id of the common Key Vault where save secrets in"
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Resource group name of the private DNS zone to use for private endpoints"
}

variable "cosmos_database_name" {
  type        = string
  description = "Wallet Cosmos DB database name"
}

variable "key_vault_wallet_id" {
  type        = string
  description = "Id of the wallet Key Vault where save secrets"
}

variable "key_vault_wallet_name" {
  type        = string
  description = "Name of the wallet Key Vault where save secrets"
}

variable "storage_account_cdn_name" {
  type        = string
  description = "Name of the CDN storage account"
}

variable "user_func" {
  type = object({
    app_settings = list(object({
      name                  = string
      value                 = optional(string, "")
      key_vault_secret_name = optional(string)
    }))
  })
  description = "Configuration of the user-func"
}

variable "support_func" {
  type = object({
    app_settings = list(object({
      name                  = string
      value                 = optional(string, "")
      key_vault_secret_name = optional(string)
    }))
  })
  description = "Configuration of the support-func"
}

variable "application_insights_connection_string" {
  type        = string
  description = "Application Insights instrumentation key"
  default     = null

  sensitive = true
}

variable "cidr_subnet_support_func" {
  type        = string
  description = "CIDR block for support function app subnet"
}

variable "nat_gateway_id" {
  type        = string
  description = "NAT gateway Id"
}

variable "action_group_wallet_id" {
  type        = string
  description = "Id of the Action Group owned by the Wallet team"
}

variable "action_group_io_id" {
  type        = string
  description = "Id of the Action Group shared among all IO teams"
}

variable "wallet_instance_creation_email_queue_name" {
  type        = string
  description = "Send Email on Wallet Instance Creation Queue Name"
}

variable "wallet_instance_revocation_email_queue_name" {
  type        = string
  description = "Send Email on Wallet Instance Revocation Queue Name"
}

variable "validate_wallet_instance_certificates_queue_name" {
  type        = string
  description = "Wallet Instance Certificates Validation Queue Name"
}
