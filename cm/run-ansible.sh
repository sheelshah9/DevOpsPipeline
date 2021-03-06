#!/bin/bash

# Exit on error
set -e

# Trace commands as we run them:
set -x

# Print error message and exit with error code 1
function die {
    echo "$1"
    exit 1
}

# Check the number of arguments
[ $# -ge 2 ] || die "usage: $0 <playbook> <inventory>"

PLAYBOOK=$1
INVENTORY=$2

if [ -n "$3" ]
then
    sudo ansible-playbook $PLAYBOOK -i $INVENTORY --vault-password-file ~/.vault-pass --extra-vars "GH_USER=$3 GH_PASS=$4"
else
    sudo ansible-playbook $PLAYBOOK -i $INVENTORY --vault-password-file ~/.vault-pass
fi

