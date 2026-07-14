# ✅ SOLUTION — checkout-service (Lab B · Dev + QA)

> สำหรับผู้สอนเท่านั้น — โค้ดชุดนี้คือสภาพ "ทำครบทุกโจทย์" ของ `checkout-service`
> ทุกอย่าง build เขียว และ `npm test` ผ่าน 29 เทสต์ (รวมเทสต์ concurrency)

## สิ่งที่ต่างจาก repo ผู้เรียน (ไฟล์ต่อไฟล์)

| ไฟล์ | สถานะ | คืออะไร |
|---|---|---|
| `src/lib/locks.ts` | ➕ ใหม่ | per-key async mutex ใช้ร่วมทั้ง QA fix และ idempotency |
| `src/services/inventoryService.ts` | ✏️ แก้ | **QA:** ห่อ read-check-write ใน `withLock('sku:...')` → กัน oversell |
| `src/services/couponService.ts` | ✏️ แก้ | **Dev:** implement กฎ coupon ครบ (null/expired/min/percent/fixed/clamp) |
| `src/repositories/couponRepo.ts` | ➕ ใหม่ | async store ของ coupon (seed 3 ตัวอย่างใน `app.ts`) |
| `src/services/orderService.ts` | ✏️ แก้ | **Dev:** เสียบ coupon เข้า pricing · rollback stock เมื่อ line หลัง fail · **idempotency**: key เดิม → order เดิม ไม่ตัดสต็อกซ้ำ, serialize ต่อ key (ผ่าน stretch concurrent) และบันทึก key **หลังสำเร็จเท่านั้น** เพื่อให้ retry หลัง error ได้ |
| `src/__tests__/couponService.test.ts` | ➕ | กฎ coupon ทุกข้อ + boundary (expiresAt == now, subtotal == min) |
| `src/__tests__/inventory.test.ts` | ➕ | พื้นฐาน + race 2 ตัว + race 10 ตัว ไม่ oversell |
| `src/__tests__/checkoutFeature.test.ts` | ➕ | coupon ใน breakdown · idempotency (ซ้ำ/ต่างคีย์/พร้อมกัน) · rollback |

## จุดที่ควรชี้ตอนเฉลย
1. **Race (QA):** บั๊กคือ *check-then-act* ข้าม `await` — สองคน `get` เห็น stock เท่ากันแล้วต่างคน `put` เฉลยที่รับได้มี 2 แบบ: per-sku lock (แบบนี้) หรือ compare-and-set retry loop · แก้เทสต์ให้ยอมรับ oversell = ไม่ผ่าน
2. **Idempotency (Dev):** ลำดับสำคัญ — เช็ค key ก่อนทำงาน, บันทึก key หลังสำเร็จ (ถ้าบันทึกก่อน reserve แล้วพัง จะ retry ไม่ได้) · stretch ระดับ concurrent ต้อง serialize ต่อ key
3. **Rollback:** ถ้า reserve line หลัง fail ต้อง `release` ของที่จองไปแล้ว — จุดที่ผู้เรียนมักลืม
4. คะแนนบางส่วน: coupon ครบแต่ idempotency แบบ non-concurrent = ยังผ่านเกณฑ์หลัก (concurrent เป็น stretch)
