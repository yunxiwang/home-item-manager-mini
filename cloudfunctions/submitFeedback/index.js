const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  await db.collection('feedback').add({
    data: { content: event.content, createdAt: new Date() }
  });
  return { ok: true };
};
