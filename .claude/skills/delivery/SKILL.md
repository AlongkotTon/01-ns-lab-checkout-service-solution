---
name: delivery
description: ส่งงานครบวงจร — chain /ship (review → test → commit → เปิด PR) แล้วต่อด้วย /review-pr รีวิว PR ที่เพิ่งเปิดด้วย checklist ทีมทันที
allowed-tools: Skill, Read, Grep, Glob, Bash(npm test:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr diff:*)
argument-hint: [pr-title]
---

ทำ 2 เฟสต่อกันตามลำดับ ห้ามข้ามเฟส และห้ามเข้าเฟส 2 ถ้าเฟส 1 ไม่จบ:

## เฟส 1 — Ship

เรียก skill `ship` โดยส่งชื่อ PR "$1" ต่อให้ (ถ้าไม่ให้มา ให้ ship ตั้งจาก diff เอง) แล้วทำตามขั้นตอนของ ship ให้ครบทั้ง 5 ขั้น

- ถ้า ship หยุดกลางทาง (เทสต์แดง / ไม่มีอะไรให้ commit) → **จบเลย** รายงานสาเหตุ ห้ามเข้าเฟส 2
- ถ้าจบสำเร็จ → จดเลข PR จาก URL ที่ `gh pr create` คืนมา (เช่น `.../pull/7` → เลข 7)

## เฟส 2 — Review

เรียก skill `review-pr` ด้วยเลข PR ที่ได้จากเฟส 1 แล้วรีวิวตาม checklist ทีมให้ครบทุกข้อ

## สรุปท้าย

รายงานรวบยอด: ลิงก์ PR · ผลเทสต์ · verdict จากรีวิว (APPROVE / REQUEST CHANGES) · ถ้ามีข้อไม่ผ่าน ให้ลิสต์สิ่งที่ต้องแก้ก่อน merge
