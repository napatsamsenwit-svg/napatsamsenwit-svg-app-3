/**
 * แหล่งความจริงเดียวของฟอร์ม "ANNA HR Business Blueprint" 13 หัวข้อ
 * สกัดตรง ๆ จาก reference/anna-hr-form.html (const SECTIONS) ห้ามแต่งข้อความเอง
 * - `guide` = แนวทางที่ใส่ใน prompt ของ AI ของหัวข้อนั้น (คัดลอกตัวอักษรต่อตัวอักษร)
 * - ช่อง/คอลัมน์ที่มี `ai: true` = มีปุ่ม AI รายช่อง (ต้นฉบับมีจุดเดียว: org.rows.purpose)
 */

export type FieldType = "text" | "textarea" | "select" | "number" | "list" | "table" | "cmpEdits";

export type Col = {
  k: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  /** ความกว้างขั้นต่ำของคอลัมน์ (px) ในตาราง */
  w?: number;
  ph?: string;
  options?: string[];
  ai?: boolean;
};

export type Field = {
  k: string;
  label: string;
  type: FieldType;
  ph?: string;
  options?: string[];
  /** เก็บค่าที่ไม่อยู่ในตัวเลือกไว้ (ไม่ล้างทิ้ง) */
  keep?: boolean;
  wide?: boolean;
  rows?: number;
  cols?: Col[];
  /** ช่องที่ไม่ส่งให้ AI เติม */
  noAI?: boolean;
  /** ช่อง Google Maps (มีการ์ดตรวจลิงก์) */
  map?: boolean;
  /** ช่อง BMC: ตำแหน่งบนผัง */
  cls?: string;
  /** หมวดก้างปลา (6M) */
  fb?: boolean;
};

export type Layout = "swot" | "fishbone" | "bmc";

export type Section = {
  id: string;
  no: number;
  th: string;
  en: string;
  desc: string;
  guide: string;
  layout?: Layout;
  /** Auto Generate เติมเฉพาะช่องที่ยังว่าง (ไม่เขียนทับ) */
  fillEmptyOnly?: boolean;
  /** หัวข้อ Key Competency: ใช้พจนานุกรมสมรรถนะแทนฟอร์มทั่วไป */
  dictOnly?: boolean;
  fields: Field[];
};

