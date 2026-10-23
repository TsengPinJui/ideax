import { adminDb } from '../server/competitionService';

async function testConnection() {
  if (!adminDb) {
    console.error('adminDb is not initialized (no service account)');
    process.exit(1);
  }
  try {
    const snap = await adminDb.collection('users').limit(3).get();
    console.log(`Successfully connected! Found ${snap.size} sample user docs.`);
    for (const doc of snap.docs) {
      console.log('User doc:', doc.id, doc.data()?.name, 'role:', doc.data()?.role, 'balance:', doc.data()?.balance);
    }
  } catch (err) {
    console.error('Query error:', err);
  }
}

testConnection();
