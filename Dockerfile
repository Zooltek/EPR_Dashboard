# ==========================================
# Multi-Stage Dockerfile — EPR Dashboard
# ==========================================

# 1. Stage: Build Frontend (Vite + React)
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2. Stage: Build Backend (Express + TypeScript)
FROM node:22-alpine AS server-builder
WORKDIR /app/server
RUN apk add --no-cache python3 make g++ gcc
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# 3. Stage: Production Runner Image
FROM node:22-alpine AS runner
WORKDIR /app

# Configurações de Fuso Horário Brasil
RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production
ENV PORT=3001

# Instalação apenas das dependências de produção do backend
WORKDIR /app/server
COPY server/package*.json ./
RUN apk add --no-cache python3 make g++ gcc && \
    npm ci --omit=dev && \
    apk del python3 make g++ gcc

# Copia o código compilado do backend
COPY --from=server-builder /app/server/dist ./dist

# Copia o build estático do frontend
COPY --from=client-builder /app/client/dist /app/client/dist

# Cria diretórios persistentes para o SQLite e arquivos FTP
COPY PBI /app/PBI
RUN mkdir -p /app/server/data /app/server/downloads

EXPOSE 3001

CMD ["node", "dist/index.js"]
