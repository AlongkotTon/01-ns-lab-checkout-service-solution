# Review checklist — checkout-service

ใช้เป็นเกณฑ์รีวิวทุก PR · ทุกข้อที่พบต้องระบุ **ไฟล์:บรรทัด** และระดับความรุนแรง (CRITICAL / HIGH / MEDIUM / LOW)

## Security
- [ ] ไม่มี secret / API key / token / password hardcode ในโค้ดหรือ config
- [ ] input จากผู้ใช้ถูก validate ก่อนใช้เสมอ (body, query, params, headers)
- [ ] ไม่มีการต่อสตริงเข้า query / command / eval จาก input ของผู้ใช้
- [ ] endpoint ที่แตะข้อมูล order/user ต้องผ่านการตรวจ bearer token
- [ ] error response ไม่รั่ว stack trace หรือ internal detail ออกไปหา client

## Correctness
- [ ] การคำนวณเงิน (total, discount) ใช้จำนวนเต็มสตางค์ ไม่ใช่ float
- [ ] edge case: จำนวนติดลบ, ศูนย์, ค่าที่หายไป, id ที่ไม่มีอยู่ ต้องได้ 4xx ไม่ใช่ 500
- [ ] status code ถูกต้องตามความหมาย (400 validation, 401 auth, 404 not found)

## Testing
- [ ] โค้ดใหม่ทุก path มี test ครอบ (happy path + error path)
- [ ] test ไม่พึ่ง timing / ลำดับการรัน / state ที่แชร์ระหว่างเคส
- [ ] statement coverage รวมต้องไม่ต่ำกว่า 85%

## Style / Maintainability
- [ ] ตั้งชื่อสื่อความหมาย ตรงกับ convention เดิมของ repo
- [ ] ไม่มี dead code, console.log ที่ลืมลบ, หรือ TODO ค้างโดยไม่มี issue อ้างอิง
