#!/bin/bash

#
# Create a pair of rsa keys in the current folder.
# Keys will be stored in {name}-private.pem and {name}-public.pem files
#
# Usage:
#   ./generate-key-pair.sh key_name
#

KEY_NAME=$1
DIR=$(dirname $(readlink -f ${BASH_SOURCE[0]}))

if [ -z "$KEY_NAME" ]; then
  echo "Must provide a name for the key pair."
  exit 0
fi

echo "Saving key pair into $DIR directory."

PRIVATE_KEY=$KEY_NAME-private.pem
PUBLIC_KEY=$KEY_NAME-public.pem

openssl genrsa -out "$DIR/$PRIVATE_KEY" 2048 > /dev/null
echo "$PRIVATE_KEY created."
openssl rsa -in "$DIR/$PRIVATE_KEY" -pubout -outform PEM -out "$DIR/$PUBLIC_KEY" > /dev/null
echo "$PUBLIC_KEY created."
