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

variable "dns_zone" {
  type        = string
  default     = null
  description = "The dns subdomain."
}

variable "keyvault_vault_name" {
  type        = string
  default     = null
  description = "The name of the keyvault to store the cdn certificate"
}