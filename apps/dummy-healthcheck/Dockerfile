FROM public.ecr.aws/docker/library/nginx:alpine

RUN printf 'server {\n  listen 80;\n  location /health { return 200 "ok\n"; add_header Content-Type text/plain; }\n}\n' \
    > /etc/nginx/conf.d/default.conf

RUN addgroup -g 1111 appgroup \
    && adduser -D -u 1111 -G appgroup -s /bin/sh appuser

USER appuser

CMD ["nginx", "-g", "daemon off;"]