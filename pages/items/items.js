const { getItems, addItem, updateItem, deleteItem, getCategories, saveCategories } = require('../../utils/storage');

const EMPTY_FORM = { name: '', category: '', qty: 1, unit: '', location: '', notes: '' };

const SAMPLES = [
  { _id: 'sample_1', name: '螺丝刀套装', category: '工具', quantity: '×1 套', location: '客厅电视柜第二层抽屉', notes: '含 12 种批头' },
  { _id: 'sample_2', name: 'MacBook 充电器', category: '电子产品', quantity: '×1 个', location: '卧室床头柜第一层', notes: '' },
  { _id: 'sample_3', name: '针线盒', category: '其他', quantity: '×1 个', location: '卧室衣柜右下格', notes: '含黑白线卷、顶针' },
];

Page({
  data: {
    search: '', selectedCat: '',
    items: [], categories: [], displayList: [],
    showDelete: false, deletingId: '', deletingName: '',
    showForm: false, editId: '', form: { ...EMPTY_FORM },
    formShowCatInput: false, formNewCat: '', fabX: 305, fabY: 480,
  },

  onShow() {
    this.loadData();
    const sys = wx.getSystemInfoSync();
    this.setData({ fabX: sys.windowWidth - 90, fabY: sys.windowHeight - 200 });
  },

  async loadData() {
    try {
      const [items, categories] = await Promise.all([
        getItems().catch(() => []),
        getCategories('item').catch(() => ['电子产品','工具','衣物','书籍','其他']),
      ]);
      if (items.length === 0) {
        for (const s of SAMPLES) {
          await addItem({
            name: s.name, category: s.category, quantity: s.quantity,
            location: s.location, notes: s.notes || '',
          }).catch(() => {});
        }
        const fresh = await getItems().catch(() => []);
        if (fresh.length === 0) {
          this.setData({ items: [], categories }, () => {
            this.setData({ displayList: SAMPLES });
          });
        } else {
          this.setData({ items: fresh, categories }, () => this.applyFilters());
        }
      } else {
        this.setData({ items, categories }, () => this.applyFilters());
      }
    } catch (e) {
      this.setData({ displayList: SAMPLES });
    }
  },

  applyFilters() {
    const { items, search, selectedCat } = this.data;
    if (items.length === 0) { this.setData({ displayList: [] }); return; }
    let list = items;
    if (search) { const q = search.toLowerCase(); list = list.filter(i => i.name.toLowerCase().includes(q) || (i.location||'').toLowerCase().includes(q)); }
    if (selectedCat) { list = list.filter(i => i.category === selectedCat); }
    this.setData({ displayList: list });
  },

  selectCat(e) { this.setData({ selectedCat: e.currentTarget.dataset.cat }, () => this.applyFilters()); },
  onSearch(e) { this.setData({ search: e.detail.value }, () => this.applyFilters()); },

  subscribeNow() {
    const TMPL = '6PdhckfTDkjkhcaxy_HpIE6rSUUnTTXF2HdLI8b5y8I';
    const shown = wx.getStorageSync('reminderTipShown');

    function doSubscribe() {
      wx.requestSubscribeMessage({
        tmplIds: [TMPL],
        success(res) {
          if (res[TMPL] === 'accept') {
            wx.showToast({ title: '已开启提醒', icon: 'success' });
          }
        },
      });
    }

    if (shown) {
      doSubscribe();
    } else {
      wx.showModal({
        title: '提醒说明',
        content: '每次订阅仅能发送一条提醒。每天打开顺手点一下即可。',
        confirmText: '知道了',
        success(r) {
          if (r.confirm) {
            wx.setStorageSync('reminderTipShown', true);
            doSubscribe();
          }
        },
      });
    }
  },

  // ===== 表单 =====
  openForm() {
    this.setData({ showForm: true, editId: '', form: { ...EMPTY_FORM }, formShowCatInput: false, formNewCat: '' });
  },

  editItem(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.find(i => i._id === id);
    if (!item) return;
    const qtyMatch = (item.quantity || '×1').match(/×(\d+)\s*(.*)/);
    this.setData({
      showForm: true, editId: id, formShowCatInput: false, formNewCat: '',
      form: {
        name: item.name || '', category: item.category || '',
        qty: qtyMatch ? parseInt(qtyMatch[1]) : 1, unit: qtyMatch ? qtyMatch[2] || '' : '',
        location: item.location || '', notes: item.notes || '',
      }
    });
  },

  closeForm() { this.setData({ showForm: false }); },

  onFormField(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }); },
  selectFormCat(e) { this.setData({ 'form.category': e.currentTarget.dataset.cat }); },
  formIncQty() { this.setData({ 'form.qty': this.data.form.qty + 1 }); },
  formDecQty() { const v = this.data.form.qty - 1; if (v >= 0) this.setData({ 'form.qty': v }); },

  showFormCatInput() { this.setData({ formShowCatInput: true, formNewCat: '' }); },
  onCatField(e) { this.setData({ formNewCat: e.detail.value }); },
  hideFormCatInput() { this.setData({ formShowCatInput: false }); },
  async addFormCategory() {
    const name = this.data.formNewCat.trim();
    if (!name || this.data.categories.includes(name)) { wx.showToast({ title: '分类已存在或为空', icon: 'none' }); return; }
    const cats = [...this.data.categories, name];
    await saveCategories('item', cats).catch(() => {});
    this.setData({ categories: cats, 'form.category': name, formShowCatInput: false });
  },

  async submitForm() {
    const { form, editId } = this.data;
    if (!form.name.trim()) return wx.showToast({ title: '请填写名称', icon: 'none' });
    if (!form.category) return wx.showToast({ title: '请选择分类', icon: 'none' });
    if (!form.location.trim()) return wx.showToast({ title: '请填写存放位置', icon: 'none' });
    const qtyText = '×' + form.qty + (form.unit ? ' ' + form.unit : '');
    const data = { name: form.name.trim(), category: form.category, quantity: qtyText, location: form.location.trim(), notes: form.notes.trim() };
    try {
      if (editId) { await updateItem(editId, data); } else { await addItem(data); }
      this.setData({ showForm: false }, () => this.loadData());
    } catch (e) { wx.showToast({ title: '保存失败', icon: 'none' }); }
  },

  // ===== 删除 =====
  deleteItem(e) {
    this.setData({ showDelete: true, deletingId: e.currentTarget.dataset.id, deletingName: e.currentTarget.dataset.name });
  },
  async confirmDelete() {
    try { await deleteItem(this.data.deletingId); this.setData({ showDelete: false }, () => this.loadData()); }
    catch (e) { wx.showToast({ title: '删除失败', icon: 'none' }); }
  },
  hideDelete() { this.setData({ showDelete: false }); },
  nop() {},
});
