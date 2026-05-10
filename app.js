App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'test1-d8gc01d2k2877de6b',
      traceUser: true,
    });
    const saved = wx.getStorageSync('reminderConfig');
    if (saved && saved.reminders) {
      this.globalData.customReminders = saved.reminders;
    }
  },

  globalData: {
    customReminders: [3, 30, 90],
  },
});
