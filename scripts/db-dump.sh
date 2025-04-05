#!/bin/bash
#
# PostgreSQL Database Dump Script
# -------------------------------
#
# This script creates a dump of a PostgreSQL database.
# It uses DATABASE_URL from the .env file for database connection.
#
# Usage:
#   ./scripts/db-dump.sh [-d|--database DATABASE_NAME] [-o|--output OUTPUT_FILE] [-F|--format FORMAT] [-h|--help]
#
# Options:
#   -d, --database    Source database name (default: from DATABASE_URL)
#   -o, --output      Output file name (default: DB_NAME_TIMESTAMP.sql or .dump)
#   -F, --format      Format (binary|sql) - default: binary
#   -h, --help        Show help message
#
# Examples:
#   ./scripts/db-dump.sh                      # Dump default database to binary format
#   ./scripts/db-dump.sh -d my_database       # Dump specific database to binary format
#   ./scripts/db-dump.sh -F sql               # Dump default database to plain SQL format
#   ./scripts/db-dump.sh -d my_db -F sql      # Dump specific database to plain SQL format
#
# Notes:
#   - Requires PostgreSQL client tools (pg_dump)
#   - Uses .env file for database connection details if available
#   - Default values are used if environment variables are not set
#   - Files are saved to the db-backups/ directory

# Get the project root directory (parent of scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load environment variables from .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
  echo "Error: .env file not found in project root"
  exit 1
fi

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not found in .env file"
  exit 1
fi

# Parse DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

OUTPUT_FILE=""
FORMAT="binary"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--database)
      DB_NAME="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    -F|--format)
      if [[ "$2" == "sql" ]]; then
        FORMAT="sql"
      elif [[ "$2" == "binary" ]]; then
        FORMAT="binary"
      else
        echo "Error: Invalid format. Use 'binary' or 'sql'"
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [-d|--database DATABASE_NAME] [-o|--output OUTPUT_FILE] [-F|--format FORMAT]"
      echo "  -d, --database  Source database name (default: from DATABASE_URL)"
      echo "  -o, --output    Output file name (default: DB_NAME_TIMESTAMP.sql or .dump)"
      echo "  -F, --format    Format (binary|sql) - default: binary"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Ensure db-backups directory exists in project root
mkdir -p "$PROJECT_ROOT/db-backups"

# Set format parameters
if [[ "$FORMAT" == "binary" ]]; then
  FORMAT_PARAM="c"
  EXT="dump"
else
  FORMAT_PARAM="p"
  EXT="sql"
fi

# Create file name if not specified
if [ -z "$OUTPUT_FILE" ]; then
  TIMESTAMP=$(date +"%Y%m%d%H%M%S")
  OUTPUT_FILE="$PROJECT_ROOT/db-backups/${DB_NAME}_${TIMESTAMP}.${EXT}"
elif [[ "$OUTPUT_FILE" != /* ]]; then
  # If output file is specified but not absolute path, add the project root and db-backups prefix
  OUTPUT_FILE="$PROJECT_ROOT/db-backups/$(basename "$OUTPUT_FILE")"
fi

echo "Starting database dump..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Format: ${FORMAT}"
echo "Output file: $OUTPUT_FILE"

# Use PGPASSWORD to avoid password prompt
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  -F $FORMAT_PARAM \
  -f $OUTPUT_FILE

if [ $? -eq 0 ]; then
  echo "Database dump completed successfully"
  echo "Dump saved to: $OUTPUT_FILE"
else
  echo "Error: Database dump failed"
  exit 1
fi 