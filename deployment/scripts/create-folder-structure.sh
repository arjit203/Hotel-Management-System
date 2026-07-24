#!/bin/bash
# 7 Vachan — Folder Structure Creation Script (MongoDB version)
set -e

ROOT="$(pwd)"

echo "Creating frontend structure..."
mkdir -p frontend/public
mkdir -p frontend/src/{components,pages,layouts,hooks,services,context,styles,assets,utils}
mkdir -p frontend/src/modules/{hotel,marriage-hall,restaurant}
mkdir -p frontend/tests

echo "Creating admin-panel structure..."
mkdir -p admin-panel/src/{components,pages,layouts,services,utils}
mkdir -p admin-panel/src/modules/{bookings,payments,coupons,reviews,gallery,blogs,notifications,analytics}
mkdir -p admin-panel/tests

echo "Creating backend structure..."
mkdir -p backend/src/modules/{auth,hotel,marriage-hall,restaurant,booking-engine,payments,notifications,admin,branches,content,analytics}
mkdir -p backend/src/{middlewares,config,jobs,utils}
mkdir -p backend/tests

echo "Creating database structure (MongoDB)..."
mkdir -p database/models database/seeders database/schema-reference

echo "Creating apis structure..."
mkdir -p apis/postman-or-openapi

echo "Creating shared structure..."
mkdir -p shared/{constants,types-or-interfaces,validation-schemas}

echo "Creating payments structure..."
mkdir -p payments/razorpay payments/invoices

echo "Creating seo structure..."
mkdir -p seo/sitemaps seo/schema-markup-templates seo/meta-config

echo "Creating security structure..."
mkdir -p security/policies security/configs

echo "Creating docs structure..."
mkdir -p docs

echo "Creating deployment structure..."
mkdir -p deployment/{ci-cd,environments,scripts}

echo ""
echo "✅ Folder structure created successfully at: $ROOT"
