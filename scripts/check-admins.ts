import { adminDb } from '../server/competitionService';

async function checkAdmins() {
  const usersSnap = await adminDb.collection('users').get();
  for (const doc of usersSnap.docs) {
    const u = doc.data();
    const id = doc.id;
    const isAdmin =
      u.role === 'admin' ||
      u.accountType === 'admin' ||
      u.isOfficial === true ||
      u.memberId === 'a000000001' ||
      id === 'user-admin' ||
      u.email === 'john25893619@gmail.com' ||
      (u.name && (u.name.includes('管理團隊') || u.name.includes('系統管理')));

    if (isAdmin) {
      console.log('ADMIN USER:', id, u.name, u.email, 'balance:', u.balance);
    }
  }
}

checkAdmins();
