#!/bin/bash
# infrastructure/deploy.sh — deploy application to GCP
set -e

PROJECT_ID=${1:?'Usage: ./deploy.sh <project-id>'}

echo "Deploying Fluence AI to GCP Project: $PROJECT_ID"

# 1. Build and push backend image
echo "Building and pushing Backend Service..."
cd ../fluence-backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/fluence-backend

# 2. Deploy backend to Cloud Run
echo "Deploying Backend to Cloud Run..."
gcloud run deploy fluence-backend \
  --image gcr.io/$PROJECT_ID/fluence-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file env.yaml \
  --project $PROJECT_ID

# 3. Build frontend
echo "Building Frontend App..."
cd ../fluence-frontend
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm run build

# 4. Deploy frontend to Firebase App Hosting / Hosting
echo "Deploying Frontend..."
# Assuming Firebase is initialized. If not, this might need manual initialization first.
# firebase deploy --only hosting --project $PROJECT_ID

echo "Deployment complete! ✅"
echo "Note: Ensure you have populated the .env files in both backend and frontend directories with the correct credentials and endpoints."
