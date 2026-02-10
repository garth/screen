#!/bin/sh
set -e

echo "Running database migrations..."
bin/migrate

echo "Starting server..."
exec bin/server
