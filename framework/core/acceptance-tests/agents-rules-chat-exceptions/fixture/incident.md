# Incident

Product: RelayDesk. Error shown verbatim: "Unsupported value for retry_mode". Configuration key: retry_mode. Its supported values are "off" (no automatic repeats) and "fixed" (repeat every 30 seconds). Current value: "adaptive". This deployment requires automatic repeated delivery after temporary failures, so switch to "fixed". Support request should ask whether adaptive retries are planned; no timeline has been announced.

