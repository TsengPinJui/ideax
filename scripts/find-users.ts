import { adminDb } from '../server/competitionService';

async function findAdminsAndRealUsers() {
  const adminsSnap = await adminDb.collection('admins').get();
  console.log('Admins collection count:', adminsSnap.size);
  for (const doc of adminsSnap.docs) {
    console.log('Admin in /admins:', doc.id, doc.data());
  }

  const usersSnap = await adminDb.collection('users').get();
  console.log(`\nScanning ${usersSnap.size} users for admin or real users:`);
  
  const adminUsers: any[] = [];
  const realUsers: any[] = [];
  const simulatedUsers: any[] = [];

  for (const doc of usersSnap.docs) {
    const u = doc.data();
    const id = doc.id;
    const isGuest = id === 'user-guest' || id === 'guest';
    if (isGuest) continue;

    const isAdmin =
      u.role === 'admin' ||
      u.accountType === 'admin' ||
      u.isOfficial === true ||
      u.memberId === 'a000000001' ||
      id === 'user-admin' ||
      u.email === 'john25893619@gmail.com' ||
      (u.name && (u.name.includes('管理團隊') || u.name.includes('系統管理')));

    if (isAdmin) {
      adminUsers.push({ id, name: u.name, email: u.email, role: u.role, balance: u.balance });
    } else if (u.authUid || u.email || (!u.isSimulated && !id.startsWith('u-vc-') && !id.startsWith('mock-'))) {
      realUsers.push({ id, name: u.name, email: u.email, role: u.role, balance: u.balance, authUid: u.authUid, isSimulated: u.isSimulated });
    } else {
      simulatedUsers.push({ id, name: u.name, role: u.role, balance: u.balance });
    }
  }

  console.log(`\nAdmin Users (${adminUsers.length}):`, adminUsers);
  console.log(`\nReal Users (${realUsers.length}):`, realUsers);
  console.log(`\nSimulated/Persona Users count: ${simulatedUsers.length}`);
}

findAdminsAndRealUsers();
