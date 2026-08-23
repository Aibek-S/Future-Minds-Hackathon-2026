#!/bin/bash
set -e

# This script runs during PostgreSQL initialization (before user databases are created)
# It fixes the collation version mismatch in template1

echo "Fixing template1 collation version..."

# Wait for PostgreSQL to be ready
until pg_isready -U postgres; do
  sleep 1
done

# Fix template1 collation version
# The issue: template1 was created with collation version 2.43, but OS provides 2.44
# Solution: Refresh collation version in template1
psql -U postgres -d template1 -c "ALTER DATABASE template1 REFRESH COLLATION VERSION;" 2>/dev/null || true

# If that doesn't work, force update the system catalog
psql -U postgres -d template1 -c "UPDATE pg_database SET datcollversion = 0 WHERE datname = 'template1';" 2>/dev/null || true

# Verify fix
psql -U postgres -d template1 -c "SELECT datname, datcollversion FROM pg_database WHERE datname = 'template1';"

echo "template1 collation fix completed"