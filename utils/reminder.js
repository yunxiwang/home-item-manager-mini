const LEVELS = {
  threeDays: { label: '立即处理', badge: 'urgent', color: '#dc2626', days: 3 },
  oneMonth: { label: '请尽快食用', badge: 'caution', color: '#d97706', days: 30 },
  threeMonths: { label: '即将到期', badge: 'warning', color: '#e6a817', days: 90 },
};

function getDaysUntilExpiration(expirationDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

function getCardStatus(days) {
  if (days <= 0) return 'expired';
  if (days <= 3) return 'urgent';
  if (days <= 30) return 'caution';
  if (days <= 90) return 'warning';
  return 'safe';
}

function getBadgeInfo(days) {
  if (days <= 0) return { text: '已过期', cls: 'badge-expired' };
  if (days <= 3) return { text: days + '天后到期', cls: 'badge-urgent' };
  if (days <= 30) return { text: days + '天后到期', cls: 'badge-caution' };
  if (days <= 90) return { text: days + '天后到期', cls: 'badge-warning' };
  return null;
}

function getReminderLevel(days, customReminders) {
  const thresholds = customReminders || [3, 30, 90];
  const sorted = [...thresholds].sort((a, b) => a - b);
  for (const t of sorted) {
    if (days <= t) return { level: 'custom_' + t, days: t };
  }
  return null;
}

function partitionFoods(foods) {
  const active = [];
  const expired = [];
  for (const food of foods) {
    const days = getDaysUntilExpiration(food.expirationDate);
    if (days <= 0) expired.push({ ...food, _days: days });
    else active.push({ ...food, _days: days });
  }
  active.sort((a, b) => a._days - b._days);
  expired.sort((a, b) => new Date(b.expirationDate) - new Date(a.expirationDate));
  return { active, expired };
}

module.exports = { LEVELS, getDaysUntilExpiration, getCardStatus, getBadgeInfo, getReminderLevel, partitionFoods };
