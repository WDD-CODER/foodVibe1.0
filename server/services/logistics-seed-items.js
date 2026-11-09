'use strict';
/**
 * Plan 520: the shared master checklist questions (13 phone-intake, 32 site-visit) seeded as
 * `logisticsItem` taxonomy terms. `key` is the Hebrew question text, shown as is.
 */

const KIT = 'professional_kitchen';
const OUT = 'outdoor_field';
const HOME = 'client_home';
const POP = 'popup_venue';

/** @type {Array<{ key: string, phase: 'intake'|'site_visit', section: string, answerType: string, environments?: string[] }>} */
const LOGISTICS_SEED_ITEMS = [
  // intake (13)
  { key: 'יש מטבח במקום?', phase: 'intake', section: 'infrastructure', answerType: 'status' },
  { key: 'יש חשמל זמין לאזור המטבח?', phase: 'intake', section: 'infrastructure', answerType: 'status' },
  { key: 'יש מים זורמים ליד המטבח?', phase: 'intake', section: 'infrastructure', answerType: 'status' },
  { key: 'כמות מזנונים משוערת', phase: 'intake', section: 'service', answerType: 'quantity' },
  { key: 'הגשה לשולחן (מלצרים)?', phase: 'intake', section: 'service', answerType: 'status' },
  { key: 'בר משקאות?', phase: 'intake', section: 'service', answerType: 'status' },
  { key: 'שולחנות וכיסאות מאיתנו?', phase: 'intake', section: 'rentals', answerType: 'status' },
  { key: 'כלי הגשה וסכו"ם מאיתנו?', phase: 'intake', section: 'rentals', answerType: 'status' },
  { key: 'גישה לרכב עד נקודת הפריקה?', phase: 'intake', section: 'access', answerType: 'status' },
  { key: 'שעת התחלה ומשך האירוע', phase: 'intake', section: 'other', answerType: 'text' },
  { key: 'איש קשר בשטח (שם וטלפון)', phase: 'intake', section: 'other', answerType: 'text' },
  { key: 'כשרות נדרשת', phase: 'intake', section: 'food', answerType: 'text' },
  { key: 'אלרגיות ורגישויות ידועות', phase: 'intake', section: 'food', answerType: 'text' },
  // site_visit (32)
  { key: 'נקודות חשמל: כמות, מיקום ועומס', phase: 'site_visit', section: 'infrastructure', answerType: 'text' },
  { key: 'גנרטור נדרש?', phase: 'site_visit', section: 'infrastructure', answerType: 'status', environments: [OUT, POP] },
  { key: 'נקודת מים למטבח', phase: 'site_visit', section: 'infrastructure', answerType: 'status' },
  { key: 'ניקוז ומי שפכים', phase: 'site_visit', section: 'infrastructure', answerType: 'status', environments: [OUT, POP, HOME] },
  { key: 'קירור קיים במקום (מקרר/חדר קירור)', phase: 'site_visit', section: 'infrastructure', answerType: 'status' },
  { key: "צ'ילרים להבאה", phase: 'site_visit', section: 'infrastructure', answerType: 'quantity' },
  { key: 'גז / מקור חום', phase: 'site_visit', section: 'infrastructure', answerType: 'status' },
  { key: 'תאורה באזור המטבח', phase: 'site_visit', section: 'infrastructure', answerType: 'status', environments: [OUT, POP] },
  { key: 'מיקום המטבח ומרחק מאזור ההגשה', phase: 'site_visit', section: 'space', answerType: 'text' },
  { key: 'אוהל / הצללה למטבח', phase: 'site_visit', section: 'space', answerType: 'status', environments: [OUT, HOME] },
  { key: 'הגנה מגשם ורוח (דפנות, מרזבים)', phase: 'site_visit', section: 'space', answerType: 'status', environments: [OUT] },
  { key: 'משטח ישר ויציב למטבח', phase: 'site_visit', section: 'space', answerType: 'status', environments: [OUT] },
  { key: 'מזנונים – כמות ומיקום', phase: 'site_visit', section: 'service', answerType: 'quantity' },
  { key: 'שולחנות ישיבה – כמות', phase: 'site_visit', section: 'service', answerType: 'quantity' },
  { key: 'עמדות חיות / שף בחזית', phase: 'site_visit', section: 'service', answerType: 'status' },
  { key: 'בר – מיקום וקרח', phase: 'site_visit', section: 'service', answerType: 'status' },
  { key: 'מסלול מלצרים מהמטבח לאורחים', phase: 'site_visit', section: 'service', answerType: 'status' },
  { key: 'שולחנות הגשה', phase: 'site_visit', section: 'rentals', answerType: 'quantity' },
  { key: 'כיסאות', phase: 'site_visit', section: 'rentals', answerType: 'quantity' },
  { key: 'מחממי מזון / שאפינג', phase: 'site_visit', section: 'rentals', answerType: 'quantity' },
  { key: 'מפות ושוליות', phase: 'site_visit', section: 'rentals', answerType: 'status' },
  { key: 'נקודת פריקה ומרחק נשיאה', phase: 'site_visit', section: 'access', answerType: 'text' },
  { key: 'שעות גישה למקום (כניסה, פינוי)', phase: 'site_visit', section: 'access', answerType: 'text' },
  { key: 'מעלית / מדרגות', phase: 'site_visit', section: 'access', answerType: 'status', environments: [KIT, POP, HOME] },
  { key: 'חניה לרכבי הצוות', phase: 'site_visit', section: 'access', answerType: 'status' },
  { key: 'צוות מטבח – כמות', phase: 'site_visit', section: 'staff', answerType: 'quantity' },
  { key: 'מלצרים – כמות', phase: 'site_visit', section: 'staff', answerType: 'quantity' },
  { key: 'תוכנית גשם / חום קיצוני', phase: 'site_visit', section: 'weather', answerType: 'text', environments: [OUT] },
  { key: 'מזיקים ויתושים', phase: 'site_visit', section: 'weather', answerType: 'status', environments: [OUT] },
  { key: 'פחים ופינוי אשפה', phase: 'site_visit', section: 'other', answerType: 'status' },
  { key: 'שירותים לצוות', phase: 'site_visit', section: 'other', answerType: 'status' },
  { key: 'אישורי כניסה לספקים / ביטחון', phase: 'site_visit', section: 'other', answerType: 'status', environments: [POP] },
];

module.exports = { LOGISTICS_SEED_ITEMS };
