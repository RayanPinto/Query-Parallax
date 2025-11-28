FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /mini-balancer .

FROM alpine:3.18
COPY --from=builder /mini-balancer /mini-balancer
COPY config.yaml /config.yaml
EXPOSE 8089
ENTRYPOINT ["/mini-balancer"]
