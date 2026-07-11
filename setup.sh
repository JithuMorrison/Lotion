#!/bin/bash

cd app

yarn install

echo 'DATABASE_URL="file:./prisma/dev.db"' > .env

npx prisma migrate deploy

npx prisma generate

yarn run seed

yarn run dev
