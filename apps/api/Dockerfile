FROM node:22-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --ignore-scripts
COPY . .
WORKDIR /app/apps/api
RUN pnpm prisma generate && pnpm build
COPY apps/api/entrypoint.sh /app/apps/api/entrypoint.sh
RUN chmod +x /app/apps/api/entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
