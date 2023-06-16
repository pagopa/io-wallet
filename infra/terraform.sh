#!/bin/bash

set -e

action=$1
env=$2
shift 2
other=$@

subscription="MOCK_VALUE"

if [ -z "$action" ]; then
  echo "Missed action: init, apply, plan"
  exit 0
fi

if [ -z "$env" ]; then
  echo "env should be: dev, uat or prod."
  exit 0
fi

# current script location
here=$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")

# The directory where terraform code is
SOURCE_DIR="$here/src"
# The directory where config for the given environment is found
#  relative to SOURCE_DIR
ENV_DIR="../env/$env"

echo ""
echo "📁 Source is at $SOURCE_DIR"
echo "📝 Configuration is at $SOURCE_DIR/$ENV_DIR"
echo ""

# alias for the terraform command
tf="terraform -chdir=$SOURCE_DIR"

# shellcheck source=/dev/null
source "$SOURCE_DIR/$ENV_DIR/backend.ini"

az account set -s "${subscription}"

if [ "$action" = "force-unlock" ]; then
  echo "🧭 terraform INIT in env: ${env}"
  $tf init -reconfigure -backend-config="$ENV_DIR/backend.tfvars" $other
  warn_message="You are about to unlock Terraform's remote state. 
  This is a dangerous task you want to be aware of before going on.
  This operation won't affect your infrastructure directly.
  However, please note that you may lose pieces of information about partially-applied configurations.

  Please refer to the official Terraform documentation about the command:
  https://developer.hashicorp.com/terraform/cli/commands/force-unlock"
  printf "\n\e[33m%s\e[0m\n\n" "$warn_message"

  read -r -p "Please enter the LOCK ID: " lock_id
  $tf force-unlock "$lock_id"
  
  exit 0 # this line prevents the script to go on
fi

if echo "init plan apply refresh import output state taint destroy" | grep -w "$action" > /dev/null; then
  if [ "$action" = "init" ]; then
    echo "🧭 terraform INIT in env: ${env}"
    $tf "$action" -reconfigure -backend-config="$ENV_DIR/backend.tfvars" $other
  elif [ "$action" = "output" ] || [ "$action" = "state" ] || [ "$action" = "taint" ]; then
    # init terraform backend
    echo "🧭 terraform (output|state|taint) launched with action: ${action} in env: ${env}"
    $tf init -reconfigure -backend-config="$ENV_DIR/backend.tfvars"
    $tf "$action" $other
  else
    # init terraform backend
    echo "🧭 terraform launched with action: ${action} in env: ${env}"

    $tf init -reconfigure -backend-config="$ENV_DIR/backend.tfvars"
    $tf "$action" -var-file="$ENV_DIR/terraform.tfvars" $other
  fi
else
    echo "Action not allowed."
    exit 1
fi
