FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Build the application
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN mkdir -p dist && \
    bun build ./src/index.tsx --outdir ./dist --minify && \
    bunx @tailwindcss/cli -i ./src/styles.css -o ./dist/styles.css --minify

# Production image
FROM base AS production
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY index.html ./
COPY server.ts ./

ENV ANTHROPIC_API_KEY=""
ENV ANTHROPIC_BASE_URL="http://localhost:4141"

EXPOSE 3000

CMD ["bun", "run", "server.ts"]
