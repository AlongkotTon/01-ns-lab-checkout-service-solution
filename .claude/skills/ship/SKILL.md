---
name: ship
description: review งานปัจจุบัน รันเทสต์ แล้ว commit + เปิด PR เมื่อทุกอย่างเขียว
allowed-tools: Read, Grep, Glob, Bash(npm test:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(gh pr create:*)
argument-hint: [pr-title]
---

ทำตามลำดับ ห้ามข้ามขั้น:
1. ดู diff ปัจจุบัน: !`git diff`
2. รีวิวหา bug ชัด ๆ / secret หลุด / โค้ดที่ผิด convention ทีม
3. รัน `npm test` — ถ้าแดง ให้หยุด รายงานสาเหตุ และห้าม commit
4. ถ้าเขียวทั้งหมด: `git add` เฉพาะไฟล์ที่เกี่ยว, commit ข้อความสั้นชัด
5. เปิด PR ชื่อ "$1" (ถ้าไม่ให้มา ให้ตั้งจาก diff) พร้อมสรุป ทำอะไร/ทำไม
