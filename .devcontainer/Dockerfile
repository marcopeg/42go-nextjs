FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install system dependencies
RUN apt-get update && \
    apt-get install -y curl wget gnupg2 lsb-release software-properties-common sudo

# Match the production Node LTS security patch and reviewed npm release.
ARG NODE_VERSION=24.22.1
# Install Node.js 24.x and npm
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs=${NODE_VERSION}-1nodesource1 && \
    npm install --global npm@12.2.0 --min-release-age=7

# Install Postgres 16
RUN echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list && \
    wget -qO - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get update && \
    apt-get install -y postgresql-16 postgresql-contrib-16

# Setup default Postgres password
RUN service postgresql start && \
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"