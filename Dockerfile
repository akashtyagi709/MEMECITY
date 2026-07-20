# Stage 1: Build the Angular application
FROM node:20-alpine AS builder

WORKDIR /app

# Dependency files copy karo aur install karo
COPY package*.json ./
RUN npm ci

# Baaki source code copy karo aur production build banao
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve the app using Nginx
FROM nginx:alpine

# Angular build output ko Nginx public folder mein copy karo
# (Note: Agar output folder 'dist/your-app-name/browser' hai toh path adjust kar lena)
COPY --from=builder /app/dist /usr/share/nginx/html

# Agar custom nginx config hai toh usse copy kar sakte ho (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]