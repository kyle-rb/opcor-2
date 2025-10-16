FROM denoland/deno:2.5.4

EXPOSE 8000

WORKDIR /app

ADD . /app

RUN deno cache server.ts

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"]