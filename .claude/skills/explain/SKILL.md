---
name: explain
description: Explain in simple Thai what was just built or changed, or what a concept means, for a non-technical learner. Use when the learner says เมื่อกี้ทำอะไรไป, อธิบายหน่อย, ไม่เข้าใจ, ทำงานยังไง, explain, คืออะไร.
---

# Explain

The learner wants to understand, not to read code.

- Explain with an everyday analogy first (ร้านอาหาร, สมุดบัญชี, ตู้เก็บของ), then one or two sentences on what actually happens.
- Talk about what the app does, not file names. If naming a part helps, use a friendly name: "ส่วนที่จำข้อมูล", "หน้าฟอร์ม".
- At most 6 short lines, or a tiny bullet list. No code blocks unless the learner explicitly asks to see code; then show at most 10 lines with Thai comments.
- For "what did you just do": summarise the last change as 2–4 bullets of visible behaviour ("กดปุ่มบันทึกแล้วรายการจะไปอยู่ด้านล่าง"), then where to try it in their browser.
- End with a question that checks understanding or invites a next step: "อยากให้ลองเปลี่ยนอะไรต่อไหม".

Useful analogies:
- localStorage = สมุดจดที่อยู่ในเบราว์เซอร์ของเครื่องนั้น เปิดเครื่องอื่นจะไม่เห็น
- database = สมุดกลางบนอินเทอร์เน็ต เปิดจากเครื่องไหนก็เห็นข้อมูลเดียวกัน
- deploy = ย้ายร้านจากบ้านไปเปิดหน้าร้านจริง ให้ใครก็เดินเข้ามาได้
- save point = จุดเซฟในเกม
- component = ตัวต่อเลโก้ที่เอามาประกอบเป็นหน้าเว็บ
- login / RLS = ล็อกเกอร์ที่แต่ละคนมีกุญแจของตัวเอง
