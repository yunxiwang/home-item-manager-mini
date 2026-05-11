const { getFoods, addFood, updateFood, deleteFood, getCategories, saveCategories } = require('../../utils/storage');
const { getCardStatus, getBadgeInfo, partitionFoods, getDaysUntilExpiration } = require('../../utils/reminder');

const EMPTY_FORM = { name: '', category: '', qty: 1, unit: '', purchaseDate: '', productionDate: '', expirationDate: '', notes: '', notified: { threeMonths: false, oneMonth: false, threeDays: false } };

// 示例数据
const SAMPLES = [
  { _id: 'sample_1', name: '鲜牛奶 950ml', category: '饮料', quantity: '×2 瓶', purchaseDate: '2026-05-01', expirationDate: '2026-05-13', _days: 3, _status: 'urgent', _badge: { text: '3天后到期', cls: 'badge-urgent' } },
  { _id: 'sample_2', name: '速冻水饺 500g', category: '冷冻食品', quantity: '×3 袋', purchaseDate: '2026-03-15', expirationDate: '2026-05-30', _days: 20, _status: 'caution', _badge: { text: '20天后到期', cls: 'badge-caution' } },
  { _id: 'sample_3', name: '薯片 原味 135g', category: '零食', quantity: '×1 包', purchaseDate: '2026-05-03', expirationDate: '2026-11-01', _days: 175, _status: 'safe', _badge: null },
];

