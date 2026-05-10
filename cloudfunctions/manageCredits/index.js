const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

// earn: +3 积分（看广告后调用）
// spend: -1 积分（发提醒时调用）
// get: 查询剩余积分

exports.main = async (event) => {
  const openId = cloud.getWXContext().OPENID;
  const { action } = event;
  const coll = db.collection('credits');

  // 查找或初始化
  let doc;
  try { doc = await coll.doc(openId).get(); } catch (e) { doc = null; }

  let credits = (doc && doc.data) ? doc.data.count : 0;

  if (action === 'earn') {
    credits += 3;
    await coll.doc(openId).set({ data: { count: credits, updatedAt: new Date() } })
      .catch(() => coll.add({ data: { _id: openId, count: credits, updatedAt: new Date() } }));
    return { credits };
  }

  if (action === 'spend') {
    if (credits <= 0) return { success: false, credits: 0, reason: '积分不足' };
    credits -= 1;
    await coll.doc(openId).set({ data: { count: credits, updatedAt: new Date() } });
    return { success: true, credits };
  }

  if (action === 'get') {
    return { credits };
  }

  return { credits };
};
