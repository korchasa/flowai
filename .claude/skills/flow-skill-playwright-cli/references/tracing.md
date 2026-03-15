# Tracing & Video

Capture detailed execution traces or video recordings for debugging.

## Tracing

Traces include DOM snapshots, network activity, and console logs.

```bash
playwright-cli tracing-start
# ... actions ...
playwright-cli tracing-stop
```

View traces in the `traces/` directory.

## Video Recording

Produces WebM visual recordings.

```bash
playwright-cli video-start
# ... actions ...
playwright-cli video-stop demo.webm
```

## Comparison

| Feature         | Trace     | Video |
| --------------- | --------- | ----- |
| DOM inspection  | Yes       | No    |
| Network details | Yes       | No    |
| Best for        | Debugging | Demos |
