const db = wx.cloud.database();
const FOODS = 'foods';
const ITEMS = 'items';
const CATEGORIES = 'categories';

// ===== 食物 =====
function getFoods() {
  return db.collection(FOODS).orderBy('createdAt', 'desc').get()
    .then(res => res.data);
}

function addFood(data) {
  return db.collection(FOODS).add({ data: { ...data, createdAt: new Date() } });
}

function updateFood(id, data) {
  return db.collection(FOODS).doc(id).update({ data });
}

function deleteFood(id) {
  return db.collection(FOODS).doc(id).remove();
}

// ===== 物品 =====
function getItems() {
  return db.collection(ITEMS).orderBy('createdAt', 'desc').get()
    .then(res => res.data);
}

function addItem(data) {
  return db.collection(ITEMS).add({ data: { ...data, createdAt: new Date() } });
}

function updateItem(id, data) {
  return db.collection(ITEMS).doc(id).update({ data });
}

function deleteItem(id) {
  return db.collection(ITEMS).doc(id).remove();
}

// ===== 分类 =====
const DEFAULT_FOOD_CATS = ['零食', '饮料', '冷冻食品', '生鲜', '其他'];
const DEFAULT_ITEM_CATS = ['电子产品', '工具', '衣物', '书籍', '其他'];

function getCategories(type) {
  return db.collection(CATEGORIES).where({ type }).get()
    .then(res => {
      if (res.data.length === 0) {
        const cats = type === 'food' ? DEFAULT_FOOD_CATS : DEFAULT_ITEM_CATS;
        return cats;
      }
      return res.data[0].list;
    });
}

function saveCategories(type, list) {
  return db.collection(CATEGORIES).where({ type }).get()
    .then(res => {
      if (res.data.length === 0) {
        return db.collection(CATEGORIES).add({ data: { type, list } });
      }
      return db.collection(CATEGORIES).doc(res.data[0]._id).update({ data: { list } });
    });
}

// ===== 全局提醒配置 =====
const CONFIG_ID = 'reminder_config';

function getReminderConfig() {
  return db.collection('config').doc(CONFIG_ID).get()
    .then(res => res.data)
    .catch(() => null);
}

function saveReminderConfig(data) {
  return db.collection('config').doc(CONFIG_ID).set({ data })
    .catch(() => db.collection('config').add({ data: { ...data, _id: CONFIG_ID } }));
}

// ===== 反馈 =====
function submitFeedback(data) {
  return db.collection('feedback').add({ data: { ...data, createdAt: new Date() } });
}

module.exports = {
  getFoods, addFood, updateFood, deleteFood,
  getItems, addItem, updateItem, deleteItem,
  getCategories, saveCategories,
  getReminderConfig, saveReminderConfig,
  submitFeedback,
};
