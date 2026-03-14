#!/bin/bash
# infrastructure/setup.sh

set -e
PROJECT_ID=${1:?'Usage: ./setup.sh <project-id>'}
gcloud config set project $PROJECT_ID
terraform init
terraform apply -var="project_id=$PROJECT_ID" -auto-approve
BUCKET=$(terraform output -raw bucket_name)

cd ../fluence-backend
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$PROJECT_ID/fluence-repo/fluence-backend:latest .

# Deploy with all required env vars including ADK / google-genai Vertex AI routing
gcloud run deploy fluence-backend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/fluence-repo/fluence-backend:latest \
  --region us-central1 --allow-unauthenticated \
  --timeout 3600 --memory 2Gi --cpu 2 --min-instances 1 \
  --set-env-vars "\
PROJECT_ID=$PROJECT_ID,\
GCS_BUCKET=$BUCKET,\
VERTEX_LOCATION=us-central1,\
GOOGLE_GENAI_USE_VERTEXAI=TRUE,\
GOOGLE_CLOUD_PROJECT=$PROJECT_ID,\
GOOGLE_CLOUD_LOCATION=us-central1"

BACKEND_URL=$(gcloud run services describe fluence-backend --platform managed --region us-central1 --format 'value(status.url)')

echo "Backend live at: $BACKEND_URL"
echo "Set VITE_BACKEND_WS_URL=$(echo $BACKEND_URL | sed 's/https/wss/') in frontend .env"
