terraform {
  required_providers { google = { source = "hashicorp/google", version = "~>5.0" } }
}
provider "google" {
  project = var.project_id
  region  = var.region
}
variable "project_id" {}
variable "region"     { default = "us-central1" }

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com", "aiplatform.googleapis.com", "firestore.googleapis.com",
    "storage.googleapis.com", "texttospeech.googleapis.com",
    "artifactregistry.googleapis.com", "cloudbuild.googleapis.com", "firebase.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "fluence" {
  location      = var.region
  repository_id = "fluence-repo"
  format        = "DOCKER"
  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket" "assets" {
  name                        = "${var.project_id}-fluence-assets"
  location                    = "US"
  uniform_bucket_level_access = true
  cors {
    origin          = ["https://fluenceai.app", "http://localhost:5173"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_firestore_database" "default" {
  name        = "(default)"
  location_id = "nam5"
  type        = "FIRESTORE_NATIVE"
  depends_on  = [google_project_service.apis]
}

output "bucket_name" { value = google_storage_bucket.assets.name }
