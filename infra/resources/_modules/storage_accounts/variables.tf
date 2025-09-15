
variable "prefix" {
  type        = string
  description = "IO prefix"
}

variable "env_short" {
  type        = string
  description = "IO env_short"
}

variable "u_env_short" {
  type        = string
  description = "IO uat env_short"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "domain" {
  type        = string
  description = "Azure domain"
}

variable "app_name" {
  type        = string
  description = "Azure app_name"
}

variable "instance_number" {
  type        = string
  description = "Azure instance_number"
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

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Resource group of the Private DNS Zone used for private endpoints"
}

variable "subnet_pep_id" {
  type        = string
  description = "Id of the private endpoints' subnet"
}

variable "key_vault_wallet_id" {
  type        = string
  description = "Id of the wallet Key Vault where storage account saves secrets"
}

variable "action_group_wallet_id" {
  type        = string
  description = "Id of the Action Group owned by the Wallet team"
}
