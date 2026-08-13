-- Görüşme oturumlarına sipariş bağlantısı (foreign key)
-- Veri bütünlüğü bug'ını çözer: order_id artık jsonb'de değil, kendi kolonunda

alter table conversation_sessions
  add column if not exists order_id uuid references orders(id) on delete set null;

create index if not exists idx_conv_sessions_order on conversation_sessions(order_id);
