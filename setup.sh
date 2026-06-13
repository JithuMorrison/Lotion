#!/bin/bash

cd app

npm install

echo 'DATABASE_URL="file:./prisma/dev.db"' > .env

npx prisma migrate deploy

npx prisma generate

npm run seed

npm run dev
