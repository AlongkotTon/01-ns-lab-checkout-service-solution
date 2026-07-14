# Lab B (HARD) — Assignments on `checkout-service`

> ใช้ role+context และวงจร `/plan → /diff → refine` · แก้ให้น้อยที่สุดเท่าที่ทำให้ spec เป็นจริง

---

## 🟦 Track Dev — Coupons + Idempotent Checkout

feature ข้ามหลายไฟล์: `types.ts` · `couponService.ts` · `orderService.ts` · `routes/orderRoutes.ts`
(+ เพิ่ม repo/แหล่งเก็บ coupon และ idempotency เอง)

### 1) Coupon → discount  (`couponService.discountForCoupon`)
implement ตามกฎใน docstring:
- coupon = null → 0
- หมดอายุ (`expiresAt <= now`, ใช้ injectable `Clock`) → 0
- `subtotal < minSubtotalCents` → 0
- `percent` → `percentOf(subtotal, value)` (ปัดครึ่งขึ้น) · `fixed` → `value` (cents)
- discount ต้องไม่เกิน subtotal

### 2) เสียบ coupon เข้า checkout
- หา coupon จาก `couponCode` (สร้าง `couponRepo` async + seed coupon ตัวอย่าง)
- ส่ง discount เข้า `priceCart(lines, discount)` ให้ total สะท้อนส่วนลด
- เก็บ `couponCode` ลง order

### 3) Idempotency (สำคัญ — กันคิดเงิน/ตัดสต็อกซ้ำ)
- ถ้ามี `Idempotency-Key` ซ้ำกับที่เคยสำเร็จ → คืน order **เดิม** และ **ห้าม reserve สต็อกซ้ำ**
- ออกแบบ store สำหรับ map key → orderId (async ได้)

### เกณฑ์ผ่าน (Dev)
- [ ] coupon ครบทุกกฎ (percent/fixed/expired/min/clamp) + มีเทสต์
- [ ] checkout สะท้อนส่วนลดใน breakdown
- [ ] ยิง checkout ด้วย key เดิม 2 ครั้ง → order เดียว, สต็อกลดครั้งเดียว (มีเทสต์พิสูจน์)
- [ ] `npm run build` เขียว · `npm test` เขียว · PR อธิบายชัด

> Stretch: ยิง checkout ด้วย key เดียวกัน **พร้อมกัน** (`Promise.all`) แล้วยังได้ order เดียว

---

## 🟩 Track QA — พิสูจน์ & แก้ Race Condition ใน `inventoryService`

`reserve/release/available` **ไม่มีเทสต์เลย** และ `reserve` มีบั๊ก concurrency ซ่อนอยู่

### สิ่งที่ต้องทำ
1. สร้าง `src/__tests__/inventory.test.ts`
2. เทสต์พื้นฐาน: reserve สำเร็จ/ไม่พอ, release คืนสต็อก, available ถูกต้อง
3. **เทสต์ concurrency (หัวใจ):** ตั้งสต็อก = 1 แล้วยิง reserve พร้อมกัน 2 ครั้ง
   ```ts
   await productRepo.seed([{ sku: 'X', name: 'X', priceCents: 100, stock: 1 }]);
   const results = await Promise.all([reserve('X', 1), reserve('X', 1)]);
   expect(results.filter(Boolean).length).toBe(1); // ต้องสำเร็จแค่ 1
   expect(await available('X')).toBe(0);            // สต็อกห้ามติดลบ
   ```

### 💥 คาดว่าจะเจอ
ทั้งสอง reserve จะ **สำเร็จทั้งคู่** (oversell) เพราะ `reserve` เป็น *check-then-act*
ที่ไม่มี lock — สองคน `get` เห็นสต็อกเท่ากัน แล้วต่างคนต่าง `put`

### เฉลยแนวทาง (แก้ที่โค้ด ไม่ใช่แก้เทสต์)
ทำให้ operation ต่อ sku เป็น serial เช่น per-sku async lock (คิวสัญญา) หรือ compare-and-set loop:
- ล็อกด้วย `Map<sku, Promise>` ต่อคิวก่อนเข้า critical section, หรือ
- อ่านใหม่+ตรวจ+เขียนแบบ retry จนไม่มีใครแทรก

### เกณฑ์ผ่าน (QA)
- [ ] เทสต์ครอบคลุม reserve/release/available + concurrency
- [ ] แก้ race ที่โค้ด → เทสต์ concurrency เขียว, สต็อกไม่ติดลบ
- [ ] `npm test` เขียวทั้งหมด · PR อธิบาย race + วิธีแก้
