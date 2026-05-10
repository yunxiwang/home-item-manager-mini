const app = getApp();
const { getCategories, saveCategories, getFoods, getItems, saveReminderConfig } = require('../../utils/storage');

let _reminderId = 0;
function nextRid() { return ++_reminderId; }

const DAY_OPTIONS = Array.from({length: 365}, (_, i) => i + 1);
const COLOR_OPTIONS = [
  { name: 'red', hex: '#EF4444', label: '红' },
  { name: 'orange', hex: '#F97316', label: '橙' },
  { name: 'yellow', hex: '#EAB308', label: '黄' },
  { name: 'green', hex: '#22C55E', label: '绿' },
  { name: 'teal', hex: '#0D9488', label: '青' },
  { name: 'blue', hex: '#3B82F6', label: '蓝' },
  { name: 'purple', hex: '#8B5CF6', label: '紫' },
  { name: 'pink', hex: '#EC4899', label: '粉' },
];

Page({
  data: {
    reminders: [],
    isEditing: false,
    dayOptions: DAY_OPTIONS,
    colorOptions: COLOR_OPTIONS,
    showAddModal: false,
    addDays: 30,
    addColor: 'yellow',
    foodCatCount: 0,
    itemCatCount: 0,
    showFeedback: false, feedbackText: '', feedbackLen: 0,
    showCatModal: false, catModalType: '', catModalList: [], catModalInput: '',
  },

  async onShow() {
    const saved = wx.getStorageSync('reminderConfig');
    let raw;
    if (saved && saved.reminders && saved.reminders.length > 0) {
      raw = saved.reminders;
    } else {
      raw = [3, 30, 90];
    }
    const defColors = ['red', 'orange', 'yellow'];
    const reminders = raw.map((d, i) => ({
      id: nextRid(),
      days: typeof d === 'number' ? d : d.days,
      color: (typeof d === 'object' && d.color) ? d.color : (defColors[i] || 'yellow'),
    }));
    reminders.sort((a, b) => a.days - b.days);
    this.setData({ reminders });

    try {
      const fc = await getCategories('food');
      const ic = await getCategories('item');
      this.setData({ foodCatCount: (fc||[]).length, itemCatCount: (ic||[]).length });
    } catch (e) {}
  },

  // ===== 提醒方案编辑 =====
  startEdit() { this.setData({ isEditing: true }); },

  cancelEdit() {
    const saved = wx.getStorageSync('reminderConfig');
    const raw = (saved && saved.reminders) ? saved.reminders : [3, 30, 90];
    const defColors = ['red', 'orange', 'yellow'];
    const reminders = raw.map((d, i) => ({
      id: nextRid(),
      days: typeof d === 'number' ? d : d.days,
      color: (typeof d === 'object' && d.color) ? d.color : (defColors[i] || 'yellow'),
    }));
    reminders.sort((a, b) => a.days - b.days);
    this.setData({ reminders, isEditing: false });
  },

  saveReminders() {
    const data = this.data.reminders.map(r => ({ days: r.days, color: r.color }));
    wx.setStorageSync('reminderConfig', { reminders: data });
    app.globalData.customReminders = data;
    saveReminderConfig({ reminders: data }).catch(() => {});
    this.setData({ isEditing: false });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  onReminderPick(e) {
    const id = e.currentTarget.dataset.id;
    const val = (parseInt(e.detail.value) || 0) + 1;
    const reminders = this.data.reminders.map(r =>
      r.id === id ? { ...r, days: val } : r
    );
    this.setData({ reminders });
  },

  removeReminder(e) {
    const id = e.currentTarget.dataset.id;
    const reminders = this.data.reminders.filter(r => r.id !== id);
    if (reminders.length < 1) return;
    this.setData({ reminders });
  },

  // ===== 添加提醒弹窗 =====
  openAddModal() {
    this.setData({ showAddModal: true, addDays: 30, addColor: 'yellow' });
  },
  closeAddModal() { this.setData({ showAddModal: false }); },
  onAddDaysPick(e) { this.setData({ addDays: (parseInt(e.detail.value) || 0) + 1 }); },
  selectAddColor(e) { this.setData({ addColor: e.currentTarget.dataset.color }); },
  confirmAdd() {
    const reminders = [...this.data.reminders, {
      id: nextRid(), days: this.data.addDays, color: this.data.addColor,
    }];
    reminders.sort((a, b) => a.days - b.days);
    this.setData({ reminders, showAddModal: false });
  },

  nop() {},

  // ===== 意见反馈 =====
  openFeedback() { this.setData({ showFeedback: true, feedbackText: '', feedbackLen: 0 }); },
  closeFeedback() { this.setData({ showFeedback: false }); },
  onFeedbackInput(e) { this.setData({ feedbackText: e.detail.value, feedbackLen: (e.detail.value||'').length }); },
  async submitFeedback() {
    const text = this.data.feedbackText.trim();
    if (!text) return wx.showToast({ title: '请输入反馈内容', icon: 'none' });
    try {
      await wx.cloud.callFunction({ name: 'submitFeedback', data: { content: text } });
      wx.showToast({ title: '感谢反馈！', icon: 'success' });
      this.setData({ showFeedback: false, feedbackText: '' });
    } catch (e) {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  },

  // ===== 订阅 =====
  subscribeReminder() {
    const TMPL = '6PdhckfTDkjkhcaxy_HpIE6rSUUnTTXF2HdLI8b5y8I';
    wx.showModal({
      title: '提醒说明',
      content: '每次订阅仅能发送一条提醒消息。建议每次打开小程序时顺手点击订阅，以确保收到临期通知。',
      confirmText: '去订阅',
      success: (r) => {
        if (!r.confirm) return;
        wx.requestSubscribeMessage({
          tmplIds: [TMPL],
          success(res) {
            if (res[TMPL] === 'accept') {
              wx.showToast({ title: '订阅成功，可收到 1 次提醒', icon: 'success' });
            } else {
              wx.showToast({ title: '已取消', icon: 'none' });
            }
          },
          fail() { wx.showToast({ title: '订阅失败', icon: 'none' }); },
        });
      },
    });
  },

  // ===== 导出 XLSX =====
  async exportData() {
    wx.showLoading({ title: '导出中...' });
    try {
      const foods = await getFoods().catch(() => []);
      const items = await getItems().catch(() => []);

      // 生成 CSV（Excel 可直接打开）
      const BOM = '﻿'; // UTF-8 BOM，确保中文不乱码
      let csv = BOM + '=== 食物 ===\n名称,分类,数量,购买日期,保质期至,备注\n';
      for (const f of foods) {
        csv += [f.name, f.category, f.quantity, f.purchaseDate, f.expirationDate, f.notes || '']
          .map(v => '"' + (v || '').replace(/"/g, '""') + '"').join(',') + '\n';
      }
      csv += '\n=== 物品 ===\n名称,分类,数量,存放位置,备注\n';
      for (const i of items) {
        csv += [i.name, i.category, i.quantity, i.location, i.notes || '']
          .map(v => '"' + (v || '').replace(/"/g, '""') + '"').join(',') + '\n';
      }

      const fs = wx.getFileSystemManager();
      const path = wx.env.USER_DATA_PATH + '/物品管理助手备份.csv';
      fs.writeFileSync(path, csv, 'utf8');
      wx.shareFileMessage({ filePath: path, fileName: '物品管理助手备份.xlsx' });
    } catch (e) { wx.showToast({ title: '导出失败', icon: 'none' }); }
    wx.hideLoading();
  },

  // ===== 导入 XLSX/CSV =====
  importData() {
    wx.chooseMessageFile({ count: 1, type: 'file', extension: ['xlsx', 'csv', 'json'] })
      .then(res => {
        const fs = wx.getFileSystemManager();
        const content = fs.readFileSync(res.tempFiles[0].path, 'utf8');

        // 尝试 JSON 解析
        try {
          const data = JSON.parse(content);
          if (data.foods || data.items) {
            this.importFromJSON(data); return;
          }
        } catch (e) {}

        // CSV 解析
        this.importFromCSV(content);
      }).catch(() => {});
  },

  importFromJSON(data) {
    wx.showModal({
      title: '导入数据',
      content: `将导入 ${(data.foods||[]).length} 条食物、${(data.items||[]).length} 条物品`,
      success: async r => {
        if (r.confirm) {
          const { addFood, addItem } = require('../../utils/storage');
          wx.showLoading({ title: '导入中...' });
          for (const f of (data.foods || [])) await addFood(f).catch(() => {});
          for (const i of (data.items || [])) await addItem(i).catch(() => {});
          wx.hideLoading();
          wx.showToast({ title: '导入完成', icon: 'success' });
        }
      }
    });
  },

  importFromCSV(content) {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const foods = [], items = [];
    let section = '';
    let headers = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('=== 食物')) { section = 'foods'; continue; }
      if (trimmed.startsWith('=== 物品')) { section = 'items'; continue; }

      // Parse CSV row (simple: split by comma, handle quotes)
      const vals = this.parseCSVLine(trimmed);
      if (vals.length === 0) continue;

      // Check if it's a header row
      const first = (vals[0] || '').toLowerCase();
      if (first === '名称' || first === 'name') { headers = vals; continue; }
      if (headers.length === 0 && section === 'foods' && vals.length >= 4) {
        headers = ['名称', '分类', '数量', '购买日期', '保质期至', '备注'];
      }
      if (headers.length === 0 && section === 'items' && vals.length >= 3) {
        headers = ['名称', '分类', '数量', '存放位置', '备注'];
      }

      if (section === 'foods' && vals.length >= 5) {
        foods.push({
          name: vals[0] || '', category: vals[1] || '',
          quantity: vals[2] || '', purchaseDate: vals[3] || '',
          expirationDate: vals[4] || '', notes: vals[5] || '',
        });
      } else if (section === 'items' && vals.length >= 4) {
        items.push({
          name: vals[0] || '', category: vals[1] || '',
          quantity: vals[2] || '', location: vals[3] || '',
          notes: vals[4] || '',
        });
      }
    }

    if (foods.length === 0 && items.length === 0) {
      wx.showToast({ title: '未识别到数据', icon: 'none' }); return;
    }

    wx.showModal({
      title: '导入数据',
      content: `识别到 ${foods.length} 条食物、${items.length} 条物品`,
      success: async r => {
        if (r.confirm) {
          const { addFood, addItem } = require('../../utils/storage');
          wx.showLoading({ title: '导入中...' });
          for (const f of foods) await addFood(f).catch(() => {});
          for (const i of items) await addItem(i).catch(() => {});
          wx.hideLoading();
          wx.showToast({ title: '导入完成', icon: 'success' });
        }
      }
    });
  },

  parseCSVLine(line) {
    const result = [];
    let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = false; }
        } else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current);
    return result.map(v => v.trim());
  },

  // ===== 分类弹窗 =====
  async openCatModal(e) {
    const type = e.currentTarget.dataset.type;
    const cats = await getCategories(type).catch(() => []);
    this.setData({ showCatModal: true, catModalType: type, catModalList: cats || [], catModalInput: '' });
  },
  closeCatModal() { this.setData({ showCatModal: false }); },
  onCatInput(e) { this.setData({ catModalInput: e.detail.value }); },
  async addCatFromModal() {
    const name = this.data.catModalInput.trim();
    if (!name) return;
    if (this.data.catModalList.includes(name)) {
      wx.showToast({ title: '分类已存在', icon: 'none' }); return;
    }
    const newList = [...this.data.catModalList, name];
    await saveCategories(this.data.catModalType, newList);
    this.setData({ catModalList: newList, catModalInput: '' });
    const k = this.data.catModalType === 'food' ? 'foodCatCount' : 'itemCatCount';
    this.setData({ [k]: newList.length });
  },
  async removeCatFromModal(e) {
    const cat = e.currentTarget.dataset.cat;
    const newList = this.data.catModalList.filter(c => c !== cat);
    await saveCategories(this.data.catModalType, newList);
    this.setData({ catModalList: newList });
    const k = this.data.catModalType === 'food' ? 'foodCatCount' : 'itemCatCount';
    this.setData({ [k]: newList.length });
  },
});
