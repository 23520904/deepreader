FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_INTERNAL_URL=http://localhost:8083
ARG GOOGLE_CLIENT_ID=
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
ARG BACKEND_INTERNAL_URL=http://localhost:8083
ARG GOOGLE_CLIENT_ID=
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
EXPOSE 3001
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3001"]
