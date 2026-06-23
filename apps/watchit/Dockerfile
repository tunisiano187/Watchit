FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g npm

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/messages ./messages
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/drizzle ./drizzle

EXPOSE 3000
CMD ["npm", "start"]
