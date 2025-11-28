package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

type request struct {
    SQL string `json:"sql"`
}

type response struct {
    Rows []map[string]interface{} `json:"rows"`
}

func main() {
    dsn := os.Getenv("DB_DSN") // e.g. "postgres://user:pw@postgres:5432/dbname"
    pool, err := pgxpool.New(context.Background(), dsn)
    if err != nil {
        log.Fatalf("db connect error: %v", err)
    }
    defer pool.Close()

    http.HandleFunc("/execute", func(w http.ResponseWriter, r *http.Request) {
        var req request
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "bad json", http.StatusBadRequest)
            return
        }
        rows, err := pool.Query(context.Background(), req.SQL)
        if err != nil {
            http.Error(w, err.Error(), http.StatusBadGateway)
            return
        }
        defer rows.Close()

        var out []map[string]interface{}
        for rows.Next() {
            values, err := rows.Values()
            if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
            }
            descr := rows.FieldDescriptions()
            rowMap := make(map[string]interface{}, len(values))
            for i, v := range values {
                rowMap[string(descr[i].Name)] = v
            }
            out = append(out, rowMap)
        }
        resp := response{Rows: out}
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(resp)
    })

    log.Println("worker listening on :8001")
    log.Fatal(http.ListenAndServe(":8001", nil))
}
