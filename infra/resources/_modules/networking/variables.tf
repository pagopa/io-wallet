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

variable "virtual_network_name" {
  type        = string
  description = "Name of the existing vnet to create subnet in"
}

variable "cidr_subnet_func_wallet" {
  type        = string
  description = "CIDR block for wallet function app subnet"
}

