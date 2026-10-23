import { adminDb } from '../server/competitionService';

async function inspectData() {
  const usersSnap = await adminDb.collection('users').get();
  console.log(`Total users in Firestore: ${usersSnap.size}`);

  const questionsSnap = await adminDb.collection('questions').get();
  console.log(`Total questions in Firestore: ${questionsSnap.size}`);

  // Count per author
  const authorPainPoints: Record<string, number> = {};
  const authorProposalsOrApps: Record<string, number> = {};

  for (const qDoc of questionsSnap.docs) {
    const q = qDoc.data();
    const authorId = q.authorId || q.author || qDoc.id;
    const postType = q.postType || '';
    const isSimulated = q.isSimulated || false;
    
    // Check if pain point
    const isPainPoint = postType === 'pain_point' || q.category === '日常疑難' || (q.tags && q.tags.includes('痛點'));
    // Check if innovation proposal or app
    const isProposalOrApp = postType === 'innovation_proposal' || postType === 'vibecoding_app' || q.specialZone === 'vibecoding';

    if (isPainPoint) {
      authorPainPoints[authorId] = (authorPainPoints[authorId] || 0) + 1;
    }
    if (isProposalOrApp) {
      authorProposalsOrApps[authorId] = (authorProposalsOrApps[authorId] || 0) + 1;
    }
  }

  console.log('Sample users:');
  for (const uDoc of usersSnap.docs.slice(0, 10)) {
    const u = uDoc.data();
    console.log({
      id: uDoc.id,
      name: u.name,
      email: u.email,
      role: u.role,
      balance: u.balance,
      authUid: u.authUid,
      isSimulated: u.isSimulated,
      painPoints: authorPainPoints[uDoc.id] || 0,
      proposalsOrApps: authorProposalsOrApps[uDoc.id] || 0,
    });
  }
}

inspectData();