Page({
  data: {
    tab: 'active', search: '', selectedCat: '', searchFocus: false, fabX: 305, fabY: 480,
    foods: [], categories: [], displayList: [],
    activeCount: 0, expiredCount: 0,
    showDelete: false, deletingId: '', deletingName: '',
    showForm: false, editId: '', form: { ...EMPTY_FORM },
    formShowCatInput: false, formNewCat: '',
    calcMode: 'manual', shelfYears: 0, shelfMonths: 3, shelfDaysSel: 0, shelfPickerRange: [[...Array(6).keys()],[...Array(12).keys()],[...Array(31).keys()]], calcExpDate: '',
  },

  onShow() {
    this.loadData();
    const sys = wx.getSystemInfoSync();
    this.setData({ fabX: sys.windowWidth - 90, fabY: sys.windowHeight - 200 });
  },

  async loadData() {
    try {
      const [foods, categories] = await Promise.all([
        getFoods().catch(() => []),
        getCategories('food').catch(() => ['零食','饮料','冷冻食品','生鲜','其他']),
      ]);
      if (foods.length === 0) {
        for (const s of SAMPLES) {
          await addFood({
            name: s.name, category: s.category, quantity: s.quantity,
            purchaseDate: s.purchaseDate, expirationDate: s.expirationDate,
            notes: s.notes || '', notified: { threeMonths: false, oneMonth: false, threeDays: false },
          }).catch(() => {});
        }
        const fresh = await getFoods().catch(() => []);
        if (fresh.length === 0) {
          // CloudBase 写入失败，直接用本地示例渲染
          this.setData({ foods: [], categories }, () => {
            this.setData({ displayList: SAMPLES, activeCount: 3, expiredCount: 0 });
          });
        } else {
          this.setData({ foods: fresh, categories }, () => this.applyFilters());
        }
      } else {
        this.setData({ foods, categories }, () => this.applyFilters());
      }
    } catch (e) {
      // 兜底：CloudBase 完全不可用时也不空白
      this.setData({ displayList: SAMPLES, activeCount: 3, expiredCount: 0 });
    }
  },

  applyFilters() {
    const { foods, tab, search, selectedCat } = this.data;
    if (foods.length === 0) {
      this.setData({ displayList: SAMPLES, activeCount: 3, expiredCount: 0 });
      return;
    }

    const { active, expired } = partitionFoods(foods);
    let list = tab === 'active' ? active : expired;
    if (search) { const q = search.toLowerCase(); list = list.filter(f => f.name.toLowerCase().includes(q)); }
    if (selectedCat) { list = list.filter(f => f.category === selectedCat); }

    const displayList = list.map(f => {
      const days = getDaysUntilExpiration(f.expirationDate);
      return {
        ...f,
        _status: getCardStatus(days),
        _days: days,
        _badge: getBadgeInfo(days),
      };
    });

    this.setData({ displayList, activeCount: active.length, expiredCount: expired.length });
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab, search: '', selectedCat: '' }, () => { this.applyFilters(); this.setData({ searchFocus: true }); }); },
  selectCat(e) { this.setData({ selectedCat: e.currentTarget.dataset.cat }, () => this.applyFilters()); },
  onSearch(e) { this.setData({ search: e.detail.value }, () => this.applyFilters()); },
  onSearchFocus() { this.setData({ searchFocus: false }); },

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
    this.setData({ showForm: true, editId: '', form: { ...EMPTY_FORM, purchaseDate: this.today() }, formShowCatInput: false, formNewCat: '', calcMode: 'manual', shelfYears: 0, shelfMonths: 3, shelfDaysSel: 0, calcExpDate: '' });
  },

  editFood(e) {
    const id = e.currentTarget.dataset.id;
    const food = this.data.foods.find(f => f._id === id);
    if (!food) return;
    const qtyMatch = (food.quantity || '×1').match(/×(\d+)\s*(.*)/);
    this.setData({
      showForm: true, editId: id, formShowCatInput: false, formNewCat: '',
      form: {
        name: food.name || '', category: food.category || '',
        qty: qtyMatch ? parseInt(qtyMatch[1]) : 1, unit: qtyMatch ? qtyMatch[2] || '' : '',
        purchaseDate: food.purchaseDate || '', expirationDate: food.expirationDate || '',
        notes: food.notes || '', notified: food.notified || { threeMonths: false, oneMonth: false, threeDays: false },
      }
    });
  },

  closeForm() { this.setData({ showForm: false }); },

  onFormField(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }); },
  onFormDate(e) {
    const f = e.currentTarget.dataset.field;
    this.setData({ ['form.' + f]: e.detail.value });
    if (f === 'purchaseDate' || f === 'productionDate') this.updateCalcExpDate();
  },
  selectFormCat(e) { this.setData({ 'form.category': e.currentTarget.dataset.cat }); },
  formIncQty() { this.setData({ 'form.qty': this.data.form.qty + 1 }); },
  formDecQty() { const v = this.data.form.qty - 1; if (v >= 0) this.setData({ 'form.qty': v }); },

  switchCalcMode(e) {
    this.setData({ calcMode: e.currentTarget.dataset.mode }, () => this.updateCalcExpDate());
  },
  onShelfPick(e) {
    const [y, m, d] = e.detail.value;
    this.setData({ shelfYears: y, shelfMonths: m, shelfDaysSel: d }, () => this.updateCalcExpDate());
  },
  updateCalcExpDate() {
    const { form, shelfYears, shelfMonths, shelfDaysSel } = this.data;
    const baseDate = form.productionDate || form.purchaseDate;
    if (!baseDate) return;
    const dt = new Date(baseDate);
    dt.setFullYear(dt.getFullYear() + shelfYears);
    dt.setMonth(dt.getMonth() + shelfMonths);
    dt.setDate(dt.getDate() + shelfDaysSel);
    const exp = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
    this.setData({ calcExpDate: exp, 'form.expirationDate': exp });
  },

  showFormCatInput() { this.setData({ formShowCatInput: true, formNewCat: '' }); },
  onCatField(e) { this.setData({ formNewCat: e.detail.value }); },
  hideFormCatInput() { this.setData({ formShowCatInput: false }); },
  async addFormCategory() {
    const name = this.data.formNewCat.trim();
    if (!name || this.data.categories.includes(name)) { wx.showToast({ title: '分类已存在或为空', icon: 'none' }); return; }
    const cats = [...this.data.categories, name];
    await saveCategories('food', cats).catch(() => {});
    this.setData({ categories: cats, 'form.category': name, formShowCatInput: false });
  },

  async submitForm() {
    const { form, editId } = this.data;
    if (!form.name.trim()) return wx.showToast({ title: '请填写名称', icon: 'none' });
    if (!form.category) return wx.showToast({ title: '请选择分类', icon: 'none' });
    if (!form.purchaseDate) return wx.showToast({ title: '请选择购买日期', icon: 'none' });
    if (!form.expirationDate) return wx.showToast({ title: '请选择保质期截止日期', icon: 'none' });
    const qtyText = '×' + form.qty + (form.unit ? ' ' + form.unit : '');
    const data = { name: form.name.trim(), category: form.category, quantity: qtyText, purchaseDate: form.purchaseDate, expirationDate: form.expirationDate, notes: form.notes.trim(), notified: form.notified };
    try {
      if (editId) { await updateFood(editId, data); } else { await addFood(data); }
      this.setData({ showForm: false }, () => this.loadData());
    } catch (e) { wx.showToast({ title: '保存失败', icon: 'none' }); }
  },

  // ===== 删除 =====
  deleteFood(e) {
    this.setData({ showDelete: true, deletingId: e.currentTarget.dataset.id, deletingName: e.currentTarget.dataset.name });
  },
  async confirmDelete() {
    try { await deleteFood(this.data.deletingId); this.setData({ showDelete: false }, () => this.loadData()); }
    catch (e) { wx.showToast({ title: '删除失败', icon: 'none' }); }
  },
  hideDelete() { this.setData({ showDelete: false }); },

  nop() {},
  today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  },
});
