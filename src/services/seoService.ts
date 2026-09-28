import { Question, Answer } from '../types';

/**
 * Updates document meta tags, title, and Schema.org QAPage structured data
 * to make questions indexable and rankable by Google, Bing, and other search engines,
 * identical to how Zhihu, Dcard, Stack Overflow, and Quora operate.
 */
export function updateSEOForQuestion(question: Question | null, answers: Answer[] = []) {
  if (typeof document === 'undefined') return;

  const defaultTitle = 'IdeaX 創點子 — 讓想法發光 • IDEAS CONNECT POSSIBILITIES';
  const defaultDesc =
    'IdeaX 創點子 — 讓想法發光！高價值問題與解決方案交易市場，提供懸賞、深度解鎖、AI 智能媒合與專家變現，Ideas Connect Possibilities。';

  const titleTag = document.querySelector('title');
  const metaDesc = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  const twitterImage = document.querySelector('meta[name="twitter:image"]');

  // Existing JSON-LD tag
  let jsonLdScript = document.getElementById('ideax-schema-qapage') as HTMLScriptElement | null;

  if (!question) {
    if (titleTag) titleTag.innerText = defaultTitle;
    if (metaDesc) metaDesc.setAttribute('content', defaultDesc);
    if (ogTitle) ogTitle.setAttribute('content', defaultTitle);
    if (ogDesc) ogDesc.setAttribute('content', defaultDesc);
    if (ogImage) ogImage.setAttribute('content', '/ideax-thumbnail.png');
    if (twitterImage) twitterImage.setAttribute('content', '/ideax-thumbnail.png');
    if (jsonLdScript) {
      jsonLdScript.remove();
    }
    return;
  }

  // Formatting question page title for SEO
  const bountyText = (question.bounty || 0) > 0 ? `【懸賞 NT$ ${(question.bounty || 0).toLocaleString()}】` : '【免費探討】';
  const pageTitle = `${bountyText} ${question.title} - IdeaX 創點子知識問答`;
  const plainDesc = (question.description || '').replace(/\n+/g, ' ').slice(0, 155);

  if (titleTag) titleTag.innerText = pageTitle;
  if (metaDesc) metaDesc.setAttribute('content', plainDesc);
  if (ogTitle) ogTitle.setAttribute('content', pageTitle);
  if (ogDesc) ogDesc.setAttribute('content', plainDesc);

  const pageUrl = getQuestionShareUrl(question.id);
  if (ogUrl) {
    ogUrl.setAttribute('content', pageUrl);
  }
  if (ogImage) {
    ogImage.setAttribute('content', '/ideax-thumbnail.png');
  }
  if (twitterImage) {
    twitterImage.setAttribute('content', '/ideax-thumbnail.png');
  }

  // Schema.org QAPage generation (Google Search official format for Q&A platforms)
  const questionAnswers = answers.filter((a) => a.questionId === question.id);
  const acceptedAnswer = questionAnswers.find((a) => a.isAccepted);

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: question.title,
      text: question.description,
      answerCount: questionAnswers.length,
      upvoteCount: question.views || 0,
      dateCreated: question.createdAt,
      author: {
        '@type': 'Person',
        name: question.authorName || '匿名用戶',
      },
      acceptedAnswer: acceptedAnswer
        ? {
            '@type': 'Answer',
            text: acceptedAnswer.freePreview || acceptedAnswer.fullContent || '方案已採納',
            dateCreated: acceptedAnswer.createdAt,
            upvoteCount: acceptedAnswer.likes || 0,
            url: `${pageUrl}#answer-${acceptedAnswer.id}`,
            author: {
              '@type': 'Person',
              name: acceptedAnswer.solverName,
            },
          }
        : undefined,
      suggestedAnswer: questionAnswers
        .filter((a) => !a.isAccepted)
        .slice(0, 5)
        .map((ans) => ({
          '@type': 'Answer',
          text: ans.freePreview || '提供專業解決方案',
          dateCreated: ans.createdAt,
          upvoteCount: ans.likes || 0,
          author: {
            '@type': 'Person',
            name: ans.solverName,
          },
        })),
    },
  };

  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.id = 'ideax-schema-qapage';
    jsonLdScript.type = 'application/ld+json';
    document.head.appendChild(jsonLdScript);
  }

  jsonLdScript.text = JSON.stringify(schemaData, null, 2);
}

/**
 * Returns the direct canonical share URL for a question.
 */
export function getQuestionShareUrl(questionId: string): string {
  if (typeof window === 'undefined') return `https://ideax.tw/?q=${questionId}`;
  const base = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
  return `${base}/?q=${questionId}`;
}
