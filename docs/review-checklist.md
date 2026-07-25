# Team Review Checklist — checkout-service

ใช้ไล่ทุกข้อเวลารีวิว PR ของทีม อ้างอิงเลขข้อ (C1–C8) ในผลรีวิวเสมอ

## Correctness

- **C1 — Money เป็น integer satang เท่านั้น**: ห้ามคำนวณเงินด้วย float / ทศนิยม ทุกจำนวนเงินต้องเป็นสตางค์ (integer) และแปลงผ่าน helper ใน `src/money.ts`
- **C2 — Edge cases มีเทสต์ครอบ**: โค้ดที่แก้/เพิ่มต้องมีเทสต์ครอบ กรณีปกติ + กรณีขอบ (ศูนย์, ติดลบ, ค่าเกิน, ไม่พบ resource)
- **C3 — Error handling ถูกต้อง**: endpoint ต้องตอบ HTTP status ที่ถูกต้อง (400 validation, 404 not found, 409 conflict) ไม่โยน 500 จาก input ผู้ใช้

## Security

- **C4 — ไม่มี secret ใน diff**: ไม่มี API key, token, รหัสผ่าน, connection string หลุดเข้า commit
- **C5 — Validate input ทุกจุดเข้า**: ข้อมูลจาก request body/params ต้องถูก validate ก่อนใช้ ห้ามเชื่อ client

## Convention

- **C6 — ตั้งชื่อตาม convention ทีม**: ฟังก์ชัน/ตัวแปรเป็น camelCase, type/interface เป็น PascalCase, ไฟล์เทสต์อยู่ใน `src/__tests__/*.test.ts`
- **C7 — ไม่มี `any` / `console.log` ทิ้งไว้**: ห้ามใช้ `any` โดยไม่มีเหตุผล และไม่มี debug log ค้างในโค้ด production

## Process

- **C8 — commit message สื่อความ**: อธิบายว่าทำอะไร/ทำไม ไม่ใช่ "fix" หรือ "update" เฉย ๆ
