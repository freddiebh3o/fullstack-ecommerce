#!/usr/bin/env bash
set -euo pipefail

BUCKET="${S3_BUCKET_NAME:-ecom-dev-bucket}"

echo "[localstack-init] Ensuring S3 bucket '$BUCKET' exists and is configured..."

# Create bucket (idempotent)
awslocal s3 mb "s3://$BUCKET" 2>/dev/null || true

# CORS config (allow localhost app to PUT/GET)
cat >/tmp/cors.json <<'JSON'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2"],
      "MaxAgeSeconds": 3000
    }
  ]
}
JSON

awslocal s3api put-bucket-cors \
  --bucket "$BUCKET" \
  --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "http://127.0.0.1:3000"],
      "AllowedMethods": ["GET","PUT","POST","HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 600
    }
  ]
}'

# Public read policy for objects (so you can load images directly)
cat >/tmp/policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::$BUCKET/*"]
    }
  ]
}
JSON

awslocal s3api put-bucket-policy \
  --bucket "$BUCKET" \
  --policy file:///tmp/policy.json

# Lifecycle to keep the bucket tidy in dev
cat >/tmp/lifecycle.json <<'JSON'
{
  "Rules": [
    {
      "ID": "AbortIncompleteUploads",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 1 }
    },
    {
      "ID": "AutoDeleteAllObjectsAfter7Days",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Expiration": { "Days": 7 }
    }
  ]
}
JSON

awslocal s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --lifecycle-configuration file:///tmp/lifecycle.json

echo "[localstack-init] S3 bucket '$BUCKET' ready."
