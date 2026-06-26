import { createClient } from '@supabase/supabase-js';

// 💡 만약 Vercel 환경 변수가 계속 말썽이라면 process.env 대신 실제 주소와 키를 '따옴표' 안에 직접 넣으셔도 됩니다!
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://본인의_프로젝트_ID.supabase.co', 
  process.env.SUPABASE_ANON_KEY || '본인의_anon_public_키_문자열'
);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // DB에서 데이터 읽어오기
      const { data: categories, error: cErr } = await supabase.from('categories').select('*').order('id');
      const { data: facilities, error: fErr } = await supabase.from('facilities').select('*').order('id');
      const { data: notices, error: nErr } = await supabase.from('notices').select('*').order('id');
      const { data: reservations, error: rErr } = await supabase.from('reservations').select('*').order('id', { ascending: false });

      // 🚨 [핵심 보완] 데이터가 비어있거나(null) 가져오지 못했을 때 뻗지 않도록 빈 배열([])로 강제 안전 처리
      const safeCategories = categories || [];
      const safeFacilities = facilities || [];
      const safeNotices = notices || [];
      const safeReservations = reservations || [];

      return res.status(200).json({
        categories: safeCategories.map(c => c.name),
        facilities: safeFacilities.map(f => ({
          id: f.facility_id,
          name: f.name,
          category: f.category,
          baseFee: f.base_fee,
          unitText: f.unit_text
        })),
        notices: safeNotices.map(n => n.content),
        reservations: safeReservations.map(r => ({
          id: r.id,
          facilityId: r.facility_id,
          facilityName: r.facility_name,
          date: r.date,
          slots: r.slots,
          groupName: r.group_name,
          userName: r.user_name,
          phone: r.phone,
          purposeType: r.purpose_type,
          desc: r.description,
          totalFee: r.total_fee,
          status: r.status
        }))
      });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body;

      if (action === 'UPDATE_NOTICES') {
        await supabase.from('notices').delete().neq('id', 0); 
        const insertRows = payload.notices.map(content => ({ content }));
        await supabase.from('notices').insert(insertRows);
        return res.status(200).json({ success: true });
      }

      if (action === 'ADD_CATEGORY') {
        await supabase.from('categories').insert([{ name: payload.name }]);
        return res.status(200).json({ success: true });
      }

      if (action === 'ADD_FACILITY') {
        await supabase.from('facilities').insert([{
          facility_id: payload.id,
          name: payload.name,
          category: payload.category,
          base_fee: payload.baseFee,
          unit_text: "타임당(4시간)"
        }]);
        return res.status(200).json({ success: true });
      }

      if (action === 'UPDATE_FEE') {
        await supabase.from('facilities').update({ base_fee: payload.baseFee }).eq('facility_id', payload.id);
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).end();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}