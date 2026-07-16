FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
RUN groupadd -r app && useradd -r -g app app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY . .
RUN uv sync --frozen --no-dev && chown -R app:app /app

USER app

EXPOSE 8000

# Render (and most PaaS hosts) inject PORT at runtime and route traffic to
# whatever port the container actually binds — the fixed EXPOSE 8000 above is
# only documentation. Shell form is required so $PORT is expanded; falls back
# to 8000 for `docker run` without an explicit PORT (e.g. local testing).
CMD ["sh", "-c", ".venv/bin/python agent.py serve --host 0.0.0.0 --port ${PORT:-8000}"]
