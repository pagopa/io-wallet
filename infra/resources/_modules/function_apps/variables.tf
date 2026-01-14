variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    domain          = optional(string)
    instance_number = string
  })
}

variable "u_env_short" {
  type        = string
  description = "IO uat env_short"
}

variable "user_instance_number" {
  type    = string
  default = "01"
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
  default     = null
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

variable "application_insights_connection_string" {
  type        = string
  description = "Application Insights instrumentation key"

  sensitive = true
}

variable "cidr_subnet_support_func" {
  type        = string
  description = "CIDR block for support function app subnet"
}

variable "nat_gateway_id" {
  type        = string
  description = "NAT gateway Id"
  default     = null
}

variable "action_group_wallet_id" {
  type        = string
  description = "Id of the Action Group owned by the Wallet team"
}

variable "action_group_io_id" {
  type        = string
  description = "Id of the Action Group shared among all IO teams"
  default     = null
}

variable "wallet_instance_creation_email_queue_name" {
  type        = string
  description = "Send Email on Wallet Instance Creation Queue Name"
}

variable "wallet_instance_revocation_email_queue_name" {
  type        = string
  description = "Send Email on Wallet Instance Revocation Queue Name"
}

variable "cidr_subnet_user_uat_func" {
  type        = string
  description = "CIDR block for user uat function app subnet"
}

variable "cosmos_database_name_uat" {
  type        = string
  description = "uat Wallet Cosmos DB database name"
}

variable "front_door_profile_name" {
  type        = string
  description = "Front Door profile name"
}

variable "front_door_endpoint_name" {
  type        = string
  description = "Front Door endpoint name"
}

variable "subscription_id" {
  type        = string
  description = "Azure Subscription ID"
}

variable "private_dns_zone_ids" {
  type = object({
    blob          = optional(string)
    file          = optional(string)
    queue         = optional(string)
    table         = optional(string)
    azurewebsites = optional(string)
  })
  default = null
}

variable "subnet_route_table_id" {
  type        = string
  default     = null
  description = "Route table to associate with the subnets"
}

variable "health_check_path_user" {
  type        = string
  description = "Health check path for user function app"
}

variable "health_check_path_user_uat" {
  type        = string
  description = "Health check path for user uat function app"
}

variable "health_check_path_support" {
  type        = string
  description = "Health check path for support function app"
}

variable "wallet_instance_storage_account_url" {
  type        = string
  description = "The URL of the Wallet Instance Storage Account"
}

variable "wallet_instance_storage_account_name" {
  type        = string
  description = "The name of the Wallet Instance Storage Account"
}

variable "wallet_instance_storage_account_uat_url" {
  type        = string
  description = "The URL of the Wallet Instance Storage Account UAT"
}

variable "wallet_instance_storage_account_uat_name" {
  type        = string
  description = "The name of the Wallet Instance Storage Account UAT"
}