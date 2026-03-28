FROM denoland/deno:alpine

# Install git, bash, and python3 for benchmarks and agent commands
RUN apk add --no-cache git bash python3 curl

# Install cursor-agent to a global path
RUN curl -fsSL https://cursor.sh/agent/install.sh | BIN_DIR=/usr/local/bin bash

# Configure git to allow commits inside benchmarks
RUN git config --global user.email "flowai@korchasa.dev" && \
    git config --global user.name "flowai Agent" && \
    git config --global init.defaultBranch main

WORKDIR /app

# The project will be mounted to /app
ENTRYPOINT ["deno"]
