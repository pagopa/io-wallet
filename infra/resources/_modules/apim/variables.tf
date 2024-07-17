variable "product_id" {
  type        = string
  description = "Product ID"
}

variable "project_legacy" {
  type        = string
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "apim_name" {
  type        = string
  description = "Name of the APIM instance"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "user_function_hostname" {
  type        = string
  description = "User function hostname"
}