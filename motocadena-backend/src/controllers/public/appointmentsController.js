const { supabase } = require('../../services/supabaseClient');
const { getNightEnabled } = require('../../services/appConfig');

function makeError(status, message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

const PUBLIC_APPT_CAPACITY = 3;
const PUBLIC_WEEKDAY_SLOTS = [
  { key: '08-10', label: '8:00 – 10:00', startHour: 8, startMinute: 0, endHour: 10, endMinute: 0, duration: 120 },
  { key: '10-30_12', label: '10:30 – 12:00', startHour: 10, startMinute: 30, endHour: 12, endMinute: 0, duration: 90 },
  { key: '12-30_14', label: '12:30 – 2:00 pm', startHour: 12, startMinute: 30, endHour: 14, endMinute: 0, duration: 90 },
  { key: '14-16', label: '2:00 pm – 4:00 pm', startHour: 14, startMinute: 0, endHour: 16, endMinute: 0, duration: 120 },
  { key: '16-30_18', label: '4:30 pm – 6:00 pm', startHour: 16, startMinute: 30, endHour: 18, endMinute: 0, duration: 90 },
];
const PUBLIC_NIGHT_SLOTS = [
  { key: '18-30_20', label: '6:30 pm – 8:00 pm', startHour: 18, startMinute: 30, endHour: 20, endMinute: 0, duration: 90 },
  { key: '20-30_22', label: '8:30 pm – 10:00 pm', startHour: 20, startMinute: 30, endHour: 22, endMinute: 0, duration: 90 },
];

function isWeekday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00');
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function slotsForDate(dateStr, nightEnabled) {
  if (!dateStr) return [];
  const s = [];
  if (isWeekday(dateStr)) {
    s.push(...PUBLIC_WEEKDAY_SLOTS);
    if (nightEnabled) s.push(...PUBLIC_NIGHT_SLOTS);
  } else {
    if (nightEnabled) s.push(...PUBLIC_NIGHT_SLOTS);
  }
  return s;
}

function buildSlotStartISO(dateStr, slot) {
  const d = new Date(dateStr + 'T00:00');
  d.setHours(slot.startHour, slot.startMinute, 0, 0);
  return d.toISOString();
}

function buildSlotEndDate(dateStr, slot) {
  const d = new Date(dateStr + 'T00:00');
  d.setHours(slot.endHour, slot.endMinute, 0, 0);
  return d;
}

exports.availability = async (req, res, next) => {
  try {
    const date = String(req.query.date || '').slice(0, 10);
    if (!date) throw makeError(400, 'Parámetro date requerido (YYYY-MM-DD)');
    const night = getNightEnabled();

    const slots = slotsForDate(date, night);
    if (!slots.length) return res.json({ date, night, capacity: PUBLIC_APPT_CAPACITY, slots: [] });

    const dayStart = new Date(date + 'T00:00').toISOString();
    const dayEndDate = new Date(date + 'T00:00');
    dayEndDate.setDate(dayEndDate.getDate() + 1);
    const dayEnd = dayEndDate.toISOString();

    const { data: appts, error } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status')
      .gte('scheduled_at', dayStart)
      .lt('scheduled_at', dayEnd);
    if (error) throw makeError(500, error.message);

    const results = slots.map((slot) => {
      const startISO = buildSlotStartISO(date, slot);
      const endDate = buildSlotEndDate(date, slot);
      const count = (appts || []).filter((a) => {
        if (a.status === 'cancelled') return false;
        const t = new Date(a.scheduled_at);
        return t >= new Date(startISO) && t < endDate;
      }).length;
      return { key: slot.key, label: slot.label, duration: slot.duration, booked: count, capacity: PUBLIC_APPT_CAPACITY, available: Math.max(PUBLIC_APPT_CAPACITY - count, 0), start: startISO };
    });

    res.json({ date, night, capacity: PUBLIC_APPT_CAPACITY, slots: results });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { client_full_name, client_phone, service_id, date, slot_key, notes } = req.body || {};
    if (!client_full_name || !client_phone) throw makeError(400, 'Nombre y teléfono del cliente son requeridos');
    const phoneDigits = String(client_phone).replace(/\D/g, '').trim();
    if (!/^\d{11}$/.test(phoneDigits)) throw makeError(400, 'Teléfono inválido: use 11 dígitos, ej: 04147131270');
    if (!date || !slot_key) throw makeError(400, 'Fecha y turno son requeridos');

    const night = getNightEnabled();
    const slots = slotsForDate(date, night);
    const slot = slots.find((s) => s.key === slot_key);
    if (!slot) throw makeError(400, 'Turno inválido');

    const startISO = buildSlotStartISO(date, slot);
    const endDate = buildSlotEndDate(date, slot);

    // Verificar capacidad
    const { data: appts, error: aErr } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status')
      .gte('scheduled_at', startISO)
      .lt('scheduled_at', endDate.toISOString());
    if (aErr) throw makeError(500, aErr.message);
    const booked = (appts || []).filter((a) => a.status !== 'cancelled').length;
    if (booked >= PUBLIC_APPT_CAPACITY) throw makeError(409, 'Turno sin disponibilidad', 'NO_CAPACITY');

    // Buscar o crear cliente por teléfono
    const phoneNorm = phoneDigits;
    let { data: client, error: cErr } = await supabase
      .from('clients')
      .select('id, full_name, phone')
      .eq('phone', phoneNorm)
      .maybeSingle();
    if (cErr) throw makeError(500, cErr.message);

    if (!client) {
      const { data: inserted, error: insErr } = await supabase
        .from('clients')
        .insert([{ full_name: client_full_name, phone: phoneNorm }])
        .select();
      if (insErr) throw makeError(500, insErr.message);
      client = inserted?.[0] || null;
    }
    if (!client) throw makeError(500, 'No se pudo crear/obtener el cliente');

    // Crear cita
    const insert = {
      client_id: client.id,
      service_id: service_id || null,
      assigned_mechanic_id: null,
      scheduled_at: startISO,
      duration_minutes: slot.duration,
      status: 'scheduled',
      notes: notes || null,
    };
    const { data: created, error: apErr } = await supabase
      .from('appointments')
      .insert([insert])
      .select();
    if (apErr) throw makeError(500, apErr.message);

    res.status(201).json({ appointment: created?.[0] || null, client });
  } catch (err) { next(err); }
};
