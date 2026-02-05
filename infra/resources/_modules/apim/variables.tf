variable "product_id" {
  type        = string
  description = "Product ID"
}

variable "project_legacy" {
  type = string
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "apim" {
  type = object({
    name                = string
    resource_group_name = string
    id                  = string
  })
  description = "APIM configuration variables"
}

variable "revision" {
  type        = string
  description = "Revision"
  default     = "v1"
}