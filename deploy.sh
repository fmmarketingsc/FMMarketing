#!/bin/bash
set -e

echo "Deploying to fmmarketingsc.com..."
vercel --prod --yes
echo "Done! fmmarketingsc.com is live."
