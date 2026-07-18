# checkout-service — command handbook

Personal quick reference.
จดสั้น ๆ ว่าคำสั่งไหน **ทำอะไร** และ **เหมาะใช้ตอนไหน**

## Setup / build
| คำสั่ง | ทำอะไร | เหมาะใช้ตอนไหน |
|---|---|---|
| `npm install` | ติดตั้ง dependencies ลง `node_modules/` | ครั้งแรกที่ clone / หลัง `package.json` เปลี่ยน — ต้องทำก่อน build/test เสมอ |
| `npm run build` | `tsc` คอมไพล์ TS → `dist/` | ก่อน `npm start` หรือเช็กว่าคอมไพล์เป็น production ได้สะอาด |
| `npm run typecheck` | `tsc --noEmit` เช็ก type อย่างเดียว (ไม่มี output) | เช็ก type เร็ว ๆ โดยไม่รอ build/test — ใช้ระหว่างแก้โค้ด |

## Tests
| คำสั่ง | ทำอะไร | เหมาะใช้ตอนไหน |
|---|---|---|
| `npm test` | รัน Jest ทุก suite | ก่อน commit / หลังแก้อะไรที่กระทบหลายส่วน |
| `npx jest src/__tests__/inventory.test.ts` | รันเทสต์ไฟล์เดียว | โฟกัสไฟล์ที่กำลังแก้ ไม่ต้องรอทั้งชุด |
| `npx jest -t "CONCURRENCY"` | รันเฉพาะเทสต์ที่ชื่อ match | ไล่ debug เคสเดียว (เช่น เทสต์ concurrency ที่ fail) |

## Run
| คำสั่ง | ทำอะไร | เหมาะใช้ตอนไหน |
|---|---|---|
| `npm run dev` | `tsx watch` รีโหลดอัตโนมัติ → http://localhost:3000 | ระหว่างพัฒนา / เล่นเทสต์ API ด้วยมือ (auto-reload) |
| `npm start` | รัน `dist/index.js` ที่คอมไพล์แล้ว | รันแบบ production — ต้อง `npm run build` ก่อน |

เปิด Swagger UI ที่ **http://localhost:3000/docs** (spec ดิบที่ `/openapi.json`) — เหมาะเทสต์ API แบบกดคลิก ไม่ต้องพิมพ์ curl

## API (curl)
Seed ตอน startup ใน `src/app.ts` — products: `BOOK` 1500¢/25, `PEN` 250¢/100,
`MUG` 900¢/4 · coupons: `SAVE10` (10%, min 2000¢), `WELCOME200` (fixed 200¢, min 1000¢),
`EXPIRED` (หมดอายุ).

| คำสั่ง | ทำอะไร | เหมาะใช้ตอนไหน |
|---|---|---|
| `curl localhost:3000/health` | เช็ก `{status:"ok"}` | ยืนยันว่า server ขึ้นแล้ว |
| `curl localhost:3000/products` | ดูสินค้า + stock ปัจจุบัน | เช็ก stock ก่อน/หลัง checkout |

```bash
# checkout พร้อมคูปอง — ดูส่วนลด/ภาษีใน breakdown
curl -X POST localhost:3000/orders/checkout \
  -H 'Content-Type: application/json' \
  -d '{"lines":[{"sku":"BOOK","quantity":2}],"couponCode":"SAVE10"}'

# idempotent checkout — Idempotency-Key เดิม = order เดิม, ตัด stock ครั้งเดียว
# (รันซ้ำแล้วเทียบ order id — ต้องได้ตัวเดิม)
curl -X POST localhost:3000/orders/checkout \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-key-1' \
  -d '{"lines":[{"sku":"MUG","quantity":1}]}'
```

เคสเช็ก error mapping (หลังแก้บั๊ก): sku มั่ว → `404`, stock ไม่พอ → `409`,
Idempotency-Key เดิมแต่ cart ต่าง → `409`.

## Git / PR
| คำสั่ง | ทำอะไร | เหมาะใช้ตอนไหน |
|---|---|---|
| `git status` / `git diff` | ดูว่าอะไรเปลี่ยน | ก่อน stage/commit — ยืนยันว่าแก้ตรงที่ตั้งใจ |
| `git remote -v` | ดู remote (`origin`=fork, `upstream`=org) | ก่อนเปิด PR — รู้ว่ากำลังจะ push/PR ไปที่ไหน |
| `gh pr create --repo <org> --base main --head <user>:<branch>` | เปิด PR ข้าม fork ไป upstream | ส่งงาน lab ให้ org repo รีวิว |

## Config check
| คำสั่ง | ทำอะไร | เหมาะใช้ตอนไหน |
|---|---|---|
| `jq -e '.permissions.allow[]' .claude/settings.local.json` | เช็กว่าไฟล์ permission เป็น JSON ที่ parse ได้ | หลังแก้ `settings.local.json` |
| `git check-ignore <path>` | ยืนยันไฟล์ถูก ignore | เช็กว่า `settings.local.json` / `CHEATSHEET.md` ไม่โดน track |

## Session log — commands used & why
Commands run while working in this repo, with the reason for each.

| Command | Why |
|---|---|
| `git ls-files` / `ls -la` | Map the repo layout before writing `CLAUDE.md` (the `/init` step). |
| `cat README.md SOLUTION.md docs/ASSIGNMENTS.md` (via Read) | Understand this is a teaching-lab **solution** branch and what each assignment proves. |
| `npm install` | `node_modules/` is not checked in — required before any build/test can run. |
| `npm test` | Run the full Jest suite (baseline 29/29, later 35/35 pass). |
| `npm run typecheck` | `tsc --noEmit` — confirm no type errors independent of tests. |
| `npm run build` | `tsc` → `dist/` — confirm a clean production compile. |
| `jq -e '.permissions.allow[]' .claude/settings.local.json` | Validate the permissions file is well-formed JSON and rules parse. |
| `git check-ignore <path>` | Confirm `settings.local.json` and `CHEATSHEET.md` are untracked. |
| `git status --short` | Verify only intended files changed. |
| `git commit` / `git push -u origin feature/james` | Commit the bug fixes + swagger/refactor and publish the branch. |
| `brew install gh` + `gh pr create --repo Neversitup-Software/... --head [USER]:[Branch name]` | Open the PR from the fork to the upstream org repo. |
