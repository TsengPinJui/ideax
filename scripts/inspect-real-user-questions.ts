import { adminDb } from '../server/competitionService';

async function inspectRealUserQuestions() {
  const usersSnap = await adminDb.collection('users').get();
  const realUserIds = new Set<string>();

  for (const doc of usersSnap.docs) {
    const u = doc.data();
    const id = doc.id;
    if (id === 'user-guest' || id === 'guest') continue;
    const isAdmin =
      u.role === 'admin' ||
      u.accountType === 'admin' ||
      u.isOfficial === true ||
      u.memberId === 'a000000001' ||
      id === 'user-admin' ||
      u.email === 'john25893619@gmail.com' ||
      (u.name && (u.name.includes('管理團隊') || u.name.includes('系統管理')));

    if (!isAdmin) {
      realUserIds.add(id);
      if (u.authUid) realUserIds.add(u.authUid);
    }
  }

  const questionsSnap = await adminDb.collection('questions').get();
  console.log(`Checking questions for real users...`);

  for (const qDoc of questionsSnap.docs) {
    const q = qDoc.data();
    const authorId = q.authorId || '';
    const authorAuthUid = q.authorAuthUid || '';

    if (realUserIds.has(authorId) || realUserIds.has(authorAuthUid)) {
      console.log('Real User Question:', {
        qId: qDoc.id,
        authorId,
        authorName: q.authorName,
        title: q.title,
        postType: q.postType,
        category: q.category,
        tags: q.tags,
      });
    }
  }
}

inspectRealUserQuestions();