export const SECTIONS: Section[] = [
  {
    "id": "company",
    "th": "ข้อมูลบริษัท",
    "en": "Company Profile",
    "fillEmptyOnly": true,
    "desc": "บริษัทคือใคร ทำธุรกิจอะไร ข้อมูลส่วนนี้ใช้เป็นบริบทให้ Auto Generate ของทุกหัวข้อ",
    "guide": "เติมเฉพาะช่องที่ยังว่าง ส่งคืนเฉพาะคีย์ของช่องที่ว่าง ข้อมูลต้องสอดคล้องกับช่องที่ผู้ใช้กรอกไว้แล้ว ถ้าผู้ใช้แทบไม่ได้กรอกอะไร ให้อ้างอิงธุรกิจตัวอย่างในบริบท",
    "fields": [
      {
        "k": "name",
        "label": "ชื่อบริษัท",
        "type": "text",
        "ph": "เช่น บริษัท แสงทอง ไลท์ติ้ง จำกัด"
      },
      {
        "k": "legal",
        "label": "ประเภทนิติบุคคล",
        "type": "select",
        "options": [
          "บริษัทจำกัด",
          "บริษัทมหาชนจำกัด",
          "ห้างหุ้นส่วนจำกัด",
          "ห้างหุ้นส่วนสามัญ",
          "กิจการเจ้าของคนเดียว",
          "อื่น ๆ"
        ]
      },
      {
        "k": "model",
        "label": "รูปแบบธุรกิจ",
        "type": "select",
        "options": [
          "ซื้อมา-ขายไป (Trading)",
          "ผลิต (Manufacturing)",
          "บริการ (Service)",
          "ค้าปลีก (Retail)",
          "ค้าส่ง (Wholesale)",
          "ออนไลน์ (E-commerce)",
          "ผสมหลายรูปแบบ"
        ]
      },
      {
        "k": "industry",
        "label": "อุตสาหกรรม / กลุ่มสินค้า",
        "type": "select",
        "keep": true,
        "options": [
          "เกษตรกรรม การป่าไม้ และการประมง (Agriculture, forestry and fisheries)",
          "เคมี (Chemical)",
          "เครื่องจักรกลและโลหะการ (Machinery & Metal Work)",
          "เครื่องจักรกลการเกษตร (Agricultural Machinery Manufacturers)",
          "เครื่องนุ่งห่ม (Garments)",
          "เครื่องปรับอากาศและเครื่องทำความเย็น (Air-Conditioning and Refrigeration)",
          "เครื่องสำอาง (Cosmetic)",
          "เซรามิก (Ceramics)",
          "เทคโนโลยีชีวภาพ (Biotech)",
          "เฟอร์นิเจอร์ (Furniture)",
          "เยื่อและกระดาษ (Pulp and Paper)",
          "เหล็ก (Thailand Iron and Steel)",
          "แกรนิตและหินอ่อน (Granite and Marble)",
          "แก้วและกระจก (Thai Glass Manufactures)",
          "โรงเลื่อยและโรงอบไม้ (Wood Processing)",
          "โรงกลั่นน้ำมันปิโตรเลียม (Petroleum Refining)",
          "ไฟฟ้าและอิเล็กทรอนิกส์ (Electricals and Electronics)",
          "ไม้อัดไม้บางและวัสดุแผ่น (Thai Panel Product)",
          "การก่อสร้าง (Construction)",
          "การขนส่งและสถานที่เก็บสินค้า (Transportation and Storage Locations)",
          "การขายส่งและการขายปลีก (Wholesale and Retail)",
          "การจัดการเพื่อสิ่งแวดล้อม (Environmental Management)",
          "การจัดหาน้ำ การจัดการน้ำเสีย และของเสียรวมถึงกิจกรรมที่เกี่ยวข้อง (Water Supply, Wastewater Management)",
          "การซ่อมยานยนต์และจักรยานยนต์ (Repair of Motor and Motorcycles)",
          "การทำเหมืองแร่ และเหมืองหิน (Mining and Quarrying)",
          "การบริหารราชการ การป้องกันประเทศและการประกันสังคมภาคบังคับ (Public Administration National Defense and Compulsory Social Security)",
          "การผลิต (Production)",
          "การพิมพ์และบรรจุภัณฑ์ (Printing and Packaging)",
          "การศึกษา (Education)",
          "กิจกรรมเกี่ยวกับอสังหาริมทรัพย์ (Real Estate)",
          "กิจกรรมการจ้างงานในครัวเรือน (Household Employment, Product Production and Services for household own use)",
          "กิจกรรมการบริการด้านอื่น ๆ (Other Service Activities)",
          "กิจกรรมการบริหารและบริการสนับสนุน (Administrative and Support Services)",
          "กิจกรรมขององค์การระหว่างประเทศและภาคีสมาชิก (Activities of International Organizations and Member States)",
          "กิจกรรมด้านสุขภาพและงานสังคมสงเคราะห์ (Health and Social Work)",
          "กิจกรรมทางการเงินและการประกันภัย (Financial and Insurance)",
          "กิจกรรมวิชาชีพวิทยาศาสตร์และกิจกรรมทางวิชาการ (Scientific Professional and Academic Activities)",
          "ข้อมูลข่าวสารและการสื่อสาร (Information and Communication)",
          "ชิ้นส่วนและอะไหล่ยานยนต์ (Auto Parts)",
          "ดิจิทัล (Digital)",
          "ต่อเรือซ่อมเรือและก่อสร้างงานเหล็ก (Shipbuilding and Repairing and Steel Construction)",
          "ที่พักแรมและบริการด้านอาหาร (Accommodation and Food Services)",
          "น้ำตาล (Sugar)",
          "น้ำมันปาล์ม (Palm Oil)",
          "ปิโตรเคมี (Petrochemical)",
          "ปูนซีเมนต์ (Cement)",
          "ผลิตภัณฑ์เสริมอาหาร (Dietary Supplement)",
          "ผู้ผลิตเครื่องมือแพทย์ (Medical Device Manufactures)",
          "ผู้ผลิตไฟฟ้า (Power Producer)",
          "พลังงาน ไฟฟ้า ก๊าซ ไอน้ำ (Power, Electricity, Gas, Steam)",
          "พลังงานหมุนเวียน (Renewable Energy)",
          "พลาสติก (Plastic)",
          "ยา (Pharmaceuticals)",
          "ยาง (Rubber)",
          "ยานยนต์ (Automotive)",
          "รองเท้า (Footwear)",
          "ศิลปะ ความบันเทิงและนันทนาการ (Arts, Entertainment and Recreation)",
          "สมุนไพร (Herbal)",
          "สิ่งทอ (Textile)",
          "หนังและผลิตภัณฑ์หนัง (Leather Based)",
          "หล่อโลหะ (Foundry)",
          "หลังคาและอุปกรณ์ (Roofing and Accessories)",
          "หัตถกรรมสร้างสรรค์ (Creative Craft)",
          "อลูมิเนียม (Aluminium)",
          "อัญมณีและเครื่องประดับ (Gem and Jewelry)",
          "อาหารและเครื่องดื่ม (Food and Beverage)"
        ]
      },
      {
        "k": "business",
        "label": "ธุรกิจทำอะไร",
        "type": "textarea",
        "wide": true,
        "ph": "อธิบายสั้น ๆ ว่าบริษัทสร้างรายได้จากอะไร"
      },
      {
        "k": "products",
        "label": "สินค้า / บริการหลัก",
        "type": "textarea"
      },
      {
        "k": "customers",
        "label": "กลุ่มลูกค้าเป้าหมาย",
        "type": "textarea"
      },
      {
        "k": "channels",
        "label": "ช่องทางการขาย",
        "type": "textarea"
      },
      {
        "k": "competitors",
        "label": "คู่แข่งหลัก",
        "type": "textarea"
      },
      {
        "k": "founded",
        "label": "ปีที่ก่อตั้ง",
        "type": "text",
        "ph": "เช่น 2555"
      },
      {
        "k": "employees",
        "label": "จำนวนพนักงาน",
        "type": "text",
        "ph": "เช่น 85 คน"
      },
      {
        "k": "revenue",
        "label": "ช่วงรายได้ต่อปี",
        "type": "select",
        "keep": true,
        "options": [
          "ต่ำกว่า 10 ล้านบาท",
          "10-50 ล้านบาท",
          "50-100 ล้านบาท",
          "100-500 ล้านบาท",
          "500-1,000 ล้านบาท",
          "1,000-5,000 ล้านบาท",
          "5,000-10,000 ล้านบาท",
          "มากกว่า 10,000 ล้านบาท"
        ]
      },
      {
        "k": "location",
        "label": "ที่ตั้ง",
        "type": "text"
      },
      {
        "k": "map",
        "label": "ปักหมุด Google Maps",
        "type": "text",
        "ph": "วางลิงก์หมุดจาก Google Maps เช่น https://maps.app.goo.gl/…",
        "noAI": true,
        "map": true
      },
      {
        "k": "website",
        "label": "เว็บไซต์",
        "type": "text",
        "ph": "https://"
      },
      {
        "k": "challenges",
        "label": "ความท้าทาย / ปัญหาที่เผชิญอยู่",
        "type": "textarea",
        "wide": true
      }
    ],
    "no": 1
  },
  {
    "id": "vision",
    "th": "วิสัยทัศน์",
    "en": "Vision",
    "desc": "ภาพที่บริษัทอยากเป็นในอนาคต",
    "guide": "วิสัยทัศน์ 1–2 ประโยค ชัดเจน บอกทิศทางและกรอบเวลา คำสำคัญ 3–5 คำ ความหมายอธิบายว่าแต่ละคำสำคัญหมายถึงอะไร",
    "fields": [
      {
        "k": "vision",
        "label": "วิสัยทัศน์",
        "type": "textarea",
        "wide": true,
        "rows": 3
      },
      {
        "k": "horizon",
        "label": "กรอบเวลา",
        "type": "select",
        "options": [
          "3 ปี",
          "5 ปี",
          "10 ปี"
        ]
      },
      {
        "k": "keywords",
        "label": "คำสำคัญในวิสัยทัศน์",
        "type": "list"
      },
      {
        "k": "meaning",
        "label": "ความหมายและเหตุผล",
        "type": "textarea",
        "wide": true,
        "rows": 4
      }
    ],
    "no": 2
  },
  {
    "id": "mission",
    "th": "พันธกิจ",
    "en": "Mission",
    "desc": "สิ่งที่บริษัทต้องทำเพื่อไปถึงวิสัยทัศน์",
    "guide": "พันธกิจ 4–6 ข้อ แต่ละข้อขึ้นต้นด้วยคำกริยา ครอบคลุมลูกค้า คู่ค้า พนักงาน และสังคม",
    "fields": [
      {
        "k": "items",
        "label": "พันธกิจ (หนึ่งข้อต่อหนึ่งบรรทัด)",
        "type": "list",
        "wide": true
      }
    ],
    "no": 3
  },
  {
    "id": "goals",
    "th": "เป้าหมายของธุรกิจ",
    "en": "Goals",
    "desc": "เป้าหมายที่วัดผลได้ พร้อมตัวชี้วัดและกรอบเวลา",
    "guide": "5–8 เป้าหมายแบบ SMART ผูกกับวิสัยทัศน์และพันธกิจ ค่าเป้าหมายเป็นตัวเลขตัวอย่างที่สมเหตุสมผล",
    "fields": [
      {
        "k": "rows",
        "type": "table",
        "label": "เป้าหมาย",
        "cols": [
          {
            "k": "goal",
            "label": "เป้าหมาย",
            "type": "textarea",
            "w": 240
          },
          {
            "k": "metric",
            "label": "ตัวชี้วัด",
            "type": "text",
            "w": 180
          },
          {
            "k": "target",
            "label": "ค่าเป้าหมาย",
            "type": "text",
            "w": 120
          },
          {
            "k": "timeframe",
            "label": "กรอบเวลา",
            "type": "text",
            "w": 110
          },
          {
            "k": "owner",
            "label": "ผู้รับผิดชอบ",
            "type": "text",
            "w": 140
          }
        ]
      }
    ],
    "no": 4
  },
  {
    "id": "strategy",
    "th": "กลยุทธ์",
    "en": "Strategy",
    "desc": "วิธีการไปให้ถึงเป้าหมาย แยกตามระดับ",
    "guide": "5–8 กลยุทธ์ ทุกข้อระบุเป้าหมายที่สนับสนุน แผนปฏิบัติการหลัก 2–4 ข้อต่อกลยุทธ์ ขึ้นบรรทัดใหม่ด้วย \"- \"",
    "fields": [
      {
        "k": "rows",
        "type": "table",
        "label": "กลยุทธ์",
        "cols": [
          {
            "k": "strategy",
            "label": "กลยุทธ์",
            "type": "textarea",
            "w": 220
          },
          {
            "k": "level",
            "label": "ระดับ",
            "type": "select",
            "options": [
              "ระดับองค์กร",
              "ระดับธุรกิจ",
              "ระดับฝ่ายงาน"
            ],
            "w": 130
          },
          {
            "k": "goal",
            "label": "เป้าหมายที่สนับสนุน",
            "type": "text",
            "w": 170
          },
          {
            "k": "actions",
            "label": "แผนปฏิบัติการหลัก",
            "type": "textarea",
            "w": 260
          },
          {
            "k": "owner",
            "label": "ผู้รับผิดชอบ",
            "type": "text",
            "w": 130
          },
          {
            "k": "timeframe",
            "label": "กรอบเวลา",
            "type": "text",
            "w": 100
          }
        ]
      }
    ],
    "no": 5
  },
  {
    "id": "swot",
    "th": "การวิเคราะห์ SWOT",
    "en": "SWOT Analysis",
    "layout": "swot",
    "desc": "ปัจจัยภายใน (จุดแข็ง จุดอ่อน) และปัจจัยภายนอก (โอกาส อุปสรรค)",
    "guide": "แต่ละด้าน 4–6 ข้อ สั้น กระชับ เฉพาะเจาะจงกับธุรกิจนี้",
    "fields": [
      {
        "k": "s",
        "label": "จุดแข็ง (Strengths)",
        "type": "list"
      },
      {
        "k": "w",
        "label": "จุดอ่อน (Weaknesses)",
        "type": "list"
      },
      {
        "k": "o",
        "label": "โอกาส (Opportunities)",
        "type": "list"
      },
      {
        "k": "t",
        "label": "อุปสรรค (Threats)",
        "type": "list"
      }
    ],
    "no": 6
  },
  {
    "id": "fishbone",
    "th": "แผนผังก้างปลา",
    "en": "Fishbone Diagram",
    "layout": "fishbone",
    "desc": "หาสาเหตุของปัญหาหลัก แบ่งเป็นหมวดตามที่เหมาะกับปัญหา (AI จะคิดหมวดให้เอง เพิ่ม ลบ แก้ชื่อหมวดได้) เขียนสาเหตุแบบ \"หัวข้อ: รายละเอียด\" แผนผังกราฟิกจะแสดงเฉพาะข้อความก่อนเครื่องหมาย :",
    "guide": "กำหนดปัญหาหลัก 1 ข้อ (ถ้าผู้ใช้ระบุปัญหาไว้แล้วให้ใช้ตามนั้น) cats คือหมวดของสาเหตุ ให้คุณคิดหมวดเองให้เหมาะกับปัญหานี้ จำนวน 4–8 หมวด ไม่ต้องใช้กรอบ 6M ตายตัว (ถ้าผู้ใช้ตั้งหมวดไว้แล้วให้คงหมวดนั้นไว้) แต่ละหมวดมี name เป็นชื่อหมวดสั้น ๆ และ causes เป็นสาเหตุ 3–5 ข้อ ขึ้นบรรทัดใหม่ต่อหนึ่งสาเหตุ เขียนทุกสาเหตุในรูปแบบ \"หัวข้อสั้นไม่เกิน 60 ตัวอักษร: คำอธิบาย 1 ประโยค\" ตัวอย่าง \"ขาดบุคลากรด้านการวางแผนอุปสงค์และจัดซื้อโดยเฉพาะ: งานพยากรณ์และสั่งซื้อขึ้นกับประสบการณ์ของไม่กี่คน ทำให้การตัดสินใจไม่สม่ำเสมอ\" root คือสาเหตุหลัก 1–3 ข้อ solution คือแนวทางแก้ไขเป็นข้อ ๆ ขึ้นบรรทัดใหม่ด้วย \"- \"",
    "fields": [
      {
        "k": "problem",
        "label": "ปัญหาหลัก (หัวปลา)",
        "type": "text",
        "wide": true,
        "ph": "เช่น สินค้าขาดสต็อกบ่อยในขณะที่สต็อกเคลื่อนไหวช้าสูง"
      },
      {
        "k": "cats",
        "label": "หมวดของสาเหตุ",
        "type": "table",
        "wide": true,
        "cols": [
          {
            "k": "name",
            "label": "ชื่อหมวด",
            "type": "text",
            "w": 220
          },
          {
            "k": "causes",
            "label": "สาเหตุ (หนึ่งบรรทัดต่อหนึ่งสาเหตุ)",
            "type": "textarea",
            "w": 480
          }
        ]
      },
      {
        "k": "root",
        "label": "สาเหตุหลัก (Root Cause)",
        "type": "textarea",
        "wide": true
      },
      {
        "k": "solution",
        "label": "แนวทางแก้ไข",
        "type": "textarea",
        "wide": true,
        "rows": 4
      }
    ],
    "no": 7
  },
  {
    "id": "bmc",
    "th": "Business Model Canvas",
    "en": "9 Building Blocks",
    "layout": "bmc",
    "desc": "โมเดลธุรกิจ 9 องค์ประกอบ วางตามผังมาตรฐาน",
    "guide": "แต่ละช่อง 3–5 ประเด็น ขึ้นบรรทัดใหม่ด้วย \"- \"",
    "fields": [
      {
        "k": "kp",
        "label": "Key Partners · คู่ค้าหลัก",
        "type": "textarea",
        "cls": "kp"
      },
      {
        "k": "ka",
        "label": "Key Activities · กิจกรรมหลัก",
        "type": "textarea",
        "cls": "ka"
      },
      {
        "k": "kr",
        "label": "Key Resources · ทรัพยากรหลัก",
        "type": "textarea",
        "cls": "kr"
      },
      {
        "k": "vp",
        "label": "Value Propositions · คุณค่าที่ส่งมอบ",
        "type": "textarea",
        "cls": "vp"
      },
      {
        "k": "cr",
        "label": "Customer Relationships · ความสัมพันธ์กับลูกค้า",
        "type": "textarea",
        "cls": "cr"
      },
      {
        "k": "ch",
        "label": "Channels · ช่องทาง",
        "type": "textarea",
        "cls": "ch"
      },
      {
        "k": "cs",
        "label": "Customer Segments · กลุ่มลูกค้า",
        "type": "textarea",
        "cls": "cs"
      },
      {
        "k": "cost",
        "label": "Cost Structure · โครงสร้างต้นทุน",
        "type": "textarea",
        "cls": "cost"
      },
      {
        "k": "rev",
        "label": "Revenue Streams · กระแสรายได้",
        "type": "textarea",
        "cls": "rev"
      }
    ],
    "no": 8
  },
  {
    "id": "org",
    "th": "โครงสร้างองค์กร",
    "en": "Organization Structure",
    "desc": "หน่วยงาน สายการบังคับบัญชา และอัตรากำลัง",
    "guide": "ครอบคลุมทุกฝ่าย เริ่มจาก CEO/MD รายงานต่อใครให้ระบุชื่อตำแหน่ง จำนวนคนเป็นตัวเลข",
    "fields": [
      {
        "k": "rows",
        "type": "table",
        "label": "หน่วยงาน",
        "cols": [
          {
            "k": "unit",
            "label": "หน่วยงาน / ฝ่าย",
            "type": "text",
            "w": 190
          },
          {
            "k": "head",
            "label": "ตำแหน่งหัวหน้า",
            "type": "text",
            "w": 170
          },
          {
            "k": "reports",
            "label": "รายงานต่อ",
            "type": "text",
            "w": 140
          },
          {
            "k": "headcount",
            "label": "จำนวนคน",
            "type": "number",
            "w": 90
          },
          {
            "k": "purpose",
            "label": "หน้าที่หลัก",
            "type": "textarea",
            "w": 280,
            "ai": true
          }
        ]
      }
    ],
    "no": 9
  },
  {
    "id": "roles",
    "th": "Key Role และ Key Responsibility",
    "en": "Roles & Responsibilities",
    "desc": "บทบาทหลักและความรับผิดชอบของตำแหน่งสำคัญ",
    "guide": "ตำแหน่งหลักอย่างน้อย 1 ตำแหน่งต่อฝ่าย Key Responsibilities 3–5 ข้อ ขึ้นบรรทัดใหม่ด้วย \"- \"",
    "fields": [
      {
        "k": "rows",
        "type": "table",
        "label": "ตำแหน่ง",
        "cols": [
          {
            "k": "position",
            "label": "ตำแหน่ง",
            "type": "text",
            "w": 170
          },
          {
            "k": "dept",
            "label": "ฝ่าย",
            "type": "text",
            "w": 150
          },
          {
            "k": "role",
            "label": "Key Role (บทบาทหลัก)",
            "type": "textarea",
            "w": 220
          },
          {
            "k": "resp",
            "label": "Key Responsibilities",
            "type": "textarea",
            "w": 300
          },
          {
            "k": "output",
            "label": "ผลลัพธ์ที่คาดหวัง",
            "type": "textarea",
            "w": 200
          }
        ]
      }
    ],
    "no": 10
  },
  {
    "id": "kpis",
    "th": "Key Performance Indicators",
    "en": "KPIs",
    "desc": "ตัวชี้วัดรายฝ่าย เกณฑ์ A / B (Target) / C / D เป็นช่วงตัวเลขต่อเนื่องกัน เช่น A > 11, B [10 – 11], C [7 – 10), D < 7 โดย [ หรือ ] = นับตัวเลขนั้นด้วย ( หรือ ) = ไม่นับตัวเลขนั้น และน้ำหนักของแต่ละฝ่ายต้องรวมเป็น 100% ก่อนกด Confirm",
    "guide": "3–5 KPI ต่อฝ่าย ผูกกับเป้าหมายและกลยุทธ์ เกณฑ์ a/b/c/d คือช่วงตัวเลขของเกรด A/B/C/D ต่อเนื่องกันและไม่ซ้อนกัน เขียนด้วยสัญลักษณ์ > x, < x, [x – y], [x – y), (x – y] โดย [ หรือ ] = นับตัวเลขนั้นด้วย ( หรือ ) = ไม่นับตัวเลขนั้น ตัวอย่างยอดขาย (ยิ่งสูงยิ่งดี): a \"> 11\", b \"[10 – 11]\", c \"[7 – 10)\", d \"< 7\" ถ้า KPI ยิ่งต่ำยิ่งดี ให้ A เป็นช่วงค่าต่ำสุด เช่น a \"< 1\", b \"[1 – 2]\", c \"(2 – 3]\", d \"> 3\" B คือช่วงค่าเป้าหมาย (Target) ใส่เฉพาะตัวเลขและสัญลักษณ์ หน่วยให้ใส่ในช่อง unit น้ำหนัก (weight) ของ KPI ในฝ่ายเดียวกันรวมกันต้องเท่ากับ 100 พอดี ชื่อฝ่ายต้องเขียนเหมือนกันทุกแถวของฝ่ายนั้น code เช่น P01, S02",
    "fields": [
      {
        "k": "rows",
        "type": "table",
        "label": "KPI",
        "cols": [
          {
            "k": "code",
            "label": "รหัส",
            "type": "text",
            "w": 70
          },
          {
            "k": "dept",
            "label": "ฝ่าย",
            "type": "text",
            "w": 150
          },
          {
            "k": "kpi",
            "label": "KPI",
            "type": "textarea",
            "w": 200
          },
          {
            "k": "formula",
            "label": "นิยาม / สูตร",
            "type": "textarea",
            "w": 220
          },
          {
            "k": "unit",
            "label": "หน่วย",
            "type": "text",
            "w": 80
          },
          {
            "k": "a",
            "label": "A",
            "type": "text",
            "w": 110,
            "ph": "> 11"
          },
          {
            "k": "b",
            "label": "B (Target)",
            "type": "text",
            "w": 120,
            "ph": "[10 – 11]"
          },
          {
            "k": "c",
            "label": "C",
            "type": "text",
            "w": 110,
            "ph": "[7 – 10)"
          },
          {
            "k": "d",
            "label": "D",
            "type": "text",
            "w": 110,
            "ph": "< 7"
          },
          {
            "k": "weight",
            "label": "น้ำหนัก %",
            "type": "number",
            "w": 80
          },
          {
            "k": "freq",
            "label": "ความถี่",
            "type": "select",
            "options": [
              "รายเดือน",
              "รายไตรมาส",
              "รายครึ่งปี",
              "รายปี"
            ],
            "w": 110
          },
          {
            "k": "owner",
            "label": "ผู้เก็บข้อมูล",
            "type": "text",
            "w": 130
          }
        ]
      }
    ],
    "no": 11
  },
  {
    "id": "competency",
    "th": "Key Competency",
    "en": "Competency Model",
    "dictOnly": true,
    "desc": "สมรรถนะหลัก สมรรถนะบริหาร และสมรรถนะตามสายงาน ตามพจนานุกรมสมรรถนะของบริษัท",
    "guide": "Core 3–5 ตัว, Managerial 3–4 ตัว, Functional ตามฝ่าย รวม 8–14 รายการ พฤติกรรมบ่งชี้ 2–3 ข้อ ขึ้นบรรทัดใหม่ด้วย \"- \"",
    "fields": [
      {
        "k": "rows",
        "type": "table",
        "label": "สมรรถนะ",
        "cols": [
          {
            "k": "name",
            "label": "สมรรถนะ",
            "type": "text",
            "w": 180
          },
          {
            "k": "type",
            "label": "ประเภท",
            "type": "select",
            "options": [
              "Core Competency",
              "Managerial Competency",
              "Functional Competency"
            ],
            "w": 170
          },
          {
            "k": "definition",
            "label": "นิยาม",
            "type": "textarea",
            "w": 240
          },
          {
            "k": "positions",
            "label": "ตำแหน่งที่ใช้",
            "type": "text",
            "w": 160
          },
          {
            "k": "level",
            "label": "ระดับที่คาดหวัง (1–5)",
            "type": "select",
            "options": [
              "1",
              "2",
              "3",
              "4",
              "5"
            ],
            "w": 90
          },
          {
            "k": "indicators",
            "label": "พฤติกรรมบ่งชี้",
            "type": "textarea",
            "w": 240
          },
          {
            "k": "source",
            "label": "แหล่งอ้างอิง",
            "type": "text",
            "w": 200
          }
        ]
      },
      {
        "k": "edits",
        "type": "cmpEdits",
        "label": "ข้อความที่แก้ไขในพจนานุกรมสมรรถนะ",
        "noAI": true
      }
    ],
    "no": 12
  },
  {
    "id": "idp",
    "th": "Individual Development Plan",
    "en": "IDP",
    "desc": "แผนพัฒนารายบุคคล ปิดช่องว่างสมรรถนะตามหลัก 70-20-10",
    "guide": "5–8 แผน ครอบคลุมตำแหน่งหลัก ผูกกับสมรรถนะในหัวข้อ Key Competency ระดับเป้าหมายต้องสูงกว่าระดับปัจจุบัน",
    "fields": [
      {
        "k": "rows",
        "type": "table",
        "label": "แผนพัฒนา",
        "cols": [
          {
            "k": "person",
            "label": "พนักงาน / ตำแหน่ง",
            "type": "text",
            "w": 170
          },
          {
            "k": "competency",
            "label": "สมรรถนะที่ต้องพัฒนา",
            "type": "text",
            "w": 170
          },
          {
            "k": "current",
            "label": "ระดับปัจจุบัน",
            "type": "select",
            "options": [
              "1",
              "2",
              "3",
              "4",
              "5"
            ],
            "w": 80
          },
          {
            "k": "target",
            "label": "ระดับเป้าหมาย",
            "type": "select",
            "options": [
              "1",
              "2",
              "3",
              "4",
              "5"
            ],
            "w": 80
          },
          {
            "k": "method",
            "label": "รูปแบบ",
            "type": "select",
            "options": [
              "On-the-job (70%)",
              "Coaching / Mentoring (20%)",
              "Training (10%)"
            ],
            "w": 170
          },
          {
            "k": "activity",
            "label": "กิจกรรมพัฒนา",
            "type": "textarea",
            "w": 230
          },
          {
            "k": "timeline",
            "label": "ช่วงเวลา",
            "type": "text",
            "w": 110
          },
          {
            "k": "measure",
            "label": "ตัวชี้วัดความสำเร็จ",
            "type": "text",
            "w": 170
          },
          {
            "k": "mentor",
            "label": "ผู้ดูแล",
            "type": "text",
            "w": 120
          }
        ]
      }
    ],
    "no": 13
  }
];

