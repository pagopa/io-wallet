output "container_app_job" {
  value = {
    id                  = module.container_app_job_selfhosted_runner.container_app_job.id
    name                = module.container_app_job_selfhosted_runner.container_app_job.name
    resource_group_name = module.container_app_job_selfhosted_runner.container_app_job.resource_group_name
  }
}
