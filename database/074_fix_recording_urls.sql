-- 074: Ses kaydı URL'lerini doğru route'a taşı (/api/order-ai/agent/recordings)
update call_recordings
 set recording_url = replace(recording_url, '/api/order-ai/recordings/', '/api/order-ai/agent/recordings/')
 where recording_url like '/api/order-ai/recordings/%';