export const SECTION_BY_ID: Record<string, Section> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
);

/** ธุรกิจตัวอย่าง ใช้เป็นบริบทของ AI เมื่อผู้ใช้ยังไม่กรอกข้อมูลบริษัท */
export const DEFAULT_CONTEXT = "ธุรกิจตัวอย่าง (ใช้เมื่อผู้ใช้ยังไม่ได้กรอกข้อมูลบริษัท): บริษัทซื้อมา-ขายไป (Trading) หลอดไฟและโคมไฟ\nโครงสร้างองค์กร: CEO/MD → ฝ่ายจัดซื้อ, ฝ่ายคลังสินค้าและโลจิสติกส์, ฝ่ายการตลาดและการขาย, ฝ่ายบริการลูกค้า, ฝ่ายบัญชีและการเงิน, ฝ่ายทรัพยากรบุคคล\nวิสัยทัศน์ตั้งต้น: มุ่งมั่นเป็นผู้นำในธุรกิจซื้อมา-ขายไปที่สร้างคุณค่าให้กับลูกค้า คู่ค้า และชุมชน ด้วยการนำเสนอสินค้าที่มีคุณภาพ ราคายุติธรรม และบริการที่เป็นเลิศ พร้อมพัฒนานวัตกรรมและความยั่งยืนในทุกกระบวนการ เพื่อตอบสนองความต้องการของตลาดอย่างมีประสิทธิภาพและสร้างการเติบโตที่มั่นคงในระยะยาว";

