#!/bin/bash

# Start Postgres on container boot
sudo service postgresql start

# Generate .env
cat <<EOF > .env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
EOF