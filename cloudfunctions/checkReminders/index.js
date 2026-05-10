const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

const TMPL_ID = '6PdhckfTDkjkhcaxy_HpIE6rSUUnTTXF2HdLI8b5y8I';

function getDaysUntilExpiration(expirationDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

function getReminderLevel(days, customReminders) {
  const thresholds = customReminders || [3, 30, 90];
  const sorted = [...thresholds].sort((a, b) => a - b);
  for (const t of sorted) {
    if (days <= t) return { level: 'custom_' + t, days: t };
  }
  return null;
}

exports.main = async () => {
  // 从 config 集合读取用户自定义提醒配置
  let thresholds = [3, 30, 90];
  try {
    const cfg = await db.collection('config').doc('reminder_config').get();
    if (cfg.data && cfg.data.reminders && cfg.data.reminders.length > 0) {
      thresholds = cfg.data.reminders.map(r => (typeof r === 'number' ? r : r.days));
    }
  } catch (e) {
    // 配置不存在则使用默认
  }

  const foods = await db.collection('foods').get();
  const results = [];

  for (const food of foods.data) {
    const days = getDaysUntilExpiration(food.expirationDate);
    if (days <= 0) continue;

    const level = getReminderLevel(days, thresholds);
    if (!level) continue;

    const notifiedKey = 'custom_' + level.days;
    if (food.notified && food.notified[notifiedKey]) continue;

    // 发送订阅消息
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: food._openid,
        templateId: TMPL_ID,
        data: {
          thing1: { value: food.name.slice(0, 20) },
          date2: { value: food.expirationDate },
          thing8: { value: '距离保质期仅剩' + days + '天，请尽快处理' },
        },
      });
      results.push({ name: food.name, days, status: 'sent' });
    } catch (e) {
      results.push({ name: food.name, days, status: 'failed', error: e.message });
    }

    // 标记已通知
    const newNotified = { ...food.notified, [notifiedKey]: true };
    await db.collection('foods').doc(food._id).update({
      data: { notified: newNotified },
    });
  }

  return { checked: foods.data.length, results };
};
