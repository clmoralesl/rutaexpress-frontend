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

# Cabeceras de seguridad incluidas por cada location (issue #74)
COPY nginx/cabeceras-seguridad.conf /etc/nginx/snippets/cabeceras-seguridad.conf

# Copiar archivos compilados desde la etapa de construccion
COPY --from=build /app/dist/rutaexpress-frontend/browser /usr/share/nginx/html

COPY docker/40-rutaexpress-config.sh /docker-entrypoint.d/40-rutaexpress-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-rutaexpress-config.sh \
 && chmod 755 /docker-entrypoint.d/40-rutaexpress-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
