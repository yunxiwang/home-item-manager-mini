const { addItem, updateItem, getCategories, saveCategories } = require('../../../utils/storage');

Page({
  data: {
    isEdit: false, editId: '',
    categories: [],
    form: { name: '', category: '', qty: 1, unit: '', location: '', notes: '' },
    showCatInput: false, newCat: '',
  },

  async onLoad(options) {
    const cats = await getCategories('item').catch(() => ['电子产品','工具','衣物','书籍','其他']);
    this.setData({ categories: cats });
    if (options.id) {
      this.setData({ isEdit: true, editId: options.id });
      const { getItems } = require('../../../utils/storage');
      const items = await getItems().catch(() => []);
      const item = items.find(i => i._id === options.id);
      if (item) {
        const qtyMatch = (item.quantity || '×1').match(/×(\d+)\s*(.*)/);
        this.setData({
          form: {
            name: item.name || '', category: item.category || '',
            qty: qtyMatch ? parseInt(qtyMatch[1]) : 1,
            unit: qtyMatch ? qtyMatch[2] || '' : '',
            location: item.location || '', notes: item.notes || '',
          }
        });
      }
    }
  },

  onField(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }); },
  selectCat(e) { this.setData({ 'form.category': e.currentTarget.dataset.cat }); },
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
    await saveCategories('item', cats).catch(() => {});
    this.setData({ categories: cats, 'form.category': name, showCatInput: false });
  },

  async submit() {
    const { form, isEdit, editId } = this.data;
    if (!form.name.trim()) return wx.showToast({ title: '请填写名称', icon: 'none' });
    if (!form.category) return wx.showToast({ title: '请选择分类', icon: 'none' });
    if (!form.location.trim()) return wx.showToast({ title: '请填写存放位置', icon: 'none' });

    const qtyText = '×' + form.qty + (form.unit ? ' ' + form.unit : '');
    const data = {
      name: form.name.trim(), category: form.category,
      quantity: qtyText, location: form.location.trim(), notes: form.notes.trim(),
    };

    try {
      if (isEdit) await updateItem(editId, data);
      else await addItem(data);
      wx.navigateBack();
    } catch (e) { wx.showToast({ title: '保存失败', icon: 'none' }); }
  },

  goBack() { wx.navigateBack(); },
});
