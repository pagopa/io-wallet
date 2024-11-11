
variable "prefix" {
  type        = string
  description = "IO prefix"
}

variable "env_short" {
  type        = string
  description = "IO env_short"
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