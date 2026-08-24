"""Hold a large, genuinely RESIDENT allocation so the watchdog can measure it.

Used only by process_watchdog_test.ts. A plain `bytearray(80 MiB)` is not
enough: CPython zero-fills it once, nothing reads it again, and macOS's memory
compressor reclaims the pages within a few hundred milliseconds. Measured on
2026-08-24 at 92% swap usage, RSS fell from 90 MB to 3.8 MB after the first
second and stayed there, so the watchdog's 10 MiB ceiling was never crossed and
the test failed with trippedCause=null. Touching every page in a loop keeps the
allocation hot and RSS steady at ~86 MB under the same pressure.
"""

import sys
import time

size = int(sys.argv[1]) if len(sys.argv) > 1 else 80 * 1024 * 1024
seconds = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0

buf = memoryview(bytearray(size))
deadline = time.time() + seconds
while time.time() < deadline:
    for offset in range(0, size, 16384):
        buf[offset] = 1
    time.sleep(0.02)
