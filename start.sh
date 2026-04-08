#!/bin/bash

# Start Backend
echo "Starting Backend..."
cd backend && npm run dev &
BACKEND_PID=$!

# Start Frontend
echo "Starting Frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

# Wait
wait
