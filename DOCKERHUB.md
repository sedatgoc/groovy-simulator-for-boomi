# Groovy Simulator for Boomi

A local sandbox for iterating on Boomi custom-scripting shape logic without
deploying to a Boomi runtime. Paste a payload, write a Groovy or JavaScript
script that consumes `dataContext` / `ExecutionUtil` the same way a real
Boomi Data Process shape would, run it, and inspect the outputs, properties,
and log output in a browser.

Source & full docs: <https://github.com/sedatgoc/groovy-simulator-for-boomi>

---

## ⚠ Security

This image evaluates arbitrary Groovy and JavaScript source code sent over
HTTP. That is the entire purpose of the tool. Every deployment must be
treated as capable of remote code execution against the host.

- **Bind to `127.0.0.1` only.** Never publish port 8080 to `0.0.0.0`.
- **Do not** put this behind a public reverse proxy.
- **Do not** run it on a cloud VM with an attached IAM role or instance
  profile — a pasted script can hit `169.254.169.254` and exfiltrate
  credentials.
- On a shared machine, add `--network=none --read-only --cap-drop=ALL`.

Full threat model: <https://github.com/sedatgoc/groovy-simulator-for-boomi/blob/master/SECURITY.md>

---

## Quick start

```bash
docker run --rm -p 127.0.0.1:8080:8080 sedatgoc/groovy-simulator-for-boomi:latest
```

Open <http://localhost:8080/>. Ctrl+Enter in the script editor runs.

## Hardened run (recommended)

```bash
docker run --rm \
    --network=none \
    --read-only \
    --cap-drop=ALL \
    -p 127.0.0.1:8080:8080 \
    sedatgoc/groovy-simulator-for-boomi:latest
```

`--network=none` disables outbound network from inside the container, so a
pasted script can't call out. The app itself only serves the local UI, so
no network is needed.

## docker-compose

Save as `docker-compose.yml`:

```yaml
services:
  groovy-simulator-for-boomi:
    image: sedatgoc/groovy-simulator-for-boomi:latest
    container_name: groovy-simulator-for-boomi
    ports:
      - "127.0.0.1:8080:8080"
    read_only: true
    cap_drop:
      - ALL
    # Comment the next line out if the container needs outbound network
    # (e.g. a script that fetches something over HTTP for debugging).
    network_mode: none
    restart: unless-stopped
```

Run it:

```bash
docker compose up -d
docker compose logs -f
docker compose down
```

## Choosing a different host port

If 8080 is taken, remap the host side (left of the colon) — keep 8080 on the
right, that's the container port:

```bash
docker run --rm -p 127.0.0.1:8082:8080 sedatgoc/groovy-simulator-for-boomi:latest
```

Open <http://localhost:8082/>.

## Tags

- `latest` — moves with the newest release. Fine for local use, do not pin
  in reproducible pipelines.
- `X.Y.Z` — immutable version. Pin this in scripts or CI.

## Verify the image locally

```bash
docker run --rm sedatgoc/groovy-simulator-for-boomi:latest --version 2>&1 | head -1
```

## Report issues

<https://github.com/sedatgoc/groovy-simulator-for-boomi/issues>

## License

MIT — <https://github.com/sedatgoc/groovy-simulator-for-boomi/blob/master/LICENSE>

## Trademarks

Groovy Simulator for Boomi simulates aspects of the custom-scripting runtime
used by Boomi, LP's iPaaS platform, for developer testing purposes only. Boomi
is a trademark of Boomi, LP. This project is not affiliated with, sponsored
by, or endorsed by Boomi, LP.