/** KPI ตัวอย่าง 30 ข้อ (ธุรกิจซื้อมา-ขายไป หลอดไฟและโคมไฟ) ค่าเกณฑ์เป็น Illustrative Target; dir: H = ยิ่งสูงยิ่งดี, L = ยิ่งต่ำยิ่งดี */
export const KPI_SAMPLE = [
  {
    "code": "C01",
    "dept": "ผู้บริหาร (CEO/MD)",
    "kpi": "อัตราการเติบโตของรายได้",
    "formula": "(รายได้ปีนี้ − รายได้ปีก่อน) ÷ รายได้ปีก่อน × 100",
    "dir": "H",
    "unit": "%",
    "a": "15",
    "b": "10",
    "c": "5",
    "weight": "40",
    "freq": "",
    "owner": ""
  },
  {
    "code": "C02",
    "dept": "ผู้บริหาร (CEO/MD)",
    "kpi": "อัตรากำไรขั้นต้น",
    "formula": "กำไรขั้นต้น ÷ รายได้จากการขาย × 100",
    "dir": "H",
    "unit": "%",
    "a": "22",
    "b": "18",
    "c": "14",
    "weight": "30",
    "freq": "",
    "owner": ""
  },
  {
    "code": "C03",
    "dept": "ผู้บริหาร (CEO/MD)",
    "kpi": "อัตรากำไรสุทธิ",
    "formula": "กำไรสุทธิ ÷ รายได้รวม × 100",
    "dir": "H",
    "unit": "%",
    "a": "8",
    "b": "5",
    "c": "3",
    "weight": "30",
    "freq": "",
    "owner": ""
  },
  {
    "code": "P01",
    "dept": "ฝ่ายจัดซื้อ",
    "kpi": "อัตราประหยัดต้นทุนจัดซื้อ",
    "formula": "(ราคาอ้างอิง − ราคาที่ซื้อได้) ÷ ราคาอ้างอิง × 100",
    "dir": "H",
    "unit": "%",
    "a": "4",
    "b": "3",
    "c": "1.5",
    "weight": "25",
    "freq": "",
    "owner": ""
  },
  {
    "code": "P02",
    "dept": "ฝ่ายจัดซื้อ",
    "kpi": "อัตราส่งมอบตรงเวลาของผู้ขาย",
    "formula": "จำนวนใบสั่งซื้อที่ส่งตรงเวลา ÷ ใบสั่งซื้อทั้งหมด × 100",
    "dir": "H",
    "unit": "%",
    "a": "95",
    "b": "90",
    "c": "85",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "P03",
    "dept": "ฝ่ายจัดซื้อ",
    "kpi": "อัตราสินค้าไม่ผ่านการตรวจรับ",
    "formula": "มูลค่าสินค้าไม่ผ่านการตรวจรับ ÷ มูลค่าสินค้าที่รับทั้งหมด × 100",
    "dir": "L",
    "unit": "%",
    "a": "0.5",
    "b": "1.0",
    "c": "2.0",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "P04",
    "dept": "ฝ่ายจัดซื้อ",
    "kpi": "สัดส่วนสต็อกเคลื่อนไหวช้า (>180 วัน)",
    "formula": "มูลค่าสต็อกที่ไม่เคลื่อนไหวเกิน 180 วัน ÷ มูลค่าสต็อกทั้งหมด × 100",
    "dir": "L",
    "unit": "%",
    "a": "3",
    "b": "5",
    "c": "8",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "P05",
    "dept": "ฝ่ายจัดซื้อ",
    "kpi": "สัดส่วนมูลค่าซื้อจากผู้ขายที่มีมาตรฐานรับรอง",
    "formula": "มูลค่าซื้อจากผู้ขายที่มีมาตรฐานรับรอง ÷ มูลค่าซื้อทั้งหมด × 100",
    "dir": "H",
    "unit": "%",
    "a": "95",
    "b": "85",
    "c": "75",
    "weight": "15",
    "freq": "",
    "owner": ""
  },
  {
    "code": "W01",
    "dept": "ฝ่ายคลังสินค้าและโลจิสติกส์",
    "kpi": "จำนวนวันสินค้าคงคลัง (DIO)",
    "formula": "สินค้าคงคลังเฉลี่ย ÷ ต้นทุนขาย × จำนวนวันในงวด",
    "dir": "L",
    "unit": "วัน",
    "a": "45",
    "b": "60",
    "c": "75",
    "weight": "25",
    "freq": "",
    "owner": ""
  },
  {
    "code": "W02",
    "dept": "ฝ่ายคลังสินค้าและโลจิสติกส์",
    "kpi": "ความถูกต้องของสต็อก",
    "formula": "จำนวนรายการที่นับตรงกับระบบ ÷ จำนวนรายการที่นับ × 100",
    "dir": "H",
    "unit": "%",
    "a": "99",
    "b": "97",
    "c": "95",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "W03",
    "dept": "ฝ่ายคลังสินค้าและโลจิสติกส์",
    "kpi": "ส่งมอบตรงเวลาและครบถ้วน (OTIF)",
    "formula": "จำนวนคำสั่งซื้อที่ส่งตรงเวลาและครบ ÷ คำสั่งซื้อทั้งหมด × 100",
    "dir": "H",
    "unit": "%",
    "a": "97",
    "b": "95",
    "c": "90",
    "weight": "30",
    "freq": "",
    "owner": ""
  },
  {
    "code": "W04",
    "dept": "ฝ่ายคลังสินค้าและโลจิสติกส์",
    "kpi": "อัตราสินค้าเสียหายและสูญหาย",
    "formula": "มูลค่าสินค้าเสียหายและสูญหาย ÷ มูลค่าสินค้าที่จัดเก็บและขนส่ง × 100",
    "dir": "L",
    "unit": "%",
    "a": "0.3",
    "b": "0.5",
    "c": "1.0",
    "weight": "25",
    "freq": "",
    "owner": ""
  },
  {
    "code": "S01",
    "dept": "ฝ่ายการตลาดและการขาย",
    "kpi": "อัตราบรรลุเป้าหมายยอดขาย",
    "formula": "ยอดขายจริง ÷ เป้าหมายยอดขาย × 100",
    "dir": "H",
    "unit": "%",
    "a": "110",
    "b": "100",
    "c": "90",
    "weight": "25",
    "freq": "",
    "owner": ""
  },
  {
    "code": "S02",
    "dept": "ฝ่ายการตลาดและการขาย",
    "kpi": "อัตราการเปลี่ยน Lead เป็นลูกค้า",
    "formula": "จำนวน Lead ที่ปิดการขายได้ ÷ จำนวน Lead ทั้งหมด × 100",
    "dir": "H",
    "unit": "%",
    "a": "25",
    "b": "15",
    "c": "10",
    "weight": "15",
    "freq": "",
    "owner": ""
  },
  {
    "code": "S03",
    "dept": "ฝ่ายการตลาดและการขาย",
    "kpi": "สัดส่วนค่าใช้จ่ายการตลาดต่อยอดขาย",
    "formula": "ค่าใช้จ่ายการตลาด ÷ ยอดขาย × 100",
    "dir": "L",
    "unit": "%",
    "a": "1.5",
    "b": "2.5",
    "c": "3.5",
    "weight": "10",
    "freq": "",
    "owner": ""
  },
  {
    "code": "S04",
    "dept": "ฝ่ายการตลาดและการขาย",
    "kpi": "อัตราส่วนลดเฉลี่ย",
    "formula": "มูลค่าส่วนลดที่ให้ ÷ ยอดขายก่อนหักส่วนลด × 100",
    "dir": "L",
    "unit": "%",
    "a": "4",
    "b": "6",
    "c": "8",
    "weight": "15",
    "freq": "",
    "owner": ""
  },
  {
    "code": "S05",
    "dept": "ฝ่ายการตลาดและการขาย",
    "kpi": "อัตราการรักษาลูกค้า",
    "formula": "จำนวนลูกค้าเดิมที่ยังซื้อซ้ำในงวด ÷ จำนวนลูกค้าเดิมต้นงวด × 100",
    "dir": "H",
    "unit": "%",
    "a": "70",
    "b": "50",
    "c": "30",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "S06",
    "dept": "ฝ่ายการตลาดและการขาย",
    "kpi": "สัดส่วนยอดขายสินค้าประหยัดพลังงานและสินค้าใหม่",
    "formula": "ยอดขายสินค้าประหยัดพลังงานและสินค้าใหม่ ÷ ยอดขายทั้งหมด × 100",
    "dir": "H",
    "unit": "%",
    "a": "45",
    "b": "35",
    "c": "25",
    "weight": "15",
    "freq": "",
    "owner": ""
  },
  {
    "code": "CS01",
    "dept": "ฝ่ายบริการลูกค้า",
    "kpi": "ความพึงพอใจของลูกค้า (CSAT)",
    "formula": "จำนวนผู้ตอบพึงพอใจถึงพึงพอใจมาก ÷ ผู้ตอบแบบสำรวจทั้งหมด × 100",
    "dir": "H",
    "unit": "%",
    "a": "90",
    "b": "85",
    "c": "80",
    "weight": "30",
    "freq": "",
    "owner": ""
  },
  {
    "code": "CS02",
    "dept": "ฝ่ายบริการลูกค้า",
    "kpi": "อัตราตอบกลับภายใน SLA",
    "formula": "จำนวนเรื่องที่ตอบกลับภายใน SLA ÷ เรื่องที่เข้ามาทั้งหมด × 100",
    "dir": "H",
    "unit": "%",
    "a": "95",
    "b": "90",
    "c": "80",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "CS03",
    "dept": "ฝ่ายบริการลูกค้า",
    "kpi": "เวลาเฉลี่ยในการปิดเคสร้องเรียน",
    "formula": "ผลรวมวันทำการที่ใช้ปิดเคส ÷ จำนวนเคสที่ปิด",
    "dir": "L",
    "unit": "วันทำการ",
    "a": "2",
    "b": "3",
    "c": "5",
    "weight": "25",
    "freq": "",
    "owner": ""
  },
  {
    "code": "CS04",
    "dept": "ฝ่ายบริการลูกค้า",
    "kpi": "อัตราการคืนสินค้าและเคลมจากข้อบกพร่อง",
    "formula": "มูลค่าสินค้าที่คืนหรือเคลมจากข้อบกพร่อง ÷ ยอดขาย × 100",
    "dir": "L",
    "unit": "%",
    "a": "0.5",
    "b": "1.0",
    "c": "2.0",
    "weight": "25",
    "freq": "",
    "owner": ""
  },
  {
    "code": "F01",
    "dept": "ฝ่ายบัญชีและการเงิน",
    "kpi": "จำนวนวันเก็บหนี้เฉลี่ย (DSO)",
    "formula": "ลูกหนี้การค้าเฉลี่ย ÷ ยอดขายเชื่อ × จำนวนวันในงวด",
    "dir": "L",
    "unit": "วัน",
    "a": "30",
    "b": "45",
    "c": "60",
    "weight": "30",
    "freq": "",
    "owner": ""
  },
  {
    "code": "F02",
    "dept": "ฝ่ายบัญชีและการเงิน",
    "kpi": "อัตราการชำระเงินผู้ขายตรงตามกำหนด",
    "formula": "จำนวนรายการที่ชำระตรงกำหนด ÷ รายการที่ครบกำหนดทั้งหมด × 100",
    "dir": "H",
    "unit": "%",
    "a": "98",
    "b": "95",
    "c": "90",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "F03",
    "dept": "ฝ่ายบัญชีและการเงิน",
    "kpi": "ระยะเวลาปิดบัญชีรายเดือน",
    "formula": "จำนวนวันทำการนับจากสิ้นเดือนจนปิดบัญชีเสร็จ",
    "dir": "L",
    "unit": "วันทำการ",
    "a": "3",
    "b": "5",
    "c": "7",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "F04",
    "dept": "ฝ่ายบัญชีและการเงิน",
    "kpi": "ความคลาดเคลื่อนค่าใช้จ่ายดำเนินงานเทียบงบ (ค่าสัมบูรณ์)",
    "formula": "|ค่าใช้จ่ายจริง − งบประมาณ| ÷ งบประมาณ × 100",
    "dir": "L",
    "unit": "%",
    "a": "2",
    "b": "5",
    "c": "8",
    "weight": "30",
    "freq": "",
    "owner": ""
  },
  {
    "code": "H01",
    "dept": "ฝ่ายทรัพยากรบุคคล",
    "kpi": "อัตราการลาออกของพนักงาน",
    "formula": "จำนวนพนักงานที่ลาออก ÷ จำนวนพนักงานเฉลี่ย × 100",
    "dir": "L",
    "unit": "%",
    "a": "5",
    "b": "10",
    "c": "15",
    "weight": "30",
    "freq": "",
    "owner": ""
  },
  {
    "code": "H02",
    "dept": "ฝ่ายทรัพยากรบุคคล",
    "kpi": "คะแนนความผูกพันของพนักงาน",
    "formula": "คะแนนเฉลี่ยแบบสำรวจความผูกพัน คิดเป็นร้อยละของคะแนนเต็ม",
    "dir": "H",
    "unit": "%",
    "a": "85",
    "b": "75",
    "c": "65",
    "weight": "25",
    "freq": "",
    "owner": ""
  },
  {
    "code": "H03",
    "dept": "ฝ่ายทรัพยากรบุคคล",
    "kpi": "ระยะเวลาสรรหาเฉลี่ย",
    "formula": "ผลรวมวันตั้งแต่อนุมัติอัตราจนผู้สมัครตอบรับ ÷ จำนวนตำแหน่งที่บรรจุ",
    "dir": "L",
    "unit": "วัน",
    "a": "30",
    "b": "45",
    "c": "60",
    "weight": "20",
    "freq": "",
    "owner": ""
  },
  {
    "code": "H04",
    "dept": "ฝ่ายทรัพยากรบุคคล",
    "kpi": "อัตราบรรลุแผนพัฒนาพนักงาน",
    "formula": "จำนวนกิจกรรม IDP ที่ทำสำเร็จ ÷ กิจกรรมที่วางแผนไว้ × 100",
    "dir": "H",
    "unit": "%",
    "a": "95",
    "b": "85",
    "c": "70",
    "weight": "25",
    "freq": "",
    "owner": ""
  }
];
