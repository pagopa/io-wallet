resource "github_repository" "this" {
  name        = "io-wallet"
  description = "Wallet Provider implementation for EUDI Wallet and IT-Wallet for App IO"

  #tfsec:ignore:github-repositories-private
  visibility = "public"

  allow_auto_merge            = true
  allow_rebase_merge          = false
  allow_merge_commit          = false
  allow_squash_merge          = true
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "BLANK"

  delete_branch_on_merge = true

  has_projects    = false
  has_wiki        = false
  has_discussions = false
  has_issues      = false
  has_downloads   = false

  topics = ["io", "it-wallet", "eudiw"]

  vulnerability_alerts = true

  archive_on_destroy = true
}