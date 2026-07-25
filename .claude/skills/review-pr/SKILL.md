---
name: review-pr
description: รีวิว PR ตามหมายเลขที่ระบุ โดยไล่ตาม review checklist ของทีม
allowed-tools: Read, Grep, Glob, Bash(gh pr view:*), Bash(gh pr diff:*)
argument-hint: <pr-number>
---

รีวิว PR #$1 ของ repo นี้

## Diff ของ PR (ดึงสด)

!`gh pr diff $1`

## Checklist ของทีม

@docs/review-checklist.md

## วิธีรีวิว

1. อ่าน diff ข้างบนให้ครบทุกไฟล์ ถ้าต้องดู context เพิ่ม ให้ Read ไฟล์จริงใน repo ประกอบ
2. ไล่ checklist ทีละข้อ (C1–C8) — ทุกข้อต้องระบุว่า **ผ่าน / ไม่ผ่าน / ไม่เกี่ยวกับ PR นี้** พร้อมอ้างไฟล์:บรรทัดจาก diff เป็นหลักฐาน
3. สรุปท้ายรีวิว:
   - รายการข้อที่ไม่ผ่าน พร้อมข้อเสนอวิธีแก้
   - verdict: **APPROVE** (ผ่านทุกข้อ) หรือ **REQUEST CHANGES** (มีข้อไม่ผ่าน)
