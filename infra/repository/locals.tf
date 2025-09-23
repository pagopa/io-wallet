locals {
  repository = {
    name                     = "io-wallet"
    description              = "Wallet Provider implementation for EUDI Wallet and IT-Wallet for App IO"
    topics                   = ["eudiw", "io", "it-wallet"]
    reviewers_teams          = ["io-wallet", "engineering-team-cloud-eng"]
    default_branch_name      = "master"
    infra_cd_policy_branches = ["master"]
    opex_cd_policy_branches  = ["master"]
    app_cd_policy_branches   = ["master"]
    jira_boards_ids          = ["CES", "SIW"]
  }
}
