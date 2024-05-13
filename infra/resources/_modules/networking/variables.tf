variable "project" {
  type        = string
  description = "IO prefix and short environment"
}

variable "project_legacy" {
  type        = string
  description = "IO prefix and short environment for legacy resources"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "cidr_subnet_wallet" {
  type        = list(string)
  description = "CIDR block for wallet subnet"
}
