FROM denoland/deno:latest

WORKDIR /app
COPY . .

CMD ["run", "-A", "main.ts"]
