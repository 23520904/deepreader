#!/bin/bash
cd ~/Project/deepreader

docker compose up -d

cd frontend
nohup npm run dev -- --hostname 0.0.0.0 --port 3001 > frontend.log 2>&1 &
