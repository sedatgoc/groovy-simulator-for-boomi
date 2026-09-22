# Security

## What this tool is

Groovy Simulator for Boomi evaluates **arbitrary Groovy and JavaScript source code
supplied via HTTP** on the machine that runs it. This is not a bug — it is the
entire purpose of the application. Every deployment should be treated as
capable of full remote code execution against the host it runs on.

The `SecureASTCustomizer` used on the Groovy path blocks a handful of
receivers (`java.lang.System`, `java.lang.Runtime`) but is **not a sandbox**.
Scripts can still reach `java.io.File`, `java.net.URL`, `java.net.Socket`,
`java.lang.ProcessBuilder`, reflection, class loading, and Groovy `@Grab`.
The JavaScript path applies **no sandbox at all** — a script can call
`Java.type("java.lang.Runtime").getRuntime().exec(...)` directly.

## Threat model

Assume anyone who can make an HTTP request to the `/boomi/groovy` or
`/boomi/javascript` endpoints can:

- Read and write any file the process user can access.
- Execute arbitrary shell commands as the process user.
- Open outbound network connections.
- Read environment variables and process memory.

## How to run it safely

**Local development, single user, localhost only.**

- Bind the server to `127.0.0.1` (do not expose `0.0.0.0` beyond your machine).
- Do **not** put this behind a reverse proxy on the public internet.
- Do **not** deploy it to a cloud VM (EC2, GCE, Azure) with an attached IAM
  role or instance profile — a pasted script can trivially query the instance
  metadata service (`169.254.169.254`) and exfiltrate credentials.
- If you must run it in a container on a shared host, use
  `--network=none` (or a network with no egress), `--read-only`,
  `--cap-drop=ALL`, and run as an unprivileged user.

## What this tool is *not*

- Not a hosted service. Do not offer it as SaaS.
- Not multi-tenant. Concurrent requests share process state via
  `com.boomi.execution.ExecutionUtil` and can read each other's properties
  and log output. Treat every deployment as single-user.
- Not audited. There is no authentication, no authorization, no rate
  limiting, and no execution timeout on the JavaScript path.

## Reporting a vulnerability

If you find a way to escape the deployment model described above (for
example, an unauthenticated way to reach the eval endpoints from an
unexpected origin), please open a private security advisory on GitHub
instead of a public issue.

## Trademarks

Groovy Simulator for Boomi simulates aspects of the custom-scripting runtime
used by Boomi, LP's iPaaS platform, for developer testing purposes only. Boomi
is a trademark of Boomi, LP. This project is not affiliated with, sponsored
by, or endorsed by Boomi, LP.
