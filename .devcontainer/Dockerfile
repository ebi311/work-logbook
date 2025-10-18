# Dockerfile for a Debian-derived devcontainer for Node.js + SvelteKit development
# Uses Node 20 on Debian Bookworm (slim) as base
FROM node:20-bookworm-slim

# ARG USERNAME=vscode
# ARG USER_UID=1000
# ARG USER_GID=1000

# ENV DEBIAN_FRONTEND=noninteractive \
#   HOME=/home/${USERNAME} \
#   TZ=Etc/UTC \
#   LANG=C.UTF-8 \
#   NODE_ENV=development

# Install essential packages for development (git, build tools, sudo, python for node-gyp, etc.)
RUN apt-get update 
#  && apt-get install -y --no-install-recommends \
#   ca-certificates \
#   curl \
#   git \
#   sudo \
#   build-essential \
#   python3 \
#   python3-pip \
#   openssh-client \
#   procps \
#   iproute2 \
#   locales \
  # tzdata \
#  && rm -rf /var/lib/apt/lists/*

# Configure locale (optional but helpful)
# RUN sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
#  && locale-gen

# Create non-root user for VS Code Remote - Dev Containers
# RUN groupadd --gid ${USER_GID} ${USERNAME} || true \
#  && useradd --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME} -s /bin/bash \
#  && usermod -aG sudo ${USERNAME} \
#  && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
#  && chmod 0440 /etc/sudoers.d/${USERNAME}

# Install pnpm and configure per-user store/home
# ENV PNPM_HOME=/home/${USERNAME}/.local/share/pnpm \
#   PNPM_STORE_PATH=/home/${USERNAME}/.pnpm-store

RUN npm install -g pnpm@latest --no-audit --no-fund
#  && mkdir -p "${PNPM_HOME}" "${PNPM_STORE_PATH}"
#  && chown -R ${USERNAME}:${USERNAME} "${PNPM_HOME}" "${PNPM_STORE_PATH}" \
#  && pnpm -v

WORKDIR /workspaces

# Enable Corepack and activate pnpm (commonly used in SvelteKit projects)
# RUN corepack enable \
#  && corepack prepare pnpm@latest --activate

# Install global dev tools if desired (uncomment to add)
# RUN npm install -g @sveltejs/kit

# Expose typical SvelteKit dev port
# EXPOSE 5173

# Recommended: keep node_modules owned by the non-root user in mounted volumes
# RUN chown -R ${USERNAME}:${USERNAME} /workspace

# USER ${USERNAME}

# Default working directory and shell
# ENV PATH=/home/${USERNAME}/.local/bin:$PATH
CMD ["bash"]