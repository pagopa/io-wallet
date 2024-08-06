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

variable "cidr_subnet_user_func" {
  type        = string
  description = "CIDR block for wallet function app subnet"
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

variable "cosmos_db_key" {
  type        = string
  description = "Cosmos DB primary key"
}

variable "cosmos_database_names" {
  type        = list(string)
  description = "List of Cosmos DB database names"
}

variable "key_vault_wallet_id" {
  type        = string
  description = "Id of the wallet Key Vault where save secrets"
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

variable "application_insights_connection_string" {
  type        = string
  description = "Application Insights instrumentation key"
  default     = null

  sensitive = true
}

variable "enable_autoscaling" {
  type        = bool
  description = "Enable autoscaling"
  default     = false
}