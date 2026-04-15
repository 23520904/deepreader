# JVM Performance Tuning Baseline

This profile provides a production-safe baseline for DeepReader services running on Java 21.

## Recommended Environment Variable

Set `JAVA_TOOL_OPTIONS` for every backend service:

```bash
-XX:+UseG1GC
-XX:MaxRAMPercentage=70
-XX:InitialRAMPercentage=25
-XX:+AlwaysActAsServerClassMachine
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=./logs
-Xlog:gc*:file=./logs/gc.log:time,uptime,tags,level
```

## Notes

- `MaxRAMPercentage` is container-friendly and safer than fixed `-Xmx`.
- GC log and heap dump are enabled for incident analysis.
- For low-latency workloads, benchmark ZGC before switching from G1.
