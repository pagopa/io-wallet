variable "prefix" {
  type        = string
  description = "IO Prefix"
}

variable "env_short" {
  type        = string
  description = "Short environment"
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

variable "cidr_subnet_func_wallet" {
  type        = string
  description = "CIDR block for wallet function app subnet"
}

variable "private_endpoint_subnet_id" {
  type = string
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
}

variable "cosmos_db_endpoint" {
  type = string
}

variable "private_dns_zone_resource_group_name" {
  type = string
}
