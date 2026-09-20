# Delivery queue release note

## Affected surface
Background delivery jobs only; interactive requests keep their current behaviour.

## Recovery policy
A failed job is retried after 30 seconds. After three failed attempts it is moved to the review queue. There is no automatic deletion.

## Required configuration
The operator must set the notification address before enabling the feature. The batch size is optional; omitted means 20 jobs.

## Rollout gate
Enable the feature only after a test failure has produced a notification. The new mode reduces lost jobs, but repeated attempts increase delivery time.

