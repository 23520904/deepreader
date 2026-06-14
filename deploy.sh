#!/usr/bin/env bash
set -e

cd ~/Project/deepreader

echo "Pull latest UI branch..."
git pull origin UI

echo "Build and restart containers..."
docker compose up -d --build

echo "Show containers..."
docker compose ps
