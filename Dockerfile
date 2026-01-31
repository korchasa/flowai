FROM denoland/deno:alpine

# Install git, bash, and python3 for benchmarks and agent commands
RUN apk add --no-cache git bash python3

# Configure git to allow commits inside benchmarks
RUN git config --global user.email "agent@assistflow.ai" && \
    git config --global user.name "AssistFlow Agent" && \
    git config --global init.defaultBranch main

WORKDIR /app

# The project will be mounted to /app
ENTRYPOINT ["deno"]
