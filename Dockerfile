FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
COPY docker/frontend-entrypoint.sh /usr/local/bin/ayos-frontend-entrypoint
RUN chmod +x /usr/local/bin/ayos-frontend-entrypoint

EXPOSE 5173

ENTRYPOINT ["/usr/local/bin/ayos-frontend-entrypoint"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
