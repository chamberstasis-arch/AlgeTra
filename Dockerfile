ARG NODE_IMAGE=node:22.14.0-alpine3.21

FROM ${NODE_IMAGE} AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable \
  && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

FROM base AS development

ENV NODE_ENV=development
EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]

FROM base AS build

ENV NODE_ENV=production
RUN pnpm build

FROM nginx:1.27.4-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY docs/api /usr/share/nginx/html/api-docs
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
