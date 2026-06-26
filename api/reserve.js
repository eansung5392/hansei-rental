import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const r = req.body;
      
      // 예약 승인 중복 체크
      const { data: existing } = await supabase
        .from('reservations')
        .select('*')
        .eq('facility_id', r.facilityId)
        .eq('date', r.date)
        .eq('status', 'approved');

      if (existing && existing.length > 0) {
        const takenSlots = existing.reduce((acc, curr) => acc.concat(curr.slots), []);
        const hasOverlap = r.slots.some(slot => takenSlots.includes(slot));
        if (hasOverlap) {
          return res.status(400).json({ error: "이미 예약 확정된 타임 슬롯이 포함되어 있습니다." });
        }
      }

      // 예약 등록
      const { error } = await supabase.from('reservations').insert([{
        facility_id: r.facilityId,
        facility_name: r.facilityName,
        date: r.date,
        slots: r.slots,
        group_name: r.groupName,
        user_name: r.userName,
        phone: r.phone,
        purpose_type: r.purposeType,
        description: r.desc,
        total_fee: r.totalFee,
        status: 'pending'
      }]);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'PUT') {
      const { id, status } = req.body;
      const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).end();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}