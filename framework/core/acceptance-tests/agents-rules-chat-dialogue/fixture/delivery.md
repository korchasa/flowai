# Delivery choices

RetryThenReview: retry failed delivery after 30 seconds, at most three failed attempts, then put the job in a queue for human review. This reduces human work but delays reporting persistent failures. ReviewImmediately: put a failed delivery in the review queue after the first failure; no retries. This gives people visibility sooner but creates more review work for short outages.

Configuration keys: deliveryMode (RetryThenReview or ReviewImmediately), retryDelaySeconds (30), maxAttempts (3), alertEmail (recipient of failures sent for review). In both modes the recipient must be set before enabling delivery. A manual review item is not an automatic deletion. The operator verifies the selected policy by sending a job to an unavailable endpoint and checking the review queue plus the email notification.

