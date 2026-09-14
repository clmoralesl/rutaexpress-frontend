# ==========================================
# Etapa 1: Construccion (Build)
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copiar definicion de dependencias e instalar
COPY package*.json ./
RUN npm ci

# Copiar codigo fuente del frontend y compilar
COPY . .
RUN npm run build -- --configuration production

# ==========================================
# Etapa 2: Servidor Ligero Nginx (Runtime)
# ==========================================
FROM nginx:1.27-alpine

# Copiar configuracion de Nginx con Reverse Proxy y SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos compilados desde la etapa de construccion
COPY --from=build /app/dist/rutaexpress-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
