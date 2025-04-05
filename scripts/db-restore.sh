#!/bin/bash
#
# PostgreSQL Database Restore Script
# ---------------------------------
#
# This script restores a PostgreSQL database from a dump file.
# It uses DATABASE_URL from the .env file for database connection.
#
# Usage:
#   ./scripts/db-restore.sh [-d|--database DATABASE_NAME] [-f|--file DUMP_FILE] [-F|--format FORMAT] [-h|--help]
#
# Options:
#   -d, --database    Target database name (default: from DATABASE_URL)
#   -f, --file        Source dump file (defaults to most recent dump file in db-backups/)
#   -F, --format      Format (auto|binary|sql) - default: auto (determined by file extension)
#   -h, --help        Show help message
#
# Examples:
#   ./scripts/db-restore.sh                          # Restore most recent dump to default database
#   ./scripts/db-restore.sh -d my_database           # Restore most recent dump to specific database
#   ./scripts/db-restore.sh -f backup.dump           # Restore specific dump to default database
#   ./scripts/db-restore.sh -f backup.sql -d my_db   # Restore specific dump to specific database
#
# Features:
#   - Automatically finds the most recent dump file if none is specified
#   - Creates the target database if it doesn't exist
#   - Asks for confirmation before overwriting an existing database
#   - Automatically detects file format based on extension (.sql or .dump)
#
# Notes:
#   - Requires PostgreSQL client tools (psql, pg_restore)
#   - Uses .env file for database connection details if available
#   - Default values are used if environment variables are not set
#   - Looks for dump files in the db-backups/ directory by default

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

# Set default values
TARGET_DB=$DB_NAME
SOURCE_FILE=""
FORMAT="auto"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--database)
      TARGET_DB="$2"
      shift 2
      ;;
    -f|--file)
      SOURCE_FILE="$2"
      shift 2
      ;;
    -F|--format)
      if [[ "$2" == "sql" ]] || [[ "$2" == "binary" ]] || [[ "$2" == "auto" ]]; then
        FORMAT="$2"
      else
        echo "Error: Invalid format. Use 'auto', 'binary' or 'sql'"
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [-d|--database DATABASE_NAME] [-f|--file DUMP_FILE] [-F|--format FORMAT]"
      echo "  -d, --database  Target database name (default: from DATABASE_URL)"
      echo "  -f, --file      Source dump file (defaults to most recent dump file in db-backups/)"
      echo "  -F, --format    Format (auto|binary|sql) - default: auto (determined by file extension)"
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

# Ensure db-backups directory exists
mkdir -p "$PROJECT_ROOT/db-backups"

# Find newest dump file if no source file provided
if [ -z "$SOURCE_FILE" ]; then
  # First look for binary dumps, then SQL dumps
  SOURCE_FILE=$(find "$PROJECT_ROOT/db-backups" -name "*.dump" -o -name "*.sql" 2>/dev/null | sort -r | head -n 1)
  
  if [ -z "$SOURCE_FILE" ]; then
    echo "Error: No dump files found in db-backups/ directory. Please specify a source file using -f or --file."
    exit 1
  fi
elif [[ "$SOURCE_FILE" != /* ]] && [[ "$SOURCE_FILE" != ./* ]]; then
  # If source file doesn't have a path, look in db-backups/ directory
  if [ -f "$PROJECT_ROOT/db-backups/$SOURCE_FILE" ]; then
    SOURCE_FILE="$PROJECT_ROOT/db-backups/$SOURCE_FILE"
  fi
fi

# Check if source file exists
if [ ! -f "$SOURCE_FILE" ]; then
  echo "Error: Source file '$SOURCE_FILE' not found"
  exit 1
fi

# Determine the format if set to auto
if [ "$FORMAT" == "auto" ]; then
  if [[ "$SOURCE_FILE" == *.dump ]]; then
    FORMAT="binary"
  else
    FORMAT="sql"
  fi
fi

echo "Starting database restore..."
echo "Source file: $SOURCE_FILE"
echo "Target database: $TARGET_DB"
echo "Format: $FORMAT"
echo "Host: $DB_HOST"

# Check if database exists, create if not
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $TARGET_DB
if [ $? -ne 0 ]; then
  echo "Database $TARGET_DB does not exist. Creating it..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $TARGET_DB;"
  if [ $? -ne 0 ]; then
    echo "Error: Failed to create database $TARGET_DB"
    exit 1
  fi
else
  # Ask for confirmation before overwriting
  read -p "Database $TARGET_DB already exists. Do you want to overwrite it? (y/n): " CONFIRM
  if [[ $CONFIRM != [yY] ]]; then
    echo "Restore canceled"
    exit 0
  fi
fi

# Restore database
if [ "$FORMAT" == "binary" ]; then
  PGPASSWORD=$DB_PASSWORD pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $TARGET_DB -c "$SOURCE_FILE"
else
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $TARGET_DB -f "$SOURCE_FILE"
fi

if [ $? -eq 0 ]; then
  echo "Database restore completed successfully"
else
  echo "Error: Database restore failed"
  exit 1
fi 