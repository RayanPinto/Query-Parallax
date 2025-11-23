# ---------- Builder ----------
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod ./
# go.sum might not exist yet if we haven't run go mod tidy, but usually it should. 
# For safety in this scaffold, we'll just copy go.mod and run tidy if needed, or just copy . 
# Since we created go.mod manually, we need to run go mod tidy to get go.sum, or just download.
# To be safe and simple for the user:
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o /worker .

# ---------- Runtime ----------
FROM alpine:3.18
COPY --from=builder /worker /worker
EXPOSE 8001
ENTRYPOINT ["/worker"]
