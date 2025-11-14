# ==================== Builder Stage ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.build.json ./

# Install dependencies БЕЗ выполнения scripts
RUN npm install --frozen-lockfile --ignore-scripts || npm install --ignore-scripts

# Создаём директорию patches если её нет, потом копируем (если есть)
RUN mkdir -p patches

# Копируем содержимое patches если директория существует в контексте сборки
# Используем wildcards чтобы избежать ошибки если папки нет

# Альтернатива: копируем весь проект (patches войдёт автоматически)
# но делаем это ПОСЛЕ установки зависимостей
COPY . .

# Применяем патчи если они есть
RUN if [ -d "patches" ] && [ -n "$(ls -A patches 2>/dev/null)" ]; then \
      npm install -D patch-package && \
      npx patch-package; \
    fi

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production --ignore-scripts

# ==================== Production Stage ====================
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache tini curl wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built app and production node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/main.js"]
