@echo off
echo Starting TravellingOrder Engine on http://localhost:8080
echo Press Ctrl+C to stop.
npx http-server . -p 8080 -c-1 -o
