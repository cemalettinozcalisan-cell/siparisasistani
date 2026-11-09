# Webhook hızlı testi: panelde/sesli bildirimde yeni sipariş oluşturur.
# Kullanım:
#   powershell -ExecutionPolicy Bypass -File .\scripts\webhook-test.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\webhook-test.ps1 -Product "Manda Sucuk" -Quantity 2 -Price 1600 -City "İstanbul" -District "Kadıköy"
param(
  [string]$TenantId = "00000000-0000-0000-0000-000000000001",
  [string]$ApiBase = "http://localhost:3001",
  [string]$EventId = ("test-web-" + (Get-Date -Format "yyyyMMddHHmmss")),
  [string]$Phone = "905000000001",
  [string]$Product = "Kangal Sucuk",
  [double]$Quantity = 1,
  [double]$Price = 750,
  [string]$City = "Ankara",
  [string]$District = "Çankaya",
  [string]$PaymentMethod = "website"
)

$body = @{
  id             = $EventId
  order_number   = "WEB-$EventId"
  customer_name  = "Webhook Test"
  customer_phone = $Phone
  address        = "Test Mahallesi No:1"
  city           = $City
  district       = $District
  payment_method = $PaymentMethod
  items          = @(
    @{ name = $Product; quantity = $Quantity; unit = "KG"; price = $Price }
  )
} | ConvertTo-Json -Depth 6

Write-Host "POST $ApiBase/api/webhook/custom/$TenantId" -ForegroundColor Cyan
Write-Host "EventId: $EventId (tekrar kullanmayın; idempotency duplicate döner)" -ForegroundColor DarkGray

try {
  $res = Invoke-RestMethod -Uri "$ApiBase/api/webhook/custom/$TenantId" -Method Post -Body $body -ContentType "application/json"
  $res | ConvertTo-Json -Depth 5
  Write-Host ""
  Write-Host "Kontrol:" -ForegroundColor Green
  Write-Host " - Panel > Siparişler: yeni 26-xxxx (kanal WEB, not: Web custom #WEB-$EventId)"
  Write-Host " - Panel > Bildirimler: 'Yeni Sipariş' zili"
  Write-Host " - AI çalışan sesli bildirim kuyruğu (ai_voice_notifications)"
  Write-Host " - WhatsApp grup kuyruğu (ai_events: whatsapp_group_sent)"
} catch {
  Write-Host "HATA: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}
