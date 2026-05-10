const { addFood, updateFood, getCategories, saveCategories } = require('../../../utils/storage');
const { getDaysUntilExpiration, getBadgeInfo } = require('../../../utils/reminder');

Page({
  data: {
    isEdit: false,
    editId: '',
    categories: [],
    form: { name: '', category: '', qty: 1, unit: '', purchaseDate: '', expirationDate: '', notes: '', notified: { threeMonths: false, oneMonth: false, threeDays: false } },
    showCatInput: false,
    newCat: '',
  },

  async onLoad(options) {
    const cats = await getCategories('food').catch(() => ['零食','饮料','冷冻食品','生鲜','其他']);
    this.setData({ categories: cats });

    if (options.id) {
      this.setData({ isEdit: true, editId: options.id });
      const { getFoods } = require('../../../utils/storage');
      const foods = await getFoods().catch(() => []);
      const food = foods.find(f => f._id === options.id);
      if (food) {
        const qtyMatch = (food.quantity || '×1').match(/×(\d+)\s*(.*)/);
        this.setData({
          form: {
            name: food.name || '',
            category: food.category || '',
            qty: qtyMatch ? parseInt(qtyMatch[1]) : 1,
            unit: qtyMatch ? qtyMatch[2] || '' : '',
            purchaseDate: food.purchaseDate || '',
            expirationDate: food.expirationDate || '',
            notes: food.notes || '',
            notified: food.notified || { threeMonths: false, oneMonth: false, threeDays: false },
          }
        });
      }
    }
  },

  onField(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  onDate(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  selectCat(e) {
    this.setData({ 'form.category': e.currentTarget.dataset.cat });
  },

  incQty() { this.setData({ 'form.qty': this.data.form.qty + 1 }); },
  decQty() { const v = this.data.form.qty - 1; if (v >= 0) this.setData({ 'form.qty': v }); },

  showCatInput() { this.setData({ showCatInput: true, newCat: '' }); },
  hideCatInput() { this.setData({ showCatInput: false }); },

  async addCategory() {
    const name = this.data.newCat.trim();
    if (!name || this.data.categories.includes(name)) {
      wx.showToast({ title: '分类已存在或为空', icon: 'none' }); return;
    }
    const cats = [...this.data.categories, name];
    await saveCategories('food', cats).catch(() => {});
    this.setData({ categories: cats, 'form.category': name, showCatInput: false });
  },

  async submit() {
    const { form, isEdit, editId } = this.data;
    if (!form.name.trim()) return wx.showToast({ title: '请填写名称', icon: 'none' });
    if (!form.category) return wx.showToast({ title: '请选择分类', icon: 'none' });
    if (!form.purchaseDate) return wx.showToast({ title: '请选择购买日期', icon: 'none' });
    if (!form.expirationDate) return wx.showToast({ title: '请选择保质期截止日期', icon: 'none' });

    const qtyText = '×' + form.qty + (form.unit ? ' ' + form.unit : '');
    const data = {
      name: form.name.trim(),
      category: form.category,
      quantity: qtyText,
      purchaseDate: form.purchaseDate,
      expirationDate: form.expirationDate,
      notes: form.notes.trim(),
      notified: form.notified,
    };

    try {
      if (isEdit) {
        await updateFood(editId, data);
      } else {
        await addFood(data);
        // 即时提醒检查
        const days = getDaysUntilExpiration(form.expirationDate);
        const badge = getBadgeInfo(days);
        if (badge) {
          wx.showToast({ title: '已添加，距离保质期还有' + days + '天', icon: 'none', duration: 2500 });
        }
      }
      wx.navigateBack();
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  goBack() { wx.navigateBack(); },
});
