# frontend/Dockerfile
# Production-ready multi-stage Dockerfile для Next.js фронтенда

#########################
# СТЕЙДЖ 1: СБОРКА (builder)
#########################
FROM node:20-alpine AS builder

# Рабочая директория внутри контейнера
WORKDIR /app

# Копируем файлы зависимостей
# Контекст сборки — корень репозитория, поэтому путь начинается с frontend/
COPY frontend/package*.json ./

# Устанавливаем зависимости (для сборки)
RUN npm install

# Копируем исходный код фронтенда целиком
COPY frontend/ ./

# Сборка приложения Next.js в production-режиме
RUN npm run build

#########################
# СТЕЙДЖ 2: ПРОДАКШН-ОБРАЗ (runner)
#########################
FROM node:20-alpine AS runner

# Production-режим для Node.js
ENV NODE_ENV=production

# Рабочая директория
WORKDIR /app

# Копируем необходимые файлы из builder-стейджа
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Открываем порт, на котором будет работать Next.js
EXPOSE 3000

# Запуск собранного приложения
# next start использует уже собранный .next/
CMD ["npm", "start"]

